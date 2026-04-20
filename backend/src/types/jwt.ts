import type { Rol } from '@prisma/client';

export type JWTPayload = {
  sub: string;
  role: Rol;
};
