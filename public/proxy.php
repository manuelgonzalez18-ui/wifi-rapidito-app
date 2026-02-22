<?php
// proxy.php - VERSIÓN ULTRA-ROBUSTA (AUTORREPARABLE)
// Graba logs locales y arregla el payload para Wisphub automáticamente.

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$logFile = __DIR__ . '/api_logs.txt';
$api_url = 'https://api.wisphub.app/api/tickets/';
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

function writeLog($msg) {
    global $logFile;
    $date = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$date] $msg\n", FILE_APPEND);
}

// Registro inmediato de CUALQUIER golpe al proxy
writeLog("--- PROXY HIT --- Method: " . $_SERVER['REQUEST_METHOD'] . " | URI: " . $_SERVER['REQUEST_URI']);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    writeLog("OPTIONS request handled.");
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$ch = curl_init();

if ($method === 'POST') {
    writeLog("POST Request detected. Files count: " . count($_FILES));
    writeLog("FILES: " . print_r($_FILES, true));
    writeLog("POST: " . print_r($_POST, true));

    // Detectamos si es JSON o Form Data (con archivos)
    $inputJSON = file_get_contents('php://input');
    $data = json_decode($inputJSON, true);
    
    $usingFormData = false;
    if (!$data) {
        $data = $_POST;
        $usingFormData = true;
    }

    // --- REPARACIÓN DEL PAYLOAD ---
    if (!isset($data['asuntos_default'])) $data['asuntos_default'] = $data['asunto'] ?? 'Soporte';
    if (!isset($data['departamentos_default'])) $data['departamentos_default'] = $data['departamento'] ?? 'Soporte Técnico';
    if (!isset($data['razon_falla'])) $data['razon_falla'] = $data['asunto'] ?? 'Falla de servicio';
    
    // Rotación de Técnicos Reales
    $technicians = ['2223475', '2379997', '5853064']; // Ramon, Alberto, Josue
    if (!isset($data['tecnico']) || $data['tecnico'] == '5853049') {
        $data['tecnico'] = $technicians[array_rand($technicians)];
    }
    
    if (!isset($data['origen_reporte'])) $data['origen_reporte'] = 'oficina';
    
    // Mapeo de prioridad
    $p = strtolower($data['prioridad'] ?? 'media');
    $priorityMap = ['baja' => '1', 'media' => '2', 'alta' => '3', 'urgente' => '4'];
    $data['prioridad'] = $priorityMap[$p] ?? $p;
    
    $data['estado'] = '1';

    // Formato de fecha
    date_default_timezone_set('America/Caracas'); 
    $now = date('d/m/Y H:i');
    $data['fecha_inicio'] = $now;
    $data['fecha_final'] = $now;
    
    curl_setopt($ch, CURLOPT_URL, $api_url);
    curl_setopt($ch, CURLOPT_POST, true);
    
    $headers = ['Authorization: Api-Key ' . $api_key];

    if (!empty($_FILES)) {
        writeLog("Detected FILES: " . count($_FILES));
        foreach ($_FILES as $key => $file) {
            writeLog("Processing File [$key]: Name=" . $file['name'] . ", Size=" . $file['size'] . ", Error=" . $file['error']);
            if ($file['error'] === UPLOAD_ERR_OK) {
                // Mapeamos 'archivo' (de la App) a 'archivo_ticket' (de Wisphub)
                $field = ($key === 'archivo') ? 'archivo_ticket' : $key;
                $data[$field] = new CURLFile($file['tmp_name'], $file['type'], $file['name']);
            }
        }
        curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    } else {
        // Si no hay archivos, enviamos JSON
        $finalPayload = json_encode($data);
        writeLog("FIXED POST ATTEMPT (JSON): " . $finalPayload);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $finalPayload);
        $headers[] = 'Content-Type: application/json';
    }
} else {
    // GET (Listar Tickets)
    $qs = $_SERVER['QUERY_STRING'] ?? '';
    $url = $api_url . '?' . $qs;
    writeLog("GET TICKETS: " . $url);
    curl_setopt($ch, CURLOPT_URL, $url);
    $headers = ['Authorization: Api-Key ' . $api_key];
}

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// --- NOTIFICACIÓN POR CORREO (Si el ticket se creó con éxito) ---
if ($method === 'POST' && ($http_code === 201 || $http_code === 200)) {
    sendEmailNotification($data, $_FILES);
}

writeLog("RESPONSE: $http_code | BODY: " . substr($response, 0, 150));

http_response_code($http_code);
header('Content-Type: application/json');
echo $response;

/**
 * Función para enviar correo de notificación
 */
function sendEmailNotification($data, $files) {
    $to = "soporte@wifirapidito.com";
    $subject = "NUEVO TICKET SOPORTE: " . ($data['asunto'] ?? 'Sin Asunto');
    
    $boundary = md5(time());
    $headers = "From: noreply@wifirapidito.com\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n";
    
    $message = "--$boundary\r\n";
    $message .= "Content-Type: text/html; charset=UTF-8\r\n";
    $message .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
    
    $msgBody = "<html><body style='font-family: sans-serif;'>";
    $msgBody .= "<h2 style='color: #2563eb;'>Nuevo Ticket de Soporte</h2>";
    $msgBody .= "<p><strong>Servicio ID:</strong> " . ($data['servicio'] ?? 'N/A') . "</p>";
    $msgBody .= "<p><strong>Asunto:</strong> " . ($data['asunto'] ?? 'N/A') . "</p>";
    $msgBody .= "<p><strong>Prioridad:</strong> " . ($data['prioridad'] === '3' ? 'Alta' : ($data['prioridad'] === '2' ? 'Media' : 'Baja')) . "</p>";
    $msgBody .= "<div style='background: #f1f5f9; padding: 15px; border-radius: 8px;'>";
    $msgBody .= "<strong>Descripción:</strong><br>" . ($data['descripcion'] ?? 'Sin descripción');
    $msgBody .= "</div><br>";
    $msgBody .= "<p><em>Este ticket ya ha sido registrado en Wisphub.</em></p>";
    $msgBody .= "</body></html>\r\n";
    
    $message .= $msgBody;

    // Adjunto si existe
    if (!empty($files)) {
        writeLog("Email: Processing " . count($files) . " attachments.");
        foreach ($files as $f) {
            if ($f['error'] == UPLOAD_ERR_OK) {
                $name = $f['name'];
                $content = chunk_split(base64_encode(file_get_contents($f['tmp_name'])));
                $type = $f['type'];
                
                $message .= "--$boundary\r\n";
                $message .= "Content-Type: $type; name=\"$name\"\r\n";
                $message .= "Content-Disposition: attachment; filename=\"$name\"\r\n";
                $message .= "Content-Transfer-Encoding: base64\r\n\r\n";
                $message .= $content . "\r\n";
                writeLog("Email: Attached $name ($type)");
            } else {
                writeLog("Email: File error code: " . $f['error']);
            }
        }
    }
    
    $message .= "--$boundary--";
    mail($to, $subject, $message, $headers);
}
?>
