<?php
/**
 * banesco_api.php
 * Adaptador Banesco para validación automática de transferencias.
 * Mantiene el contrato usado en producción: checkTransaction($reference, $options).
 */

$banescoPrivateConfig = dirname(__DIR__) . '/.wifi-rapidito-private/payment_secrets.php';
if (is_file($banescoPrivateConfig)) {
    require_once $banescoPrivateConfig;
}

$banescoEnv = strtoupper(trim((string) (getenv('BANESCO_ENV') ?: 'PROD')));
if (!in_array($banescoEnv, ['QA', 'PROD'], true)) {
    $banescoEnv = 'PROD';
}

$privateClientId = '';
$privateClientSecret = '';
if ($banescoEnv === 'PROD') {
    if (defined('BANESCO_PRIVATE_CLIENT_ID_PROD')) $privateClientId = BANESCO_PRIVATE_CLIENT_ID_PROD;
    if (defined('BANESCO_PRIVATE_CLIENT_SECRET_PROD')) $privateClientSecret = BANESCO_PRIVATE_CLIENT_SECRET_PROD;
} else {
    if (defined('BANESCO_PRIVATE_CLIENT_ID_QA')) $privateClientId = BANESCO_PRIVATE_CLIENT_ID_QA;
    if (defined('BANESCO_PRIVATE_CLIENT_SECRET_QA')) $privateClientSecret = BANESCO_PRIVATE_CLIENT_SECRET_QA;
}
if ($privateClientId === '' && defined('BANESCO_PRIVATE_CLIENT_ID')) $privateClientId = BANESCO_PRIVATE_CLIENT_ID;
if ($privateClientSecret === '' && defined('BANESCO_PRIVATE_CLIENT_SECRET')) $privateClientSecret = BANESCO_PRIVATE_CLIENT_SECRET;

$banescoClientId = trim((string) (getenv('BANESCO_CLIENT_ID') ?: $privateClientId));
$banescoClientSecret = trim((string) (getenv('BANESCO_CLIENT_SECRET') ?: $privateClientSecret));
if ($banescoClientId === '' || $banescoClientSecret === '') {
    throw new RuntimeException('Credenciales Banesco no configuradas.');
}

define('BANESCO_ENV', $banescoEnv);
define('BANESCO_SSO_QA', 'https://sso-sso-project.apps.desplakur3.desintra.banesco.com/auth/realms/realm-api-qa/protocol/openid-connect/token');
define('BANESCO_API_QA', 'https://sid-validador-consulta-de-transacciones-api-qa-production.apps.desplakur3.desintra.banesco.com');
define('BANESCO_SSO_PROD', 'https://sso-sso-project.apps.proplakur.banesco.com/auth/realms/realm-api-prd/protocol/openid-connect/token');
define('BANESCO_API_PROD', 'https://sid-validador-consulta-de-transacciones-3scale-apicast-61e25ec.apps.proplakur.banesco.com');
define('BANESCO_SSO_URL', BANESCO_ENV === 'PROD' ? BANESCO_SSO_PROD : BANESCO_SSO_QA);
define('BANESCO_API_URL', BANESCO_ENV === 'PROD' ? BANESCO_API_PROD : BANESCO_API_QA);
define('BANESCO_CLIENT_ID', $banescoClientId);
define('BANESCO_CLIENT_SECRET', $banescoClientSecret);
define('BANESCO_TOKEN_CACHE', sys_get_temp_dir() . '/banesco_token_' . strtolower(BANESCO_ENV) . '.json');

