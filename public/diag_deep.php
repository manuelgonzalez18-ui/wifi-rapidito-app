<?php
header('Content-Type: text/plain');

$apiKey = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$baseUrls = [
    'https://api.wisphub.app/api',
    'https://api.wisphub.net/api'
];

$testCases = [
    [
        'name' => 'GET buscar=yubraskasilva (Header: Authorization: Api-Key)',
        'method' => 'GET',
        'endpoint' => '/clientes/?buscar=yubraskasilva&limit=10',
        'auth_type' => 'auth_header_prefix'
    ],
    [
        'name' => 'GET buscar=yubraskasilva (Header: Api-Key)',
        'method' => 'GET',
        'endpoint' => '/clientes/?buscar=yubraskasilva&limit=10',
        'auth_type' => 'apikey_header'
    ],
    [
        'name' => 'GET buscar=30449997 (Header: Authorization: Api-Key)',
        'method' => 'GET',
        'endpoint' => '/clientes/?buscar=30449997&limit=10',
        'auth_type' => 'auth_header_prefix'
    ],
    [
        'name' => 'GET buscar=30449997 (Header: Api-Key)',
        'method' => 'GET',
        'endpoint' => '/clientes/?buscar=30449997&limit=10',
        'auth_type' => 'apikey_header'
    ]
];

foreach ($baseUrls as $baseUrl) {
    echo "=== Testing Base URL: $baseUrl ===\n\n";
    
    foreach ($testCases as $case) {
        echo "Testing: " . $case['name'] . "\n";
        $url = $baseUrl . $case['endpoint'];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, true);
        
        $headers = [];
        if ($case['auth_type'] === 'auth_header_prefix') {
            $headers[] = 'Authorization: Api-Key ' . $apiKey;
        } else {
            $headers[] = 'Api-Key: ' . $apiKey;
        }
        
        if ($case['method'] === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            if (isset($case['post_json'])) {
                $headers[] = 'Content-Type: application/json';
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($case['post_json']));
            } else {
                curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($case['post_fields']));
            }
        }
        
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        
        $response = curl_exec($ch);
        $info = curl_getinfo($ch);
        $error = curl_error($ch);
        curl_close($ch);
        
        echo "HTTP Code: " . $info['http_code'] . "\n";
        if ($error) echo "CURL Error: $error\n";
        
        $body = substr($response, $info['header_size']);
        echo "Response Body (first 200 chars): " . substr($body, 0, 200) . "...\n";
        
        if (strpos($body, 'yubraskasilva') !== false || strpos($body, '30449997') !== false) {
            echo "✅ SUCCESS: Found target in response!\n";
        } else {
            echo "❌ Not found.\n";
        }
        echo "-----------------------------------\n\n";
    }
}
?>
