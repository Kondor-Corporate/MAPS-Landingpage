/** Alineado con el enum Prisma `Rol` (PRODUCTOR, no PRODUCER). */
export const Role = {
  PRODUCTOR: 'PRODUCTOR',
  ADMIN: 'ADMIN',
  SUPERADMIN: 'SUPERADMIN',
} as const;

export type Role = (typeof Role)[keyof typeof Role];
