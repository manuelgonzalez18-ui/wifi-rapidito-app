<?php
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    http_response_code(404);
    exit;
}

function pr_private_directory() {
    $dir = dirname(__DIR__) . '/.wifi-rapidito-private';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    return $dir;
}

function pr_store_path() {
    return pr_private_directory() . '/promise-restrictions.json';
}

function pr_load_records() {
    $path = pr_store_path();
    if (!is_file($path)) return [];
    $raw = @file_get_contents($path);
    if ($raw === false || trim($raw) === '') return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function pr_save_records($records) {
    $path = pr_store_path();
    $encoded = json_encode(array_values($records), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($encoded === false) return false;
    $tmp = $path . '.tmp';
    if (@file_put_contents($tmp, $encoded, LOCK_EX) === false) return false;
    @chmod($tmp, 0600);
    if (!@rename($tmp, $path)) {
        @unlink($tmp);
        return false;
    }
    @chmod($path, 0600);
    return true;
}

function pr_promise_ledger_path() {
    return pr_private_directory() . '/promise-ledger.json';
}

function pr_load_promise_ledger() {
    $path = pr_promise_ledger_path();
    if (!is_file($path)) return [];
    $raw = @file_get_contents($path);
    if ($raw === false || trim($raw) === '') return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function pr_save_promise_ledger($records) {
    $path = pr_promise_ledger_path();
    $encoded = json_encode(array_values($records), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($encoded === false) return false;
    $tmp = $path . '.tmp';
    if (@file_put_contents($tmp, $encoded, LOCK_EX) === false) return false;
    @chmod($tmp, 0600);
    if (!@rename($tmp, $path)) {
        @unlink($tmp);
        return false;
    }
    @chmod($path, 0600);
    return true;
}

function pr_normalize_username($value) {
    $value = strtolower(trim((string) $value));
    if (str_ends_with($value, '@wifi-rapidito')) {
        $value = substr($value, 0, -strlen('@wifi-rapidito'));
    }
    return preg_replace('/\s+/', '', $value) ?: '';
}

function pr_normalize_phone($value) {
    $digits = preg_replace('/\D+/', '', (string) $value) ?: '';
    if ($digits === '') return '';
    if (str_starts_with($digits, '0') && strlen($digits) === 11) {
        return '58' . substr($digits, 1);
    }
    if (strlen($digits) === 10 && !str_starts_with($digits, '58')) {
        return '58' . $digits;
    }
    return $digits;
}

function pr_scalar_id($value) {
    if (is_array($value)) {
        foreach (['id_servicio', 'id_cliente', 'id', 'pk'] as $key) {
            if (isset($value[$key]) && $value[$key] !== '') return (string) $value[$key];
        }
        return '';
    }
    return is_scalar($value) ? trim((string) $value) : '';
}

function pr_first_value($source, $keys, $default = '') {
    foreach ($keys as $key) {
        if (is_array($source) && array_key_exists($key, $source) && $source[$key] !== null && $source[$key] !== '') {
            return $source[$key];
        }
    }
    return $default;
}

function pr_identifiers_from_client($client) {
    if (!is_array($client)) $client = [];
    $service = pr_first_value($client, ['id_servicio', 'servicio_id'], '');
    if ($service === '' && isset($client['servicio'])) $service = pr_scalar_id($client['servicio']);
    $clientId = pr_first_value($client, ['id_cliente', 'id', 'pk'], '');
    return [
        'service_id' => trim((string) $service),
        'client_id' => trim((string) $clientId),
        'username' => pr_normalize_username(pr_first_value($client, ['usuario', 'usuario_portal', 'username'], '')),
        'phone' => pr_normalize_phone(pr_first_value($client, ['telefono', 'movil', 'celular', 'phone'], '')),
    ];
}

function pr_record_is_active($record, $at = null) {
    if (!is_array($record) || !empty($record['revoked_at'])) return false;
    $atTs = $at ? strtotime($at) : time();
    $startTs = strtotime((string) ($record['starts_at'] ?? '')) ?: 0;
    $endTs = strtotime((string) ($record['ends_at'] ?? '')) ?: 0;
    // ends_at represents the exact instant at which the benefit becomes
    // available again, so the restriction is active strictly before it.
    return $startTs <= $atTs && $endTs > $atTs;
}

function pr_records_match($record, $identifiers) {
    if (!is_array($record) || !is_array($identifiers)) return false;
    $checks = [
        'service_id' => trim((string) ($identifiers['service_id'] ?? '')),
        'client_id' => trim((string) ($identifiers['client_id'] ?? '')),
        'username' => pr_normalize_username($identifiers['username'] ?? ''),
        'phone' => pr_normalize_phone($identifiers['phone'] ?? ''),
    ];

    foreach ($checks as $key => $needle) {
        if ($needle === '') continue;
        $stored = (string) ($record[$key] ?? '');
        if ($key === 'username') $stored = pr_normalize_username($stored);
        if ($key === 'phone') $stored = pr_normalize_phone($stored);
        if ($stored !== '' && hash_equals($stored, $needle)) return true;
    }
    return false;
}

function pr_find_active_restriction($identifiers) {
    $matches = [];
    foreach (pr_load_records() as $record) {
        if (!pr_record_is_active($record)) continue;
        if (!pr_records_match($record, $identifiers)) continue;
        $matches[] = $record;
    }
    if (!$matches) return null;
    usort($matches, fn($a, $b) => (strtotime((string) ($b['ends_at'] ?? '')) ?: 0) <=> (strtotime((string) ($a['ends_at'] ?? '')) ?: 0));
    return $matches[0];
}

function pr_add_months_clamped($date, $months) {
    $source = $date instanceof DateTimeImmutable ? $date : new DateTimeImmutable((string) $date);
    $year = (int) $source->format('Y');
    $month = (int) $source->format('n');
    $day = (int) $source->format('j');
    $total = ($year * 12 + ($month - 1)) + (int) $months;
    $targetYear = intdiv($total, 12);
    $targetMonth = ($total % 12) + 1;
    $lastDay = (int) (new DateTimeImmutable(sprintf('%04d-%02d-01', $targetYear, $targetMonth)))->modify('last day of this month')->format('j');
    $targetDay = min($day, $lastDay);
    return new DateTimeImmutable(sprintf('%04d-%02d-%02d', $targetYear, $targetMonth, $targetDay));
}

function pr_create_restriction_record($client, $incidentDate, $source = 'automatic', $note = '', $createdBy = 'system') {
    if (!is_array($client)) return null;
    $date = $incidentDate instanceof DateTimeImmutable
        ? $incidentDate
        : DateTimeImmutable::createFromFormat('!Y-m-d', trim((string) $incidentDate));
    if (!$date) return null;

    $ids = pr_identifiers_from_client($client);
    if (count(array_filter($ids, fn($value) => $value !== '')) < 2) return null;

    $existing = pr_find_active_restriction($ids);
    if ($existing) return $existing;

    $startsAt = $date->setTime(0, 0, 0);
    $endsAt = pr_add_months_clamped($date, 3)->setTime(0, 0, 0);
    $records = pr_load_records();
    $record = [
        'id' => bin2hex(random_bytes(8)),
        'client_name' => trim((string) pr_first_value($client, ['nombre', 'name', 'cliente'], 'Cliente')),
        'service_id' => $ids['service_id'],
        'client_id' => $ids['client_id'],
        'username' => $ids['username'],
        'phone' => $ids['phone'],
        'cedula' => trim((string) pr_first_value($client, ['cedula', 'documento', 'rif'], '')),
        'email' => trim((string) pr_first_value($client, ['correo', 'email'], '')),
        'reason' => 'Incumplimiento de promesa de pago',
        'note' => substr(trim((string) $note), 0, 500),
        'incident_date' => $date->format('Y-m-d'),
        'starts_at' => $startsAt->format(DATE_ATOM),
        'ends_at' => $endsAt->format(DATE_ATOM),
        'created_at' => date(DATE_ATOM),
        'created_by' => (string) $createdBy,
        'source' => (string) $source,
        'revoked_at' => null,
        'revoked_by' => null,
    ];
    $records[] = $record;
    return pr_save_records($records) ? $record : null;
}

function pr_promise_ledger_key($entry) {
    if (!is_array($entry)) return '';
    $invoiceId = trim((string) ($entry['invoice_id'] ?? ''));
    $deadline = trim((string) ($entry['deadline'] ?? ''));
    $serviceId = trim((string) ($entry['service_id'] ?? ''));
    if ($invoiceId === '' || $deadline === '') return '';
    return hash('sha256', $serviceId . '|' . $invoiceId . '|' . $deadline);
}

function pr_record_promise($entry) {
    if (!is_array($entry)) return false;
    $deadline = trim((string) ($entry['deadline'] ?? ''));
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $deadline);
    if (!$date || $date->format('Y-m-d') !== $deadline) return false;

    $entry['service_id'] = trim((string) ($entry['service_id'] ?? ''));
    $entry['client_id'] = trim((string) ($entry['client_id'] ?? ''));
    $entry['username'] = pr_normalize_username($entry['username'] ?? '');
    $entry['phone'] = pr_normalize_phone($entry['phone'] ?? '');
    $entry['invoice_id'] = trim((string) ($entry['invoice_id'] ?? ''));
    $entry['deadline'] = $deadline;
    $entry['ledger_key'] = pr_promise_ledger_key($entry);
    if ($entry['ledger_key'] === '' || $entry['invoice_id'] === '') return false;
    $entry['recorded_at'] = $entry['recorded_at'] ?? date(DATE_ATOM);
    $entry['fulfilled_at'] = $entry['fulfilled_at'] ?? null;
    $entry['breached_at'] = $entry['breached_at'] ?? null;
    $entry['restriction_id'] = $entry['restriction_id'] ?? null;

    $records = pr_load_promise_ledger();
    foreach ($records as $existing) {
        if (($existing['ledger_key'] ?? '') === $entry['ledger_key']) return true;
    }
    $records[] = $entry;
    return pr_save_promise_ledger($records);
}

function pr_due_promise_entries($identifiers, $today = null) {
    $today = $today ?: date('Y-m-d');
    $result = [];
    foreach (pr_load_promise_ledger() as $entry) {
        if (!is_array($entry)) continue;
        if (!empty($entry['fulfilled_at']) || !empty($entry['breached_at'])) continue;
        if (!pr_records_match($entry, $identifiers)) continue;
        $deadline = trim((string) ($entry['deadline'] ?? ''));
        if ($deadline === '' || $deadline >= $today) continue;
        $result[] = $entry;
    }
    usort($result, fn($a, $b) => strcmp((string) ($a['deadline'] ?? ''), (string) ($b['deadline'] ?? '')));
    return $result;
}

function pr_update_promise_ledger_entry($ledgerKey, $updates) {
    $ledgerKey = trim((string) $ledgerKey);
    if ($ledgerKey === '' || !is_array($updates)) return false;
    $records = pr_load_promise_ledger();
    $found = false;
    foreach ($records as &$record) {
        if (($record['ledger_key'] ?? '') !== $ledgerKey) continue;
        foreach ($updates as $key => $value) $record[$key] = $value;
        $found = true;
        break;
    }
    unset($record);
    return $found ? pr_save_promise_ledger($records) : false;
}

function pr_public_payload($record) {
    if (!$record) return ['blocked' => false];
    return [
        'blocked' => true,
        'blocked_until' => substr((string) ($record['ends_at'] ?? ''), 0, 10),
        'reason' => 'Incumplimiento de una promesa de pago anterior',
    ];
}
?>