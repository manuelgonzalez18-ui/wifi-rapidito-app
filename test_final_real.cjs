// Use a real PNG from the filesystem or create one with proper structure
const https = require('https');
const fs = require('fs');
const crypto = require('crypto');
const zlib = require('zlib');

const API_KEY = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
const INVOICE_ID = '6398';

// Create a proper 10x10 red PNG image
function createValidPNG() {
    const width = 10, height = 10;
    // Raw pixel data: for each row: filter byte (0) + RGB pixels
    const rawData = [];
    for (let y = 0; y < height; y++) {
        rawData.push(0); // filter: None
        for (let x = 0; x < width; x++) {
            rawData.push(255, 0, 0); // Red pixel
        }
    }
    const pixelData = Buffer.from(rawData);
    const compressed = zlib.deflateSync(pixelData);

    const chunks = [];

    // PNG Signature
    chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

    // IHDR
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 2;  // RGB
    ihdr[10] = 0; // deflate
    ihdr[11] = 0; // no filter
    ihdr[12] = 0; // no interlace
    chunks.push(pngChunk('IHDR', ihdr));

    // IDAT
    chunks.push(pngChunk('IDAT', compressed));

    // IEND
    chunks.push(pngChunk('IEND', Buffer.alloc(0)));

    return Buffer.concat(chunks);
}

function pngChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const typeBuffer = Buffer.from(type, 'ascii');
    const combined = Buffer.concat([typeBuffer, data]);
    const crcVal = crc32buf(combined);
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE(crcVal, 0);
    return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// Standard CRC32
function crc32buf(buf) {
    // Build table
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            if (c & 1) c = 0xEDB88320 ^ (c >>> 1);
            else c = c >>> 1;
        }
        table[n] = c;
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
        crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function postMultipart(urlPath, fields, fileBuffer, fileName) {
    return new Promise((resolve, reject) => {
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
            `Content-Disposition: form-data; name="comprobante_pago_archivo"; filename="${fileName}"\r\n` +
            `Content-Type: image/png\r\n\r\n`
        ));
        parts.push(fileBuffer);
        parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

        const body = Buffer.concat(parts);

        console.log(`   Boundary: ${boundary}`);
        console.log(`   Body size: ${body.length} bytes`);
        console.log(`   PNG size: ${fileBuffer.length} bytes`);

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
    console.log('=== PRUEBA REAL FINAL ===\n');

    const png = createValidPNG();
    console.log(`PNG válido creado: ${png.length} bytes`);
    console.log(`PNG header: ${png.slice(0, 8).toString('hex')}`); // Should be 89504e470d0a1a0a

    // Save for inspection
    fs.writeFileSync('test_comprobante.png', png);
    console.log(`Guardado como test_comprobante.png\n`);

    console.log(`POST /api/facturas/reportar-pago/${INVOICE_ID}/`);
    const result = await postMultipart(
        `/api/facturas/reportar-pago/${INVOICE_ID}/`,
        {
            forma_pago: '16749',
            fecha_pago: '2026-02-19',
            referencia: '999111',
            comprobante_pago: 'Prueba final WifiRapidito Portal',
            nombre_user: 'admin@wifi-rapidito'
        },
        png,
        'comprobante_pago.png'
    );

    console.log(`\nHTTP: ${result.status}`);
    console.log(`Response: ${result.body}\n`);

    if (result.status === 200) {
        const data = JSON.parse(result.body);
        console.log('✅ ¡¡¡ÉXITO!!! Task ID:', data.task_id);

        await new Promise(r => setTimeout(r, 3000));
        const inv = await get(`/api/facturas/${INVOICE_ID}/`);
        const invData = JSON.parse(inv.body);
        console.log(`Estado factura #${INVOICE_ID}: ${invData.estado}`);
    } else if (result.status === 400) {
        console.log('❌ Validation error (but auth works!)');
        try {
            const errData = JSON.parse(result.body);
            console.log('Errors:', JSON.stringify(errData, null, 2));
        } catch (e) { }
    } else if (result.status === 404) {
        console.log('❌ 404 - Possible causes:');
        console.log('   - File too small or invalid');
        console.log('   - Invoice not eligible');
        console.log('   - API routing issue with multipart parse');

        // Try with JSON to confirm it's multipart-specific
        console.log('\nFallback: POST as JSON (no file)...');
        const jsonBody = JSON.stringify({
            forma_pago: 16749,
            fecha_pago: '2026-02-19',
            referencia: '999111',
            comprobante_pago: 'Prueba JSON',
            nombre_user: 'admin@wifi-rapidito'
        });
        const jsonR = await new Promise((resolve, reject) => {
            const req = https.request({
                hostname: 'api.wisphub.app',
                path: `/api/facturas/reportar-pago/${INVOICE_ID}/`,
                method: 'POST',
                headers: {
                    'Authorization': 'Api-Key ' + API_KEY,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(jsonBody)
                },
                rejectUnauthorized: false
            }, (res) => {
                let d = ''; res.on('data', c => d += c);
                res.on('end', () => resolve({ status: res.statusCode, body: d }));
            });
            req.on('error', reject); req.write(jsonBody); req.end();
        });
        console.log(`   JSON HTTP: ${jsonR.status}`);
        console.log(`   JSON Response: ${jsonR.body}`);
    }

    console.log('\n=== DONE ===');
}

run().catch(console.error);
