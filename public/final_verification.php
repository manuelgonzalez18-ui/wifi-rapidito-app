<?php
header("Content-Type: text/plain");
$base_url = "https://www.wifirapidito.com"; // Adjust if needed

echo "--- FINAL VERIFICATION ---\n";

// 1. Check Promise Permission Error
echo "Testing Promise Proxy (expecting 403/Permission Message):\n";
$res1 = file_get_contents("{$base_url}/proxy_promises.php");
echo "RESULT: " . substr($res1, 0, 200) . "...\n\n";

// 2. Check PDF Proxy
echo "Testing PDF Proxy for Nora's Invoice (5561):\n";
$ch = curl_init("{$base_url}/view_pdf.php?id=5561");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$header = substr($response, 0, $header_size);
$body = substr($response, $header_size);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "CODE: $code\n";
echo "HEADERS: $header\n";
echo "BODY SIZE: " . strlen($body) . " bytes\n";
if (strpos($header, 'application/pdf') !== false) {
    echo "SUCCESS: PDF streaming confirmed!\n";
} else {
    echo "FAILURE: Not a PDF or Error occurred.\n";
}
?>
