<?php
header('Content-Type: text/plain; charset=utf-8');

$apiKey = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$usuario = 'norapalacios@wifi-rapidito';
$cedula = '6838842';
$id_servicio = '667';

$tests = [
    'cliente' => $usuario,
    'username' => $usuario,
    'usuario' => $usuario,
    'search' => $cedula,
    'cedula' => $cedula,
    'id_servicio' => $id_servicio,
    'id_cliente' => $id_servicio // Sometimes id_cliente works with service id
];

echo "=== DIAGNÓSTICO FINAL: BUSCANDO FACTURAS DE NORA ===\n";
echo "Usuario esperado: $usuario\n";
echo "Cédula esperada: $cedula\n";
echo "ID Servicio esperado: $id_servicio\n\n";

foreach ($tests as $param => $value) {
    $url = "https://api.wisphub.app/api/facturas/?$param=" . urlencode($value) . "&limit=10";
    echo "PROBANDO: $url\n";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $apiKey]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    $data = json_decode($res, true);
    curl_close($ch);
    
    $count = count($data['results'] ?? []);
    echo "Resultado: $count items encontrados.\n";
    
    if ($count > 0) {
        foreach ($data['results'] as $i => $factura) {
            $f_user = $factura['cliente']['usuario'] ?? 'N/A';
            $f_dni = $factura['cliente']['cedula'] ?? 'N/A';
            echo "  [$i] Factura #{$factura['id_factura']} -> Cliente: $f_user (DNI: $f_dni)\n";
            if ($f_dni == $cedula || $f_user == $usuario) {
                echo "  ✅¡ESTE PARÁMETRO FUNCIONA!\n";
            }
        }
    }
    echo "--------------------------------------------------\n";
}
?>
