import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v1Router } from './api/v1/index.js';
import { loadEnv } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { getCertificacionesUploadDir } from './lib/uploadPaths.js';

const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

export function createApp() {
  const env = loadEnv();

  const app = express();
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json());
  getCertificacionesUploadDir();
  app.use(
    '/uploads/certificaciones',
    express.static(path.join(backendRoot, 'uploads', 'certificaciones')),
  );
  app.use('/api/v1', v1Router);
  app.use(errorHandler);
  return app;
}
