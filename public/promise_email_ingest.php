<?php
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');
header('Access-Control-Allow-Methods: POST, GET');

function pei_respond($status, $payload) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['health'])) {
    pei_respond(200, ['status' => 'ready', 'version' => '1.0-promise-email-ingest']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    pei_respond(405, ['error' => 'Método no permitido.']);
}

require_once __DIR__ . '/promise_restrictions_lib.php';
require_once __DIR__ . '/config_wisphub.php';

function pei_bearer_token() {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if ($header === '' && function_exists('getallheaders')) {
        $headers = getallheaders();
        $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    if (!preg_match('/^Bearer\s+(.+)$/i', trim((string) $header), $match)) return '';
    return trim($match[1]);
}

function pei_verify_google_identity($token, &$error = null) {
    if ($token === '') {
        $error = 'Falta identidad de Google.';
        return false;
    }

    $url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . rawurlencode($token);
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_FOLLOWLOCATION => false,
    ]);
    $body = curl_exec($ch);
    $errno = curl_errno($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($body === false || $errno !== 0 || $code !== 200) {
        $error = 'No se pudo verificar la identidad de Google.';
        return false;
    }

    $claims = json_decode($body, true);
    if (!is_array($claims)) {
        $error = 'Respuesta de identidad inválida.';
        return false;
    }

    $email = strtolower(trim((string) ($claims['email'] ?? '')));
    $verified = $claims['email_verified'] ?? false;
    $isVerified = $verified === true || $verified === 'true' || $verified === 1 || $verified === '1';
    $expiresAt = isset($claims['exp']) && is_numeric($claims['exp']) ? (int) $claims['exp'] : 0;

    if ($email !== 'wifirapidito@gmail.com' || !$isVerified || ($expiresAt > 0 && $expiresAt <= time())) {
        $error = 'La cuenta de Google no está autorizada.';
        return false;
    }
    return true;
}

function pei_wisphub_get($url, &$error = null) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Api-Key ' . WISPHUB_TOKEN,
            'Accept: application/json',
        ],
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 3,
        CURLOPT_ENCODING => '',
    ]);
    $body = curl_exec($ch);
    $errno = curl_errno($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($body === false || $errno !== 0) {
        $error = 'No se pudo conectar con WispHub.';
        return null;
    }
    if ($code < 200 || $code >= 300) {
        $error = 'WispHub respondió HTTP ' . $code . '.';
        return null;
    }
    $decoded = json_decode($body, true);
    if (!is_array($decoded)) {
        $error = 'WispHub devolvió una respuesta inválida.';
        return null;
    }
    return $decoded;
}

function pei_client_cache_path() {
    return pr_private_directory() . '/promise-email-client-directory.json';
}

