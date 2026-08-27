import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { envSchema, parseEnv } from '../src/config/env.js';

const baseEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
  JWT_SECRET: 'jwt_secret_for_tests_at_least_32_chars',
  REFRESH_SECRET: 'refresh_secret_for_tests_at_least_32_chars',
};

const validGcsEnv = {
  ...baseEnv,
  STORAGE_PROVIDER: 'gcs',
  GCS_BUCKET: 'private-staging-bucket',
  API_PUBLIC_URL: 'https://staging.example.invalid',
};

describe('configuración GCS', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('no exige variables GCS para local ni para una configuración S3 completa', () => {
    expect(envSchema.safeParse({ ...baseEnv, STORAGE_PROVIDER: 'local' }).success).toBe(true);
    expect(envSchema.safeParse({ ...baseEnv, STORAGE_PROVIDER: 'gcs' }).success).toBe(false);
    expect(
      envSchema.safeParse({
        ...baseEnv,
        STORAGE_PROVIDER: 's3',
        S3_BUCKET: 'bucket',
        S3_REGION: 'us-east-1',
        S3_ACCESS_KEY: 'access',
        S3_SECRET_KEY: 'secret',
      }).success,
    ).toBe(true);
  });

  it.each([
    [{ API_PUBLIC_URL: validGcsEnv.API_PUBLIC_URL }, 'GCS_BUCKET'],
    [{ GCS_BUCKET: validGcsEnv.GCS_BUCKET }, 'API_PUBLIC_URL'],
  ])('falla temprano cuando gcs no tiene %s', (provided, missingField) => {
    const raw = { ...baseEnv, STORAGE_PROVIDER: 'gcs', ...provided };
    const result = envSchema.safeParse(raw);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors[missingField]).toBeDefined();
    }
    expect(() => parseEnv(raw)).toThrow('Invalid environment variables');
  });

  it('acepta gcs cuando bucket y URL pública están configurados', () => {
    expect(envSchema.safeParse(validGcsEnv).success).toBe(true);
  });

  it.each([
    ['', ''],
    ['/maps-staging/private/', 'maps-staging/private'],
  ])('normaliza el prefijo %j como %j', (rawPrefix, expectedPrefix) => {
    const result = envSchema.safeParse({
      ...validGcsEnv,
      GCS_PREFIX: rawPrefix,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.GCS_PREFIX).toBe(expectedPrefix);
    }
  });

  it.each(['maps//private', 'maps/../private', 'maps/%2e%2e/private'])(
    'rechaza el prefijo inseguro %s',
    (prefix) => {
      expect(
        envSchema.safeParse({
          ...validGcsEnv,
          GCS_PREFIX: prefix,
        }).success,
      ).toBe(false);
    },
  );

  it('normaliza una barra final en API_PUBLIC_URL', () => {
    const result = envSchema.safeParse({
      ...validGcsEnv,
      API_PUBLIC_URL: 'https://staging.example.invalid/',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.API_PUBLIC_URL).toBe('https://staging.example.invalid');
    }
  });

  it('rechaza credenciales, path, query y fragment en API_PUBLIC_URL', () => {
    for (const invalid of [
      'https://staging.example.invalid/api',
      'https://staging.example.invalid/?query=1',
      'https://staging.example.invalid/#fragment',
      'https://user:password@staging.example.invalid',
    ]) {
      expect(
        envSchema.safeParse({ ...validGcsEnv, API_PUBLIC_URL: invalid }).success,
      ).toBe(false);
    }
  });
});
