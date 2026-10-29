import { Rol, type PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bootstrapAdmin, parseBootstrapAdminConfig } from '../src/jobs/bootstrapAdmin.js';

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn() },
}));

const hashMock = vi.mocked(bcrypt.hash);

function createPrismaMock() {
  const tx = {
    usuario: { update: vi.fn() },
    sesionToken: { deleteMany: vi.fn() },
  };
  const client = {
    usuario: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) => callback(tx)),
  };
  return { client: client as unknown as PrismaClient, raw: client, tx };
}

const validConfig = {
  email: 'admin@example.invalid',
  password: 'ClaveSegura123',
  force: false,
};

describe('bootstrap de administrador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hashMock.mockResolvedValue('hash-seguro' as never);
  });

  it('valida email y la política real de contraseña sin defaults', () => {
    expect(() =>
      parseBootstrapAdminConfig({
        BOOTSTRAP_ADMIN_EMAIL: 'no-es-email',
        BOOTSTRAP_ADMIN_PASSWORD: 'debil',
      }),
    ).toThrow(/BOOTSTRAP_ADMIN_EMAIL.*BOOTSTRAP_ADMIN_PASSWORD/);
  });

  it('crea únicamente un SUPERADMIN activo cuando no existe', async () => {
    const { client, raw } = createPrismaMock();
    raw.usuario.findUnique.mockResolvedValue(null);

    const result = await bootstrapAdmin(client, validConfig);

    expect(result.action).toBe('created');
    expect(raw.usuario.create).toHaveBeenCalledWith({
      data: {
        usuario: validConfig.email,
        passwordHash: 'hash-seguro',
        rol: Rol.SUPERADMIN,
        activo: true,
      },
    });
  });

  it('es idempotente y no resetea la contraseña por defecto', async () => {
    const { client, raw } = createPrismaMock();
    raw.usuario.findUnique.mockResolvedValue({
      id: 1,
      activo: true,
      rol: Rol.SUPERADMIN,
    });

    const result = await bootstrapAdmin(client, validConfig);

    expect(result.action).toBe('unchanged');
    expect(hashMock).not.toHaveBeenCalled();
    expect(raw.usuario.create).not.toHaveBeenCalled();
    expect(raw.$transaction).not.toHaveBeenCalled();
  });

  it('rechaza corregir una cuenta incompatible sin force explícito', async () => {
    const { client, raw } = createPrismaMock();
    raw.usuario.findUnique.mockResolvedValue({
      id: 9,
      activo: true,
      rol: Rol.PRODUCTOR,
    });

    await expect(bootstrapAdmin(client, validConfig)).rejects.toThrow('BOOTSTRAP_ADMIN_FORCE=true');
    expect(hashMock).not.toHaveBeenCalled();
  });

  it('requiere force para promover un ADMIN existente a SUPERADMIN', async () => {
    const { client, raw } = createPrismaMock();
    raw.usuario.findUnique.mockResolvedValue({
      id: 9,
      activo: true,
      rol: Rol.ADMIN,
    });

    await expect(bootstrapAdmin(client, validConfig)).rejects.toThrow('BOOTSTRAP_ADMIN_FORCE=true');
    expect(hashMock).not.toHaveBeenCalled();
  });

  it('con force actualiza rol y contraseña y revoca sesiones existentes', async () => {
    const { client, raw, tx } = createPrismaMock();
    raw.usuario.findUnique.mockResolvedValue({
      id: 9,
      activo: false,
      rol: Rol.PRODUCTOR,
    });

    const result = await bootstrapAdmin(client, { ...validConfig, force: true });

    expect(result.action).toBe('updated');
    expect(tx.usuario.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: {
        passwordHash: 'hash-seguro',
        rol: Rol.SUPERADMIN,
        activo: true,
        tokenVersion: { increment: 1 },
      },
    });
    expect(tx.sesionToken.deleteMany).toHaveBeenCalledWith({
      where: { usuarioId: 9 },
    });
  });
});
