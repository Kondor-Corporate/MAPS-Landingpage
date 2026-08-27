import { loadEnv } from '../../config/env.js';
import { GcsStorageAdapter } from './gcs.adapter.js';
import { LocalStorageAdapter } from './local.adapter.js';
import { S3StorageAdapter } from './s3.adapter.js';
import type { StorageAdapter } from './types.js';

let cached: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (cached) return cached;
  const env = loadEnv();
  if (env.STORAGE_PROVIDER === 'gcs') {
    cached = new GcsStorageAdapter();
  } else if (env.STORAGE_PROVIDER === 's3') {
    cached = new S3StorageAdapter();
  } else {
    cached = new LocalStorageAdapter();
  }
  return cached;
}

export type {
  StorageAdapter,
  StoredFileCategory,
  StoredFileReadResult,
  UploadCertificacionInput,
  UploadCertificacionResult,
} from './types.js';
