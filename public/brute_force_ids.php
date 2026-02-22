<?php
// brute_force_ids.php
// Trata de encontrar valores válidos enviando números secuenciales.

header('Content-Type: text/plain; charset=utf-8');

$apiKey = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$url = 'https://api.wisphub.app/api/tickets/';

function testValue($fieldName, $value) {
    global $apiKey, $url;
    
    // Payload "dummy" pero con un campo a probar
    $payload = [
        'servicio' => 667,
        'asuntos_default' => 0,
        'asunto' => 'Prueba',
        'departamento' => 'Soporte',
        'departamentos_default' => 0,
        'estado' => '0',
        'prioridad' => '0',
        'origen_reporte' => '0',
        'razon_falla' => 'Test',
        'descripcion' => 'Test'
    ];
    
    $payload[$fieldName] = $value;
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Api-Key ' . $apiKey,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $res = curl_exec($ch);
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $data = json_decode($res, true);
    $error = $data[$fieldName][0] ?? '';
    
    // Si el error NO es "Seleccione una opción válida", entonces el valor ES válido (o dio otro error)
    if (strpos($error, 'no es una de las opciones disponibles') === false && !empty($error)) {
        return ['valid' => false, 'error' => $error];
    } elseif (empty($error) && $http == 400) {
        // El campo pasó la validación pero otros fallaron
        return ['valid' => true];
    }
    
    return ['valid' => false];
}

echo "=== BUSCANDO IDS VÁLIDOS ===\n\n";

$fields = ['prioridad', 'estado', 'origen_reporte', 'asuntos_default', 'departamentos_default'];

foreach ($fields as $field) {
    echo "Probando campo: $field\n";
    $found = [];
    
    // Probamos números del 0 al 20 (rangos típicos de selectores)
    for ($i = 0; $i <= 15; $i++) {
        $res = testValue($field, $i);
        if ($res['valid']) {
            $found[] = $i;
        }
    }
    
    // Probamos también algunos strings comunes en minúsculas
    $common = ['baja', 'media', 'alta', 'abierto', 'cerrado', 'soporte', 'portal', 'api'];
    foreach ($common as $val) {
        $res = testValue($field, $val);
        if ($res['valid']) {
            $found[] = $val;
        }
    }

    if (empty($found)) {
        echo "   ❌ No se encontraron valores simples.\n";
    } else {
        echo "   ✅ VALORES DETECTADOS: " . implode(', ', $found) . "\n";
    }
    echo "\n";
}

?>
