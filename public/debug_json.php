<?php
// debug_json.php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$api_url = 'https://api.wisphub.app/api';

// Hardcoded for Nora
$id_servicio = 667; 
$id_cliente = 667;

// Try both endpoints
$url1 = "$api_url/facturas/?cliente=$id_servicio";
$url2 = "$api_url/facturas/?id_cliente=$id_cliente";

function fetch($url, $key) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Api-Key $key"]);
    $data = curl_exec($ch);
    curl_close($ch);
    return json_decode($data, true);
}

$data1 = fetch($url1, $api_key);
$data2 = fetch($url2, $api_key);

echo json_encode([
    'endpoint_cliente_667' => $data1,
    'endpoint_id_cliente_667' => $data2
], JSON_PRETTY_PRINT);
?>
