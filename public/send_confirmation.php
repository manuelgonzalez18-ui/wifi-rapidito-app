<?php
// send_confirmation.php - Handles Payment Confirmations (Promise Fulfilled)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Metodo no permitido"]);
    exit();
}

// DESTINATARIO
$to = "admin@wifirapidito.com";
$subject = "✅ CONFIRMACIÓN DE PAGO (Promesa Cumplida) - " . ($_POST['usuario'] ?? 'Cliente');

// DATOS DEL FORMULARIO
$usuario = $_POST['usuario'] ?? 'N/A';
$cedula = $_POST['cedula'] ?? 'N/A';
$telefono = $_POST['telefono'] ?? 'N/A';
$comentario = $_POST['comentario'] ?? 'Sin comentarios adicionales';

// BOUNDARY PARA MULTIPART
$boundary = md5(time());
$headers = "From: sistema@wifirapidito.com\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n";

// MENSAJE HTML
$message = "--$boundary\r\n";
$message .= "Content-Type: text/html; charset=UTF-8\r\n";
$message .= "Content-Transfer-Encoding: 7bit\r\n\r\n";

$body = "
<html>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
    <div style='max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; border-top: 5px solid #10b981;'>
        <h2 style='color: #10b981;'>Reporte: Promesa de Pago Cumplida</h2>
        <hr style='border: 0; border-top: 1px solid #eee;'>
        <p>Un cliente ha reportado el pago de su promesa pendiente.</p>
        <div style='background: #f9fafb; padding: 15px; border-radius: 8px;'>
            <p style='margin: 5px 0;'><strong>Cliente:</strong> $usuario</p>
            <p style='margin: 5px 0;'><strong>Cédula:</strong> $cedula</p>
            <p style='margin: 5px 0;'><strong>Teléfono:</strong> $telefono</p>
            <p style='margin: 5px 0;'><strong>Comentario:</strong><br> <i style='color: #666;'>$comentario</i></p>
        </div>
        <p style='margin-top: 20px; font-size: 12px; color: #999;'>Este reporte se envió automáticamente desde el portal de abonados Wifi Rapidito.</p>
    </div>
</body>
</html>\r\n";

$message .= $body;

// PROCESAMIENTO DE ADJUNTO
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

// ENVÍO
if (mail($to, $subject, $message, $headers)) {
    echo json_encode(["success" => true, "message" => "Confirmacion enviada con éxito. Admin procesará su pago."]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Error al enviar el reporte por correo"]);
}
?>
