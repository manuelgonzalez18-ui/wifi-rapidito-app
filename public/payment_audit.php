<?php
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');

function paymentAuditRespond($status, $payload) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['health'])) {
    paymentAuditRespond(200, [
        'status' => 'ready',
        'version' => '2.0-payment-registry-30d',
        'source' => 'validated-payments-registry',
    ]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    paymentAuditRespond(405, ['error' => 'Método no permitido.']);
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
    paymentAuditRespond(401, ['error' => 'Sesión de personal requerida.']);
}

$permissions = is_array($_SESSION['staff_permissions'] ?? null) ? $_SESSION['staff_permissions'] : [];
$isAdmin = !empty($_SESSION['staff_is_admin']);
if (!$isAdmin && !in_array('*', $permissions, true) && !in_array('finance', $permissions, true)) {
    paymentAuditRespond(403, ['error' => 'Tu cuenta no tiene permiso para consultar pagos validados.']);
}

require_once __DIR__ . '/payment_registry_lib.php';

function paymentAuditSource($value) {
    $source = strtolower(trim((string) $value));
    if ($source === 'portal_autogestion' || $source === 'portal') return 'portal';
    if ($source === 'assistant_virtual' || $source === 'whatsapp_bot') return 'whatsapp_bot';
    return $source !== '' ? $source : 'unknown';
}

function paymentAuditDate($value) {
    $text = trim((string) $value);
    if ($text === '') return '';
    $timestamp = strtotime($text);
    if ($timestamp === false) return $text;
    return date('Y-m-d', $timestamp);
}

function paymentAuditWisphubTask($wisphub) {
    if (!is_array($wisphub)) return '';
    foreach (['task_id', 'id', 'payment_id'] as $key) {
        if (isset($wisphub[$key]) && $wisphub[$key] !== '') return (string) $wisphub[$key];
    }
    return '';
}

$limit = max(1, min(2000, (int) ($_GET['limit'] ?? 2000)));
$days = 30;
$cutoff = time() - ($days * 86400);
$records = payment_registry_history(2000, false);
$payments = [];

foreach ($records as $record) {
    if (!is_array($record) || (string) ($record['status'] ?? '') !== 'validated') continue;

    $createdAt = (string) ($record['validated_at'] ?? $record['updated_at'] ?? $record['created_at'] ?? '');
    $timestamp = strtotime($createdAt);
    if ($timestamp === false || $timestamp < $cutoff) continue;

    $wisphub = is_array($record['wisphub'] ?? null) ? $record['wisphub'] : [];
    $payments[] = [
        'id' => (string) ($record['id'] ?? ''),
        'created_at' => $createdAt,
        'source' => paymentAuditSource($record['source'] ?? ''),
        'client_name' => trim((string) ($record['client_name'] ?? $record['user_name'] ?? '')),
        'username' => trim((string) ($record['user_name'] ?? '')),
        'service_id' => trim((string) ($record['service_id'] ?? '')),
        'invoice_id' => trim((string) ($record['invoice_id'] ?? '')),
        'reference' => trim((string) ($record['reference'] ?? '')),
        'amount' => is_numeric($record['amount_bs'] ?? null) ? (float) $record['amount_bs'] : null,
        'currency' => 'VES',
        'payment_date' => paymentAuditDate($record['payment_date'] ?? $createdAt),
        'method' => trim((string) ($record['payment_method'] ?? 'Transferencia bancaria')),
        'origin_bank' => trim((string) ($record['origin_bank'] ?? '')),
        'banesco_status' => 'validated',
        'wisphub_status' => 'registered',
        'wisphub_task_id' => paymentAuditWisphubTask($wisphub),
    ];

    if (count($payments) >= $limit) break;
}

$counts = ['portal' => 0, 'whatsapp_bot' => 0, 'other' => 0];
foreach ($payments as $payment) {
    $source = $payment['source'];
    if (isset($counts[$source])) $counts[$source]++;
    else $counts['other']++;
}

paymentAuditRespond(200, [
    'payments' => $payments,
    'count' => count($payments),
    'historical_days' => $days,
    'counts' => $counts,
    'version' => '2.0-payment-registry-30d',
]);
