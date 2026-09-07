<?php
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');

function auditRespond($status, $payload) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

require_once __DIR__ . '/payment_audit_lib.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['health'])) {
    auditRespond(200, ['status' => 'ready', 'version' => '1.3-payment-audit-30d-all']);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // The WhatsApp bot runs on the dedicated production VPS. Portal writes use
    // appendPaymentAudit() directly from proxy_payments.php and never hit this branch.
    $remote = $_SERVER['REMOTE_ADDR'] ?? '';
    $allowedBotIps = ['76.13.100.2'];
    if (!in_array($remote, $allowedBotIps, true)) {
        auditRespond(403, ['error' => 'Origen no autorizado.']);
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) auditRespond(400, ['error' => 'JSON inválido.']);
    $input['source'] = 'whatsapp_bot';

    if (empty($input['reference']) || empty($input['invoice_id'])) {
        auditRespond(422, ['error' => 'Faltan referencia o factura.']);
    }

    if (!appendPaymentAudit($input)) {
        auditRespond(500, ['error' => 'No fue posible guardar el registro.']);
    }
    auditRespond(201, ['success' => true]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    auditRespond(405, ['error' => 'Método no permitido.']);
}

$secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
session_name('wifi_rapidito_staff');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => $secure,
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_start();

if (empty($_SESSION['staff_authenticated'])) {
    auditRespond(401, ['error' => 'Sesión de personal requerida.']);
}
$permissions = is_array($_SESSION['staff_permissions'] ?? null) ? $_SESSION['staff_permissions'] : [];
if (!in_array('*', $permissions, true) && !in_array('finance', $permissions, true)) {
    auditRespond(403, ['error' => 'Tu cuenta no tiene permiso para consultar pagos validados.']);
}

function auditScalar($value, $keys = []) {
    if (is_array($value)) {
        foreach ($keys as $key) {
            if (isset($value[$key]) && $value[$key] !== '') return (string)$value[$key];
        }
        foreach (['nombre', 'name', 'usuario', 'username', 'id', 'id_factura', 'id_servicio', 'id_pago'] as $key) {
            if (isset($value[$key]) && $value[$key] !== '') return (string)$value[$key];
        }
        return '';
    }
    return is_scalar($value) ? (string)$value : '';
}

function wisphubGetPaymentsPage($offset, $limit) {
    require_once __DIR__ . '/config_wisphub.php';

    $url = rtrim(WISPHUB_API_URL, '/') . '/pagos/?limit=' . (int)$limit . '&offset=' . (int)$offset;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Api-Key ' . WISPHUB_TOKEN,
            'Accept: application/json',
        ],
        CURLOPT_CONNECTTIMEOUT => 6,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_ENCODING => '',
    ]);

    $body = curl_exec($ch);
    $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $errno = curl_errno($ch);
    curl_close($ch);

    if ($errno !== 0 || $httpCode < 200 || $httpCode >= 300 || !$body) return null;

    $data = json_decode($body, true);
    return is_array($data) ? $data : null;
}

