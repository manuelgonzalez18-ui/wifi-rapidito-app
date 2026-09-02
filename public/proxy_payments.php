<?php
/**
 * proxy_payments.php - Validación Banesco + registro automático en WispHub.
 * Unifica portal de autogestión y asistente virtual.
 */

error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function payment_respond($status, $payload) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['health'])) {
    payment_respond(200, ['status' => 'ready', 'version' => '4.1-wisphub-register-fix']);
}

require_once __DIR__ . '/config_wisphub.php';
require_once __DIR__ . '/payment_registry_lib.php';

const FORMAS_PAGO_MAP = [
    'transferencia' => 16749,
    'efectivo' => 16748,
];

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

class DuplicatePaymentReferenceException extends RuntimeException {
    public $existing;
    public function __construct($existing = null) {
        parent::__construct('Esta referencia de pago ya fue utilizada y no puede reportarse nuevamente.');
        $this->existing = is_array($existing) ? $existing : [];
    }
}

function payment_source() {
    $explicit = strtolower(trim((string) ($_POST['channel'] ?? $_POST['source'] ?? '')));
    if (in_array($explicit, ['assistant_virtual', 'portal_autogestion'], true)) return $explicit;
    $ua = strtolower((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''));
    if (str_contains($ua, 'python-httpx') || str_contains($ua, 'python-requests')) return 'assistant_virtual';
    return 'portal_autogestion';
}

function payment_clean_text($value, $max = 200) {
    $text = trim((string) $value);
    return function_exists('mb_substr') ? mb_substr($text, 0, $max) : substr($text, 0, $max);
}

function payment_wisphub_message($data, $fallback) {
    if (!is_array($data)) return $fallback;
    foreach (['detail', 'message', 'error'] as $key) {
        if (isset($data[$key]) && is_scalar($data[$key]) && trim((string) $data[$key]) !== '') {
            return payment_clean_text($data[$key], 400);
        }
    }
    foreach (['errors', 'messages'] as $key) {
        if (!isset($data[$key])) continue;
        $value = $data[$key];
        if (is_scalar($value) && trim((string) $value) !== '') return payment_clean_text($value, 400);
        if (is_array($value)) {
            $flat = [];
            array_walk_recursive($value, function ($item) use (&$flat) {
                if (is_scalar($item) && trim((string) $item) !== '') $flat[] = trim((string) $item);
            });
            if ($flat) return payment_clean_text(implode(' | ', array_slice($flat, 0, 4)), 400);
        }
    }
    return $fallback;
}

function payment_banesco_options($datos, $montoEnviado) {
    $bankId = payment_clean_text($_POST['bankId'] ?? $_POST['banco_origen'] ?? '', 40);
    $phoneNum = payment_clean_text($_POST['phoneNum'] ?? $_POST['phone_emisor'] ?? '', 40);

    // Los pagos Banesco -> Banesco no siempre traen selector de banco.
    if ($bankId === '') $bankId = '0134';

    $options = [
        'amount' => (float) $montoEnviado,
        'paymentDate' => $datos['fecha_pago'],
        'payment_date' => $datos['fecha_pago'],
        'bankId' => $bankId,
        'banco_origen' => $bankId,
    ];
    if ($phoneNum !== '') {
        $options['phoneNum'] = $phoneNum;
        $options['phone_emisor'] = $phoneNum;
    }
    return $options;
}

function obtenerFacturaWispHub($facturaId) {
    $url = rtrim(WISPHUB_API_URL, '/') . '/facturas/' . rawurlencode((string) $facturaId) . '/';
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_HTTPHEADER => [
            'Authorization: Api-Key ' . WISPHUB_TOKEN,
            'Accept: application/json',
        ],
    ]);
    $response = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response === false || $curlError) {
        throw new RuntimeException('No se pudo consultar la factura en WispHub.');
    }
    $data = json_decode((string) $response, true);
    if ($httpCode < 200 || $httpCode >= 300 || !is_array($data)) {
        throw new RuntimeException(payment_wisphub_message($data, 'WispHub no encontró la factura indicada.'));
    }
    return $data;
}

