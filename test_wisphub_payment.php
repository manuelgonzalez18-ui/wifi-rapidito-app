<?php
// Direct test of Wisphub reportar-pago API (simulating Postman)
echo "=== WISPHUB REPORTAR-PAGO API TEST ===\n\n";

$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$invoice_id = '5561';

// Test 1: POST reportar-pago with form-data
$url = "https://api.wisphub.app/api/facturas/reportar-pago/$invoice_id/";
echo "TEST 1: POST $url\n";

$payload = [
    'referencia'       => '123456',
    'fecha_pago'       => '2026-02-11',
    'nombre_user'      => 'admin@wifi-rapidito',
    'forma_pago'       => 7,
    'comprobante_pago' => 'Prueba API - Monto 10 USD | Banco Banesco | Ref 123456'
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);

echo "HTTP Code: $http_code\n";
if ($curl_error) echo "Curl Error: $curl_error\n";
echo "Response: $response\n\n";

// Test 2: Try registrar-pago endpoint (alternative, activates service)
$url2 = "https://api.wisphub.app/api/facturas/registrar-pago/$invoice_id/";
echo "TEST 2: POST $url2\n";

$payload2 = [
    'referencia'       => '654321',
    'fecha_pago'       => '2026-02-11',
    'nombre_user'      => 'admin@wifi-rapidito',
    'forma_pago'       => 7,
    'comprobante_pago' => 'Prueba API registrar - Monto 10 USD'
];

$ch = curl_init($url2);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload2);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response2 = curl_exec($ch);
$http_code2 = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $http_code2\n";
echo "Response: $response2\n\n";

// Test 3: OPTIONS on reportar-pago to see allowed fields
$url3 = "https://api.wisphub.app/api/facturas/reportar-pago/$invoice_id/";
echo "TEST 3: OPTIONS $url3\n";

$ch = curl_init($url3);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'OPTIONS');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response3 = curl_exec($ch);
$http_code3 = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $http_code3\n";
echo "Response: $response3\n\n";

// Test 4: Check formas-de-pago endpoint
echo "TEST 4: GET formas-de-pago\n";
$ch = curl_init('https://api.wisphub.app/api/formas-de-pago/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response4 = curl_exec($ch);
$http_code4 = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $http_code4\n";
echo "Response: " . substr($response4, 0, 500) . "\n\n";

echo "=== TEST COMPLETE ===\n";
