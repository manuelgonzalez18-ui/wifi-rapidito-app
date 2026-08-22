<?php
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['health'])) {
    echo json_encode(['status' => 'ready', 'version' => '1.1-staff-clients-offset']);
    exit;
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

function respondJson($status, $payload) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (empty($_SESSION['staff_authenticated'])) {
    respondJson(401, ['error' => 'Sesión de personal requerida.']);
}

$permissions = is_array($_SESSION['staff_permissions'] ?? null) ? $_SESSION['staff_permissions'] : [];
if (!in_array('*', $permissions, true) && !in_array('support', $permissions, true)) {
    respondJson(403, ['error' => 'Tu cuenta no tiene permiso para consultar clientes.']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondJson(405, ['error' => 'Método no permitido']);
}

require_once __DIR__ . '/config_wisphub.php';

function wisphubGet($url, $apiKey, &$error = null) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Api-Key ' . $apiKey,
            'Accept: application/json',
        ],
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 14,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 3,
        CURLOPT_ENCODING => '',
    ]);

    $body = curl_exec($ch);
    $errno = curl_errno($ch);
    $curlError = curl_error($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($body === false || $errno !== 0) {
        $error = 'curl:' . $errno . ' ' . $curlError;
        return null;
    }

    if ($httpCode < 200 || $httpCode >= 300) {
        $error = 'http:' . $httpCode;
        return null;
    }

    $data = json_decode($body, true);
    if (!is_array($data)) {
        $error = 'invalid-json';
        return null;
    }

    return $data;
}

function fetchPaginated($baseUrl, $apiKey, $maxPages = 40, &$error = null) {
    $items = [];
    $page = 0;
    $offset = 0;
    $pageSize = 300;
    $expectedTotal = null;
    $separator = str_contains($baseUrl, '?') ? '&' : '?';

    while ($page < $maxPages) {
        $page += 1;
        $url = $baseUrl . $separator . 'limit=' . $pageSize . '&offset=' . $offset;
        $pageError = null;
        $data = wisphubGet($url, $apiKey, $pageError);

        // Un segundo intento corto evita perder toda la paginación por una falla transitoria.
        if ($data === null) {
            usleep(250000);
            $data = wisphubGet($url, $apiKey, $pageError);
        }

        if ($data === null) {
            $error = $pageError;
            return $page === 1 ? null : $items;
        }

        if (isset($data['results']) && is_array($data['results'])) {
            $batch = $data['results'];
            if (isset($data['count']) && is_numeric($data['count'])) {
                $expectedTotal = max(0, (int) $data['count']);
            }

            $items = array_merge($items, $batch);
            $received = count($batch);

            if ($received === 0) break;

            $offset += $received;
            if ($expectedTotal !== null && $offset >= $expectedTotal) break;

            // Si WispHub no entrega count, next solo se usa como señal de que existe otra página.
            if ($expectedTotal === null && $received < $pageSize && empty($data['next'])) break;
            continue;
        }

        if (array_is_list($data)) {
            $items = array_merge($items, $data);
            break;
        }

        $items[] = $data;
        break;
    }

    if ($expectedTotal !== null && count($items) < $expectedTotal) {
        $error = $error ?: 'pagination-incomplete';
    }

    return $items;
}

function firstValue($source, $keys, $default = '') {
    foreach ($keys as $key) {
        if (is_array($source) && array_key_exists($key, $source) && $source[$key] !== null && $source[$key] !== '') {
            return $source[$key];
        }
    }
    return $default;
}

function displayValue($value) {
    if (is_array($value)) {
        return firstValue($value, ['nombre', 'name', 'username', 'usuario', 'id', 'id_servicio'], '');
    }
    return is_scalar($value) ? $value : '';
}

function objectId($value) {
    if (is_array($value)) {
        return firstValue($value, ['id_servicio', 'id_cliente', 'id', 'pk'], '');
    }
    return is_scalar($value) ? $value : '';
}

