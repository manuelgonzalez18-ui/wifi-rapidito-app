<?php
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');

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

function respond($status, $payload) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['health'])) {
    respond(200, ['status' => 'ready', 'version' => '2.1-admin-reset']);
}

function privateDirectory() {
    $dir = dirname(__DIR__) . '/.wifi-rapidito-private';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    return $dir;
}

function accessStorePath() {
    return privateDirectory() . '/staff-access.json';
}

function directoryCachePath() {
    return privateDirectory() . '/staff-directory.json';
}

function adminPasswordHashPath() {
    return privateDirectory() . '/admin-password.hash';
}

function adminPasswordHash() {
    $path = adminPasswordHashPath();
    if (is_file($path)) {
        $hash = trim((string) @file_get_contents($path));
        if ($hash !== '' && strlen($hash) >= 20) {
            return $hash;
        }
    }

    // Temporary compatibility fallback for installations that have not yet
    // created the private administrator hash file. The private file always
    // takes precedence once an administrator resets the password by SSH.
    return '$2y$12$Qe647fBWvBkdPSBpvuBRCOMmN9UMfGIwLg2PadnxUlNQ0RlxBTFW2';
}

function loadJsonFile($path, $fallback = []) {
    if (!is_file($path)) return $fallback;
    $raw = @file_get_contents($path);
    if ($raw === false || $raw === '') return $fallback;
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : $fallback;
}

function saveJsonFile($path, $data) {
    $encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($encoded === false) return false;
    $tmp = $path . '.tmp';
    if (@file_put_contents($tmp, $encoded, LOCK_EX) === false) return false;
    @chmod($tmp, 0600);
    if (!@rename($tmp, $path)) {
        @unlink($tmp);
        return false;
    }
    @chmod($path, 0600);
    return true;
}

function normalizedUsername($value) {
    return strtolower(trim((string) $value));
}

function permissionsForPreset($preset) {
    switch ($preset) {
        case 'administrador': return ['*'];
        case 'tecnico': return ['support'];
        case 'finanzas': return ['finance'];
        case 'punto_venta': return [];
        default: return ['support'];
    }
}

function sessionUser() {
    if (empty($_SESSION['staff_authenticated'])) return null;
    return [
        'role' => 'staff',
        'name' => $_SESSION['staff_name'] ?? 'Personal autorizado',
        'username' => $_SESSION['staff_username'] ?? '',
        'email' => $_SESSION['staff_email'] ?? '',
        'staff_profile' => $_SESSION['staff_profile'] ?? 'tecnico',
        'permissions' => is_array($_SESSION['staff_permissions'] ?? null) ? $_SESSION['staff_permissions'] : [],
        'is_admin' => !empty($_SESSION['staff_is_admin']),
    ];
}

function requireAdminSession() {
    if (empty($_SESSION['staff_authenticated']) || empty($_SESSION['staff_is_admin'])) {
        respond(403, ['error' => 'Se requiere una sesión de administrador.']);
    }
}

function wisphubGetJson($url, $apiKey, &$error = null) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Api-Key ' . $apiKey,
            'Accept: application/json',
        ],
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 12,
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
        $error = 'No se pudo conectar con WispHub (' . $errno . ').';
        return null;
    }
    if ($httpCode < 200 || $httpCode >= 300) {
        $error = 'WispHub respondió HTTP ' . $httpCode . '.';
        return null;
    }

    $data = json_decode($body, true);
    if (!is_array($data)) {
        $error = 'WispHub devolvió una respuesta no válida.';
        return null;
    }
    return $data;
}

function fetchStaffDirectory($force = false, &$warning = null) {
    $cachePath = directoryCachePath();
    $cache = loadJsonFile($cachePath, []);
    $cachedAt = (int) ($cache['cached_at'] ?? 0);
    $cachedStaff = is_array($cache['staff'] ?? null) ? $cache['staff'] : [];

    if (!$force && $cachedStaff && (time() - $cachedAt) < 300) {
        return $cachedStaff;
    }

    require_once __DIR__ . '/config_wisphub.php';
    $error = null;
    $url = rtrim(WISPHUB_API_URL, '/') . '/staff/?limit=300';
    $data = wisphubGetJson($url, WISPHUB_TOKEN, $error);

    if (is_array($data)) {
        $items = is_array($data['results'] ?? null) ? $data['results'] : $data;
        $staff = [];
        foreach ($items as $item) {
            if (!is_array($item)) continue;
            $username = normalizedUsername($item['username'] ?? '');
            if ($username === '') continue;
            $staff[] = [
                'id' => $item['id'] ?? null,
                'username' => $username,
                'name' => trim((string) ($item['nombre'] ?? $item['name'] ?? $username)),
                'email' => trim((string) ($item['email'] ?? '')),
            ];
        }
        saveJsonFile($cachePath, ['cached_at' => time(), 'staff' => $staff]);
        return $staff;
    }

    if ($cachedStaff) {
        $warning = 'WispHub no respondió; se utilizó el último directorio sincronizado.';
        return $cachedStaff;
    }

    $warning = $error ?: 'No fue posible consultar el directorio de Staff en WispHub.';
    return [];
}

function findDirectoryUser($directory, $username) {
    $needle = normalizedUsername($username);
    foreach ($directory as $item) {
        if (normalizedUsername($item['username'] ?? '') === $needle) return $item;
    }
    return null;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $user = sessionUser();
    if ($user) {
        respond(200, [
            'authenticated' => true,
            'user' => $user,
            'version' => '2.1-admin-reset',
        ]);
    }
    respond(401, ['authenticated' => false, 'version' => '2.1-admin-reset']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['error' => 'Método no permitido']);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) $input = $_POST;
