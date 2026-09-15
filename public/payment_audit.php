<?php
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');

define('PAYMENT_AUDIT_VERSION', '1.5-payment-audit-paid-invoices');
define('PAYMENT_AUDIT_COMPAT_VERSION', '1.4-payment-audit-30d-all-sources');

function auditRespond($status, $payload) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

require_once __DIR__ . '/payment_audit_lib.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['health'])) {
    auditRespond(200, [
        'status' => 'ready',
        'version' => PAYMENT_AUDIT_VERSION,
        'compat_version' => PAYMENT_AUDIT_COMPAT_VERSION,
    ]);
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

function auditTimestamp($row) {
    if (!is_array($row)) return false;
    foreach (['payment_date', 'created_at', 'fecha_pago', 'fecha', 'fecha_registro'] as $key) {
        $value = $row[$key] ?? '';
        if ($value === null || $value === '') continue;
        $ts = strtotime((string)$value);
        if ($ts !== false) return $ts;
    }
    return false;
}

function wisphubFetchJson($url) {
    require_once __DIR__ . '/config_wisphub.php';

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Api-Key ' . WISPHUB_TOKEN,
            'Accept: application/json',
        ],
        CURLOPT_CONNECTTIMEOUT => 6,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_ENCODING => '',
    ]);

    $body = curl_exec($ch);
    $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $errno = curl_errno($ch);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($errno !== 0 || $httpCode < 200 || $httpCode >= 300 || !$body) {
        return [
            'ok' => false,
            'data' => null,
            'http_code' => $httpCode,
            'error' => $curlError !== '' ? $curlError : ('HTTP ' . $httpCode),
        ];
    }

    $data = json_decode($body, true);
    if (!is_array($data)) {
        return [
            'ok' => false,
            'data' => null,
            'http_code' => $httpCode,
            'error' => 'Respuesta JSON inválida',
        ];
    }

    return [
        'ok' => true,
        'data' => $data,
        'http_code' => $httpCode,
        'error' => '',
    ];
}

function wisphubGetPaidInvoicesPage($offset, $limit, $fromDate, $toDate) {
    require_once __DIR__ . '/config_wisphub.php';

    // WispHub documenta /api/facturas/ como el recurso de consulta de pagos:
    // estado=2 (Pagada) + rango de fecha_pago. /api/pagos/ no forma parte del
    // contrato público y puede responder vacío/404, que era la causa del panel en cero.
    $bases = array_values(array_unique([
        'https://api.wisphub.net/api',
        rtrim(WISPHUB_API_URL, '/'),
    ]));

    $query = http_build_query([
        'estado' => 2,
        'fecha_pago__range_0' => $fromDate,
        'fecha_pago__range_1' => $toDate,
        'limit' => (int)$limit,
        'offset' => (int)$offset,
    ]);

    $lastError = 'No fue posible consultar WispHub.';
    foreach ($bases as $base) {
        $url = rtrim($base, '/') . '/facturas/?' . $query;
        $result = wisphubFetchJson($url);
        if ($result['ok']) {
            return [
                'data' => $result['data'],
                'base' => $base,
                'error' => '',
            ];
        }
        $lastError = 'WispHub ' . ($result['error'] ?? 'no disponible');
    }

    return [
        'data' => null,
        'base' => '',
        'error' => $lastError,
    ];
}

function invoiceServiceId($row) {
    if (!is_array($row)) return '';

    foreach (['id_servicio', 'servicio_id'] as $key) {
        if (isset($row[$key]) && $row[$key] !== '') return (string)$row[$key];
    }

    $service = $row['servicio'] ?? null;
    $serviceId = auditScalar($service, ['id_servicio', 'id']);
    if ($serviceId !== '') return $serviceId;

    $articles = is_array($row['articulos'] ?? null) ? $row['articulos'] : [];
    foreach ($articles as $article) {
        if (!is_array($article)) continue;
        $serviceId = auditScalar($article['servicio'] ?? null, ['id_servicio', 'id']);
        if ($serviceId !== '') return $serviceId;
        foreach (['id_servicio', 'servicio_id'] as $key) {
            if (isset($article[$key]) && $article[$key] !== '') return (string)$article[$key];
        }
    }

    return '';
}

