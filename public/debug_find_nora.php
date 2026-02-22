<?php
header("Content-Type: application/json");
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

$out = [];

// 1. Find Nora Palacios in Clients
$ch = curl_init('https://api.wisphub.app/api/clientes/?search=Nora%20Palacios');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
$res = curl_exec($ch);
$out['client_search_nora'] = json_decode($res, true);
curl_close($ch);

// 2. Inspect Invoice 5561 DETAILS (to find public fields)
$ch = curl_init('https://api.wisphub.app/api/facturas/5561/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
$res = curl_exec($ch);
$out['invoice_5561_details'] = json_decode($res, true);
curl_close($ch);

// 3. Dump ALL promises to find Nora there
$ch = curl_init('https://api.wisphub.net/api/promesas-de-pago/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
$res = curl_exec($ch);
$out['raw_promises_dump'] = json_decode($res, true);
curl_close($ch);

echo json_encode($out, JSON_PRETTY_PRINT);
?>
