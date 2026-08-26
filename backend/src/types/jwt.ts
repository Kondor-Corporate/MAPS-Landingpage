import type { Rol } from '@prisma/client';

export type JWTPayload = {
  sub: string;
  role: Rol;
  /** Versión persistente y monotónica para revocar access tokens. */
  ver: number;
};