function wisphubRecentPayments($days = 30, &$diagnostic = null) {
    $days = max(1, (int)$days);
    $fromDate = date('Y-m-d', strtotime('-' . $days . ' days'));
    $toDate = date('Y-m-d');
    $cutoff = strtotime($fromDate . ' 00:00:00');
    $pageSize = 300;
    $offset = 0;
    $out = [];
    $maxPages = 20;

    $diagnostic = [
        'status' => 'ok',
        'source' => 'facturas',
        'base' => '',
        'pages' => 0,
        'error' => '',
    ];

    for ($page = 0; $page < $maxPages; $page++) {
        $pageResult = wisphubGetPaidInvoicesPage($offset, $pageSize, $fromDate, $toDate);
        $data = $pageResult['data'];
        if ($data === null) {
            if ($page === 0) {
                $diagnostic['status'] = 'error';
                $diagnostic['error'] = $pageResult['error'];
            }
            break;
        }

        $diagnostic['base'] = $pageResult['base'];
        $diagnostic['pages'] += 1;

        $rows = is_array($data['results'] ?? null) ? $data['results'] : (array_is_list($data) ? $data : []);
        if (!$rows) break;

        foreach ($rows as $row) {
            if (!is_array($row)) continue;

            $dateRaw = $row['fecha_pago'] ?? '';
            $ts = $dateRaw ? strtotime((string)$dateRaw) : false;
            if ($ts === false || $ts < $cutoff) continue;

            $invoiceId = trim((string)($row['id_factura'] ?? $row['folio'] ?? $row['id'] ?? ''));
            $paymentId = trim((string)($row['id_pago'] ?? ''));
            $reference = trim((string)($row['referencia'] ?? $row['reference'] ?? $row['numero_referencia'] ?? $row['nro_referencia'] ?? ''));

            $client = $row['cliente'] ?? $row['client'] ?? $row['usuario'] ?? $row['user'] ?? '';
            $method = $row['forma_pago'] ?? $row['metodo_pago'] ?? $row['payment_method'] ?? '';
            $amount = $row['total_cobrado'] ?? $row['monto'] ?? $row['cantidad'] ?? $row['total'] ?? $row['importe'] ?? null;

            $clientName = auditScalar($client, ['nombre', 'name', 'cliente', 'razon_social']);
            if ($clientName === '') {
                $clientName = trim((string)($row['nombre_cliente'] ?? $row['cliente_nombre'] ?? $row['nombre'] ?? ''));
            }

            $username = auditScalar($client, ['usuario', 'username']);
            $serviceId = invoiceServiceId($row);
            $stableId = $paymentId !== ''
                ? $paymentId
                : ($invoiceId !== '' ? ('invoice-' . $invoiceId) : sha1(json_encode([$reference, $dateRaw, $clientName, $amount])));

            $out[] = [
                'id' => 'wisphub-' . $stableId,
                'payment_id' => $paymentId,
                'created_at' => date('c', $ts),
                'source' => 'wisphub_history',
                'client_name' => $clientName,
                'username' => $username,
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

$days = 30;
$cutoff = strtotime('-' . $days . ' days');
$limit = max(1, min(5000, (int)($_GET['limit'] ?? 2000)));
$path = paymentAuditStorePath();
$items = [];
if (is_file($path)) {
    $lines = @file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    foreach (array_reverse($lines) as $line) {
        $row = json_decode($line, true);
        if (!is_array($row)) continue;
        $ts = auditTimestamp($row);
        if ($ts === false || $ts < $cutoff) continue;
        $items[] = $row;
    }
}

// Local Portal/Bot records preserve their exact source; WispHub paid invoices
// backfill every other payment registered during the same 30-day period.
$wisphubDiagnostic = null;
$recent = wisphubRecentPayments($days, $wisphubDiagnostic);
$seen = [];
$merged = [];
foreach (array_merge($items, $recent) as $row) {
    if (!is_array($row)) continue;
    $reference = strtolower(trim((string)($row['reference'] ?? '')));
    $invoiceId = strtolower(trim((string)($row['invoice_id'] ?? '')));
    $paymentDate = strtolower(trim((string)($row['payment_date'] ?? '')));
    $amount = strtolower(trim((string)($row['amount'] ?? '')));
    $paymentId = strtolower(trim((string)($row['payment_id'] ?? '')));

    // Prefer invoice/reference/date/amount so the local audit row wins over the
    // WispHub backfill row for the same operation and its source stays accurate.
    $composite = $invoiceId . '|' . $reference . '|' . $paymentDate . '|' . $amount;
    $key = trim($composite, '|') !== ''
        ? 'cmp:' . $composite
        : 'id:' . ($paymentId !== '' ? $paymentId : strtolower((string)($row['id'] ?? '')));
    if ($key === 'id:' || isset($seen[$key])) continue;
    $seen[$key] = true;
    $merged[] = $row;
}

usort($merged, function($a, $b) {
    $aTs = auditTimestamp($a) ?: 0;
    $bTs = auditTimestamp($b) ?: 0;
    return $bTs <=> $aTs;
});
$merged = array_slice($merged, 0, $limit);

$sourceCounts = [
    'portal' => 0,
    'whatsapp_bot' => 0,
    'wisphub_history' => 0,
];
foreach ($merged as $row) {
    $source = $row['source'] ?? '';
    if (array_key_exists($source, $sourceCounts)) $sourceCounts[$source] += 1;
}

auditRespond(200, [
    'payments' => $merged,
    'count' => count($merged),
    'historical_days' => $days,
    'source_counts' => $sourceCounts,
    'wisphub_count' => count($recent),
    'wisphub_status' => $wisphubDiagnostic['status'] ?? 'unknown',
    'wisphub_source' => $wisphubDiagnostic['source'] ?? 'facturas',
    'version' => PAYMENT_AUDIT_VERSION,
    'compat_version' => PAYMENT_AUDIT_COMPAT_VERSION,
]);
