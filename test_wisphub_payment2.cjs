// Test 2: Fix the POST - use JSON content-type and correct forma_pago
const https = require('https');

const API_KEY = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

function makeJSONPost(path, data) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(data);
        const options = {
            hostname: 'api.wisphub.app',
            path: path,
            method: 'POST',
            headers: {
                'Authorization': 'Api-Key ' + API_KEY,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
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

function makeGET(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.wisphub.app',
            path: path,
            method: 'GET',
            headers: { 'Authorization': 'Api-Key ' + API_KEY },
            rejectUnauthorized: false
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', reject);
        req.end();
    });
}

async function run() {
    console.log('=== WISPHUB PAYMENT FIX TESTS ===\n');

    // Step 1: Find an unpaid invoice
    console.log('STEP 1: Finding unpaid invoices...');
    const r1 = await makeGET('/api/facturas/?estado=Pendiente&limit=3');
    console.log(`  HTTP: ${r1.status}`);
    const invoices = JSON.parse(r1.body);
    console.log(`  Count: ${invoices.count}`);

    let testInvoiceId = null;
    if (invoices.results && invoices.results.length > 0) {
        testInvoiceId = invoices.results[0].id_factura;
        console.log(`  Using invoice: ${testInvoiceId} (${invoices.results[0].estado})`);
        console.log(`  Invoice detail: total=${invoices.results[0].total}, cliente=${JSON.stringify(invoices.results[0].zona)}`);
    } else {
        console.log('  No pending invoices found, trying all...');
        const r1b = await makeGET('/api/facturas/?limit=3');
        const inv2 = JSON.parse(r1b.body);
        if (inv2.results && inv2.results.length > 0) {
            testInvoiceId = inv2.results[0].id_factura;
            console.log(`  Using invoice: ${testInvoiceId} (${inv2.results[0].estado})`);
        }
    }

    if (!testInvoiceId) {
        console.log('  ERROR: No invoices found!');
        return;
    }

    // Step 2: POST with JSON content-type and correct forma_pago ID
    console.log(`\nSTEP 2: POST reportar-pago/${testInvoiceId}/ (JSON, forma_pago=16749)`);
    const r2 = await makeJSONPost(`/api/facturas/reportar-pago/${testInvoiceId}/`, {
        referencia: '999888',
        fecha_pago: '2026-02-11',
        nombre_user: 'admin@wifi-rapidito',
        forma_pago: 16749, // Transferencia Bancaria (correct ID)
        comprobante_pago: 'Test API - Monto 25 USD | Banco Banesco | Ref 999888'
    });
    console.log(`  HTTP: ${r2.status}`);
    // Check if response is HTML or JSON
    const isHTML = r2.body.trim().startsWith('<') || r2.body.trim().startsWith('<!');
    if (isHTML) {
        console.log(`  Response is HTML (login page redirect)`);
        console.log(`  Content-Type: ${r2.headers['content-type']}`);
        console.log(`  Location: ${r2.headers['location'] || 'none'}`);
        // Show first 200 chars
        console.log(`  First 200 chars: ${r2.body.substring(0, 200)}`);
    } else {
        console.log(`  Response: ${r2.body}`);
    }

    // Step 3: Try with forma_pago as string name instead of ID
    console.log(`\nSTEP 3: POST reportar-pago/${testInvoiceId}/ (JSON, forma_pago="Transferencia Bancaria")`);
    const r3 = await makeJSONPost(`/api/facturas/reportar-pago/${testInvoiceId}/`, {
        referencia: '999888',
        fecha_pago: '2026-02-11',
        nombre_user: 'admin@wifi-rapidito',
        forma_pago: 'Transferencia Bancaria',
        comprobante_pago: 'Test API string - Monto 25 USD'
    });
    console.log(`  HTTP: ${r3.status}`);
    const isHTML3 = r3.body.trim().startsWith('<') || r3.body.trim().startsWith('<!');
    if (isHTML3) {
        console.log(`  Response is HTML (login page redirect)`);
        console.log(`  Content-Type: ${r3.headers['content-type']}`);
    } else {
        console.log(`  Response: ${r3.body}`);
    }

    // Step 4: Try with api.wisphub.net instead of api.wisphub.app
    console.log(`\nSTEP 4: POST to api.wisphub.NET (alternative domain)`);
    const r4 = await new Promise((resolve, reject) => {
        const body = JSON.stringify({
            referencia: '999888',
            fecha_pago: '2026-02-11',
            nombre_user: 'admin@wifi-rapidito',
            forma_pago: 16749,
            comprobante_pago: 'Test NET domain'
        });
        const options = {
            hostname: 'api.wisphub.net',
            path: `/api/facturas/reportar-pago/${testInvoiceId}/`,
            method: 'POST',
            headers: {
                'Authorization': 'Api-Key ' + API_KEY,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
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
    console.log(`  HTTP: ${r4.status}`);
    const isHTML4 = r4.body.trim().startsWith('<') || r4.body.trim().startsWith('<!');
    if (isHTML4) {
        console.log(`  Response is HTML`);
        console.log(`  Content-Type: ${r4.headers['content-type']}`);
    } else {
        console.log(`  Response: ${r4.body.substring(0, 500)}`);
    }

    console.log('\n=== TESTS COMPLETE ===');
}

run().catch(console.error);
