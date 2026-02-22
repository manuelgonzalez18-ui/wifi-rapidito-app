<?php
require_once 'config_wisphub.php';

$invoice_id = '5866'; // ID from the failed logs
$api_url = WISPHUB_API_URL . "facturas/reportar-pago/$invoice_id/";

$payload = [
    'referencia'       => 'TEST' . rand(1000, 9999),
    'fecha_pago'       => date('Y-m-d'),
    'nombre_user'      => 'admin', // Testing with common staff username
    'forma_pago'       => '16749',
    'comprobante_pago' => 'Prueba técnica desde portal - Favor ignorar'
];

echo "Testing URL: $api_url\n";
echo "Testing Payload: " . json_encode($payload) . "\n\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $api_url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . WISPHUB_TOKEN]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP CODE: $http_code\n";
echo "RESPONSE: $response\n";
?>
