<?php
require_once 'config_wisphub.php'; // Asumiendo que existe o lo crearemos con el token

header('Content-Type: application/json');

// Script de descubrimiento de estructuras financieras
$endpoints = [
    'facturas' => 'https://api.wisphub.net/api/facturas/',
    'pagos' => 'https://api.wisphub.net/api/pagos/',
    'metodos_pago' => 'https://api.wisphub.net/api/metodos-pago/'
];

$results = [];

foreach ($endpoints as $key => $url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Token ' . WISPHUB_TOKEN // Usaremos el token ya configurado
    ]);
    $response = curl_exec($ch);
    $results[$key] = json_decode($response, true);
    curl_close($ch);
}

// Guardar muestra para análisis
file_put_contents('financial_sample.json', json_encode($results, JSON_PRETTY_PRINT));
echo json_encode(["status" => "survey_complete", "sample_saved" => "financial_sample.json"]);
?>
