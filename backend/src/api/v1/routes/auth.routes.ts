import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../../../controllers/auth.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

export const authRouter = Router();

function loginAttemptsPerWindow(): number {
  if (process.env.NODE_ENV === 'test') return 10_000;
  if (process.env.NODE_ENV === 'development') return 500;
  return 10;
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: loginAttemptsPerWindow(),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    data: null,
    message: 'Demasiados intentos. Intenta de nuevo en 15 minutos.',
    error: null,
  },
});

authRouter.post('/login', loginLimiter, authController.login);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', authenticate, authController.logout);
