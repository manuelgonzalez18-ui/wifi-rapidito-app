<?php
header('Content-Type: text/plain');
$api_url_base = 'https://api.wisphub.app/api/clientes/';
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

$search_terms = [
    'norapalacios@wifi-rapidito',
    'norapalacios',
    'Nora'
];

foreach ($search_terms as $term) {
    echo "=== Buscando: '$term' ===\n";
    $url = $api_url_base . '?buscar=' . urlencode($term) . '&limit=5';
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Api-Key ' . $api_key
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $res = curl_exec($ch);
    $data = json_decode($res, true);
    curl_close($ch);
    
    if (isset($data['results'])) {
        echo "Encontrados: " . count($data['results']) . "\n";
        foreach ($data['results'] as $c) {
            echo " - ID: " . $c['id_servicio'] . " | Nombre: " . $c['nombre'] . " | UserPortal: " . ($c['usuario_portal']??'N/A') . "\n";
        }
    } else {
        echo "Error o sin resultados.\n";
    }
    echo "\n";
}
?>
