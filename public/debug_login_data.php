<?php
// debug_login_data.php
// Usage: debug_login_data.php?buscar=yubraskasilva
header('Content-Type: text/plain; charset=UTF-8');

$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$search = $_GET['buscar'] ?? 'yubraskasilva';

echo "Searching for: $search\n";
echo "---------------------------------\n";

$url = 'https://api.wisphub.app/api/clientes/?buscar=' . urlencode($search);
echo "URL: $url\n\n";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Api-Key ' . $api_key,
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP CODE: $http_code\n\n";

if ($http_code === 200) {
    $data = json_decode($response, true);
    if (isset($data['results']) && count($data['results']) > 0) {
        foreach ($data['results'] as $i => $client) {
            echo "Candidate #$i:\n";
            echo "  Nombre: " . ($client['nombre'] ?? 'N/A') . "\n";
            echo "  Usuario Portal: " . ($client['usuario_portal'] ?? 'N/A') . "\n";
            echo "  Usuario (PPPoE): " . ($client['usuario'] ?? 'N/A') . "\n";
            echo "  Cedula: " . ($client['cedula'] ?? 'N/A') . "\n";
            echo "  ID Servicio: " . ($client['id_servicio'] ?? 'N/A') . "\n";
            echo "  JSON Crudo:\n";
            print_r($client);
            echo "\n---------------------------------\n";
        }
    } else {
        echo "No se encontraron resultados para '$search'.\n";
    }
} else {
    echo "Error en la petición API.\n";
    echo $response;
}
?>
