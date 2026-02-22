<?php
header("Content-Type: application/json");
require_once 'config_wisphub.php';

$id_factura = $_GET['id'] ?? '5866';
$token = WISPHUB_TOKEN;

$results = [];

// 1. Fetch Invoice Details to see if it even exists
$ch = curl_init(WISPHUB_API_URL . "facturas/$id_factura/");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Api-Key $token"]);
$res = curl_exec($ch);
$results['invoice_check'] = [
    'url' => WISPHUB_API_URL . "facturas/$id_factura/",
    'http_code' => curl_getinfo($ch, CURLINFO_HTTP_CODE),
    'body' => json_decode($res, true)
];
curl_close($ch);

// 2. Try variations with POST (empty) to see if we get 400 (found but bad data) or 404
$variations = [
    "facturas/reportar-pago/$id_factura/",
    "facturas/reportar-pago/",
    "facturas/$id_factura/pagar/", // Common admin action
    "facturas/$id_factura/api_registrar_pago/",
    "recaudaciones/registrar-pago/",
    "pagos/reportar-pago/",
];

$results['endpoint_POST_test'] = [];
foreach ($variations as $path) {
    $url = WISPHUB_API_URL . $path;
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, []); // Empty POST
    curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Api-Key $token"]);
    $res = curl_exec($ch);
    $results['endpoint_POST_test'][$path] = [
        'code' => curl_getinfo($ch, CURLINFO_HTTP_CODE),
        'body' => json_decode($res, true) ?: substr($res, 0, 100)
    ];
    curl_close($ch);
}

echo json_encode($results, JSON_PRETTY_PRINT);
?>
