<?php
// test_proxy_ticket.php
header('Content-Type: text/plain');

$proxyUrl = (isset($_SERVER['HTTPS']) ? "https" : "http") . "://$_SERVER[HTTP_HOST]" . dirname($_SERVER['PHP_SELF']) . '/proxy.php';

echo "=== PRUEBA DE CREACIÓN DE TICKET ===\n";
echo "Target Proxy: $proxyUrl\n\n";

// Datos de prueba (Nora)
$postData = [
    'servicio' => '667', // ID Servicio
    'cliente' => '667',  // ID Cliente
    'asunto' => 'PRUEBA AUTOMATICA API ' . date('H:i:s'),
    'departamento' => 'Soporte Técnico',
    'descripcion' => 'Esta es una prueba de diagnóstico para verificar la API de tickets. Por favor ignorar o cerrar.',
    'prioridad' => 'baja'
];

echo "Enviando datos:\n";
print_r($postData);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $proxyUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "\n--- RESULTADO ---\n";
if ($error) {
    echo "❌ Error cURL: $error\n";
} else {
    echo "HTTP Status: $httpCode\n";
    echo "Respuesta:\n$response\n";
    
    $json = json_decode($response, true);
    if (isset($json['id_ticket']) || isset($json['id'])) {
        echo "\n✅ ÉXITO: Ticket creado correctamente ID: " . ($json['id_ticket'] ?? $json['id']) . "\n";
    } elseif ($httpCode == 201) {
         echo "\n✅ ÉXITO IMPLÍCITO (201 Created)\n";
    } else {
         echo "\n⚠️ POSIBLE FALLO: Revisar respuesta.\n";
    }
}
?>
