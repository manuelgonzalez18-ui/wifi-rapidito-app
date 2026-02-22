<?php
// debug_pagination.php
// Prints the structure of the first 3 pages of the API to understand why the Loop is failing.

header('Content-Type: text/plain; charset=utf-8');
ini_set('display_errors', 1);
set_time_limit(60);

$api_url_base = 'https://api.wisphub.app/api/facturas/';
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

echo "=== DIAGNOSTICO DE PAGINACIÓN ===\n";
$nextUrl = $api_url_base . '?limit=100'; // Probamos con 100 para ir rápido
$totalItems = 0;

for ($i = 1; $i <= 3; $i++) {
    echo "\n------------------------------------------------\n";
    echo "PÁGINA $i\n";
    echo "URL: $nextUrl\n";
    
    $start = microtime(true);
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $nextUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    $time = microtime(true) - $start;
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "Time: " . round($time, 3) . "s | HTTP: $http\n";
    
    if ($http != 200) {
        echo "❌ ERROR HTTP. Abortando.\n";
        break;
    }
    
    $data = json_decode($res, true);
    $count = count($data['results'] ?? []);
    $totalItems += $count;
    
    echo "Items encontrados: $count\n";
    
    if (isset($data['next'])) {
        echo "Link 'next': " . $data['next'] . "\n";
        $nextUrl = $data['next'];
    } else {
        echo "🚫 NO HAY 'next' link. Fin de paginación.\n";
        break;
    }
    
    // Check first item date to see order
    if ($count > 0) {
        $first = $data['results'][0];
        $last = $data['results'][$count-1];
        echo "Fecha Primer Item: " . ($first['fecha_emision'] ?? '??') . " (ID: " . ($first['id_factura'] ?? '??') . ")\n";
        echo "Fecha Último Item: " . ($last['fecha_emision'] ?? '??') . " (ID: " . ($last['id_factura'] ?? '??') . ")\n";
    }
}

echo "\n================================================\n";
echo "RESUMEN:\n";
echo "Total acumulado en 3 páginas: $totalItems\n";
echo "Memoria usada: " . round(memory_get_peak_usage() / 1024 / 1024, 2) . " MB\n";
?>
