import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from '../config/env.js';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function getCertificacionesUploadDir(): string {
  const dir = path.join(backendRoot, 'uploads', 'certificaciones');
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function certificacionPublicUrl(filename: string): string {
  const env = loadEnv();
  const base =
    env.API_PUBLIC_URL?.replace(/\/$/, '') ??
    `http://localhost:${env.PORT}`;
  return `${base}/uploads/certificaciones/${filename}`;
}