function wisphubRecentPayments($days = 30) {
    $cutoff = strtotime('-' . max(1, (int)$days) . ' days');
    $pageSize = 300;
    $offset = 0;
    $out = [];
    $maxPages = 20;

    for ($page = 0; $page < $maxPages; $page++) {
        $data = wisphubGetPaymentsPage($offset, $pageSize);
        if ($data === null) break;

        $rows = is_array($data['results'] ?? null) ? $data['results'] : (array_is_list($data) ? $data : []);
        if (!$rows) break;

        foreach ($rows as $row) {
            if (!is_array($row)) continue;

            $dateRaw = $row['fecha_pago'] ?? $row['fecha'] ?? $row['fecha_creacion'] ?? $row['created_at'] ?? $row['fecha_registro'] ?? '';
            $ts = $dateRaw ? strtotime((string)$dateRaw) : false;
            if ($ts === false || $ts < $cutoff) continue;

            $paymentId = trim((string)($row['id_pago'] ?? $row['id'] ?? $row['pk'] ?? ''));
            $reference = trim((string)($row['referencia'] ?? $row['reference'] ?? $row['numero_referencia'] ?? $row['nro_referencia'] ?? $row['comprobante'] ?? ''));

            $client = $row['cliente'] ?? $row['client'] ?? $row['usuario'] ?? $row['user'] ?? $row['abonado'] ?? '';
            $invoice = $row['factura'] ?? $row['invoice'] ?? $row['id_factura'] ?? '';
            $service = $row['servicio'] ?? $row['service'] ?? $row['id_servicio'] ?? '';
            $method = $row['forma_pago'] ?? $row['metodo_pago'] ?? $row['payment_method'] ?? $row['tipo_pago'] ?? '';
            $amount = $row['total_cobrado'] ?? $row['monto'] ?? $row['cantidad'] ?? $row['total'] ?? $row['importe'] ?? null;

            $clientName = auditScalar($client, ['nombre', 'name', 'cliente', 'razon_social']);
            if ($clientName === '') {
                $clientName = trim((string)($row['nombre_cliente'] ?? $row['cliente_nombre'] ?? $row['nombre'] ?? ''));
            }

            $invoiceId = auditScalar($invoice, ['id_factura', 'id']);
            if ($invoiceId === '') $invoiceId = trim((string)($row['factura_id'] ?? ''));

            $serviceId = auditScalar($service, ['id_servicio', 'id']);
            if ($serviceId === '') $serviceId = trim((string)($row['servicio_id'] ?? ''));

            $stableId = $paymentId !== '' ? $paymentId : sha1(json_encode([$reference, $dateRaw, $clientName, $amount]));

            $out[] = [
                'id' => 'wisphub-' . $stableId,
                'payment_id' => $paymentId,
                'created_at' => date('c', $ts),
                'source' => 'wisphub_history',
                'client_name' => $clientName,
                'username' => auditScalar($client, ['usuario', 'username']),
                'service_id' => $serviceId,
                'invoice_id' => $invoiceId,
                'reference' => $reference,
                'amount' => is_numeric($amount) ? (float)$amount : null,
                'currency' => 'VES',
                'payment_date' => date('Y-m-d', $ts),
                'method' => auditScalar($method, ['nombre', 'name']),
                'banesco_status' => 'historical_registered',
                'wisphub_status' => 'registered',
                'wisphub_task_id' => '',
            ];
        }

        $received = count($rows);
        $offset += $received;

        $count = isset($data['count']) && is_numeric($data['count']) ? (int)$data['count'] : null;
        if ($received < $pageSize) break;
        if ($count !== null && $offset >= $count) break;
        if ($count === null && empty($data['next'])) break;
    }

    return $out;
}

$limit = max(1, min(5000, (int)($_GET['limit'] ?? 2000)));
$path = paymentAuditStorePath();
$items = [];
if (is_file($path)) {
    $lines = @file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    foreach (array_reverse($lines) as $line) {
        $row = json_decode($line, true);
        if (is_array($row)) $items[] = $row;
    }
}

// Show every payment WispHub exposes for the last 30 days. The local audit
// entries are merged so portal/bot payments keep their precise origin.
$recent = wisphubRecentPayments(30);
$seen = [];
$merged = [];
foreach (array_merge($items, $recent) as $row) {
    if (!is_array($row)) continue;
    $idKey = strtolower((string)($row['payment_id'] ?? $row['id'] ?? ''));
    $compositeKey = strtolower(($row['invoice_id'] ?? '') . '|' . ($row['reference'] ?? '') . '|' . ($row['payment_date'] ?? '') . '|' . ($row['amount'] ?? ''));
    $key = $idKey !== '' ? 'id:' . $idKey : 'cmp:' . $compositeKey;
    if (isset($seen[$key])) continue;
    $seen[$key] = true;
    $merged[] = $row;
}

usort($merged, function($a, $b) {
    return strcmp((string)($b['created_at'] ?? ''), (string)($a['created_at'] ?? ''));
});
$merged = array_slice($merged, 0, $limit);

auditRespond(200, [
    'payments' => $merged,
    'count' => count($merged),
    'historical_days' => 30,
    'wisphub_count' => count($recent),
    'version' => '1.3-payment-audit-30d-all',
]);
