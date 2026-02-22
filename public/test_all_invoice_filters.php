<?php
// test_all_invoice_filters.php
header('Content-Type: text/plain; charset=utf-8');

$apiKey = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$svcId = '667';
$cliId = '667';
$cedula = '30449997';

$filters = [
    'servicio' => $svcId,
    'id_servicio' => $svcId,
    'cliente' => $svcId,
    'id_cliente' => $cliId,
    'cedula' => $cedula,
    'search' => $cedula,
    'buscar' => $cedula,
    'usuario' => 'NORA_USUARIO_PLACEHOLDER', // Will need the real one
    'cliente' => 'NORA_USUARIO_PLACEHOLDER'
];

echo "=== PROBANDO FILTROS DE FACTURAS PARA NORA (SVC: $svcId) ===\n\n";

foreach ($filters as $param => $value) {
    $url = "https://api.wisphub.app/api/facturas/?$param=$value&limit=5";
    echo "Probando: $url ... ";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Api-Key ' . $apiKey,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $data = json_decode($response, true);
    $count = isset($data['results']) ? count($data['results']) : 0;
    
    if ($code == 200) {
        if ($count > 0) {
            // Verificar si el primer resultado es realmente de Nora
            $first = $data['results'][0];
            $json = json_encode($first);
            $isNora = (stripos($json, 'Nora') !== false || stripos($json, $cedula) !== false);
            
            if ($isNora) {
                echo "✅ ÉXITO! ($count resultados encontrados). El primer item es de Nora.\n";
            } else {
                echo "⚠️ ERROR! El filtro devolvió $count items pero no son de Nora (ID del primero: " . ($first['id_factura'] ?? '??') . "). Wisphub ignoró el filtro.\n";
            }
        } else {
            echo "ℹ️ Cero resultados (Fino, pero no sabemos si funciona).\n";
        }
    } else {
        echo "❌ HTTP $code\n";
    }
}
?>
