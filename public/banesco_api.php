<?php
/**
 * banesco_api.php
 * Cliente para el validador de transacciones de Banesco.
 *
 * Producción utiliza el contrato certificado recuperado del despliegue estable:
 * referenceNumber + accountId + amount + startDt + phoneNum + bankId.
 * Las credenciales y la cuenta receptora viven fuera del repositorio.
 */

$banescoPrivateConfig = dirname(__DIR__) . '/.wifi-rapidito-private/payment_secrets.php';
if (is_file($banescoPrivateConfig)) {
    require_once $banescoPrivateConfig;
}

$banescoEnv = strtoupper(trim((string)(
    getenv('BANESCO_ENV')
    ?: (defined('BANESCO_PRIVATE_ENV') ? BANESCO_PRIVATE_ENV : 'PROD')
)));
if (!in_array($banescoEnv, ['QA', 'PROD'], true)) {
    $banescoEnv = 'PROD';
}

$readBanescoSetting = static function (array $envNames, array $constantNames) {
    foreach ($envNames as $name) {
        $value = getenv($name);
        if ($value !== false && trim((string)$value) !== '') {
            return trim((string)$value);
        }
    }
    foreach ($constantNames as $name) {
        if (defined($name)) {
            $value = constant($name);
            if (trim((string)$value) !== '') {
                return trim((string)$value);
            }
        }
    }
    return '';
};

if ($banescoEnv === 'PROD') {
    $banescoClientId = $readBanescoSetting(
        ['BANESCO_CLIENT_ID_PROD', 'BANESCO_CLIENT_ID'],
        ['BANESCO_PRIVATE_CLIENT_ID_PROD', 'BANESCO_PRIVATE_CLIENT_ID']
    );
    $banescoClientSecret = $readBanescoSetting(
        ['BANESCO_CLIENT_SECRET_PROD', 'BANESCO_CLIENT_SECRET'],
        ['BANESCO_PRIVATE_CLIENT_SECRET_PROD', 'BANESCO_PRIVATE_CLIENT_SECRET']
    );
} else {
    $banescoClientId = $readBanescoSetting(
        ['BANESCO_CLIENT_ID_QA', 'BANESCO_CLIENT_ID'],
        ['BANESCO_PRIVATE_CLIENT_ID_QA', 'BANESCO_PRIVATE_CLIENT_ID']
    );
    $banescoClientSecret = $readBanescoSetting(
        ['BANESCO_CLIENT_SECRET_QA', 'BANESCO_CLIENT_SECRET'],
        ['BANESCO_PRIVATE_CLIENT_SECRET_QA', 'BANESCO_PRIVATE_CLIENT_SECRET']
    );
}

$banescoAccountId = $readBanescoSetting(
    ['BANESCO_ACCOUNT_ID'],
    ['BANESCO_PRIVATE_ACCOUNT_ID']
);

