<?php
header("Content-Type: text/plain");
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

$urls = [
    'https://api.wisphub.app/api/promesa-pago/',
    'https://api.wisphub.net/api/promesa-pago/',
    'https://api.wisphub.app/api/promesa-pago/?id_factura=5561',
    'https://api.wisphub.app/api/facturas/5561/'
];

foreach ($urls as $url) {
    echo "--- TESTING: $url ---\n";
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    echo "CODE: $code\n";
    echo "BODY: " . substr($res, 0, 500) . "...\n\n";
}
?>
