<?php
/**
 * finance_proxy.php - Proxy para el Dashboard de Finanzas
 * Proporciona datos agregados de facturación y pagos de Wisphub.
 */
require_once 'config_wisphub.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$cache_file = __DIR__ . '/finance_cache.json';
$debug_log = __DIR__ . '/wisphub_debug.log';
$cache_time = 900; // 15 minutos

// Bypassear caché si se solicita
$refresh = isset($_GET['refresh']) || isset($_GET['debug']);

// Verificar caché
if (!$refresh && file_exists($cache_file) && (time() - filemtime($cache_file) < $cache_time)) {
    echo file_get_contents($cache_file);
    exit;
}

function fetchWisphub($endpoint) {
    $url = WISPHUB_API_URL . $endpoint;
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Api-Key ' . WISPHUB_TOKEN
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return [
        'code' => $http_code,
        'data' => json_decode($response, true)
    ];
}

// Obtener datos
$year = date('Y');
$invoices = fetchWisphub("facturas/?anio=$year&limit=500");
$payments = fetchWisphub("pagos/?anio=$year&limit=500");
$expenses = fetchWisphub("egresos/?anio=$year&limit=500");

// Procesamiento de datos para el Dashboard
$stats = [
    'summary' => [
        'total_internet' => 0,
        'total_others' => 0,
        'total_expenses' => 0,
        'total_pending' => 0
    ],
    'history' => [],
    'payment_methods' => [],
    'debug' => [
        'inv_code' => $invoices['code'],
        'inv_count' => count($invoices['data']['results'] ?? []),
        'exp_code' => $expenses['code'],
        'exp_count' => count($expenses['data']['results'] ?? [])
    ]
];

// Keywords para identificar servicios de internet
$internet_keys = ['internet', 'plan', 'mbps', 'megas', 'mensualidad', 'servicio de', 'mb', 'gb', 'wifi', 'fibra', 'navegacion', 'residencial', 'pyme'];

// Procesar facturas (Ingresos y Pendientes)
if ($invoices['code'] === 200 && isset($invoices['data']['results'])) {
    foreach ($invoices['data']['results'] as $inv) {
        $fecha = $inv['fecha_emision'] ?? $inv['fecha_publicacion'] ?? null;
        if (!$fecha) continue;
        
        $timestamp = strtotime($fecha);
        $month_name = date('M', $timestamp);
        
        if (!isset($stats['history'][$month_name])) {
            $stats['history'][$month_name] = ['income' => 0, 'expenses' => 0, 'others' => 0];
        }

        $total = (float)$inv['total'];
        $concepto = strtolower($inv['concepto'] ?? '');
        
        if ($inv['estado'] === 'Pagada') {
            $is_internet = false;
            foreach ($internet_keys as $key) {
                if (strpos($concepto, $key) !== false) {
                    $is_internet = true;
                    break;
                }
            }

            if ($is_internet) {
                $stats['summary']['total_internet'] += $total;
                $stats['history'][$month_name]['income'] += $total;
            } else {
                $stats['summary']['total_others'] += $total;
                $stats['history'][$month_name]['others'] += $total;
            }
        } else if ($inv['estado'] === 'Sin Pagar' || $inv['estado'] === 'Vencida') {
            $stats['summary']['total_pending'] += $total;
        }
    }
}

// Procesar Gastos (Expenses - Egresos)
if ($expenses['code'] === 200 && isset($expenses['data']['results'])) {
    foreach ($expenses['data']['results'] as $exp) {
        $fecha_exp = $exp['fecha'] ?? $exp['fecha_creacion'] ?? 'now';
        $timestamp = strtotime($fecha_exp);
        $month_name = date('M', $timestamp);
        
        if (!isset($stats['history'][$month_name])) {
            $stats['history'][$month_name] = ['income' => 0, 'expenses' => 0, 'others' => 0];
        }

        $cantidad = (float)($exp['cantidad'] ?? 0);
        $stats['summary']['total_expenses'] += $cantidad;
        $stats['history'][$month_name]['expenses'] += $cantidad;
    }
}

// Guardar y mostrar
$final_data = json_encode([
    'status' => 'success',
    'last_update' => date('Y-m-d H:i:s'),
    'data' => $stats
]);

file_put_contents($cache_file, $final_data);
echo $final_data;
?>
