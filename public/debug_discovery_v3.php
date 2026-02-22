<?php
header("Content-Type: text/plain");
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

$test_urls = [
    // Promise List Variants
    'https://api.wisphub.app/api/promesas-de-pago/',
    'https://api.wisphub.app/api/promesas-pago/',
    'https://api.wisphub.app/api/factura-promesa/',
    'https://api.wisphub.app/api/promesa_pago/', // Testing GET on the singular path again just in case
    'https://api.wisphub.app/api/clientes/667/promesas/',
    'https://api.wisphub.app/api/facturas/5561/promesas/',
    
    // Metadata / Company Hash Hunt
    'https://api.wisphub.app/api/empresa/',
    'https://api.wisphub.app/api/configuracion/',
    'https://api.wisphub.app/api/ajustes-facturacion/',
    'https://api.wisphub.app/api/pasarelas-pago/',
    
    // Alternative domains
    'https://api.wisphub.net/api/promesas-de-pago/',
    'https://api.wisphub.net/api/promesas-pago/'
];

foreach ($test_urls as $url) {
    echo "--- TESTING: $url ---\n";
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "CODE: $code\n";
    if ($code === 200) {
        echo "BODY: " . substr($res, 0, 300) . "...\n";
        break; // Stop if we find a list!
    }
    echo "\n";
}

// Special check: Fetch Nora's detail again but look for ANY nested object
echo "--- DEEP NORA PROFILE INSPECTION ---\n";
$ch = curl_init('https://api.wisphub.app/api/clientes/667/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
$res = curl_exec($ch);
echo $res . "\n";
curl_close($ch);
?>
