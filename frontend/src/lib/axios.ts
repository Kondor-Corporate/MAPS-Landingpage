import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getAuthState, useAuthStore } from '@/store/authStore';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

type ApiSuccess<T> = { data: T; message: string; error: null };
type RefreshPayload = { accessToken: string };

const refreshClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let refreshLock: Promise<string> | null = null;

/**
 * Renueva el access token usando la cookie httpOnly. Sin interceptores
 * (mismo cuerpo que usa el interceptor al gestionar 401).
 */
export function refreshAccessToken() {
  if (!refreshLock) {
    refreshLock = (async () => {
      const { data } = await refreshClient.post<ApiSuccess<RefreshPayload>>(
        '/auth/refresh',
        {},
      );
      const token = data.data?.accessToken;
      if (!token) {
        throw new Error('Respuesta de refresh inválida');
      }
      useAuthStore.getState().updateToken(token);
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

    if (original._retry) {
      getAuthState().logout();
      window.location.replace('/login');
      return Promise.reject(error);
    }

    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Evitar bucle si /auth/refresh reutilizara el mismo client con interceptor.
    if (original.url?.includes('/auth/refresh')) {
      getAuthState().logout();
      window.location.replace('/login');
      return Promise.reject(error);
    }

    try {
      await refreshAccessToken();
    } catch {
      getAuthState().logout();
      window.location.replace('/login');
      return Promise.reject(error);
    }

    original._retry = true;
    return api(original);
  },
);
