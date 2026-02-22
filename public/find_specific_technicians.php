<?php
// find_specific_technicians.php
header('Content-Type: text/plain; charset=utf-8');

$apiKey = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$url = 'https://api.wisphub.app/api/staff/';

$technicianNames = ['Josue BLANCO', 'Alberto Rivero', 'Ramon Guarico'];

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
    echo "=== ID DE TÉCNICOS ENCONTRADOS ===\n\n";
    foreach ($results as $staff) {
        $id = $staff['id'] ?? 'N/A';
        $nombre = $staff['nombre'] ?? $staff['first_name'] ?? 'N/A';
        $found = false;
        foreach ($technicianNames as $tn) {
            if (stripos($nombre, $tn) !== false) {
                $found = true;
                break;
            }
        }
        if ($found) {
            echo "   - [$id] $nombre\n";
        }
    }
} else {
    echo "❌ Error al obtener staff ($http)\n";
}
?>
