<?php
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');

define('VALIDATED_PAYMENTS_VERSION', '1.1-real-client-full-details');

function vpRespond($status, $payload) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['health'])) {
    vpRespond(200, ['status' => 'ready', 'version' => VALIDATED_PAYMENTS_VERSION]);
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

function vpFirst($source, array $keys, $default = '') {
    if (!is_array($source)) return $default;
    foreach ($keys as $key) {
        if (array_key_exists($key, $source) && $source[$key] !== null && $source[$key] !== '') {
            return $source[$key];
        }
    }
    return $default;
}

function vpScalar($value, array $keys = []) {
    if (is_array($value)) {
        foreach ($keys as $key) {
            if (isset($value[$key]) && $value[$key] !== '' && $value[$key] !== null) {
                return trim((string)$value[$key]);
            }
        }
        foreach (['nombre','name','cliente','razon_social','usuario_portal','usuario','username','id','id_cliente','id_factura','id_servicio','id_pago'] as $key) {
            if (isset($value[$key]) && $value[$key] !== '' && $value[$key] !== null) {
                return trim((string)$value[$key]);
            }
        }
        return '';
    }
    return is_scalar($value) ? trim((string)$value) : '';
}

function vpMoney($value) {
    if ($value === null || $value === '') return null;
    if (is_int($value) || is_float($value)) return round((float)$value, 2);
    $raw = trim((string)$value);
    if ($raw === '') return null;
    $raw = preg_replace('/[^0-9,\.\-]/', '', $raw);
    if ($raw === '' || $raw === '-') return null;

    $lastComma = strrpos($raw, ',');
    $lastDot = strrpos($raw, '.');
    if ($lastComma !== false && $lastDot !== false) {
        if ($lastComma > $lastDot) {
            $raw = str_replace('.', '', $raw);
            $raw = str_replace(',', '.', $raw);
        } else {
            $raw = str_replace(',', '', $raw);
        }
    } elseif ($lastComma !== false) {
        $decimals = strlen($raw) - $lastComma - 1;
        if ($decimals === 1 || $decimals === 2) {
            $raw = str_replace('.', '', $raw);
            $raw = str_replace(',', '.', $raw);
        } else {
            $raw = str_replace(',', '', $raw);
        }
    } elseif (substr_count($raw, '.') > 1) {
        $parts = explode('.', $raw);
        $last = array_pop($parts);
        $raw = implode('', $parts) . (strlen($last) <= 2 ? '.' . $last : $last);
    }
    return is_numeric($raw) ? round((float)$raw, 2) : null;
}

function vpTimestamp($row) {
    if (!is_array($row)) return false;
    foreach (['payment_date','created_at','fecha_pago','fecha','fecha_registro','fecha_creacion'] as $key) {
        $value = $row[$key] ?? '';
        if ($value === null || $value === '') continue;
        $ts = strtotime((string)$value);
        if ($ts !== false) return $ts;
    }
    return false;
}

function vpDate($value) {
    if ($value === null || $value === '') return '';
    $ts = strtotime((string)$value);
    return $ts === false ? substr(trim((string)$value), 0, 10) : date('Y-m-d', $ts);
}

function vpTextKey($value) {
    return strtolower(trim((string)$value));
}

function vpAmountKey($value) {
    $amount = vpMoney($value);
    return $amount === null ? '' : number_format($amount, 2, '.', '');
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
        CURLOPT_MAXREDIRS => 3,
        CURLOPT_ENCODING => '',
    ]);
    $body = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $errno = curl_errno($ch);
    $error = curl_error($ch);
    curl_close($ch);
    if ($errno !== 0 || $code < 200 || $code >= 300 || !$body) {
        return ['ok' => false, 'data' => null, 'error' => $error !== '' ? $error : ('HTTP ' . $code)];
    }
    $data = json_decode($body, true);
    if (!is_array($data)) return ['ok' => false, 'data' => null, 'error' => 'Respuesta JSON inválida'];
    return ['ok' => true, 'data' => $data, 'error' => ''];
}

