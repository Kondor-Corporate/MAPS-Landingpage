import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

describe('producersMapLimiter', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('permite 60 requests por minuto por IP y corta la 61ª con 429', async () => {
    // `max` se resuelve una sola vez al importar el módulo (mismo patrón que
    // loginLimiter/passwordChangeLimiter), por eso se reimporta tras stubear NODE_ENV.
    const { producersMapLimiter } = await import(
      '../src/middlewares/producersMapLimiter.js'
    );
    const app = express();
    app.use(producersMapLimiter);
    app.get('/producers/map', (_req, res) =>
      res.json({ data: { producers: [] }, message: null, error: null }),
    );
    const agent = request.agent(app);

    for (let i = 0; i < 60; i += 1) {
      await agent.get('/producers/map').expect(200);
    }
    const res = await agent.get('/producers/map').expect(429);
    expect(res.body).toMatchObject({ data: null, error: null });
  });
});
