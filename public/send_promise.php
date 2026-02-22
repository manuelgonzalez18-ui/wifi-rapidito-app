<?php
// send_promise.php - Handles Payment Promise requests via email
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit();
}

$to = "admin@wifirapidito.com";
$subject = "Nueva Solicitud de Promesa de Pago - Wifi Rapidito";

// Form Data
$usuario = $_POST['usuario'] ?? 'N/A';
$telefono = $_POST['telefono'] ?? 'N/A';
$tipo = $_POST['tipo'] ?? 'N/A';
$fecha = $_POST['fecha'] ?? 'N/A';

// Boundary for multipart email
$boundary = md5(time());

// Headers
$headers = "From: noreply@wifirapidito.com\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n";

// Message body
$message = "--$boundary\r\n";
$message .= "Content-Type: text/html; charset=UTF-8\r\n";
$message .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
$message .= "<html><body>";
$message .= "<h2>Nueva Solicitud de Promesa de Pago</h2>";
$message .= "<p><strong>Usuario:</strong> $usuario</p>";
$message .= "<p><strong>Teléfono:</strong> $telefono</p>";
$message .= "<p><strong>Tipo:</strong> $tipo</p>";
$message .= "<p><strong>Fecha de Promesa:</strong> $fecha</p>";
$message .= "</body></html>\r\n";

// Attachment
if (isset($_FILES['comprobante']) && $_FILES['comprobante']['error'] == UPLOAD_ERR_OK) {
    $file_tmp = $_FILES['comprobante']['tmp_name'];
    $file_name = $_FILES['comprobante']['name'];
    $file_size = $_FILES['comprobante']['size'];
    $file_type = $_FILES['comprobante']['type'];

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

// Send email
if (mail($to, $subject, $message, $headers)) {
    echo json_encode(["success" => true, "message" => "Solicitud enviada con éxito"]);
} else {
    http_response_code(500);
    echo json_encode(["error" => "Error al enviar el correo"]);
}
?>
