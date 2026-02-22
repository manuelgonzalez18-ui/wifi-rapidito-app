<?php
// service_detail_probe.php
// Busca pistas de tickets dentro del detalle del servicio.

header('Content-Type: text/plain; charset=utf-8');

$apiKey = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$serviceId = 667;
$url = "https://api.wisphub.app/api/servicios/$serviceId/";

echo "=== BUSCANDO PISTAS EN SERVICIO #$serviceId ===\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $apiKey]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$res = curl_exec($ch);
$http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http == 200) {
    $data = json_decode($res, true);
    echo "¡Servicio encontrado!\n";
    
    // Mostramos campos que podrían ser útiles
    echo "Zona ID: " . ($data['zona']['id'] ?? 'N/A') . "\n";
    echo "Router ID: " . ($data['router']['id'] ?? 'N/A') . "\n";
    echo "Sectorial ID: " . ($data['sectorial']['id'] ?? 'N/A') . "\n";
    
    // A veces hay un campo 'sucursal' o 'nodo' que define los departamentos
    echo "Sucursal/Nodo: " . json_encode($data['sucursal'] ?? $data['nodo'] ?? 'No encontrado') . "\n";

    echo "\n--- PREDICCIÓN DE IDS (Buscando 200-500) ---\n";
    // Si los IDs no son 1-15, quizás son los IDs de los planes o zonas?
    // El plan de Nora es 160021. La zona es 22060.
    echo "Plan ID: " . ($data['plan_internet']['id'] ?? 'N/A') . "\n";

} else {
    echo "❌ Error al obtener el servicio (HTTP $http).\n";
}

echo "\n--- PRUEBA DE ORIGEN_REPORTE ---\n";
// Probamos valores de cadena para origen_reporte
$origins = ['portal', 'PORTAL', 'API', 'Portal Cliente', 'web', '1', '2'];
foreach ($origins as $o) {
    $payload = [
        'servicio' => 667,
        'asunto' => 'Test',
        'departamento' => 'Soporte',
        'razon_falla' => 'Test',
        'descripcion' => 'Test',
        'origen_reporte' => $o,
        'estado' => 1,
        'prioridad' => 1,
        'asuntos_default' => 0,
        'departamentos_default' => 0
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://api.wisphub.app/api/tickets/');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $apiKey, 'Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    $data = json_decode($res, true);
    curl_close($ch);
    
    $err = $data['origen_reporte'][0] ?? '';
    if (empty($err)) {
        echo "   ✅ '$o' es un valor VÁLIDO para origen_reporte.\n";
    } else {
        // echo "   ❌ '$o' rechazado: $err\n";
    }
}
?>
