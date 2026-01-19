import axios from 'axios';

// Mock Data
const MOCK_USERS = {
    'client': {
        id: 1,
        username: 'juan.perez',
        role: 'client',
        name: 'Juan Perez',
        plan: 'Fibra 200Mbps',
        balance: 25.00,
        status: 'active'
    },
    'staff': {
        id: 2,
        username: 'admin',
        role: 'staff',
        name: 'Soporte Técnico',
        permissions: ['read', 'write', 'admin']
    }
};

const MOCK_CLIENTS_LIST = [
    { id: 1, name: 'Maria Gomez', ip: '192.168.1.10', plan: '50Mbps', status: 'active', balance: 0 },
    { id: 2, name: 'Carlos Ruiz', ip: '192.168.1.11', plan: '100Mbps', status: 'suspended', balance: 15.50 },
    { id: 3, name: 'Ana Torres', ip: '192.168.1.12', plan: '200Mbps', status: 'active', balance: 0 },
];

// Mock Adapter Class
class MockAdapter {
    constructor(axiosInstance) {
        this.axios = axiosInstance;
        this.delay = 800; // Simulate network latency
    }

    init() {
        this.axios.interceptors.request.use(async (config) => {
            console.log(`[MOCK API] ${config.method.toUpperCase()} ${config.url}`, config.data || '');

            // Simulate delay
            await new Promise(resolve => setTimeout(resolve, this.delay));

            // LOGIN
            if (config.url === '/auth/login' && config.method === 'post') {
                const { username, password } = JSON.parse(config.data);
                // Simple mock login logic
                if (username === 'client' && password === '123456') {
                    return this.mockResponse({ token: 'mock-client-token', user: MOCK_USERS.client });
                }
                if (username === 'staff' && password === '123456') {
                    return this.mockResponse({ token: 'mock-staff-token', user: MOCK_USERS.staff });
                }
                throw this.mockError(401, 'Credenciales inválidas');
            }

            // USER INFO
            if (config.url === '/auth/me') {
                // Here we would check the token header in a real app
                // For mock, we check if we stored a role in localStorage or just return client for now
                // But let's assume the component handles the user state, this is just re-fetching
                return this.mockResponse(MOCK_USERS.client);
            }

            // CLIENTS LIST (Staff only)
            if (config.url === '/clients' && config.method === 'get') {
                return this.mockResponse({ count: MOCK_CLIENTS_LIST.length, results: MOCK_CLIENTS_LIST });
            }

            // CLIENT DASHBOARD DATA (Specific client)
            if (config.url.match(/\/clients\/\d+/) && config.method === 'get') {
                return this.mockResponse(MOCK_USERS.client);
            }

            throw this.mockError(404, 'Endpoint no encontrado (MOCK)');
        });
    }

    mockResponse(data) {
        return {
            data,
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
        };
    }

    mockError(status, message) {
        const error = new Error('Request failed with status code ' + status);
        error.response = {
            data: { detail: message },
            status: status,
            statusText: 'Error',
        };
        return Promise.reject(error);
    }
}

export default MockAdapter;
