<?php
// test_wisphub_api.php - Script de prueba para diagnosticar búsqueda de clientes
header('Content-Type: application/json; charset=utf-8');

$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$base_url = 'https://api.wisphub.app/api';

// Función helper para hacer peticiones cURL
function testEndpoint($url, $api_key, $description) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Api-Key $api_key",
        'Content-Type: application/json'
    ]);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);
    
    $result = [
        'description' => $description,
        'url' => $url,
        'http_code' => $http_code,
        'success' => $http_code === 200
    ];
    
    if ($curl_error) {
        $result['error'] = $curl_error;
    } else {
        $data = json_decode($response, true);
        $result['total_results'] = is_array($data) ? count($data) : (isset($data['count']) ? $data['count'] : 0);
        
        // Buscar si encontró el usuario específico
        $results = isset($data['results']) ? $data['results'] : (is_array($data) ? $data : []);
        $found = null;
        
        foreach ($results as $client) {
            if (isset($client['cedula']) && trim($client['cedula']) === '30449997') {
                $found = [
                    'usuario' => $client['usuario'] ?? 'N/A',
                    'cedula' => $client['cedula'] ?? 'N/A',
                    'id_servicio' => $client['id_servicio'] ?? 'N/A'
                ];
                break;
            }
            if (isset($client['usuario']) && strpos($client['usuario'], 'yubraskasilva') !== false) {
                $found = [
                    'usuario' => $client['usuario'] ?? 'N/A',
                    'cedula' => $client['cedula'] ?? 'EMPTY',
                    'id_servicio' => $client['id_servicio'] ?? 'N/A'
                ];
                break;
            }
        }
        
        $result['found_target_user'] = $found !== null;
        if ($found) {
            $result['target_user_data'] = $found;
        }
        
        // Mostrar primeros 3 usuarios como muestra
        $result['sample_users'] = array_slice(array_map(function($c) {
            return [
                'usuario' => $c['usuario'] ?? 'N/A',
                'cedula' => $c['cedula'] ?? 'EMPTY'
            ];
        }, $results), 0, 3);
    }
    
    return $result;
}

// TESTS
$tests = [];

echo "<h1>🔍 Diagnóstico de Búsqueda Wisphub API</h1>";
echo "<p><strong>Objetivo:</strong> Encontrar usuario con cédula <code>30449997</code> (yubraskasilva)</p><hr>";

// TEST 1: Búsqueda por cédula numérica con ?buscar=
$tests[] = testEndpoint(
    "$base_url/clientes/?buscar=30449997&limit=100",
    $api_key,
    "🧪 TEST 1: ?buscar=30449997 (cédula numérica)"
);

// TEST 2: Búsqueda por usuario completo
$tests[] = testEndpoint(
    "$base_url/clientes/?buscar=yubraskasilva@wifi-rapidito&limit=100",
    $api_key,
    "🧪 TEST 2: ?buscar=yubraskasilva@wifi-rapidito"
);

// TEST 3: Búsqueda por usuario sin sufijo
$tests[] = testEndpoint(
    "$base_url/clientes/?buscar=yubraskasilva&limit=100",
    $api_key,
    "🧪 TEST 3: ?buscar=yubraskasilva (sin sufijo)"
);

// TEST 4: Búsqueda con parámetro ?cedula= (para confirmar si NO está soportado)
$tests[] = testEndpoint(
    "$base_url/clientes/?cedula=30449997&limit=10",
    $api_key,
    "🧪 TEST 4: ?cedula=30449997 (endpoint alternativo)"
);

// TEST 5: Búsqueda sin parámetros (primeros clientes)
$tests[] = testEndpoint(
    "$base_url/clientes/?limit=10",
    $api_key,
    "🧪 TEST 5: /clientes/ sin filtros (primeros 10)"
);

// Mostrar resultados
echo "<div style='font-family: monospace; white-space: pre-wrap;'>";
echo json_encode($tests, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
echo "</div>";

echo "<hr><h2>📊 Resumen</h2><ul>";
foreach ($tests as $i => $test) {
    $icon = $test['found_target_user'] ? '✅' : '❌';
    $status = $test['success'] ? 'HTTP ' . $test['http_code'] : '❌ FALLÓ';
    echo "<li>$icon <strong>" . $test['description'] . "</strong> - $status";
    if ($test['found_target_user']) {
        echo " - <span style='color: green;'>USUARIO ENCONTRADO</span>";
    }
    echo "</li>";
}
echo "</ul>";
?>
