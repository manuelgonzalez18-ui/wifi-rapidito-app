<?php
header("Content-Type: application/json");
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

$out = [];

// 1. Try Promises on various endpoints to find the correct one
$endpoints = [
    'app_de_plural' => 'https://api.wisphub.app/api/promesas-de-pago/',
    'app_no_de_plural' => 'https://api.wisphub.app/api/promesas-pago/',
    'app_filter_factura' => 'https://api.wisphub.app/api/promesas-de-pago/?id_factura=5561',
    'app_filter_factura_alt' => 'https://api.wisphub.app/api/promesas-de-pago/?factura=5561',
    'app_filter_factura_no_de' => 'https://api.wisphub.app/api/promesas-pago/?id_factura=5561',
    'app_search' => 'https://api.wisphub.app/api/promesas-de-pago/?search=5561',
    'net_base' => 'https://api.wisphub.net/api/promesas-de-pago/',
];

foreach ($endpoints as $key => $url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
    $res = curl_exec($ch);
    $out[$key] = json_decode($res, true);
    curl_close($ch);
}

// 2. Look for the "Public Link" or "Portal Token" in Nora's profile (Service 667)
$ch = curl_init('https://api.wisphub.app/api/clientes/667/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
$res = curl_exec($ch);
$client = json_decode($res, true);
$out['nora_full_profile'] = $client;
curl_close($ch);

// 3. Check for specific fields in the profile that could lead to the public link
if (isset($client['portal_cliente_link'])) {
    $out['potential_portal_link'] = $client['portal_cliente_link'];
}

echo json_encode($out, JSON_PRETTY_PRINT);
?>
