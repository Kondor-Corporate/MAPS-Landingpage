import { Prisma, type Postulacion, type PostulacionSituacion } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import type { CreatePostulacionInput } from '../validations/postulacion.schema.js';

const postulacionSelect = {
  id: true,
  nombreCompleto: true,
  dni: true,
  telefono: true,
  matricula: true,
  localidad: true,
  situacion: true,
  createdAt: true,
} satisfies Prisma.PostulacionSelect;

type PostulacionRow = Pick<
  Postulacion,
  'id' | 'nombreCompleto' | 'dni' | 'telefono' | 'matricula' | 'localidad' | 'situacion' | 'createdAt'
>;

export type PostulacionDto = {
  id: number;
  nombreCompleto: string;
  dni: string;
  telefono: string;
  matricula: string;
  localidad: string;
  situacion: PostulacionSituacion;
  createdAt: string;
};

function toPostulacionDto(row: PostulacionRow): PostulacionDto {
  return {
    id: row.id,
    nombreCompleto: row.nombreCompleto,
    dni: row.dni,
    telefono: row.telefono,
    matricula: row.matricula,
    localidad: row.localidad,
    situacion: row.situacion,
    createdAt: row.createdAt.toISOString(),
  };
}

export const postulacionesService = {
  /** Alta pública de una postulación. No expone datos; sólo confirma la recepción. */
  async create(input: CreatePostulacionInput): Promise<{ id: number }> {
    const created = await prisma.postulacion.create({
      data: {
        nombreCompleto: input.nombreCompleto,
        dni: input.dni,
        telefono: input.telefono,
        matricula: input.matricula,
        localidad: input.localidad,
        situacion: input.situacion,
      },
      select: { id: true },
    });
    return { id: created.id };
  },

  /** Listado para consulta administrativa (lectura restringida a ADMIN/SUPERADMIN). */
  async list(): Promise<PostulacionDto[]> {
    const rows = await prisma.postulacion.findMany({
      select: postulacionSelect,
      orderBy: { id: 'desc' },
    });
    return rows.map(toPostulacionDto);
  },
};
