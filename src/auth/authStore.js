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
            // STAFF LOGIN
            if (username === 'admin' && password === 'wifi2026') {
                const user = { role: 'staff', name: 'Administrador', username: 'admin' };
                localStorage.setItem('token', 'staff-token');
                localStorage.setItem('user_role', 'staff');
                set({ user, token: 'staff-token', isAuthenticated: true, isLoading: false });
                return user;
            }

            // CLIENT LOGIN: Use custom PHP endpoint with pagination
            console.log(`[AUTH] Login attempt for: "${username}"`);

            try {
                const response = await api.post('/login_wisphub.php', {
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
                    localStorage.setItem('user_data', JSON.stringify(user)); // PERSIST USER DATA

                    set({ user, token, isAuthenticated: true, isLoading: false });
                    console.log(`[AUTH] ✅ Login successful via pagination endpoint`);
                    return user;
                } else {
                    throw new Error(response.data.error || 'Error de autenticación');
                }
            } catch (authError) {
                console.error(`[AUTH] ❌ Login failed:`, authError);
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
        localStorage.removeItem('user_data'); // CLEAR USER DATA
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

        // For clients, restore user data from localStorage if available
        const userData = localStorage.getItem('user_data');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                set({ user, token, isAuthenticated: true });
                return;
            } catch (e) {
                console.error("[AUTH] Error parsing user data:", e);
            }
        }

        // Fallback for clients if no data found
        set({
            user: { role: 'client' },
            token,
            isAuthenticated: true
        });
    },
}));

export default useAuthStore;
