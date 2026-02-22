// Direct test of Wisphub reportar-pago API
const https = require('https');

const API_KEY = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
const INVOICE_ID = '5561';

function makeRequest(method, path, formData) {
    return new Promise((resolve, reject) => {
        const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
        let body = '';

        if (formData && method === 'POST') {
            for (const [key, value] of Object.entries(formData)) {
                body += `--${boundary}\r\n`;
                body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
                body += `${value}\r\n`;
            }
            body += `--${boundary}--\r\n`;
        }

        const options = {
            hostname: 'api.wisphub.app',
            path: path,
            method: method,
            headers: {
                'Authorization': 'Api-Key ' + API_KEY,
            },
            rejectUnauthorized: false
        };

        if (method === 'POST' && formData) {
            options.headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
            options.headers['Content-Length'] = Buffer.byteLength(body);
        }

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode, body: data, headers: res.headers });
            });
        });
        req.on('error', (err) => reject(err));
        if (body) req.write(body);
        req.end();
    });
}

async function runTests() {
    console.log('=== WISPHUB REPORTAR-PAGO API TEST ===\n');

    // Test 1: POST reportar-pago
    console.log(`TEST 1: POST /api/facturas/reportar-pago/${INVOICE_ID}/`);
    try {
        const r1 = await makeRequest('POST', `/api/facturas/reportar-pago/${INVOICE_ID}/`, {
            referencia: '123456',
            fecha_pago: '2026-02-11',
            nombre_user: 'admin@wifi-rapidito',
            forma_pago: '7',
            comprobante_pago: 'Prueba API - Monto 10 USD | Banco Banesco | Ref 123456'
        });
        console.log(`  HTTP Code: ${r1.status}`);
        console.log(`  Response: ${r1.body}\n`);
    } catch (e) { console.log(`  Error: ${e.message}\n`); }

    // Test 2: POST registrar-pago (alternative endpoint)
    console.log(`TEST 2: POST /api/facturas/registrar-pago/${INVOICE_ID}/`);
    try {
        const r2 = await makeRequest('POST', `/api/facturas/registrar-pago/${INVOICE_ID}/`, {
            referencia: '654321',
            fecha_pago: '2026-02-11',
            nombre_user: 'admin@wifi-rapidito',
            forma_pago: '7',
            comprobante_pago: 'Prueba registrar - Monto 10 USD'
        });
        console.log(`  HTTP Code: ${r2.status}`);
        console.log(`  Response: ${r2.body}\n`);
    } catch (e) { console.log(`  Error: ${e.message}\n`); }

    // Test 3: OPTIONS reportar-pago (schema discovery)
    console.log(`TEST 3: OPTIONS /api/facturas/reportar-pago/${INVOICE_ID}/`);
    try {
        const r3 = await makeRequest('OPTIONS', `/api/facturas/reportar-pago/${INVOICE_ID}/`);
        console.log(`  HTTP Code: ${r3.status}`);
        console.log(`  Response: ${r3.body.substring(0, 800)}\n`);
    } catch (e) { console.log(`  Error: ${e.message}\n`); }

    // Test 4: GET formas-de-pago
    console.log('TEST 4: GET /api/formas-de-pago/');
    try {
        const r4 = await makeRequest('GET', '/api/formas-de-pago/');
        console.log(`  HTTP Code: ${r4.status}`);
        console.log(`  Response: ${r4.body.substring(0, 800)}\n`);
    } catch (e) { console.log(`  Error: ${e.message}\n`); }

    // Test 5: GET invoice details
    console.log(`TEST 5: GET /api/facturas/${INVOICE_ID}/`);
    try {
        const r5 = await makeRequest('GET', `/api/facturas/${INVOICE_ID}/`);
        console.log(`  HTTP Code: ${r5.status}`);
        console.log(`  Response: ${r5.body.substring(0, 500)}\n`);
    } catch (e) { console.log(`  Error: ${e.message}\n`); }

    console.log('=== TEST COMPLETE ===');
}

runTests();
