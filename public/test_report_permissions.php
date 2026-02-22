<?php
require_once 'config_wisphub.php';

function testEndpoint($domain, $path, $token, $invoice_id) {
    $url = "https://api.wisphub.$domain/api/$path$invoice_id/";
    echo "Testing: $url\n";
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Api-Key ' . $token,
        'Content-Type: application/json'
    ]);
    
    // Minimal payload for reportar-pago
    $payload = [
        'referencia' => 'TEST-' . time(),
        'fecha_pago' => date('Y-m-d H:i'),
        'nombre_user' => WISPHUB_STAFF_USER,
        'forma_pago' => 16749,
        'comprobante_pago' => 'Prueba técnica de permisos'
    ];
    
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "HTTP CODE: $http_code\n";
    echo "RESPONSE: $response\n\n";
}

$invoice_id = "5866"; // Usando la factura de prueba

echo "<pre>";
echo "DIAGNÓSTICO DE PERMISOS PARA 'REPORTAR PAGO'\n";
echo "===========================================\n";

// Test .app
testEndpoint('app', 'facturas/reportar-pago/', WISPHUB_TOKEN, $invoice_id);

// Test .net
testEndpoint('net', 'facturas/reportar-pago/', WISPHUB_TOKEN, $invoice_id);

echo "===========================================\n";
echo "Nota: Si ambos dan 403, debes habilitar el permiso:\n";
echo "'Reportar pago en Ajustes/Portal Cliente' en tu panel de WispHub para esta API Key.\n";
echo "</pre>";
?>
