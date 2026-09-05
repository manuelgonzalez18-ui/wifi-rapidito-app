<?php
/**
 * proxy_invoices.php
 *
 * Consulta de facturas para el portal. Para un id_servicio usa el endpoint
 * oficial de saldo de WispHub, que devuelve la deuda y las facturas pendientes
 * vinculadas al cliente. Evita recorrer todo /facturas/ y filtrar localmente.
 */

error_reporting(0);
ini_set('display_errors', 0);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['count' => 0, 'results' => [], 'error' => 'Método no permitido.']);
    exit;
}

require_once __DIR__ . '/config_wisphub.php';

function invoices_response($status, $payload) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function invoices_clean($value, $max = 180) {
    $text = trim((string) $value);
    return function_exists('mb_substr') ? mb_substr($text, 0, $max) : substr($text, 0, $max);
}

function invoices_wisphub_get($path, $params = []) {
    $url = rtrim(WISPHUB_API_URL, '/') . '/' . ltrim($path, '/');
    if ($params) {
        $url .= (str_contains($url, '?') ? '&' : '?') . http_build_query($params);
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_HTTPHEADER => [
            'Authorization: Api-Key ' . WISPHUB_TOKEN,
            'Accept: application/json',
        ],
    ]);
    $raw = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($raw === false || $error) {
        throw new RuntimeException('No se pudo conectar con WispHub.');
    }

    $data = json_decode((string) $raw, true);
    if ($code < 200 || $code >= 300 || !is_array($data)) {
        $message = is_array($data)
            ? ($data['detail'] ?? $data['message'] ?? $data['error'] ?? 'WispHub no pudo completar la consulta.')
            : 'WispHub no pudo completar la consulta.';
        throw new RuntimeException(invoices_clean($message, 300));
    }
    return $data;
}

function invoices_service_id() {
    foreach (['id_servicio', 'servicio'] as $key) {
        $value = trim((string) ($_GET[$key] ?? ''));
        if ($value !== '' && ctype_digit($value)) return $value;
    }

    // El frontend histórico también enviaba el mismo id_servicio bajo id_cliente.
    $legacy = trim((string) ($_GET['id_cliente'] ?? ''));
    if ($legacy !== '' && ctype_digit($legacy)) return $legacy;
    return '';
}

function invoices_invoice_id($item) {
    if (!is_array($item)) return '';
    foreach (['id_factura', 'id', 'folio'] as $key) {
        if (isset($item[$key]) && is_scalar($item[$key]) && trim((string) $item[$key]) !== '') {
            return preg_replace('/[^0-9]/', '', (string) $item[$key]);
        }
    }
    return '';
}

function invoices_normalize_for_service($invoice, $summary, $serviceId) {
    $row = is_array($invoice) ? $invoice : [];
    $summary = is_array($summary) ? $summary : [];
    $id = invoices_invoice_id($row) ?: invoices_invoice_id($summary);

    if ($id !== '') {
        if (empty($row['id_factura'])) $row['id_factura'] = (int) $id;
        if (empty($row['id'])) $row['id'] = (int) $id;
        $row['public_url'] = 'view_pdf.php?id=' . rawurlencode($id);
    }

    foreach (['total', 'saldo', 'fecha_emision', 'fecha_vencimiento', 'fecha_pago', 'estado', 'folio'] as $key) {
        if ((!isset($row[$key]) || $row[$key] === '' || $row[$key] === null) && isset($summary[$key])) {
            $row[$key] = $summary[$key];
        }
    }

    if (empty($row['estado'])) $row['estado'] = 'Pendiente de Pago';

    // El Dashboard valida que cada factura pertenezca al servicio autenticado.
    // El endpoint saldo conoce esa relación aunque el detalle de factura pueda
    // contener otro identificador interno en articulos; exponemos el id_servicio
    // consultado de forma explícita para mantener esa asociación inequívoca.
    $row['id_servicio'] = (string) $serviceId;
    if (!isset($row['servicio']) || !is_array($row['servicio'])) $row['servicio'] = [];
    $row['servicio']['id_servicio'] = (string) $serviceId;
    $row['debug_match_by'] = 'WispHubSaldoServicio';

    return $row;
}

try {
    if (isset($_GET['health'])) {
        invoices_response(200, ['status' => 'ready', 'version' => '4.0-wisphub-saldo']);
    }

    $serviceId = invoices_service_id();

    if ($serviceId !== '') {
        $balance = invoices_wisphub_get('clientes/' . rawurlencode($serviceId) . '/saldo/');
        $summaries = isset($balance['facturas']) && is_array($balance['facturas'])
            ? $balance['facturas']
            : [];

        $results = [];
        foreach ($summaries as $summary) {
            if (!is_array($summary)) continue;
            $invoiceId = invoices_invoice_id($summary);
            $detail = [];
            if ($invoiceId !== '') {
                try {
                    $detail = invoices_wisphub_get('facturas/' . rawurlencode($invoiceId) . '/');
                } catch (Throwable $ignored) {
                    // El resumen de saldo sigue siendo válido aunque falle el detalle.
                    $detail = [];
                }
            }
            $results[] = invoices_normalize_for_service($detail, $summary, $serviceId);
        }

        invoices_response(200, [
            'count' => count($results),
            'results' => array_values($results),
            'next' => null,
            'previous' => null,
            'saldo' => $balance['saldo'] ?? null,
            'estado' => $balance['estado'] ?? null,
            'source' => 'wisphub_client_balance',
        ]);
    }

    // Búsqueda directa de una factura por ID, usada por vistas de detalle.
    $search = trim((string) ($_GET['search'] ?? ''));
    if ($search !== '' && ctype_digit($search)) {
        $invoice = invoices_wisphub_get('facturas/' . rawurlencode($search) . '/');
        $id = invoices_invoice_id($invoice) ?: $search;
        $invoice['public_url'] = 'view_pdf.php?id=' . rawurlencode($id);
        $invoice['debug_match_by'] = 'DirectID';
        invoices_response(200, [
            'count' => 1,
            'results' => [$invoice],
            'next' => null,
            'previous' => null,
            'source' => 'wisphub_invoice_detail',
        ]);
    }

    // Para consultas por usuario/cliente dejamos que WispHub aplique su filtro
    // soportado. No descargamos el universo completo de facturas.
    $cliente = trim((string) ($_GET['cliente'] ?? $_GET['usuario'] ?? ''));
    if ($cliente !== '') {
        $data = invoices_wisphub_get('facturas/', [
            'cliente' => $cliente,
            'limit' => max(1, min((int) ($_GET['limit'] ?? 100), 300)),
        ]);
        $results = is_array($data['results'] ?? null) ? $data['results'] : [];
        foreach ($results as &$invoice) {
            if (!is_array($invoice)) continue;
            $id = invoices_invoice_id($invoice);
            if ($id !== '') $invoice['public_url'] = 'view_pdf.php?id=' . rawurlencode($id);
            $invoice['debug_match_by'] = 'WispHubCliente';
        }
        unset($invoice);
        invoices_response(200, [
            'count' => count($results),
            'results' => array_values($results),
            'next' => null,
            'previous' => null,
            'source' => 'wisphub_invoice_client_filter',
        ]);
    }

    // Sin una identidad concreta no exponemos el universo de facturas.
    invoices_response(200, [
        'count' => 0,
        'results' => [],
        'next' => null,
        'previous' => null,
        'source' => 'no_filter',
    ]);

} catch (Throwable $e) {
    invoices_response(502, [
        'count' => 0,
        'results' => [],
        'error' => invoices_clean($e->getMessage(), 400),
        'source' => 'wisphub_error',
    ]);
}
?>