function registrarPagoAutorizado($facturaId, $referencia, $fechaPago, $formaPago, $totalFactura) {
    // Ruta oficial WispHub: /facturas/{id_factura}/registrar-pago/
    $url = rtrim(WISPHUB_API_URL, '/') . '/facturas/' . rawurlencode((string) $facturaId) . '/registrar-pago/';
    $payload = [
        'referencia' => $referencia,
        'fecha_pago' => $fechaPago,
        // WispHub espera el total de la factura en su moneda, NO el monto Bs.
        'total_cobrado' => (float) $totalFactura,
        'accion' => 1,
        'forma_pago' => (int) $formaPago,
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => [
            'Authorization: Api-Key ' . WISPHUB_TOKEN,
            'Content-Type: application/json',
            'Accept: application/json',
        ],
    ]);

    $response = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response === false || $curlError) {
        throw new RuntimeException('Error de conexión con WispHub al registrar el pago.');
    }

    $data = json_decode((string) $response, true);
    if ($httpCode < 200 || $httpCode >= 300) {
        throw new RuntimeException(payment_wisphub_message($data, 'WispHub no pudo registrar el pago.'));
    }

    return [
        'success' => true,
        'task_id' => is_array($data) ? ($data['task_id'] ?? null) : null,
        'messages' => is_array($data) ? ($data['messages'] ?? []) : [],
    ];
}

