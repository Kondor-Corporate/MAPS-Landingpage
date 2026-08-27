import { describe, expect, it } from 'vitest';
import { normalizeApiBaseUrl } from '@/lib/apiConfig';

describe('apiConfig', () => {
  it('usa /api/v1 cuando la variable no está configurada', () => {
    expect(normalizeApiBaseUrl(undefined)).toBe('/api/v1');
    expect(normalizeApiBaseUrl('')).toBe('/api/v1');
  });

  it('preserva una base absoluta explícita', () => {
    expect(normalizeApiBaseUrl('https://api.example.invalid/api/v1')).toBe(
      'https://api.example.invalid/api/v1',
    );
  });

  it('elimina barras finales sobrantes', () => {
    expect(normalizeApiBaseUrl('/api/v1///')).toBe('/api/v1');
    expect(normalizeApiBaseUrl('https://api.example.invalid/api/v1/')).toBe(
      'https://api.example.invalid/api/v1',
    );
  });
});