function vpFetchPaginated($endpoint, $maxPages = 25, $pageSize = 300) {
    $out = [];
    $offset = 0;
    $separator = str_contains($endpoint, '?') ? '&' : '?';
    for ($page = 0; $page < $maxPages; $page++) {
        $url = $endpoint . $separator . http_build_query(['limit' => $pageSize, 'offset' => $offset]);
        $result = vpFetchJson($url);
        if (!$result['ok']) return ['rows' => $out, 'error' => $result['error'], 'complete' => false];
        $data = $result['data'];
        $rows = is_array($data['results'] ?? null) ? $data['results'] : (array_is_list($data) ? $data : []);
        if (!$rows) break;
        $out = array_merge($out, $rows);
        $received = count($rows);
        $offset += $received;
        $count = isset($data['count']) && is_numeric($data['count']) ? (int)$data['count'] : null;
        if ($received < $pageSize) break;
        if ($count !== null && $offset >= $count) break;
        if ($count === null && empty($data['next'])) break;
    }
    return ['rows' => $out, 'error' => '', 'complete' => true];
}

function vpServiceId($row) {
    if (!is_array($row)) return '';
    foreach (['id_servicio','servicio_id'] as $key) {
        if (isset($row[$key]) && $row[$key] !== '') return trim((string)$row[$key]);
    }
    $service = $row['servicio'] ?? null;
    $id = vpScalar($service, ['id_servicio','id','pk']);
    if ($id !== '') return $id;
    foreach ((array)($row['articulos'] ?? []) as $article) {
        if (!is_array($article)) continue;
        $id = vpScalar($article['servicio'] ?? null, ['id_servicio','id','pk']);
        if ($id !== '') return $id;
        foreach (['id_servicio','servicio_id'] as $key) {
            if (!empty($article[$key])) return trim((string)$article[$key]);
        }
    }
    return '';
}

function vpNestedPayment($row) {
    foreach (['pago','payment','detalle_pago','datos_pago','ultimo_pago'] as $key) {
        if (is_array($row[$key] ?? null)) return $row[$key];
    }
    return [];
}

function vpNormalizeInvoice($row) {
    if (!is_array($row)) return null;
    $payment = vpNestedPayment($row);
    $client = $row['cliente'] ?? $row['client'] ?? $row['usuario'] ?? $row['user'] ?? [];
    $method = $row['forma_pago'] ?? $row['metodo_pago'] ?? $row['payment_method'] ?? ($payment['forma_pago'] ?? '');

    $dateRaw = vpFirst($payment, ['fecha_pago','fecha','created_at'], vpFirst($row, ['fecha_pago','fecha_registro','fecha','created_at'], ''));
    $amountRaw = vpFirst($payment, ['total_cobrado','monto','cantidad','total','importe'], vpFirst($row, ['total_cobrado','monto','cantidad','total','importe','total_factura'], null));
    $reference = vpScalar(vpFirst($payment, ['referencia','reference','numero_referencia','nro_referencia'], ''), []);
    if ($reference === '') $reference = vpScalar(vpFirst($row, ['referencia','reference','numero_referencia','nro_referencia','ref'], ''), []);

    $clientName = vpScalar($client, ['nombre','name','cliente','razon_social']);
    if ($clientName === '') $clientName = vpScalar(vpFirst($row, ['nombre_cliente','cliente_nombre','nombre'], ''), []);
    $username = vpScalar($client, ['usuario_portal','usuario','username']);
    if ($username === '') $username = vpScalar(vpFirst($row, ['usuario_portal','usuario','username'], ''), []);
    $clientId = vpScalar(vpFirst($row, ['id_cliente','cliente_id'], ''), []);
    if ($clientId === '') $clientId = vpScalar($client, ['id_cliente','id','pk']);
    $document = vpScalar($client, ['cedula','documento','rif']);
    if ($document === '') $document = vpScalar(vpFirst($row, ['cedula_cliente','documento_cliente','cedula','rif'], ''), []);
    $phone = vpScalar($client, ['telefono','phone','movil','celular']);
    if ($phone === '') $phone = vpScalar(vpFirst($row, ['telefono_cliente','telefono','celular','phone'], ''), []);
    $email = vpScalar($client, ['correo','email']);
    if ($email === '') $email = vpScalar(vpFirst($row, ['correo_cliente','email','correo'], ''), []);

    return [
        'payment_id' => vpScalar(vpFirst($payment, ['id_pago','id','pk'], vpFirst($row, ['id_pago'], '')), []),
        'invoice_id' => vpScalar(vpFirst($row, ['id_factura','folio','id','pk'], ''), []),
        'reference' => $reference,
        'amount' => vpMoney($amountRaw),
        'currency' => 'VES',
        'payment_date' => vpDate($dateRaw),
        'client_name' => $clientName,
        'username' => $username,
        'client_id' => $clientId,
        'client_document' => $document,
        'client_phone' => $phone,
        'client_email' => $email,
        'service_id' => vpServiceId($row),
        'registered_method' => vpScalar($method, ['nombre','name']),
    ];
}

