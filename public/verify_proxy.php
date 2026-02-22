<?php
// verify_proxy.php
// Tests if the proxy file exists and is executable.

header('Content-Type: text/plain');

$proxyFile = 'proxy_invoices.php';
$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
$host = $_SERVER['HTTP_HOST'];
$currentPath = dirname($_SERVER['PHP_SELF']);
$proxyUrl = "$protocol://$host$currentPath/$proxyFile";

echo "=== DIAGNÓSTICO DE PROXY INTERNO ===\n";
echo "1. Verificando archivo local '$proxyFile'...\n";

if (file_exists($proxyFile)) {
    echo "✅ El archivo EXISTE en el servidor.\n";
    echo "   Tamaño: " . filesize($proxyFile) . " bytes\n";
    echo "   Permisos: " . substr(sprintf('%o', fileperms($proxyFile)), -4) . "\n";
} else {
    echo "❌ CRÍTICO: El archivo '$proxyFile' NO EXISTE en este directorio.\n";
    echo "   Directorio actual: " . getcwd() . "\n";
    exit;
}

echo "\n2. Probando conexión HTTP a sí mismo ($proxyUrl)...\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $proxyUrl . "?limit=5"); // Petición ligera
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    echo "❌ Error cURL al intentar conectar: $curlError\n";
} else {
    echo "HTTP Status: $httpCode\n";
    if ($httpCode == 200) {
        $json = json_decode($response, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            echo "✅ RESPUESTA VÁLIDA RECIBIDA.\n";
            echo "   Items devueltos: " . ($json['count'] ?? 'N/A') . "\n";
            echo "   ¿Es Smart Proxy?: " . (isset($json['debug_dragnet']) ? "SÍ" : "NO (Versión antigua?)") . "\n";
        } else {
            echo "⚠️  Recibido 200 OK pero el JSON es inválido. Inicio de respuesta:\n";
            echo substr($response, 0, 200) . "...\n";
        }
    } else {
        echo "❌ El proxy devolvió un error HTTP $httpCode.\n";
        echo "   Posible bloqueo de seguridad o error de sintaxis PHP.\n";
        echo "   Respuesta: " . substr($response, 0, 100) . "\n";
    }
}
?>
