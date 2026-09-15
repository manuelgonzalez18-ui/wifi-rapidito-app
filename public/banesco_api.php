<?php
/**
 * banesco_api.php
 * Interfaz para comunicarse con la API certificada de Banesco.
 * Maneja la obtención de token OAuth2 y la consulta de transacciones.
 */

$banescoPrivateConfig = dirname(__DIR__) . '/.wifi-rapidito-private/payment_secrets.php';
if (is_file($banescoPrivateConfig)) {
    require_once $banescoPrivateConfig;
}

$banescoClientId = getenv('BANESCO_CLIENT_ID') ?: (defined('BANESCO_PRIVATE_CLIENT_ID') ? BANESCO_PRIVATE_CLIENT_ID : '');
$banescoClientSecret = getenv('BANESCO_CLIENT_SECRET') ?: (defined('BANESCO_PRIVATE_CLIENT_SECRET') ? BANESCO_PRIVATE_CLIENT_SECRET : '');
if ($banescoClientId === '' || $banescoClientSecret === '') {
    throw new RuntimeException('Credenciales Banesco no configuradas.');
}

define('BANESCO_SSO_QA', 'https://sso-sso-project.apps.desplakur3.desintra.banesco.com/auth/realms/realm-api-qa/protocol/openid-connect/token');
define('BANESCO_API_QA', 'https://sid-validador-consulta-de-transacciones-api-qa-production.apps.desplakur3.desintra.banesco.com');
define('BANESCO_CLIENT_ID', $banescoClientId);
define('BANESCO_CLIENT_SECRET', $banescoClientSecret);
define('BANESCO_TOKEN_CACHE', sys_get_temp_dir() . '/banesco_token.json');

class BanescoAPI {
    private static function getToken() {
        if (file_exists(BANESCO_TOKEN_CACHE)) {
            $data = json_decode(file_get_contents(BANESCO_TOKEN_CACHE), true);
            if (isset($data['access_token']) && ($data['expires_at'] ?? 0) > time()) {
                return $data['access_token'];
            }
        }

        $ch = curl_init(BANESCO_SSO_QA);
        $postData = http_build_query([
            'grant_type' => 'client_credentials',
            'client_id' => BANESCO_CLIENT_ID,
            'client_secret' => BANESCO_CLIENT_SECRET,
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 20);

        $response = curl_exec($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new Exception("Error obteniendo token Banesco SSO: $error");
        }
        if ($httpCode !== 200 || !$response) {
            throw new Exception("Error obteniendo token Banesco SSO. Code: $httpCode.");
        }

        $tokenData = json_decode($response, true);
        if (!isset($tokenData['access_token'])) {
            throw new Exception('Token de Banesco no encontrado en la respuesta.');
        }

        $expiresIn = max(120, (int)($tokenData['expires_in'] ?? 300));
        @file_put_contents(BANESCO_TOKEN_CACHE, json_encode([
            'access_token' => $tokenData['access_token'],
            'expires_at' => time() + $expiresIn - 60,
        ]));

        return $tokenData['access_token'];
    }

    private static function normalizeDate($value) {
        $value = trim((string)$value);
        if ($value === '') return '';

        $timestamp = strtotime($value);
        if ($timestamp === false) return '';
        return date('Y-m-d', $timestamp);
    }

    private static function normalizeBankId($value) {
        $digits = preg_replace('/\D+/', '', (string)$value);
        if ($digits === '') return '';
        if (strlen($digits) > 4) $digits = substr($digits, -4);
        return str_pad($digits, 4, '0', STR_PAD_LEFT);
    }

    private static function normalizePhone($value) {
        $digits = preg_replace('/\D+/', '', (string)$value);
        if ($digits === '') return '';

        if (strlen($digits) === 11 && str_starts_with($digits, '0')) {
            return '58' . substr($digits, 1);
        }
        if (strlen($digits) === 10) {
            return '58' . $digits;
        }
        return $digits;
    }

    /**
     * Consulta una transacción Banesco por referencia y, cuando están disponibles,
     * por los parámetros certificados que desambiguan una operación real:
     * monto, fecha exacta, banco emisor y teléfono emisor.
     *
     * Mantiene compatibilidad con llamadas antiguas que solo enviaban referencia/RIF.
     */
    public static function checkTransaction($paymentId, $customerIdR = 'J402638850', array $options = []) {
        $token = self::getToken();
        $url = BANESCO_API_QA . '/financial-account/transactions';

        $transaction = [
            'customerIdR' => trim((string)$customerIdR),
            'paymentId' => trim((string)$paymentId),
        ];

        if (isset($options['amount']) && is_numeric($options['amount']) && (float)$options['amount'] > 0) {
            $transaction['amount'] = round((float)$options['amount'], 2);
        }

        $paymentDate = self::normalizeDate($options['paymentDate'] ?? $options['startDt'] ?? '');
        if ($paymentDate !== '') {
            // Para una referencia exacta se consulta la fecha exacta de la operación.
            // No enviamos endDt para evitar ampliar innecesariamente la búsqueda.
            $transaction['startDt'] = $paymentDate;
        }

        $bankId = self::normalizeBankId($options['bankId'] ?? '');
        if ($bankId !== '') {
            $transaction['bankId'] = $bankId;
        }

        $phoneNum = self::normalizePhone($options['phoneNum'] ?? '');
        if ($phoneNum !== '') {
            $transaction['phoneNum'] = $phoneNum;
        }

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

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $token,
            'Content-Type: application/json',
            'Accept: application/json',
        ]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 20);

        $response = curl_exec($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new Exception("Error cURL Banesco API: $error");
        }

        $data = json_decode($response, true);
        $httpStatus = is_array($data) ? ($data['httpStatus'] ?? null) : null;
        if (!$httpStatus) {
            throw new Exception("Respuesta inválida de API Banesco. Code: $httpCode.");
        }

        $statusCode = (string)($httpStatus['statusCode'] ?? '');
        $statusDesc = (string)($httpStatus['statusDesc'] ?? '');

        if ($statusCode === '200' && strtoupper($statusDesc) === 'OK') {
            return [
                'success' => true,
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
            'message' => $statusDesc !== '' ? $statusDesc : "Error en la validación del banco (Code: $statusCode)",
        ];
    }
}
?>
