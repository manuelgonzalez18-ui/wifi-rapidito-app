<?php
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');

define('VALIDATED_PAYMENTS_VERSION', '1.0-real-client-payment-details');

function vpRespond($status, $payload) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['health'])) {
    vpRespond(200, [
        'status' => 'ready',
        'version' => VALIDATED_PAYMENTS_VERSION,
    ]);
}

require_once __DIR__ . '/payment_audit_lib.php';
require_once __DIR__ . '/config_wisphub.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    vpRespond(405, ['error' => 'Método no permitido.']);
}

$secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
session_name('wifi_rapidito_staff');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => $secure,
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_start();

if (empty($_SESSION['staff_authenticated'])) {
    vpRespond(401, ['error' => 'Sesión de personal requerida.']);
}
$permissions = is_array($_SESSION['staff_permissions'] ?? null) ? $_SESSION['staff_permissions'] : [];
if (!in_array('*', $permissions, true) && !in_array('finance', $permissions, true)) {
    vpRespond(403, ['error' => 'Tu cuenta no tiene permiso para consultar pagos validados.']);
}

function vpScalar($value, $keys = []) {
    if (is_array($value)) {
        foreach ($keys as $key) {
            if (isset($value[$key]) && $value[$key] !== '' && $value[$key] !== null) return trim((string)$value[$key]);
        }
        foreach (['nombre', 'name', 'usuario_portal', 'usuario', 'username', 'id', 'id_cliente', 'id_factura', 'id_servicio', 'id_pago'] as $key) {
            if (isset($value[$key]) && $value[$key] !== '' && $value[$key] !== null) return trim((string)$value[$key]);
        }
        return '';
    }
    return is_scalar($value) ? trim((string)$value) : '';
}

function vpTimestamp($row) {
    if (!is_array($row)) return false;
    foreach (['payment_date', 'created_at', 'fecha_pago', 'fecha', 'fecha_registro'] as $key) {
        $value = $row[$key] ?? '';
        if ($value === null || $value === '') continue;
        $ts = strtotime((string)$value);
        if ($ts !== false) return $ts;
    }
    return false;
}

function vpServiceId($row) {
    if (!is_array($row)) return '';
    foreach (['id_servicio', 'servicio_id'] as $key) {
        if (isset($row[$key]) && $row[$key] !== '') return trim((string)$row[$key]);
    }
    $service = $row['servicio'] ?? null;
    $id = vpScalar($service, ['id_servicio', 'id']);
    if ($id !== '') return $id;
    $articles = is_array($row['articulos'] ?? null) ? $row['articulos'] : [];
    foreach ($articles as $article) {
        if (!is_array($article)) continue;
        foreach (['id_servicio', 'servicio_id'] as $key) {
            if (isset($article[$key]) && $article[$key] !== '') return trim((string)$article[$key]);
        }
        $id = vpScalar($article['servicio'] ?? null, ['id_servicio', 'id']);
        if ($id !== '') return $id;
    }
    return '';
}

function vpFetchJson($url) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Api-Key ' . WISPHUB_TOKEN,
            'Accept: application/json',
        ],
        CURLOPT_CONNECTTIMEOUT => 6,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_ENCODING => '',
    ]);

    $body = curl_exec($ch);
    $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $errno = curl_errno($ch);
    $error = curl_error($ch);
    curl_close($ch);

    if ($errno !== 0 || $httpCode < 200 || $httpCode >= 300 || !$body) {
        return ['ok' => false, 'data' => null, 'error' => $error !== '' ? $error : ('HTTP ' . $httpCode)];
    }

    $data = json_decode($body, true);
    if (!is_array($data)) return ['ok' => false, 'data' => null, 'error' => 'Respuesta JSON inválida'];
    return ['ok' => true, 'data' => $data, 'error' => ''];
}

