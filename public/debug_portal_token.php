<?php
header("Content-Type: application/json");
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

$out = [];

// 1. Full Invoice Dump (Looking for ANY URL)
$ch = curl_init('https://api.wisphub.app/api/facturas/5561/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$res = curl_exec($ch);
$out['invoice_5561_full'] = json_decode($res, true);
curl_close($ch);

// 2. Try to find the "Portal Cliente" metadata
$portal_endpoints = [
    'https://api.wisphub.app/api/portal-cliente/',
    'https://api.wisphub.app/api/clientes/667/portal/',
    'https://api.wisphub.app/api/clientes/667/token/'
];

foreach ($portal_endpoints as $url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
    $res = curl_exec($ch);
    $out['portal_discovery'][$url] = [
        'code' => curl_getinfo($ch, CURLINFO_HTTP_CODE),
        'data' => json_decode($res, true)
    ];
    curl_close($ch);
}

// 3. Search for "public" strings in all client fields
$ch = curl_init('https://api.wisphub.app/api/clientes/667/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
$res = curl_exec($ch);
$client = json_decode($res, true);
$out['client_tokens'] = [];
foreach ($client as $k => $v) {
    if (is_string($v) && (strlen($v) > 10 || strpos($k, 'token') !== false || strpos($k, 'hash') !== false)) {
        $out['client_tokens'][$k] = $v;
    }
}
curl_close($ch);

echo json_encode($out, JSON_PRETTY_PRINT);
?>
