<?php
// diag_ticket_options.php
header('Content-Type: text/plain; charset=utf-8');

$apiKey = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$baseUrl = 'https://api.wisphub.app/api/';

function fetchEndpoint($endpoint, $apiKey) {
    global $baseUrl;
    $url = $baseUrl . $endpoint . '/?limit=10'; // Fetch a few to see structure
    echo "--- GET $endpoint ---\n";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $apiKey]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $res = curl_exec($ch);
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "HTTP: $http\n";
    if ($http == 200) {
        $data = json_decode($res, true);
        $items = $data['results'] ?? $data ?? [];
        echo "Count: " . count($items) . "\n";
        foreach ($items as $item) {
            $id = $item['id'] ?? $item['id_asunto'] ?? $item['id_departamento'] ?? $item['id_tecnico'] ?? '??';
            $name = $item['nombre'] ?? $item['titulo'] ?? $item['username'] ?? '??';
            echo "  [$id] $name\n";
        }
    } else {
        echo "❌ Failed to fetch.\n";
    }
    echo "\n";
}

echo "=== WISPHUB TICKET METADATA PROBE ===\n\n";

// Probamos endpoints comunes en Wisphub (basado en nombres de campos requeridos)
fetchEndpoint('asuntos-default', $apiKey);
fetchEndpoint('departamentos-default', $apiKey); // A veces es 'departamentos'
fetchEndpoint('tecnicos', $apiKey); // A veces es 'usuarios-sistema' o similar

echo "=== VALIDACIÓN DE PRIORIDAD ===\n";
// No hay endpoint obvio, pero probaremos enviar un ticket "fake" con valores distintos para ver error msg
// Esto lo hicimos antes y dijo "baja no es valida". Probablemente sea 1, 2, 3.

?>