if ($banescoClientId === '' || $banescoClientSecret === '') {
    throw new RuntimeException('Credenciales Banesco no configuradas para el ambiente activo.');
}
if ($banescoAccountId === '') {
    throw new RuntimeException('Cuenta receptora Banesco no configurada.');
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
define('BANESCO_ACCOUNT_ID', $banescoAccountId);
define('BANESCO_TOKEN_CACHE', sys_get_temp_dir() . '/banesco_token_' . strtolower(BANESCO_ENV) . '.json');

class BanescoAPI {
    private static function getToken() {
        if (is_file(BANESCO_TOKEN_CACHE)) {
            $cached = json_decode((string)@file_get_contents(BANESCO_TOKEN_CACHE), true);
            if (
                is_array($cached)
                && !empty($cached['access_token'])
                && (int)($cached['expires_at'] ?? 0) > time()
            ) {
                return (string)$cached['access_token'];
            }
        }

        $postData = http_build_query([
            'grant_type' => 'password',
            'username' => BANESCO_CLIENT_ID,
            'password' => BANESCO_CLIENT_SECRET,
            'scope' => 'CONSULTA DE TRANSACCIONES',
        ]);

        $ch = curl_init(BANESCO_SSO_URL);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $postData,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/x-www-form-urlencoded',
                'Authorization: Basic ' . base64_encode(BANESCO_CLIENT_ID . ':' . BANESCO_CLIENT_SECRET),
            ],
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        $response = curl_exec($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError !== '') {
            throw new Exception('Error obteniendo token Banesco SSO: ' . $curlError);
        }
        if ($httpCode !== 200 || !$response) {
            throw new Exception('Error obteniendo token Banesco SSO. Code: ' . $httpCode . '.');
        }

        $tokenData = json_decode($response, true);
        if (!is_array($tokenData) || empty($tokenData['access_token'])) {
            throw new Exception('Token de Banesco no encontrado en la respuesta.');
        }

        $expiresIn = max(120, (int)($tokenData['expires_in'] ?? 300));
        @file_put_contents(BANESCO_TOKEN_CACHE, json_encode([
            'access_token' => (string)$tokenData['access_token'],
            'expires_at' => time() + $expiresIn - 60,
        ]), LOCK_EX);

        return (string)$tokenData['access_token'];
    }

    private static function normalizeDate($value) {
        $value = trim((string)$value);
        if ($value === '') return date('Y-m-d');
        $timestamp = strtotime($value);
        if ($timestamp === false) {
            throw new InvalidArgumentException('Fecha de pago inválida para la validación Banesco.');
        }
        return date('Y-m-d', $timestamp);
    }

    private static function normalizePhone($value) {
        $digits = preg_replace('/\D+/', '', (string)$value);
        if ($digits === '') return null;
        if (strlen($digits) === 11 && str_starts_with($digits, '0')) {
            $digits = '58' . substr($digits, 1);
        } elseif (strlen($digits) === 10) {
            $digits = '58' . $digits;
        }
        return $digits !== '' ? $digits : null;
    }

    private static function normalizeBankId($value) {
        $raw = trim((string)$value);
        if ($raw === '') return '0134';

        $digits = preg_replace('/\D+/', '', $raw);
        if ($digits !== '') {
            if (strlen($digits) > 4) $digits = substr($digits, -4);
            return str_pad($digits, 4, '0', STR_PAD_LEFT);
        }

        $banks = [
            'venezuela' => '0102',
            'mercantil' => '0105',
            'provincial' => '0108',
            'bancaribe' => '0114',
            'exterior' => '0115',
            'banesco' => '0134',
            'plaza' => '0138',
            'bfc' => '0151',
            'del sur' => '0157',
            'tesoro' => '0163',
            'activo' => '0171',
            'bancamiga' => '0172',
            'bicentenario' => '0175',
        ];
        $lower = strtolower($raw);
        foreach ($banks as $name => $code) {
            if (str_contains($lower, $name)) return $code;
        }
        return '0134';
    }

    private static function extractCreditTransaction($data) {
        $transactions = $data['dataResponse']['transactionDetail'] ?? [];
        if (!is_array($transactions)) return null;

        if (!array_is_list($transactions)) {
            $transactions = [$transactions];
        }

        foreach ($transactions as $transaction) {
            if (is_array($transaction) && strtoupper((string)($transaction['trnType'] ?? '')) === 'CR') {
                return $transaction;
            }
        }

        foreach ($transactions as $transaction) {
            if (is_array($transaction)) return $transaction;
        }
        return null;
    }

    /**
     * Valida una operación contra el contrato de producción certificado.
     *
     * Opciones esperadas: amount, paymentDate/payment_date/startDt,
     * phoneNum/phone_emisor, bankId/banco_origen y opcionalmente accountId.
     */
    public static function checkTransaction($referenceNumber, array $options = []) {
        $referenceNumber = trim((string)$referenceNumber);
        if ($referenceNumber === '') {
            throw new InvalidArgumentException('Referencia de pago requerida.');
        }

        $accountId = trim((string)($options['accountId'] ?? BANESCO_ACCOUNT_ID));
        $amount = isset($options['amount']) && is_numeric($options['amount'])
            ? round((float)$options['amount'], 2)
            : null;
        $paymentDate = self::normalizeDate(
            $options['paymentDate']
            ?? $options['payment_date']
            ?? $options['startDt']
            ?? date('Y-m-d')
        );
        $phoneNum = self::normalizePhone($options['phoneNum'] ?? $options['phone_emisor'] ?? '');
        $bankId = self::normalizeBankId($options['bankId'] ?? $options['banco_origen'] ?? '');

        $transaction = [
            'referenceNumber' => $referenceNumber,
            'accountId' => $accountId,
            'amount' => $amount,
            'startDt' => $paymentDate,
            'phoneNum' => $phoneNum,
            'bankId' => $bankId,
        ];

        // endDt se omite deliberadamente para una consulta puntual por referencia.
        $payload = [
            'dataRequest' => [
                'device' => [
                    'description' => 'Wifi Rapidito Portal',
                    'ipAddress' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
                    'type' => 'Web',
                ],
                'transaction' => $transaction,
            ],
        ];

        $endpointSuffix = BANESCO_ENV === 'PROD'
            ? '/financial-account/transactions'
            : '/transactions/financial-account/transactions';
        $url = BANESCO_API_URL . $endpointSuffix;
        $token = self::getToken();

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
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        $response = curl_exec($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError !== '') {
            throw new Exception('Error cURL Banesco API: ' . $curlError);
        }

        $data = json_decode((string)$response, true);
        $httpStatus = is_array($data) ? ($data['httpStatus'] ?? null) : null;
        if (!is_array($httpStatus)) {
            throw new Exception('Respuesta inválida de API Banesco. Code: ' . $httpCode . '.');
        }

        $statusCode = (string)($httpStatus['statusCode'] ?? '');
        $statusDesc = trim((string)($httpStatus['statusDesc'] ?? ''));

        if ($statusCode === '200' && strtoupper($statusDesc) === 'OK') {
            $credit = self::extractCreditTransaction($data);
            if ($credit === null) {
                return [
                    'success' => false,
                    'code' => 'EMPTY_TRANSACTION',
                    'message' => 'Banesco confirmó la consulta, pero no devolvió el detalle de la operación.',
                ];
            }

            $bankAmount = isset($credit['amount']) && is_numeric($credit['amount'])
                ? round((float)$credit['amount'], 2)
                : null;
            if ($amount !== null && $bankAmount !== null && abs($bankAmount - $amount) > 0.009) {
                return [
                    'success' => false,
                    'code' => 'AMOUNT_MISMATCH',
                    'message' => 'La referencia existe, pero el monto confirmado por Banesco no coincide con el reportado.',
                ];
            }

            return [
                'success' => true,
                'amount' => $bankAmount,
                'date' => (string)($credit['trnDate'] ?? ''),
                'concept' => trim((string)($credit['concept'] ?? '')),
                'refNum' => (string)($credit['referenceNumber'] ?? $referenceNumber),
                'data' => $data['dataResponse'] ?? null,
            ];
        }

        if ($statusCode === '70001') {
            return [
                'success' => false,
                'code' => $statusCode,
                'message' => 'No se encontraron resultados para la referencia indicada. Verifique los datos del pago y que la operación haya sido exitosa.',
            ];
        }

        if ($statusCode === 'CRT503') {
            throw new Exception('Banesco: Servicio en horario de mantenimiento. Intente más tarde.');
        }

        return [
            'success' => false,
            'code' => $statusCode,
            'message' => $statusDesc !== '' ? $statusDesc : ('Error en la validación del banco (Code: ' . $statusCode . ')'),
        ];
    }
}
?>
