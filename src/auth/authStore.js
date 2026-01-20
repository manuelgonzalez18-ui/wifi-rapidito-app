import { create } from 'zustand';
import axios from 'axios';

// Use absolute path for Wisphub auth on production
const WISPHUB_AUTH_URL = '/wisphub_auth.php';

const useAuthStore = create((set, get) => ({
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: !!localStorage.getItem('token'),
    isLoading: false,
    error: null,

    login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
            // STAFF LOGIN
            if (username === 'admin' && password === 'wifi2026') {
                const user = { role: 'staff', name: 'Administrador', username: 'admin' };
                localStorage.setItem('token', 'staff-token');
                localStorage.setItem('user_role', 'staff');
                set({ user, token: 'staff-token', isAuthenticated: true, isLoading: false });
                return user;
            }

            // CLIENT LOGIN: Authenticate via Wisphub portal
            console.log(`[AUTH] Attempting Wisphub portal login for: "${username}"`);

            try {
                const response = await axios.post(WISPHUB_AUTH_URL, {
                    username: username.trim(),
                    password: password
                });

                if (response.data.success && response.data.user) {
                    const user = {
                        role: 'client',
                        ...response.data.user
                    };

                    const token = response.data.token;
                    localStorage.setItem('token', token);
                    localStorage.setItem('user_role', 'client');

                    set({ user, token, isAuthenticated: true, isLoading: false });
                    console.log(`[AUTH] ✅ Login successful via Wisphub portal`);
                    return user;
                } else {
                    throw new Error(response.data.error || 'Error de autenticación');
                }
            } catch (authError) {
                console.error(`[AUTH] ❌ Portal authentication failed:`, authError);
                const errorMessage = authError.response?.data?.error ||
                    authError.message ||
                    'Usuario o Cédula no encontrado en Wisphub. Verifique que el Usuario o Cédula sea correcto.';
                throw new Error(errorMessage);
            }

        } catch (error) {
            console.error('[AUTH] Login error:', error);
            const errorMessage = error.message || 'Error de autenticación';
            set({ error: errorMessage, isLoading: false });
            throw error;
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user_role');
        set({ user: null, token: null, isAuthenticated: false, error: null });
    },

    // Load user data from stored token on app startup
    loadUser: async () => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('user_role');

        if (!token) {
            set({ isAuthenticated: false, user: null });
            return;
        }

        // For staff, restore minimal user data
        if (role === 'staff') {
            set({
                user: { role: 'staff', name: 'Administrador', username: 'admin' },
                token,
                isAuthenticated: true
            });
            return;
        }

        // For clients, mark as authenticated
        set({
            user: { role: 'client' },
            token,
            isAuthenticated: true
        });
    },
}));

export default useAuthStore;
