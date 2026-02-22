<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

echo "<h1>PHP Environment Diagnostics + Test Form</h1>";

// TEST FORM FOR MANUAL UPLOAD
echo '<div style="background: #f0f0f0; padding: 20px; border: 2px solid #ccc; border-radius: 8px; margin-bottom: 20px;">';
echo '<h3>Manual Upload Test</h3>';
echo '<form method="POST" enctype="multipart/form-data">';
echo 'Select File: <input type="file" name="test_file" required><br><br>';
echo '<input type="submit" value="Upload and Inspect" style="padding: 10px 20px; cursor: pointer;">';
echo '</form>';
echo '</div>';

echo "<h2>PHP Configuration</h2>";
echo "<ul>";
echo "<li><b>upload_max_filesize:</b> " . ini_get('upload_max_filesize') . "</li>";
echo "<li><b>post_max_size:</b> " . ini_get('post_max_size') . "</li>";
echo "<li><b>memory_limit:</b> " . ini_get('memory_limit') . "</li>";
echo "<li><b>file_uploads:</b> " . ini_get('file_uploads') . "</li>";
echo "</ul>";

echo "<h2>Request Info</h2>";
echo "<ul>";
echo "<li><b>METHOD:</b> " . $_SERVER['REQUEST_METHOD'] . "</li>";
echo "<li><b>CONTENT_TYPE:</b> " . ($_SERVER['CONTENT_TYPE'] ?? 'N/A') . "</li>";
echo "</ul>";

echo "<h2>FILES Array</h2>";
echo "<pre>";
print_r($_FILES);
echo "</pre>";

echo "<h2>POST Array (Keys only)</h2>";
echo "<pre>";
print_r(array_keys($_POST));
echo "</pre>";

echo "<h2>Directory Write Test</h2>";
$testFile = __DIR__ . '/api_logs.txt';
if (file_put_contents($testFile, "[" . date('Y-m-d H:i:s') . "] Diagnostic write test successful.\n", FILE_APPEND)) {
    echo "<p style='color: green;'>SUCCESS: Directory is writable (Writing to api_logs.txt).</p>";
} else {
    echo "<p style='color: red;'>ERROR: Directory is NOT writable!</p>";
}
?>
