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

// Normalize username - add @wifi-rapidito if needed
if (!strpos($username, '@')) {
    // If numeric (cedula), add suffix
    if (preg_match('/^\d+$/', $username)) {
        $username = $username . '@wifi-rapidito';
    } else {
        $username = $username . '@wifi-rapidito';
    }
}

// Step 1: Get CSRF token from login page
$loginUrl = 'https://clientes.portalinternet.app/accounts/login/?empresa=wifi-rapidito';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $loginUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_NOBODY, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 15);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

$response = curl_exec($ch);
$curlError = curl_error($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if ($response === false || $httpCode !== 200) {
    curl_close($ch);
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to obtain CSRF token',
        'debug' => [
            'curl_error' => $curlError,
            'http_code' => $httpCode,
            'url' => $loginUrl
        ]
    ]);
    exit();
}

$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$headers = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);
curl_close($ch);

// Extract CSRF token from HTML - try multiple patterns
$csrfToken = '';
if (preg_match('/name=["\']csrfmiddlewaretoken["\'] value=["\'](.*?)["\']/', $body, $matches)) {
    $csrfToken = $matches[1];
} elseif (preg_match('/value=["\'](.*?)["\'] name=["\']csrfmiddlewaretoken["\']/', $body, $matches)) {
    $csrfToken = $matches[1];
}

// Extract session cookie
preg_match('/Set-Cookie: csrftoken=(.*?);/', $headers, $cookieMatches);
$csrfCookie = $cookieMatches[1] ?? '';

if (empty($csrfToken) || empty($csrfCookie)) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to obtain CSRF token',
        'debug' => [
            'csrf_token_found' => !empty($csrfToken),
            'csrf_cookie_found' => !empty($csrfCookie),
            'body_length' => strlen($body)
        ]
    ]);
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
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/x-www-form-urlencoded',
    'Cookie: csrftoken=' . $csrfCookie,
    'Referer: ' . $loginUrl,
    'Origin: https://clientes.portalinternet.app'
]);

$loginResponse = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$responseHeaders = substr($loginResponse, 0, $headerSize);
$responseBody = substr($loginResponse, $headerSize);
curl_close($ch);

// Check if login was successful
$isSuccess = false;
$sessionId = '';

if ($httpCode == 302 || $httpCode == 301) {
    // Redirect means successful login
    $isSuccess = true;
    
    // Extract session cookie
    preg_match('/Set-Cookie: sessionid=(.*?);/', $responseHeaders, $sessionMatches);
    $sessionId = $sessionMatches[1] ?? '';
} elseif ($httpCode == 200) {
    // Check if there's an error message
    if (strpos($responseBody, 'NO ENCONTRADO') === false && 
        strpos($responseBody, 'incorrecta') === false &&
        strpos($responseBody, 'SERVICIO NO ENCONTRADO') === false) {
        $isSuccess = true;
    }
}

if ($isSuccess && !empty($sessionId)) {
    // Login successful
    $userData = [
        'role' => 'client',
        'username' => str_replace('@wifi-rapidito', '', $username),
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
        'error' => 'Credenciales inválidas. Verifique su usuario/cédula y contraseña.'
    ]);
}
?>
