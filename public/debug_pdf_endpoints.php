<?php
header("Content-Type: application/json");
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

$out = [];

// 1. Get recent invoices to find a "working" example (one with a folio)
$ch = curl_init('https://api.wisphub.app/api/facturas/?limit=50');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
$res = curl_exec($ch);
$data = json_decode($res, true);
$results = $data['results'] ?? [];

$out['latest_invoices_meta'] = [];
$working_id = null;

foreach ($results as $inv) {
    if (!empty($inv['folio'])) {
        $working_id = $inv['id_factura'] ?? $inv['id'];
        $out['latest_invoices_meta'][] = [
            'id' => $working_id,
            'folio' => $inv['folio'],
            'estado' => $inv['estado']
        ];
        if (count($out['latest_invoices_meta']) >= 3) break;
    }
}
curl_close($ch);

// 2. Test variations on Nora's (5561) and the working ID
$test_ids = [5561];
if ($working_id) $test_ids[] = $working_id;

$variations = [
    'pdf/',
    'ticket/',
    '?format=pdf',
    'ver_factura/',
    'html/',
    'preview/',
    'imprimir/'
];

$out['endpoint_tests'] = [];

foreach ($test_ids as $id) {
    $out['endpoint_tests'][$id] = [];
    foreach ($variations as $var) {
        $url = "https://api.wisphub.app/api/facturas/{$id}/" . $var;
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_NOBODY, true); // Just headers
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
        curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        $out['endpoint_tests'][$id][$url] = [
            'code' => $code,
            'type' => $type
        ];
        curl_close($ch);
    }
}

echo json_encode($out, JSON_PRETTY_PRINT);
?>
