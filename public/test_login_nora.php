<?php
// test_login_nora_v2.php
// Simulador EXACTO del login de producción

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: text/html; charset=utf-8');

echo "<h1>Diagnóstico V2: Lógica Real</h1>";
echo "<pre>";

$user = 'norapalacios@wifi-rapidito';
$pass = 'nora1234';

// CONFIG
$api_url_base = 'https://api.wisphub.app/api/clientes/';
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

// 1. BUSQUEDA
$searchUrl = $api_url_base . '?buscar=' . urlencode($user) . '&limit=15';
echo "Buscando: $searchUrl\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $searchUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$res = curl_exec($ch);
curl_close($ch);

$data = json_decode($res, true);
$candidates = $data['results'] ?? [];
echo "Candidatos encontrados: " . count($candidates) . "\n\n";

$foundClient = null;

foreach ($candidates as $index => $client) {
    echo "[$index] " . $client['nombre'] . "\n";
    echo "    Portal: " . ($client['usuario_portal']??'') . " / Pass: " . ($client['password_portal']??'') . "\n";
    echo "    Servicio: " . ($client['usuario']??'') . " / Pass: " . ($client['password_servicio']??'') . "\n";
    
    $p_portal = $client['password_portal'] ?? '';
    $p_pppoe = $client['password_servicio'] ?? '';
    
    // VALIDACION
    if ($p_portal === $pass) {
        echo "    >>> MATCH! Password Portal correcta.\n";
        $foundClient = $client;
        break;
    }
    if ($p_pppoe === $pass) {
        echo "    >>> MATCH! Password Servicio correcta.\n";
        $foundClient = $client;
        break;
    }
    echo "    --- No match ---\n";
}

if (!$foundClient) {
    echo "\nFATAL: Usuario no encontrado o contraseña incorrecta en el bucle.\n";
    exit;
}

echo "\nUSUARIO AUTENTICADO: " . $foundClient['nombre'] . "\n";

// 2. PROMESA (LOGICA BLINDADA)
$clientId = $foundClient['id_servicio'] ?? $foundClient['id_cliente'] ?? '';
echo "ID para Promesa: [$clientId]\n";

if (!empty($clientId)) {
    $pUrl = 'https://api.wisphub.app/api/promesas-pago/?cliente=' . $clientId;
    echo "Consultando Promesa: $pUrl ... ";
    
    $chP = curl_init();
    curl_setopt($chP, CURLOPT_URL, $pUrl);
    curl_setopt($chP, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($chP, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
    curl_setopt($chP, CURLOPT_SSL_VERIFYPEER, false);
    $resP = curl_exec($chP);
    $infoP = curl_getinfo($chP);
    curl_close($chP);
    
    echo "HTTP " . $infoP['http_code'] . "\n";
    
    // JSON DECODE SAFE
    $dataP = json_decode($resP, true);
    
    if (json_last_error() === JSON_ERROR_NONE) {
        echo "JSON Válido.\n";
        var_dump($dataP);
    } else {
        echo "JSON INVÁLIDO (Manejado correctamente). Respuesta RAW truncada:\n";
        echo htmlspecialchars(substr($resP, 0, 100)) . "...\n";
        echo ">>> EL SCRIPT DE LOGIN IGNORARÁ ESTE ERROR Y PERMITIRÁ EL ACCESO <<<\n";
    }
} else {
    echo "ID vacío, saltando promesa.\n";
}

echo "\n=== PRUEBA FINALIZADA CON ÉXITO ===\n";
echo "Si ves este mensaje, el usuario DEBERÍA poder entrar.";
echo "</pre>";
?>
