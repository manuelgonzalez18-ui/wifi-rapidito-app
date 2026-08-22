<?php
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['health'])) {
    echo json_encode(['status' => 'ready', 'version' => '1.1-support-permissions']);
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
    respondJson(403, ['error' => 'Tu cuenta no tiene permiso para consultar soporte técnico.']);
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

function fetchPaginated($firstUrl, $apiKey, $maxPages = 30, &$error = null) {
    $items = [];
    $url = $firstUrl;
    $page = 0;

    while ($url && $page < $maxPages) {
        $page += 1;
        $pageError = null;
        $data = wisphubGet($url, $apiKey, $pageError);

        if ($data === null) {
            $error = $pageError;
            return $page === 1 ? null : $items;
        }

        if (isset($data['results']) && is_array($data['results'])) {
            $items = array_merge($items, $data['results']);
            $url = !empty($data['next']) && is_string($data['next']) ? $data['next'] : null;
        } elseif (array_is_list($data)) {
            $items = array_merge($items, $data);
            $url = null;
        } else {
            $items[] = $data;
            $url = null;
        }
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

function objectId($value) {
    if (is_array($value)) {
        return firstValue($value, ['id_servicio', 'id_cliente', 'id', 'pk'], '');
    }
    return is_scalar($value) ? $value : '';
}

function displayValue($value) {
    if (is_array($value)) {
        return firstValue($value, ['nombre', 'name', 'username', 'usuario', 'id', 'id_servicio'], '');
    }
    return is_scalar($value) ? $value : '';
}

function safeScalarFields($source, $prefix = '', $depth = 0) {
    $out = [];
    if (!is_array($source) || $depth > 2) return $out;

    foreach ($source as $key => $value) {
        $keyString = (string) $key;
        if (preg_match('/pass|password|token|secret|api.?key|authorization/i', $keyString)) continue;

        $label = $prefix === '' ? $keyString : $prefix . '.' . $keyString;
        if (is_scalar($value) || $value === null) {
            if ($value !== null && $value !== '') $out[$label] = (string) $value;
        } elseif (is_array($value) && !array_is_list($value)) {
            $out = array_merge($out, safeScalarFields($value, $label, $depth + 1));
        }
    }

    return $out;
}

function normalizePriority($value) {
    $raw = strtolower(trim((string) displayValue($value)));
    $map = [
        '1' => 'Baja', 'baja' => 'Baja', 'low' => 'Baja',
        '2' => 'Media', 'media' => 'Media', 'medium' => 'Media',
        '3' => 'Alta', 'alta' => 'Alta', 'high' => 'Alta',
        '4' => 'Urgente', 'urgente' => 'Urgente', 'urgent' => 'Urgente',
    ];
    return $map[$raw] ?? ($raw !== '' ? ucfirst($raw) : 'Sin prioridad');
}

$cacheFile = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'wifi-rapidito-support-dashboard-v1.json';
$cacheTtl = 120;
$forceRefresh = isset($_GET['refresh']) && $_GET['refresh'] === '1';

if (!$forceRefresh && is_file($cacheFile) && (time() - filemtime($cacheFile)) < $cacheTtl) {
    $cached = json_decode((string) file_get_contents($cacheFile), true);
    if (is_array($cached)) {
        $cached['meta']['cached'] = true;
        respondJson(200, $cached);
    }
}

$apiKey = WISPHUB_TOKEN;
$apiBase = rtrim(WISPHUB_API_URL, '/') . '/';
$ticketsError = null;
$clientsError = null;

$tickets = fetchPaginated($apiBase . 'tickets/?limit=100', $apiKey, 30, $ticketsError);
$clients = fetchPaginated($apiBase . 'clientes/?limit=100', $apiKey, 40, $clientsError);

if ($tickets === null) {
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

if (!is_array($clients)) $clients = [];

$clientByService = [];
$clientById = [];
foreach ($clients as $client) {
    if (!is_array($client)) continue;
    $serviceId = firstValue($client, ['id_servicio', 'servicio_id'], '');
    if ($serviceId === '' && isset($client['servicio'])) $serviceId = objectId($client['servicio']);
    $clientId = firstValue($client, ['id_cliente', 'id', 'pk'], '');
    if ($serviceId !== '') $clientByService[(string) $serviceId] = $client;
    if ($clientId !== '') $clientById[(string) $clientId] = $client;
}

$normalized = [];
foreach ($tickets as $ticket) {
    if (!is_array($ticket)) continue;

    $serviceValue = firstValue($ticket, ['id_servicio', 'servicio', 'servicio_id'], '');
    $serviceId = objectId($serviceValue);
    if ($serviceId === '' && is_scalar($serviceValue)) $serviceId = $serviceValue;

    $ticketClientValue = firstValue($ticket, ['cliente', 'id_cliente', 'cliente_id'], '');
    $clientId = objectId($ticketClientValue);
    if ($clientId === '' && is_scalar($ticketClientValue)) $clientId = $ticketClientValue;

    $client = null;
    if ($serviceId !== '' && isset($clientByService[(string) $serviceId])) {
        $client = $clientByService[(string) $serviceId];
    } elseif ($clientId !== '' && isset($clientById[(string) $clientId])) {
        $client = $clientById[(string) $clientId];
    } elseif (is_array($ticketClientValue)) {
        $client = $ticketClientValue;
    } elseif (is_array($serviceValue)) {
        $client = $serviceValue;
    }
    if (!is_array($client)) $client = [];

    if ($serviceId === '') {
        $serviceId = firstValue($client, ['id_servicio', 'servicio_id'], '');
    }

    $technician = firstValue($ticket, ['tecnico', 'tecnico_asignado', 'usuario_tecnico', 'assigned_to'], '');
    $department = firstValue($ticket, ['departamento', 'departamentos_default', 'area'], '');
    $status = firstValue($ticket, ['estado', 'status', 'estado_ticket'], 'Sin estado');
    $subject = firstValue($ticket, ['asunto', 'asuntos_default', 'razon_falla', 'titulo'], 'Sin asunto');

    $ticketFields = safeScalarFields($ticket);
    $clientFields = safeScalarFields($client);

    $normalized[] = [
        'id' => (string) firstValue($ticket, ['id_ticket', 'id', 'pk'], ''),
        'subject' => (string) displayValue($subject),
        'status' => (string) displayValue($status),
        'priority' => normalizePriority(firstValue($ticket, ['prioridad', 'priority'], '')),
        'department' => (string) displayValue($department),
        'technician' => (string) displayValue($technician),
        'description' => (string) firstValue($ticket, ['descripcion', 'description', 'detalle', 'comentario'], ''),
        'created_at' => (string) firstValue($ticket, ['fecha_creacion', 'fecha_inicio', 'created_at', 'fecha'], ''),
        'updated_at' => (string) firstValue($ticket, ['fecha_actualizacion', 'fecha_final', 'updated_at', 'fecha_cierre'], ''),
        'origin' => (string) displayValue(firstValue($ticket, ['origen_reporte', 'origen', 'source'], '')),
        'service_id' => (string) $serviceId,
        'client_id' => (string) firstValue($client, ['id_cliente', 'id', 'pk'], $clientId),
        'client' => [
            'name' => (string) firstValue($client, ['nombre', 'name', 'cliente'], displayValue($ticketClientValue)),
            'cedula' => (string) firstValue($client, ['cedula', 'documento', 'rif'], ''),
            'phone' => (string) firstValue($client, ['telefono', 'movil', 'celular', 'phone'], ''),
            'email' => (string) firstValue($client, ['correo', 'email'], ''),
            'address' => (string) firstValue($client, ['direccion_principal', 'direccion', 'address'], ''),
            'user' => (string) firstValue($client, ['usuario', 'usuario_portal'], ''),
            'status' => (string) displayValue(firstValue($client, ['estado', 'status'], '')),
            'plan' => (string) displayValue(firstValue($client, ['plan_internet', 'plan', 'nombre_plan'], '')),
            'node' => (string) displayValue(firstValue($client, ['nodo', 'router', 'zona', 'sector'], '')),
        ],
        'wisphub_fields' => array_merge(
            array_combine(array_map(fn($key) => 'ticket.' . $key, array_keys($ticketFields)), array_values($ticketFields)) ?: [],
            array_combine(array_map(fn($key) => 'cliente.' . $key, array_keys($clientFields)), array_values($clientFields)) ?: []
        ),
    ];
}

usort($normalized, function ($a, $b) {
    $aTime = strtotime($a['created_at'] ?? '') ?: 0;
    $bTime = strtotime($b['created_at'] ?? '') ?: 0;
    if ($aTime === $bTime) return ((int) ($b['id'] ?? 0)) <=> ((int) ($a['id'] ?? 0));
    return $bTime <=> $aTime;
});

$payload = [
    'tickets' => $normalized,
    'meta' => [
        'ticket_count' => count($normalized),
        'client_count' => count($clients),
        'loaded_at' => date(DATE_ATOM),
        'cached' => false,
        'stale' => false,
        'clients_warning' => $clientsError ? 'No se pudo completar toda la información de clientes.' : null,
        'version' => '1.1-support-permissions',
    ],
    'subjects' => [
        'Internet Lento',
        'No Tiene Internet',
        'Internet Intermitente',
        'Cable Fibra Dañado',
        'Router En Rojo',
        'Reubicacion Del Router',
        'Cambio De Contraseña En Router Wifi',
        'Falla Masiva En Mi Comunidad',
        'Instalacion',
        'Cambio De Ruta',
        'Otro Asunto',
    ],
];

@file_put_contents($cacheFile, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
respondJson(200, $payload);
?>