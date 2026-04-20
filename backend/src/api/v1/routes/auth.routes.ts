import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../../../controllers/auth.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 10_000 : 10,
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