function vpLoadPaidInvoices($days, &$meta) {
    $from = date('Y-m-d', strtotime('-' . max(1, (int)$days) . ' days'));
    $to = date('Y-m-d');
    $bases = array_values(array_unique(['https://api.wisphub.net/api', rtrim(WISPHUB_API_URL, '/')]));
    $rows = [];
    $error = '';
    foreach ($bases as $base) {
        $url = rtrim($base, '/') . '/facturas/?' . http_build_query([
            'estado' => 2,
            'fecha_pago__range_0' => $from,
            'fecha_pago__range_1' => $to,
        ]);
        $result = vpFetchPaginated($url, 25, 300);
        if ($result['rows']) {
            $rows = $result['rows'];
            $error = $result['error'];
            break;
        }
        $error = $result['error'];
    }
    if (!$rows) {
        foreach ($bases as $base) {
            $url = rtrim($base, '/') . '/facturas/?estado=2';
            $result = vpFetchPaginated($url, 25, 300);
            if ($result['rows']) {
                $rows = $result['rows'];
                $error = $result['error'];
                break;
            }
            $error = $result['error'];
        }
    }

    $cutoff = strtotime($from . ' 00:00:00');
    $out = [];
    foreach ($rows as $row) {
        $candidate = vpNormalizeInvoice($row);
        if (!$candidate) continue;
        $ts = strtotime((string)$candidate['payment_date']);
        if ($ts === false || $ts < $cutoff) continue;
        $out[] = $candidate;
    }
    $meta = ['status' => $rows ? 'ok' : 'error', 'error' => $error, 'candidate_count' => count($out)];
    return $out;
}

function vpLoadClients(&$meta) {
    $cacheFile = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'wifi-rapidito-staff-clients-v2.json';
    if (is_file($cacheFile)) {
        $cached = json_decode((string)@file_get_contents($cacheFile), true);
        if (is_array($cached['clients'] ?? null)) {
            $meta = ['status' => 'cache', 'count' => count($cached['clients'])];
            return $cached['clients'];
        }
    }

    $base = rtrim(WISPHUB_API_URL, '/') . '/clientes/';
    $result = vpFetchPaginated($base, 40, 300);
    $clients = [];
    foreach ($result['rows'] as $client) {
        if (!is_array($client)) continue;
        $serviceValue = vpFirst($client, ['id_servicio','servicio_id','servicio'], '');
        $serviceId = vpScalar($serviceValue, ['id_servicio','id','pk']);
        if ($serviceId === '' && is_scalar($serviceValue)) $serviceId = trim((string)$serviceValue);
        $clients[] = [
            'client_id' => vpScalar(vpFirst($client, ['id_cliente','id','pk'], ''), []),
            'service_id' => $serviceId,
            'client_name' => vpScalar(vpFirst($client, ['nombre','name','cliente'], ''), []),
            'client_document' => vpScalar(vpFirst($client, ['cedula','documento','rif'], ''), []),
            'client_phone' => vpScalar(vpFirst($client, ['telefono','movil','celular','phone'], ''), []),
            'client_email' => vpScalar(vpFirst($client, ['correo','email'], ''), []),
            'username' => vpScalar(vpFirst($client, ['usuario','usuario_portal','username'], ''), []),
            'client_address' => vpScalar(vpFirst($client, ['direccion_principal','direccion','address'], ''), []),
            'plan' => vpScalar(vpFirst($client, ['plan_internet','plan','nombre_plan'], ''), ['nombre','name']),
            'node' => vpScalar(vpFirst($client, ['nodo','router','zona','sector'], ''), ['nombre','name']),
            'client_status' => vpScalar(vpFirst($client, ['estado','status','estado_servicio','estatus'], ''), ['nombre','name']),
        ];
    }
    $meta = ['status' => $result['error'] === '' ? 'ok' : 'partial', 'count' => count($clients), 'error' => $result['error']];
    return $clients;
}

