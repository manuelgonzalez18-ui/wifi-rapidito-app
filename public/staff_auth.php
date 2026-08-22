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

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!empty($_SESSION['staff_authenticated'])) {
        respond(200, [
            'authenticated' => true,
            'user' => [
                'role' => 'staff',
                'name' => 'Administrador',
                'username' => 'admin',
            ],
            'version' => '1.0-session',
        ]);
    }

    respond(401, ['authenticated' => false, 'version' => '1.0-session']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['error' => 'Método no permitido']);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) $input = $_POST;
if (!is_array($input)) $input = [];

if (($input['action'] ?? '') === 'logout') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', $params['secure'], $params['httponly']);
    }
    session_destroy();
    respond(200, ['success' => true]);
}

$username = strtolower(trim((string) ($input['username'] ?? '')));
$password = (string) ($input['password'] ?? '');

// The password itself is intentionally not stored in source control.
$staffPasswordHash = '$2y$12$Qe647fBWvBkdPSBpvuBRCOMmN9UMfGIwLg2PadnxUlNQ0RlxBTFW2';

if ($username !== 'admin' || !password_verify($password, $staffPasswordHash)) {
    usleep(250000);
    respond(401, ['success' => false, 'error' => 'Credenciales de personal incorrectas.']);
}

session_regenerate_id(true);
$_SESSION['staff_authenticated'] = true;
$_SESSION['staff_username'] = 'admin';
$_SESSION['staff_login_at'] = time();

respond(200, [
    'success' => true,
    'user' => [
        'role' => 'staff',
        'name' => 'Administrador',
        'username' => 'admin',
    ],
    'token' => 'staff-session',
]);
?>