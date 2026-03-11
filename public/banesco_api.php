<?php
/**
 * banesco_api.php
 * Interfaz para comunicarse con la API de Banesco (Ambiente QA).
 * Maneja la obtención de token OAuth2 y la consulta de transacciones.
 */

define('BANESCO_SSO_QA', 'https://sso-sso-project.apps.desplakur3.desintra.banesco.com/auth/realms/realm-api-qa/protocol/openid-connect/token');
define('BANESCO_API_QA', 'https://sid-validador-consulta-de-transacciones-api-qa-production.apps.desplakur3.desintra.banesco.com');
define('BANESCO_CLIENT_ID', '136d814a');
define('BANESCO_CLIENT_SECRET', '42a569a48580b4500714c698d41ad84e');

// Cache para el token (archivo temporal)
define('BANESCO_TOKEN_CACHE', sys_get_temp_dir() . '/banesco_token.json');

class BanescoAPI {
    
    /**
     * Obtiene un token válido, ya sea de caché o solicitando uno nuevo.
     */
    private static function getToken() {
        if (file_exists(BANESCO_TOKEN_CACHE)) {
            $data = json_decode(file_get_contents(BANESCO_TOKEN_CACHE), true);
            if (isset($data['access_token']) && $data['expires_at'] > time()) {
                return $data['access_token'];
            }
        }
        
        $ch = curl_init(BANESCO_SSO_QA);
        $postData = http_build_query([
            'grant_type'    => 'client_credentials',
            'client_id'     => BANESCO_CLIENT_ID,
            'client_secret' => BANESCO_CLIENT_SECRET
        ]);
        
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/x-www-form-urlencoded'
        ]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Permitir en modo QA si hay issues de cert
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200 || !$response) {
            throw new Exception("Error obteniendo token Banesco SSO. Code: $httpCode. Response: $response");
        }
        
        $tokenData = json_decode($response, true);
        if (!isset($tokenData['access_token'])) {
            throw new Exception("Token de Banesco no encontrado en la respuesta.");
        }
        
        // Guardar en caché, asumiendo un margen de seguridad (ej. 60 segundos antes)
        $expiresIn = $tokenData['expires_in'] ?? 300;
        file_put_contents(BANESCO_TOKEN_CACHE, json_encode([
            'access_token' => $tokenData['access_token'],
            'expires_at'   => time() + $expiresIn - 60
        ]));
        
        return $tokenData['access_token'];
    }
    
    /**
     * Consulta una transacción por su ID de pago (Referencia).
     * @param string $paymentId Número de referencia del pago
     */
    public static function checkTransaction($paymentId) {
        $token = self::getToken();
        
        $url = BANESCO_API_QA . '/financial-account/transactions';
        
        $payload = [
            'dataRequest' => [
                'device' => [
                    'description' => 'Wifi Rapidito Portal',
                    'ipAddress'   => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
                    'type'        => 'Web'
                ],
                'transaction' => [
                    'customerIdR' => 'J402638850', // RIF de Inversiones Tu Super PC 2013 C.A
                    'paymentId'   => (string)$paymentId
                ]
            ]
        ];
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $token,
            'Content-Type: application/json',
            'Accept: application/json',
            // 'user_key' no es requerido si usamos OAuth con Client ID según lo estándar, 
            // pero si la API Gateway lo exige, lo agregaremos aquí
            // 'user_key: 7660a1327740be8cc3b3fcb3f291ae77' 
        ]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 20); // Timeout rápido
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error) {
            throw new Exception("Error cURL Banesco API: $error");
        }
        
        $data = json_decode($response, true);
        
        // Interpretar respuesta según Swagger
        $httpStatus = $data['httpStatus'] ?? null;
        
        if (!$httpStatus) {
            throw new Exception("Respuesta inválida de API Banesco. Code: $httpCode.");
        }
        
        if ($httpStatus['statusCode'] === '200' && $httpStatus['statusDesc'] === 'OK') {
            return [
                'success' => true,
                'data'    => $data['dataResponse'] ?? null
            ];
        }
        
        if ($httpStatus['statusCode'] === '70001') {
            return [
                'success' => false,
                'message' => 'No se encontraron resultados para la referencia indicada. Verifique que la transferencia a Banesco sea exitosa.'
            ];
        }
        
        if ($httpStatus['statusCode'] === 'CRT503') {
            throw new Exception("Banesco: Servicio en horario de mantenimiento. Intente más tarde.");
        }
        
        return [
            'success' => false,
            'message' => $httpStatus['statusDesc'] ?? "Error en la validación del banco (Code: {$httpStatus['statusCode']})"
        ];
    }
}
?>