function vpEnrichCandidateWithClient($candidate, $clients) {
    $keys = [
        'client_id' => vpTextKey($candidate['client_id'] ?? ''),
        'service_id' => vpTextKey($candidate['service_id'] ?? ''),
        'username' => vpTextKey($candidate['username'] ?? ''),
        'client_phone' => preg_replace('/\D+/', '', (string)($candidate['client_phone'] ?? '')),
    ];
    $match = null;
    foreach ($clients as $client) {
        if (!is_array($client)) continue;
        if ($keys['client_id'] !== '' && vpTextKey($client['client_id'] ?? '') === $keys['client_id']) { $match = $client; break; }
        if ($keys['service_id'] !== '' && vpTextKey($client['service_id'] ?? '') === $keys['service_id']) { $match = $client; break; }
        if ($keys['username'] !== '' && vpTextKey($client['username'] ?? '') === $keys['username']) { $match = $client; break; }
        $clientPhone = preg_replace('/\D+/', '', (string)($client['client_phone'] ?? ''));
        if ($keys['client_phone'] !== '' && $clientPhone !== '' && $clientPhone === $keys['client_phone']) { $match = $client; break; }
    }
    if (!$match) return $candidate;
    foreach (['client_name','username','client_id','client_document','client_phone','client_email','service_id','client_address','plan','node','client_status'] as $field) {
        if (!empty($match[$field])) $candidate[$field] = $match[$field];
    }
    return $candidate;
}

function vpPickCandidate($payment, $candidates) {
    $paymentId = vpTextKey($payment['payment_id'] ?? '');
    if ($paymentId !== '') {
        $matches = array_values(array_filter($candidates, fn($row) => vpTextKey($row['payment_id'] ?? '') === $paymentId));
        if (count($matches) === 1) return $matches[0];
    }

    $invoiceId = vpTextKey($payment['invoice_id'] ?? '');
    if ($invoiceId !== '') {
        $matches = array_values(array_filter($candidates, fn($row) => vpTextKey($row['invoice_id'] ?? '') === $invoiceId));
        if (count($matches) === 1) return $matches[0];
    }

    $reference = vpTextKey($payment['reference'] ?? '');
    if ($reference !== '') {
        $matches = array_values(array_filter($candidates, fn($row) => vpTextKey($row['reference'] ?? '') === $reference));
        if (count($matches) === 1) return $matches[0];
    }

    $amount = vpAmountKey($payment['amount'] ?? null);
    $paymentTs = vpTimestamp($payment);
    if ($amount !== '' && $paymentTs !== false) {
        $matches = array_values(array_filter($candidates, function($row) use ($amount, $paymentTs) {
            if (vpAmountKey($row['amount'] ?? null) !== $amount) return false;
            $candidateTs = strtotime((string)($row['payment_date'] ?? ''));
            return $candidateTs !== false && abs($candidateTs - $paymentTs) <= 86400;
        }));
        if (count($matches) === 1) return $matches[0];

        $payerPhone = preg_replace('/\D+/', '', (string)($payment['payer_phone'] ?? $payment['client_phone'] ?? ''));
        if ($payerPhone !== '' && count($matches) > 1) {
            $phoneMatches = array_values(array_filter($matches, function($row) use ($payerPhone) {
                $phone = preg_replace('/\D+/', '', (string)($row['client_phone'] ?? ''));
                return $phone !== '' && (str_ends_with($payerPhone, $phone) || str_ends_with($phone, $payerPhone));
            }));
            if (count($phoneMatches) === 1) return $phoneMatches[0];
        }
    }
    return null;
}

