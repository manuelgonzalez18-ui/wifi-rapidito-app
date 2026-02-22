<?php
// probe_ticket_options.php
// Uses OPTIONS request to discover valid field choices for Tickets.

header('Content-Type: text/plain; charset=utf-8');

$apiKey = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$url = 'https://api.wisphub.app/api/tickets/';

echo "=== PROBANDO OPTIONS EN /api/tickets/ ===\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'OPTIONS'); // Petición de metadatos
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Api-Key ' . $apiKey,
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $httpCode\n\n";

if ($httpCode == 200) {
    $data = json_decode($response, true);
    
    // DRF suele devolver la estructura en 'actions' -> 'POST'
    $postFields = $data['actions']['POST'] ?? $data ?? [];
    
    echo "--- METADATOS ENCONTRADOS ---\n";
    foreach ($postFields as $field => $meta) {
        $required = ($meta['required'] ?? false) ? '[REQUERIDO]' : '[OPCIONAL]';
        $type = $meta['type'] ?? 'unknown';
        $label = $meta['label'] ?? $field;
        
        echo "$field ($label) - $type $required\n";
        
        if (isset($meta['choices'])) {
            echo "   Opciones (Choices):\n";
            foreach ($meta['choices'] as $choice) {
                echo "   - [" . $choice['value'] . "] " . $choice['display_name'] . "\n";
            }
        }
    }
} else {
    echo "❌ La API no respondió con el esquema OPTIONS.\n";
    echo "Respuesta cruda:\n" . substr($response, 0, 500) . "...\n";
}

echo "\n\n=== LISTADO DE STAFF (TÉCNICOS) ===\n";
$urlStaff = 'https://api.wisphub.app/api/staff/';
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $urlStaff);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $apiKey]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$resStaff = curl_exec($ch);
curl_close($ch);

$staffData = json_decode($resStaff, true);
$staff = $staffData['results'] ?? $staffData ?? [];
foreach ($staff as $s) {
    echo "[" . ($s['id'] ?? '??') . "] " . ($s['nombre'] ?? $s['username'] ?? '??') . "\n";
}

?>
