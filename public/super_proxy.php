<?php
// super_proxy.php - VERSIÓN AUTORREPARABLE
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

$logFile = 'api_debug.log';
$logFile = __DIR__ . '/api_debug.log';
function writeLog($msg) {
    global $logFile;
    file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] (SUPER_PROXY) " . $msg . "\n", FILE_APPEND);
}
writeLog("Hit super_proxy.php - Method: " . $_SERVER['REQUEST_METHOD']);

$method = $_SERVER['REQUEST_METHOD'];
$ch = curl_init();

if ($method === 'POST') {
    $inputJSON = file_get_contents('php://input');
    $data = json_decode($inputJSON, true);
    
    // --- HOTFIX: Reparamos los datos aquí mismo ---
    if (!isset($data['asuntos_default'])) $data['asuntos_default'] = $data['asunto'] ?? 'Soporte';
    if (!isset($data['departamentos_default'])) $data['departamentos_default'] = $data['departamento'] ?? 'Soporte Técnico';
    if (!isset($data['razon_falla'])) $data['razon_falla'] = $data['asunto'] ?? 'Falla de servicio';
    if (!isset($data['tecnico'])) $data['tecnico'] = '5853049';
    if (!isset($data['origen_reporte'])) $data['origen_reporte'] = 'oficina';
    
    // Convertir prioridad de texto a número (Si la App envía 'media')
    $p = strtolower($data['prioridad'] ?? 'media');
    $map = ['baja' => '1', 'media' => '2', 'alta' => '3', 'urgente' => '4'];
    $data['prioridad'] = $map[$p] ?? $p;
    $data['estado'] = '1';

    // Fecha en formato Wisphub
    date_default_timezone_set('America/Caracas'); 
    $now = date('d/m/Y H:i');
    $data['fecha_inicio'] = $now;
    $data['fecha_final'] = $now;
    
    // Convertimos de vuelta a JSON para Wisphub
    $fixedPayload = json_encode($data);
    
    file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] FIXED POST: $fixedPayload\n", FILE_APPEND);

    curl_setopt($ch, CURLOPT_URL, $api_url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $fixedPayload);
    $headers = ['Authorization: Api-Key ' . $api_key, 'Content-Type: application/json'];
} else {
    $qs = $_SERVER['QUERY_STRING'] ?? '';
    curl_setopt($ch, CURLOPT_URL, $api_url . '?' . $qs);
    $headers = ['Authorization: Api-Key ' . $api_key];
}

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

http_response_code($http_code);
echo $response;
?>