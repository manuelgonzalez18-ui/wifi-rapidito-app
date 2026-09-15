<?php
/**
 * proxy_payments.php - Proxy para Reportar Pagos a WispHub
 * Endpoint: POST /api/facturas/reportar-pago/{id}/
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/payment_audit_lib.php';
require_once __DIR__ . '/config_wisphub.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── CONFIGURACIÓN ──────────────────────────────────────────
define('WISPHUB_PAYMENT_API_URL', rtrim(WISPHUB_API_URL, '/') . '/facturas/reportar-pago/');

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

// ── FUNCIÓN VALIDACIÓN AUTOMÁTICA BANESCO ────────────────────
function registrarPagoAutorizado($facturaId, $referencia, $fechaPago, $formaPago, $totalCobrado, $nombreUser) {
    // WispHub OpenAPI: POST /api/facturas/{id_factura}/registrar-pago/
    // El endpoint anterior invertía los segmentos y devolvía HTTP 404.
    $url = 'https://api.wisphub.net/api/facturas/' . rawurlencode((string)$facturaId) . '/registrar-pago/';

    $payload = [
        'referencia'    => $referencia,
        'fecha_pago'    => $fechaPago,
        'total_cobrado' => (float)$totalCobrado,
        'accion'        => 1, // 1 = Registrar pago y activar el servicio
        'forma_pago'    => (int)$formaPago
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Api-Key ' . WISPHUB_TOKEN,
            'Content-Type: application/json',
            'Accept: application/json',
        ],
    ]);

    $response  = curl_exec($ch);
    $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        throw new Exception("Error de conexión WispHub (registrar-pago): $curlError");
    }

    $data = json_decode($response, true);

    if ($httpCode !== 200) {
        $msg = $data['detail'] ?? (is_array($data['errors'] ?? null) ? $data['errors'][0] : null) ?? "Error HTTP $httpCode en registrar-pago";
        throw new Exception($msg);
    }

    return [
        'success'  => true,
        'task_id'  => $data['task_id'] ?? null,
        'messages' => $data['messages'] ?? [],
    ];
}

// ── FUNCIÓN PRINCIPAL ──────────────────────────────────────
function reportarPago($datos, $archivo = null) {
    $url = WISPHUB_PAYMENT_API_URL . $datos['factura_id'] . '/';

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
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Api-Key ' . WISPHUB_TOKEN,
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
        $msg = $data['detail'] ?? (is_array($data['errors'] ?? null) ? $data['errors'][0] : null) ?? "Error HTTP $httpCode";
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

    // --- INTEGRACIÓN BANESCO API ---
    // Si la forma de pago es transferencia (u otra cuenta Banesco vinculada), validamos primero.
    if ($formaPagoId === 16749) {
        require_once __DIR__ . '/banesco_api.php';

        $montoEnviado = $_POST['amount'] ?? 0;
        if (!is_numeric($montoEnviado) || (float)$montoEnviado <= 0) {
            throw new Exception('Monto inválido para validar el pago.');
        }
        $fechaBanesco = substr(trim((string)$datos['fecha_pago']), 0, 10);

        // Pago Móvil Banesco -> Banesco puede no requerir que el usuario elija
        // banco de origen. En ese caso usamos el código Banesco certificado.
        $bankId = preg_replace('/\D+/', '', (string)($_POST['banco_origen'] ?? ''));
        if ($bankId === '') {
            $bankId = '0134';
        } elseif (strlen($bankId) > 4) {
            $bankId = substr($bankId, -4);
        } else {
            $bankId = str_pad($bankId, 4, '0', STR_PAD_LEFT);
        }

        $phoneNum = preg_replace('/\D+/', '', (string)($_POST['phone_emisor'] ?? ''));
        if (strlen($phoneNum) === 11 && str_starts_with($phoneNum, '0')) {
            $phoneNum = '58' . substr($phoneNum, 1);
        } elseif (strlen($phoneNum) === 10) {
            $phoneNum = '58' . $phoneNum;
        }

        $banescoOptions = [
            'amount' => (float)$montoEnviado,
            'paymentDate' => $fechaBanesco,
            'bankId' => $bankId,
        ];
        if ($phoneNum !== '') {
            $banescoOptions['phoneNum'] = $phoneNum;
        }

        // El contrato productivo usa referenceNumber + accountId y no customerIdR/paymentId.
        $banescoResponse = BanescoAPI::checkTransaction(
            $datos['referencia'],
            $banescoOptions
        );

        if (!$banescoResponse['success']) {
            throw new Exception("Banesco: " . $banescoResponse['message']);
        }

        // Banesco OK -> Usamos registrar-pago con accion=1
        $resultado = registrarPagoAutorizado(
             $datos['factura_id'],
             $datos['referencia'],
             $datos['fecha_pago'],
             $datos['forma_pago'],
             $montoEnviado,
             $datos['nombre_usuario']
        );

        $paymentTypeLabel = trim((string)($_POST['payment_type_label'] ?? ''));
        $bankName = trim((string)($_POST['banco_origen_nombre'] ?? ''));
        if ($bankName === '' && $bankId === '0134') {
            $bankName = 'Banesco';
        }

        appendPaymentAudit([
            'source' => 'portal',
            'client_name' => trim((string)($_POST['client_name'] ?? $datos['nombre_usuario'])),
            'username' => trim((string)($_POST['username'] ?? $datos['nombre_usuario'])),
            'client_id' => trim((string)($_POST['client_id'] ?? '')),
            'client_document' => trim((string)($_POST['client_document'] ?? '')),
            'client_phone' => trim((string)($_POST['client_phone'] ?? ($_POST['phone'] ?? ''))),
            'client_email' => trim((string)($_POST['client_email'] ?? '')),
            'service_id' => trim((string)($_POST['id_servicio'] ?? '')),
            'invoice_id' => $datos['factura_id'],
            'payment_id' => trim((string)($_POST['payment_id'] ?? '')),
            'reference' => $datos['referencia'],
            'amount' => $montoEnviado,
            'currency' => 'VES',
            'payment_date' => $datos['fecha_pago'],
            'payment_time' => trim((string)($_POST['payment_time'] ?? '')),
            'payment_type' => trim((string)($_POST['payment_type'] ?? '')),
            'payment_type_label' => $paymentTypeLabel,
            'method' => $paymentTypeLabel !== '' ? $paymentTypeLabel : 'Transferencia Banesco',
            'bank_id' => $bankId,
            'bank_name' => $bankName,
            'payer_phone' => trim((string)($_POST['phone_emisor'] ?? '')),
            'banesco_status' => 'validated',
            'banesco_reference' => trim((string)($banescoResponse['refNum'] ?? $datos['referencia'])),
            'banesco_amount' => is_numeric($banescoResponse['amount'] ?? null) ? (float)$banescoResponse['amount'] : (float)$montoEnviado,
            'banesco_date' => trim((string)($banescoResponse['date'] ?? '')),
            'banesco_concept' => trim((string)($banescoResponse['concept'] ?? '')),
            'wisphub_status' => 'registered',
            'wisphub_task_id' => $resultado['task_id'] ?? '',
        ]);

        echo json_encode([
            'status'       => 'success',
            'wisphub'      => true,
            'task_id'      => $resultado['task_id'] ?? null,
            'message'      => '¡Pago validado exitosamente por Banesco y registrado!',
            'verificar_en' => 'https://wisphub.app/reporte-de-pagos/',
        ]);
        exit;
    }
    // --- FIN INTEGRACIÓN BANESCO ---

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
