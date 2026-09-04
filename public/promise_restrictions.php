<?php
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function pr_respond($status, $payload) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['health'])) {
    pr_respond(200, ['status' => 'ready', 'version' => '1.3-ledger-sweep']);
}

require_once __DIR__ . '/promise_restrictions_lib.php';
require_once __DIR__ . '/config_wisphub.php';

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

function pr_require_admin() {
    if (empty($_SESSION['staff_authenticated']) || empty($_SESSION['staff_is_admin'])) {
        pr_respond(403, ['error' => 'Se requiere una sesión de administrador.']);
    }
}

function pr_wisphub_get($url, &$error = null) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Api-Key ' . WISPHUB_TOKEN,
            'Accept: application/json',
        ],
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 3,
        CURLOPT_ENCODING => '',
    ]);
    $body = curl_exec($ch);
    $errno = curl_errno($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($body === false || $errno !== 0) {
        $error = 'No se pudo conectar con WispHub.';
        return null;
    }
    if ($httpCode < 200 || $httpCode >= 300) {
        $error = 'WispHub respondió HTTP ' . $httpCode . '.';
        return null;
    }
    $decoded = json_decode($body, true);
    if (!is_array($decoded)) {
        $error = 'WispHub devolvió una respuesta no válida.';
        return null;
    }
    return $decoded;
}

function pr_client_cache_path() {
    return pr_private_directory() . '/promise-client-directory.json';
}

