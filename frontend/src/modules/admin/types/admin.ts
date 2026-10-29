export type Admin = {
  id: number;
  usuario: string;
  activo: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export type CreateAdminPayload = {
  usuario: string;
  password: string;
  confirmPassword: string;
};

export type UpdateAdminUsuarioPayload = {
  usuario: string;
};

export type SetAdminActivePayload = {
  activo: boolean;
};

export type ResetAdminPasswordPayload = {
  newPassword: string;
  confirmPassword: string;
};

export type AdminStatusFilter = 'TODOS' | 'ACTIVOS' | 'INACTIVOS';
