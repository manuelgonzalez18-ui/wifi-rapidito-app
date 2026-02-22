<?php
// super_fuzzer.php
// Pruebas masivas para encontrar los catálogos de tickets.

header('Content-Type: text/plain; charset=utf-8');

$apiKey = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$baseUrl = 'https://api.wisphub.app/api/';

$words = [
    'asuntos', 'departamentos', 'motivos', 'fallas', 'tipos', 'categorias',
    'prioridades', 'estados', 'staff', 'personal', 'tecnicos', 'usuarios',
    'catalogos', 'configuracion', 'ajustes', 'settings', 'options', 'defaults',
    'ticket', 'tickets', 'soporte', 'helpdesk', 'issue', 'reporte'
];

$paths = [];
foreach ($words as $w1) {
    $paths[] = $w1;
    foreach ($words as $w2) {
        $paths[] = $w1 . '-' . $w2;
        $paths[] = $w1 . '_' . $w2;
        $paths[] = $w1 . '/' . $w2;
    }
}

$paths = array_unique($paths);

echo "=== SUPER FUZZER (Wisphub Catalogs) ===\n";
echo "Total paths to test: " . count($paths) . "\n\n";

$found = 0;
// Usamos multi-curl para ir rápido si es posible, o secuencial para evitar bloqueos
foreach ($paths as $path) {
    $url = $baseUrl . $path . '/';
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_NOBODY, true); // Solo headers
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $apiKey]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    curl_exec($ch);
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($http == 200 || $http == 405) { // 405 significa que el endpoint existe pero no acepta HEAD/GET
        echo "[$http] FOUND: $path\n";
        $found++;
        
        // Si es 200, probamos a traer un item
        if ($http == 200) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url . '?limit=2');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $apiKey]);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            $res = curl_exec($ch);
            curl_close($ch);
            
            $data = json_decode($res, true);
            $items = $data['results'] ?? $data ?? [];
            if (is_array($items) && count($items) > 0) {
                $sample = $items[0] ?? $items;
                echo "   Sample Data: " . substr(json_encode($sample), 0, 100) . "...\n";
            }
        }
    }
}

echo "\nDone. Found $found endpoints.\n";
?>
