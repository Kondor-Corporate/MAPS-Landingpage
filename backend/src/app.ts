import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { v1Router } from './api/v1/index.js';
import { loadEnv } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';

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
  app.use('/api/v1', v1Router);
  app.use(errorHandler);
  return app;
}
