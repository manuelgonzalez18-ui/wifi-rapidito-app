<?php
/**
 * Wisphub Bridge for Kommo Salesbot
 * 
 * Este script recibe peticiones de Kommo, consulta Wisphub y devuelve
 * un JSON simplificado que el Salesbot de Kommo puede procesar fácilmente.
 */

header('Content-Type: application/json');

// --- CONFIGURACIÓN ---
$api_key = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
$base_url = 'https://api.wisphub.app/api';

// --- ENTRADA ---
// Kommo enviará el teléfono o ID por GET o POST
$phone = $_REQUEST['phone'] ?? '';

if (empty($phone)) {
    echo json_encode(['status' => 'error', 'message' => 'No phone provided']);
    exit;
}

// Limpiar el teléfono (eliminar +, espacios, etc.)
$phone_clean = preg_replace('/[^0-9]/', '', $phone);

// 1. Buscar cliente por teléfono en Wisphub
$search_url = $base_url . "/clientes/?telefono=" . $phone_clean;

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $search_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Api-Key $api_key"]);
$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);

if (empty($data['results'])) {
    // Si no lo encuentra con el número completo, intentamos buscarlo parcial
    // (A veces el prefijo internacional causa problemas)
    echo json_encode([
        'is_client' => false,
        'message' => 'Cliente no encontrado en Wisphub',
        'phone_searched' => $phone_clean
    ]);
    exit;
}

$cliente = $data['results'][0];
$id_servicio = $cliente['id_servicio'];

// 2. Obtener facturas pendientes del cliente
$invoices_url = $base_url . "/facturas/?id_servicio=" . $id_servicio . "&estado=Sin Pagar";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $invoices_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Api-Key $api_key"]);
$invoices_response = curl_exec($ch);
curl_close($ch);

$invoices_data = json_decode($invoices_response, true);
$total_pending = 0;
$invoice_count = 0;

if (!empty($invoices_data['results'])) {
    foreach ($invoices_data['results'] as $inv) {
        $total_pending += $inv['total'];
        $invoice_count++;
    }
}

// --- RESPUESTA PARA KOMMO ---
// Kommo puede usar estos campos como variables: {{request.name}}, {{request.balance}}, etc.
echo json_encode([
    'is_client' => true,
    'name' => $cliente['nombre'],
    'balance' => $total_pending,
    'invoice_count' => $invoice_count,
    'id_servicio' => $id_servicio,
    'plan' => $cliente['plan_internet'],
    'status_wi' => $cliente['estado_servicio'],
    'message' => "Hola " . $cliente['nombre'] . ", tienes " . $invoice_count . " facturas pendientes por un total de $" . $total_pending
]);
