// Debug: Try different approaches to fix the 404
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const API_KEY = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
const INVOICE_ID = '6398';

// Create a real small image file first
function createTestImage() {
    // Create a simple 1x1 pixel BMP (smallest valid image format)
    // BMP is simpler and guaranteed to be valid
    const bmp = Buffer.alloc(58);
    // BMP header
    bmp.write('BM', 0);
    bmp.writeUInt32LE(58, 2); // file size
    bmp.writeUInt32LE(54, 10); // offset to pixel data
    // DIB header
    bmp.writeUInt32LE(40, 14); // DIB header size
    bmp.writeInt32LE(1, 18); // width
    bmp.writeInt32LE(1, 22); // height
    bmp.writeUInt16LE(1, 26); // color planes
    bmp.writeUInt16LE(24, 28); // bits per pixel
    bmp.writeUInt32LE(0, 30); // compression
    bmp.writeUInt32LE(4, 34); // image size
    // Pixel data (1 blue pixel + 1 byte padding)
    bmp[54] = 0xFF; // B
    bmp[55] = 0x00; // G
    bmp[56] = 0x00; // R
    bmp[57] = 0x00; // padding

    const filePath = path.join(__dirname, 'test_comprobante.bmp');
    fs.writeFileSync(filePath, bmp);
    return filePath;
}

function postWithFile(urlPath, fields, filePath, fileFieldName) {
    return new Promise((resolve, reject) => {
        const boundary = '----WebKitFormBoundary' + crypto.randomBytes(16).toString('hex');
        const fileContent = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);

        let body = '';

        // Add text fields
        for (const [key, value] of Object.entries(fields)) {
            body += `--${boundary}\r\n`;
            body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
            body += `${value}\r\n`;
        }

        // Add file
        const fileHeaderStr =
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="${fileFieldName}"; filename="${fileName}"\r\n` +
            `Content-Type: image/bmp\r\n\r\n`;

        const endStr = `\r\n--${boundary}--\r\n`;

        const bodyBuffer = Buffer.concat([
            Buffer.from(body, 'utf-8'),
            Buffer.from(fileHeaderStr, 'utf-8'),
            fileContent,
            Buffer.from(endStr, 'utf-8')
        ]);

        const options = {
            hostname: 'api.wisphub.app',
            path: urlPath,
            method: 'POST',
            headers: {
                'Authorization': 'Api-Key ' + API_KEY,
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': bodyBuffer.length
            },
            rejectUnauthorized: false
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
        });
        req.on('error', reject);
        req.write(bodyBuffer);
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
    console.log('=== DEBUGGING REPORTAR-PAGO 404 ===\n');

    // Create test image
    const imgPath = createTestImage();
    console.log(`Test image created: ${imgPath} (${fs.statSync(imgPath).size} bytes)\n`);

    // Test A: Check if invoice exists
    console.log(`A. Checking invoice #${INVOICE_ID}...`);
    const invR = await get(`/api/facturas/${INVOICE_ID}/`);
    console.log(`   HTTP: ${invR.status}`);
    if (invR.status === 200) {
        const inv = JSON.parse(invR.body);
        console.log(`   Estado: ${inv.estado}, Total: ${inv.total}\n`);
    }

    // Test B: OPTIONS on this specific invoice's reportar-pago
    console.log(`B. OPTIONS /facturas/reportar-pago/${INVOICE_ID}/...`);
    const optR = await new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.wisphub.app',
            path: `/api/facturas/reportar-pago/${INVOICE_ID}/`,
            method: 'OPTIONS',
            headers: { 'Authorization': 'Api-Key ' + API_KEY },
            rejectUnauthorized: false
        }, (res) => {
            let d = ''; res.on('data', c => d += c);
            res.on('end', () => resolve({ status: res.statusCode, body: d }));
        });
        req.on('error', reject); req.end();
    });
    console.log(`   HTTP: ${optR.status} | Response: ${optR.body}\n`);

    // Test C: POST with file (our invoice)
    console.log(`C. POST /facturas/reportar-pago/${INVOICE_ID}/ with file...`);
    const r1 = await postWithFile(`/api/facturas/reportar-pago/${INVOICE_ID}/`, {
        forma_pago: '16749',
        fecha_pago: '2026-02-19',
        referencia: '888999',
        comprobante_pago: 'Prueba real con archivo',
        nombre_user: 'admin@wifi-rapidito'
    }, imgPath, 'comprobante_pago_archivo');
    console.log(`   HTTP: ${r1.status}`);
    console.log(`   Response: ${r1.body.substring(0, 500)}\n`);

    // Test D: Try an older invoice that might work (5871 from earlier tests)
    console.log(`D. POST /facturas/reportar-pago/5871/ with file...`);
    const r2 = await postWithFile(`/api/facturas/reportar-pago/5871/`, {
        forma_pago: '16749',
        fecha_pago: '2026-02-19',
        referencia: '888999',
        comprobante_pago: 'Prueba real con archivo - factura vieja',
        nombre_user: 'admin@wifi-rapidito'
    }, imgPath, 'comprobante_pago_archivo');
    console.log(`   HTTP: ${r2.status}`);
    console.log(`   Response: ${r2.body.substring(0, 500)}\n`);

    // Test E: Check if there's a "Pendiente" invoice
    console.log(`E. Listing recent invoices...`);
    const listR = await get('/api/facturas/?limit=5&ordering=-id_factura');
    const listData = JSON.parse(listR.body);
    for (const inv of (listData.results || [])) {
        console.log(`   #${inv.id_factura}: ${inv.estado} - $${inv.total} - ${inv.fecha_vencimiento}`);
    }

    // Clean up
    fs.unlinkSync(imgPath);
    console.log('\n=== DEBUG COMPLETE ===');
}

run().catch(console.error);
