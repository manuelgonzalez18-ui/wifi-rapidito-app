<?php
/**
 * Diagnóstico v9: Verificar que el archivo REALMENTE se envía
 * 1. Verificar archivo existe y tiene contenido
 * 2. Enviar a httpbin.org para ver qué recibe el servidor
 * 3. Enviar a WispHub
 * 4. Verificar config PHP
 */
require_once 'config_wisphub.php';
header('Content-Type: text/html; charset=utf-8');
echo "<h2>🔍 Diagnóstico v9 — ¿Se está enviando el archivo?</h2>";

// ── 1. Verificar config PHP ──
echo "<h3>1. Configuración PHP</h3>";
echo "<table border='1' cellpadding='5'>";
echo "<tr><td>upload_max_filesize</td><td>" . ini_get('upload_max_filesize') . "</td></tr>";
echo "<tr><td>post_max_size</td><td>" . ini_get('post_max_size') . "</td></tr>";
echo "<tr><td>max_file_uploads</td><td>" . ini_get('max_file_uploads') . "</td></tr>";
echo "<tr><td>open_basedir</td><td>" . (ini_get('open_basedir') ?: 'NO RESTRINGIDO') . "</td></tr>";
echo "<tr><td>sys_get_temp_dir()</td><td>" . sys_get_temp_dir() . "</td></tr>";
echo "<tr><td>curl version</td><td>" . (curl_version()['version'] ?? '?') . "</td></tr>";
echo "<tr><td>PHP version</td><td>" . phpversion() . "</td></tr>";
echo "</table>";

// ── 2. Crear archivo y verificar ──
echo "<h3>2. Crear y verificar archivo</h3>";
$tmpFile = tempnam(sys_get_temp_dir(), 'test_upload_') . '.jpg';
$img = imagecreatetruecolor(400, 300);
imagefill($img, 0, 0, imagecolorallocate($img, 30, 100, 200));
imagestring($img, 5, 100, 130, 'COMPROBANTE REAL', imagecolorallocate($img, 255, 255, 255));
imagestring($img, 4, 120, 160, date('Y-m-d H:i:s'), imagecolorallocate($img, 200, 200, 200));
imagejpeg($img, $tmpFile, 90);
imagedestroy($img);

$fileExists = file_exists($tmpFile);
$fileSize = $fileExists ? filesize($tmpFile) : 0;
$fileContent = $fileExists ? file_get_contents($tmpFile) : false;
$fileMD5 = $fileContent !== false ? md5($fileContent) : 'ERROR';
$fileReadable = is_readable($tmpFile);

echo "<table border='1' cellpadding='5'>";
echo "<tr><td>Ruta</td><td><code>$tmpFile</code></td></tr>";
echo "<tr><td>¿Existe?</td><td>" . ($fileExists ? '✅ SÍ' : '❌ NO') . "</td></tr>";
echo "<tr><td>¿Readable?</td><td>" . ($fileReadable ? '✅ SÍ' : '❌ NO') . "</td></tr>";
echo "<tr><td>Tamaño</td><td>$fileSize bytes</td></tr>";
echo "<tr><td>MD5</td><td><code>$fileMD5</code></td></tr>";
echo "<tr><td>Contenido válido (JFIF header)</td><td>" . 
     (substr($fileContent, 0, 2) === "\xFF\xD8" ? '✅ JPEG válido' : '❌ No es JPEG') . "</td></tr>";
echo "</table>";

// ── 3. Enviar a httpbin.org para verificar multipart ──
echo "<h3>3. Test: Enviar archivo a httpbin.org (echo server)</h3>";

$testPayload = [
    'test_field' => 'hello_wisphub',
    'test_file' => new CURLFile($tmpFile, 'image/jpeg', 'comprobante_test.jpg')
];

$ch = curl_init('https://httpbin.org/post');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $testPayload);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
$httpbinResp = curl_exec($ch);
$httpbinCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$httpbinErr = curl_error($ch);
curl_close($ch);

echo "<p>httpbin.org → HTTP <b>$httpbinCode</b></p>";
if ($httpbinErr) echo "<p style='color:red'>Error: $httpbinErr</p>";

