<?php
// targeted_metadata_fuzzer.php
// Pruebas específicas para encontrar los catálogos de Asuntos y Departamentos.

header('Content-Type: text/plain; charset=utf-8');

$apiKey = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$baseUrl = 'https://api.wisphub.app/api/';

$candidates = [
    'tickets/asuntos',
    'tickets/departamentos',
    'tickets/configuracion',
    'tickets/opciones',
    'catalogos/asuntos',
    'catalogos/departamentos',
    'asuntos',
    'departamentos',
    'asuntos_default',
    'departamentos_default'
];

echo "=== TICKET METADATA FUZZER ===\n\n";

foreach ($candidates as $path) {
    $url = $baseUrl . $path . '/';
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $apiKey]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $res = curl_exec($ch);
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($http == 200) {
        echo "✅ ENCONTRADO: $path\n";
        $data = json_decode($res, true);
        $results = $data['results'] ?? $data ?? [];
        foreach (array_slice($results, 0, 5) as $item) {
            $id = $item['id'] ?? $item['id_asunto'] ?? $item['id_departamento'] ?? '?';
            $name = $item['nombre'] ?? $item['asunto'] ?? $item['departamento'] ?? 'N/A';
            echo "   - [$id] $name\n";
        }
    } else {
        // echo "❌ 404: $path\n";
    }
}

echo "\n--- PROBANDO ID RANGES (100-200) ---\n";
// A veces los IDs no empiezan en 1
$payload = [
    'servicio' => 667,
    'asuntos_default' => 0,
    'asunto' => 'Prueba',
    'departamento' => 'Soporte',
    'departamentos_default' => 0,
    'estado' => 1,
    'prioridad' => 1,
    'origen_reporte' => 'Portal Cliente',
    'razon_falla' => 'Internet Lento',
    'descripcion' => 'Test',
    'tecnico' => 5853049
];

for ($id = 100; $id <= 120; $id++) {
    $payload['asuntos_default'] = $id;
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $baseUrl . 'tickets/');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key' . $apiKey, 'Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    $data = json_decode($res, true);
    $error = $data['asuntos_default'][0] ?? '';
    if (strpos($error, 'no es una de las opciones') === false && !empty($error)) {
        echo "   Posible ID valido para asunto: $id\n";
        break;
    }
}

echo "\nHecho.\n";
?>