function vpPaidPage($offset, $limit, $fromDate, $toDate, $useDateRange) {
    $bases = array_values(array_unique([
        'https://api.wisphub.net/api',
        rtrim(WISPHUB_API_URL, '/'),
    ]));
    $params = [
        'estado' => 2,
        'limit' => (int)$limit,
        'offset' => (int)$offset,
    ];
    if ($useDateRange) {
        $params['fecha_pago__range_0'] = $fromDate;
        $params['fecha_pago__range_1'] = $toDate;
    }

    $lastError = 'No fue posible consultar WispHub.';
    foreach ($bases as $base) {
        $result = vpFetchJson(rtrim($base, '/') . '/facturas/?' . http_build_query($params));
        if ($result['ok']) return ['data' => $result['data'], 'base' => $base, 'error' => ''];
        $lastError = $result['error'] ?? $lastError;
    }
    return ['data' => null, 'base' => '', 'error' => $lastError];
}

function vpRecentRegisteredPayments($days, &$diagnostic) {
    $days = max(1, (int)$days);
    $fromDate = date('Y-m-d', strtotime('-' . $days . ' days'));
    $toDate = date('Y-m-d');
    $cutoff = strtotime($fromDate . ' 00:00:00');
    $pageSize = 300;
    $offset = 0;
    $useDateRange = true;
    $out = [];

    $diagnostic = [
        'status' => 'ok',
        'source' => 'facturas-date-range',
        'pages' => 0,
        'matched_candidates' => 0,
        'error' => '',
    ];

    for ($page = 0; $page < 20; $page++) {
        $pageResult = vpPaidPage($offset, $pageSize, $fromDate, $toDate, $useDateRange);
        $data = $pageResult['data'];
        if ($data === null) {
            if ($page === 0) {
                $diagnostic['status'] = 'error';
                $diagnostic['error'] = $pageResult['error'];
            }
            break;
        }
        $diagnostic['pages']++;
        $rows = is_array($data['results'] ?? null) ? $data['results'] : (array_is_list($data) ? $data : []);

        if (!$rows && $page === 0 && $useDateRange) {
            $useDateRange = false;
            $diagnostic['source'] = 'facturas-paid-local-date-filter';
            $diagnostic['pages'] = 0;
            $pageResult = vpPaidPage(0, $pageSize, $fromDate, $toDate, false);
            $data = $pageResult['data'];
            if ($data === null) {
                $diagnostic['status'] = 'error';
                $diagnostic['error'] = $pageResult['error'];
                break;
            }
            $diagnostic['pages'] = 1;
            $rows = is_array($data['results'] ?? null) ? $data['results'] : (array_is_list($data) ? $data : []);
        }

        if (!$rows) break;

        foreach ($rows as $row) {
            if (!is_array($row)) continue;
            $dateRaw = $row['fecha_pago'] ?? $row['fecha_registro'] ?? '';
            $ts = $dateRaw ? strtotime((string)$dateRaw) : false;
            if ($ts === false || $ts < $cutoff) continue;

            $client = $row['cliente'] ?? $row['client'] ?? $row['usuario'] ?? $row['user'] ?? '';
            $method = $row['forma_pago'] ?? $row['metodo_pago'] ?? $row['payment_method'] ?? '';
            $amount = $row['total_cobrado'] ?? $row['monto'] ?? $row['cantidad'] ?? $row['total'] ?? $row['importe'] ?? null;

            $clientName = vpScalar($client, ['nombre', 'name', 'cliente', 'razon_social']);
            if ($clientName === '') $clientName = trim((string)($row['nombre_cliente'] ?? $row['cliente_nombre'] ?? $row['nombre'] ?? ''));
            $username = vpScalar($client, ['usuario_portal', 'usuario', 'username']);
            if ($username === '') $username = trim((string)($row['usuario_portal'] ?? $row['usuario'] ?? ''));

            $document = vpScalar($client, ['cedula', 'documento', 'rif']);
            if ($document === '') $document = trim((string)($row['cedula_cliente'] ?? $row['documento_cliente'] ?? $row['cedula'] ?? ''));

            $phone = vpScalar($client, ['telefono', 'phone', 'movil', 'celular']);
            if ($phone === '') $phone = trim((string)($row['telefono_cliente'] ?? $row['telefono'] ?? $row['celular'] ?? ''));

            $email = vpScalar($client, ['correo', 'email']);
            if ($email === '') $email = trim((string)($row['correo_cliente'] ?? $row['email'] ?? $row['correo'] ?? ''));

            $clientId = trim((string)($row['id_cliente'] ?? ''));
            if ($clientId === '') $clientId = vpScalar($client, ['id_cliente', 'id']);

            $out[] = [
                'payment_id' => trim((string)($row['id_pago'] ?? '')),
                'client_name' => $clientName,
                'username' => $username,
                'client_id' => $clientId,
                'client_document' => $document,
                'client_phone' => $phone,
                'client_email' => $email,
                'service_id' => vpServiceId($row),
                'invoice_id' => trim((string)($row['id_factura'] ?? $row['folio'] ?? $row['id'] ?? '')),
                'reference' => trim((string)($row['referencia'] ?? $row['reference'] ?? $row['numero_referencia'] ?? $row['nro_referencia'] ?? '')),
                'amount' => is_numeric($amount) ? (float)$amount : null,
                'currency' => 'VES',
                'payment_date' => date('Y-m-d', $ts),
                'registered_method' => vpScalar($method, ['nombre', 'name']),
            ];
        }

        $received = count($rows);
        $offset += $received;
        $count = isset($data['count']) && is_numeric($data['count']) ? (int)$data['count'] : null;
        if ($received < $pageSize) break;
        if ($count !== null && $offset >= $count) break;
        if ($count === null && empty($data['next'])) break;
    }

    $diagnostic['matched_candidates'] = count($out);
    return $out;
}

