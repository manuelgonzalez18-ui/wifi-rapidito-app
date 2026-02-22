<?php
header("Content-Type: application/json");
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

$out = [];

// 1. Brute Force Plural/List Endpoints for Promises
$promise_list_variants = [
    'https://api.wisphub.app/api/promesas-pagos/',
    'https://api.wisphub.app/api/factura-promesa/',
    'https://api.wisphub.app/api/facturas-promesas/',
    'https://api.wisphub.app/api/promesas-clientes/',
    'https://api.wisphub.app/api/pago-promesas/',
    'https://api.wisphub.app/api/promesas_de_pago/',
    'https://api.wisphub.app/api/reportes-pagos/?search=5561',
    'https://api.wisphub.app/api/facturas-pendientes/?search=5561'
];

foreach ($promise_list_variants as $url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $out['promise_discovery'][$url] = [
        'code' => $code,
        'data' => ($code === 200) ? json_decode($res, true) : 'Error'
    ];
    curl_close($ch);
}

// 2. Check "Configuracion de Empresa" directly
$config_urls = [
    'https://api.wisphub.app/api/configuracion/',
    'https://api.wisphub.app/api/configuracion-empresa/',
    'https://api.wisphub.app/api/ajustes-generales/'
];

foreach ($config_urls as $url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    $out['config_discovery'][$url] = [
        'code' => curl_getinfo($ch, CURLINFO_HTTP_CODE),
        'data' => json_decode($res, true)
    ];
    curl_close($ch);
}

echo json_encode($out, JSON_PRETTY_PRINT);
?>
