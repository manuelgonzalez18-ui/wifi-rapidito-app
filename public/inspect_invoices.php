<?php
// inspect_invoices.php - v1.6.5 - BUSCADOR DE FACTURAS MAESTRO
header("Cache-Control: no-cache, must-revalidate");
?>
<!DOCTYPE html>
<html>
<head>
    <title>Buscador de Facturas - WiFi Rapidito</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #0f172a; color: white; padding: 20px; }
        .card { background: #1e293b; padding: 20px; border-radius: 10px; border: 1px solid #334155; margin-bottom: 20px; }
        input { padding: 12px; border-radius: 5px; border: 1px solid #475569; width: 300px; background: #0f172a; color: white; }
        button { padding: 12px 20px; border-radius: 5px; background: #2563eb; color: white; border: none; cursor: pointer; font-weight: bold; }
        pre { background: #000; padding: 10px; border-radius: 5px; color: #0f0; font-size: 12px; overflow-x: auto; }
        .status-badge { padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }
        .pending { background: #f59e0b; color: #000; }
        .paid { background: #10b981; color: #fff; }
    </style>
</head>
<body>
    <h1>Buscador de Facturas Maestro</h1>
    
    <div class="card">
        <form method="GET">
            <label>Buscar por # de Factura o ID:</label><br><br>
            <input type="text" name="q" placeholder="Ej: 5561..." value="<?php echo htmlspecialchars($_GET['q'] ?? '') ?>">
            <button type="submit">BUSCAR FACTURA</button>
            <a href="?" style="color: #94a3b8; margin-left:15px; text-decoration:none;">Limpiar</a>
        </form>
    </div>

    <?php
    $apiKey = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
    $baseUrl = 'https://api.wisphub.app/api';

    if (isset($_GET['q']) && !empty($_GET['q'])) {
        $q = $_GET['q'];
        echo "<div class='card'>";
        echo "<h2>Resultados para: $q</h2>";
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "$baseUrl/facturas/?buscar=" . urlencode($q));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $apiKey]);
        $response = curl_exec($ch);
        curl_close($ch);

        $json = json_decode($response, true);
        $results = $json['results'] ?? [];

        if (empty($results)) {
            echo "<p style='color: #f87171'>No se encontró ninguna factura con ese número.</p>";
        } else {
            foreach ($results as $inv) {
                $statusClass = strpos(strtolower($inv['estado'] ?? ''), 'pendiente') !== false ? 'pending' : 'paid';
                echo "<div style='border-bottom: 1px solid #334155; padding: 15px 0;'>";
                echo "<h3>ID Interno: " . ($inv['id_factura'] ?? '-') . "</h3>";
                echo "<p><b>Referencia/Número:</b> " . ($inv['numero'] ?? '-') . "</p>";
                echo "<p><b>Cliente:</b> " . ($inv['cliente']['nombre'] ?? 'N/A') . " (ID: " . ($inv['cliente']['id'] ?? 'N/A') . ")</p>";
                echo "<p><b>Total:</b> $" . ($inv['total'] ?? '-') . " | <b>Estado:</b> <span class='status-badge $statusClass'>" . ($inv['estado'] ?? '-') . "</span></p>";
                echo "<p><b>Fecha Emisión:</b> " . ($inv['fecha_emision'] ?? '-') . "</p>";
                
                echo "<h4>JSON Completo del API (Esto es lo que lee el Dashboard):</h4>";
                echo "<pre>" . json_encode($inv, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "</pre>";
                echo "</div>";
            }
        }
        echo "</div>";
    }
    ?>
</body>
</html>
