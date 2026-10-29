import { Prisma, Rol, type Usuario } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

const BCRYPT_COST = 12;

const adminSelect = {
  id: true,
  usuario: true,
  activo: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.UsuarioSelect;

type AdminRow = Pick<Usuario, 'id' | 'usuario' | 'activo' | 'lastLoginAt' | 'createdAt'>;

export type AdminDto = {
  id: number;
  usuario: string;
  activo: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export type ListAdminsQuery = {
  activo?: boolean;
};

function isPrismaUniqueViolation(err: unknown): err is Prisma.PrismaClientKnownRequestError {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

function toAdminDto(row: AdminRow): AdminDto {
  return {
    id: row.id,
    usuario: row.usuario,
    activo: row.activo,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function uniqueUsuarioConflict(): AppError {
  return new AppError(409, 'El usuario ya está registrado');
}

async function requireAdminUser(id: number): Promise<AdminRow> {
  const row = await prisma.usuario.findUnique({
    where: { id },
    select: { ...adminSelect, rol: true },
  });
  if (!row || row.rol !== Rol.ADMIN) {
    throw new AppError(404, 'Administrador no encontrado');
  }
  const { rol: _rol, ...admin } = row;
  return admin;
}

async function assertUsuarioAvailable(usuarioNorm: string, excludeId?: number): Promise<void> {
  const taken = await prisma.usuario.findFirst({
    where: {
      usuario: { equals: usuarioNorm, mode: 'insensitive' },
      ...(excludeId !== undefined ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (taken) {
    throw uniqueUsuarioConflict();
  }
}

export const adminsService = {
  async list(query: ListAdminsQuery): Promise<AdminDto[]> {
    const rows = await prisma.usuario.findMany({
      where: {
        rol: Rol.ADMIN,
        ...(query.activo !== undefined ? { activo: query.activo } : {}),
      },
      select: adminSelect,
      orderBy: { id: 'desc' },
    });
    return rows.map(toAdminDto);
  },

  async create(
    input: { usuario: string; password: string },
    options: { creadoPorId: number },
  ): Promise<AdminDto> {
    await assertUsuarioAvailable(input.usuario);
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

    try {
      const created = await prisma.usuario.create({
        data: {
          usuario: input.usuario,
          passwordHash,
          rol: Rol.ADMIN,
          activo: true,
          creadoPorId: options.creadoPorId,
        },
        select: adminSelect,
      });
      return toAdminDto(created);
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        throw uniqueUsuarioConflict();
      }
      throw err;
    }
  },

  async updateUsuario(id: number, usuarioNorm: string): Promise<AdminDto> {
    const current = await requireAdminUser(id);
    if (current.usuario === usuarioNorm) {
      return toAdminDto(current);
    }

    await assertUsuarioAvailable(usuarioNorm, id);

    try {
      const updated = await prisma.$transaction(async (tx) => {
        await tx.usuario.update({
          where: { id },
          data: {
            usuario: usuarioNorm,
            tokenVersion: { increment: 1 },
          },
        });
        await tx.sesionToken.deleteMany({ where: { usuarioId: id } });
        return tx.usuario.findUniqueOrThrow({
          where: { id },
          select: adminSelect,
        });
      });
      return toAdminDto(updated);
    } catch (err) {
      if (err instanceof AppError) throw err;
      if (isPrismaUniqueViolation(err)) {
        throw uniqueUsuarioConflict();
      }
      throw err;
    }
  },

  async setActivo(id: number, activo: boolean): Promise<AdminDto> {
    const current = await requireAdminUser(id);
    if (current.activo === activo) {
      return toAdminDto(current);
    }

    if (activo) {
      const updated = await prisma.usuario.update({
        where: { id },
        data: { activo: true },
        select: adminSelect,
      });
      return toAdminDto(updated);
    }

    await prisma.$transaction([
      prisma.usuario.update({
        where: { id },
        data: {
          activo: false,
          tokenVersion: { increment: 1 },
        },
      }),
      prisma.sesionToken.deleteMany({ where: { usuarioId: id } }),
    ]);

    const row = await prisma.usuario.findUniqueOrThrow({
      where: { id },
      select: adminSelect,
    });
    return toAdminDto(row);
  },

  async resetPassword(id: number, input: { newPassword: string }): Promise<void> {
    await requireAdminUser(id);
    const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_COST);
    await prisma.$transaction([
      prisma.usuario.update({
        where: { id },
        data: {
          passwordHash,
          tokenVersion: { increment: 1 },
        },
      }),
      prisma.sesionToken.deleteMany({ where: { usuarioId: id } }),
    ]);
  },
};
