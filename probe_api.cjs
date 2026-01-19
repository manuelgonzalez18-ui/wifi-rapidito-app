const axios = require('axios');

const API_KEY = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
const BASE_URL = 'https://api.wisphub.app/api';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Authorization': `Api-Key ${API_KEY}`,
        'Content-Type': 'application/json'
    }
});

async function probe() {
    console.log('--- Probing Wisphub API ---');

    const endpoints = [
        '/clients',
        '/clientes',
        '/customers',
        '/users',
        '/abonados',
        '/servicio-internet' // sometimes service endpoints exist
    ];

    for (const endpoint of endpoints) {
        try {
            console.log(`\nTesting GET ${endpoint}...`);
            const res = await api.get(endpoint);
            console.log(`   SUCCESS! Status: ${res.status}`);
            console.log(`   Data keys: ${Object.keys(res.data)}`);
            if (res.data.results) {
                console.log(`   Results count: ${res.data.results.length}`);
                console.log('   Sample:', JSON.stringify(res.data.results[0], null, 2));
            } else if (Array.isArray(res.data)) {
                console.log(`   Array length: ${res.data.length}`);
                console.log('   Sample:', JSON.stringify(res.data[0], null, 2));
            }
            // If we found one, break? No, let's see which is the best.
        } catch (err) {
            console.log(`   Failed (${endpoint}): ${err.response ? err.response.status : err.message}`);
        }
    }
}
probe();
