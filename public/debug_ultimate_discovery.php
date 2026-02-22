<?php
header("Content-Type: application/json");
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

$out = [];

// 1. Check Gateway Settings (Often contains public tokens/hashes)
$ch = curl_init('https://api.wisphub.app/api/pasarelas-pago/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$res = curl_exec($ch);
$out['pasarelas'] = json_decode($res, true);
curl_close($ch);

// 2. Check "Facturas Pendientes" (Sometimes has different metadata)
$ch = curl_init('https://api.wisphub.app/api/facturas-pendientes/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
$res = curl_exec($ch);
$out['facturas_pendientes_sample'] = array_slice(json_decode($res, true)['results'] ?? [], 0, 3);
curl_close($ch);

// 3. Try to find "Ajustes de Facturación" (Common path for public link settings)
$ch = curl_init('https://api.wisphub.app/api/ajustes-facturacion/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
$res = curl_exec($ch);
$out['ajustes_facturacion'] = json_decode($res, true);
curl_close($ch);

// 4. Brute force common hash-related endpoints
$search_urls = [
    'https://api.wisphub.app/api/servicio/667/', // Detail of the service specifically
    'https://api.wisphub.app/api/perfil/'
];

foreach ($search_urls as $url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
    $res = curl_exec($ch);
    $out['extra_search'][$url] = json_decode($res, true);
    curl_close($ch);
}

echo json_encode($out, JSON_PRETTY_PRINT);
?>
