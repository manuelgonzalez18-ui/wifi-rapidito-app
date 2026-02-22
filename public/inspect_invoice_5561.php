<?php
header("Content-Type: application/json");
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$invoice_id = $_GET['id'] ?? '5561';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.wisphub.net/api/facturas/?id_factura=$invoice_id");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
$res = curl_exec($ch);
$info = curl_getinfo($ch);
curl_close($ch);

echo json_encode([
    'request_id' => $invoice_id,
    'http_code' => $info['http_code'],
    'data' => json_decode($res, true)
], JSON_PRETTY_PRINT);
?>
