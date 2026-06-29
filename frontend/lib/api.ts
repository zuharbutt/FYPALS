import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Track whether a redirect is already in flight so we don't double-redirect
let isRedirectingToLogin = false;

function forceLogout() {
  if (isRedirectingToLogin) return;
  isRedirectingToLogin = true;

  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    // Clear the entire persisted Zustand store so isAuthenticated resets to false
    localStorage.removeItem('fypals-auth');
    window.location.href = '/auth/login';
  }
}

// Unwrap { success, data, message } and handle 401 → silent refresh → redirect
api.interceptors.response.use(
    (res) => {
      // Unwrap the backend ApiResponse wrapper so callers receive data directly
      if (res.data && typeof res.data === 'object' && 'data' in res.data) {
        return res.data.data;
      }
      return res.data;
    },
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const oldToken =
              typeof window !== 'undefined' ? localStorage.getItem('token') : null;

          if (!oldToken) throw new Error('No token stored');

          const response = await axios.post(
              `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
              { token: oldToken }
          );

          const payload = response.data?.data ?? response.data;
          const newToken = payload?.token ?? payload;

          if (newToken && typeof newToken === 'string') {
            localStorage.setItem('token', newToken);
            // Also update the Zustand persisted store's token field
            try {
              const stored = localStorage.getItem('fypals-auth');
              if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed?.state) {
                  parsed.state.token = newToken;
                  localStorage.setItem('fypals-auth', JSON.stringify(parsed));
                }
              }
            } catch { /* ignore parse errors */ }

            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }

          throw new Error('No token in refresh response');
        } catch {
          // Refresh failed — force full logout and redirect to login
          forceLogout();
        }
      }

      return Promise.reject(error);
    }
);

export default api;

/**
 * Call this once in the root layout.
 * When the user returns to the tab after a long absence, we ping the backend
 * with the current token. If it returns 401 AND the refresh also fails,
 * forceLogout() is called automatically by the interceptor above — so the
 * stale Zustand state on the frontend is cleared and the user is sent to login.
 */
export function startSessionWatcher() {
  if (typeof window === 'undefined') return;

  const ping = async () => {
    const token = localStorage.getItem('token');
    if (!token) return; // already logged out

    try {
      // A lightweight authenticated endpoint — just checking the token is valid
      await api.get('/users/me/profile');
    } catch {
      // The interceptor handles 401 → refresh → logout automatically
    }
  };

  // Ping when the tab becomes visible again after being hidden
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      ping();
    }
  });

  // Also ping when the window regains focus (e.g. switching back from another app)
  window.addEventListener('focus', ping);
}