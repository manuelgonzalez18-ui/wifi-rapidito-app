<?php
// inspect_user.php - v1.6.1 - EXPLORADOR MAESTRO DE DATOS
header("Cache-Control: no-cache, must-revalidate");
?>
<!DOCTYPE html>
<html>
<head>
    <title>Explorador Maestro Wisphub - WiFi Rapidito</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #0f172a; color: white; padding: 20px; }
        .card { background: #1e293b; padding: 20px; border-radius: 10px; border: 1px solid #334155; margin-bottom: 20px; }
        input { padding: 12px; border-radius: 5px; border: 1px solid #475569; width: 300px; background: #0f172a; color: white; }
        button { padding: 12px 20px; border-radius: 5px; background: #2563eb; color: white; border: none; cursor: pointer; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
        th, td { border: 1px solid #334155; padding: 10px; text-align: left; }
        th { background: #0f172a; color: #94a3b8; }
        .highlight { color: #60a5fa; font-weight: bold; }
        .password { color: #f87171; font-family: monospace; }
        .btn-debug { background: #10b981; font-size: 11px; padding: 5px 10px; text-decoration: none; color: white; border-radius: 4px; }
        pre { background: #000; padding: 10px; border-radius: 5px; color: #0f0; font-size: 11px; overflow-x: auto; max-height: 300px; }
    </style>
</head>
<body>
    <h1>Explorador Maestro de Datos</h1>
    
    <div class="card">
        <form method="GET" style="display: flex; gap: 10px; flex-wrap: wrap;">
            <div>
                <label>Cliente/Nombre:</label><br>
                <input type="text" name="q" placeholder="Ej: Nora o 676..." value="<?php echo htmlspecialchars($_GET['q'] ?? '') ?>">
            </div>
            <div>
                <label># Factura:</label><br>
                <input type="text" name="f" placeholder="Ej: 5561..." value="<?php echo htmlspecialchars($_GET['f'] ?? '') ?>">
            </div>
            <div style="align-self: flex-end;">
                <button type="submit">BUSCAR</button>
                <a href="?" style="color: #94a3b8; margin-left:10px; text-decoration:none;">Limpiar</a>
            </div>
        </form>
    </div>

    <?php
    $apiKey = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
    $baseUrl = 'https://api.wisphub.app/api';

    // SI SE PIDE VER DETALLES DE UN USUARIO ESPECÍFICO
    if (isset($_GET['debug_id'])) {
        $id = $_GET['debug_id'];
        echo "<div class='card'>";
        echo "<h2>DIAGNÓSTICO PROFUNDO: ID $id</h2>";
        
        $cleanUser = str_replace('@wifi-rapidito', '', $_GET['u_debug'] ?? '');
        $queries = [
            'Facturas (?cliente=ID)' => "/facturas/?cliente=$id",
            'Facturas (?buscar=CEDULA)' => "/facturas/?buscar=" . ($_GET['c_debug'] ?? $id),
            'Facturas (?buscar=USUARIO)' => "/facturas/?buscar=" . urlencode($cleanUser),
            'Tickets (?servicio=ID)' => "/tickets/?servicio=$id"
        ];

        foreach ($queries as $label => $path) {
            echo "<h3>$label</h3>";
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $baseUrl . $path);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $apiKey]);
            $res = curl_exec($ch);
            curl_close($ch);
            
            $json = json_decode($res, true);
            $results = $json['results'] ?? [];
            $count = count($results);
            echo "<p>Resultados devueltos: <b>$count</b></p>";
            if ($count > 0) {
                echo "<p>Primer resultado (Estructura de datos):</p>";
                echo "<pre>" . json_encode($results[0], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "</pre>";
            } else {
                echo "<p>No hay datos devueltos por el API.</p>";
            }
        }
        echo "<br><a href='?' style='color: #60a5fa'>← Volver al buscador</a>";
        echo "</div>";
    }

    // BÚSQUEDA POR FACTURA
    if (isset($_GET['f']) && !empty($_GET['f'])) {
        $f = $_GET['f'];
        echo "<div class='card'>";
        echo "<h2>Buscando Factura: #$f</h2>";
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "$baseUrl/facturas/?buscar=" . urlencode($f));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $apiKey]);
        $response = curl_exec($ch);
        curl_close($ch);

        $json = json_decode($response, true);
        $results = $json['results'] ?? [];

        if (empty($results)) {
            echo "<p class='text-red-400'>No se encontró la factura #$f.</p>";
        } else {
            foreach ($results as $inv) {
                echo "<div style='border-left: 4px solid #2563eb; padding-left: 10px; margin-bottom: 20px;'>";
                echo "<h3>ID Factura: " . ($inv['id_factura'] ?? '-') . "</h3>";
                echo "<p>Número/Referencia: " . ($inv['numero'] ?? '-') . "</p>";
                echo "<p>Total: $" . ($inv['total'] ?? '-') . " | Estado: " . ($inv['estado'] ?? '-') . "</p>";
                echo "<p>Fecha: " . ($inv['fecha_emision'] ?? '-') . "</p>";
                echo "<h4>JSON Completo:</h4>";
                echo "<pre>" . json_encode($inv, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "</pre>";
                echo "</div><hr>";
            }
        }
        echo "</div>";
    }

    // LISTADO DE BÚSQUEDA...
        $q = $_GET['q'];
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "$baseUrl/clientes/?buscar=" . urlencode($q) . "&limit=20");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $apiKey]);
        $response = curl_exec($ch);
        curl_close($ch);

        $data = json_decode($response, true);
        $results = $data['results'] ?? [];

        if (empty($results)) {
            echo "<div class='card text-red-400'>No se encontró nada.</div>";
        } else {
            echo "<table>";
            echo "<tr><th>ID</th><th>Nombre</th><th>Usuario</th><th>Cédula</th><th>Estado</th><th>Clave</th><th>Acción</th></tr>";
            foreach ($results as $c) {
                echo "<tr>";
                echo "<td>" . ($c['id_servicio'] ?? '-') . "</td>";
                echo "<td>" . ($c['nombre'] ?? '-') . "</td>";
                echo "<td><span class='highlight'>" . ($c['usuario'] ?? '-') . "</span></td>";
                echo "<td>" . ($c['cedula'] ?? '-') . "</td>";
                echo "<td>" . ($c['estado'] ?? '-') . "</td>";
                echo "<td><span class='password'>" . ($c['password_servicio'] ?? '-') . "</span></td>";
                echo "<td><a href='?debug_id=".$c['id_servicio']."&u_debug=".urlencode($c['usuario'])."&c_debug=".urlencode($c['cedula'] ?? '')."' class='btn-debug'>VER FACTURAS</a></td>";
                echo "</tr>";
            }
            echo "</table>";
        }
    }
    ?>
</body>
</html>
