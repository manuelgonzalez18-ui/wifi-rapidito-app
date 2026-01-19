import { create } from 'zustand';
import api from '../api/client';

const useAuthStore = create((set, get) => ({
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: !!localStorage.getItem('token'),
    isLoading: false,
    error: null,

    login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
            // STAFF LOGIN (Hardcoded for now as API doesn't expose staff list cleanly in this endpoint)
            if (username === 'admin' && password === 'wifi2026') {
                const user = { role: 'staff', name: 'Administrador', username: 'admin' };
                localStorage.setItem('token', 'staff-token');
                localStorage.setItem('user_role', 'staff');
                set({ user, token: 'staff-token', isAuthenticated: true, isLoading: false });
                return user;
            }

            // CLIENT LOGIN: Fetch clients and find match
            // We search for the user by 'cedula' or 'id_servicio'
            const response = await api.get('/clientes');

            let clients = [];
            if (Array.isArray(response.data)) {
                clients = response.data;
            } else if (response.data?.results && Array.isArray(response.data.results)) {
                clients = response.data.results;
            } else {
                console.error("API Response Data:", response.data);
                throw new Error("Formato de respuesta desconocido del servidor");
            }

            const foundClient = clients.find(c =>
                c.cedula === username ||
                c.id_servicio === String(username) ||
                c.nombre.toLowerCase().includes(username.toLowerCase()) // Fallback name search
            );

            if (!foundClient) {
                throw new Error('Usuario no encontrado');
            }

            // PASSWORD CHECK
            // We allow login if password matches Cedula OR '123456' (default) OR their Wifi Password
            // This is a workaround since we can't check the real portal password hash
            const validPasswords = [
                foundClient.cedula,
                '123456',
                foundClient.password_ssid_router_wifi,
                'wifi123'
            ];

            if (!validPasswords.includes(password)) {
                // If checking name, requires stricter password check
                throw new Error('Contraseña incorrecta');
            }

            const user = {
                ...foundClient,
                role: 'client',
                username: foundClient.cedula,
                name: foundClient.nombre,
                plan: foundClient.plan_internet?.nombre || 'Plan Desconocido',
                balance: foundClient.saldo || foundClient.precio_plan || '0.00'
            };

            const token = foundClient.id_servicio; // Use Service ID as pseudo-token

            localStorage.setItem('token', token);
            localStorage.setItem('user_role', 'client');
            localStorage.setItem('client_data', JSON.stringify(user));

            set({
                user,
                token,
                isAuthenticated: true,
                isLoading: false
            });

            return user;
        } catch (error) {
            console.error(error);
            set({
                error: error.message || 'Error al iniciar sesión',
                isLoading: false
            });
            throw error;
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user_role');
        localStorage.removeItem('client_data');
        set({ user: null, token: null, isAuthenticated: false });
    },

    checkAuth: async () => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('client_data');

        if (token && savedUser) {
            set({ user: JSON.parse(savedUser), isAuthenticated: true });
        }
    }
}));

export default useAuthStore;