if (!is_array($input)) $input = [];
$action = (string) ($input['action'] ?? 'login');

if ($action === 'logout') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', $params['secure'], $params['httponly']);
    }
    session_destroy();
    respond(200, ['success' => true]);
}

if ($action === 'directory') {
    requireAdminSession();
    $warning = null;
    $directory = fetchStaffDirectory(!empty($input['refresh']), $warning);
    $access = loadJsonFile(accessStorePath(), []);
    $result = [];

    foreach ($directory as $item) {
        $username = normalizedUsername($item['username'] ?? '');
        $entry = is_array($access[$username] ?? null) ? $access[$username] : [];
        $result[] = [
            'id' => $item['id'] ?? null,
            'username' => $username,
            'name' => $item['name'] ?? $username,
            'email' => $item['email'] ?? '',
            'enabled' => !empty($entry['enabled']),
            'profile' => $entry['profile'] ?? null,
            'updated_at' => $entry['updated_at'] ?? null,
        ];
    }

    respond(200, [
        'success' => true,
        'staff' => $result,
        'warning' => $warning,
        'version' => '2.1-admin-reset',
    ]);
}

if ($action === 'set_access') {
    requireAdminSession();
    $username = normalizedUsername($input['username'] ?? '');
    $password = (string) ($input['password'] ?? '');
    $profile = normalizedUsername($input['profile'] ?? 'tecnico');
    $allowedProfiles = ['tecnico', 'finanzas', 'administrador', 'punto_venta'];

    if ($username === '' || strlen($password) < 8 || !in_array($profile, $allowedProfiles, true)) {
        respond(422, ['error' => 'Usuario, perfil y una clave de al menos 8 caracteres son obligatorios.']);
    }

    $warning = null;
    $directory = fetchStaffDirectory(true, $warning);
    $staffUser = findDirectoryUser($directory, $username);
    if (!$staffUser) {
        respond(404, ['error' => 'Ese usuario no aparece en el directorio Staff de WispHub.']);
    }

    $access = loadJsonFile(accessStorePath(), []);
    $access[$username] = [
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        'profile' => $profile,
        'permissions' => permissionsForPreset($profile),
        'enabled' => true,
        'updated_at' => date('c'),
    ];

    if (!saveJsonFile(accessStorePath(), $access)) {
        respond(500, ['error' => 'No pudimos guardar el acceso del personal en el servidor.']);
    }

    respond(200, ['success' => true, 'message' => 'Acceso actualizado correctamente.']);
}

if ($action === 'disable_access') {
    requireAdminSession();
    $username = normalizedUsername($input['username'] ?? '');
    $access = loadJsonFile(accessStorePath(), []);
    if (isset($access[$username]) && is_array($access[$username])) {
        $access[$username]['enabled'] = false;
        $access[$username]['updated_at'] = date('c');
        saveJsonFile(accessStorePath(), $access);
    }
    respond(200, ['success' => true]);
}

$username = normalizedUsername($input['username'] ?? '');
$password = (string) ($input['password'] ?? '');

$isBootstrapAdmin = in_array($username, ['admin', 'admin@wifi-rapidito'], true);
if ($isBootstrapAdmin && password_verify($password, adminPasswordHash())) {
    session_regenerate_id(true);
    $_SESSION['staff_authenticated'] = true;
    $_SESSION['staff_username'] = 'admin';
    $_SESSION['staff_name'] = 'Administrador';
    $_SESSION['staff_email'] = '';
    $_SESSION['staff_profile'] = 'administrador';
    $_SESSION['staff_permissions'] = ['*'];
    $_SESSION['staff_is_admin'] = true;
    $_SESSION['staff_login_at'] = time();

    respond(200, [
        'success' => true,
        'user' => sessionUser(),
        'token' => 'staff-session',
        'version' => '2.1-admin-reset',
    ]);
}

$warning = null;
$directory = fetchStaffDirectory(false, $warning);
$staffUser = findDirectoryUser($directory, $username);
$access = loadJsonFile(accessStorePath(), []);
$entry = is_array($access[$username] ?? null) ? $access[$username] : null;

if (!$staffUser || !$entry || empty($entry['enabled']) || !password_verify($password, (string) ($entry['password_hash'] ?? ''))) {
    usleep(300000);
    respond(401, ['success' => false, 'error' => 'Credenciales de personal incorrectas o acceso no habilitado.']);
}

$profile = $entry['profile'] ?? 'tecnico';
$permissions = is_array($entry['permissions'] ?? null) ? $entry['permissions'] : permissionsForPreset($profile);

session_regenerate_id(true);
$_SESSION['staff_authenticated'] = true;
$_SESSION['staff_username'] = $username;
$_SESSION['staff_name'] = $staffUser['name'] ?? $username;
$_SESSION['staff_email'] = $staffUser['email'] ?? '';
$_SESSION['staff_profile'] = $profile;
$_SESSION['staff_permissions'] = $permissions;
$_SESSION['staff_is_admin'] = in_array('*', $permissions, true);
$_SESSION['staff_login_at'] = time();

respond(200, [
    'success' => true,
    'user' => sessionUser(),
    'token' => 'staff-session',
    'warning' => $warning,
    'version' => '2.1-admin-reset',
]);
?>