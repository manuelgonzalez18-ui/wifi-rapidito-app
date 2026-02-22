<?php
header('Content-Type: text/plain');

function testUrl($url) {
    echo "Probando conexión a: $url ... ";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    // IMPORTANTE: Algunos hostings necesitan esto
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $data = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($httpCode >= 200 && $httpCode < 400) {
        echo "OK (Código $httpCode)\n";
    } else {
        echo "FAIL (Código $httpCode) - Error: $error\n";
    }
}

echo "=== DIAGNÓSTICO DE CONECTIVIDAD HOSTINGER ===\n\n";

testUrl('https://www.google.com');
testUrl('https://api.wisphub.app'); // Dominio correcto
testUrl('https://api.wisphub.net'); // Por si acaso

echo "\nSi ves 'OK' en wisphub.app, el Proxy Total funcionará.";
echo "\nSi ves 'FAIL' en wisphub.app, HOSTINGER TIENE BLOQUEADA LA SALIDA A WISPHUB.";
?>
