<?php
// final_pilot_wisphub.php
// Basado exactamente en el ejemplo de cURL de la documentación oficial.

header('Content-Type: application/json; charset=utf-8');

$apiKey = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$url = 'https://api.wisphub.app/api/tickets/';

// Formato de fecha exacto pedido por la doc: DD/MM/YYYY HH:MM
date_default_timezone_set('America/Caracas'); 
$now = date('d/m/Y H:i');

$payload = [
    'asuntos_default' => 'Internet Lento',
    'asunto' => 'Internet Lento',
    'descripcion' => '<p>Prueba piloto desde Portal V1.12.0 - Intento 2</p>',
    'estado' => '1',
    'prioridad' => '1',
    'servicio' => '667',
    'tecnico' => '5853049', // Ana Palacios (ID que detectamos antes)
    'fecha_inicio' => $now,
    'fecha_final' => $now,
    'origen_reporte' => 'oficina', // Valor oficial de la documentacion
    'departamento' => 'Soporte Técnico',
    'departamentos_default' => 'Soporte Técnico',
    'razon_falla' => 'Internet Lento'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Api-Key ' . $apiKey,
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$res = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Devolvemos la respuesta del servidor
if ($httpCode == 0) {
    echo json_encode(['error' => 'No se pudo conectar con la API de Wisphub']);
} else {
    echo $res;
}
?>
