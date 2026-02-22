<?php
header("Content-Type: application/json");
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

$out = [];

// 1. Get API Root (To see all available endpoints)
$ch = curl_init('https://api.wisphub.app/api/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
$res = curl_exec($ch);
$out['api_root_endpoints'] = json_decode($res, true);
curl_close($ch);

// 2. Try variations of Promise pluralization
$promise_uris = [
    'promesas-pago',
    'promesas-de-pago',
    'promesas_pago',
    'promesa-pago'
];

foreach ($promise_uris as $uri) {
    $ch = curl_init("https://api.wisphub.app/api/$uri/");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
    $res = curl_exec($ch);
    $out['promise_test'][$uri] = [
        'code' => curl_getinfo($ch, CURLINFO_HTTP_CODE),
        'count' => json_decode($res, true)['count'] ?? null
    ];
    curl_close($ch);
}

// 3. Deep dive into Nora's profile for Portal Tokens
$ch = curl_init('https://api.wisphub.app/api/clientes/667/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
$res = curl_exec($ch);
$client = json_decode($res, true);
$out['nora_profile_tokens'] = array_filter($client, function($key) {
    return strpos($key, 'hash') !== false || strpos($key, 'token') !== false || strpos($key, 'public') !== false || strpos($key, 'portal') !== false;
}, ARRAY_FILTER_USE_KEY);
curl_close($ch);

echo json_encode($out, JSON_PRETTY_PRINT);
?>
