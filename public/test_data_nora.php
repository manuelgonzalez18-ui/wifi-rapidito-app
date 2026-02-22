<?php
// test_data_nora.php
// Diagnóstico de FACTURAS principalmente (ID 667)

ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/html; charset=utf-8');

echo "<h1>Diagnóstico de DATOS: Nora (ID 667)</h1>";
echo "<pre>";

$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$id_servicio = '667';

// 1. FACTURAS (PRIORIDAD)
echo "<h2>1. Facturas</h2>";
$urls_facturas = [
    "Filtro 'cliente' (667)" => "https://api.wisphub.app/api/facturas/?cliente=" . $id_servicio,
    "Filtro 'id_cliente' (667)" => "https://api.wisphub.app/api/facturas/?id_cliente=" . $id_servicio,
];

foreach ($urls_facturas as $label => $url) {
    echo "<b>$label</b>: $url\n";
    $res = curl_get($url, $api_key);
    echo "HTTP Code: " . $res['http_code'] . "\n";
    
    if ($res['http_code'] == 200) {
        $data = json_decode($res['body'], true);
        $count = count($data['results'] ?? []);
        echo "Facturas encontradas: $count\n";
        
        if ($count > 0) {
            echo "Ejemplo Factura #1:\n";
            $f = $data['results'][0];
            echo "ID: " . $f['id_factura'] . " | Total: " . $f['total'] . " | Estado: " . $f['estado'] . "\n";
            echo "Datos Cliente JSON: " . json_encode($f['nombre_cliente'] ?? 'N/A') . "\n";
        }
    } else {
         echo "ERROR: " . htmlspecialchars(substr($res['body'], 0, 100)) . "...\n";
    }
    echo "----------------------------------------\n";
}

// 2. TICKETS
echo "<h2>2. Tickets</h2>";
$urls_tickets = [
    "Filtro 'servicio' (667)" => "https://api.wisphub.app/api/tickets/?servicio=" . $id_servicio,
    "Filtro 'id_servicio' (667)" => "https://api.wisphub.app/api/tickets/?id_servicio=" . $id_servicio,
];

foreach ($urls_tickets as $label => $url) {
    echo "<b>$label</b>: $url\n";
    $res = curl_get($url, $api_key);
    echo "HTTP Code: " . $res['http_code'] . "\n";
    
    if ($res['http_code'] == 200) {
        $data = json_decode($res['body'], true);
        echo "Tickets encontrados: " . count($data['results'] ?? []) . "\n";
        if (!empty($data['results'])) {
             echo "Ejemplo Ticket #1:\n";
             print_r($data['results'][0]);
        }
    } else {
        echo "ERROR: " . htmlspecialchars(substr($res['body'], 0, 100)) . "...\n";
    }
    echo "----------------------------------------\n";
}

// 3. PROMESAS DE PAGO
echo "<h2>2. Promesas de Pago</h2>";
$urls_promesa = [
    "Por ID Servicio (667)" => "https://api.wisphub.app/api/promesas-pago/?cliente=" . $id_servicio,
];

foreach ($urls_promesa as $label => $url) {
    echo "<b>$label</b>: $url\n";
    $res = curl_get($url, $api_key);
    echo "HTTP Code: " . $res['http_code'] . "\n";
    
    if ($res['http_code'] == 200) {
        $data = json_decode($res['body'], true);
        echo "Items encontrados: " . count($data['results'] ?? []) . "\n";
    } else {
        echo "ERROR (Normal si es 404 w/ HTML): " . htmlspecialchars(substr($res['body'], 0, 100)) . "...\n";
    }
    echo "----------------------------------------\n";
}

// Helper function
function curl_get($url, $key) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $key]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $body = curl_exec($ch);
    $info = curl_getinfo($ch);
    curl_close($ch);
    return ['http_code' => $info['http_code'], 'body' => $body];
}

echo "</pre>";
?>
