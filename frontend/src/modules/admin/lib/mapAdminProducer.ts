import type { AdminProducer } from '@/modules/admin/types/adminProducer';
import type { Producer } from '@/modules/admin/types/producer';

function nullableString(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function mapAdminProducerToProducer(row: AdminProducer): Producer {
  const estado = row.usuario.activo ? 'ACTIVO' : 'INACTIVO';

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
    whatsapp: nullableString(row.whatsapp),
    latitud: row.latitud,
    longitud: row.longitud,
    idiomas: row.idiomas ?? [],
    especialidades: row.especialidades ?? [],
    redesSociales: row.redesSociales ?? [],
    certificaciones: row.certificaciones ?? [],
  };
}

export function producerNumericId(row: Producer): number {
  return Number.parseInt(row.id, 10);
}

export function producerFormToApiPayload(input: {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  ciudad: string;
  matricula?: string;
  verificado?: boolean;
  tituloProfesional?: string;
  anosExperiencia?: string;
  clientesActivos?: string;
}) {
  const payload: Record<string, unknown> = {
    nombre: input.nombre,
    apellido: input.apellido,
    email: input.email,
    telefono: input.telefono.trim() === '' ? '' : input.telefono,
  };

  const ciudadTrimmed = input.ciudad.trim();
  if (ciudadTrimmed.length >= 5) {
    payload.ciudad = ciudadTrimmed;
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
  if (input.anosExperiencia?.trim()) {
    payload.anosExperiencia = Number.parseInt(input.anosExperiencia, 10);
  }
  if (input.clientesActivos?.trim()) {
    payload.clientesActivos = Number.parseInt(input.clientesActivos, 10);
  }

  return payload;
}
