<?php
function paymentAuditPrivateDir() {
    $dir = dirname(__DIR__) . '/.wifi-rapidito-private';
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    return $dir;
}

function paymentAuditStorePath() {
    return paymentAuditPrivateDir() . '/payment-audit.jsonl';
}

function normalizePaymentAuditRecord($record) {
    $now = gmdate('c');
    return [
        'id' => $record['id'] ?? bin2hex(random_bytes(8)),
        'created_at' => $record['created_at'] ?? $now,
        'source' => in_array(($record['source'] ?? ''), ['portal', 'whatsapp_bot'], true) ? $record['source'] : 'unknown',
        'client_name' => trim((string)($record['client_name'] ?? '')),
        'username' => trim((string)($record['username'] ?? '')),
        'service_id' => trim((string)($record['service_id'] ?? '')),
        'invoice_id' => trim((string)($record['invoice_id'] ?? '')),
        'reference' => trim((string)($record['reference'] ?? '')),
        'amount' => is_numeric($record['amount'] ?? null) ? (float)$record['amount'] : null,
        'currency' => trim((string)($record['currency'] ?? 'VES')),
        'payment_date' => trim((string)($record['payment_date'] ?? '')),
        'method' => trim((string)($record['method'] ?? 'Transferencia Banesco')),
        'banesco_status' => trim((string)($record['banesco_status'] ?? 'validated')),
        'wisphub_status' => trim((string)($record['wisphub_status'] ?? 'registered')),
        'wisphub_task_id' => trim((string)($record['wisphub_task_id'] ?? '')),
    ];
}

function appendPaymentAudit($record) {
    $row = normalizePaymentAuditRecord($record);
    $path = paymentAuditStorePath();
    $fp = @fopen($path, 'c+');
    if (!$fp) return false;
    if (!flock($fp, LOCK_EX)) { fclose($fp); return false; }

    rewind($fp);
    $existing = stream_get_contents($fp);
    $dedupeKey = strtolower($row['source'] . '|' . $row['invoice_id'] . '|' . $row['reference']);
    if ($existing) {
        $lines = preg_split('/\r?\n/', trim($existing));
        foreach (array_slice($lines, -800) as $line) {
            $item = json_decode($line, true);
            if (!is_array($item)) continue;
            $key = strtolower(($item['source'] ?? '') . '|' . ($item['invoice_id'] ?? '') . '|' . ($item['reference'] ?? ''));
            if ($key === $dedupeKey) {
                flock($fp, LOCK_UN);
                fclose($fp);
                return true;
            }
        }
    }

    fseek($fp, 0, SEEK_END);
    $ok = fwrite($fp, json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n") !== false;
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    @chmod($path, 0600);
    return $ok;
}