function vpTextKey($value) {
    return strtolower(trim((string)$value));
}

function vpDateKey($value) {
    return substr(trim((string)$value), 0, 10);
}

function vpAmountKey($value) {
    return is_numeric($value) ? number_format((float)$value, 2, '.', '') : '';
}

function vpPickCandidate($payment, $candidates) {
    $paymentId = vpTextKey($payment['payment_id'] ?? '');
    if ($paymentId !== '') {
        foreach ($candidates as $candidate) {
            if (vpTextKey($candidate['payment_id'] ?? '') === $paymentId) return $candidate;
        }
    }

    $invoiceId = vpTextKey($payment['invoice_id'] ?? '');
    if ($invoiceId !== '') {
        $matches = array_values(array_filter($candidates, fn($row) => vpTextKey($row['invoice_id'] ?? '') === $invoiceId));
        if (count($matches) === 1) return $matches[0];
        if (count($matches) > 1) {
            $reference = vpTextKey($payment['reference'] ?? '');
            foreach ($matches as $candidate) {
                if ($reference !== '' && vpTextKey($candidate['reference'] ?? '') === $reference) return $candidate;
            }
            $day = vpDateKey($payment['payment_date'] ?? $payment['created_at'] ?? '');
            $amount = vpAmountKey($payment['amount'] ?? null);
            $narrowed = array_values(array_filter($matches, function($row) use ($day, $amount) {
                return ($day === '' || vpDateKey($row['payment_date'] ?? '') === $day)
                    && ($amount === '' || vpAmountKey($row['amount'] ?? null) === $amount);
            }));
            if (count($narrowed) === 1) return $narrowed[0];
        }
    }

    $reference = vpTextKey($payment['reference'] ?? '');
    if ($reference !== '') {
        $matches = array_values(array_filter($candidates, fn($row) => vpTextKey($row['reference'] ?? '') === $reference));
        if (count($matches) === 1) return $matches[0];
        if (count($matches) > 1) {
            $day = vpDateKey($payment['payment_date'] ?? $payment['created_at'] ?? '');
            $amount = vpAmountKey($payment['amount'] ?? null);
            $narrowed = array_values(array_filter($matches, function($row) use ($day, $amount) {
                return ($day === '' || vpDateKey($row['payment_date'] ?? '') === $day)
                    && ($amount === '' || vpAmountKey($row['amount'] ?? null) === $amount);
            }));
            if (count($narrowed) === 1) return $narrowed[0];
        }
    }

    $day = vpDateKey($payment['payment_date'] ?? $payment['created_at'] ?? '');
    $amount = vpAmountKey($payment['amount'] ?? null);
    if ($day !== '' && $amount !== '') {
        $matches = array_values(array_filter($candidates, fn($row) => vpDateKey($row['payment_date'] ?? '') === $day && vpAmountKey($row['amount'] ?? null) === $amount));
        if (count($matches) === 1) return $matches[0];
        $serviceId = vpTextKey($payment['service_id'] ?? '');
        if ($serviceId !== '') {
            $byService = array_values(array_filter($matches, fn($row) => vpTextKey($row['service_id'] ?? '') === $serviceId));
            if (count($byService) === 1) return $byService[0];
        }
    }

    return null;
}

