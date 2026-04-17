import cors from 'cors';
import express from 'express';
import { v1Router } from './api/v1/index.js';
import { errorHandler } from './middlewares/errorHandler.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/v1', v1Router);
  app.use(errorHandler);
  return app;
}
