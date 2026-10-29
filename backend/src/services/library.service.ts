import { Prisma, type Ramo, type Rol } from '@prisma/client';
import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

const BIBLIOTECA_ID = 1;

function isPrismaUniqueViolation(err: unknown): err is Prisma.PrismaClientKnownRequestError {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

export type LibraryRamoDto = {
  id: number;
  nombre: string;
  descripcion: string;
  icono: string;
  gdriveUrl: string;
  tipo: 'PRINCIPAL' | 'SECUNDARIO';
  orden: number;
  activo: boolean;
  creadoEn: Date;
  modificadoEn: Date;
};

export function toLibraryRamoDto(row: Ramo): LibraryRamoDto {
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion ?? '',
    icono: row.icono,
    gdriveUrl: row.gdriveUrl,
    tipo: row.tipo,
    orden: row.orden,
    activo: row.activo,
    creadoEn: row.createdAt,
    modificadoEn: row.updatedAt,
  };
}

export type ListLibraryRamosOptions = {
  role: Rol;
  activo?: boolean;
};

export type CreateRamoInput = {
  nombre: string;
  descripcion: string;
  icono: string;
  gdriveUrl: string;
  tipo: 'PRINCIPAL' | 'SECUNDARIO';
  orden: number;
  activo: boolean;
};

export type UpdateRamoInput = Partial<CreateRamoInput>;

export const libraryService = {
  async list(options: ListLibraryRamosOptions): Promise<LibraryRamoDto[]> {
    const where: Prisma.RamoWhereInput = { bibliotecaId: BIBLIOTECA_ID };

    if (options.role === 'PRODUCTOR') {
      where.activo = true;
    } else if (options.activo !== undefined) {
      where.activo = options.activo;
    }

    const rows = await prisma.ramo.findMany({
      where,
      orderBy: [{ tipo: 'asc' }, { orden: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toLibraryRamoDto);
  },

  async getById(id: number): Promise<LibraryRamoDto | null> {
    const row = await prisma.ramo.findFirst({
      where: { id, bibliotecaId: BIBLIOTECA_ID },
    });
    return row ? toLibraryRamoDto(row) : null;
  },

  async create(input: CreateRamoInput): Promise<LibraryRamoDto> {
    try {
      const row = await prisma.ramo.create({
        data: {
          bibliotecaId: BIBLIOTECA_ID,
          nombre: input.nombre.trim(),
          descripcion: input.descripcion.trim(),
          icono: input.icono,
          gdriveUrl: input.gdriveUrl.trim(),
          tipo: input.tipo,
          orden: input.orden,
          activo: input.activo,
        },
      });
      return toLibraryRamoDto(row);
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        throw new AppError(409, 'Ya existe un ramo con ese nombre en la biblioteca');
      }
      throw err;
    }
  },

  async update(id: number, input: UpdateRamoInput): Promise<LibraryRamoDto> {
    const current = await prisma.ramo.findFirst({
      where: { id, bibliotecaId: BIBLIOTECA_ID },
    });
    if (!current) {
      throw new AppError(404, 'Ramo no encontrado');
    }

    const data: Prisma.RamoUpdateInput = {};
    if (input.nombre !== undefined) data.nombre = input.nombre.trim();
    if (input.descripcion !== undefined) data.descripcion = input.descripcion.trim();
    if (input.icono !== undefined) data.icono = input.icono;
    if (input.gdriveUrl !== undefined) data.gdriveUrl = input.gdriveUrl.trim();
    if (input.tipo !== undefined) data.tipo = input.tipo;
    if (input.orden !== undefined) data.orden = input.orden;
    if (input.activo !== undefined) data.activo = input.activo;

    try {
      const row = await prisma.ramo.update({
        where: { id },
        data,
      });
      return toLibraryRamoDto(row);
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        throw new AppError(409, 'Ya existe un ramo con ese nombre en la biblioteca');
      }
      throw err;
    }
  },

  async setActivo(id: number, activo: boolean): Promise<LibraryRamoDto> {
    const current = await prisma.ramo.findFirst({
      where: { id, bibliotecaId: BIBLIOTECA_ID },
    });
    if (!current) {
      throw new AppError(404, 'Ramo no encontrado');
    }

    const row = await prisma.ramo.update({
      where: { id },
      data: { activo },
    });
    return toLibraryRamoDto(row);
  },

  async remove(id: number): Promise<void> {
    const current = await prisma.ramo.findFirst({
      where: { id, bibliotecaId: BIBLIOTECA_ID },
    });
    if (!current) {
      throw new AppError(404, 'Ramo no encontrado');
    }

    await prisma.ramo.delete({ where: { id } });
  },
};
