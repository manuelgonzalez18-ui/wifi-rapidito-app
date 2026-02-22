<?php
header("Content-Type: text/plain");
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

$out = [];

// 1. Test Promise Endpoint with and without trailing slash (on .net which gave 403)
$test_urls = [
    'https://api.wisphub.net/api/promesa-pago/',
    'https://api.wisphub.net/api/promesa-pago',
    'https://api.wisphub.net/api/promesas-de-pago/',
    'https://api.wisphub.net/api/promesas-de-pago'
];

echo "--- TESTING PERMISSIONS (.net) ---\n";
foreach ($test_urls as $url) {
    echo "URL: $url\n";
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    echo "CODE: $code\n";
    echo "BODY: $res\n\n";
    curl_close($ch);
}

// 2. Test PDF Download (Workaround for no public link)
echo "--- TESTING PDF STREAMING ---\n";
$pdf_url = 'https://api.wisphub.app/api/facturas/5561/pdf/';
$ch = curl_init($pdf_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$res = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
echo "PDF URL: $pdf_url\n";
echo "CODE: $code\n";
echo "CONTENT-TYPE: $type\n";
echo "SIZE: " . strlen($res) . " bytes\n";
if (strpos($type, 'pdf') !== false) {
    echo "SUCCESS: PDF binary received.\n";
} else {
    echo "FAILURE: Not a PDF.\n";
}
curl_close($ch);
?>
