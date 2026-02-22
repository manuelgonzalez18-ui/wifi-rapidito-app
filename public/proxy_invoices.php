<?php
// proxy_invoices.php con SMART FILTERING (v2.0)
// Fixes Wisphub API ignoring filters by fetching ALL and filtering locally.

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$logFile = 'api_debug.log';
function writeLog($msg) {
    global $logFile;
    $entry = "[" . date('Y-m-d H:i:s') . "] [SMART-PROXY] " . $msg . "\n";
    file_put_contents($logFile, $entry, FILE_APPEND);
}

// Configuración
$api_url_base = 'https://api.wisphub.app/api/facturas/';
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

// Capturar parámetros de búsqueda del frontend
$search_u = $_GET['cliente'] ?? $_GET['usuario'] ?? '';
$search_c = $_GET['cedula'] ?? $_GET['search'] ?? '';
$search_id = $_GET['id_servicio'] ?? $_GET['id_cliente'] ?? $_GET['servicio'] ?? '';

// Forzar LIMIT 1000 para traer todo el universo (Dragnet)
// Wisphub ignora nuestros filtros, así que le pedimos TODO y filtramos aquí.
// IMPLEMENTACIÓN V3 (INFINITY): Paginación automática porque la API corta a 300 items.

writeLog("Frontend asked for: User='$search_u', Ced='$search_c', ID='$search_id'");

// --- OPTIMIZACIÓN V3.1: Búsqueda Directa por ID ---
if (!empty($search_c) && is_numeric($search_c)) {
    writeLog("Numeric ID detected ($search_c). Trying direct lookup first...");
    $directUrl = $api_url_base . $search_c . '/';
    $chD = curl_init($directUrl);
    curl_setopt($chD, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($chD, CURLOPT_HTTPHEADER, [
        'Authorization: Api-Key ' . $api_key,
        'Content-Type: application/json'
    ]);
    curl_setopt($chD, CURLOPT_SSL_VERIFYPEER, false);
    $resD = curl_exec($chD);
    $codeD = curl_getinfo($chD, CURLINFO_HTTP_CODE);
    curl_close($chD);

    if ($codeD === 200) {
        $invD = json_decode($resD, true);
        if ($invD && (isset($invD['id_factura']) || isset($invD['id']))) {
            writeLog("Direct ID Match Found!");
            $invD['debug_match_by'] = "DirectID";
            $invD['public_url'] = "view_pdf.php?id=" . ($invD['id_factura'] ?? $invD['id']);
            echo json_encode([
                'count' => 1,
                'results' => [$invD],
                'debug_direct' => true
            ]);
            exit;
        }
    }
    writeLog("Direct lookup failed or returned nothing ($codeD). Falling back to Dragnet...");
}

$allInvoices = [];
$nextUrl = $api_url_base . '?limit=300'; // Empezamos con el máximo real (300)
$pageCount = 0;
$maxPages = 15; // Seguridad: Máximo 4500 facturas para no explotar memoria (Tu total es ~1000)

do {
    $pageCount++;
    writeLog("Fetching Page $pageCount: $nextUrl");

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $nextUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Api-Key ' . $api_key,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code !== 200) {
        writeLog("Page $pageCount Failed ($http_code). Stopping loop.");
        break;
    }

    $data = json_decode($response, true);
    $results = $data['results'] ?? [];
    
    // Add to accumulator
    $allInvoices = array_merge($allInvoices, $results);
    
    // Check next page
    $nextUrl = $data['next'] ?? null;
    
    // FIX v1.11.1: Wisphub returns HTTP and sometimes .net links which cause 301/403. Force HTTPS and .app.
    if ($nextUrl) {
        $nextUrl = str_replace(['http://', 'wisphub.net'], ['https://', 'wisphub.app'], $nextUrl);
    }
    
} while ($nextUrl && $pageCount < $maxPages);

writeLog("Fetched Total: " . count($allInvoices) . " invoices in $pageCount pages. Filtering...");

$filtered = [];

if (empty($search_u) && empty($search_c) && empty($search_id)) {
    // Si no hay filtros, devolver todo (seguridad: devolver vacío o pocos)
    $filtered = $allInvoices; 
} else {
    foreach ($allInvoices as $inv) {
        $match = false;
        
        // 1. Check ID (Servicio/Cliente) in nested objects
        $inv_svc = $inv['id_servicio'] ?? $inv['servicio']['id_servicio'] ?? '';
        $inv_cli = $inv['id_cliente'] ?? $inv['cliente']['id_cliente'] ?? '';
        
        // 2. Check Username
        $inv_user = $inv['cliente']['usuario'] ?? '';
        
        // 3. Check Cedula
        $inv_ced = $inv['cliente']['cedula'] ?? '';
        
        // 4. Check Nested Service IDs in Articles (The "Hidden" ID)
        $art_svcs = [];
        if (isset($inv['articulos'])) {
            foreach ($inv['articulos'] as $art) {
                if (isset($art['servicio']['id_servicio'])) {
                    $art_svcs[] = $art['servicio']['id_servicio'];
                }
            }
        }

        // 5. Check Invoice ID and Folio
        $inv_id_raw = $inv['id_factura'] ?? '';
        $inv_folio = $inv['folio'] ?? '';

        // --- MATCHING LOGIC (v2.4 - Robust) ---
        $matches = [];
        
        // A. Username Match
        if (!empty($search_u)) {
            if ($inv_user === $search_u || $inv_user === $search_u . "@wifi-rapidito") {
                $matches[] = "Username($inv_user)";
            }
        }
        
        // B. Cedula Match
        if (!empty($search_c) && $inv_ced == $search_c) {
            $matches[] = "Cedula($inv_ced)";
        }

        // D. Invoice ID / Folio Match
        if (!empty($search_c) && ($inv_id_raw == $search_c || $inv_folio == $search_c)) {
            $matches[] = "ID/Folio($inv_id_raw)";
        }

        // E. Service / Client ID Match
        if (!empty($search_id)) {
            $targetId = (string)$search_id;
            if ($inv_svc == $targetId) $matches[] = "SvcID($inv_svc)";
            elseif ($inv_cli == $targetId) $matches[] = "CliID($inv_cli)";
            elseif (in_array($targetId, $art_svcs)) $matches[] = "ArtSvcID($targetId)";
        }

        if (!empty($matches)) {
            // INJECT PUBLIC URL (v2.1 - Local Proxy)
            $inv_id = $inv['id'] ?? $inv['id_factura'] ?? $inv['folio'] ?? '';
            $inv['public_url'] = "view_pdf.php?id={$inv_id}";
            $inv['debug_match_by'] = implode(', ', $matches);
            
            $filtered[] = $inv;
        }
    }
}

writeLog("Returning " . count($filtered) . " matches.");

// Return structured response
echo json_encode([
    'count' => count($filtered),
    'results' => array_values($filtered),
    'debug_dragnet' => true
]);
?>
