import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { RequestHandler } from 'express';
import request from 'supertest';
import {
  geocodeBurstLimiter,
  geocodeSustainedLimiter,
} from '../src/middlewares/geocodeLimiter.js';

function buildApp(userMiddleware?: RequestHandler) {
  const app = express();
  if (userMiddleware) app.use(userMiddleware);
  app.use(geocodeBurstLimiter, geocodeSustainedLimiter);
  app.get('/geocode', (_req, res) => res.json({ data: 'ok', message: null, error: null }));
  return app;
}

describe('geocodeBurstLimiter / geocodeSustainedLimiter', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('anónimo: permite 5 requests en la ventana de burst y corta la 6ª con 429', async () => {
    const app = buildApp();
    const agent = request.agent(app);

    for (let i = 0; i < 5; i += 1) {
      await agent.get('/geocode').expect(200);
    }
    const res = await agent.get('/geocode').expect(429);
    expect(res.body).toMatchObject({ data: null, error: null });
    expect(typeof res.body.message).toBe('string');
  });

  it('autenticado: tiene un cupo de burst mayor (10) que un anónimo (5)', async () => {
    const app = buildApp((req, _res, next) => {
      req.user = { sub: 'user-rate-1', role: 'PRODUCTOR', ver: 1 };
      next();
    });
    const agent = request.agent(app);

    for (let i = 0; i < 10; i += 1) {
      await agent.get('/geocode').expect(200);
    }
    await agent.get('/geocode').expect(429);
  });
});
