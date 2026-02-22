<?php
// inspect_existing_ticket.php
// Prints the full JSON of an existing ticket to see the required fields/IDs.

header('Content-Type: text/plain; charset=utf-8');

$apiKey = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$url = 'https://api.wisphub.app/api/tickets/?limit=1';

echo "=== INSPECCIONANDO ESTRUCTURA DE TICKET EXISTENTE ===\n";

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
    $data = json_decode($response, true);
    $ticket = $data['results'][0] ?? null;
    
    if ($ticket) {
        echo "Ticket ID: " . ($ticket['id_ticket'] ?? '??') . "\n";
        echo "JSON Completo:\n";
        echo json_encode($ticket, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
        
        echo "\n--- ANÁLISIS DE CAMPOS CLAVE ---\n";
        echo "Asunto: " . ($ticket['asunto'] ?? 'N/A') . "\n";
        echo "Asunto Default ID: " . ($ticket['asuntos_default']['id'] ?? $ticket['asuntos_default'] ?? 'N/A') . "\n";
        echo "Departamento: " . ($ticket['departamento'] ?? 'N/A') . "\n";
        echo "Depto Default ID: " . ($ticket['departamentos_default']['id'] ?? $ticket['departamentos_default'] ?? 'N/A') . "\n";
        echo "Prioridad Value: " . ($ticket['prioridad'] ?? 'N/A') . "\n";
        echo "Estado Value: " . ($ticket['estado'] ?? 'N/A') . "\n";
        echo "ID Servicio: " . ($ticket['servicio']['id_servicio'] ?? $ticket['id_servicio'] ?? 'N/A') . "\n";
        echo "ID Técnico: " . ($ticket['tecnico']['id'] ?? $ticket['tecnico'] ?? 'N/A') . "\n";
        
    } else {
        echo "⚠️ No se encontraron tickets en la cuenta.\n";
    }
} else {
    echo "❌ Error al conectar con la API (HTTP $httpCode).\n";
}
?>
