import axios from 'axios';
import MockAdapter from './mock';

const USE_MOCK = false; // Toggle this to switch between Real and Mock API

const api = axios.create({
    baseURL: import.meta.env.BASE_URL + 'api', // Adapt to base path (e.g. /dist/api)
    headers: {
        'Content-Type': 'application/json',
    }
});

if (USE_MOCK) {
    console.warn('⚠️ RUNNING WITH MOCK DATA');
    const mock = new MockAdapter(api);
    mock.init();
}

// Add Auth Interceptor for Real API
api.interceptors.request.use((config) => {
    // For this demo, we use the provided Company API Key for all requests
    const apiKey = 'OYIxEv1H.qmnKH5Ck8NvLWw4Tnyoa7PswdhrJlJ9s';
    if (!USE_MOCK) {
        config.headers.Authorization = `Api-Key ${apiKey}`;
    }
    return config;
});

export default api;
