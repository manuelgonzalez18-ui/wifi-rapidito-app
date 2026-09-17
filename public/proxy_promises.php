<?php
error_reporting(0);
ini_set('display_errors', 0);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function promiseRespond($status, $payload) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['health'])) {
    promiseRespond(200, ['status' => 'ready', 'version' => '3.5-wisphub-promise-date-format']);
}

require_once __DIR__ . '/config_wisphub.php';
require_once __DIR__ . '/promise_restrictions_lib.php';

$logFile = __DIR__ . '/api_logs.txt';
$promiseCreateUrl = rtrim(WISPHUB_API_URL, '/') . '/promesa-pago/';
$method = $_SERVER['REQUEST_METHOD'];

function promiseLog($message) {
    global $logFile;
    @file_put_contents($logFile, '[' . date('Y-m-d H:i:s') . "][PROMISE] $message\n", FILE_APPEND);
}

function wisphubRequest($url, $method = 'GET', $payload = null, &$httpCode = null, &$error = null, &$contentType = null) {
    $headers = [
        'Authorization: Api-Key ' . WISPHUB_TOKEN,
        'Accept: application/json',
        'Content-Type: application/json',
    ];
    $ch = curl_init($url);
    $options = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 18,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 3,
        CURLOPT_ENCODING => '',
    ];
    if ($method === 'POST') {
        $options[CURLOPT_POST] = true;
        $options[CURLOPT_POSTFIELDS] = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    curl_setopt_array($ch, $options);
    $body = curl_exec($ch);
    $errno = curl_errno($ch);
    $errorText = curl_error($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = strtolower((string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE));
    curl_close($ch);

    if ($body === false || $errno !== 0) {
        $error = 'curl:' . $errno . ' ' . $errorText;
        return null;
    }
    return $body;
}

function invoiceIdentifiers($invoice) {
    if (!is_array($invoice)) return [];
    $client = is_array($invoice['cliente'] ?? null) ? $invoice['cliente'] : [];
    $serviceValue = pr_first_value($invoice, ['id_servicio', 'servicio_id', 'servicio'], '');
    $serviceId = pr_scalar_id($serviceValue);
    if ($serviceId === '' && isset($client['id_servicio'])) $serviceId = (string) $client['id_servicio'];
    $clientId = pr_scalar_id(pr_first_value($invoice, ['id_cliente', 'cliente_id'], ''));
    if ($clientId === '') $clientId = pr_scalar_id(pr_first_value($client, ['id_cliente', 'id', 'pk'], ''));

    return [
        'service_id' => trim((string) $serviceId),
        'client_id' => trim((string) $clientId),
        'username' => pr_normalize_username(pr_first_value($client, ['usuario', 'usuario_portal', 'username'], '')),
        'phone' => pr_normalize_phone(pr_first_value($client, ['telefono', 'movil', 'celular', 'phone'], '')),
    ];
}

function normalizePromiseDeadline($value) {
    $value = trim((string) $value);
    if ($value === '') return '';

    foreach (['Y-m-d', 'Y/m/d'] as $format) {
        $date = DateTime::createFromFormat('!' . $format, $value);
        $errors = DateTime::getLastErrors();
        $valid = $date instanceof DateTime
            && ($errors === false || (($errors['warning_count'] ?? 0) === 0 && ($errors['error_count'] ?? 0) === 0));
        if ($valid) {
            // WispHub accepts fecha_limite as YYYY-MM-DD or YYYY-MM-DD hh:mm.
            return $date->format('Y-m-d');
        }
    }

    return '';
}

function promiseApiError($decoded) {
    if (!is_array($decoded)) return '';

    foreach (['error', 'detail', 'message', 'non_field_errors'] as $key) {
        if (!array_key_exists($key, $decoded)) continue;
        $value = $decoded[$key];
        if (is_scalar($value)) return trim((string) $value);
        if (is_array($value)) {
            foreach ($value as $item) {
                if (is_scalar($item) && trim((string) $item) !== '') return trim((string) $item);
            }
        }
    }

    foreach ($decoded as $key => $value) {
        if (is_scalar($value) && trim((string) $value) !== '') {
            return trim((string) $key) . ': ' . trim((string) $value);
        }
        if (is_array($value)) {
            foreach ($value as $item) {
                if (is_scalar($item) && trim((string) $item) !== '') {
                    return trim((string) $key) . ': ' . trim((string) $item);
                }
            }
        }
    }

    return '';
}

if ($method === 'GET') {
    $serviceId = isset($_GET['cliente']) ? preg_replace('/\D+/', '', (string) $_GET['cliente']) : '';
    if ($serviceId === '') {
        promiseRespond(200, ['results' => []]);
    }

    $clientHttp = 0;
    $clientError = null;
    $clientType = null;
    $clientBody = wisphubRequest(rtrim(WISPHUB_API_URL, '/') . '/clientes/' . rawurlencode($serviceId) . '/', 'GET', null, $clientHttp, $clientError, $clientType);
    if ($clientBody === null || $clientHttp < 200 || $clientHttp >= 300) {
        promiseLog("Client promise lookup failed service=$serviceId http=$clientHttp error=$clientError");
        promiseRespond(200, ['results' => []]);
    }
    $client = json_decode((string) $clientBody, true);
    if (!is_array($client)) {
        promiseLog("Client promise lookup returned non-JSON service=$serviceId type=$clientType");
        promiseRespond(200, ['results' => []]);
    }

    $promise = $client['promesa_pago'] ?? null;
    if (!is_array($promise) || !$promise) {
        promiseRespond(200, ['results' => []]);
    }
    if (!isset($promise['cliente'])) $promise['cliente'] = $serviceId;
    promiseRespond(200, ['results' => [$promise]]);
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) $data = $_POST;
if (!is_array($data)) $data = [];

if ($method !== 'POST') {
    promiseRespond(405, ['error' => 'Método no permitido.']);
}

$invoiceId = (int) ($data['id_factura'] ?? $data['factura'] ?? 0);
if ($invoiceId <= 0) {
    promiseRespond(422, ['error' => 'No se recibió una factura válida para registrar la promesa.']);
}

$deadlineRaw = trim((string) ($data['fecha_limite'] ?? $data['fecha_limite_de_pago'] ?? ''));
$deadline = normalizePromiseDeadline($deadlineRaw);
if ($deadline === '') {
    promiseRespond(422, ['error' => 'No se recibió una fecha límite válida para la promesa.']);
}

$invoiceHttp = 0;
$invoiceError = null;
$invoiceType = null;
$invoiceBody = wisphubRequest(rtrim(WISPHUB_API_URL, '/') . '/facturas/' . $invoiceId . '/', 'GET', null, $invoiceHttp, $invoiceError, $invoiceType);
if ($invoiceBody === null || $invoiceHttp < 200 || $invoiceHttp >= 300) {
    promiseLog("Invoice verification failed for invoice=$invoiceId http=$invoiceHttp error=$invoiceError");
    promiseRespond(503, [
        'error' => 'No pudimos verificar la factura en WispHub. Intenta nuevamente en unos minutos.',
        'retryable' => true,
    ]);
}

$invoice = json_decode($invoiceBody, true);
if (!is_array($invoice)) {
    promiseLog("Invoice verification returned non-JSON for invoice=$invoiceId type=$invoiceType");
    promiseRespond(503, ['error' => 'WispHub devolvió una factura no válida. Intenta nuevamente.']);
}

$identifiers = invoiceIdentifiers($invoice);
$activeRestriction = pr_find_active_restriction($identifiers);
if ($activeRestriction) {
    $until = substr((string) ($activeRestriction['ends_at'] ?? ''), 0, 10);
    promiseLog("Promise blocked invoice=$invoiceId service=" . ($identifiers['service_id'] ?? '') . " until=$until");
    promiseRespond(423, [
        'error' => 'La promesa de pago está suspendida temporalmente por el incumplimiento de una promesa anterior.',
        'blocked' => true,
        'blocked_until' => $until,
    ]);
}

// WispHub's POST /api/promesa-pago/ contract is:
// id_factura, fecha_limite (YYYY-MM-DD or YYYY-MM-DD hh:mm), comentarios and accion (0|1).
// Do not translate these fields to the response names "factura" or
// "fecha_limite_de_pago"; those are not accepted by the create endpoint.
$action = (int) ($data['accion'] ?? 1);
if (!in_array($action, [0, 1], true)) $action = 1;
$outboundData = [
    'id_factura' => $invoiceId,
    'fecha_limite' => $deadline,
    'comentarios' => trim((string) ($data['comentarios'] ?? '')),
    'accion' => $action,
];

$httpCode = 0;
$requestError = null;
$contentType = null;
$response = wisphubRequest($promiseCreateUrl, 'POST', $outboundData, $httpCode, $requestError, $contentType);

if ($response === null) {
    promiseLog("WispHub request failed url=$promiseCreateUrl error=$requestError");
    promiseRespond(503, ['error' => 'WispHub no está respondiendo en este momento.', 'retryable' => true]);
}

$decoded = json_decode((string) $response, true);
if (!is_array($decoded)) {
    $preview = preg_replace('/\s+/', ' ', substr((string) $response, 0, 180));
    promiseLog("Non-JSON promise response url=$promiseCreateUrl code=$httpCode type=$contentType preview=$preview");
    promiseRespond(502, [
        'error' => 'No fue posible registrar la promesa en este momento. Intenta nuevamente en unos minutos.',
        'retryable' => true,
    ]);
}

if ($httpCode < 200 || $httpCode >= 300) {
    $safeError = promiseApiError($decoded);
    if ($httpCode === 403) {
        $safeError = 'La cuenta API de WispHub no tiene habilitado el permiso de Promesas de Pago.';
    } elseif ($safeError === '' || stripos($safeError, '<html') !== false || stripos($safeError, '<!doctype') !== false) {
        $safeError = 'WispHub no pudo registrar la promesa en este momento.';
    }
    promiseLog("Promise rejected url=$promiseCreateUrl invoice=$invoiceId code=$httpCode error=" . substr($safeError, 0, 220));
    promiseRespond($httpCode ?: 502, [
        'error' => $safeError,
        'retryable' => $httpCode >= 500,
        'upstream_status' => $httpCode,
    ]);
}

sendPromiseEmailNotification($data);
promiseLog("REQ: $promiseCreateUrl | invoice=$invoiceId | CODE: $httpCode | JSON OK");
http_response_code($httpCode ?: 200);
echo json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

function sendPromiseEmailNotification($data) {
    $to = 'admin@wifirapidito.com';
    $invoiceId = htmlspecialchars((string) ($data['id_factura'] ?? $data['factura'] ?? 'N/A'), ENT_QUOTES, 'UTF-8');
    $promiseDate = htmlspecialchars((string) ($data['fecha_limite'] ?? $data['fecha_limite_de_pago'] ?? 'N/A'), ENT_QUOTES, 'UTF-8');
    $subject = 'NUEVA PROMESA DE PAGO: Factura ' . $invoiceId;
    $headers = "From: noreply@wifirapidito.com\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $body = "<html><body style='font-family:sans-serif'>";
    $body .= "<h2 style='color:#16a34a'>Nueva Promesa de Pago</h2>";
    $body .= "<p><strong>Factura:</strong> $invoiceId</p>";
    $body .= "<p><strong>Fecha límite:</strong> $promiseDate</p>";
    $body .= "<p>Registrada exitosamente en WispHub.</p>";
    $body .= "</body></html>";
    @mail($to, $subject, $body, $headers);
}
?>
