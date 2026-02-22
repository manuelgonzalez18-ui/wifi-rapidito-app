<?php
/**
 * view_pdf.php (v2.2)
 * Proxy to stream Wisphub Invoice PDFs with verbose debugging
 */
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$id_factura = $_GET['id'] ?? '';

if (!$id_factura || !is_numeric($id_factura)) {
    die("Error: ID de factura no proporcionado o invalido.");
}

$url = "https://api.wisphub.app/api/facturas/{$id_factura}/pdf/";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Api-Key ' . $api_key
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_VERBOSE, true);

$result = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
curl_close($ch);

// Debug Log
file_put_contents('pdf_debug.log', "[" . date('Y-m-d H:i:s') . "] ID: $id_factura, CODE: $http_code, TYPE: $content_type\n", FILE_APPEND);

if ($http_code === 200 && strpos($content_type, 'pdf') !== false) {
    header("Content-Type: application/pdf");
    header("Content-Disposition: inline; filename=\"factura_{$id_factura}.pdf\"");
    echo $result;
} else {
    // Attempt detailed error message
    header("Content-Type: text/plain; charset=UTF-8");
    if ($http_code === 403) {
        echo "ERROR 403: TU API KEY NO TIENE PERMISO PARA DESCARGAR PDFS.\n";
        echo "Solucion: En Wisphub > Facturacion, busca permisos del API y activa 'Ver/Descargar PDF'.";
    } else if ($http_code === 404) {
        echo "ERROR 404: La factura #$id_factura no existe o no tiene PDF generado.";
    } else {
        echo "Error inesperado (Codigo: $http_code).\n";
        echo "Respuesta del servidor:\n" . substr($result, 0, 500);
    }
}
