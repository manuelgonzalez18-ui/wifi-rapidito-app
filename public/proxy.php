<?php
// proxy.php - Handles API requests on Hostinger (Apache/PHP)

// Enable CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuration
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$base_url = 'https://api.wisphub.app/api';

// Get the path from the query string (rewrite rule should pass it)
$path = isset($_GET['path']) ? $_GET['path'] : '';

// If path is empty, try to extract from REQUEST_URI if rewrite failed to pass it cleanly
if (empty($path)) {
    $request_uri = $_SERVER['REQUEST_URI'];
    // Remove /api/ prefix if present
    $path = preg_replace('#^/api/#', '', $request_uri);
    // Remove query string from path
    $path = strtok($path, '?');
}

// Construct Target URL
// Ensure trailing slash if it was in the original request (Wisphub needs it)
// But wait, our client adds it. Let's just append path.
$target_url = $base_url . '/' . ltrim($path, '/');

// Initialize cURL
$ch = curl_init();

// Set URL
curl_setopt($ch, CURLOPT_URL, $target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

// Set Method
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);

// Set Headers
$headers = [
    "Authorization: Api-Key " . $api_key,
    "Content-Type: application/json",
    "Accept: application/json"
];
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

// Set Body (for POST/PUT)
$input_data = file_get_contents("php://input");
if (!empty($input_data)) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $input_data);
}

// Execute
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$curl_error = curl_error($ch);

curl_close($ch);

// Set Response Headers
header("Content-Type: " . $content_type);
http_response_code($http_code);

// Return Response
if ($response === false) {
    echo json_encode(["error" => "Proxy Error: " . $curl_error]);
} else {
    echo $response;
}
?>
