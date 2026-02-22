<?php
header("Content-Type: text/plain");
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

$test_endpoints = [
    'https://api.wisphub.app/api/promesas/',
    'https://api.wisphub.app/api/promesa/',
    'https://api.wisphub.app/api/promesas_pago/',
    'https://api.wisphub.app/api/promesa_pago/',
    'https://api.wisphub.app/api/promesas-pago-clientes/',
    'https://api.wisphub.app/api/link-publico-factura/5561/',
    'https://api.wisphub.app/api/facturas/5561/public_url/',
    'https://api.wisphub.net/api/promesas/',
    'https://api.wisphub.net/api/promesa_pago/',
];

foreach ($test_endpoints as $url) {
    echo "--- TESTING: $url ---\n";
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    echo "CODE: $code\n";
    if ($code === 200) {
        echo "BODY: " . substr($res, 0, 200) . "...\n";
        break; // Found it!
    }
    echo "\n";
}

// Check Nora's profile for ANY field containing "hash", "token", or "link"
echo "--- CHECKING NORA PROFILE FIELDS ---\n";
$ch = curl_init('https://api.wisphub.app/api/clientes/667/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
$res = curl_exec($ch);
$client = json_decode($res, true);
curl_close($ch);

foreach ($client as $key => $val) {
    if (strpos($key, 'hash') !== false || strpos($key, 'token') !== false || strpos($key, 'link') !== false || strpos($key, 'url') !== false) {
        echo "$key: " . (is_array($val) ? json_encode($val) : $val) . "\n";
    }
}

// Special check: List all endpoints if possible (sometimes /api/ returns a list)
echo "--- API ROOT INDEX ---\n";
$ch = curl_init('https://api.wisphub.app/api/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
$res = curl_exec($ch);
echo $res . "\n";
curl_close($ch);
?>
