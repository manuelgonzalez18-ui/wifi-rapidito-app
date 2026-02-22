<?php
header("Content-Type: application/json");
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

$out = [];

// Search for PAID invoices (more likely to have folios/PDFs)
$ch = curl_init('https://api.wisphub.app/api/facturas/?limit=100');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
$res = curl_exec($ch);
$data = json_decode($res, true);
$results = $data['results'] ?? [];

$out['found_folios'] = [];
foreach ($results as $inv) {
    if (!empty($inv['folio'])) {
        $out['found_folios'][] = [
            'id' => $inv['id_factura'],
            'folio' => $inv['folio'],
            'estado' => $inv['estado']
        ];
    }
}

// Check if any invoice has a URL in the metadata
$out['items_with_urls'] = [];
foreach ($results as $inv) {
    foreach ($inv as $k => $v) {
        if (is_string($v) && (strpos($v, 'http') !== false || strpos($k, 'url') !== false)) {
            $out['items_with_urls'][] = [
                'id' => $inv['id_factura'],
                'field' => $k,
                'value' => $v
            ];
        }
    }
}

echo json_encode($out, JSON_PRETTY_PRINT);
?>
