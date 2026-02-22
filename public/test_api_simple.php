<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
?>
<!DOCTYPE html>
<html>
<head>
    <title>Test Wisphub API</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #1a1a1a; color: #fff; }
        .test { background: #2a2a2a; padding: 15px; margin: 10px 0; border-radius: 8px; }
        .success { border-left: 4px solid #00ff00; }
        .error { border-left: 4px solid #ff0000; }
        .warning { border-left: 4px solid #ff9900; }
        pre { background: #000; padding: 10px; overflow-x: auto; }
        h3 { margin-top: 0; color: #00d4ff; }
    </style>
</head>
<body>
    <h1>🔍 Test Wisphub API - Cédula 30449997</h1>
    
<?php
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$base_url = 'https://api.wisphub.app/api';

function makeRequest($url, $api_key) {
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
    $error = curl_error($ch);
    curl_close($ch);
    
    return [
        'http_code' => $http_code,
        'response' => $response,
        'error' => $error
    ];
}

// TEST 1
echo "<div class='test'>";
echo "<h3>TEST 1: ?buscar=30449997</h3>";
$url = "$base_url/clientes/?buscar=30449997&limit=50";
echo "<p><strong>URL:</strong> $url</p>";

$result = makeRequest($url, $api_key);
echo "<p><strong>HTTP Code:</strong> {$result['http_code']}</p>";

if ($result['error']) {
    echo "<p style='color:#ff0000'>❌ Error: {$result['error']}</p>";
} else {
    $data = json_decode($result['response'], true);
    $results = isset($data['results']) ? $data['results'] : (is_array($data) ? $data : []);
    
    echo "<p><strong>Total resultados:</strong> " . count($results) . "</p>";
    
    $found = false;
    foreach ($results as $client) {
        if ((isset($client['cedula']) && trim($client['cedula']) == '30449997') ||
            (isset($client['usuario']) && strpos($client['usuario'], 'yubraskasilva') !== false)) {
            echo "<p style='color:#00ff00'>✅ <strong>USUARIO ENCONTRADO!</strong></p>";
            echo "<pre>" . json_encode($client, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "</pre>";
            $found = true;
            break;
        }
    }
    
    if (!$found) {
        echo "<p style='color:#ff9900'>⚠️ Usuario NO encontrado en resultados</p>";
        if (count($results) > 0) {
            echo "<p>Primeros 2 usuarios de muestra:</p>";
            echo "<pre>" . json_encode(array_slice($results, 0, 2), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "</pre>";
        }
    }
}
echo "</div>";

// TEST 2
echo "<div class='test'>";
echo "<h3>TEST 2: ?buscar=yubraskasilva</h3>";
$url = "$base_url/clientes/?buscar=yubraskasilva&limit=50";
echo "<p><strong>URL:</strong> $url</p>";

$result = makeRequest($url, $api_key);
echo "<p><strong>HTTP Code:</strong> {$result['http_code']}</p>";

if ($result['error']) {
    echo "<p style='color:#ff0000'>❌ Error: {$result['error']}</p>";
} else {
    $data = json_decode($result['response'], true);
    $results = isset($data['results']) ? $data['results'] : (is_array($data) ? $data : []);
    
    echo "<p><strong>Total resultados:</strong> " . count($results) . "</p>";
    
    if (count($results) > 0) {
        echo "<p style='color:#00ff00'>✅ Se encontraron " . count($results) . " resultados</p>";
        echo "<p>Primeros resultados:</p>";
        echo "<pre>" . json_encode(array_slice($results, 0, 3), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "</pre>";
    } else {
        echo "<p style='color:#ff9900'>⚠️ No se encontraron resultados</p>";
    }
}
echo "</div>";

// TEST 3
echo "<div class='test'>";
echo "<h3>TEST 3: ?buscar=yubraskasilva@wifi-rapidito</h3>";
$url = "$base_url/clientes/?buscar=yubraskasilva@wifi-rapidito&limit=50";
echo "<p><strong>URL:</strong> $url</p>";

$result = makeRequest($url, $api_key);
echo "<p><strong>HTTP Code:</strong> {$result['http_code']}</p>";

if ($result['error']) {
    echo "<p style='color:#ff0000'>❌ Error: {$result['error']}</p>";
} else {
    $data = json_decode($result['response'], true);
    $results = isset($data['results']) ? $data['results'] : (is_array($data) ? $data : []);
    
    echo "<p><strong>Total resultados:</strong> " . count($results) . "</p>";
    
    if (count($results) > 0) {
        echo "<p style='color:#00ff00'>✅ Se encontraron " . count($results) . " resultados</p>";
        echo "<pre>" . json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "</pre>";
    } else {
        echo "<p style='color:#ff9900'>⚠️ No se encontraron resultados</p>";
    }
}
echo "</div>";

?>

<hr>
<p><strong>✅ Script ejecutado correctamente</strong></p>
<p>Si ves este mensaje, el script funcionó. Revisa los TEST arriba para ver cuál encontró al usuario.</p>

</body>
</html>
