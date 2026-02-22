<?php
/**
 * discover_forma_pago.php - Descubre IDs válidos de formas de pago
 * Consulta facturas existentes para ver qué formas de pago usa WispHub.
 */
require_once 'config_wisphub.php';
header('Content-Type: text/plain; charset=utf-8');

echo "=== Descubriendo formas de pago válidas ===\n\n";

// 1. Intentar listar formas-pago con distintas URLs
$endpoints = ['formas-pago/', 'forma-pago/', 'formas-de-pago/', 'metodos-pago/', 'tipo-pago/'];
foreach ($endpoints as $ep) {
    $url = WISPHUB_API_URL . $ep;
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . WISPHUB_TOKEN]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    echo "GET /api/{$ep} → HTTP {$code}\n";
    if ($code === 200) {
        echo "Respuesta: {$res}\n\n";
    }
}

// 2. Ver formas de pago de facturas existentes
echo "\n=== Formas de pago en facturas existentes ===\n";
$url = WISPHUB_API_URL . 'facturas/?limit=50';
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . WISPHUB_TOKEN]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$res = curl_exec($ch);
curl_close($ch);
$data = json_decode($res, true);
$formasPago = [];
if (!empty($data['results'])) {
    foreach ($data['results'] as $inv) {
        $fp = $inv['forma_pago'] ?? null;
        if ($fp !== null) {
            $key = is_array($fp) ? json_encode($fp) : (string)$fp;
            if (!isset($formasPago[$key])) {
                $formasPago[$key] = ['value' => $fp, 'count' => 0, 'sample_id' => $inv['id_factura']];
            }
            $formasPago[$key]['count']++;
        }
    }
}

echo "Formas de pago encontradas en 50 facturas:\n";
foreach ($formasPago as $key => $info) {
    echo "  forma_pago = " . print_r($info['value'], true) . " (usada {$info['count']} veces, ej: factura #{$info['sample_id']})\n";
}

// 3. OPTIONS en el endpoint reportar-pago para ver el schema
echo "\n=== OPTIONS /api/facturas/reportar-pago/5871/ ===\n";
$url = WISPHUB_API_URL . 'facturas/reportar-pago/5871/';
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'OPTIONS');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . WISPHUB_TOKEN]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$res = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
echo "HTTP: {$code}\n";
echo "Respuesta completa:\n{$res}\n";
?>
