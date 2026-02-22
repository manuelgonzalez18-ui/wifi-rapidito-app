<?php
// fetch_debug_data.php - Script para ver la estructura real de los datos
require_once 'config_wisphub.php';

header('Content-Type: application/json');

function fetchWisphub($endpoint) {
    $url = WISPHUB_API_URL . $endpoint;
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Api-Key ' . WISPHUB_TOKEN
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return json_decode($response, true);
}

$debug_data = [
    'facturas' => fetchWisphub('facturas/?limit=5'),
    'pagos' => fetchWisphub('pagos/?limit=5'),
    'egresos' => fetchWisphub('egresos/?limit=5')
];

echo json_encode($debug_data, JSON_PRETTY_PRINT);
?>
