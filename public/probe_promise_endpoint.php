<?php
header("Content-Type: application/json");
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

$endpoints = [
    "https://api.wisphub.net/api/promesas-de-pago/",
    "https://api.wisphub.net/api/promesas-pago/",
    "https://api.wisphub.net/api/facturas/promesas-de-pago/"
];

$results = [];

foreach ($endpoints as $url) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
    $res = curl_exec($ch);
    $info = curl_getinfo($ch);
    curl_close($ch);
    
    $results[$url] = [
        "status" => $info['http_code'],
        "body" => json_decode($res, true) ?: $res
    ];
}

file_put_contents('probe_logs.txt', json_encode($results, JSON_PRETTY_PRINT));
echo json_encode($results, JSON_PRETTY_PRINT);
?>
