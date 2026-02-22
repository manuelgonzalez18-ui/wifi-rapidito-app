<?php
header("Content-Type: application/json");
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

$out = [];

// 1. Try to get Company / Account Info (To find the PUBLIC HASH)
$company_endpoints = [
    'empresa' => 'https://api.wisphub.app/api/empresa/',
    'ajustes' => 'https://api.wisphub.app/api/ajustes/',
    'cuenta' => 'https://api.wisphub.app/api/cuenta/',
    'perfil_empresa' => 'https://api.wisphub.app/api/perfil-empresa/'
];

foreach ($company_endpoints as $key => $url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    $out['company_info'][$key] = [
        'code' => curl_getinfo($ch, CURLINFO_HTTP_CODE),
        'data' => json_decode($res, true)
    ];
    curl_close($ch);
}

// 2. Systematic search for Promise List (Plural)
$promise_variants = [
    'https://api.wisphub.app/api/promesas-pago-clientes/',
    'https://api.wisphub.app/api/promesas_pago/',
    'https://api.wisphub.app/api/facturas-promesas/',
    'https://api.wisphub.app/api/clientes/667/promesas/',
    'https://api.wisphub.app/api/promesas-de-pago/?id_factura=5561',
    'https://api.wisphub.app/api/promesas-pago/?id_factura=5561'
];

foreach ($promise_variants as $url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    $out['promise_discovery'][$url] = [
        'code' => curl_getinfo($ch, CURLINFO_HTTP_CODE),
        'data' => json_decode($res, true)
    ];
    curl_close($ch);
}

echo json_encode($out, JSON_PRETTY_PRINT);
?>