if ($httpbinResp) {
    $httpbinData = json_decode($httpbinResp, true);
    $receivedFiles = $httpbinData['files'] ?? [];
    $receivedForm = $httpbinData['form'] ?? [];
    
    echo "<p>Campos recibidos: <code>" . implode(', ', array_keys($receivedForm)) . "</code></p>";
    echo "<p>Archivos recibidos: <code>" . implode(', ', array_keys($receivedFiles)) . "</code></p>";
    
    if (!empty($receivedFiles['test_file'])) {
        $receivedSize = strlen($receivedFiles['test_file']);
        echo "<p style='color:green'>✅ httpbin RECIBIÓ el archivo ($receivedSize chars en base64/data)</p>";
    } else {
        echo "<p style='color:red'>❌ httpbin NO recibió archivo</p>";
    }
} else {
    echo "<p style='color:orange'>⚠️ httpbin no disponible</p>";
}

// ── 4. Enviar a WispHub SIN archivo (baseline 400) ──
echo "<h3>4. WispHub SIN archivo (debería dar 400)</h3>";
$baseUrl = WISPHUB_API_URL . "facturas/reportar-pago/5867/";

$ch = curl_init($baseUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, [
    'forma_pago' => '16749',
    'fecha_pago' => '2026-02-10',
    'referencia' => 'NOFILE-' . time(),
    'comprobante_pago' => 'Sin archivo',
    'nombre_user' => WISPHUB_STAFF_USER,
]);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . WISPHUB_TOKEN]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
$resp4 = curl_exec($ch);
$code4 = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$color4 = $code4 == 400 ? 'green' : 'red';
echo "<p>HTTP: <span style='color:$color4;font-weight:bold'>$code4</span> (esperado: 400)</p>";
echo "<pre>" . htmlspecialchars($resp4) . "</pre>";

// ── 5. Enviar a WispHub CON archivo + verbose ──
echo "<h3>5. WispHub CON archivo (capturando request headers)</h3>";

$payload5 = [
    'forma_pago' => '16749',
    'fecha_pago' => '2026-02-10',
    'referencia' => 'WITHFILE-' . time(),
    'comprobante_pago' => 'Con archivo adjunto',
    'nombre_user' => WISPHUB_STAFF_USER,
    'comprobante_pago_archivo' => new CURLFile($tmpFile, 'image/jpeg', 'comprobante_test.jpg')
];

// Capturar request headers enviados
$sentHeaders = [];
$ch = curl_init($baseUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload5);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . WISPHUB_TOKEN]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_VERBOSE, true);

// Capturar verbose output
$verbose = fopen('php://temp', 'w+');
curl_setopt($ch, CURLOPT_STDERR, $verbose);

// Capturar request info
curl_setopt($ch, CURLOPT_HEADER, true);

$resp5 = curl_exec($ch);
$code5 = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$requestSize = curl_getinfo($ch, CURLINFO_REQUEST_SIZE);
$uploadSize = curl_getinfo($ch, CURLINFO_SIZE_UPLOAD);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

// Leer verbose output
rewind($verbose);
$verboseOutput = stream_get_contents($verbose);
fclose($verbose);

$respHeaders = substr($resp5, 0, $headerSize);
$respBody = substr($resp5, $headerSize);

$color5 = $code5 == 200 ? 'green' : ($code5 == 400 ? 'orange' : 'red');
echo "<p>HTTP: <span style='color:$color5;font-weight:bold;font-size:24px'>$code5</span></p>";
echo "<table border='1' cellpadding='5'>";
echo "<tr><td>Request size</td><td>$requestSize bytes</td></tr>";
echo "<tr><td>Upload size</td><td>$uploadSize bytes</td></tr>";
echo "<tr><td>File size original</td><td>$fileSize bytes</td></tr>";
echo "<tr><td>Upload > File?</td><td>" . ($uploadSize > $fileSize ? '✅ SÍ (incluye campos + archivo)' : '❌ NO — archivo no se envió') . "</td></tr>";
echo "</table>";

echo "<p>Response headers:</p><pre style='font-size:11px'>" . htmlspecialchars($respHeaders) . "</pre>";
echo "<p>Response body:</p><pre>" . htmlspecialchars($respBody) . "</pre>";

echo "<p>Verbose (request details):</p>";
echo "<pre style='background:#1a1a2e;color:#0ff;padding:10px;max-height:200px;overflow:auto;font-size:11px'>" . 
     htmlspecialchars(str_replace(WISPHUB_TOKEN, 'KEY-HIDDEN', $verboseOutput)) . "</pre>";

// Limpiar
unlink($tmpFile);
echo "<hr><p>✅ Diagnóstico v9 completo — " . date('Y-m-d H:i:s') . "</p>";
?>
