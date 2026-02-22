<?php
header("Content-Type: application/json");
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

$out = [];

// 1. Get FULL INVOICE 5561 (No truncation)
$ch = curl_init('https://api.wisphub.app/api/facturas/5561/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$res = curl_exec($ch);
$out['full_invoice_5561'] = json_decode($res, true);
curl_close($ch);

// 2. Get FULL CLIENT 667 (No truncation)
$ch = curl_init('https://api.wisphub.app/api/clientes/667/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$res = curl_exec($ch);
$out['full_client_667'] = json_decode($res, true);
curl_close($ch);

// 3. Search for ANY promise related to Nora's ID or Invoice ID
// We'll try the most likely plural endpoint on .app and .net
$likely_urls = [
    'https://api.wisphub.app/api/promesas-de-pago/',
    'https://api.wisphub.net/api/promesas-de-pago/'
];

$all_promises = [];
foreach ($likely_urls as $url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    $data = json_decode($res, true);
    if (isset($data['results'])) {
        foreach ($data['results'] as $p) {
            $p_json = json_encode($p);
            if (strpos($p_json, '667') !== false || strpos($p_json, '5561') !== false || strpos($p_json, '6838842') !== false) {
                $all_promises[] = $p;
            }
        }
    }
    curl_close($ch);
}
$out['matching_promises_found'] = $all_promises;

echo json_encode($out, JSON_PRETTY_PRINT);
?>
