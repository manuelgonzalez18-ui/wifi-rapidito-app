<?php
// debug_curl.php - Multi-Vector Test

header("Content-Type: text/plain");

$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$base_url = "https://api.wisphub.net/api";

echo "=== DIAGNÓSTICO PROFUNDO ===\n";
echo "API Key: " . substr($api_key, 0, 5) . "...\n";

function test_url($name, $url) {
    global $api_key;
    echo "\n-------------------------------------------------\n";
    echo "TEST: $name\n";
    echo "URL: $url\n";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $headers = [
        "Authorization: Api-Key " . $api_key,
        "Content-Type: application/json"
    ];
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "Code: $http_code\n";
    echo "Response: " . substr($response, 0, 200) . "...\n";
}

// 1. Test Clientes List (Standard)
test_url("1. Clientes (Normal)", "$base_url/clientes/");

// 2. Test Clientes Search (Your Goal)
test_url("2. Clientes (Busqueda)", "$base_url/clientes/?buscar=manuelemilio");

// 3. Test Clientes WITHOUT Trailing Slash (Common Redirect Issue)
test_url("3. Clientes (Sin Barra Final)", "$base_url/clientes?buscar=manuelemilio");

// 4. Test Facturas (Different Module - Maybe Permissions are split?)
test_url("4. Facturas (Modulo Diferente)", "$base_url/facturas/");

// 5. Test Router Info (System Info)
test_url("5. Routers", "$base_url/router/");

// Test 6: Promesas de Pago (Variants)
test_url("6. Promesas (Simple)", "$base_url/promesas/");
test_url("6b. Promesas Pago", "$base_url/promesas-pago/");
test_url("6c. Promesas de Pago", "$base_url/promesas-de-pago/");

echo "\n-------------------------------------------------\n";
echo "Si TODOS dan 403, confirma que la Key no tiene ningun permiso o está bloqueada.\n";
echo "Si alguno da 200, usa ese endpoint como referencia.\n";
?>
