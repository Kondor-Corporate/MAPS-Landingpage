import type { JWTPayload } from './jwt.js';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export {};
