import { Router } from 'express';
import { authController } from '../../../controllers/auth.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';
import { loginAccountLimiter, loginIpLimiter } from '../../../middlewares/loginLimiter.js';
import { passwordChangeLimiter } from '../../../middlewares/passwordChangeLimiter.js';
import { validate } from '../../../middlewares/validate.js';
import { changeMyPasswordSchema } from '../../../validations/auth.schema.js';

export const authRouter = Router();

authRouter.post('/login', loginIpLimiter, loginAccountLimiter, authController.login);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', authController.logout);
authRouter.patch(
  '/me/password',
  authenticate,
  passwordChangeLimiter,
  validate({ body: changeMyPasswordSchema }),
  authController.changeMyPassword,
);
