
const axios = require('axios');

const API_KEY = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
const UUID = 'dd1aaeee-06ec-4bbb-be7e-217b7458d9ef';
const BASE_URL = 'https://api.wisphub.app/api';

async function testScenario(name, headers) {
    console.log(`\n--- Testing ${name} ---`);
    try {
        const response = await axios.get(`${BASE_URL}/clientes/`, { headers, timeout: 5000 });
        console.log(`✅ SUCCESS! Status: ${response.status}`);
        console.log('Results count:', response.data.count || response.data.results?.length);
        return true;
    } catch (error) {
        if (error.response) {
            console.log(`❌ FAILED. Status: ${error.response.status}`);
            // console.log('Response data:', error.response.data); // Too verbose usually, un-comment if needed
        } else {
            console.log(`❌ ERROR: ${error.message}`);
        }
        return false;
    }
}

async function runTests() {
    // Scenario 1: Api-Key Header
    await testScenario('Header: Authorization: Api-Key <KEY>', {
        'Authorization': `Api-Key ${API_KEY}`
    });

    // Scenario 2: Token Header
    await testScenario('Header: Authorization: Token <KEY>', {
        'Authorization': `Token ${API_KEY}`
    });

    // Scenario 3: UUID Header + Api-Key
    await testScenario('Header: Api-Key + X-Company-UUID', {
        'Authorization': `Api-Key ${API_KEY}`,
        'X-Company-UUID': UUID
    });

    // Scenario 4: Query Param (Sometimes keys work as query params)
    await testScenario('Query Param: ?api_key=<KEY>', {}); // Not implemented in axios call above logic-wise, skipping for now unless others fail
}

runTests();
