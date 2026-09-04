import { Prisma, type Usuario } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { AppError } from '../lib/errors.js';
import { geocodeAddress } from '../lib/geocode.js';
import {
  buildProductorUpdateFromAdmin,
  buildProductorUpdateFromMyProfile,
  serializeEspecialidades,
  toAdminProducerDto,
  toMapProducerDto,
  toProducerProfileDto,
  toPublicProducerProfileDto,
  type AdminProducerRow,
  type MapProducerRow,
  type ProductorWithRelations,
  type UpdateAdminProducerInput,
  type UpdateMyProfileInput,
} from '../lib/producerProfileMapper.js';
import { prisma } from '../lib/prisma.js';
import { getStorageAdapter } from '../lib/storage/index.js';
import { assertAllowedUploadContent } from '../lib/uploadContentValidation.js';

const usuarioListSelect = {
  id: true,
  usuario: true,
  activo: true,
  rol: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
} satisfies Record<
  keyof Pick<
    Usuario,
    'id' | 'usuario' | 'activo' | 'rol' | 'createdAt' | 'updatedAt' | 'lastLoginAt'
  >,
  true
>;

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
    const candidate = n === 0 ? base : `${base}-${randomBytes(2).toString('hex')}`;
    const exists = await prisma.productor.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  throw new AppError(500, 'No se pudo generar un slug único');
}

export type ListProducersQuery = {
  activo?: boolean;
};

const adminProducerInclude = {
  usuario: { select: usuarioListSelect },
  redesSociales: { orderBy: { orden: 'asc' as const } },
  certificaciones: { orderBy: [{ orden: 'asc' as const }, { id: 'asc' as const }] },
} satisfies Prisma.ProductorInclude;

const productorProfileInclude = {
  usuario: { select: { usuario: true, activo: true } },
  redesSociales: { orderBy: { orden: 'asc' as const } },
  certificaciones: { orderBy: [{ orden: 'asc' as const }, { id: 'asc' as const }] },
} satisfies Prisma.ProductorInclude;

async function syncRedesSociales(
  tx: Prisma.TransactionClient,
  productorId: number,
  redes?: { plataforma: string; url: string; orden?: number }[],
) {
  if (redes === undefined) return;
  await tx.redSocial.deleteMany({ where: { productorId } });
  if (redes.length > 0) {
    await tx.redSocial.createMany({
      data: redes.map((r, i) => ({
        productorId,
        plataforma: r.plataforma,
        url: r.url,
        orden: r.orden ?? i,
      })),
    });
  }
}

async function findProductorByUsuarioId(
  usuarioId: number,
): Promise<ProductorWithRelations | null> {
  return prisma.productor.findUnique({
    where: { usuarioId },
    include: productorProfileInclude,
  });
}

async function findProductorBySlugActive(
  slug: string,
): Promise<ProductorWithRelations | null> {
  return prisma.productor.findFirst({
    where: { slug, usuario: { activo: true } },
    include: productorProfileInclude,
  });
}

async function addCertificacion(
  productorId: number,
  file: Express.Multer.File,
  nombre?: string,
) {
  if (!file.buffer) {
    throw new AppError(400, 'Archivo PDF requerido');
  }

  const detectedMime = assertAllowedUploadContent(file.buffer, 'certificacion');

  const storage = getStorageAdapter();
  const uploaded = await storage.uploadCertificacion({
    buffer: file.buffer,
    mimeType: detectedMime,
    productorId,
  });

  const count = await prisma.certificacion.count({ where: { productorId } });
  const cert = await prisma.certificacion.create({
    data: {
      productorId,
      nombre: nombre?.trim() || file.originalname || 'Certificación',
      archivoUrl: uploaded.url,
      tamanoBytes: uploaded.tamanoBytes,
      mimeType: uploaded.mimeType,
      orden: count,
    },
  });

  return {
    id: cert.id,
    nombre: cert.nombre,
    archivoUrl: cert.archivoUrl,
    tamanoBytes: cert.tamanoBytes,
    mimeType: cert.mimeType,
  };
}

