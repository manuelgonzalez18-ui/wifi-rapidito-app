<?php
// surgical_catalog_discovery.php
// Probes only the most likely paths for Asuntos and Departamentos.

header('Content-Type: text/plain; charset=utf-8');

$apiKey = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$baseUrl = 'https://api.wisphub.app/api/';

$candidates = [
    'tickets/asuntos',
    'tickets/departamentos',
    'asuntos-tickets',
    'departamentos-tickets',
    'ajustes/tickets',
    'catalogos/asuntos',
    'catalogos/departamentos',
    'opciones/tickets'
];

echo "=== SURGICAL CATALOG DISCOVERY ===\n\n";

foreach ($candidates as $path) {
    $url = $baseUrl . $path . '/';
    echo "Probando: $url ... ";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $apiKey]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $res = curl_exec($ch);
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($http == 200) {
        echo "✅ OK!\n";
        $data = json_decode($res, true);
        echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";
    } else {
        echo "❌ $http\n";
    }
    
    // Pequeña pausa para evitar 503
    usleep(500000); 
}

echo "\n--- INTENTANDO OBTENER MÁS TICKETS EXISTENTES ---\n";
$urlTickets = $baseUrl . 'tickets/?limit=5';
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $urlTickets);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $apiKey]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$res = curl_exec($ch);
$data = json_decode($res, true);
curl_close($ch);

if (isset($data['results'])) {
    foreach ($data['results'] as $t) {
        echo "Ticket #{$t['id_ticket']}: Asunto: {$t['asunto']}, Depto: {$t['departamento']}\n";
        if (isset($t['asuntos_default'])) {
             echo "   FOUND ASUNTOS_DEFAULT ID: " . ($t['asuntos_default']['id'] ?? $t['asuntos_default']) . "\n";
        }
    }
}

?>
