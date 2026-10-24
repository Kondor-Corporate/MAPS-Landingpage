import { Prisma, type Postulacion, type PostulacionSituacion } from '@prisma/client';
import { POSTULACION_PRIVACY_VERSION } from '../constants/postulacionPrivacy.js';
import { AppError } from '../lib/errors.js';
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

/**
 * Ventana de deduplicación blanda: un reenvío con el mismo payload persistido
 * (nombre, DNI, teléfono, matrícula, localidad y situación) dentro de este lapso
 * se considera accidental o automatizado y no genera una fila nueva. Cambiar
 * cualquiera de esos campos es una corrección legítima y sí se persiste. No se
 * actualiza una postulación previa. Pasada la ventana, el mismo payload puede
 * volver a postularse.
 */
const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

export type CreatePostulacionResult = {
  /** `false` si se descartó por honeypot o por ser un duplicado reciente. */
  persisted: boolean;
};

export const postulacionesService = {
  /**
   * Alta pública de una postulación. No expone datos; sólo confirma la recepción.
   * Aplica honeypot anti-bot y deduplicación blanda antes de persistir. En ambos
   * casos de descarte devuelve igual (sin error) para no revelar la detección ni
   * la existencia previa de la postulación (anti-enumeración).
   */
  async create(input: CreatePostulacionInput): Promise<CreatePostulacionResult> {
    // Honeypot: campo señuelo oculto. Si llega con valor es automatización simple;
    // se acepta en silencio (misma respuesta 201) pero no se persiste.
    if (typeof input.website === 'string' && input.website.trim() !== '') {
      return { persisted: false };
    }

    // Deduplicación blanda: solo descarta si todo el payload persistido coincide.
    // `website` no se guarda. `consentimiento` tampoco entra en la comparación:
    // un duplicado descartado no reescribe consentedAt ni privacyVersion.
    const since = new Date(Date.now() - DEDUP_WINDOW_MS);
    const duplicate = await prisma.postulacion.findFirst({
      where: {
        dni: input.dni,
        matricula: input.matricula,
        nombreCompleto: input.nombreCompleto,
        telefono: input.telefono,
        localidad: input.localidad,
        situacion: input.situacion,
        createdAt: { gte: since },
      },
      select: { id: true },
    });
    if (duplicate) {
      return { persisted: false };
    }

    await prisma.postulacion.create({
      data: {
        nombreCompleto: input.nombreCompleto,
        dni: input.dni,
        telefono: input.telefono,
        matricula: input.matricula,
        localidad: input.localidad,
        situacion: input.situacion,
        consentedAt: new Date(),
        privacyVersion: POSTULACION_PRIVACY_VERSION,
      },
      select: { id: true },
    });
    return { persisted: true };
  },

  /**
   * Baja física de una sola postulación, por id. No borra otras filas aunque
   * compartan DNI o matrícula. `deleteMany` evita un 500 por P2025.
   */
  async remove(id: number): Promise<void> {
    const result = await prisma.postulacion.deleteMany({ where: { id } });
    if (result.count === 0) {
      throw new AppError(404, 'Postulación no encontrada');
    }
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
