<?php
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    http_response_code(404);
    exit;
}

function payment_registry_private_directory() {
    $dir = dirname(__DIR__) . '/.wifi-rapidito-private';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    return $dir;
}

function payment_registry_store_path() {
    return payment_registry_private_directory() . '/validated-payments.json';
}

function payment_registry_lock_path() {
    return payment_registry_private_directory() . '/validated-payments.lock';
}

function payment_registry_normalize_reference($value) {
    $normalized = strtoupper((string) $value);
    return preg_replace('/[^A-Z0-9]+/', '', $normalized) ?: '';
}

function payment_registry_reference_key($value) {
    $normalized = payment_registry_normalize_reference($value);
    if ($normalized === '') return '';
    // El asistente solicita los últimos 6 dígitos y el portal puede recibir
    // la referencia completa. Usar los últimos 6 crea una llave común entre
    // ambos canales y evita reutilizar la misma operación bancaria.
    return strlen($normalized) > 6 ? substr($normalized, -6) : $normalized;
}

function payment_registry_storage_key($reference) {
    $key = payment_registry_reference_key($reference);
    return $key === '' ? '' : hash('sha256', $key);
}

function payment_registry_read_unlocked() {
    $path = payment_registry_store_path();
    if (!is_file($path)) return [];
    $raw = @file_get_contents($path);
    if ($raw === false || trim($raw) === '') return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function payment_registry_write_unlocked($records) {
    $path = payment_registry_store_path();
    $encoded = json_encode($records, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
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

function payment_registry_claim($reference, $data = [], &$existing = null) {
    $referenceKey = payment_registry_reference_key($reference);
    $storageKey = payment_registry_storage_key($reference);
    if ($referenceKey === '' || $storageKey === '') {
        throw new InvalidArgumentException('Referencia de pago inválida.');
    }

    $lock = @fopen(payment_registry_lock_path(), 'c+');
    if (!$lock || !@flock($lock, LOCK_EX)) {
        if ($lock) @fclose($lock);
        throw new RuntimeException('No se pudo bloquear el registro de pagos.');
    }

    try {
        $records = payment_registry_read_unlocked();
        if (isset($records[$storageKey]) && is_array($records[$storageKey])) {
            $existingRecord = $records[$storageKey];
            $existing = $existingRecord;

            // Una operación que Banesco verificó pero que no pudo llegar a WispHub
            // puede reintentarse únicamente sobre la MISMA factura. Esto permite
            // recuperar fallos técnicos sin abrir la referencia para otra deuda.
            $existingStatus = (string) ($existingRecord['status'] ?? '');
            $existingInvoice = (string) ($existingRecord['invoice_id'] ?? '');
            $requestedInvoice = (string) ((is_array($data) ? ($data['invoice_id'] ?? '') : ''));
            if ($existingStatus === 'registration_error'
                && $existingInvoice !== ''
                && $requestedInvoice !== ''
                && hash_equals($existingInvoice, $requestedInvoice)) {
                $now = date(DATE_ATOM);
                $record = array_merge($existingRecord, is_array($data) ? $data : []);
                $record['id'] = (string) ($existingRecord['id'] ?? bin2hex(random_bytes(8)));
                $record['reference'] = payment_registry_normalize_reference($reference);
                $record['reference_key'] = $referenceKey;
                $record['status'] = 'bank_verified';
                $record['created_at'] = (string) ($existingRecord['created_at'] ?? $now);
                $record['updated_at'] = $now;
                $record['validated_at'] = null;
                $record['registration_error'] = null;
                $record['retry_count'] = ((int) ($existingRecord['retry_count'] ?? 0)) + 1;
                $records[$storageKey] = $record;
                if (!payment_registry_write_unlocked($records)) {
                    throw new RuntimeException('No se pudo actualizar el registro de pagos.');
                }
                $existing = null;
                return $record;
            }

            return null;
        }

        $now = date(DATE_ATOM);
        $record = array_merge([
            'id' => bin2hex(random_bytes(8)),
            'reference' => payment_registry_normalize_reference($reference),
            'reference_key' => $referenceKey,
            'status' => 'bank_verified',
            'source' => 'unknown',
            'created_at' => $now,
            'updated_at' => $now,
            'validated_at' => null,
            'registration_error' => null,
            'retry_count' => 0,
        ], is_array($data) ? $data : []);

        $record['reference'] = payment_registry_normalize_reference($reference);
        $record['reference_key'] = $referenceKey;
        $record['status'] = 'bank_verified';
        $record['created_at'] = $now;
        $record['updated_at'] = $now;
        $record['validated_at'] = null;
        $record['registration_error'] = null;

        $records[$storageKey] = $record;
        if (!payment_registry_write_unlocked($records)) {
            throw new RuntimeException('No se pudo guardar el registro de pagos.');
        }
        return $record;
    } finally {
        @flock($lock, LOCK_UN);
        @fclose($lock);
    }
}

function payment_registry_update($reference, $recordId, $changes) {
    $storageKey = payment_registry_storage_key($reference);
    if ($storageKey === '') return false;

    $lock = @fopen(payment_registry_lock_path(), 'c+');
    if (!$lock || !@flock($lock, LOCK_EX)) {
        if ($lock) @fclose($lock);
        return false;
    }

    try {
        $records = payment_registry_read_unlocked();
        $record = $records[$storageKey] ?? null;
        if (!is_array($record) || !hash_equals((string) ($record['id'] ?? ''), (string) $recordId)) {
            return false;
        }
        foreach ((array) $changes as $key => $value) {
            if (in_array($key, ['id', 'reference', 'reference_key', 'created_at'], true)) continue;
            $record[$key] = $value;
        }
        $record['updated_at'] = date(DATE_ATOM);
        $records[$storageKey] = $record;
        return payment_registry_write_unlocked($records);
    } finally {
        @flock($lock, LOCK_UN);
        @fclose($lock);
    }
}

function payment_registry_mark_validated($reference, $recordId, $wisphub = []) {
    return payment_registry_update($reference, $recordId, [
        'status' => 'validated',
        'validated_at' => date(DATE_ATOM),
        'wisphub' => is_array($wisphub) ? $wisphub : [],
        'registration_error' => null,
    ]);
}

function payment_registry_mark_registration_error($reference, $recordId, $message) {
    return payment_registry_update($reference, $recordId, [
        'status' => 'registration_error',
        'registration_error' => substr(trim((string) $message), 0, 500),
    ]);
}

function payment_registry_all_records() {
    $lock = @fopen(payment_registry_lock_path(), 'c+');
    if (!$lock || !@flock($lock, LOCK_SH)) {
        if ($lock) @fclose($lock);
        return [];
    }
    try {
        return array_values(array_filter(payment_registry_read_unlocked(), 'is_array'));
    } finally {
        @flock($lock, LOCK_UN);
        @fclose($lock);
    }
}

function payment_registry_history($limit = 500, $includeErrors = false) {
    $records = payment_registry_all_records();
    $records = array_values(array_filter($records, function ($record) use ($includeErrors) {
        $status = (string) ($record['status'] ?? '');
        return $status === 'validated' || ($includeErrors && $status === 'registration_error');
    }));
    usort($records, function ($a, $b) {
        $aTime = strtotime((string) ($a['validated_at'] ?? $a['updated_at'] ?? $a['created_at'] ?? '')) ?: 0;
        $bTime = strtotime((string) ($b['validated_at'] ?? $b['updated_at'] ?? $b['created_at'] ?? '')) ?: 0;
        return $bTime <=> $aTime;
    });
    return array_slice($records, 0, max(1, min((int) $limit, 2000)));
}
?>