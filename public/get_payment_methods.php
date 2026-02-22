<?php
header('Content-Type: application/json');
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$url = 'https://api.wisphub.app/api/formas-de-pago/';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Api-Key $api_key"]);
$response = curl_exec($ch);
curl_close($ch);

echo $response;
?>
