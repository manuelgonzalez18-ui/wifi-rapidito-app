<?php
header('Content-Type: text/html; charset=utf-8');

// Configuración
$api_url_base = 'https://api.wisphub.net/api/facturas/';
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

function callApi($url) {
    global $api_key;
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
    $response = curl_exec($ch);
    curl_close($ch);
    return json_decode($response, true);
}

// Parámetros de prueba
$cedula = $_GET['cedula'] ?? '16573997'; // Cédula de Nora por defecto
$usuario = $_GET['usuario'] ?? 'norapalacios';
$id_servicio = $_GET['servicio'] ?? '';

echo "<h1>Diagnostico de Facturas para: $usuario ($cedula)</h1>";

// 1. Búsqueda por Cédula
$url_cedula = $api_url_base . "?search=" . $cedula;
$res_cedula = callApi($url_cedula);
echo "<h2>1. Búsqueda por Cédula ($url_cedula)</h2>";
echo "<pre>" . json_encode($res_cedula, JSON_PRETTY_PRINT) . "</pre>";

// 2. Búsqueda por Usuario
$url_usuario = $api_url_base . "?search=" . $usuario;
$res_usuario = callApi($url_usuario);
echo "<h2>2. Búsqueda por Usuario ($url_usuario)</h2>";
echo "<pre>" . json_encode($res_usuario, JSON_PRETTY_PRINT) . "</pre>";

// 3. Simulación de Filtrado (Lo que hace el frontend)
echo "<h2>3. Simulación de Filtrado Frontend</h2>";
$all_invoices = array_merge(
    $res_cedula['results'] ?? [],
    $res_usuario['results'] ?? []
);

foreach ($all_invoices as $inv) {
    echo "<div style='border:1px solid #ccc; margin: 10px; padding: 10px;'>";
    echo "<strong>Factura ID:</strong> " . ($inv['id_factura'] ?? 'N/A') . "<br>";
    echo "<strong>Cliente Nombre:</strong> " . ($inv['nombre_cliente'] ?? $inv['cliente']['nombre'] ?? 'N/A') . "<br>";
    echo "<strong>Cliente Cedula:</strong> " . ($inv['cedula_cliente'] ?? $inv['cliente']['cedula'] ?? 'N/A') . "<br>";
    echo "<strong>Cliente Usuario:</strong> " . ($inv['usuario_cliente'] ?? $inv['cliente']['usuario'] ?? 'N/A') . "<br>";
    
    // Lógica de coincidencia
    $matchCedula = strpos(($inv['cedula_cliente'] ?? ''), $cedula) !== false;
    $matchUser = strpos(($inv['usuario_cliente'] ?? ''), $usuario) !== false;
    
    echo "<strong>¿Coincide Cédula?:</strong> " . ($matchCedula ? 'SÍ' : 'NO') . "<br>";
    echo "<strong>¿Coincide Usuario?:</strong> " . ($matchUser ? 'SÍ' : 'NO') . "<br>";
    echo "</div>";
}
?>
