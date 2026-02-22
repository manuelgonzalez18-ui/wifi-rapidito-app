<?php
// get_technicians.php
header('Content-Type: text/plain; charset=utf-8');

$apiKey = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$url = 'https://api.wisphub.app/api/staff/';

echo "=== BUSCANDO PERSONAL (STAFF) ===\n\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $apiKey]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$res = curl_exec($ch);
$http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http == 200) {
    $data = json_decode($res, true);
    $results = $data['results'] ?? [];
    echo "Se encontraron " . count($results) . " miembros del staff:\n\n";
    foreach ($results as $staff) {
        $id = $staff['id'] ?? 'N/A';
        $nombre = $staff['nombre'] ?? $staff['first_name'] ?? 'N/A';
        $email = $staff['username'] ?? $staff['email'] ?? 'N/A';
        $rol = $staff['rol'] ?? 'Sin Rol';
        echo "   - [$id] $nombre ($email) - Rol: $rol\n";
    }
} else {
    echo "❌ Falló el acceso al staff ($http)\n";
    echo $res;
}
?>
