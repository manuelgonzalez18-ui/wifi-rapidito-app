<?php
// fuzz_endpoints.php
// Brute-force discovery of Wisphub API endpoints

header('Content-Type: text/plain; charset=utf-8');
set_time_limit(120);

$apiKey = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$baseUrl = 'https://api.wisphub.app/api/';

$candidates = [
    // Asuntos
    'asuntos', 'asuntos-tickets', 'ticket-asuntos', 'asuntos_tickets', 
    'asunto', 'temas', 'topics', 'subjects', 'motivos',
    'catalogos/asuntos', 'configuracion/asuntos', 'asuntos-default', 'asuntos_default',
    
    // Departamentos
    'departamentos', 'departamentos-tickets', 'ticket-departamentos',
    'areas', 'departments', 'groups', 'departamentos-default', 'departamentos_default',
    'catalogos/departamentos',
    
    // Prioridades
    'prioridades', 'prioridades-tickets', 'priorities', 'prioridad',
    
    // Técnicos
    'tecnicos', 'usuarios-sistema', 'staff', 'empleados', 'users', 'usuarios',
    'tecnicos-tickets', 'staff-tickets',
    
    // Estados
    'estados', 'estados-tickets', 'ticket-estados', 'statuses',
    
    // Misceláneos
    'servicios', 'clientes', 'tickets/asuntos', 'tickets/departamentos',
    'tickets/tecnicos', 'tickets/asuntos_default', 'tickets/configuracion'
];

echo "=== WISPHUB ENDPOINT FUZZER ===\n";

foreach ($candidates as $endpoint) {
    if (strpos($endpoint, '#') === 0) continue;
    
    $url = $baseUrl . $endpoint . '/?limit=1';
    
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
        $count = isset($data['count']) ? $data['count'] : (is_array($data) ? count($data) : '?');
        echo "✅ FOUND: /$endpoint/ (HTTP 200) - Items: $count\n";
        
        // Peek at first item to see if it looks like what we want
        $sample = $data['results'][0] ?? $data[0] ?? null;
        if ($sample) {
            echo "   Keys: " . implode(', ', array_keys($sample)) . "\n";
            echo "   Sample Name: " . ($sample['nombre'] ?? $sample['descripcion'] ?? $sample['titulo'] ?? 'N/A') . "\n";
        }
    } elseif ($http == 404) {
        // echo "❌ 404: /$endpoint/\n"; // Too noisy
    } else {
        echo "⚠️  $http: /$endpoint/\n";
    }
}

echo "\nDone.\n";
?>
