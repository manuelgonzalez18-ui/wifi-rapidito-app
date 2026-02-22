<?php
header("Content-Type: application/json");
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

$out = [];

$endpoints = [
    'https://api.wisphub.app/api/empresa/',
    'https://api.wisphub.app/api/sucursales/',
    'https://api.wisphub.app/api/ajustes/',
    'https://api.wisphub.app/api/pasarelas-pago/',
    'https://api.wisphub.app/api/metodos-pago/'
];

foreach ($endpoints as $url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    $out['company_probe'][$url] = [
        'code' => curl_getinfo($ch, CURLINFO_HTTP_CODE),
        'data' => json_decode($res, true)
    ];
    curl_close($ch);
}

echo json_encode($out, JSON_PRETTY_PRINT);
?>
