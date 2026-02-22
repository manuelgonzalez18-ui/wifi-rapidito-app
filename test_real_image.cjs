// Test with a REAL PNG image file from filesystem
const https = require('https');
const fs = require('fs');
const crypto = require('crypto');

const API_KEY = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
const INVOICE_ID = '6398';

// Use a real PNG from the brain directory
const REAL_PNG = 'C:\\Users\\user\\.gemini\\antigravity\\brain\\2ec4c9f9-1d42-421c-a2a2-8682ff5b72d4\\media__1770861626456.png';

function postMultipart(urlPath, fields, filePath, fileFieldName) {
    return new Promise((resolve, reject) => {
        const fileContent = fs.readFileSync(filePath);
        const fileName = 'comprobante_pago.png';
        const boundary = '----WebKitFormBoundary' + crypto.randomBytes(16).toString('hex');

        const parts = [];

        for (const [key, value] of Object.entries(fields)) {
            parts.push(Buffer.from(
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="${key}"\r\n\r\n` +
                `${value}\r\n`
            ));
        }

        parts.push(Buffer.from(
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="${fileFieldName}"; filename="${fileName}"\r\n` +
            `Content-Type: image/png\r\n\r\n`
        ));
        parts.push(fileContent);
        parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

        const body = Buffer.concat(parts);
        console.log(`   File size: ${fileContent.length} bytes`);
        console.log(`   Total body: ${body.length} bytes`);

        const req = https.request({
            hostname: 'api.wisphub.app',
            path: urlPath,
            method: 'POST',
            headers: {
                'Authorization': 'Api-Key ' + API_KEY,
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': body.length
            },
            rejectUnauthorized: false
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function get(urlPath) {
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.wisphub.app', path: urlPath, method: 'GET',
            headers: { 'Authorization': 'Api-Key ' + API_KEY },
            rejectUnauthorized: false
        }, (res) => {
            let d = ''; res.on('data', c => d += c);
            res.on('end', () => resolve({ status: res.statusCode, body: d }));
        });
        req.on('error', reject); req.end();
    });
}

async function run() {
    console.log('=== PRUEBA CON IMAGEN REAL ===\n');

    if (!fs.existsSync(REAL_PNG)) {
        console.log('ERROR: No se encontró la imagen de prueba');
        return;
    }
    console.log(`Usando imagen: ${REAL_PNG}`);

    console.log(`\nPOST /api/facturas/reportar-pago/${INVOICE_ID}/`);
    const result = await postMultipart(
        `/api/facturas/reportar-pago/${INVOICE_ID}/`,
        {
            forma_pago: '16749',
            fecha_pago: '2026-02-19',
            referencia: '112233',
            comprobante_pago: 'Prueba con imagen real - WifiRapidito Portal',
            nombre_user: 'admin@wifi-rapidito'
        },
        REAL_PNG,
        'comprobante_pago_archivo'
    );

    console.log(`\nHTTP: ${result.status}`);
    console.log(`Response: ${result.body}\n`);

    if (result.status === 200) {
        const data = JSON.parse(result.body);
        console.log('✅ ¡¡¡ÉXITO!!! PAGO REPORTADO!!!');
        console.log('📋 Task ID:', data.task_id);

        await new Promise(r => setTimeout(r, 3000));
        const inv = await get(`/api/facturas/${INVOICE_ID}/`);
        const invData = JSON.parse(inv.body);
        console.log(`\nEstado factura #${INVOICE_ID}: ${invData.estado}`);
    } else if (result.status === 400) {
        console.log('Validation error (auth works):');
        try { console.log(JSON.stringify(JSON.parse(result.body), null, 2)); } catch (e) { }
    } else {
        console.log('Unexpected error');
    }

    console.log('\n=== DONE ===');
}

run().catch(console.error);