function vpEnrichPayment($payment, $candidate) {
    if (!is_array($candidate)) {
        $payment['client_resolved'] = false;
        return $payment;
    }
    foreach (['client_name','username','client_id','client_document','client_phone','client_email','client_address','plan','node','client_status'] as $field) {
        if (!empty($candidate[$field])) $payment[$field] = $candidate[$field];
    }
    foreach (['service_id','invoice_id','payment_id','reference','currency','payment_date'] as $field) {
        if (empty($payment[$field]) && !empty($candidate[$field])) $payment[$field] = $candidate[$field];
    }
    if ((!isset($payment['amount']) || $payment['amount'] === null || $payment['amount'] === '') && $candidate['amount'] !== null) {
        $payment['amount'] = $candidate['amount'];
    }
    if (!empty($candidate['registered_method'])) {
        $payment['registered_method'] = $candidate['registered_method'];
        if (empty($payment['payment_type_label']) && (empty($payment['method']) || stripos((string)$payment['method'], 'histórico') !== false)) {
            $payment['method'] = $candidate['registered_method'];
        }
    }
    $payment['client_resolved'] = !empty($payment['client_name']) || !empty($payment['username']) || !empty($payment['client_id']);
    $payment['history_enriched'] = true;
    return $payment;
}

$days = 30;
$limit = max(1, min(5000, (int)($_GET['limit'] ?? 2000)));
$cutoff = strtotime('-' . $days . ' days');
$payments = [];
$path = paymentAuditStorePath();
if (is_file($path)) {
    foreach (array_reverse(@file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: []) as $line) {
        $row = json_decode($line, true);
        if (!is_array($row)) continue;
        if (!in_array(($row['source'] ?? ''), ['portal','whatsapp_bot'], true)) continue;
        $ts = vpTimestamp($row);
        if ($ts === false || $ts < $cutoff) continue;
        $payments[] = $row;
        if (count($payments) >= $limit) break;
    }
}

$invoiceMeta = null;
$candidates = vpLoadPaidInvoices($days, $invoiceMeta);
$clientMeta = null;
$clients = vpLoadClients($clientMeta);
foreach ($candidates as $index => $candidate) {
    $candidates[$index] = vpEnrichCandidateWithClient($candidate, $clients);
}

$enrichedCount = 0;
$resolvedCount = 0;
foreach ($payments as $index => $payment) {
    $candidate = vpPickCandidate($payment, $candidates);
    $payments[$index] = vpEnrichPayment($payment, $candidate);
    if ($candidate !== null) $enrichedCount++;
    if (!empty($payments[$index]['client_resolved'])) $resolvedCount++;
    $payments[$index]['source_label'] = ($payments[$index]['source'] ?? '') === 'whatsapp_bot'
        ? 'Asistente Virtual Rapidito'
        : 'Portal de Autogestión';
}

usort($payments, fn($a, $b) => (vpTimestamp($b) ?: 0) <=> (vpTimestamp($a) ?: 0));

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
    'resolved_clients' => $resolvedCount,
    'invoice_enrichment' => $invoiceMeta,
    'client_enrichment' => $clientMeta,
    'version' => VALIDATED_PAYMENTS_VERSION,
]);
?>
