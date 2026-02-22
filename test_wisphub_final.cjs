// Final test: multipart/form-data with a dummy file attachment
const https = require('https');
const path = require('path');

const API_KEY = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';

function makeMultipartPost(hostname, urlPath, fields, file) {
    return new Promise((resolve, reject) => {
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).slice(2);
        let parts = [];

        // Add text fields
        for (const [key, value] of Object.entries(fields)) {
            parts.push(
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="${key}"\r\n\r\n` +
                `${value}\r\n`
            );
        }

        // Add file field
        if (file) {
            parts.push(
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="${file.fieldName}"; filename="${file.fileName}"\r\n` +
                `Content-Type: ${file.contentType}\r\n\r\n`
            );
            // We'll need to handle binary data differently
        }

        const textPart = parts.join('');
        const endBoundary = `\r\n--${boundary}--\r\n`;

        let body;
        if (file) {
            // Create a simple 1x1 PNG image as test (smallest valid PNG)
            const pngHeader = Buffer.from([
                0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
                0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
                0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixels
                0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // 8-bit RGB
                0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
                0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00, // Compressed data
                0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, // 
                0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, // IEND chunk
                0x44, 0xAE, 0x42, 0x60, 0x82                     //
            ]);
            body = Buffer.concat([
                Buffer.from(textPart, 'utf-8'),
                pngHeader,
                Buffer.from(endBoundary, 'utf-8')
            ]);
        } else {
            body = Buffer.from(textPart + endBoundary, 'utf-8');
        }

        const options = {
            hostname: hostname,
            path: urlPath,
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
    console.log('=== FINAL PAYMENT API TEST (with file) ===\n');

    // Use invoice 5871 (most recent)
    const invoiceId = '5871';

    // Test with multipart + file + correct forma_pago ID
    console.log(`TEST: POST reportar-pago/${invoiceId}/ (multipart + PNG file + forma_pago=16749)`);
    const r = await makeMultipartPost('api.wisphub.app', `/api/facturas/reportar-pago/${invoiceId}/`, {
        referencia: '999777',
        fecha_pago: '2026-02-11',
        nombre_user: 'admin@wifi-rapidito',
        forma_pago: '16749',
        comprobante_pago: 'Test final con archivo - Monto 25 USD | Banco Banesco | Ref 999777'
    }, {
        fieldName: 'comprobante_pago_archivo',
        fileName: 'comprobante_test.png',
        contentType: 'image/png'
    });

    console.log(`  HTTP Code: ${r.status}`);
    const isHTML = r.body.trim().startsWith('<');
    if (isHTML) {
        console.log(`  Response is HTML (not JSON)`);
        console.log(`  Content-Type: ${r.headers['content-type']}`);
        console.log(`  First 300 chars: ${r.body.substring(0, 300)}`);
    } else {
        console.log(`  Response: ${r.body}`);
    }

    console.log('\n=== TEST COMPLETE ===');
}

run().catch(console.error);
