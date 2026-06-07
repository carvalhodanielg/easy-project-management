import axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '../store/auth.store';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Endpoints where a 401 means "these credentials are bad", not "access token
// expired" — refreshing would be pointless (and could loop).
const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout'];

// Shared in-flight refresh so concurrent 401s trigger a single /auth/refresh.
let refreshPromise: Promise<string> | null = null;

function performRefresh(refreshToken: string): Promise<string> {
  // Bare axios call (no interceptors) to avoid recursion on its own response.
  return axios
    .post<{ data: { token: string } }>(`${baseURL}/auth/refresh`, {
      refreshToken,
    })
    .then((res) => {
      const token = res.data.data.token;
      useAuthStore.getState().setToken(token);
      return token;
    });
}

function forceLogout() {
  useAuthStore.getState().logout();
  window.location.href = '/login';
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const status = error.response?.status;
    const url = original?.url ?? '';

    const isRefreshable =
      status === 401 &&
      original &&
      !original._retry &&
      !NO_REFRESH_PATHS.some((p) => url.includes(p));

    if (!isRefreshable) {
      // A failed refresh (or login) with 401 ends the session.
      if (status === 401 && NO_REFRESH_PATHS.some((p) => url.includes(p))) {
        if (url.includes('/auth/refresh')) forceLogout();
      }
      return Promise.reject(error);
    }

    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      forceLogout();
      return Promise.reject(error);
    }

    original._retry = true;
    try {
      refreshPromise = refreshPromise ?? performRefresh(refreshToken);
      const newToken = await refreshPromise;
      original.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(original);
    } catch (refreshError) {
      forceLogout();
      return Promise.reject(refreshError);
    } finally {
      refreshPromise = null;
    }
  },
);
