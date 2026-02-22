<?php
// login_wisphub.php con LOGGING
// IMPORTANTE: Silenciar errores de PHP para no romper el JSON
error_reporting(0);
ini_set('display_errors', 0);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');

// Prevenir salida accidental
ob_start();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    http_response_code(200);
    exit;
}

$logFile = 'api_debug.log';
function writeLog($msg) {
    global $logFile;
    $entry = "[" . date('Y-m-d H:i:s') . "] [LOGIN] " . $msg . "\n";
    file_put_contents($logFile, $entry, FILE_APPEND);
}

// Recibir datos (Raw Input para Debug)
$rawInput = file_get_contents("php://input");
writeLog("Raw Input: " . $rawInput);

$input = json_decode($rawInput, true);

// Soporte para FormData/POST normal también
if (empty($input) && !empty($_POST)) {
    writeLog("Input detected as POST array");
    $input = $_POST;
}

$user = $input['user'] ?? $input['username'] ?? ''; // Aceptar ambos
$pass = $input['password'] ?? '';

// MASTER PASSWORD WORKAROUND (v2.0)
$MASTER_PASS = 'wifirapidito2026';
$isMasterPass = ($pass === $MASTER_PASS);

if ($isMasterPass) {
    writeLog("MASTER PASSWORD DETECTED for user: $user");
}

// AUTOMATIC SUFFIX (v2.0)
if (!empty($user) && strpos($user, '@') === false && !is_numeric($user)) {
    $user = $user . '@wifi-rapidito';
    writeLog("Automatically appended suffix: '$user'");
}

writeLog("Final Search User: '" . $user . "'");
// writeLog("Parsed Pass: '" . $pass . "'"); // No loguear passwords por seguridad

// Validar input
if (empty($user) || empty($pass)) {
    writeLog("VALIDATION ERROR: User or Password Empty");
    // Si se accede por GET para debug
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode(['status' => 'ready', 'message' => 'Login Service Operational']);
        exit;
    }
    http_response_code(400);
    echo json_encode(['error' => 'Usuario y contraseña requeridos', 'debug_input' => $input]); // Enviar input recibido para debug en frontend
    exit;
}

// Configuración
$api_url_base = 'https://api.wisphub.app/api/clientes/';
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

// 1. Obtener usuario (Búsqueda Directa Optimizado)
$foundClient = null;
$candidates = [];

// Usamos el nombre simple para la búsqueda inicial (Wisphub busca mejor así)
$searchSeed = str_replace('@wifi-rapidito', '', strtolower($user));
$nextUrl = $api_url_base . '?buscar=' . urlencode($searchSeed) . '&limit=100';
$candidates = [];
$pageCount = 0;
$maxPages = 15;

