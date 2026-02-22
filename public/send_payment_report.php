<?php
// send_payment_report.php - Custom Payment Reporter for Wifi Rapidito
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $to = "admin@wifirapidito.com";
    $subject = "NUEVO REPORTE DE PAGO - " . $_POST['user_name'];
    
    $name = $_POST['user_name'];
    $phone = $_POST['phone'];
    $invoice_id = $_POST['invoice_id'] ?: 'No especificada';
    $amount = $_POST['amount'];
    $bank = $_POST['bank'];
    $reference = $_POST['reference'];
    $date = $_POST['payment_date'];

    $boundary = md5(time());
    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "From: sistema@wifirapidito.com\r\n";
    $headers .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n";

    $message = "--$boundary\r\n";
    $message .= "Content-Type: text/html; charset=UTF-8\r\n";
    $message .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
    
    $body = "
    <html>
    <body style='font-family: sans-serif; background: #f4f4f4; padding: 20px;'>
        <div style='background: #ffffff; padding: 30px; border-radius: 10px; border: 2px solid #00f3ff;'>
            <h2 style='color: #0088cc;'>NUEVO REPORTE DE PAGO RECEPTADO</h2>
            <hr>
            <p><strong>Cliente:</strong> $name</p>
            <p><strong>Teléfono:</strong> $phone</p>
            <p><strong>Factura #:</strong> $invoice_id</p>
            <p><strong>Monto:</strong> $$amount</p>
            <p><strong>Banco/Plataforma:</strong> $bank</p>
            <p><strong>Referencia:</strong> $reference</p>
            <p><strong>Fecha de Pago:</strong> $date</p>
            <hr>
            <p style='color: #666;'>Este reporte fue enviado desde el portal de abonados de Wifi Rapidito.</p>
        </div>
    </body>
    </html>";
    
    $message .= $body . "\r\n";

    // Attachment processing
    if (isset($_FILES['attachment']) && $_FILES['attachment']['error'] == UPLOAD_ERR_OK) {
        $file_name = $_FILES['attachment']['name'];
        $file_size = $_FILES['attachment']['size'];
        $file_tmp = $_FILES['attachment']['tmp_name'];
        $file_type = $_FILES['attachment']['type'];
        
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
        
        // --- WISPHUB INTEGRATION: CREATE TICKET ---
        $api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
        $ticket_url = 'https://api.wisphub.app/api/tickets/';

        $ticket_data = [
            'id_servicio' => $_POST['id_servicio'] ?? '', // Required
            'asunto' => 'REPORTE DE PAGO RECEPTADO',
            'descripcion' => "Cliente: $name\nTel: $phone\nFactura: $invoice_id\nMonto: $$amount\nRef: $reference\nBanco: $bank\nFecha: $date\nComentario: " . ($_POST['comentario'] ?? ''),
            'prioridad' => 'Alta',
            'departamento' => 'Finanzas' // Adjust if needed
        ];

        // Handle File for Wisphub
        if (isset($_FILES['attachment']) && $_FILES['attachment']['error'] == UPLOAD_ERR_OK) {
            $ticket_data['archivo'] = new CURLFile(
                $_FILES['attachment']['tmp_name'],
                $_FILES['attachment']['type'],
                $_FILES['attachment']['name']
            );
        }

        if (!empty($ticket_data['id_servicio'])) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $ticket_url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $ticket_data);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
            // curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Enable if issues
            $res = curl_exec($ch);
            curl_close($ch);
            // We don't fail if ticket fails, just log or ignore
        }
        // ------------------------------------------

        echo json_encode(["status" => "success", "message" => "Reporte enviado con éxito. Administracion procesará su pago pronto."]);
    } else {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Error al enviar el correo"]);
    }
} else {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Metodo no permitido"]);
}
?>