async function removeCertificacion(productorId: number, certId: number) {
  const cert = await prisma.certificacion.findFirst({
    where: { id: certId, productorId },
  });
  if (!cert) {
    throw new AppError(404, 'Certificación no encontrada');
  }

  const storage = getStorageAdapter();
  await storage.deleteCertificacion(cert.archivoUrl);
  await prisma.certificacion.delete({ where: { id: cert.id } });
}

async function replaceFoto(
  productorId: number,
  currentFotoUrl: string | null,
  file: Express.Multer.File,
): Promise<string> {
  if (!file.buffer) {
    throw new AppError(400, 'Imagen requerida');
  }

  const detectedMime = assertAllowedUploadContent(file.buffer, 'foto');

  const storage = getStorageAdapter();
  const uploaded = await storage.uploadFoto({
    buffer: file.buffer,
    mimeType: detectedMime,
    productorId,
  });

  await prisma.productor.update({
    where: { id: productorId },
    data: { foto: uploaded.url },
  });

  if (currentFotoUrl) {
    // La foto anterior puede ser una URL externa no gestionada por nuestro storage;
    // no bloqueamos el reemplazo si no se puede borrar.
    await storage.deleteFoto(currentFotoUrl).catch(() => undefined);
  }

  return uploaded.url;
}

function hasManualCoordinates(input: { latitud?: number; longitud?: number }) {
  return input.latitud !== undefined && input.longitud !== undefined;
}

async function resolveCoordinates(direccion: string): Promise<{ latitud: number; longitud: number }> {
  const trimmed = direccion.trim();
  if (trimmed.length < 5) {
    throw new AppError(400, 'La dirección es demasiado corta');
  }
  const coords = await geocodeAddress(trimmed);
  if (!coords) {
    throw new AppError(400, 'No se pudo ubicar la dirección. Verificá el texto e intentá de nuevo.');
  }
  return coords;
}

async function resolveFinalLocation(input: {
  ciudad?: string;
  direccion?: string;
  latitud?: number;
  longitud?: number;
}): Promise<{
  ciudad?: string;
  direccion?: string;
  latitud?: number;
  longitud?: number;
}> {
  const ciudadTrimmed = input.ciudad?.trim();
  const direccionTrimmed = input.direccion?.trim();
  const text = direccionTrimmed || ciudadTrimmed;

  if (hasManualCoordinates(input)) {
    return {
      ...(text !== undefined ? { ciudad: ciudadTrimmed ?? text } : {}),
      ...(text !== undefined ? { direccion: text } : {}),
      latitud: input.latitud,
      longitud: input.longitud,
    };
  }

  if (input.latitud !== undefined || input.longitud !== undefined) {
    throw new AppError(400, 'Latitud y longitud deben enviarse juntas');
  }

  if (text !== undefined) {
    const coords = await resolveCoordinates(text);
    return {
      ciudad: ciudadTrimmed ?? text,
      direccion: text,
      latitud: coords.latitud,
      longitud: coords.longitud,
    };
  }

  return {};
}

