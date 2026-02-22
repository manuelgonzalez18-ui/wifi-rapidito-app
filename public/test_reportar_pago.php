<?php
require_once 'config_wisphub.php';
header('Content-Type: text/plain; charset=utf-8');

$invoice_id = "5866";
$fecha = date('Y-m-d'); // Solo fecha, sin hora

echo "=== DIAGNÓSTICO REPORTAR PAGO ===\n";
echo "Factura: $invoice_id | Fecha: $fecha\n\n";

// ── Test 1: JSON en .app ──
echo "--- TEST 1: JSON en .app ---\n";
$url1 = "https://api.wisphub.app/api/facturas/reportar-pago/$invoice_id/";
$payload1 = json_encode([
    'referencia'  => 'DIAG-' . time(),
    'fecha_pago'  => $fecha,
    'nombre_user' => WISPHUB_STAFF_USER,
    'forma_pago'  => 16749
]);
$ch = curl_init($url1);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload1);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Api-Key ' . WISPHUB_TOKEN,
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$r = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
echo "URL: $url1\nPayload: $payload1\nHTTP: $code\nBody: $r\n\n";

// ── Test 2: Multipart en .app ──
echo "--- TEST 2: MULTIPART en .app ---\n";
$payload2 = [
    'referencia'       => 'DIAG-' . time(),
    'fecha_pago'       => $fecha,
    'nombre_user'      => WISPHUB_STAFF_USER,
    'forma_pago'       => '16749',
    'comprobante_pago' => 'Prueba diagnostica'
];
$ch = curl_init($url1);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload2);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . WISPHUB_TOKEN]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$r = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
echo "URL: $url1\nHTTP: $code\nBody: $r\n\n";

// ── Test 3: JSON en .net ──
echo "--- TEST 3: JSON en .net ---\n";
$url3 = "https://api.wisphub.net/api/facturas/reportar-pago/$invoice_id/";
$ch = curl_init($url3);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'referencia'  => 'DIAG-' . time(),
    'fecha_pago'  => $fecha,
    'nombre_user' => WISPHUB_STAFF_USER,
    'forma_pago'  => 16749
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Api-Key ' . WISPHUB_TOKEN,
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$r = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
echo "URL: $url3\nHTTP: $code\nBody: $r\n\n";

// ── Test 4: URL invertida .app (facturas/{id}/reportar-pago/) ──
echo "--- TEST 4: URL INVERTIDA en .app ---\n";
$url4 = "https://api.wisphub.app/api/facturas/$invoice_id/reportar-pago/";
$ch = curl_init($url4);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'referencia'  => 'DIAG-' . time(),
    'fecha_pago'  => $fecha,
    'nombre_user' => WISPHUB_STAFF_USER,
    'forma_pago'  => 16749
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Api-Key ' . WISPHUB_TOKEN,
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$r = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
echo "URL: $url4\nHTTP: $code\nBody: $r\n\n";

echo "=== FIN DIAGNÓSTICO ===\n";
?>
