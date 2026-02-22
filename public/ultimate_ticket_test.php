<?php
// ultimate_ticket_test.php
// Pruebas intensivas de creación de ticket para descubrir campos exactos.

header('Content-Type: text/plain; charset=utf-8');

$apiKey = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$url = 'https://api.wisphub.app/api/tickets/';

function tryCreate($label, $payload) {
    global $apiKey, $url;
    echo "--- PRUEBA: $label ---\n";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Api-Key ' . $apiKey,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $res = curl_exec($ch);
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "HTTP: $http\n";
    echo "Respuesta: $res\n\n";
}

echo "=== TICKET CREATION BRUTE FORCE ===\n\n";

$now = date('Y-m-d H:i:s');
$future = date('Y-m-d H:i:s', time() + 86400);

// Prueba 1: Minimalista con IDs supuestos (1,1) y Técnico real
tryCreate("Guessing IDs (1,1)", [
    'servicio' => 667,
    'asuntos_default' => 1,
    'departamentos_default' => 1,
    'estado' => 'Abierto',
    'prioridad' => 'Media',
    'tecnico' => 5853049, // Ana Palacios
    'razon_falla' => 'Internet Lento',
    'origen_reporte' => 'Portal Cliente',
    'descripcion' => 'Prueba de diagnostico 1',
    'fecha_inicio' => $now,
    'fecha_estimada_inicio' => $now,
    'fecha_estimada_fin' => $future
]);

// Prueba 2: Sin asuntos_default pero con asunto (como decía OPTIONS)
tryCreate("Using 'asunto' field", [
    'servicio' => 667,
    'asunto' => 'Internet Lento',
    'departamento' => 'Soporte Técnico',
    'estado' => 'Abierto',
    'prioridad' => 'Media',
    'tecnico' => 5853049,
    'razon_falla' => 'Internet Lento',
    'origen_reporte' => 'Portal Cliente',
    'descripcion' => 'Prueba de diagnostico 2',
    'fecha_inicio' => $now,
    'fecha_estimada_inicio' => $now,
    'fecha_estimada_fin' => $future
]);

// Prueba 3: Objeto anidado en servicio
tryCreate("Nested Service Object", [
    'servicio' => ['id_servicio' => 667],
    'asuntos_default' => 1,
    'departamentos_default' => 1,
    'estado' => 'Abierto',
    'prioridad' => 'Media',
    'tecnico' => 5853049,
    'razon_falla' => 'Internet Lento',
    'origen_reporte' => 'Portal Cliente',
    'descripcion' => 'Prueba de diagnostico 3'
]);

?>
