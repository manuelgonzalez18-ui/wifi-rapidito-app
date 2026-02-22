<?php
// proxy_promises.php - v2.0 (Email & .app)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$logFile = __DIR__ . '/api_logs.txt';
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$base_url = 'https://api.wisphub.app/api/promesas-de-pago/';

function writeLog($msg) {
    global $logFile;
    $date = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$date][PROMISE] $msg\n", FILE_APPEND);
}

$method = $_SERVER['REQUEST_METHOD'];
$ch = curl_init();

// GET DATA
$inputJSON = file_get_contents('php://input');
$data = json_decode($inputJSON, true);

if (!$data) {
    $data = $_POST;
}

$query = $_SERVER['QUERY_STRING'] ?? '';
$final_url = $base_url . ($query ? '?' . $query : '');

curl_setopt($ch, CURLOPT_URL, $final_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Api-Key ' . $api_key,
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

if ($method === 'POST') {
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
}

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// --- ALERTA POR CORREO (v2.0) ---
if ($method === 'POST' && ($http_code === 201 || $http_code === 200)) {
    sendEmailNotification($data);
}

writeLog("REQ: $final_url | CODE: $http_code | RES: " . substr($response, 0, 100));

http_response_code($http_code);
header('Content-Type: application/json');
echo $response;

/**
 * Notificación de Promesa de Pago
 */
function sendEmailNotification($data) {
    $to = "admin@wifirapidito.com";
    $subject = "NUEVA PROMESA DE PAGO: Cliente ID " . ($data['cliente'] ?? ($data['servicio'] ?? 'N/A'));
    
    $headers = "From: noreply@wifirapidito.com\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    
    $msgBody = "<html><body style='font-family: sans-serif;'>";
    $msgBody .= "<h2 style='color: #16a34a;'>Nueva Solicitud de Promesa de Pago</h2>";
    $msgBody .= "<p><strong>Cliente/Servicio ID:</strong> " . ($data['cliente'] ?? ($data['servicio'] ?? 'N/A')) . "</p>";
    $msgBody .= "<p><strong>Días Solicitados:</strong> " . ($data['dias_promesa'] ?? 'N/A') . "</p>";
    $msgBody .= "<p><strong>Fecha de Promesa:</strong> " . ($data['fecha_promesa'] ?? date('d/m/Y')) . "</p>";
    $msgBody .= "<div style='background: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0;'>";
    $msgBody .= "<strong>Estado:</strong> Registrada exitosamente en Wisphub.<br>";
    $msgBody .= "</div><br>";
    $msgBody .= "<p><em>Este es un aviso automático del sistema Wifi Rapidito.</em></p>";
    $msgBody .= "</body></html>";
    
    mail($to, $subject, $msgBody, $headers);
}
?>
