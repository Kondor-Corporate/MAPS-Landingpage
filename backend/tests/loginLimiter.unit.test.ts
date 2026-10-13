import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { loginAccountLimiter, loginIpLimiter } from '../src/middlewares/loginLimiter.js';

/**
 * App mínima que replica el orden real: parse de body → limiter por IP → limiter
 * por cuenta+IP → handler de login simulado (200 si la contraseña es `correct`).
 * `trust proxy` + `X-Forwarded-For` permiten simular distintas IP de cliente.
 */
function buildApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.post('/auth/login', loginIpLimiter, loginAccountLimiter, (req, res) => {
    const { password } = req.body as { password?: string };
    if (password === 'correct') {
      res.status(200).json({ data: { ok: true }, message: 'OK', error: null });
      return;
    }
    res.status(401).json({ data: null, message: 'Credenciales inválidas', error: null });
  });
  return app;
}

function attempt(app: express.Express, ip: string, usuario: string, password = 'wrong') {
  return request(app)
    .post('/auth/login')
    .set('X-Forwarded-For', ip)
    .send({ usuario, password });
}

describe('loginIpLimiter / loginAccountLimiter', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('B1 — por IP: permite 10 intentos y corta el 11º con 429 (usuarios distintos)', async () => {
    const app = buildApp();
    const ip = '10.0.0.1';
    for (let i = 0; i < 10; i += 1) {
      await attempt(app, ip, `user-${i}`).expect(401);
    }
    const res = await attempt(app, ip, 'user-11').expect(429);
    expect(res.body).toMatchObject({ data: null, error: null });
  });

  it('B2 — por cuenta+IP: corta el 6º intento fallido a la misma cuenta con 429', async () => {
    const app = buildApp();
    const ip = '10.0.0.2';
    for (let i = 0; i < 5; i += 1) {
      await attempt(app, ip, 'acct-victim').expect(401);
    }
    await attempt(app, ip, 'acct-victim').expect(429);
  });

  it('B2 — no permite DoS: otro origen conserva su propio cupo para la misma cuenta', async () => {
    const app = buildApp();
    const attacker = '10.0.0.3';
    const legit = '10.0.0.4';

    // El atacante agota el cupo de la cuenta desde su IP.
    for (let i = 0; i < 5; i += 1) {
      await attempt(app, attacker, 'shared-victim').expect(401);
    }
    await attempt(app, attacker, 'shared-victim').expect(429);

    // El usuario legítimo, desde otra IP, NO queda bloqueado y puede entrar.
    await attempt(app, legit, 'shared-victim', 'correct').expect(200);
  });

  it('B7 — en 429 no expone encabezados RateLimit-* pero incluye Retry-After', async () => {
    const app = buildApp();
    const ip = '10.0.0.5';
    for (let i = 0; i < 5; i += 1) {
      await attempt(app, ip, 'hdr-acct').expect(401);
    }
    const res = await attempt(app, ip, 'hdr-acct').expect(429);
    expect(res.headers['ratelimit-limit']).toBeUndefined();
    expect(res.headers['ratelimit-remaining']).toBeUndefined();
    expect(res.headers['x-ratelimit-limit']).toBeUndefined();
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('login correcto no consume cupo de la cuenta (skipSuccessfulRequests)', async () => {
    const app = buildApp();
    const ip = '10.0.0.6';
    // 9 logins correctos: no deben acumular cupo de cuenta (límite 5) ni de IP (límite 10).
    for (let i = 0; i < 9; i += 1) {
      await attempt(app, ip, 'happy-acct', 'correct').expect(200);
    }
  });
});
