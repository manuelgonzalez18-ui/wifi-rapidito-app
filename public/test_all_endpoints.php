<?php
// test_all_endpoints.php
// Probes Wisphub API to find where the client invoices are hiding.

header('Content-Type: text/plain; charset=utf-8');

$apiKey = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$clientUser = 'norapalacios@wifi-rapidito';
$clientDni = '6838842';
$clientId = '667'; // From debug info
$serviceId = '667'; // Usually same as client ID in some views

function testUrl($label, $url) {
    global $apiKey;
    echo "---------------------------------------------------\n";
    echo "TEST: $label\n";
    echo "URL: $url\n";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $apiKey]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $start = microtime(true);
    $res = curl_exec($ch);
    $time = microtime(true) - $start;
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "HTTP Status: $httpCode | Time: " . round($time, 3) . "s\n";
    
    if ($httpCode == 200) {
        $data = json_decode($res, true);
        
        // Handle paginated vs list responses
        $results = $data['results'] ?? $data ?? [];
        
        if (isset($data['count'])) echo "API Total Count: " . $data['count'] . "\n";
        echo "Items fetched: " . count($results) . "\n";
        
        // Analyze first item
        if (count($results) > 0) {
            $first = $results[0];
            $f_id = $first['id_factura'] ?? $first['id'] ?? '??';
            $f_cli = $first['cliente']['nombre'] ?? 'N/A';
            $f_user = $first['cliente']['usuario'] ?? 'N/A';
            $f_dni = $first['cliente']['cedula'] ?? 'N/A';
            
            echo "SAMPLE ITEM #$f_id:\n";
            echo "  Cliente: $f_cli ($f_user)\n";
            echo "  Cédula: $f_dni\n";
            
            if ($f_dni == '6838842' || strpos($f_user, 'norapalacios') !== false) {
                echo "✅ MATCH FOUND! This is the correct endpoint/parameter.\n";
            } else {
                echo "❌ NO MATCH (Got data for someone else)\n";
            }
        } else {
            echo "⚠️  Empty results list.\n";
        }
    } else {
        echo "❌ FAILED (404/500/403)\n";
    }
}

echo "=== WISPHUB API ENDPOINT PROBE ===\n\n";

// 1. Standard Facturas Endpoint with different params
testUrl("Filter by 'cliente' (Username)", "https://api.wisphub.app/api/facturas/?cliente=" . urlencode($clientUser));
testUrl("Filter by 'search' (DNI)", "https://api.wisphub.app/api/facturas/?search=" . $clientDni);
testUrl("Filter by 'cedula' (DNI)", "https://api.wisphub.app/api/facturas/?cedula=" . $clientDni);
testUrl("Filter by 'id_servicio'", "https://api.wisphub.app/api/facturas/?id_servicio=" . $serviceId);
testUrl("Filter by 'id_cliente'", "https://api.wisphub.app/api/facturas/?id_cliente=" . $clientId);
testUrl("Filter by 'servicio' (ID)", "https://api.wisphub.app/api/facturas/?servicio=" . $serviceId);
testUrl("Filter by 'query'", "https://api.wisphub.app/api/facturas/?query=" . $clientDni);

// 2. Nested Resource Patterns (Restful assumptions)
testUrl("Nested: /clientes/{id}/facturas/", "https://api.wisphub.app/api/clientes/$clientId/facturas/");
testUrl("Nested: /servicios/{id}/facturas/", "https://api.wisphub.app/api/servicios/$serviceId/facturas/");

// 3. User portal specific?
testUrl("Portal: /mi-cuenta/facturas/ (Longshot)", "https://api.wisphub.app/api/mi-cuenta/facturas/?cliente=" . $clientId);

echo "\nDone.\n";
?>
