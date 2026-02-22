<?php
header("Content-Type: application/json");
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

$out = [];

// 1. Inspect Invoice 5561 raw
$ch = curl_init('https://api.wisphub.app/api/facturas/?search=5561');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
$res = curl_exec($ch);
$out['invoice_5561_raw'] = json_decode($res, true);
curl_close($ch);

// 2. Inspect Promises raw
$ch = curl_init('https://api.wisphub.net/api/promesas-de-pago/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
$res = curl_exec($ch);
$out['promises_all_raw'] = json_decode($res, true);
curl_close($ch);

echo json_encode($out, JSON_PRETTY_PRINT);
?>
