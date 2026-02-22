<?php
// diag_tickets_structure.php
header('Content-Type: text/plain; charset=UTF-8');

$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$url = 'https://api.wisphub.app/api/tickets/?limit=5';

echo "Fetching Tickets Structure...\n";
echo "URL: $url\n\n";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Api-Key ' . $api_key,
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_code === 200) {
    $data = json_decode($response, true);
    if (isset($data['results'])) {
        foreach ($data['results'] as $i => $ticket) {
            echo "Ticket #$i:\n";
            print_r($ticket);
            echo "---------------------------------\n";
        }
    } else {
        echo "No 'results' found in response.\n";
        print_r($data);
    }
} else {
    echo "Error $http_code: $response\n";
}
?>
