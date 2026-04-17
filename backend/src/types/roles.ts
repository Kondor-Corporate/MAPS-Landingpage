export const Role = {
  PRODUCER: 'PRODUCER',
  ADMIN: 'ADMIN',
  SUPERADMIN: 'SUPERADMIN',
} as const;

export type Role = (typeof Role)[keyof typeof Role];
