<?php
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function pr_respond($status, $payload) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['health'])) {
    pr_respond(200, ['status' => 'ready', 'version' => '1.0-promise-restrictions']);
}

require_once __DIR__ . '/promise_restrictions_lib.php';
require_once __DIR__ . '/config_wisphub.php';

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

function pr_require_admin() {
    if (empty($_SESSION['staff_authenticated']) || empty($_SESSION['staff_is_admin'])) {
        pr_respond(403, ['error' => 'Se requiere una sesión de administrador.']);
    }
}

function pr_wisphub_get($url, &$error = null) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Api-Key ' . WISPHUB_TOKEN,
            'Accept: application/json',
        ],
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 3,
        CURLOPT_ENCODING => '',
    ]);
    $body = curl_exec($ch);
    $errno = curl_errno($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($body === false || $errno !== 0) {
        $error = 'No se pudo conectar con WispHub.';
        return null;
    }
    if ($httpCode < 200 || $httpCode >= 300) {
        $error = 'WispHub respondió HTTP ' . $httpCode . '.';
        return null;
    }
    $decoded = json_decode($body, true);
    if (!is_array($decoded)) {
        $error = 'WispHub devolvió una respuesta no válida.';
        return null;
    }
    return $decoded;
}

function pr_client_cache_path() {
    return pr_private_directory() . '/promise-client-directory.json';
}

