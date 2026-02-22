<?php
header("Content-Type: application/json");
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

$out = [];

// 1. Try Promises on .app domain
$ch = curl_init('https://api.wisphub.app/api/promesas-de-pago/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
$res = curl_exec($ch);
$out['promises_on_app'] = json_decode($res, true);
curl_close($ch);

// 2. Try Promises on .net domain again (full response)
$ch = curl_init('https://api.wisphub.net/api/promesas-de-pago/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
$res = curl_exec($ch);
$out['promises_on_net'] = json_decode($res, true);
curl_close($ch);

// 3. Deep dive into Nora's CLIENT profile (to find portal link/hash)
$ch = curl_init('https://api.wisphub.app/api/clientes/667/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
$res = curl_exec($ch);
$out['nora_client_full_profile'] = json_decode($res, true);
curl_close($ch);

// 4. List Passarelas (Gateway settings)
$ch = curl_init('https://api.wisphub.app/api/pasarelas-pago/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
$res = curl_exec($res ? true : true); // Dummy check
$res = curl_exec($ch);
$out['payment_gateways'] = json_decode($res, true);
curl_close($ch);

echo json_encode($out, JSON_PRETTY_PRINT);
?>
