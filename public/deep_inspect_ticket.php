<?php
// deep_inspect_ticket.php
// Obtiene el detalle completo de un ticket existente para ver las IDs ocultas.

header('Content-Type: text/plain; charset=utf-8');

$apiKey = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$ticketId = 54; // ID from user screenshot
$url = "https://api.wisphub.app/api/tickets/$ticketId/";

echo "=== INSPECCIÓN PROFUNDA DEL TICKET #$ticketId ===\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Api-Key ' . $apiKey
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode == 200) {
    echo "HTTP 200 OK\n\n";
    $ticket = json_decode($response, true);
    echo json_encode($ticket, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
    
    echo "\n--- PISTAS PARA CREACIÓN ---\n";
    // Buscamos cualquier campo que termine en _id o tenga un valor numérico escondido
    foreach ($ticket as $key => $value) {
        if (is_array($value)) {
            echo "Campo Objeto: $key -> ID detectado: " . ($value['id'] ?? 'N/A') . "\n";
        }
    }
} else {
    echo "❌ Error al obtener el ticket #$ticketId (HTTP $httpCode).\n";
}

echo "\n--- PRUEBA DE IDS BAJOS PARA ASUNTOS ---\n";
// Si no encontramos ID en el ticket, probamos IDs del 1 al 10 en un payload de prueba
$test_url = "https://api.wisphub.app/api/tickets/";
$payload = [
    'servicio' => 667,
    'asunto' => 'Prueba',
    'departamento' => 'Soporte',
    'razon_falla' => 'Internet Lento',
    'descripcion' => 'Prueba sistemática',
    'origen_reporte' => 1, // Probando ID 1 para origen
    'prioridad' => 1,
    'estado' => 1,
    'asuntos_default' => 0,
    'departamentos_default' => 0
];

echo "\nEscaneando IDs de Asuntos (1-10):\n";
for ($id = 1; $id <= 10; $id++) {
    $payload['asuntos_default'] = $id;
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $test_url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $apiKey, 'Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    $data = json_decode($res, true);
    curl_close($ch);
    
    $err = $data['asuntos_default'][0] ?? '';
    if (strpos($err, 'no es una de las opciones') === false && !empty($err)) {
        echo "   ✅ ID $id parece ser VÁLIDO para asuntos_default.\n";
    }
}

?>
