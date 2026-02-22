<?php
header("Content-Type: application/json");
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

$out = [];

// 1. Nora's Invoices (using her DNI 6838842)
$ch = curl_init('https://api.wisphub.app/api/facturas/?search=6838842');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
$res = curl_exec($ch);
$data = json_decode($res, true);
$out['nora_invoices'] = $data['results'] ?? [];
curl_close($ch);

// 2. Search for Nora in Promises
$ch = curl_init('https://api.wisphub.net/api/promesas-de-pago/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
$res = curl_exec($ch);
$data = json_decode($res, true);
$results = $data['results'] ?? [];

$nora_promises = [];
foreach ($results as $p) {
    $pJson = json_encode($p);
    if (strpos($pJson, '6838842') !== false || strpos($pJson, 'Nora') !== false || strpos($pJson, '5561') !== false) {
        $nora_promises[] = $p;
    }
}
$out['nora_promises_found'] = $nora_promises;
$out['promises_count_total'] = count($results);

echo json_encode($out, JSON_PRETTY_PRINT);
?>
