import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { v1Router } from './api/v1/index.js';
import { loadEnv } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';

/** Límite de cuerpo JSON / urlencoded (payloads accidentales o abuso). */
export const REQUEST_BODY_LIMIT = '1mb';

export function createApp() {
  const env = loadEnv();

  const app = express();
  app.set('trust proxy', env.trustProxy);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: REQUEST_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: REQUEST_BODY_LIMIT }));
  app.use('/api/v1', v1Router);
  app.use(errorHandler);
  return app;
}
