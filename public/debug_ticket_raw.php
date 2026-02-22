<?php
// debug_ticket_raw.php
// PRUEBA DE FUEGO PARA CREAR TICKET DIRECTAMENTE
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: text/plain; charset=utf-8');

$api_url = 'https://api.wisphub.app/api/tickets/';
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s'; // Tu API Key real

// DATOS DE PRUEBA (Pretendemos ser el usuario 667)
$postData = [
  'id_servicio' => '667', // USAMOS EL ID QUE VIMOS EN EL DEBUG
  'asunto' => 'PRUEBA DE DIAGNOSTICO',
  'departamento' => 'Soporte Técnico',
  'descripcion' => 'Esta es una prueba auto-generada para verificar si el ID 667 permite crear tickets.',
  'prioridad' => 'media'
];

echo "=== INICIANDO DIAGNÓSTICO DE TICKET ===\n";
echo "URL: " . $api_url . "\n";
echo "Payload: " . print_r($postData, true) . "\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $api_url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData); // Enviar como multipart/form-data (estándar)
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Api-Key ' . $api_key
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_VERBOSE, true);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "\n=== RESULTADO ===\n";
if ($error) {
    echo "ERROR CURL: " . $error . "\n";
} else {
    echo "CODIGO HTTP: " . $http_code . "\n";
    echo "RESPUESTA API:\n" . $response . "\n";
}

if ($http_code == 201 || $http_code == 200) {
    echo "\n[EXITO] El ticket se creó correctamente. Significa que ID 667 ES VALIDO.\n";
    echo "Solución: Solo necesitas cerrar sesión y volver a entrar en la App para limpiar el error.\n";
} else {
    echo "\n[FALLO] La API rechazó el ID 667.\n";
    echo "Posible causa: Tu usuario '667' no es un Servicio, es un Cliente, y Wisphub exige un ID de Servicio real.\n";
}
?>
