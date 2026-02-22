<?php
header("Content-Type: application/json");
require_once 'config_wisphub.php';

$token = WISPHUB_TOKEN;
$api_url = WISPHUB_API_URL;

$id_servicio = $_GET['id_servicio'] ?? '606';

$ch = curl_init($api_url . "facturas/?servicio=$id_servicio&limit=100");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Api-Key $token"]);
$res = curl_exec($ch);
$data = json_decode($res, true);
curl_close($ch);

$report = [];
if (isset($data['results'])) {
    foreach ($data['results'] as $inv) {
        $report[] = [
            'internal_id' => $inv['id_factura'] ?? $inv['id'] ?? 'N/A',
            'numero_factura' => $inv['numero_factura'] ?? 'N/A',
            'folio' => $inv['folio'] ?? 'N/A',
            'total' => $inv['total'] ?? 'N/A',
            'estado' => $inv['estado'] ?? 'N/A'
        ];
    }
}

echo json_encode([
    'service_id' => $id_servicio,
    'count' => count($report),
    'invoices' => $report,
    'raw_first_item' => $data['results'][0] ?? null
], JSON_PRETTY_PRINT);
?>
