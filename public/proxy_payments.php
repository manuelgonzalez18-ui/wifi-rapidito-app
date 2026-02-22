<?php
/**
 * proxy_payments.php - Proxy para Reportar Pagos a WispHub
 * Endpoint: POST /api/facturas/reportar-pago/{id}/
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── CONFIGURACIÓN ──────────────────────────────────────────
define('WISPHUB_API_KEY', 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s');
define('WISPHUB_API_URL', 'https://api.wisphub.app/api/facturas/reportar-pago/');

// Mapa forma_pago: el frontend envía el ID numérico directamente
// 16749 = Transferencia Bancaria, 16748 = Efectivo
// También aceptamos strings 'transferencia'/'efectivo' como fallback
const FORMAS_PAGO_MAP = [
    'transferencia' => 16749,
    'efectivo'      => 16748,
];

// MIME types permitidos por WispHub
const MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/heif',
    'image/heic',
];

// ── FUNCIÓN PRINCIPAL ──────────────────────────────────────
function reportarPago($datos, $archivo = null) {
    $url = WISPHUB_API_URL . $datos['factura_id'] . '/';

    $postFields = [
        'forma_pago'       => (string)$datos['forma_pago'],
        'fecha_pago'       => $datos['fecha_pago'],
        'referencia'       => $datos['referencia'],
        'comprobante_pago' => $datos['comprobante_texto'],
        'nombre_user'      => $datos['nombre_usuario'],
    ];

    if ($archivo && file_exists($archivo['tmp_name'])) {
        $postFields['comprobante_pago_archivo'] = new CURLFile(
            $archivo['tmp_name'],
            $archivo['type'],
            $archivo['name']
        );
    }

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $postFields,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Api-Key ' . WISPHUB_API_KEY,
            'Accept: application/json',
        ],
    ]);

    $response  = curl_exec($ch);
    $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        throw new Exception("Error de conexión: $curlError");
    }

    $data = json_decode($response, true);

    if ($httpCode !== 200) {
        $msg = $data['detail'] ?? (is_array($data['errors'] ?? null) ? $data['errors'][0] : null) ?? "Error HTTP $httpCode: $response";
        throw new Exception($msg);
    }

    return [
        'success'  => true,
        'task_id'  => $data['task_id'] ?? null,
        'messages' => $data['messages'] ?? [],
    ];
}

// ── ENDPOINT ───────────────────────────────────────────────
try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método no permitido');
    }

    // Campos requeridos que envía PaymentReport.jsx
    $requeridos = ['invoice_id', 'reference', 'user_name'];
    foreach ($requeridos as $campo) {
        if (empty($_POST[$campo])) {
            throw new Exception("Campo requerido: $campo");
        }
    }

    // Resolver forma_pago: puede venir como número (16749) o string (transferencia)
    $rawFormaPago = $_POST['forma_pago'] ?? '16749';
    if (is_numeric($rawFormaPago)) {
        $formaPagoId = (int)$rawFormaPago;
    } elseif (isset(FORMAS_PAGO_MAP[$rawFormaPago])) {
        $formaPagoId = FORMAS_PAGO_MAP[$rawFormaPago];
    } else {
        $formaPagoId = 16749; // default: transferencia
    }

    // Fecha: el frontend envía "2026-02-21 22:10"
    $fechaPago = $_POST['payment_date'] ?? date('Y-m-d');

    $datos = [
        'factura_id'      => preg_replace('/[^0-9]/', '', $_POST['invoice_id']),
        'forma_pago'      => $formaPagoId,
        'fecha_pago'      => $fechaPago,
        'referencia'      => substr(trim($_POST['reference']), 0, 100),
        'comprobante_texto' => 'Pago reportado desde portal Wifi Rapidito - Ref: ' . trim($_POST['reference']),
        'nombre_usuario'  => trim($_POST['user_name']),
    ];

    // Archivo adjunto
    $archivo = null;
    if (isset($_FILES['comprobante_pago_archivo']) && $_FILES['comprobante_pago_archivo']['error'] === UPLOAD_ERR_OK) {
        $f = $_FILES['comprobante_pago_archivo'];
        if ($f['size'] > 10 * 1024 * 1024) {
            throw new Exception('El archivo no debe superar los 10MB');
        }
        if (!in_array($f['type'], MIME_TYPES)) {
            throw new Exception('Tipo de archivo no permitido. Use: JPG, PNG, PDF, GIF, DOC, DOCX, HEIF');
        }
        $archivo = $f;
    }

    if (!$archivo) {
        throw new Exception('El comprobante de pago (imagen/PDF) es obligatorio');
    }

    $resultado = reportarPago($datos, $archivo);

    echo json_encode([
        'status'       => 'success',
        'wisphub'      => true,
        'task_id'      => $resultado['task_id'],
        'message'      => 'Pago reportado correctamente en WispHub',
        'verificar_en' => 'https://wisphub.app/reporte-de-pagos/',
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'wisphub' => false,
        'message' => $e->getMessage(),
        'errors'  => [$e->getMessage()],
    ]);
}
?>
