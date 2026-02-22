<?php
// debug_invoices_667.php
header('Content-Type: application/json');

$apiKey = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$clientId = '667'; // El ID que vimos en el dashboard

// 1. Buscar facturas por ID de cliente
$url = 'https://api.wisphub.app/api/facturas/?id_cliente=' . $clientId;

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Api-Key ' . $apiKey,
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$data = json_decode($response, true);

// 2. Si no hay resultados con id_cliente, intentamos búsqueda general y filtramos manualmente para ver qué hay
$urlAll = 'https://api.wisphub.app/api/facturas/?limit=20';
$ch2 = curl_init();
curl_setopt($ch2, CURLOPT_URL, $urlAll);
curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch2, CURLOPT_HTTPHEADER, [
    'Authorization: Api-Key ' . $apiKey,
    'Content-Type: application/json'
]);
curl_setopt($ch2, CURLOPT_SSL_VERIFYPEER, false);
$responseAll = curl_exec($ch2);
curl_close($ch2);
$dataAll = json_decode($responseAll, true);

echo json_encode([
    'debug_id_target' => $clientId,
    'by_id_cliente' => [
        'url' => $url,
        'http_code' => $httpCode,
        'count' => isset($data['results']) ? count($data['results']) : 0,
        'results' => $data
    ],
    'recent_raw_20' => [
        'count' => isset($dataAll['results']) ? count($dataAll['results']) : 0,
        'results' => $dataAll
    ]
], JSON_PRETTY_PRINT);
?>
