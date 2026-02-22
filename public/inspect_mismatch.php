<?php
// inspect_specific_invoices.php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$api_url = 'https://api.wisphub.app/api';

$target_ids = [5871, 5870, 5869, 5868, 5561, 5066]; // Wrong ones vs Real ones

$results = [];

foreach ($target_ids as $id) {
    // Try by ID (Wisphub invoice endpoints vary, usually /facturas/{id}/ or ?id_factura=...)
    // Let's try filtered search first as it's safer
    $url = "$api_url/facturas/?id_factura=$id";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Api-Key $api_key"]);
    $response = curl_exec($ch);
    $data = json_decode($response, true);
    curl_close($ch);

    if (isset($data['results']) && !empty($data['results'])) {
        $inv = $data['results'][0];
        $results[$id] = [
            'found' => true,
            'id_factura' => $inv['id_factura'],
            'cliente_nombre' => $inv['nombre_cliente'] ?? $inv['cliente']['nombre'] ?? 'N/A',
            'cliente_cedula' => $inv['cedula_cliente'] ?? $inv['cliente']['cedula'] ?? 'N/A',
            'id_cliente_wisphub' => $inv['id_cliente'] ?? $inv['cliente']['id'] ?? 'N/A',
            'id_servicio' => $inv['id_servicio'] ?? $inv['servicio']['id'] ?? 'N/A',
            'total' => $inv['total']
        ];
    } else {
        $results[$id] = ['found' => false, 'raw' => $data];
    }
}

echo json_encode($results, JSON_PRETTY_PRINT);
?>