export const producersService = {
  async list(query: ListProducersQuery): Promise<AdminProducerRow[]> {
    const where: Prisma.ProductorWhereInput =
      query.activo === undefined ? {} : { usuario: { activo: query.activo } };

    return prisma.productor.findMany({
      where,
      include: adminProducerInclude,
      orderBy: { id: 'desc' },
    });
  },

  async getById(id: number): Promise<AdminProducerRow | null> {
    return prisma.productor.findUnique({
      where: { id },
      include: adminProducerInclude,
    });
  },

  async create(
    input: UpdateAdminProducerInput & {
      nombre: string;
      apellido: string;
      email: string;
      password: string;
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

    const passwordHash = await bcrypt.hash(input.password, 12);
    const slugBase = slugifyBase(input.nombre.trim(), input.apellido.trim());
    const slug = await ensureUniqueSlug(slugBase);
    const activo = input.activo ?? true;

    const location = await resolveFinalLocation(input);
    const direccion = location.direccion?.trim();
    if (!direccion) {
      throw new AppError(400, 'La dirección es requerida');
    }

    try {
      const created = await prisma.$transaction(async (tx) => {
        const usuario = await tx.usuario.create({
          data: {
            usuario: emailNorm,
            passwordHash,
            rol: 'PRODUCTOR',
            activo,
            ...(options?.creadoPorId !== undefined ? { creadoPorId: options.creadoPorId } : {}),
          },
        });

        const productor = await tx.productor.create({
          data: {
            usuarioId: usuario.id,
            slug,
            nombre: input.nombre.trim(),
            apellido: input.apellido.trim(),
            telefono: input.telefono?.trim() || null,
            bio: input.bio?.trim() || null,
            ciudad: location.ciudad || direccion,
            direccion,
            whatsapp: input.whatsapp?.trim() || null,
            foto: input.foto?.trim() || null,
            idiomas: input.idiomas ?? undefined,
            latitud: location.latitud,
            longitud: location.longitud,
            matricula: input.matricula?.trim() || null,
            verificado: input.verificado ?? false,
            anosExperiencia: input.anosExperiencia,
            clientesActivos: input.clientesActivos,
            tituloProfesional: input.tituloProfesional?.trim() || null,
            especialidades:
              input.especialidades !== undefined
                ? serializeEspecialidades(input.especialidades)
                : undefined,
          },
        });

        await syncRedesSociales(tx, productor.id, input.redesSociales);

        return tx.productor.findUniqueOrThrow({
          where: { id: productor.id },
          include: adminProducerInclude,
        });
      });
      return created;
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        const target = (err.meta?.target as string[] | undefined)?.join(', ');
        throw new AppError(
          409,
          target ? `Conflicto de unicidad (${target})` : 'Conflicto de unicidad',
        );
      }
      throw err;
    }
  },

  async update(id: number, input: UpdateAdminProducerInput): Promise<AdminProducerRow> {
    const current = await prisma.productor.findUnique({
      where: { id },
      include: { usuario: { select: { id: true, usuario: true } } },
    });
    if (!current) {
      throw new AppError(404, 'Productor no encontrado');
    }

    const dataProductor = buildProductorUpdateFromAdmin(input);

    if (
      input.direccion !== undefined ||
      input.ciudad !== undefined ||
      input.latitud !== undefined ||
      input.longitud !== undefined
    ) {
      const location = await resolveFinalLocation(input);
      if (location.ciudad !== undefined) dataProductor.ciudad = location.ciudad;
      if (location.direccion !== undefined) dataProductor.direccion = location.direccion;
      if (location.latitud !== undefined) dataProductor.latitud = location.latitud;
      if (location.longitud !== undefined) dataProductor.longitud = location.longitud;
    }

    const emailNorm = input.email !== undefined ? input.email.trim().toLowerCase() : undefined;

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

        await syncRedesSociales(tx, id, input.redesSociales);

        return tx.productor.findUniqueOrThrow({
          where: { id },
          include: adminProducerInclude,
        });
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
        data: {
          activo,
          ...(activo ? {} : { tokenVersion: { increment: 1 } }),
        },
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
      include: adminProducerInclude,
    });
    if (!row) {
      throw new AppError(404, 'Productor no encontrado');
    }
    return row;
  },

  /** Restablecimiento admin: no requiere la contraseña actual del productor. */
  async resetPassword(productorId: number, input: { newPassword: string }): Promise<void> {
    const current = await prisma.productor.findUnique({
      where: { id: productorId },
      select: { usuarioId: true },
    });
    if (!current) {
      throw new AppError(404, 'Productor no encontrado');
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: current.usuarioId },
        data: {
          passwordHash,
          tokenVersion: { increment: 1 },
        },
      }),
      prisma.sesionToken.deleteMany({ where: { usuarioId: current.usuarioId } }),
    ]);
  },

  async getMe(usuarioId: number) {
    const row = await findProductorByUsuarioId(usuarioId);
    if (!row) {
      throw new AppError(404, 'Perfil de productor no encontrado');
    }
    return toProducerProfileDto(row);
  },

  async updateMe(usuarioId: number, input: UpdateMyProfileInput) {
    const current = await findProductorByUsuarioId(usuarioId);
    if (!current) {
      throw new AppError(404, 'Perfil de productor no encontrado');
    }

    const dataProductor = buildProductorUpdateFromMyProfile(input);

    if (
      input.direccion !== undefined ||
      input.ciudad !== undefined ||
      input.latitud !== undefined ||
      input.longitud !== undefined
    ) {
      const location = await resolveFinalLocation(input);
      if (location.ciudad !== undefined) dataProductor.ciudad = location.ciudad;
      if (location.direccion !== undefined) dataProductor.direccion = location.direccion;
      if (location.latitud !== undefined) dataProductor.latitud = location.latitud;
      if (location.longitud !== undefined) dataProductor.longitud = location.longitud;
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (Object.keys(dataProductor).length > 0) {
        await tx.productor.update({
          where: { id: current.id },
          data: dataProductor,
        });
      }

      await syncRedesSociales(tx, current.id, input.redesSociales);

      return tx.productor.findUniqueOrThrow({
        where: { id: current.id },
        include: productorProfileInclude,
      });
    });

    return toProducerProfileDto(updated);
  },

  async uploadCertificacionMe(
    usuarioId: number,
    file: Express.Multer.File,
    nombre?: string,
  ) {
    const current = await findProductorByUsuarioId(usuarioId);
    if (!current) {
      throw new AppError(404, 'Perfil de productor no encontrado');
    }
    return addCertificacion(current.id, file, nombre);
  },

  async deleteCertificacionMe(usuarioId: number, certId: number) {
    const current = await findProductorByUsuarioId(usuarioId);
    if (!current) {
      throw new AppError(404, 'Perfil de productor no encontrado');
    }
    await removeCertificacion(current.id, certId);
  },

  async uploadFotoMe(usuarioId: number, file: Express.Multer.File) {
    const current = await findProductorByUsuarioId(usuarioId);
    if (!current) {
      throw new AppError(404, 'Perfil de productor no encontrado');
    }
    await replaceFoto(current.id, current.foto, file);

    const updated = await findProductorByUsuarioId(usuarioId);
    if (!updated) {
      throw new AppError(404, 'Perfil de productor no encontrado');
    }
    return toProducerProfileDto(updated);
  },

  async uploadCertificacionAdmin(
    productorId: number,
    file: Express.Multer.File,
    nombre?: string,
  ) {
    const current = await prisma.productor.findUnique({
      where: { id: productorId },
      select: { id: true },
    });
    if (!current) {
      throw new AppError(404, 'Productor no encontrado');
    }
    return addCertificacion(productorId, file, nombre);
  },

  async deleteCertificacionAdmin(productorId: number, certId: number) {
    const current = await prisma.productor.findUnique({
      where: { id: productorId },
      select: { id: true },
    });
    if (!current) {
      throw new AppError(404, 'Productor no encontrado');
    }
    await removeCertificacion(productorId, certId);
  },

  async getBySlug(slug: string) {
    const row = await findProductorBySlugActive(slug);
    if (!row) {
      throw new AppError(404, 'Productor no encontrado');
    }
    return toPublicProducerProfileDto(row);
  },

  async listForMap(): Promise<MapProducerRow[]> {
    return prisma.productor.findMany({
      where: {
        usuario: { activo: true },
        latitud: { not: null },
        longitud: { not: null },
      },
      select: {
        slug: true,
        nombre: true,
        apellido: true,
        tituloProfesional: true,
        ciudad: true,
        direccion: true,
        latitud: true,
        longitud: true,
        foto: true,
        whatsapp: true,
        verificado: true,
        especialidades: true,
      },
      orderBy: { nombre: 'asc' },
    });
  },
};

export { toAdminProducerDto, toMapProducerDto, toProducerProfileDto, toPublicProducerProfileDto };
export type { AdminProducerRow, MapProducerRow };
