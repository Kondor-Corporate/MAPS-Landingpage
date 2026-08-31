const DEFAULT_API_BASE_URL = '/api/v1';

export function normalizeApiBaseUrl(value: string | undefined): string {
  const normalized = value?.trim().replace(/\/+$/, '');
  return normalized || DEFAULT_API_BASE_URL;
}

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
