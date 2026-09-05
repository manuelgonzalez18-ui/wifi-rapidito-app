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
    promiseRespond(200, ['status' => 'ready', 'version' => '3.2-promise-deadline-2359']);
}

require_once __DIR__ . '/config_wisphub.php';
require_once __DIR__ . '/promise_restrictions_lib.php';

$logFile = __DIR__ . '/api_logs.txt';
$baseUrl = rtrim(WISPHUB_API_URL, '/') . '/promesas-de-pago/';
$method = $_SERVER['REQUEST_METHOD'];

function promiseLog($message) {
    global $logFile;
    @file_put_contents($logFile, '[' . date('Y-m-d H:i:s') . "][PROMISE] $message\n", FILE_APPEND);
}

function wisphubRequest($url, $method = 'GET', $payload = null, &$httpCode = null, &$error = null) {
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

function promiseDeadline($data) {
    $value = trim((string) ($data['fecha_limite'] ?? $data['fecha_limite_de_pago'] ?? ''));
    if ($value === '') return '';
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', substr($value, 0, 10));
    return ($date && $date->format('Y-m-d') === substr($value, 0, 10)) ? $date->format('Y-m-d') : '';
}

function promiseClientSnapshot($invoice, $identifiers) {
    $client = is_array($invoice['cliente'] ?? null) ? $invoice['cliente'] : [];
    return [
        'nombre' => trim((string) pr_first_value($client, ['nombre', 'name', 'cliente'], pr_first_value($invoice, ['nombre_cliente', 'cliente_nombre'], 'Cliente'))),
        'id_servicio' => $identifiers['service_id'] ?? '',
        'id_cliente' => $identifiers['client_id'] ?? '',
        'usuario' => $identifiers['username'] ?? '',
        'telefono' => $identifiers['phone'] ?? '',
        'cedula' => trim((string) pr_first_value($client, ['cedula', 'documento', 'rif'], '')),
        'correo' => trim((string) pr_first_value($client, ['correo', 'email'], '')),
    ];
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) $data = $_POST;
if (!is_array($data)) $data = [];

// WispHub interpreta una fecha sin hora con una hora predeterminada temprana.
// Toda promesa creada por nuestros canales vence al final del día seleccionado.
if ($method === 'POST') {
    $rawDeadline = trim((string) ($data['fecha_limite'] ?? $data['fecha_limite_de_pago'] ?? ''));
    if ($rawDeadline !== '') {
        $datePart = substr($rawDeadline, 0, 10);
        $parsedDeadline = DateTimeImmutable::createFromFormat('!Y-m-d', $datePart);
        if ($parsedDeadline && $parsedDeadline->format('Y-m-d') === $datePart) {
            $data['fecha_limite'] = $datePart . ' 23:59:00';
        }
    }
}

$invoice = null;
$identifiers = [];
$invoiceId = 0;

if ($method === 'POST') {
    $invoiceId = isset($data['id_factura']) ? (int) $data['id_factura'] : 0;
    if ($invoiceId <= 0) {
        promiseRespond(422, ['error' => 'No se recibió una factura válida para registrar la promesa.']);
    }

    $invoiceHttp = 0;
    $invoiceError = null;
    $invoiceBody = wisphubRequest(rtrim(WISPHUB_API_URL, '/') . '/facturas/' . $invoiceId . '/', 'GET', null, $invoiceHttp, $invoiceError);
    if ($invoiceBody === null || $invoiceHttp < 200 || $invoiceHttp >= 300) {
        promiseLog("Invoice verification failed for invoice=$invoiceId http=$invoiceHttp error=$invoiceError");
        promiseRespond(503, [
            'error' => 'No pudimos verificar la factura en WispHub. Intenta nuevamente en unos minutos.',
            'retryable' => true,
        ]);
    }

    $invoice = json_decode($invoiceBody, true);
    if (!is_array($invoice)) {
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
}

$query = $_SERVER['QUERY_STRING'] ?? '';
$finalUrl = $baseUrl . ($query !== '' ? '?' . $query : '');
$httpCode = 0;
$requestError = null;
$response = wisphubRequest($finalUrl, $method === 'POST' ? 'POST' : 'GET', $method === 'POST' ? $data : null, $httpCode, $requestError);

if ($response === null) {
    promiseLog("WispHub request failed url=$finalUrl error=$requestError");
    promiseRespond(503, ['error' => 'WispHub no está respondiendo en este momento.', 'retryable' => true]);
}

if ($method === 'POST' && ($httpCode === 200 || $httpCode === 201)) {
    $deadline = promiseDeadline($data);
    if ($deadline !== '' && is_array($invoice) && $invoiceId > 0) {
        $snapshot = promiseClientSnapshot($invoice, $identifiers);
        $ledgerSaved = pr_record_promise([
            'invoice_id' => (string) $invoiceId,
            'deadline' => $deadline,
            'service_id' => $identifiers['service_id'] ?? '',
            'client_id' => $identifiers['client_id'] ?? '',
            'username' => $identifiers['username'] ?? '',
            'phone' => $identifiers['phone'] ?? '',
            'client_name' => $snapshot['nombre'],
            'cedula' => $snapshot['cedula'],
            'email' => $snapshot['correo'],
            'source' => 'proxy_promises',
        ]);
        promiseLog("Promise ledger invoice=$invoiceId deadline=$deadline saved=" . ($ledgerSaved ? 'yes' : 'no'));
    } else {
        promiseLog("Promise created but ledger metadata incomplete invoice=$invoiceId deadline=$deadline");
    }
    sendPromiseEmailNotification($data);
}

promiseLog("REQ: $finalUrl | CODE: $httpCode | RES: " . substr((string) $response, 0, 120));
http_response_code($httpCode ?: 502);
echo $response;

function sendPromiseEmailNotification($data) {
    $to = 'admin@wifirapidito.com';
    $invoiceId = htmlspecialchars((string) ($data['id_factura'] ?? 'N/A'), ENT_QUOTES, 'UTF-8');
    $promiseDate = htmlspecialchars((string) ($data['fecha_limite'] ?? 'N/A'), ENT_QUOTES, 'UTF-8');
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