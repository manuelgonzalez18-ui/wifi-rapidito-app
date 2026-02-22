<?php
// send_ticket.php - Handles support ticket email notifications
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit();
}

$to = "soporte@wifirapidito.com";
$usuario = $_POST['usuario'] ?? 'N/A';
$cedula = $_POST['cedula'] ?? 'N/A';
$id_servicio = $_POST['id_servicio'] ?? 'N/A';
$asunto = $_POST['asunto'] ?? 'Sin Asunto';
$departamento = $_POST['departamento'] ?? 'N/A';
$descripcion = $_POST['descripcion'] ?? 'Sin descripción';
$prioridad = $_POST['prioridad'] ?? 'media';

$subject = "NUEVO TICKET SOPORTE: " . $asunto . " - CP " . $cedula;

$boundary = md5(time());
$headers = "From: noreply@wifirapidito.com\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n";

$message = "--$boundary\r\n";
$message .= "Content-Type: text/html; charset=UTF-8\r\n";
$message .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
$message .= "<html><body style='font-family: sans-serif; color: #333;'>";
$message .= "<h2 style='color: #2563eb;'>Nuevo Ticket de Soporte Recibido</h2>";
$message .= "<hr style='border: 1px solid #eee;'>";
$message .= "<p><strong>Cliente:</strong> $usuario</p>";
$message .= "<p><strong>ID Servicio / Cédula:</strong> $id_servicio / $cedula</p>";
$message .= "<p><strong>Departamento:</strong> $departamento</p>";
$message .= "<p><strong>Prioridad:</strong> <span style='color: " . ($prioridad == 'alta' ? 'red' : 'orange') . "; font-weight: bold;'>" . strtoupper($prioridad) . "</span></p>";
$message .= "<p style='background: #f8fafc; padding: 15px; border-left: 4px solid #3b82f6;'><strong>Descripción:</strong><br>$descripcion</p>";
$message .= "<hr style='border: 1px solid #eee;'>";
$message .= "</body></html>\r\n";

// Attachment
if (isset($_FILES['archivo']) && $_FILES['archivo']['error'] == UPLOAD_ERR_OK) {
    $file_tmp = $_FILES['archivo']['tmp_name'];
    $file_name = $_FILES['archivo']['name'];
    $file_size = $_FILES['archivo']['size'];
    $file_type = $_FILES['archivo']['type'];

    $handle = fopen($file_tmp, "r");
    $content = fread($handle, $file_size);
    fclose($handle);
    $encoded_content = chunk_split(base64_encode($content));

    $message .= "--$boundary\r\n";
    $message .= "Content-Type: $file_type; name=\"$file_name\"\r\n";
    $message .= "Content-Disposition: attachment; filename=\"$file_name\"\r\n";
    $message .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $message .= $encoded_content . "\r\n";
}

$message .= "--$boundary--";

if (mail($to, $subject, $message, $headers)) {
    echo json_encode(["success" => true]);
} else {
    http_response_code(500);
    echo json_encode(["error" => "Email failed"]);
}
?>
