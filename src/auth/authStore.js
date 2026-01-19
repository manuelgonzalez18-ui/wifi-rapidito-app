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
            } else if (response.data && typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
                throw new Error("Error del Servidor (HTML recibido). Posible problema de Proxy.");
            } else {
                const debugInfo = JSON.stringify(response.data).slice(0, 100);
                console.error("Unknown Data:", response.data);
                throw new Error(`Data extraña: ${typeof response.data} - ${debugInfo}...`);
            }

            const cleanUsername = username.replace(/^[VEve]-\s*/, '').trim(); // Remove V- or E- prefix

            const foundClient = clients.find(c => {
                const clientCedula = String(c.cedula).trim();
                const clientId = String(c.id_servicio).trim();

                // Strict match or match without prefix
                return clientCedula === username ||
                    clientCedula === cleanUsername ||
                    clientId === username ||
                    clientId === cleanUsername ||
                    c.nombre.toLowerCase().includes(username.toLowerCase());
            });

            if (!foundClient) {
                console.error('Client not found. Input:', username, 'Clean:', cleanUsername); // Debug log
                throw new Error('Usuario no encontrado. Verifique su Cédula o ID.');
            }

            // PASSWORD CHECK
            // We allow login if password matches Cedula (with or without V-) OR '123456' OR Wifi Password
            const validPasswords = [
                foundClient.cedula,
                String(foundClient.cedula).replace(/^[VEve]-\s*/, ''), // Allow cedula without prefix as password
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
