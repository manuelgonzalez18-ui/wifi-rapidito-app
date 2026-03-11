<?php
session_start();
header('Content-Type: text/html; charset=utf-8');

// Configuración y librerías
require_once 'config_wisphub.php';
require_once 'banesco_api.php';

$results = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $results = [];
    $referencia = trim($_POST['referencia'] ?? '');
    $facturaId  = trim($_POST['factura_id'] ?? '');
    $monto      = trim($_POST['monto'] ?? '');
    $fecha      = trim($_POST['fecha'] ?? date('Y-m-d'));
    
    // Cambiar dinámicamente el RIF de consulta según la entrada QA
    $rif_consulta = trim($_POST['rif'] ?? 'J003075523');

    // 1. Validar en Banesco QA
    try {
        $startTime = microtime(true);
        $banescoResponse = BanescoAPI::checkTransaction($referencia, $rif_consulta);
        $banescoTime = round((microtime(true) - $startTime) * 1000) . 'ms';
        
        $results['banesco'] = [
            'status' => $banescoResponse['success'] ? 'success' : 'error',
            'time' => $banescoTime,
            'message' => $banescoResponse['message'] ?? 'Validado correctamente',
            'raw' => $banescoResponse
        ];
        
        // 2. Si Banesco OK y hay factura, Reportar a Wisphub (Auto-Activar)
        if ($banescoResponse['success'] && !empty($facturaId)) {
            $startTime = microtime(true);
            
            // Simular proxy_payments registrar-pago
            $url = 'https://api.wisphub.app/api/facturas/registrar-pago/' . $facturaId . '/';
            $payload = [
                'referencia'    => $referencia,
                'fecha_pago'    => $fecha,
                'total_cobrado' => (float)$monto,
                'accion'        => 1, // 1 = Registrar pago y activar el servicio
                'forma_pago'    => 16749 // Transferencia
            ];
            
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => json_encode($payload),
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_TIMEOUT        => 30,
                CURLOPT_HTTPHEADER     => [
                    'Authorization: Api-Key ' . WISPHUB_TOKEN,
                    'Content-Type: application/json',
                    'Accept: application/json',
                ],
            ]);

            $resHub = curl_exec($ch);
            $codeHub = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            $wisphubTime = round((microtime(true) - $startTime) * 1000) . 'ms';
            
            $results['wisphub'] = [
                'status' => $codeHub === 200 ? 'success' : 'error',
                'time' => $wisphubTime,
                'code' => $codeHub,
                'raw' => json_decode($resHub, true) ?? $resHub
            ];
        }

    } catch (Exception $e) {
        $results['error'] = $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="es" class="dark">
<head>
    <meta charset="UTF-8">
    <title>QA - Validador Banesco + Wisphub</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        banesco: '#006640',
                        wisphub: '#10B981'
                    }
                }
            }
        }
    </script>
