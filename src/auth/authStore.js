import { create } from 'zustand';
import api from '../api/client';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientLoginError = (error) => {
    const status = error?.response?.status;
    return (
        !error?.response ||
        ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'].includes(error?.code) ||
        [502, 503, 504].includes(status)
    );
};

const loginErrorMessage = (error) => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return 'Tu teléfono está sin conexión a Internet. Revisa Wi‑Fi o datos móviles e intenta nuevamente.';
    }

    const serverMessage = error?.response?.data?.error;
    if (serverMessage) return serverMessage;

    if (['ECONNABORTED', 'ETIMEDOUT'].includes(error?.code)) {
        return 'La conexión tardó demasiado. Intenta nuevamente en unos segundos.';
    }

    if (!error?.response || error?.code === 'ERR_NETWORK') {
        return 'No pudimos conectar con el servidor de Wifi Rapidito. Verifica tu conexión e intenta nuevamente.';
    }

    return error?.message || 'No pudimos iniciar sesión. Intenta nuevamente.';
};

const useAuthStore = create((set) => ({
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

            const payload = {
                username: username.trim(),
                password,
            };

            let response;
            let lastError;

            // A mobile connection can briefly change between Wi-Fi and cellular.
            // Retry exactly once for transport/upstream errors, never for bad credentials.
            for (let attempt = 0; attempt < 2; attempt += 1) {
                try {
                    response = await api.post('/login_wisphub.php', payload, {
                        timeout: 12000,
                        headers: { 'Cache-Control': 'no-cache' },
                    });
                    lastError = null;
                    break;
                } catch (error) {
                    lastError = error;
                    if (attempt === 0 && isTransientLoginError(error)) {
                        await wait(700);
                        continue;
                    }
                    break;
                }
            }

            if (lastError) throw lastError;

            if (response?.data?.success && response.data.user) {
                const user = {
                    role: 'client',
                    ...response.data.user,
                };

                const token = response.data.token;
                localStorage.setItem('token', token);
                localStorage.setItem('user_role', 'client');
                localStorage.setItem('user_data', JSON.stringify(user));

                set({ user, token, isAuthenticated: true, isLoading: false });
                return user;
            }

            throw new Error(response?.data?.error || 'Error de autenticación');
        } catch (error) {
            console.error('[AUTH] Login error:', error);
            const errorMessage = loginErrorMessage(error);
            set({ error: errorMessage, isLoading: false });
            throw new Error(errorMessage);
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_data');
        set({ user: null, token: null, isAuthenticated: false, error: null });
    },

    loadUser: async () => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('user_role');

        if (!token) {
            set({ isAuthenticated: false, user: null });
            return;
        }

        if (role === 'staff') {
            set({
                user: { role: 'staff', name: 'Administrador', username: 'admin' },
                token,
                isAuthenticated: true,
            });
            return;
        }

        const userData = localStorage.getItem('user_data');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                set({ user, token, isAuthenticated: true });
                return;
            } catch (error) {
                console.error('[AUTH] Error parsing user data:', error);
            }
        }

        set({
            user: { role: 'client' },
            token,
            isAuthenticated: true,
        });
    },
}));

export default useAuthStore;
