<?php
header('Content-Type: text/html; charset=utf-8');

// Configuración
$api_url_base = 'https://api.wisphub.app/api';
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

// Datos de Nora (Hardcoded para test rápido)
$test_user = 'norapalacios';
$test_cedula = '16573997'; // Cédula sin V-
$test_id_cliente = ''; // Se llenará dinámicamente si encontramos al usuario

function callApi($endpoint, $params = []) {
    global $api_url_base, $api_key;
    $url = $api_url_base . $endpoint;
    if (!empty($params)) {
        $url .= '?' . http_build_query($params);
    }
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return [
        'code' => $httpCode,
        'url' => $url,
        'data' => json_decode($response, true)
    ];
}

echo "<style>body{font-family:monospace; background:#111; color:#0f0; padding:20px;} h2{border-bottom:1px solid #333; color:#fff;} .block{background:#222; padding:10px; margin-bottom:20px; border:1px solid #444; white-space:pre-wrap; overflow-x:auto;} .warn{color:orange;} .err{color:red;}</style>";
echo "<h1>DIAGNÓSTICO MAESTRO WISPHUB v1.0</h1>";

// 1. OBTENER ID REAL DEL CLIENTE
echo "<h2>1. BÚSQUEDA DE PERFIL ($test_user)</h2>";
$res_user = callApi('/clientes/', ['buscar' => $test_user]);
$userData = null;

if (!empty($res_user['data']['results'])) {
    foreach ($res_user['data']['results'] as $u) {
        if ($u['usuario'] === $test_user) {
            $userData = $u;
            $test_id_cliente = $u['id_cliente'];
            $test_id_servicio = $u['id_servicio'];
            break;
        }
    }
}

if ($userData) {
    echo "<div class='block'>ENCONTRADO: \n";
    echo "ID Cliente: " . $userData['id_cliente'] . "\n";
    echo "ID Servicio: " . $userData['id_servicio'] . "\n";
    echo "Nombre: " . $userData['nombre'] . "\n";
    echo "Saldo: " . ($userData['saldo'] ?? 'N/A') . "\n";
    echo "</div>";
} else {
    echo "<div class='block err'>CRÍTICO: No se encontró al usuario 'norapalacios'. Imposible continuar diagnósticos profundos.</div>";
    exit;
}

// 2. BUSCAR FACTURAS (Usando múltiples estrategias)
echo "<h2>2. FACTURAS (Estrategia Múltiple)</h2>";

$inv_by_id = callApi('/facturas/', ['cliente' => $test_id_cliente]);
echo "<div class='block'><strong>Por ID Cliente ($test_id_cliente):</strong> " . count($inv_by_id['data']['results'] ?? []) . " encontradas.\n";
// print_r($inv_by_id['data']); 
echo "</div>";

$inv_by_user = callApi('/facturas/', ['search' => $test_user]);
echo "<div class='block'><strong>Por Usuario ($test_user):</strong> " . count($inv_by_user['data']['results'] ?? []) . " encontradas.\n";
echo "</div>";

// 3. PROMESAS DE PAGO (El misterio)
echo "<h2>3. PROMESAS DE PAGO</h2>";
// Intentamos varios endpoints posibles ya que no está documentado estándar
$endpoints_promesa = [
    '/promesas-pago/',
    '/avisos-pago/', 
    '/solicitudes-promesa/'
];

$promesa_found = false;
$res_promesa = callApi('/promesas-pago/', ['cliente' => $test_id_cliente]); // Intento estándar
echo "<div class='block'><strong>Endpoint /promesas-pago/?cliente=$test_id_cliente:</strong>\n";
if ($res_promesa['code'] != 200) {
    echo "ERROR HTTP " . $res_promesa['code'];
} else {
    // Analizar si hay resultados
    $promesas = $res_promesa['data']['results'] ?? $res_promesa['data'] ?? [];
    echo "Cantidad: " . count($promesas) . "\n";
    print_r($promesas);
}
echo "</div>";

// 4. TICKETS
echo "<h2>4. TICKETS DE SOPORTE</h2>";
$res_tickets = callApi('/tickets/', ['servicio' => $test_id_servicio]);
echo "<div class='block'><strong>Tickets por ID Servicio ($test_id_servicio):</strong> " . count($res_tickets['data']['results'] ?? []) . " encontrados.\n";
print_r($res_tickets['data']['results'] ?? []);
echo "</div>";

echo "<h2>FIN DEL DIAGNÓSTICO</h2>";
?>
