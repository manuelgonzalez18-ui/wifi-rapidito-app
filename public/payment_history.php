<?php
/**
 * Historial administrativo de pagos validados automáticamente.
 */
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');

function ph_respond($status, $payload) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['health'])) {
    ph_respond(200, ['status' => 'ready', 'version' => '1.0-payment-history']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    ph_respond(405, ['error' => 'Método no permitido.']);
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
    ph_respond(401, ['error' => 'Sesión de personal requerida.']);
}
$permissions = is_array($_SESSION['staff_permissions'] ?? null) ? $_SESSION['staff_permissions'] : [];
if (!in_array('*', $permissions, true) && !in_array('finance', $permissions, true)) {
    ph_respond(403, ['error' => 'No tienes permiso para consultar pagos.']);
}

require_once __DIR__ . '/payment_registry_lib.php';

$limit = max(1, min((int) ($_GET['limit'] ?? 500), 2000));
$source = strtolower(trim((string) ($_GET['source'] ?? 'all')));
$q = strtolower(trim((string) ($_GET['q'] ?? '')));
$includeErrors = !empty($_GET['include_errors']) && $_GET['include_errors'] !== '0';

$records = payment_registry_history($limit, $includeErrors);
if (in_array($source, ['assistant_virtual', 'portal_autogestion'], true)) {
    $records = array_values(array_filter($records, fn($record) => ($record['source'] ?? '') === $source));
}
if ($q !== '') {
    $records = array_values(array_filter($records, function ($record) use ($q) {
        $haystack = strtolower(implode(' ', [
            (string) ($record['client_name'] ?? ''),
            (string) ($record['user_name'] ?? ''),
            (string) ($record['invoice_id'] ?? ''),
            (string) ($record['reference'] ?? ''),
            (string) ($record['reference_key'] ?? ''),
            (string) ($record['service_id'] ?? ''),
            (string) ($record['origin_bank'] ?? ''),
        ]));
        return str_contains($haystack, $q);
    }));
}

$totalBs = 0.0;
$assistantCount = 0;
$portalCount = 0;
$errorCount = 0;
foreach ($records as $record) {
    if (($record['status'] ?? '') === 'validated') {
        $totalBs += (float) ($record['amount_bs'] ?? 0);
    } elseif (($record['status'] ?? '') === 'registration_error') {
        $errorCount++;
    }
    if (($record['source'] ?? '') === 'assistant_virtual') $assistantCount++;
    if (($record['source'] ?? '') === 'portal_autogestion') $portalCount++;
}

$publicRecords = array_map(function ($record) {
    $wisphub = is_array($record['wisphub'] ?? null) ? $record['wisphub'] : [];
    return [
        'id' => $record['id'] ?? '',
        'status' => $record['status'] ?? '',
        'source' => $record['source'] ?? 'unknown',
        'validated_at' => $record['validated_at'] ?? $record['updated_at'] ?? $record['created_at'] ?? null,
        'client_name' => $record['client_name'] ?? '',
        'user_name' => $record['user_name'] ?? '',
        'service_id' => $record['service_id'] ?? '',
        'invoice_id' => $record['invoice_id'] ?? '',
        'reference' => $record['reference'] ?? '',
        'reference_key' => $record['reference_key'] ?? '',
        'amount_bs' => (float) ($record['amount_bs'] ?? 0),
        'payment_date' => $record['payment_date'] ?? '',
        'payment_method' => $record['payment_method'] ?? '',
        'origin_bank' => $record['origin_bank'] ?? '',
        'whatsapp' => $record['whatsapp'] ?? '',
        'wisphub_task_id' => $wisphub['task_id'] ?? null,
        'registration_error' => $record['registration_error'] ?? null,
    ];
}, $records);

ph_respond(200, [
    'success' => true,
    'version' => '1.0-payment-history',
    'summary' => [
        'count' => count($publicRecords),
        'amount_bs' => round($totalBs, 2),
        'assistant_count' => $assistantCount,
        'portal_count' => $portalCount,
        'registration_errors' => $errorCount,
    ],
    'payments' => $publicRecords,
]);
?>