</head>
<body class="bg-gray-900 text-white min-h-screen p-8">
    <div class="max-w-4xl mx-auto">
        <div class="flex items-center space-x-4 mb-8 border-b border-gray-700 pb-4">
            <h1 class="text-3xl font-bold text-banesco">BANESCO</h1>
            <span class="text-gray-500 text-2xl">+</span>
            <h1 class="text-3xl font-bold text-wisphub">WISPHUB</h1>
            <span class="bg-yellow-500 text-black px-3 py-1 rounded-full font-bold text-xs ml-4">AMBIENTE QA</span>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Formulario -->
            <div class="bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700">
                <h2 class="text-xl font-semibold mb-6">Probar Transacción</h2>
                <form method="POST" class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-400 mb-1">Referencia Banesco (Ej. 12346022338)</label>
                        <input type="text" name="referencia" required class="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-banesco outline-none" value="<?= htmlspecialchars($_POST['referencia'] ?? '') ?>">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-1">Cédula / RIF (Default: J003075523)</label>
                        <input type="text" name="rif" class="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-banesco outline-none" value="<?= htmlspecialchars($_POST['rif'] ?? 'J003075523') ?>">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">Monto (Ej. 578)</label>
                            <input type="number" step="0.01" name="monto" class="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white outline-none" value="<?= htmlspecialchars($_POST['monto'] ?? '') ?>">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">Fecha (YYYY-MM-DD)</label>
                            <input type="date" name="fecha" class="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white outline-none" value="<?= htmlspecialchars($_POST['fecha'] ?? date('Y-m-d')) ?>">
                        </div>
                    </div>
                    <div class="pt-2 border-t border-gray-700 mt-4">
                        <label class="block text-sm text-gray-400 mb-1">Factura WispHub ID (Opcional, para simular auto-activación)</label>
                        <input type="number" name="factura_id" class="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white outline-none" placeholder="Ej. 5866" value="<?= htmlspecialchars($_POST['factura_id'] ?? '') ?>">
                    </div>
                    <button type="submit" class="w-full bg-banesco hover:bg-green-700 text-white font-bold py-3 rounded-lg mt-6 shadow-lg shadow-green-900/50 transition-all">
                        VALIDAR Y REGISTRAR
                    </button>
                </form>

                <div class="mt-8 p-4 bg-gray-900 rounded-xl border border-gray-700 text-sm">
                    <p class="text-gray-400 mb-2 font-bold">Datos de Prueba (Tabla):</p>
                    <ul class="text-xs text-gray-500 space-y-1">
                        <li>Ref: 12346022338 | Monto: 578 | J003075523</li>
                        <li>Ref: 12346008875 | Monto: 250 | J003075523</li>
                        <li>Ref: 012346005441 | Monto: 389.75 | J003075523</li>
                        <li>Ref: 99941544566 | Monto: 189 | J003075523</li>
                    </ul>
                </div>
            </div>

            <!-- Resultados -->
            <div class="bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700 h-full">
                <h2 class="text-xl font-semibold mb-6">Logs de Consola</h2>
                
                <?php if ($results): ?>
                    <?php if (isset($results['error'])): ?>
                        <div class="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 mb-4">
                            Excepción Crítica: <?= htmlspecialchars($results['error']) ?>
                        </div>
                    <?php endif; ?>

                    <?php if (isset($results['banesco'])): ?>
                        <div class="mb-6">
                            <div class="flex items-center justify-between mb-2">
                                <span class="font-bold text-banesco">1. Banesco API</span>
                                <span class="text-xs bg-gray-700 px-2 py-1 rounded"><?= $results['banesco']['time'] ?></span>
                            </div>
                            <div class="p-3 bg-gray-900 rounded-lg border <?= $results['banesco']['status'] === 'success' ? 'border-green-500/50' : 'border-orange-500/50' ?> text-sm overflow-x-auto">
                                <pre class="text-gray-300"><?= json_encode($results['banesco']['raw'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) ?></pre>
                            </div>
                        </div>
                    <?php endif; ?>

                    <?php if (isset($results['wisphub'])): ?>
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <span class="font-bold text-wisphub">2. WispHub API (registrar-pago)</span>
                                <span class="text-xs bg-gray-700 px-2 py-1 rounded">HTTP <?= $results['wisphub']['code'] ?> | <?= $results['wisphub']['time'] ?></span>
                            </div>
                            <div class="p-3 bg-gray-900 rounded-lg border <?= $results['wisphub']['status'] === 'success' ? 'border-green-500/50' : 'border-red-500/50' ?> text-sm overflow-x-auto">
                                <pre class="text-gray-300"><?= json_encode($results['wisphub']['raw'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) ?></pre>
                            </div>
                        </div>
                    <?php endif; ?>
                <?php else: ?>
                    <div class="h-64 flex flex-col items-center justify-center text-gray-500">
                        <svg class="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        <p>Esperando la primera prueba...</p>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
</body>
</html>