function reportarPago($datos, $archivo = null) {
    $url = rtrim(WISPHUB_API_URL, '/') . '/facturas/reportar-pago/' . rawurlencode((string) $datos['factura_id']) . '/';
    $postFields = [
        'forma_pago' => (string) $datos['forma_pago'],
        'fecha_pago' => $datos['fecha_pago'],
        'referencia' => $datos['referencia'],
        'comprobante_pago' => $datos['comprobante_texto'],
        'nombre_user' => $datos['nombre_usuario'],
    ];
    if ($archivo && file_exists($archivo['tmp_name'])) {
        $postFields['comprobante_pago_archivo'] = new CURLFile($archivo['tmp_name'], $archivo['type'], $archivo['name']);
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $postFields,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => [
            'Authorization: Api-Key ' . WISPHUB_TOKEN,
            'Accept: application/json',
        ],
    ]);
    $response = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response === false || $curlError) throw new RuntimeException('Error de conexión con WispHub.');
    $data = json_decode((string) $response, true);
    if ($httpCode < 200 || $httpCode >= 300) {
        throw new RuntimeException(payment_wisphub_message($data, 'WispHub no pudo recibir el reporte de pago.'));
    }
    return [
        'success' => true,
        'task_id' => is_array($data) ? ($data['task_id'] ?? null) : null,
        'messages' => is_array($data) ? ($data['messages'] ?? []) : [],
    ];
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        payment_respond(405, ['status' => 'error', 'message' => 'Método no permitido.']);
    }

    foreach (['invoice_id', 'reference', 'user_name'] as $campo) {
        if (trim((string) ($_POST[$campo] ?? '')) === '') {
            payment_respond(422, ['status' => 'error', 'code' => 'missing_field', 'message' => 'Campo requerido: ' . $campo]);
        }
    }

    $rawFormaPago = $_POST['forma_pago'] ?? '16749';
    if (is_numeric($rawFormaPago)) $formaPagoId = (int) $rawFormaPago;
    elseif (isset(FORMAS_PAGO_MAP[$rawFormaPago])) $formaPagoId = FORMAS_PAGO_MAP[$rawFormaPago];
    else $formaPagoId = 16749;

    $reference = payment_registry_normalize_reference($_POST['reference'] ?? '');
    if ($reference === '') {
        payment_respond(422, ['status' => 'error', 'code' => 'invalid_reference', 'message' => 'Referencia de pago inválida.']);
    }

    $datos = [
        'factura_id' => preg_replace('/[^0-9]/', '', (string) $_POST['invoice_id']),
        'forma_pago' => $formaPagoId,
        'fecha_pago' => payment_clean_text($_POST['payment_date'] ?? date('Y-m-d'), 40),
        'referencia' => $reference,
        'comprobante_texto' => 'Pago reportado desde Wifi Rapidito - Ref: ' . $reference,
        'nombre_usuario' => payment_clean_text($_POST['user_name'], 180),
    ];
    if ($datos['factura_id'] === '') {
        payment_respond(422, ['status' => 'error', 'code' => 'invalid_invoice', 'message' => 'Factura inválida.']);
    }

    if ($formaPagoId === 16749) {
        require_once __DIR__ . '/banesco_api.php';
        $montoEnviado = (float) ($_POST['amount'] ?? 0);
        if ($montoEnviado <= 0) {
            payment_respond(422, [
                'status' => 'error', 'code' => 'invalid_amount', 'wisphub' => false,
                'message' => 'El monto del pago debe ser mayor a cero.',
                'errors' => ['El monto del pago debe ser mayor a cero.'],
            ]);
        }

        $banescoOptions = payment_banesco_options($datos, $montoEnviado);
        $banescoResponse = BanescoAPI::checkTransaction($reference, $banescoOptions);
        if (empty($banescoResponse['success'])) {
            $message = payment_clean_text($banescoResponse['message'] ?? 'No se pudo validar la operación.', 300);
            payment_respond(400, [
                'status' => 'error', 'code' => 'bank_not_verified', 'wisphub' => false,
                'message' => 'Banesco: ' . $message,
                'errors' => ['Banesco: ' . $message],
            ]);
        }

        // Banesco valida el monto en bolívares. WispHub registra la factura por
        // su propio total (USD en la configuración actual), obtenido del servidor.
        $facturaWispHub = obtenerFacturaWispHub($datos['factura_id']);
        $totalFactura = (float) ($facturaWispHub['total'] ?? 0);
        if ($totalFactura <= 0) {
            throw new RuntimeException('WispHub devolvió un total inválido para la factura.');
        }

        $source = payment_source();
        $recordData = [
            'source' => $source,
            'invoice_id' => $datos['factura_id'],
            'client_name' => payment_clean_text($_POST['client_name'] ?? $_POST['user_name'] ?? '', 180),
            'user_name' => $datos['nombre_usuario'],
            'service_id' => payment_clean_text($_POST['service_id'] ?? $_POST['id_servicio'] ?? '', 80),
            'whatsapp' => preg_replace('/\D+/', '', (string) ($_POST['whatsapp'] ?? $_POST['phone'] ?? $_POST['phone_emisor'] ?? '')) ?: '',
            'amount_bs' => round($montoEnviado, 2),
            'invoice_total' => round($totalFactura, 2),
            'payment_date' => $datos['fecha_pago'],
            'payment_method' => payment_clean_text($_POST['payment_method'] ?? $_POST['payment_type_label'] ?? $_POST['payment_type'] ?? 'Transferencia bancaria', 120),
            'origin_bank' => payment_clean_text($_POST['banco_origen'] ?? $_POST['origin_bank'] ?? 'Banesco', 120),
        ];

        $existing = null;
        $claim = payment_registry_claim($reference, $recordData, $existing);
        if (!$claim) throw new DuplicatePaymentReferenceException($existing);

        try {
            $resultado = registrarPagoAutorizado(
                $datos['factura_id'], $reference, $datos['fecha_pago'], $formaPagoId, $totalFactura
            );
        } catch (Throwable $registrationError) {
            payment_registry_mark_registration_error($reference, $claim['id'], $registrationError->getMessage());
            throw $registrationError;
        }

        if (!payment_registry_mark_validated($reference, $claim['id'], [
            'task_id' => $resultado['task_id'] ?? null,
            'messages' => $resultado['messages'] ?? [],
        ])) {
            error_log('Rapidito payment registry: no se pudo finalizar ' . $claim['id']);
        }

        payment_respond(200, [
            'status' => 'success', 'wisphub' => true,
            'task_id' => $resultado['task_id'] ?? null,
            'payment_history_id' => $claim['id'],
            'source' => $source,
            'message' => '¡Pago validado exitosamente por Banesco y registrado!',
            'verificar_en' => 'https://wisphub.app/reporte-de-pagos/',
        ]);
    }

    // Reportes manuales/no automáticos conservan el comportamiento histórico.
    $archivo = null;
    if (isset($_FILES['comprobante_pago_archivo']) && $_FILES['comprobante_pago_archivo']['error'] === UPLOAD_ERR_OK) {
        $f = $_FILES['comprobante_pago_archivo'];
        if ($f['size'] > 10 * 1024 * 1024) throw new RuntimeException('El archivo no debe superar los 10MB');
        if (!in_array($f['type'], MIME_TYPES, true)) {
            throw new RuntimeException('Tipo de archivo no permitido. Use: JPG, PNG, PDF, GIF, DOC, DOCX, HEIF');
        }
        $archivo = $f;
    }
    if (!$archivo) throw new RuntimeException('El comprobante de pago (imagen/PDF) es obligatorio');

    $resultado = reportarPago($datos, $archivo);
    payment_respond(200, [
        'status' => 'success', 'wisphub' => true,
        'task_id' => $resultado['task_id'] ?? null,
        'message' => 'Pago reportado correctamente en WispHub',
        'verificar_en' => 'https://wisphub.app/reporte-de-pagos/',
    ]);

} catch (DuplicatePaymentReferenceException $e) {
    payment_respond(409, [
        'status' => 'error', 'code' => 'duplicate_reference', 'wisphub' => false,
        'message' => $e->getMessage(), 'errors' => [$e->getMessage()],
    ]);
} catch (Throwable $e) {
    payment_respond(400, [
        'status' => 'error', 'code' => 'payment_error', 'wisphub' => false,
        'message' => payment_clean_text($e->getMessage(), 400),
        'errors' => [payment_clean_text($e->getMessage(), 400)],
    ]);
}
?>