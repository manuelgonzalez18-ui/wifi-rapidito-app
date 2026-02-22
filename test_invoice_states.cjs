// Quick test: find invoices by different states and test reportar-pago on each
const https = require('https');
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

function postJSON(path, data) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(data);
        const req = https.request({
            hostname: 'api.wisphub.app', path, method: 'POST',
            headers: { 'Authorization': 'Api-Key ' + API_KEY, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
            rejectUnauthorized: false
        }, (res) => {
            let d = ''; res.on('data', c => d += c);
            res.on('end', () => resolve({ status: res.statusCode, body: d }));
        });
        req.on('error', reject); req.write(body); req.end();
    });
}

async function run() {
    // 1. Get all invoices (different states)
    console.log('=== FINDING INVOICES BY STATE ===');
    for (const estado of ['Pendiente', 'Vencida', 'Generada', 'Pagada']) {
        const r = await get(`/api/facturas/?estado=${estado}&limit=2`);
        const data = JSON.parse(r.body);
        console.log(`\n${estado}: count=${data.count}`);
        if (data.results) {
            for (const inv of data.results) {
                console.log(`  id=${inv.id_factura} total=${inv.total} estado=${inv.estado} vence=${inv.fecha_vencimiento}`);
            }
        }
    }

    // 2. Get all invoices regardless of state
    console.log('\n=== ALL INVOICES (latest 5) ===');
    const allR = await get('/api/facturas/?limit=5&ordering=-id_factura');
    const allData = JSON.parse(allR.body);
    const invoices = allData.results || [];
    for (const inv of invoices) {
        console.log(`  id=${inv.id_factura} estado=${inv.estado} total=${inv.total} vence=${inv.fecha_vencimiento}`);
    }

    // 3. Test reportar-pago on each unique state
    console.log('\n=== TESTING reportar-pago ON DIFFERENT STATES ===');
    const tested = new Set();
    for (const inv of invoices) {
        if (tested.has(inv.estado)) continue;
        tested.add(inv.estado);
        console.log(`\nTesting invoice ${inv.id_factura} (${inv.estado})...`);
        const r = await postJSON(`/api/facturas/reportar-pago/${inv.id_factura}/`, {
            referencia: '111222',
            fecha_pago: '2026-02-11',
            nombre_user: 'admin@wifi-rapidito',
            forma_pago: 16749,
            comprobante_pago: 'Test estado ' + inv.estado
        });
        console.log(`  HTTP: ${r.status} | Response: ${r.body.substring(0, 300)}`);
    }

    console.log('\n=== DONE ===');
}
run().catch(console.error);
