<?php
// wisphub_auth.php - Authentication proxy for Wisphub client portal
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);
$username = $input['username'] ?? '';
$password = $input['password'] ?? '';

if (empty($username) || empty($password)) {
    http_response_code(400);
    echo json_encode(['error' => 'Username and password required']);
    exit();
}

// Step 1: Get CSRF token from login page
$loginUrl = 'https://clientes.portalinternet.app/accounts/login/?empresa=wifi-rapidito';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $loginUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_NOBODY, false);

$response = curl_exec($ch);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$headers = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);
curl_close($ch);

// Extract CSRF token from HTML
preg_match('/name=["\']csrfmiddlewaretoken["\'] value=["\'](.*?)["\']/', $body, $matches);
$csrfToken = $matches[1] ?? '';

// Extract session cookie
preg_match('/Set-Cookie: csrftoken=(.*?);/', $headers, $cookieMatches);
$csrfCookie = $cookieMatches[1] ?? '';

if (empty($csrfToken) || empty($csrfCookie)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to obtain CSRF token']);
    exit();
}

// Step 2: Attempt login with credentials
$postData = http_build_query([
    'csrfmiddlewaretoken' => $csrfToken,
    'login' => $username,
    'password' => $password,
    'empresa' => '@wifi-rapidito',
    'remember' => '1'
]);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $loginUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false); // Don't follow redirects
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/x-www-form-urlencoded',
    'Cookie: csrftoken=' . $csrfCookie,
    'Referer: ' . $loginUrl
]);

$loginResponse = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$responseHeaders = substr($loginResponse, 0, $headerSize);
$responseBody = substr($loginResponse, $headerSize);
curl_close($ch);

// Check if login was successful (redirect or 200 OK without error message)
$isSuccess = false;
$sessionId = '';

if ($httpCode == 302 || $httpCode == 301) {
    // Redirect typically means successful login
    $isSuccess = true;
    
    // Extract session cookie
    preg_match('/Set-Cookie: sessionid=(.*?);/', $responseHeaders, $sessionMatches);
    $sessionId = $sessionMatches[1] ?? '';
} elseif ($httpCode == 200) {
    // Check if there's an error message in the response
    if (strpos($responseBody, 'NO ENCONTRADO') === false && 
        strpos($responseBody, 'incorrecta') === false) {
        $isSuccess = true;
    }
}

if ($isSuccess && !empty($sessionId)) {
    // Login successful - now fetch user data
    $dashboardUrl = 'https://clientes.portalinternet.app/dashboard/';
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $dashboardUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Cookie: sessionid=' . $sessionId . '; csrftoken=' . $csrfCookie
    ]);
    
    $dashboardHtml = curl_exec($ch);
    curl_close($ch);
    
    // Extract user info from dashboard (simplified - you can enhance this)
    $userData = [
        'role' => 'client',
        'username' => $username,
        'authenticated' => true,
        'session' => $sessionId
    ];
    
    echo json_encode([
        'success' => true,
        'user' => $userData,
        'token' => 'wisphub-' . $sessionId
    ]);
} else {
    // Login failed
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Usuario o Cédula no encontrado en Wisphub. Verifique que el Usuario o Cédula sea correcto.'
    ]);
}
?>