function pr_fetch_clients($force = false, &$error = null) {
    $cachePath = pr_client_cache_path();
    if (!$force && is_file($cachePath) && (time() - filemtime($cachePath)) < 300) {
        $cached = json_decode((string) @file_get_contents($cachePath), true);
        if (is_array($cached)) return $cached;
    }

    $base = rtrim(WISPHUB_API_URL, '/') . '/clientes/';
    $clients = [];
    $offset = 0;
    $pageSize = 300;
    $maxPages = 40;

    for ($page = 0; $page < $maxPages; $page++) {
        $url = $base . '?limit=' . $pageSize . '&offset=' . $offset;
        $data = pr_wisphub_get($url, $error);
        if ($data === null) {
            if ($clients) break;
            return null;
        }

        $batch = is_array($data['results'] ?? null) ? $data['results'] : (array_is_list($data) ? $data : [$data]);
        foreach ($batch as $client) {
            if (is_array($client)) $clients[] = $client;
        }

        $received = count($batch);
        if ($received === 0) break;
        $offset += $received;
        $total = isset($data['count']) && is_numeric($data['count']) ? (int) $data['count'] : null;
        if ($total !== null && $offset >= $total) break;
        if ($total === null && $received < $pageSize && empty($data['next'])) break;
    }

    if ($clients) {
        @file_put_contents($cachePath, json_encode($clients, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
        @chmod($cachePath, 0600);
    }
    return $clients;
}

function pr_client_summary($client) {
    $ids = pr_identifiers_from_client($client);
    return array_merge($ids, [
        'name' => trim((string) pr_first_value($client, ['nombre', 'name', 'cliente'], 'Cliente')),
        'cedula' => trim((string) pr_first_value($client, ['cedula', 'documento', 'rif'], '')),
        'email' => trim((string) pr_first_value($client, ['correo', 'email'], '')),
    ]);
}

function pr_find_client($query, &$error = null) {
    $queryRaw = trim((string) $query);
    if ($queryRaw === '') return null;
    $queryUser = pr_normalize_username($queryRaw);
    $queryPhone = pr_normalize_phone($queryRaw);
    $queryId = preg_match('/^\d+$/', $queryRaw) ? $queryRaw : '';

    $clients = pr_fetch_clients(false, $error);
    if (!is_array($clients)) return null;

    foreach ($clients as $client) {
        $summary = pr_client_summary($client);
        if ($queryUser !== '' && $summary['username'] !== '' && $summary['username'] === $queryUser) return $summary;
        if ($queryId !== '' && ($summary['service_id'] === $queryId || $summary['client_id'] === $queryId)) return $summary;
        if ($queryPhone !== '' && strlen($queryPhone) >= 10 && $summary['phone'] !== '' && $summary['phone'] === $queryPhone) return $summary;
    }
    return null;
}

function pr_request_identifiers($source) {
    return [
        'service_id' => trim((string) ($source['service_id'] ?? '')),
        'client_id' => trim((string) ($source['client_id'] ?? '')),
        'username' => pr_normalize_username($source['username'] ?? ''),
        'phone' => pr_normalize_phone($source['phone'] ?? ''),
    ];
}

function pr_pending_invoice_ids($saldoPayload) {
    if (!is_array($saldoPayload)) return [];
    $items = is_array($saldoPayload['facturas'] ?? null) ? $saldoPayload['facturas'] : [];
    $ids = [];
    foreach ($items as $invoice) {
        if (!is_array($invoice)) continue;
        $id = trim((string) pr_first_value($invoice, ['id_factura', 'id'], ''));
        if ($id !== '') $ids[$id] = true;
    }
    return $ids;
}

function pr_all_due_promise_entries($today = null) {
    $today = $today ?: date('Y-m-d');
    $result = [];
    foreach (pr_load_promise_ledger() as $entry) {
        if (!is_array($entry)) continue;
        if (!empty($entry['fulfilled_at']) || !empty($entry['breached_at'])) continue;
        $deadline = trim((string) ($entry['deadline'] ?? ''));
        if ($deadline === '' || $deadline >= $today) continue;
        $result[] = $entry;
    }
    usort($result, fn($a, $b) => strcmp((string) ($a['deadline'] ?? ''), (string) ($b['deadline'] ?? '')));
    return $result;
}

function pr_reconcile_due_promises($identifiers = null, $maxEntries = 100) {
    $tz = new DateTimeZone('America/Caracas');
    $today = (new DateTimeImmutable('now', $tz))->format('Y-m-d');
    $dueEntries = is_array($identifiers) ? pr_due_promise_entries($identifiers, $today) : pr_all_due_promise_entries($today);
    if (!$dueEntries) return is_array($identifiers) ? null : ['checked' => 0, 'breached' => 0, 'fulfilled' => 0, 'errors' => 0];
    $dueEntries = array_slice($dueEntries, 0, max(1, (int) $maxEntries));
    $stats = ['checked' => 0, 'breached' => 0, 'fulfilled' => 0, 'errors' => 0];

    $saldoCache = [];
    foreach ($dueEntries as $entry) {
        $serviceId = trim((string) ($entry['service_id'] ?? ''));
        $invoiceId = trim((string) ($entry['invoice_id'] ?? ''));
        $deadline = trim((string) ($entry['deadline'] ?? ''));
        $ledgerKey = trim((string) ($entry['ledger_key'] ?? ''));
        if ($serviceId === '' || $invoiceId === '' || $deadline === '' || $ledgerKey === '') {
            if (!is_array($identifiers)) $stats['errors']++;
            continue;
        }
        if (!is_array($identifiers)) $stats['checked']++;

        if (!array_key_exists($serviceId, $saldoCache)) {
            $lookupError = null;
            $saldoCache[$serviceId] = pr_wisphub_get(
                rtrim(WISPHUB_API_URL, '/') . '/clientes/' . rawurlencode($serviceId) . '/saldo/',
                $lookupError
            );
            if (!is_array($saldoCache[$serviceId])) {
                error_log('[PROMISE_RECONCILE] saldo unavailable service=' . $serviceId . ' error=' . ($lookupError ?: 'unknown'));
                $saldoCache[$serviceId] = null;
                if (!is_array($identifiers)) $stats['errors']++;
            }
        }

        $saldo = $saldoCache[$serviceId];
        if (!is_array($saldo)) continue;
        $pendingIds = pr_pending_invoice_ids($saldo);

        if (!isset($pendingIds[$invoiceId])) {
            pr_update_promise_ledger_entry($ledgerKey, [
                'fulfilled_at' => date(DATE_ATOM),
                'resolution' => 'invoice_not_pending_after_deadline_check',
            ]);
            if (!is_array($identifiers)) $stats['fulfilled']++;
            continue;
        }

        $deadlineDate = DateTimeImmutable::createFromFormat('!Y-m-d', $deadline, $tz);
        if (!$deadlineDate) continue;
        $incidentDate = $deadlineDate->modify('+1 day');
        $client = [
            'nombre' => trim((string) ($entry['client_name'] ?? 'Cliente')),
            'id_servicio' => $serviceId,
            'id_cliente' => trim((string) ($entry['client_id'] ?? '')),
            'usuario' => pr_normalize_username($entry['username'] ?? ''),
            'telefono' => pr_normalize_phone($entry['phone'] ?? ''),
            'cedula' => trim((string) ($entry['cedula'] ?? '')),
            'correo' => trim((string) ($entry['email'] ?? '')),
        ];
        $restriction = pr_create_restriction_record(
            $client,
            $incidentDate,
            'promise-ledger-reconciliation',
            'Restricción automática: la factura asociada continuó pendiente después de la fecha prometida.',
            'system-reconciliation'
        );
        if (!$restriction) {
            error_log('[PROMISE_RECONCILE] could not persist restriction service=' . $serviceId . ' invoice=' . $invoiceId);
            continue;
        }

        pr_update_promise_ledger_entry($ledgerKey, [
            'breached_at' => date(DATE_ATOM),
            'restriction_id' => $restriction['id'] ?? null,
            'resolution' => 'invoice_still_pending_after_deadline',
        ]);
        if (is_array($identifiers)) return $restriction;
        $stats['breached']++;
    }
    return is_array($identifiers) ? null : $stats;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = (string) ($_GET['action'] ?? 'check');

    if ($action === 'check') {
        $identifiers = pr_request_identifiers($_GET);
        $provided = count(array_filter($identifiers, fn($value) => $value !== ''));
        if ($provided < 2) {
            pr_respond(422, ['error' => 'Se requieren al menos dos identificadores del cliente.']);
        }
        $restriction = pr_find_active_restriction($identifiers);
        if (!$restriction) {
            $restriction = pr_reconcile_due_promises($identifiers);
        }
        pr_respond(200, pr_public_payload($restriction));
    }

    if ($action === 'reconcile') {
        $token = trim((string) ($_GET['token'] ?? ''));
        $expected = defined('PROMISE_RECONCILE_TOKEN') ? trim((string) PROMISE_RECONCILE_TOKEN) : '';
        if ($expected === '' || $token === '' || !hash_equals($expected, $token)) {
            pr_respond(403, ['error' => 'No autorizado.']);
        }
        $limit = min(500, max(1, (int) ($_GET['limit'] ?? 100)));
        $stats = pr_reconcile_due_promises(null, $limit);
        pr_respond(200, ['success' => true, 'reconciliation' => $stats, 'version' => '1.3-ledger-sweep']);
    }

    if ($action === 'list') {
        pr_require_admin();
        $records = pr_load_records();
        usort($records, fn($a, $b) => (strtotime((string) ($b['created_at'] ?? '')) ?: 0) <=> (strtotime((string) ($a['created_at'] ?? '')) ?: 0));
        $result = array_map(function ($record) {
            $record['status'] = !empty($record['revoked_at']) ? 'revoked' : (pr_record_is_active($record) ? 'active' : 'expired');
            return $record;
        }, $records);
        pr_respond(200, ['restrictions' => $result, 'version' => '1.3-ledger-sweep']);
    }

    pr_respond(404, ['error' => 'Acción no encontrada.']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    pr_respond(405, ['error' => 'Método no permitido.']);
}

pr_require_admin();
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) $input = $_POST;
if (!is_array($input)) $input = [];
$action = (string) ($input['action'] ?? 'create');

if ($action === 'create') {
    $query = trim((string) ($input['query'] ?? ''));
    $incidentDate = trim((string) ($input['incident_date'] ?? date('Y-m-d')));
    $note = trim((string) ($input['note'] ?? ''));

    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $incidentDate);
    if ($query === '' || !$date || $date->format('Y-m-d') !== $incidentDate) {
        pr_respond(422, ['error' => 'Indica un usuario/servicio/teléfono válido y la fecha del incumplimiento.']);
    }

    $lookupError = null;
    $client = pr_find_client($query, $lookupError);
    if (!$client) {
        pr_respond($lookupError ? 503 : 404, ['error' => $lookupError ?: 'No encontramos ese cliente en WispHub.']);
    }

    $startsAt = $date->setTime(0, 0, 0);
    // ends_at is the exact instant the benefit becomes available again.
    $endsAt = pr_add_months_clamped($date, 3)->setTime(0, 0, 0);
    $records = pr_load_records();
    $createdBy = (string) ($_SESSION['staff_username'] ?? 'admin');

    foreach ($records as &$existing) {
        if (pr_record_is_active($existing) && pr_records_match($existing, $client)) {
            $existing['revoked_at'] = date(DATE_ATOM);
            $existing['revoked_by'] = $createdBy;
            $existing['revoked_reason'] = 'Reemplazada por un nuevo incumplimiento.';
        }
    }
    unset($existing);

    $record = [
        'id' => bin2hex(random_bytes(8)),
        'client_name' => $client['name'],
        'service_id' => $client['service_id'],
        'client_id' => $client['client_id'],
        'username' => $client['username'],
        'phone' => $client['phone'],
        'cedula' => $client['cedula'],
        'email' => $client['email'],
        'reason' => 'Incumplimiento de promesa de pago',
        'note' => substr($note, 0, 500),
        'incident_date' => $date->format('Y-m-d'),
        'starts_at' => $startsAt->format(DATE_ATOM),
        'ends_at' => $endsAt->format(DATE_ATOM),
        'created_at' => date(DATE_ATOM),
        'created_by' => $createdBy,
        'source' => 'staff',
        'revoked_at' => null,
        'revoked_by' => null,
    ];
    $records[] = $record;

    if (!pr_save_records($records)) {
        pr_respond(500, ['error' => 'No pudimos guardar la restricción en el servidor.']);
    }

    $record['status'] = 'active';
    pr_respond(201, ['success' => true, 'restriction' => $record]);
}

if ($action === 'revoke') {
    $id = trim((string) ($input['id'] ?? ''));
    if ($id === '') pr_respond(422, ['error' => 'Falta el identificador de la restricción.']);
    $records = pr_load_records();
    $found = false;
    foreach ($records as &$record) {
        if (($record['id'] ?? '') !== $id) continue;
        $record['revoked_at'] = date(DATE_ATOM);
        $record['revoked_by'] = (string) ($_SESSION['staff_username'] ?? 'admin');
        $record['revoked_reason'] = 'Retirada manualmente por administración.';
        $found = true;
        break;
    }
    unset($record);
    if (!$found) pr_respond(404, ['error' => 'Restricción no encontrada.']);
    if (!pr_save_records($records)) pr_respond(500, ['error' => 'No pudimos actualizar la restricción.']);
    pr_respond(200, ['success' => true]);
}

pr_respond(404, ['error' => 'Acción no encontrada.']);
?>