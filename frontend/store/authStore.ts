import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthStore {
    token: string | null;
    refreshToken: string | null;   // ← NEW
    user: User | null;
    isAuthenticated: boolean;
    login: (token: string, user: User, refreshToken?: string) => void;
    logout: () => void;
    updateUser: (user: Partial<User>) => void;
    setToken: (token: string) => void;  // ← NEW: used by api.ts interceptor after refresh
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => ({
            token: null,
            refreshToken: null,
            user: null,
            isAuthenticated: false,

            login: (token, user, refreshToken) => {
                if (typeof window !== 'undefined') {
                    localStorage.setItem('token', token);
                    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
                }
                set({ token, user, isAuthenticated: true, refreshToken: refreshToken ?? null });
            },

            logout: () => {
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                }
                set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
            },

            updateUser: (partial) => {
                const current = get().user;
                if (current) set({ user: { ...current, ...partial } });
            },

            // Called by api.ts after a successful silent refresh
            setToken: (token) => {
                if (typeof window !== 'undefined') {
                    localStorage.setItem('token', token);
                }
                set({ token });
            },
        }),
        { name: 'fypals-auth' }
    )
);