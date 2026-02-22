<?php
// get_wisphub_lists.php
// Targeted probe for the two critical missing lists.

header('Content-Type: text/plain; charset=utf-8');

$apiKey = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$baseUrl = 'https://api.wisphub.app/api/';

$targets = [
    'asuntos-default', 
    'asuntos_default', 
    'departamentos-default', 
    'departamentos_default',
    'prioridades',
    'estados-tickets'
];

echo "=== BUSCANDO LISTAS DE CONFIGURACIÓN ===\n\n";

foreach ($targets as $t) {
    $url = $baseUrl . $t . '/';
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
        $data = json_decode($res, true);
        $count = $data['count'] ?? count($data ?? []);
        echo "✅ OK ($count items)\n";
        
        $items = $data['results'] ?? $data ?? [];
        foreach (array_slice($items, 0, 10) as $item) {
            $id = $item['id'] ?? $item['id_asunto'] ?? $item['id_departamento'] ?? '?';
            $nombre = $item['nombre'] ?? $item['asunto'] ?? $item['departamento'] ?? 'N/A';
            echo "   - [$id] $nombre\n";
        }
        echo "\n";
    } else {
        echo "❌ Falló ($http)\n";
    }
}
?>
