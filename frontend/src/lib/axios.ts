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

/** Nombre estable del Web Lock que serializa el refresh entre pestañas. */
const REFRESH_LOCK_NAME = 'maps-auth-refresh';

/**
 * Ejecuta el POST de refresh dentro de un lock exclusivo del navegador.
 * Sin `navigator.locks` se conserva el comportamiento de una sola pestaña.
 */
function withCrossTabRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = globalThis.navigator?.locks;
  if (!locks?.request) return task();
  // lib.dom tipa el callback como `() => T` y no aplana la promesa.
  // El navegador sí espera ese callback; este then solo corrige el tipo.
  return locks.request(REFRESH_LOCK_NAME, () => task()).then((result) => result);
}

function isAuthEndpoint(url?: string) {
  return (
    url?.includes('/auth/login') ||
    url?.includes('/auth/refresh') ||
    url?.includes('/auth/logout')
  );
}

/**
 * Un fallo con respuesta 4xx de refresh confirma que la sesión ya no es válida.
 * 409 queda afuera: es una rotación que perdió la carrera, no una sesión revocada.
 */
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
    refreshLock = withCrossTabRefreshLock(async () => {
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
    }).finally(() => {
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
