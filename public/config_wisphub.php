<?php
// config_wisphub.php - Configuración centralizada para API de WispHub.
// Las credenciales viven fuera del repositorio y fuera de public_html.

$privateConfig = dirname(__DIR__) . '/.wifi-rapidito-private/payment_secrets.php';
if (is_file($privateConfig)) {
    require_once $privateConfig;
}

$wisphubToken = getenv('WISPHUB_TOKEN') ?: (defined('WISPHUB_PRIVATE_TOKEN') ? WISPHUB_PRIVATE_TOKEN : '');
if ($wisphubToken === '') {
    throw new RuntimeException('WISPHUB_TOKEN no está configurado.');
}

define('WISPHUB_TOKEN', $wisphubToken);
define('WISPHUB_API_URL', 'https://api.wisphub.app/api/');
define('WISPHUB_STAFF_USER', getenv('WISPHUB_STAFF_USER') ?: 'admin@wifi-rapidito');
?>
