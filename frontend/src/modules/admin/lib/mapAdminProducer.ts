import type { AdminProducer } from '@/modules/admin/types/adminProducer';
import type { Producer } from '@/modules/admin/types/producer';
import { normalizeCoordinates } from '@/shared/lib/coordinates';

function nullableString(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function mapAdminProducerToProducer(row: AdminProducer): Producer {
  const estado = row.usuario.activo ? 'ACTIVO' : 'INACTIVO';
  const coordinates = normalizeCoordinates(row.latitud, row.longitud);

  return {
    id: String(row.id),
    slug: row.slug,
    nombre: row.nombre.trim(),
    apellido: row.apellido.trim(),
    avatarUrl: nullableString(row.foto),
    estado,
    dni: nullableString(row.dni),
    email: row.usuario.usuario,
    telefono: nullableString(row.telefono),
    sucursal: '',
    fechaAlta: row.createdAt,
    ultimaActividad: row.usuario.lastLoginAt ?? row.usuario.updatedAt,
    ultimoLogin: row.usuario.lastLoginAt,
    matricula: row.matricula,
    verificado: row.verificado,
    tituloProfesional: row.tituloProfesional,
    anosExperiencia: row.anosExperiencia,
    clientesActivos: row.clientesActivos,
    bio: nullableString(row.bio),
    ciudad: nullableString(row.ciudad),
    direccion: nullableString(row.direccion),
    whatsapp: nullableString(row.whatsapp),
    latitud: coordinates?.latitud ?? null,
    longitud: coordinates?.longitud ?? null,
    idiomas: row.idiomas ?? [],
    especialidades: row.especialidades ?? [],
    redesSociales: row.redesSociales ?? [],
    certificaciones: row.certificaciones ?? [],
  };
}

export function producerNumericId(row: Producer): number {
  return Number.parseInt(row.id, 10);
}

function parseNonNegativeInteger(value: string | undefined): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

export function producerFormToApiPayload(input: {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  ciudad: string;
  direccion?: string;
  latitud?: number;
  longitud?: number;
  matricula?: string;
  verificado?: boolean;
  tituloProfesional?: string;
  anosExperiencia?: string;
  clientesActivos?: string;
  /** Solo en alta; si viene undefined/vacío no se agrega al payload (edición no toca password). */
  password?: string;
}) {
  const payload: Record<string, unknown> = {
    nombre: input.nombre,
    apellido: input.apellido,
    email: input.email,
    telefono: input.telefono.trim() === '' ? '' : input.telefono,
  };

  if (input.password !== undefined && input.password.trim() !== '') {
    payload.password = input.password;
  }

  const ciudadTrimmed = input.ciudad.trim();
  if (ciudadTrimmed.length >= 5) {
    payload.ciudad = ciudadTrimmed;
  }

  const direccionTrimmed = input.direccion?.trim() || ciudadTrimmed;
  if (direccionTrimmed.length >= 5) {
    payload.direccion = direccionTrimmed;
  }

  const coordinates = normalizeCoordinates(input.latitud, input.longitud);
  if (coordinates) {
    payload.latitud = coordinates.latitud;
    payload.longitud = coordinates.longitud;
  }

  if (input.matricula !== undefined) {
    payload.matricula = input.matricula.trim();
  }
  if (input.verificado !== undefined) {
    payload.verificado = input.verificado;
  }
  if (input.tituloProfesional !== undefined) {
    payload.tituloProfesional = input.tituloProfesional.trim();
  }
  const anosExperiencia = parseNonNegativeInteger(input.anosExperiencia);
  if (anosExperiencia !== undefined) {
    payload.anosExperiencia = anosExperiencia;
  }
  const clientesActivos = parseNonNegativeInteger(input.clientesActivos);
  if (clientesActivos !== undefined) {
    payload.clientesActivos = clientesActivos;
  }

  return payload;
}
