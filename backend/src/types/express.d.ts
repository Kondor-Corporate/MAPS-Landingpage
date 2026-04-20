import type { Role } from './roles.js';

export type JWTPayload = {
  sub: string;
  role: Role;
};

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export {};