function pr_fetch_clients($force = false, &$error = null) {
    $cachePath = pr_client_cache_path();
    if (!$force && is_file($cachePath) && (time() - filemtime($cachePath)) < 300) {
        $cached = json_decode((string) @file_get_contents($cachePath), true);
        if (is_array($cached)) return $cached;
    }

    $base = rtrim(WISPHUB_API_URL, '/') . '/clientes/';
    $clients = [];
    $offset = 0;
    $pageSize = 300;
    $maxPages = 40;

    for ($page = 0; $page < $maxPages; $page++) {
        $url = $base . '?limit=' . $pageSize . '&offset=' . $offset;
        $data = pr_wisphub_get($url, $error);
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

function pr_client_summary($client) {
    $ids = pr_identifiers_from_client($client);
    return array_merge($ids, [
        'name' => trim((string) pr_first_value($client, ['nombre', 'name', 'cliente'], 'Cliente')),
        'cedula' => trim((string) pr_first_value($client, ['cedula', 'documento', 'rif'], '')),
        'email' => trim((string) pr_first_value($client, ['correo', 'email'], '')),
    ]);
}

function pr_find_client($query, &$error = null) {
    $queryRaw = trim((string) $query);
    if ($queryRaw === '') return null;
    $queryUser = pr_normalize_username($queryRaw);
    $queryPhone = pr_normalize_phone($queryRaw);
    $queryId = preg_match('/^\d+$/', $queryRaw) ? $queryRaw : '';

    $clients = pr_fetch_clients(false, $error);
    if (!is_array($clients)) return null;

    foreach ($clients as $client) {
        $summary = pr_client_summary($client);
        if ($queryUser !== '' && $summary['username'] !== '' && $summary['username'] === $queryUser) return $summary;
        if ($queryId !== '' && ($summary['service_id'] === $queryId || $summary['client_id'] === $queryId)) return $summary;
        if ($queryPhone !== '' && strlen($queryPhone) >= 10 && $summary['phone'] !== '' && $summary['phone'] === $queryPhone) return $summary;
    }
    return null;
}

function pr_request_identifiers($source) {
    return [
        'service_id' => trim((string) ($source['service_id'] ?? '')),
        'client_id' => trim((string) ($source['client_id'] ?? '')),
        'username' => pr_normalize_username($source['username'] ?? ''),
        'phone' => pr_normalize_phone($source['phone'] ?? ''),
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = (string) ($_GET['action'] ?? 'check');

    if ($action === 'check') {
        $identifiers = pr_request_identifiers($_GET);
        $provided = count(array_filter($identifiers, fn($value) => $value !== ''));
        if ($provided < 2) {
            pr_respond(422, ['error' => 'Se requieren al menos dos identificadores del cliente.']);
        }
        pr_respond(200, pr_public_payload(pr_find_active_restriction($identifiers)));
    }

    if ($action === 'list') {
        pr_require_admin();
        $records = pr_load_records();
        usort($records, fn($a, $b) => (strtotime((string) ($b['created_at'] ?? '')) ?: 0) <=> (strtotime((string) ($a['created_at'] ?? '')) ?: 0));
        $result = array_map(function ($record) {
            $record['status'] = !empty($record['revoked_at']) ? 'revoked' : (pr_record_is_active($record) ? 'active' : 'expired');
            return $record;
        }, $records);
        pr_respond(200, ['restrictions' => $result, 'version' => '1.0-promise-restrictions']);
    }

    pr_respond(404, ['error' => 'Acción no encontrada.']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    pr_respond(405, ['error' => 'Método no permitido.']);
}

pr_require_admin();
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) $input = $_POST;
if (!is_array($input)) $input = [];
$action = (string) ($input['action'] ?? 'create');

if ($action === 'create') {
    $query = trim((string) ($input['query'] ?? ''));
    $incidentDate = trim((string) ($input['incident_date'] ?? date('Y-m-d')));
    $note = trim((string) ($input['note'] ?? ''));

    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $incidentDate);
    if ($query === '' || !$date || $date->format('Y-m-d') !== $incidentDate) {
        pr_respond(422, ['error' => 'Indica un usuario/servicio/teléfono válido y la fecha del incumplimiento.']);
    }

    $lookupError = null;
    $client = pr_find_client($query, $lookupError);
    if (!$client) {
        pr_respond($lookupError ? 503 : 404, ['error' => $lookupError ?: 'No encontramos ese cliente en WispHub.']);
    }

    $startsAt = $date->setTime(0, 0, 0);
    $endsAt = pr_add_months_clamped($date, 3)->setTime(23, 59, 59);
    $records = pr_load_records();
    $createdBy = (string) ($_SESSION['staff_username'] ?? 'admin');

    foreach ($records as &$existing) {
        if (pr_record_is_active($existing) && pr_records_match($existing, $client)) {
            $existing['revoked_at'] = date(DATE_ATOM);
            $existing['revoked_by'] = $createdBy;
            $existing['revoked_reason'] = 'Reemplazada por un nuevo incumplimiento.';
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
        'note' => mb_substr($note, 0, 500),
        'incident_date' => $date->format('Y-m-d'),
        'starts_at' => $startsAt->format(DATE_ATOM),
        'ends_at' => $endsAt->format(DATE_ATOM),
        'created_at' => date(DATE_ATOM),
        'created_by' => $createdBy,
        'revoked_at' => null,
        'revoked_by' => null,
    ];
    $records[] = $record;

    if (!pr_save_records($records)) {
        pr_respond(500, ['error' => 'No pudimos guardar la restricción en el servidor.']);
    }

    $record['status'] = 'active';
    pr_respond(201, ['success' => true, 'restriction' => $record]);
}

if ($action === 'revoke') {
    $id = trim((string) ($input['id'] ?? ''));
    if ($id === '') pr_respond(422, ['error' => 'Falta el identificador de la restricción.']);
    $records = pr_load_records();
    $found = false;
    foreach ($records as &$record) {
        if (($record['id'] ?? '') !== $id) continue;
        $record['revoked_at'] = date(DATE_ATOM);
        $record['revoked_by'] = (string) ($_SESSION['staff_username'] ?? 'admin');
        $record['revoked_reason'] = 'Retirada manualmente por administración.';
        $found = true;
        break;
    }
    unset($record);
    if (!$found) pr_respond(404, ['error' => 'Restricción no encontrada.']);
    if (!pr_save_records($records)) pr_respond(500, ['error' => 'No pudimos actualizar la restricción.']);
    pr_respond(200, ['success' => true]);
}

pr_respond(404, ['error' => 'Acción no encontrada.']);
?>
