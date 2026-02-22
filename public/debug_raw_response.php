<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Content-Type: text/plain");
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

function debug_url($url, $key) {
    echo "--- TESTING: $url ---\n";
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $key]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_HEADER, true);
    
    $response = curl_exec($ch);
    $info = curl_getinfo($ch);
    $error = curl_error($ch);
    curl_close($ch);
    
    echo "HTTP CODE: " . $info['http_code'] . "\n";
    if ($error) echo "CURL ERROR: $error\n";
    
    echo "RESPONSE HEADERS:\n" . substr($response, 0, $info['header_size']) . "\n";
    echo "RESPONSE BODY (First 500 chars):\n" . substr($response, $info['header_size'], 500) . "\n\n";
}

// Probemos todas las variantes de endpoints de promesas
$urls = [
    'https://api.wisphub.app/api/promesas-de-pago/',
    'https://api.wisphub.app/api/promesas-pago/',
    'https://api.wisphub.net/api/promesas-de-pago/',
    'https://api.wisphub.net/api/promesas-pago/',
    'https://api.wisphub.app/api/facturas/5561/', // Ver si la factura tiene campos extra en RAW
];

foreach ($urls as $u) {
    debug_url($u, $api_key);
}
?>
