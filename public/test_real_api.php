<?php
/**
 * Test v9: Cambiar User-Agent para simular Postman / browser real
 */
require_once 'config_wisphub.php';

header('Content-Type: text/plain; charset=utf-8');
echo "=== TEST v9: USER-AGENT ===\n\n";

$img = imagecreatetruecolor(300, 200);
$bg = imagecolorallocate($img, 40, 90, 160);
imagefill($img, 0, 0, $bg);
$white = imagecolorallocate($img, 255, 255, 255);
imagestring($img, 5, 60, 80, 'COMPROBANTE', $white);
$tmpFile = '/tmp/comprobante_ua.jpg';
imagejpeg($img, $tmpFile, 90);
imagedestroy($img);
echo "Imagen: " . filesize($tmpFile) . " bytes\n\n";

$invoiceId = 6397;

$payload = [
    'forma_pago'       => '16749',
    'fecha_pago'       => '2026-02-21',
    'referencia'       => '321321321',
    'comprobante_pago' => 'Test v9 user agent',
    'nombre_user'      => WISPHUB_STAFF_USER,
    'comprobante_pago_archivo' => new CURLFile($tmpFile, 'image/jpeg', 'comprobante.jpg')
];

$url = "https://api.wisphub.app/api/facturas/reportar-pago/$invoiceId/";

function doUA($url, $payload, $token, $userAgent, $label) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Api-Key ' . $token,
        'Accept: application/json',
        'User-Agent: ' . $userAgent
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    $r = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    echo "=== $label ===\n";
    echo "   User-Agent: $userAgent\n";
    echo "   HTTP: $code | Response: $r\n\n";
}

doUA($url, $payload, WISPHUB_TOKEN,
    'PostmanRuntime/7.43.0',
    'A: Postman Runtime');

doUA($url, $payload, WISPHUB_TOKEN,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'B: Chrome Browser');

doUA($url, $payload, WISPHUB_TOKEN,
    'python-requests/2.31.0',
    'C: Python requests');

doUA($url, $payload, WISPHUB_TOKEN,
    'curl/8.0.0',
    'D: curl CLI');

doUA($url, $payload, WISPHUB_TOKEN,
    'insomnia/9.0.0',
    'E: Insomnia');

// Sin User-Agent (default PHP)
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . WISPHUB_TOKEN]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$r = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
echo "=== F: Sin User-Agent (PHP default) ===\n";
echo "   HTTP: $code | Response: $r\n";

unlink($tmpFile);
echo "\n=== TESTS COMPLETOS ===\n";
?>