function normalizeStatusKind($value) {
    $raw = strtolower(trim((string) displayValue($value)));
    if ($raw === '') return 'unknown';

    if (
        str_contains($raw, 'suspend') ||
        str_contains($raw, 'cort') ||
        str_contains($raw, 'inactiv') ||
        str_contains($raw, 'desconect') ||
        str_contains($raw, 'bloque')
    ) {
        return 'suspended';
    }

    if (
        str_contains($raw, 'activ') ||
        str_contains($raw, 'habilit') ||
        str_contains($raw, 'online') ||
        str_contains($raw, 'conectad')
    ) {
        return 'active';
    }

    return 'unknown';
}

$cacheFile = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'wifi-rapidito-staff-clients-v2.json';
$cacheTtl = 120;
$forceRefresh = isset($_GET['refresh']) && $_GET['refresh'] === '1';

if (!$forceRefresh && is_file($cacheFile) && (time() - filemtime($cacheFile)) < $cacheTtl) {
    $cached = json_decode((string) file_get_contents($cacheFile), true);
    if (is_array($cached)) {
        $cached['meta']['cached'] = true;
        respondJson(200, $cached);
    }
}

$apiBase = rtrim(WISPHUB_API_URL, '/') . '/';
$clientsError = null;
$clients = fetchPaginated($apiBase . 'clientes/', WISPHUB_TOKEN, 40, $clientsError);

if ($clients === null) {
    if (is_file($cacheFile)) {
        $cached = json_decode((string) file_get_contents($cacheFile), true);
        if (is_array($cached)) {
            $cached['meta']['cached'] = true;
            $cached['meta']['stale'] = true;
            $cached['meta']['warning'] = 'WispHub no respondió; se muestran los últimos datos disponibles.';
            respondJson(200, $cached);
        }
    }

    respondJson(503, [
        'error' => 'WispHub no está respondiendo en este momento.',
        'retryable' => true,
    ]);
}

$normalized = [];
$metrics = [
    'total' => 0,
    'active' => 0,
    'suspended' => 0,
    'unknown' => 0,
];

foreach ($clients as $client) {
    if (!is_array($client)) continue;

    $serviceValue = firstValue($client, ['id_servicio', 'servicio_id', 'servicio'], '');
    $serviceId = objectId($serviceValue);
    if ($serviceId === '' && is_scalar($serviceValue)) $serviceId = $serviceValue;

    $statusValue = firstValue($client, ['estado', 'status', 'estado_servicio', 'estatus'], '');
    $status = (string) displayValue($statusValue);
    $statusKind = normalizeStatusKind($statusValue);

    $normalized[] = [
        'client_id' => (string) firstValue($client, ['id_cliente', 'id', 'pk'], ''),
        'service_id' => (string) $serviceId,
        'name' => (string) firstValue($client, ['nombre', 'name', 'cliente'], 'Cliente'),
        'cedula' => (string) firstValue($client, ['cedula', 'documento', 'rif'], ''),
        'phone' => (string) firstValue($client, ['telefono', 'movil', 'celular', 'phone'], ''),
        'email' => (string) firstValue($client, ['correo', 'email'], ''),
        'user' => (string) firstValue($client, ['usuario', 'usuario_portal', 'username'], ''),
        'address' => (string) firstValue($client, ['direccion_principal', 'direccion', 'address'], ''),
        'plan' => (string) displayValue(firstValue($client, ['plan_internet', 'plan', 'nombre_plan'], '')),
        'node' => (string) displayValue(firstValue($client, ['nodo', 'router', 'zona', 'sector'], '')),
        'status' => $status,
        'status_kind' => $statusKind,
    ];

    $metrics['total'] += 1;
    if ($statusKind === 'active') $metrics['active'] += 1;
    elseif ($statusKind === 'suspended') $metrics['suspended'] += 1;
    else $metrics['unknown'] += 1;
}

usort($normalized, function ($a, $b) {
    return strcasecmp((string) ($a['name'] ?? ''), (string) ($b['name'] ?? ''));
});

$payload = [
    'clients' => $normalized,
    'metrics' => $metrics,
    'meta' => [
        'loaded_at' => date(DATE_ATOM),
        'cached' => false,
        'stale' => false,
        'warning' => $clientsError ? 'No se pudo completar toda la paginación de clientes.' : null,
        'version' => '1.1-staff-clients-offset',
    ],
];

@file_put_contents($cacheFile, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
respondJson(200, $payload);
?>