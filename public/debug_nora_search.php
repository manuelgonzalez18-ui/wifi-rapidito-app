<?php
header("Content-Type: text/plain; charset=utf-8");
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

$test_cases = [
    'https://api.wisphub.net/api/clientes/?buscar=norapalacios',
    'https://api.wisphub.net/api/clientes/?buscar=norapalacios@wifi-rapidito',
    'https://api.wisphub.app/api/clientes/?buscar=norapalacios',
    'https://api.wisphub.app/api/clientes/?buscar=norapalacios@wifi-rapidito',
    'https://api.wisphub.app/api/clientes/?buscar=6838842'
];

foreach ($test_cases as $url) {
    echo "Testing URL: $url\n";
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "  HTTP Code: $code\n";
    $data = json_decode($res, true);
    $count = isset($data['results']) ? count($data['results']) : 0;
    echo "  Results: $count\n";
    if ($count > 0) {
        $client = $data['results'][0];
        echo "  First Match: " . ($client['nombre'] ?? 'N/A') . " | ID: " . ($client['id_servicio'] ?? 'N/A') . " | Portal: " . ($client['usuario_portal'] ?? 'N/A') . "\n";
    }
    echo "-----------------------------------\n";
}
?>
