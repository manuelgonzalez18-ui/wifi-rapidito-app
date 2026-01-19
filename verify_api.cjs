
const axios = require('axios');

const API_KEY = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
const BASE_URL = 'https://wisphub.net/api';

async function verifyApi() {
    try {
        console.log('Testing connection to Wisphub API...');
        // Trying a generic endpoint like /clientes/ to see if we have access
        // Based on docs, usually it's /api/clientes/ or similar. 
        // The search result mentioned https://wisphub.net/api-docs/

        const response = await axios.get(`${BASE_URL}/clientes/`, {
            headers: {
                'Authorization': `Token ${API_KEY}`
            }
        });

        console.log('Success! API Key is valid.');
        console.log('Response status:', response.status);
        console.log('Data sample:', response.data.results ? response.data.results.slice(0, 1) : response.data);
    } catch (error) {
        console.error('Error connecting to API:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

verifyApi();
