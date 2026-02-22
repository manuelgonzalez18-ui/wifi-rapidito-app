<?php
header("Content-Type: text/plain");
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

// 1. DUMP ALL NORA'S KEYS
echo "--- ALL KEYS IN NORA PROFILE (ID 667) ---\n";
$ch = curl_init('https://api.wisphub.app/api/clientes/667/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$res = curl_exec($ch);
$client = json_decode($res, true);
curl_close($ch);

if ($client) {
    foreach ($client as $key => $val) {
        $type = gettype($val);
        $display = ($type === 'array' || $type === 'object') ? json_encode($val) : $val;
        echo "[$key] ($type): $display\n";
    }
} else {
    echo "ERROR FETCHING PROFILE\n";
}

echo "\n--- BRUTE FORCING LIST ENDPOINTS ---\n";
$list_tests = [
    'https://api.wisphub.app/api/promesas-de-pago/',
    'https://api.wisphub.app/api/promesas-pago/',
    'https://api.wisphub.app/api/promesa-pago/',
    'https://api.wisphub.net/api/promesas-de-pago/',
    'https://api.wisphub.net/api/promesas-pago/',
    'https://api.wisphub.net/api/pago/promesas/',
    'https://api.wisphub.app/api/finanzas/promesas/',
];

foreach ($list_tests as $url) {
    echo "URL: $url -> ";
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Api-Key ' . $api_key]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    echo "CODE: $code\n";
    if ($code === 200) {
        $data = json_decode($res, true);
        echo "   COUNT: " . ($data['count'] ?? 'Unknown') . "\n";
        echo "   SAMPLE: " . substr($res, 0, 100) . "...\n";
    }
}
?>
