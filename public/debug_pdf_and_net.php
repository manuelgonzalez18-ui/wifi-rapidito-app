<?php
header("Content-Type: application/json");
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

$out = [];

// Try to get the PDF from various possible endpoints
$pdf_endpoints = [
    'https://api.wisphub.app/api/facturas/5561/pdf/',
    'https://api.wisphub.app/api/facturas/5561/descargar_pdf/',
    'https://api.wisphub.app/api/facturas/5561/imprimir/'
];

foreach ($pdf_endpoints as $url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    
    $out['pdf_test'][$url] = [
        'code' => $code,
        'content_type' => $type,
        'size' => strlen($res),
        'is_pdf' => (strpos($type, 'pdf') !== false)
    ];
    curl_close($ch);
}

// Re-test PROMISES on .net (The only one that gave 200 before)
$ch = curl_init('https://api.wisphub.net/api/promesas-de-pago/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$res = curl_exec($ch);
$out['net_promises_list'] = json_decode($res, true);
curl_close($ch);

echo json_encode($out, JSON_PRETTY_PRINT);
?>
