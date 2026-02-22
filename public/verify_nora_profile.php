<?php
// verify_nora_profile.php
header('Content-Type: text/plain; charset=utf-8');

$apiKey = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$cedula = '30449997'; // Cédula de Nora
$name = 'Nora';

echo "=== VERIFICANDO PERFIL DE NORA PALACIOS EN WISPHUB ===\n";

// 1. Buscar por Cédula
$url = 'https://api.wisphub.app/api/clientes/?buscar=' . $cedula;
echo "Buscando por Cédula ($cedula)...\n";

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
if (isset($data['results']) && count($data['results']) > 0) {
    echo "✅ CLIENTE ENCONTRADO POR CÉDULA!\n";
    foreach ($data['results'] as $client) {
            echo "Nombre: " . ($client['nombre'] ?? 'N/A') . "\n";
            echo "Usuario: " . ($client['usuario'] ?? 'N/A') . "\n";
            echo "ID Cliente: " . ($client['id_cliente'] ?? 'N/A') . "\n";
            echo "ID Servicio: " . ($client['id_servicio'] ?? 'N/A') . "\n";
            echo "Estado: " . ($client['estado'] ?? 'N/A') . "\n";
            echo "Saldo: " . ($client['saldo'] ?? '0.00') . "\n";
    }
} else {
    echo "❌ No se encontró nada con esa cédula.\n";
    
    // 2. Buscar por nombre
    echo "\nBuscando por Nombre ($name)...\n";
    $urlName = 'https://api.wisphub.app/api/clientes/?buscar=' . $name;
    $ch2 = curl_init();
    curl_setopt($ch2, CURLOPT_URL, $urlName);
    curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch2, CURLOPT_HTTPHEADER, [
        'Authorization: Api-Key ' . $apiKey,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch2, CURLOPT_SSL_VERIFYPEER, false);
    $responseName = curl_exec($ch2);
    curl_close($ch2);
    
    $dataName = json_decode($responseName, true);
    if (isset($dataName['results']) && count($dataName['results']) > 0) {
        echo "✅ POSIBLES COINCIDENCIAS POR NOMBRE:\n";
        foreach ($dataName['results'] as $c) {
             echo "- " . $c['nombre'] . " (ID Cli: " . $c['id_cliente'] . ", ID Svc: " . $c['id_servicio'] . ")\n";
        }
    } else {
        echo "❌ Tampoco se encontró nada por nombre.\n";
    }
}
?>
