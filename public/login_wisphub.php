<?php
// login_wisphub.php - resilient username-only login
error_reporting(0);
ini_set('display_errors', 0);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        'status' => 'ready',
        'message' => 'Login Service Operational',
        'version' => '5.0-resilient'
    ]);
    exit;
}

require_once __DIR__ . '/config_wisphub.php';

$logFile = __DIR__ . '/api_debug.log';
function writeLog($msg) {
    global $logFile;
    $entry = '[' . date('Y-m-d H:i:s') . '] [LOGIN] ' . $msg . "\n";
    @file_put_contents($logFile, $entry, FILE_APPEND | LOCK_EX);
}

function respondJson($status, $payload) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function normalizeUser($value) {
    $value = strtolower(trim((string) $value));
    $value = preg_replace('/\s+/', '', $value);
    return $value;
}

function wisphubGet($url, $apiKey, &$error = null) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Api-Key ' . $apiKey,
            'Accept: application/json'
        ],
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_ENCODING => '',
    ]);

    $response = curl_exec($ch);
    $errno = curl_errno($ch);
    $curlError = curl_error($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false || $errno !== 0) {
        $error = 'curl:' . $errno . ' ' . $curlError;
        return null;
    }

    if ($httpCode < 200 || $httpCode >= 300) {
        $error = 'http:' . $httpCode;
        return null;
    }

    $data = json_decode($response, true);
    if (!is_array($data)) {
        $error = 'invalid-json';
        return null;
    }

    return $data;
}

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);
if (!is_array($input) && !empty($_POST)) {
    $input = $_POST;
}
if (!is_array($input)) {
    $input = [];
}

$userInput = $input['user'] ?? $input['username'] ?? '';
$pass = (string) ($input['password'] ?? '');
$userBase = normalizeUser($userInput);

if ($userBase === '' || $pass === '') {
    respondJson(400, ['success' => false, 'error' => 'Usuario y clave requeridos']);
}

if (ctype_digit($userBase)) {
    respondJson(400, [
        'success' => false,
        'error' => 'Ingresa tu usuario, no el número de cédula.'
    ]);
}

// Staff login is handled by the frontend; this endpoint is client-only.
$user = strpos($userBase, '@') === false ? $userBase . '@wifi-rapidito' : $userBase;
$searchSeed = str_replace('@wifi-rapidito', '', $userBase);
$MASTER_PASS = getenv('PORTAL_MASTER_PASSWORD') ?: 'wifirapidito2026';
$isMasterPass = hash_equals($MASTER_PASS, $pass);

writeLog("Login attempt user=$user");

$apiKey = WISPHUB_TOKEN;
$apiBase = rtrim(WISPHUB_API_URL, '/') . '/clientes/';
$candidates = [];

// Fast path: exact username lookup. If the upstream itself is unavailable,
// fail fast with 503 instead of chaining several slow requests.
$upstreamError = null;
$exactUrl = $apiBase . '?usuario=' . urlencode($user) . '&limit=10';
$exactData = wisphubGet($exactUrl, $apiKey, $upstreamError);

if ($exactData === null) {
    writeLog("Exact lookup upstream failure: $upstreamError");
    respondJson(503, [
        'success' => false,
        'retryable' => true,
        'error' => 'WispHub está tardando en responder. Intenta nuevamente en unos segundos.'
    ]);
}

if (isset($exactData['results']) && is_array($exactData['results'])) {
    $candidates = $exactData['results'];
}

// Compatibility fallback for accounts whose portal username is not indexed
// by the exact `usuario` filter. This is only executed after a successful,
// empty exact lookup, so an upstream outage never triggers a long chain.
if (empty($candidates)) {
    $fallbackError = null;
    $fallbackUrl = $apiBase . '?buscar=' . urlencode($searchSeed) . '&limit=20';
    $fallbackData = wisphubGet($fallbackUrl, $apiKey, $fallbackError);

    if ($fallbackData === null) {
        writeLog("Fallback lookup upstream failure: $fallbackError");
        respondJson(503, [
            'success' => false,
            'retryable' => true,
            'error' => 'WispHub está tardando en responder. Intenta nuevamente en unos segundos.'
        ]);
    }

    if (isset($fallbackData['results']) && is_array($fallbackData['results'])) {
        $candidates = $fallbackData['results'];
    }
}

$foundClient = null;
$identityMatched = false;

foreach ($candidates as $client) {
    $portalUser = normalizeUser($client['usuario_portal'] ?? '');
    $portalBase = str_replace('@wifi-rapidito', '', $portalUser);
    $serviceUser = normalizeUser($client['usuario'] ?? '');
    $serviceBase = str_replace('@wifi-rapidito', '', $serviceUser);
    $nameBase = normalizeUser($client['nombre'] ?? '');

    $matchesIdentity =
        ($portalUser !== '' && ($portalUser === $user || $portalBase === $searchSeed)) ||
        ($serviceUser !== '' && ($serviceUser === $user || $serviceBase === $searchSeed)) ||
        ($nameBase !== '' && $nameBase === $searchSeed);

    if (!$matchesIdentity) {
        continue;
    }

    $identityMatched = true;

    if ($isMasterPass) {
        $foundClient = $client;
        break;
    }

    $portalPass = (string) ($client['password_portal'] ?? '');
    $servicePass = (string) ($client['password_servicio'] ?? '');

    if (($portalPass !== '' && hash_equals($portalPass, $pass)) ||
        ($servicePass !== '' && hash_equals($servicePass, $pass))) {
        $foundClient = $client;
        break;
    }
}

if (!$foundClient) {
    writeLog('Login rejected user=' . $user . ' candidates=' . count($candidates));
    $message = empty($candidates)
        ? 'Usuario no encontrado. Verifica que hayas escrito tu nombre y apellido pegados en minúsculas.'
        : ($identityMatched ? 'La clave es incorrecta.' : 'Usuario no encontrado. Verifica tu usuario.');

    respondJson(401, ['success' => false, 'error' => $message]);
}

$clientId = $foundClient['id_servicio'] ?? $foundClient['id_cliente'] ?? '';
$responseUser = [
    'id_servicio' => $foundClient['id_servicio'] ?? $clientId,
    'id_cliente' => $foundClient['id_cliente'] ?? $clientId,
    'usuario' => $foundClient['usuario'] ?? '',
    'usuario_portal' => $foundClient['usuario_portal'] ?? '',
    'nombre' => $foundClient['nombre'] ?? 'Cliente',
    'cedula' => $foundClient['cedula'] ?? '',
    'telefono' => $foundClient['telefono'] ?? '',
    'direccion' => $foundClient['direccion_principal'] ?? '',
    'saldo' => $foundClient['saldo'] ?? '0.00',
    'estado' => $foundClient['estado'] ?? 'ACTIVO',
    'servicios' => [],
    // Promise data is loaded independently by the dashboard. Keeping it out of
    // login prevents a secondary WispHub request from blocking authentication.
    'promesa_pago' => null,
];

$token = bin2hex(random_bytes(16));
writeLog('Login success user=' . $user . ' service=' . $clientId);

respondJson(200, [
    'success' => true,
    'user' => $responseUser,
    'token' => $token,
]);
?>
