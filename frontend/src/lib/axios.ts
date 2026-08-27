import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/lib/apiConfig';
import { getAuthState, useAuthStore, type AuthUser } from '@/store/authStore';

type ApiSuccess<T> = { data: T; message: string; error: null };
type RefreshPayload = { accessToken: string; user?: AuthUser };

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let refreshLock: Promise<string> | null = null;
let sessionInvalidationStarted = false;

function isAuthEndpoint(url?: string) {
  return url?.includes('/auth/login') || url?.includes('/auth/refresh');
}

/** Un fallo con respuesta 4xx de refresh confirma que la sesión ya no es válida. */
export function isInvalidRefreshError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === 400 || status === 401 || status === 403;
}

function endSessionOnce() {
  if (sessionInvalidationStarted) return;
  sessionInvalidationStarted = true;
  getAuthState().logout();
  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
}

/**
 * Renueva el access token usando la cookie httpOnly. Sin interceptores
 * (mismo cuerpo que usa el interceptor al gestionar 401).
 */
export function refreshAccessToken() {
  if (!refreshLock) {
    refreshLock = (async () => {
      const { data } = await refreshClient.post<ApiSuccess<RefreshPayload>>('/auth/refresh', {});
      const token = data.data?.accessToken;
      if (!token) {
        throw new Error('Respuesta de refresh inválida');
      }
      if (data.data.user) {
        useAuthStore.getState().login(data.data.user, token);
      } else {
        useAuthStore.getState().updateToken(token);
      }
      sessionInvalidationStarted = false;
      return token;
    })().finally(() => {
      refreshLock = null;
    });
  }
  return refreshLock;
}

api.interceptors.request.use((config) => {
  const { accessToken } = getAuthState();
  if (accessToken) {
    sessionInvalidationStarted = false;
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (!original) {
      return Promise.reject(error);
    }

    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // 401 funcional en login: credenciales incorrectas, no sesión expirada.
    if (isAuthEndpoint(original.url)) {
      return Promise.reject(error);
    }

    if (original._retry) {
      endSessionOnce();
      return Promise.reject(error);
    }

    original._retry = true;
    try {
      await refreshAccessToken();
    } catch (refreshError) {
      if (isInvalidRefreshError(refreshError)) {
        endSessionOnce();
      }
      return Promise.reject(refreshError);
    }

    return api(original);
  },
);
