import { Prisma, type Productor, type Usuario } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { loadEnv } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

const usuarioListSelect = {
  id: true,
  usuario: true,
  activo: true,
  rol: true,
  createdAt: true,
  updatedAt: true,
} satisfies Record<keyof Pick<Usuario, 'id' | 'usuario' | 'activo' | 'rol' | 'createdAt' | 'updatedAt'>, true>;

export type AdminProducerRow = Productor & {
  usuario: Pick<Usuario, keyof typeof usuarioListSelect>;
};

function isPrismaUniqueViolation(err: unknown): err is Prisma.PrismaClientKnownRequestError {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

function slugifyBase(nombre: string, apellido: string): string {
  const raw = `${nombre}-${apellido}`
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return raw.length > 0 ? raw.slice(0, 72) : 'productor';
}

async function ensureUniqueSlug(base: string): Promise<string> {
  for (let n = 0; n < 200; n += 1) {
    const candidate =
      n === 0 ? base : `${base}-${randomBytes(2).toString('hex')}`;
    const exists = await prisma.productor.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  throw new AppError(500, 'No se pudo generar un slug único');
}

function toAdminProducerDto(row: AdminProducerRow) {
  return {
    id: row.id,
    slug: row.slug,
    nombre: row.nombre,
    apellido: row.apellido,
    bio: row.bio,
    ciudad: row.ciudad,
    dni: row.dni,
    foto: row.foto,
    latitud: row.latitud,
    longitud: row.longitud,
    telefono: row.telefono,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    usuario: row.usuario,
  };
}

export type ListProducersQuery = {
  activo?: boolean;
};

export const producersService = {
  async list(query: ListProducersQuery): Promise<AdminProducerRow[]> {
    const where: Prisma.ProductorWhereInput =
      query.activo === undefined
        ? {}
        : { usuario: { activo: query.activo } };

    const rows = await prisma.productor.findMany({
      where,
      include: { usuario: { select: usuarioListSelect } },
      orderBy: { id: 'desc' },
    });
    return rows;
  },

  async getById(id: number): Promise<AdminProducerRow | null> {
    return prisma.productor.findUnique({
      where: { id },
      include: { usuario: { select: usuarioListSelect } },
    });
  },

  async create(
    input: {
      nombre: string;
      apellido: string;
      email: string;
      telefono?: string;
      activo?: boolean;
    },
    options?: { creadoPorId?: number },
  ): Promise<AdminProducerRow> {
    const emailNorm = input.email.trim().toLowerCase();
    const existing = await prisma.usuario.findUnique({
      where: { usuario: emailNorm },
      select: { id: true },
    });
    if (existing) {
      throw new AppError(409, 'El email ya está registrado');
    }

    const env = loadEnv();
    const passwordHash = await bcrypt.hash(env.DEFAULT_PRODUCER_PASSWORD, 12);
    const slugBase = slugifyBase(input.nombre.trim(), input.apellido.trim());
    const slug = await ensureUniqueSlug(slugBase);
    const activo = input.activo ?? true;

    try {
      const created = await prisma.$transaction(async (tx) => {
        const usuario = await tx.usuario.create({
          data: {
            usuario: emailNorm,
            passwordHash,
            rol: 'PRODUCTOR',
            activo,
            ...(options?.creadoPorId !== undefined
              ? { creadoPorId: options.creadoPorId }
              : {}),
          },
        });

        const productor = await tx.productor.create({
          data: {
            usuarioId: usuario.id,
            slug,
            nombre: input.nombre.trim(),
            apellido: input.apellido.trim(),
            telefono: input.telefono?.trim() || null,
          },
          include: { usuario: { select: usuarioListSelect } },
        });
        return productor;
      });
      return created;
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        const target = (err.meta?.target as string[] | undefined)?.join(', ');
        throw new AppError(
          409,
          target
            ? `Conflicto de unicidad (${target})`
            : 'Conflicto de unicidad',
        );
      }
      throw err;
    }
  },

  async update(
    id: number,
    input: {
      nombre?: string;
      apellido?: string;
      email?: string;
      telefono?: string;
    },
  ): Promise<AdminProducerRow> {
    const current = await prisma.productor.findUnique({
      where: { id },
      include: { usuario: { select: { id: true, usuario: true } } },
    });
    if (!current) {
      throw new AppError(404, 'Productor no encontrado');
    }

    const dataProductor: Prisma.ProductorUpdateInput = {};
    if (input.nombre !== undefined) dataProductor.nombre = input.nombre.trim();
    if (input.apellido !== undefined) dataProductor.apellido = input.apellido.trim();
    if (input.telefono !== undefined) {
      dataProductor.telefono = input.telefono.trim() === '' ? null : input.telefono.trim();
    }

    const emailNorm =
      input.email !== undefined ? input.email.trim().toLowerCase() : undefined;

    try {
      const updated = await prisma.$transaction(async (tx) => {
        if (emailNorm !== undefined && emailNorm !== current.usuario.usuario) {
          const taken = await tx.usuario.findFirst({
            where: { usuario: emailNorm, id: { not: current.usuario.id } },
            select: { id: true },
          });
          if (taken) {
            throw new AppError(409, 'El email ya está registrado');
          }
          await tx.usuario.update({
            where: { id: current.usuario.id },
            data: { usuario: emailNorm },
          });
        }

        if (Object.keys(dataProductor).length > 0) {
          await tx.productor.update({
            where: { id },
            data: dataProductor,
          });
        }

        const row = await tx.productor.findUniqueOrThrow({
          where: { id },
          include: { usuario: { select: usuarioListSelect } },
        });
        return row;
      });
      return updated;
    } catch (err) {
      if (err instanceof AppError) throw err;
      if (isPrismaUniqueViolation(err)) {
        throw new AppError(409, 'Conflicto de unicidad');
      }
      throw err;
    }
  },

  async setActivo(id: number, activo: boolean): Promise<AdminProducerRow> {
    const current = await prisma.productor.findUnique({
      where: { id },
      select: { usuarioId: true },
    });
    if (!current) {
      throw new AppError(404, 'Productor no encontrado');
    }

    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: current.usuarioId },
        data: { activo },
      }),
      ...(activo
        ? []
        : [
            prisma.sesionToken.deleteMany({
              where: { usuarioId: current.usuarioId },
            }),
          ]),
    ]);

    const row = await prisma.productor.findUnique({
      where: { id },
      include: { usuario: { select: usuarioListSelect } },
    });
    if (!row) {
      throw new AppError(404, 'Productor no encontrado');
    }
    return row;
  },
};

export { toAdminProducerDto };