function pei_fetch_clients(&$error = null) {
    $cachePath = pei_client_cache_path();
    if (is_file($cachePath) && (time() - filemtime($cachePath)) < 300) {
        $cached = json_decode((string) @file_get_contents($cachePath), true);
        if (is_array($cached)) return $cached;
    }

    $base = rtrim(WISPHUB_API_URL, '/') . '/clientes/';
    $clients = [];
    $offset = 0;
    $pageSize = 300;

    for ($page = 0; $page < 40; $page++) {
        $url = $base . '?limit=' . $pageSize . '&offset=' . $offset;
        $data = pei_wisphub_get($url, $error);
        if ($data === null) {
            if ($clients) break;
            return null;
        }
        $batch = is_array($data['results'] ?? null) ? $data['results'] : (array_is_list($data) ? $data : [$data]);
        foreach ($batch as $client) {
            if (is_array($client)) $clients[] = $client;
        }
        $received = count($batch);
        if ($received === 0) break;
        $offset += $received;
        $total = isset($data['count']) && is_numeric($data['count']) ? (int) $data['count'] : null;
        if ($total !== null && $offset >= $total) break;
        if ($total === null && $received < $pageSize && empty($data['next'])) break;
    }

    if ($clients) {
        @file_put_contents($cachePath, json_encode($clients, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
        @chmod($cachePath, 0600);
    }
    return $clients;
}

function pei_client_summary($client) {
    $ids = pr_identifiers_from_client($client);
    return array_merge($ids, [
        'name' => trim((string) pr_first_value($client, ['nombre', 'nombre_cliente', 'name', 'cliente'], 'Cliente')),
        'cedula' => trim((string) pr_first_value($client, ['cedula', 'documento', 'rif'], '')),
        'email' => trim((string) pr_first_value($client, ['correo', 'email'], '')),
    ]);
}

function pei_find_client_by_username($username, &$error = null) {
    $needle = pr_normalize_username($username);
    if ($needle === '') return null;
    $clients = pei_fetch_clients($error);
    if (!is_array($clients)) return null;
    foreach ($clients as $client) {
        $summary = pei_client_summary($client);
        if ($summary['username'] !== '' && hash_equals($summary['username'], $needle)) return $summary;
    }
    return null;
}

function pei_events_path() {
    return pr_private_directory() . '/promise-email-events.json';
}

function pei_load_events() {
    $path = pei_events_path();
    if (!is_file($path)) return [];
    $decoded = json_decode((string) @file_get_contents($path), true);
    return is_array($decoded) ? $decoded : [];
}

function pei_save_events($events) {
    if (count($events) > 5000) {
        uasort($events, fn($a, $b) => strcmp((string) ($b['processed_at'] ?? ''), (string) ($a['processed_at'] ?? '')));
        $events = array_slice($events, 0, 5000, true);
    }
    $path = pei_events_path();
    $tmp = $path . '.tmp';
    $encoded = json_encode($events, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($encoded === false || @file_put_contents($tmp, $encoded, LOCK_EX) === false) return false;
    @chmod($tmp, 0600);
    if (!@rename($tmp, $path)) {
        @unlink($tmp);
        return false;
    }
    @chmod($path, 0600);
    return true;
}

$authError = null;
if (!pei_verify_google_identity(pei_bearer_token(), $authError)) {
    pei_respond(401, ['error' => $authError ?: 'No autorizado.']);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) pei_respond(400, ['error' => 'JSON inválido.']);

$messageId = trim((string) ($input['gmail_message_id'] ?? ''));
$from = strtolower(trim((string) ($input['from'] ?? '')));
$subject = trim((string) ($input['subject'] ?? ''));
$incidentDate = trim((string) ($input['incident_date'] ?? ''));

if ($messageId === '' || strlen($messageId) > 200) pei_respond(422, ['error' => 'gmail_message_id inválido.']);
if (!preg_match('/(?:^|[<\s])notificaciones@wisphub\.site(?:>|\s|$)/i', $from)) {
    pei_respond(422, ['error' => 'Remitente no reconocido.']);
}
if (!preg_match('/^Success Corte Incumplimiento Promesa de Pago User([A-Za-z0-9._-]+)@wifi-rapidito(?:-|$)/i', $subject, $match)) {
    pei_respond(422, ['error' => 'Asunto de WispHub no reconocido.']);
}
$username = pr_normalize_username($match[1]);
$date = DateTimeImmutable::createFromFormat('!Y-m-d', $incidentDate);
if (!$date || $date->format('Y-m-d') !== $incidentDate) pei_respond(422, ['error' => 'incident_date inválida.']);

$events = pei_load_events();
if (isset($events[$messageId])) {
    pei_respond(200, [
        'success' => true,
        'duplicate' => true,
        'username' => $events[$messageId]['username'] ?? $username,
    ]);
}

$lookupError = null;
$client = pei_find_client_by_username($username, $lookupError);
if (!$client) {
    pei_respond($lookupError ? 503 : 404, ['error' => $lookupError ?: 'Cliente no encontrado en WispHub.', 'username' => $username]);
}

$startsAt = $date->setTime(0, 0, 0);
$endsAt = pr_add_months_clamped($date, 3)->setTime(0, 0, 0);
$records = pr_load_records();

foreach ($records as &$existing) {
    if (pr_record_is_active($existing) && pr_records_match($existing, $client)) {
        $existing['revoked_at'] = date(DATE_ATOM);
        $existing['revoked_by'] = 'gmail-wisphub-automation';
        $existing['revoked_reason'] = 'Reemplazada por un nuevo incumplimiento notificado por WispHub.';
    }
}
unset($existing);

$record = [
    'id' => bin2hex(random_bytes(8)),
    'client_name' => $client['name'],
    'service_id' => $client['service_id'],
    'client_id' => $client['client_id'],
    'username' => $client['username'],
    'phone' => $client['phone'],
    'cedula' => $client['cedula'],
    'email' => $client['email'],
    'reason' => 'Incumplimiento de promesa de pago',
    'note' => 'Restricción automática por correo de corte de WispHub.',
    'incident_date' => $date->format('Y-m-d'),
    'starts_at' => $startsAt->format(DATE_ATOM),
    'ends_at' => $endsAt->format(DATE_ATOM),
    'created_at' => date(DATE_ATOM),
    'created_by' => 'gmail-wisphub-automation',
    'source' => 'gmail-wisphub',
    'source_message_id' => $messageId,
    'source_subject' => substr($subject, 0, 500),
    'revoked_at' => null,
    'revoked_by' => null,
];
$records[] = $record;

if (!pr_save_records($records)) pei_respond(500, ['error' => 'No se pudo guardar la restricción.']);

$events[$messageId] = [
    'username' => $client['username'],
    'incident_date' => $date->format('Y-m-d'),
    'restriction_id' => $record['id'],
    'processed_at' => date(DATE_ATOM),
];
if (!pei_save_events($events)) {
    // La restricción ya quedó guardada. No se revierte; la idempotencia también
    // queda protegida por source_message_id dentro del registro principal.
}

pei_respond(201, [
    'success' => true,
    'duplicate' => false,
    'restriction' => [
        'id' => $record['id'],
        'username' => $record['username'],
        'service_id' => $record['service_id'],
        'blocked_until' => substr($record['ends_at'], 0, 10),
    ],
]);
?>
