<?php
// check.php - Herramienta de Diagnóstico para Hostinger

header("Content-Type: text/plain");

echo "=== DIAGNÓSTICO DE SERVIDOR ===\n";
echo "Fecha: " . date("Y-m-d H:i:s") . "\n";
echo "PHP Version: " . phpversion() . "\n";
echo "Server Software: " . $_SERVER['SERVER_SOFTWARE'] . "\n";
echo "Document Root: " . $_SERVER['DOCUMENT_ROOT'] . "\n";
echo "Request URI: " . $_SERVER['REQUEST_URI'] . "\n";
echo "\n";

echo "=== PRUEBA DE CONECTIVIDAD A WISPHUB ===\n";
$target_url = "https://api.wisphub.app/api";
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $target_url . "/"); // Raiz de API o endpoint simple
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Solo para prueba temporal

// Intentar sin headers primero para ver si responde 401/403 (lo cual es bueno, significa que conectó)
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);

if ($curl_error) {
    echo "ERROR CURL: " . $curl_error . "\n";
    echo "NO hay conexión saliente a Wisphub.\n";
} else {
    echo "Conexión HTTP Code: " . $http_code . "\n";
    if ($http_code >= 200 && $http_code < 500) {
        echo "ÉXITO: El servidor puede contactar a Wisphub.\n";
    } else {
        echo "ADVERTENCIA: Respuesta inesperada (pero hubo conexión).\n";
    }
}
echo "Respuesta cruda (parcial): " . substr($response, 0, 100) . "...\n";

echo "\n=== PRUEBA DE REWRITE RULES ===\n";
if (strpos($_SERVER['REQUEST_URI'], '/api/check') !== false) {
    echo "ÉXITO: Las reglas de Rewrite (.htaccess) están funcionando correctamente para /api/.\n";
} else {
    echo "NOTA: Si accediste directo a check.php, prueba acceder a /api/check para probar el .htaccess\n";
}
?>
