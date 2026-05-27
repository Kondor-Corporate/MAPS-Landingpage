import { loadEnv } from '../../config/env.js';
import { LocalStorageAdapter } from './local.adapter.js';
import { S3StorageAdapter } from './s3.adapter.js';
import type { StorageAdapter } from './types.js';

let cached: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (cached) return cached;
  const env = loadEnv();
  cached = env.STORAGE_PROVIDER === 's3' ? new S3StorageAdapter() : new LocalStorageAdapter();
  return cached;
}

export type { StorageAdapter, UploadCertificacionInput, UploadCertificacionResult } from './types.js';
