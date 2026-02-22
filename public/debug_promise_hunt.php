<?php
header("Content-Type: application/json");
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

$out = [];

// 1. Try Global Search (If Nora's info is linked to a promise, it might show up here)
$search_urls = [
    'https://api.wisphub.app/api/buscar/?q=5561',
    'https://api.wisphub.app/api/buscar/?q=NORAPALACIOS',
    'https://api.wisphub.app/api/buscar/?q=667'
];

foreach ($search_urls as $url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    $out['search_results'][$url] = json_decode($res, true);
    curl_close($ch);
}

// 2. Probing for specific promise list endpoints (More variants)
// If 'promesa-pago' is POST, the list might be hidden.
$promise_list_variants = [
    'https://api.wisphub.app/api/facturas/5561/promesa-pago/',
    'https://api.wisphub.app/api/clientes/667/promesas-pago/',
    'https://api.wisphub.app/api/lista-promesas/',
    'https://api.wisphub.app/api/promesas-de-pago-clientes/'
];

foreach ($promise_list_variants as $url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    $out['promise_probes'][$url] = [
        'code' => curl_getinfo($ch, CURLINFO_HTTP_CODE),
        'data' => json_decode($res, true)
    ];
    curl_close($ch);
}

// 3. Check for specific Nora fields again, focusing on "token" or "hash"
// We'll also try to fetch her "Service" detail (not client)
$ch = curl_init('https://api.wisphub.app/api/clientes/667/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
$res = curl_exec($ch);
$client_data = json_decode($res, true);
$out['nora_raw_fields'] = $client_data;
curl_close($ch);

echo json_encode($out, JSON_PRETTY_PRINT);
?>
