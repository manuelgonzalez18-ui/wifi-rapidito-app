<?php
// verify_data_flow.php
// Simulates a user session and checks proxy responses.

header('Content-Type: text/plain; charset=utf-8');

$test_user = 'norapalacios@wifi-rapidito';
$test_pass = 'wifirapidito2026'; // Master pass for testing

echo "--- 1. Testing Login Service ---\n";
$ch = curl_init('http://localhost/login_wisphub.php');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['username' => $test_user, 'password' => $test_pass]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$res = curl_exec($ch);
$login_data = json_decode($res, true);
curl_close($ch);

if ($login_data && $login_data['success']) {
    echo "✅ Login Successful!\n";
    $user = $login_data['user'];
    echo "   User: " . $user['nombre'] . "\n";
    echo "   Svc ID: " . $user['id_servicio'] . "\n";
    echo "   DNI: " . $user['cedula'] . "\n";
    
    echo "\n--- 2. Testing Invoices Proxy (Dragnet) ---\n";
    $svc_id = $user['id_servicio'];
    $inv_url = "http://localhost/proxy_invoices.php?id_servicio=$svc_id&cedula=" . $user['cedula'] . "&cliente=" . urlencode($user['usuario']);
    echo "   Requesting: $inv_url\n";
    
    $ch = curl_init($inv_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $res = curl_exec($ch);
    $inv_data = json_decode($res, true);
    curl_close($ch);
    
    if (isset($inv_data['results'])) {
        echo "✅ Invoices Found: " . count($inv_data['results']) . "\n";
        if (count($inv_data['results']) > 0) {
            $first = $inv_data['results'][0];
            echo "   Sample Invoice #" . ($first['id_factura'] ?? $first['folio']) . " matched by: " . ($first['debug_match_by'] ?? 'unknown') . "\n";
        }
    } else {
        echo "❌ No invoices returned from proxy.\n";
    }
    
    echo "\n--- 3. Testing Tickets Proxy ---\n";
    $tick_url = "http://localhost/proxy.php?servicio=$svc_id";
    echo "   Requesting: $tick_url\n";
    
    $ch = curl_init($tick_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $res = curl_exec($ch);
    $tick_data = json_decode($res, true);
    curl_close($ch);
    
    if (isset($tick_data['results']) || is_array($tick_data)) {
        $count = isset($tick_data['results']) ? count($tick_data['results']) : count($tick_data);
        echo "✅ Tickets Found: $count\n";
    } else {
        echo "❌ No tickets returned from proxy.\n";
    }
    
} else {
    echo "❌ Login Failed: " . ($login_data['error'] ?? 'Unknown error') . "\n";
}
?>