function vpEnrich($payment, $candidate) {
    if (!is_array($candidate)) return $payment;

    foreach (['client_name', 'username', 'client_id', 'client_document', 'client_phone', 'client_email'] as $field) {
        if (!empty($candidate[$field])) $payment[$field] = $candidate[$field];
    }
    foreach (['service_id', 'invoice_id', 'payment_id', 'reference', 'currency', 'payment_date'] as $field) {
        if (empty($payment[$field]) && !empty($candidate[$field])) $payment[$field] = $candidate[$field];
    }
    if ((!isset($payment['amount']) || $payment['amount'] === null || $payment['amount'] === '') && isset($candidate['amount'])) {
        $payment['amount'] = $candidate['amount'];
    }

    $payment['registered_method'] = $candidate['registered_method'] ?? '';
    if ((empty($payment['payment_type_label']) || stripos((string)($payment['method'] ?? ''), 'histórico') !== false) && !empty($candidate['registered_method'])) {
        $payment['method'] = $candidate['registered_method'];
    }
    $payment['history_enriched'] = true;
    return $payment;
}

$days = 30;
$limit = max(1, min(5000, (int)($_GET['limit'] ?? 2000)));
$cutoff = strtotime('-' . $days . ' days');
$path = paymentAuditStorePath();
$payments = [];

if (is_file($path)) {
    $lines = @file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    foreach (array_reverse($lines) as $line) {
        $row = json_decode($line, true);
        if (!is_array($row)) continue;
        if (!in_array(($row['source'] ?? ''), ['portal', 'whatsapp_bot'], true)) continue;
        $ts = vpTimestamp($row);
        if ($ts === false || $ts < $cutoff) continue;
        $payments[] = $row;
        if (count($payments) >= $limit) break;
    }
}

$diagnostic = null;
$candidates = vpRecentRegisteredPayments($days, $diagnostic);
$enrichedCount = 0;
foreach ($payments as $index => $payment) {
    $candidate = vpPickCandidate($payment, $candidates);
    if ($candidate !== null) {
        $payments[$index] = vpEnrich($payment, $candidate);
        $enrichedCount++;
    }
}

usort($payments, function($a, $b) {
    return (vpTimestamp($b) ?: 0) <=> (vpTimestamp($a) ?: 0);
});

$sourceCounts = ['portal' => 0, 'whatsapp_bot' => 0];
foreach ($payments as $row) {
    $source = $row['source'] ?? '';
    if (isset($sourceCounts[$source])) $sourceCounts[$source]++;
}

vpRespond(200, [
    'payments' => array_slice($payments, 0, $limit),
    'count' => count($payments),
    'historical_days' => $days,
    'source_counts' => $sourceCounts,
    'enriched_count' => $enrichedCount,
    'enrichment_status' => $diagnostic['status'] ?? 'unknown',
    'enrichment_candidates' => $diagnostic['matched_candidates'] ?? 0,
    'version' => VALIDATED_PAYMENTS_VERSION,
]);
