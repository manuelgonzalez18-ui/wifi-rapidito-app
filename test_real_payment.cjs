// Real test: Send actual payment report with file to Wisphub API
const https = require('https');
const crypto = require('crypto');

const API_KEY = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

function get(path) {
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.wisphub.app', path, method: 'GET',
            headers: { 'Authorization': 'Api-Key ' + API_KEY },
            rejectUnauthorized: false
        }, (res) => {
            let d = ''; res.on('data', c => d += c);
            res.on('end', () => resolve({ status: res.statusCode, body: d }));
        });
        req.on('error', reject); req.end();
    });
}

function postMultipart(path, fields, fileField) {
    return new Promise((resolve, reject) => {
        const boundary = '----FormBoundary' + crypto.randomBytes(8).toString('hex');

        // Build multipart body
        const parts = [];

        // Text fields
        for (const [key, value] of Object.entries(fields)) {
            parts.push(Buffer.from(
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="${key}"\r\n\r\n` +
                `${value}\r\n`
            ));
        }

        // File field - create a small valid JPEG
        // Smallest valid JPEG (a 1x1 red pixel)
        const jpegBytes = Buffer.from([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
            0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
            0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
            0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
            0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
            0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
            0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
            0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
            0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
            0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
            0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
            0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
            0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
            0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
            0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
            0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
            0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
            0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
            0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
            0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
            0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
            0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
            0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
            0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
            0x00, 0x00, 0x3F, 0x00, 0x7B, 0x94, 0x11, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xD9
        ]);

        const fileHeader = Buffer.from(
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="${fileField.name}"; filename="${fileField.filename}"\r\n` +
            `Content-Type: image/jpeg\r\n\r\n`
        );

        parts.push(fileHeader);
        parts.push(jpegBytes);
        parts.push(Buffer.from('\r\n'));
        parts.push(Buffer.from(`--${boundary}--\r\n`));

        const body = Buffer.concat(parts);

        const options = {
            hostname: 'api.wisphub.app',
            path: path,
            method: 'POST',
            headers: {
                'Authorization': 'Api-Key ' + API_KEY,
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': body.length
            },
            rejectUnauthorized: false
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function run() {
    console.log('=== PRUEBA REAL: REPORTAR PAGO CON ARCHIVO ===\n');

    // Step 1: Find invoices
    console.log('1. Buscando facturas...');
    const r = await get('/api/facturas/?limit=5&ordering=-id_factura');
    const data = JSON.parse(r.body);
    console.log(`   Total facturas: ${data.count}`);

    if (!data.results || data.results.length === 0) {
        console.log('   ERROR: No se encontraron facturas');
        return;
    }

    // Pick the most recent invoice
    const invoice = data.results[0];
    console.log(`   Factura seleccionada: #${invoice.id_factura} (${invoice.estado}) - Total: $${invoice.total}`);

    // Step 2: Send real payment report
    console.log(`\n2. Enviando reporte de pago para factura #${invoice.id_factura}...`);
    const result = await postMultipart(`/api/facturas/reportar-pago/${invoice.id_factura}/`, {
        forma_pago: '16749',
        fecha_pago: '2026-02-19',
        referencia: '777888',
        comprobante_pago: 'PRUEBA REAL desde portal WifiRapidito - Monto $25 | Banco Banesco | Ref 777888',
        nombre_user: 'admin@wifi-rapidito'
    }, {
        name: 'comprobante_pago_archivo',
        filename: 'comprobante_prueba.jpg'
    });

    console.log(`   HTTP Code: ${result.status}`);

    const isJSON = result.body.trim().startsWith('{') || result.body.trim().startsWith('[');
    if (isJSON) {
        const parsed = JSON.parse(result.body);
        console.log(`   Response:`, JSON.stringify(parsed, null, 2));

        if (result.status === 200 && parsed.task_id) {
            console.log(`\n   ✅ ¡ÉXITO! Pago reportado exitosamente!`);
            console.log(`   📋 Task ID: ${parsed.task_id}`);
            console.log(`   📌 La factura #${invoice.id_factura} debería estar "En Revisión" en Wisphub`);
        }
    } else {
        console.log(`   Response (first 500 chars): ${result.body.substring(0, 500)}`);
    }

    // Step 3: Verify invoice state changed
    console.log(`\n3. Verificando estado de factura #${invoice.id_factura}...`);
    const verify = await get(`/api/facturas/${invoice.id_factura}/`);
    const invoiceData = JSON.parse(verify.body);
    console.log(`   Estado actual: ${invoiceData.estado}`);

    console.log('\n=== PRUEBA COMPLETA ===');
}

run().catch(err => console.error('Error:', err));
