<?php
header("Content-Type: application/json");
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

$out = [];

// 1. Inspect Invoice 5561 DETAILS (Deep search for public links)
$ch = curl_init('https://api.wisphub.app/api/facturas/5561/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
$res = curl_exec($ch);
$out['invoice_5561_full_details'] = json_decode($res, true);
curl_close($ch);

// 2. Search for Nora's Promise (Filtering in PHP to avoid truncation)
$ch = curl_init('https://api.wisphub.net/api/promesas-de-pago/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
$res = curl_exec($ch);
$data = json_decode($res, true);
$results = $data['results'] ?? [];

$nora_promises = [];
foreach ($results as $p) {
    $pString = json_encode($p);
    // Search for invoice ID or Nora's name or her service ID (667)
    if (strpos($pString, '5561') !== false || strpos($pString, 'Nora') !== false || strpos($pString, '667') !== false) {
        $nora_promises[] = $p;
    }
}
$out['nora_promises_found'] = $nora_promises;
$out['total_promises_in_api'] = count($results);

echo json_encode($out, JSON_PRETTY_PRINT);
?>