class BanescoAPI {
    private static function getToken() {
        if (file_exists(BANESCO_TOKEN_CACHE)) {
            $data = json_decode((string) file_get_contents(BANESCO_TOKEN_CACHE), true);
            if (isset($data['access_token'], $data['expires_at']) && (int) $data['expires_at'] > time()) {
                return $data['access_token'];
            }
        }

        $ch = curl_init(BANESCO_SSO_URL);
        $postData = http_build_query([
            'grant_type' => 'password',
            'username' => BANESCO_CLIENT_ID,
            'password' => BANESCO_CLIENT_SECRET,
            'scope' => 'CONSULTA DE TRANSACCIONES',
        ]);
        $basicAuth = base64_encode(BANESCO_CLIENT_ID . ':' . BANESCO_CLIENT_SECRET);

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $postData,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/x-www-form-urlencoded',
                'Authorization: Basic ' . $basicAuth,
            ],
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_TIMEOUT => 15,
        ]);

        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error !== '') {
            throw new RuntimeException('Error cURL Banesco SSO: ' . $error);
        }
        if ($httpCode !== 200 || !$response) {
            throw new RuntimeException('Error obteniendo token Banesco SSO. Code: ' . $httpCode . '.');
        }

        $tokenData = json_decode((string) $response, true);
        if (!is_array($tokenData) || empty($tokenData['access_token'])) {
            throw new RuntimeException('Token de Banesco no encontrado en la respuesta.');
        }

        $expiresIn = max(120, (int) ($tokenData['expires_in'] ?? 300));
        @file_put_contents(BANESCO_TOKEN_CACHE, json_encode([
            'access_token' => $tokenData['access_token'],
            'expires_at' => time() + $expiresIn - 60,
        ]));
        return $tokenData['access_token'];
    }

    public static function checkTransaction($referenceNumber, $options = []) {
        if (!is_array($options)) {
            $options = [];
        }

        $token = self::getToken();
        $accountId = trim((string) ($options['accountId'] ?? '01340332563321061868'));
        $amount = isset($options['amount']) && is_numeric($options['amount']) ? (float) $options['amount'] : null;
        $phoneNum = trim((string) ($options['phone_emisor'] ?? $options['phoneNum'] ?? ''));

        if ($phoneNum !== '') {
            $phoneNum = preg_replace('/\D/', '', $phoneNum);
            if (strpos($phoneNum, '0') === 0) {
                $phoneNum = '58' . substr($phoneNum, 1);
            } elseif (strlen($phoneNum) === 10) {
                $phoneNum = '58' . $phoneNum;
            }
        } else {
            $phoneNum = null;
        }

        $bankIdRaw = trim((string) ($options['banco_origen'] ?? $options['bankId'] ?? ''));
        $bankId = $bankIdRaw !== '' ? preg_replace('/\D/', '', $bankIdRaw) : '';
        if ($bankId === '' && $bankIdRaw !== '') {
            $bankNames = [
                'venezuela' => '0102', 'mercantil' => '0105', 'provincial' => '0108',
                'bancaribe' => '0114', 'exterior' => '0115', 'banesco' => '0134',
                'bfc' => '0151', 'tesoro' => '0163', 'activo' => '0171',
                'bancamiga' => '0172', 'bicentenario' => '0175', 'plaza' => '0138',
                'del sur' => '0157',
            ];
            $lower = strtolower($bankIdRaw);
            foreach ($bankNames as $name => $code) {
                if (strpos($lower, $name) !== false) {
                    $bankId = $code;
                    break;
                }
            }
        }
        if ($bankId === '' && $accountId === '01340332563321061868') {
            $bankId = '0134';
        }

        $paymentDate = trim((string) ($options['payment_date'] ?? $options['paymentDate'] ?? date('Y-m-d')));
        $timestamp = strtotime($paymentDate);
        $formattedDate = $timestamp === false ? date('Y-m-d') : date('Y-m-d', $timestamp);

        $endpointSuffix = BANESCO_ENV === 'PROD'
            ? '/financial-account/transactions'
            : '/transactions/financial-account/transactions';
        $url = BANESCO_API_URL . $endpointSuffix;
        $payload = [
            'dataRequest' => [
                'device' => [
                    'description' => 'Wifi Rapidito Portal',
                    'ipAddress' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
                    'type' => 'Web',
                ],
                'transaction' => [
                    'referenceNumber' => (string) $referenceNumber,
                    'accountId' => $accountId,
                    'amount' => $amount,
                    'startDt' => $formattedDate,
                    'phoneNum' => $phoneNum,
                    'bankId' => $bankId,
                ],
            ],
        ];

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $token,
                'Content-Type: application/json',
                'Accept: application/json',
            ],
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_TIMEOUT => 20,
        ]);

        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error !== '') {
            throw new RuntimeException('Error cURL Banesco API: ' . $error);
        }

        $data = json_decode((string) $response, true);
        $httpStatus = is_array($data) ? ($data['httpStatus'] ?? null) : null;
        if (!is_array($httpStatus)) {
            throw new RuntimeException('Respuesta inválida de API Banesco. Code: ' . $httpCode . '.');
        }

        if (($httpStatus['statusCode'] ?? '') === '200' && ($httpStatus['statusDesc'] ?? '') === 'OK') {
            $transactions = $data['dataResponse']['transactionDetail'] ?? [];
            if (!is_array($transactions)) $transactions = [];
            $creditTxn = null;
            foreach ($transactions as $txn) {
                if (is_array($txn) && ($txn['trnType'] ?? '') === 'CR') {
                    $creditTxn = $txn;
                    break;
                }
            }
            if ($creditTxn === null && isset($transactions[0]) && is_array($transactions[0])) {
                $creditTxn = $transactions[0];
            }
            $creditTxn = is_array($creditTxn) ? $creditTxn : [];
            return [
                'success' => true,
                'amount' => (float) ($creditTxn['amount'] ?? 0),
                'date' => (string) ($creditTxn['trnDate'] ?? ''),
                'concept' => trim((string) ($creditTxn['concept'] ?? '')),
                'refNum' => (string) ($creditTxn['referenceNumber'] ?? ''),
                'data' => $data['dataResponse'] ?? null,
            ];
        }

        if (($httpStatus['statusCode'] ?? '') === '70001') {
            return [
                'success' => false,
                'message' => 'No se encontraron resultados para la referencia indicada. Verifique que la transferencia a Banesco sea exitosa.',
            ];
        }
        if (($httpStatus['statusCode'] ?? '') === 'CRT503') {
            throw new RuntimeException('Banesco: Servicio en horario de mantenimiento. Intente más tarde.');
        }

        return [
            'success' => false,
            'message' => $httpStatus['statusDesc'] ?? ('Error en la validación del banco (Code: ' . ($httpStatus['statusCode'] ?? $httpCode) . ')'),
        ];
    }
}
?>