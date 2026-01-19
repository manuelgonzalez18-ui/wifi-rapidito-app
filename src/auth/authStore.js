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
            // In Mock mode, this hits the mock adapter
            const response = await api.post('/auth/login', { username, password });

            const { token, user } = response.data;

            localStorage.setItem('token', token);
            // Save user role for basics, though we should fetch profile on reload
            localStorage.setItem('user_role', user.role);

            set({
                user,
                token,
                isAuthenticated: true,
                isLoading: false
            });

            return user;
        } catch (error) {
            set({
                error: error.response?.data?.detail || 'Error al iniciar sesión',
                isLoading: false
            });
            throw error;
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user_role');
        set({ user: null, token: null, isAuthenticated: false });
    },

    // Restore session from token (Mock implementation basically just sets user from local storage logic or fetches me)
    checkAuth: async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            // We could call /auth/me here
            const response = await api.get('/auth/me'); // This endpoint needs to be mocked
            set({ user: response.data, isAuthenticated: true });
        } catch (err) {
            get().logout();
        }
    }
}));

export default useAuthStore;