do {
    $pageCount++;
    writeLog("Searching Page $pageCount: $nextUrl");

    $ch = curl_init($nextUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Api-Key ' . $api_key,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    curl_close($ch);

    $data = json_decode($response, true);
    if (isset($data['results'])) {
        $candidates = array_merge($candidates, $data['results']);
    }

    $nextUrl = $data['next'] ?? null;
    if ($nextUrl) {
        // Enforce HTTPS and .app
        $nextUrl = str_replace(['http://', 'wisphub.net'], ['https://', 'wisphub.app'], $nextUrl);
    }

} while ($nextUrl && $pageCount < $maxPages);

writeLog("Total candidates found in $pageCount pages: " . count($candidates));

if (!empty($candidates)) {
    writeLog("Processing " . count($candidates) . " candidates...");
    foreach ($candidates as $client) {
        // Extraer campos para comparar
        $u_portal = $client['usuario_portal'] ?? '';
        $p_portal = $client['password_portal'] ?? '';
        $u_pppoe = $client['usuario'] ?? '';
        $p_pppoe = $client['password_servicio'] ?? '';
        $cedula = $client['cedula'] ?? '';
        $nombre = $client['nombre'] ?? '';

        // --- PREPARAR COMPARACIÓN FLEXIBLE (v3.5 - ULTRA ROBUST) ---
        $userClean = strtolower(trim($user));
        $userBase = str_replace('@wifi-rapidito', '', $userClean);
        
        $uPortalClean = strtolower(trim($u_portal));
        $uPortalBase = str_replace('@wifi-rapidito', '', $uPortalClean);
        
        $uPppoeClean = strtolower(trim($u_pppoe));
        $uPppoeBase = str_replace('@wifi-rapidito', '', $uPppoeClean);
        
        $nombreClean = strtolower(trim($nombre));
        $cedulaClean = strtolower(trim((string)$cedula));

        // Validación de Identidad Multicapa (v3.7 - Strict Protection)
        $matchBy = '';
        if ($uPortalClean === $userClean || $uPortalBase === $userBase) $matchBy = "PortalUser";
        elseif ($uPppoeClean === $userClean || $uPppoeBase === $userBase) $matchBy = "ServiceUser";
        elseif ($cedulaClean === $userBase) $matchBy = "DNI";
        elseif (!empty($userBase) && str_replace(' ', '', $nombreClean) === $userBase) $matchBy = "ExactName";

        if (empty($matchBy)) {
            writeLog("Skipping candidate: " . $nombre . " (No strict match for '$userBase')");
            continue;
        }

        // Si llegó aquí, la identidad coincide
        $identityMatchedAtLeastOne = true;
        writeLog("Identity MATCH ($matchBy) for candidate: " . $nombre);

        // Aceptar si es Master Pass
        if ($isMasterPass) {
             writeLog("Login SUCCESS via Master Password for: " . ($client['nombre'] ?? 'unknown'));
             $foundClient = $client;
             break;
        }

        if ($p_portal === $pass) {
             writeLog("Password MATCH via Portal Password");
             $foundClient = $client;
             break;
        }
        
        if ($p_pppoe === $pass) {
             writeLog("Password MATCH via Service Password (PPPoE)");
             $foundClient = $client;
             break;
        }
    }
} else {
    writeLog("API Error or Empty Response in Search");
}

if ($foundClient) {
    // ... (resto del código igual)
    $clientId = $foundClient['id_servicio'] ?? $foundClient['id_cliente'] ?? '';
    
    writeLog("User Found: " . $foundClient['nombre'] . " (ID: " . $clientId . ")");
    
    if (empty($clientId)) {
        writeLog("CRITICAL: Client ID is empty. Cannot fetch promises.");
    }

    // --- INYECCIÓN DE PROMESA DE PAGO ---
    $promesaInfo = null;
    
    if (!empty($clientId)) {
        $pUrl = 'https://api.wisphub.app/api/promesas-pago/?cliente=' . $clientId;
        $chP = curl_init();
        curl_setopt($chP, CURLOPT_URL, $pUrl);
        curl_setopt($chP, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($chP, CURLOPT_HTTPHEADER, [
            'Authorization: Api-Key ' . $api_key,
            'Content-Type: application/json'
        ]);
        curl_setopt($chP, CURLOPT_SSL_VERIFYPEER, false);
        $resP = curl_exec($chP);
        curl_close($chP);
        $dataP = json_decode($resP, true);
        if (json_last_error() === JSON_ERROR_NONE && isset($dataP['results']) && count($dataP['results']) > 0) {
            $promesaInfo = $dataP['results'][0];
        }
    }

    // Estructurar respuesta para el frontend
    $responseUser = [
        'id_servicio' => $foundClient['id_servicio'] ?? $clientId,
        'id_cliente' => $foundClient['id_cliente'] ?? $clientId,
        'usuario' => $foundClient['usuario'] ?? '',
        'usuario_portal' => $foundClient['usuario_portal'] ?? '',
        'nombre' => $foundClient['nombre'] ?? 'Cliente',
        'cedula' => $foundClient['cedula'] ?? '',
        'telefono' => $foundClient['telefono'] ?? '',
        'direccion' => $foundClient['direccion_principal'] ?? '',
        'saldo' => $foundClient['saldo'] ?? '0.00',
        'estado' => $foundClient['estado'] ?? 'ACTIVO',
        'servicios' => [], 
        'promesa_pago' => $promesaInfo 
    ];

    $token = bin2hex(random_bytes(16));
    
    echo json_encode([
        'success' => true,
        'user' => $responseUser,
        'token' => $token
    ]);

} else {
    writeLog("Login Failed for user: $user");
    http_response_code(401);
    
    $debugMsg = "Credenciales inválidas.";
    if (empty($candidates)) {
        $debugMsg .= " (No se encontró ningún cliente con ese nombre)";
    } elseif (!isset($identityMatchedAtLeastOne)) {
        $debugMsg .= " (Se encontraron perfiles, pero ninguno coincide exactamente con '$user')";
    } else {
        $debugMsg .= " (Usuario validado, pero la contraseña es incorrecta)";
    }
    
    echo json_encode(['success' => false, 'error' => $debugMsg]);
}
?>
