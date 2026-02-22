<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
?>
<!DOCTYPE html>
<html>
<head>
    <title>Test Búsqueda Específica</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #1a1a1a; color: #fff; }
        .result { background: #2a2a2a; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #0ff; }
        pre { background: #000; padding: 10px; overflow-x: auto; font-size: 12px; }
        .success { border-left-color: #0f0; }
        .error { border-left-color: #f00; }
    </style>
</head>
<body>
    <h1>🎯 Test Final: Búsqueda por Username</h1>
    
<?php
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$base_url = 'https://api.wisphub.app/api';

$searches = [
    'yubraskasilva',
    'yubraska',
    'silva',
    'yubraskasilva@wifi-rapidito'
];

foreach ($searches as $term) {
    echo "<div class='result'>";
    echo "<h3>Buscando: <code>$term</code></h3>";
    
    $url = "$base_url/clientes/?buscar=$term&limit=10";
    echo "<p><strong>URL:</strong> <code>$url</code></p>";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Api-Key $api_key",
        'Content-Type: application/json'
    ]);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "<p><strong>HTTP:</strong> $http_code</p>";
    
    if ($response) {
        $data = json_decode($response, true);
        $results = isset($data['results']) ? $data['results'] : (is_array($data) ? $data : []);
        
        echo "<p><strong>Resultados:</strong> " . count($results) . "</p>";
        
        $found = false;
        foreach ($results as $client) {
            if (isset($client['usuario']) && strpos(strtolower($client['usuario']), 'yubraskasilva') !== false) {
                echo "<div class='result success'>";
                echo "<h2 style='color:#0f0'>✅ ¡ENCONTRADO!</h2>";
                echo "<pre>" . json_encode($client, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "</pre>";
                echo "</div>";
                $found = true;
                break;
            }
        }
        
        if (!$found && count($results) > 0) {
            echo "<p style='color:#f90'>⚠️ No se encontró 'yubraskasilva' en los resultados</p>";
            echo "<p>Primeros 2 resultados:</p>";
            echo "<pre>" . json_encode(array_slice($results, 0, 2), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "</pre>";
        } elseif (!$found) {
            echo "<p style='color:#f00'>❌ Sin resultados</p>";
        }
    }
    
    echo "</div>";
}
?>

<hr>
<h2>💡 Conclusión</h2>
<p>Si alguno de los tests encuentra al usuario, ese es el término que debemos usar en el código.</p>

</body>
</html>
