<?php
// find_nora_invoice.php
header('Content-Type: text/plain; charset=utf-8');

$apiKey = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$targetName = 'Nora';
$targetCedula = '30449997';

echo "=== BUSCANDO FACTURAS DE NORA PALACIOS EN WISPHUB ===\n";

$url = 'https://api.wisphub.app/api/facturas/?limit=500'; // Traer muchas para encontrar una de ella

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Api-Key ' . $apiKey,
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
$results = $data['results'] ?? [];

echo "Total facturas traídas: " . count($results) . "\n\n";

$found = false;
foreach ($results as $invoice) {
    $json = json_encode($invoice);
    if (stripos($json, $targetName) !== false || stripos($json, $targetCedula) !== false) {
        echo "✅ FACTURA ENCONTRADA!\n";
        echo "JSON ESTRUCTURA:\n";
        echo json_encode($invoice, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
        echo "-----------------------------------\n";
        $found = true;
        break; // Solo necesitamos una para ver la estructura
    }
}

if (!$found) {
    echo "❌ No se encontró ninguna factura que mencione a 'Nora' o la cédula '$targetCedula' en las últimas " . count($results) . " facturas.\n";
    echo "Esto sugiere que las facturas de este cliente tienen IDs o nombres que no coinciden con su perfil.\n";
}
?>
