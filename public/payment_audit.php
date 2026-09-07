<?php
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');

function auditRespond($status, $payload) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

require_once __DIR__ . '/payment_audit_lib.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['health'])) {
    auditRespond(200, ['status' => 'ready', 'version' => '1.0-payment-audit']);
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

$limit = max(1, min(500, (int)($_GET['limit'] ?? 100)));
$path = paymentAuditStorePath();
$items = [];
if (is_file($path)) {
    $lines = @file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    foreach (array_reverse($lines) as $line) {
        $row = json_decode($line, true);
        if (is_array($row)) $items[] = $row;
        if (count($items) >= $limit) break;
    }
}

auditRespond(200, [
    'payments' => $items,
    'count' => count($items),
    'version' => '1.0-payment-audit',
]);
