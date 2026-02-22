<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
?>
<!DOCTYPE html>
<html>
<head>
    <title>Buscar Usuario Específico</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #1a1a1a; color: #fff; }
        .result { background: #2a2a2a; padding: 15px; margin: 10px 0; border-radius: 8px; }
        pre { background: #000; padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>🔍 Búsqueda Exhaustiva: yubraskasilva</h1>
    
<?php
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$base_url = 'https://api.wisphub.app/api';

echo "<div class='result'>";
echo "<h3>Probando con límite de 500 resultados</h3>";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "$base_url/clientes/?limit=500");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Api-Key $api_key",
    'Content-Type: application/json'
]);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "<p><strong>HTTP Code:</strong> $http_code</p>";

if ($response) {
    $data = json_decode($response, true);
    $results = isset($data['results']) ? $data['results'] : (is_array($data) ? $data : []);
    
    echo "<p><strong>Total resultados recibidos:</strong> " . count($results) . "</p>";
    
    // Buscar yubraskasilva
    $found = null;
    foreach ($results as $client) {
        if (isset($client['usuario']) && strpos(strtolower($client['usuario']), 'yubraskasilva') !== false) {
            $found = $client;
            break;
        }
        if (isset($client['cedula']) && trim($client['cedula']) == '30449997') {
            $found = $client;
            break;
        }
    }
    
    if ($found) {
        echo "<h2 style='color:#00ff00'>✅ USUARIO ENCONTRADO!</h2>";
        echo "<pre>" . json_encode($found, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "</pre>";
    } else {
        echo "<h2 style='color:#ff9900'>⚠️ Usuario NO encontrado en 500 resultados</h2>";
        echo "<p>Probando obtener el id_servicio más bajo y más alto:</p>";
        
        if (count($results) > 0) {
            $first = $results[0];
            $last = $results[count($results) - 1];
            
            echo "<p><strong>ID Servicio más alto:</strong> {$first['id_servicio']} ({$first['usuario']})</p>";
            echo "<p><strong>ID Servicio más bajo:</strong> {$last['id_servicio']} ({$last['usuario']})</p>";
        }
    }
} else {
    echo "<p style='color:#ff0000'>Error en la petición</p>";
}

echo "</div>";
?>

</body>
</html>
