import type { Certificacion, Prisma, Productor, RedSocial, Usuario } from '@prisma/client';
import { specialtyKeyToLabel } from '../constants/producerSpecialties.js';
import { normalizeCoordinates } from './coordinates.js';

/** Tope defensivo para el campo libre de especialidades (catálogo dinámico de la Biblioteca). */
const MAX_ESPECIALIDADES = 50;
const MAX_ESPECIALIDAD_LENGTH = 80;

export type ProductorWithRelations = Productor & {
  usuario: Pick<Usuario, 'usuario' | 'activo'>;
  redesSociales: RedSocial[];
  certificaciones: Certificacion[];
};

export type AdminProducerRow = Productor & {
  usuario: Pick<
    Usuario,
    'id' | 'usuario' | 'activo' | 'rol' | 'createdAt' | 'updatedAt' | 'lastLoginAt'
  >;
  redesSociales: RedSocial[];
  certificaciones: Certificacion[];
};

/**
 * Las especialidades se almacenan como JSON array de strings. El catálogo ahora
 * proviene de los ramos de la Biblioteca Digital (valores = nombre del ramo), por
 * lo que no se valida contra un enum fijo; se aceptan strings arbitrarios acotados
 * y se conservan los valores históricos (claves antiguas como `viajero`, `mascotas`).
 */
export function parseEspecialidadesJson(raw: string | null): string[] {
  if (!raw || raw.trim() === '') return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of parsed) {
      if (typeof item !== 'string') continue;
      const value = item.trim();
      if (value === '' || value.length > MAX_ESPECIALIDAD_LENGTH || seen.has(value)) continue;
      seen.add(value);
      result.push(value);
      if (result.length >= MAX_ESPECIALIDADES) break;
    }
    return result;
  } catch {
    return [];
  }
}

export function serializeEspecialidades(keys: string[]): string | null {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const key of keys) {
    const value = key.trim();
    if (value === '' || value.length > MAX_ESPECIALIDAD_LENGTH || seen.has(value)) continue;
    seen.add(value);
    normalized.push(value);
    if (normalized.length >= MAX_ESPECIALIDADES) break;
  }
  if (normalized.length === 0) return null;
  return JSON.stringify(normalized);
}

function mapCertificaciones(rows: Certificacion[]) {
  return rows
    .slice()
    .sort((a, b) => a.orden - b.orden || a.id - b.id)
    .map((c) => ({
      id: c.id,
      nombre: c.nombre,
      archivoUrl: c.archivoUrl,
      tamanoBytes: c.tamanoBytes,
      mimeType: c.mimeType,
    }));
}

export function toProducerProfileDto(row: ProductorWithRelations) {
  const keys = parseEspecialidadesJson(row.especialidades);
  const coordinates = normalizeCoordinates(row.latitud, row.longitud);
  return {
    id: row.id,
    slug: row.slug,
    nombre: row.nombre,
    apellido: row.apellido,
    nombreCompleto: `${row.nombre} ${row.apellido}`.trim(),
    tituloProfesional: row.tituloProfesional,
    matricula: row.matricula,
    verificado: row.verificado,
    bio: row.bio,
    ciudad: row.ciudad,
    direccion: row.direccion,
    idiomas: Array.isArray(row.idiomas) ? (row.idiomas as string[]) : [],
    foto: row.foto,
    telefono: row.telefono,
    whatsapp: row.whatsapp,
    email: row.usuario.usuario,
    anosExperiencia: row.anosExperiencia,
    clientesActivos: row.clientesActivos,
    latitud: coordinates?.latitud ?? null,
    longitud: coordinates?.longitud ?? null,
    especialidades: keys.map((clave) => ({
      clave,
      label: specialtyKeyToLabel(clave),
    })),
    redesSociales: row.redesSociales.map((r) => ({
      plataforma: r.plataforma,
      url: r.url,
      orden: r.orden,
    })),
    certificaciones: mapCertificaciones(row.certificaciones),
  };
}

export function toPublicProducerProfileDto(row: ProductorWithRelations) {
  const full = toProducerProfileDto(row);
  const { id: _id, email: _email, ...rest } = full;
  return rest;
}

export type MapProducerRow = Pick<
  Productor,
  | 'slug'
  | 'nombre'
  | 'apellido'
  | 'tituloProfesional'
  | 'ciudad'
  | 'direccion'
  | 'latitud'
  | 'longitud'
  | 'foto'
  | 'whatsapp'
  | 'verificado'
  | 'especialidades'
> & {
  redesSociales: Pick<RedSocial, 'plataforma' | 'url' | 'orden'>[];
};

export type MapProducerDto = {
  slug: string;
  nombreCompleto: string;
  tituloProfesional: string | null;
  ciudad: string | null;
  direccion: string | null;
  latitud: number;
  longitud: number;
  foto: string | null;
  whatsapp: string | null;
  verificado: boolean;
  especialidades: { clave: string; label: string }[];
  redesSociales: { plataforma: string; url: string; orden: number }[];
};

export function toMapProducerDto(row: MapProducerRow): MapProducerDto {
  const keys = parseEspecialidadesJson(row.especialidades);
  return {
    slug: row.slug,
    nombreCompleto: `${row.nombre} ${row.apellido}`.trim(),
    tituloProfesional: row.tituloProfesional,
    ciudad: row.ciudad,
    direccion: row.direccion,
    latitud: row.latitud!,
    longitud: row.longitud!,
    foto: row.foto,
    whatsapp: row.whatsapp,
    verificado: row.verificado,
    especialidades: keys.map((clave) => ({ clave, label: specialtyKeyToLabel(clave) })),
    redesSociales: row.redesSociales.map((r) => ({
      plataforma: r.plataforma,
      url: r.url,
      orden: r.orden,
    })),
  };
}

export function toAdminProducerDto(row: AdminProducerRow) {
  const keys = parseEspecialidadesJson(row.especialidades);
  const coordinates = normalizeCoordinates(row.latitud, row.longitud);
  return {
    id: row.id,
    slug: row.slug,
    nombre: row.nombre,
    apellido: row.apellido,
    bio: row.bio,
    ciudad: row.ciudad,
    direccion: row.direccion,
    dni: row.dni,
    foto: row.foto,
    latitud: coordinates?.latitud ?? null,
    longitud: coordinates?.longitud ?? null,
    telefono: row.telefono,
    matricula: row.matricula,
    verificado: row.verificado,
    tituloProfesional: row.tituloProfesional,
    idiomas: Array.isArray(row.idiomas) ? (row.idiomas as string[]) : [],
    whatsapp: row.whatsapp,
    anosExperiencia: row.anosExperiencia,
    clientesActivos: row.clientesActivos,
    especialidades: keys.map((clave) => ({
      clave,
      label: specialtyKeyToLabel(clave),
    })),
    redesSociales: row.redesSociales.map((r) => ({
      plataforma: r.plataforma,
      url: r.url,
      orden: r.orden,
    })),
    certificaciones: mapCertificaciones(row.certificaciones),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    usuario: row.usuario,
  };
}

export type UpdateMyProfileInput = {
  bio?: string;
  ciudad?: string;
  direccion?: string;
  telefono?: string;
  whatsapp?: string;
  foto?: string;
  idiomas?: string[];
  latitud?: number;
  longitud?: number;
  especialidades?: string[];
  redesSociales?: { plataforma: string; url: string; orden?: number }[];
};

export type UpdateAdminProducerInput = UpdateMyProfileInput & {
  nombre?: string;
  apellido?: string;
  email?: string;
  matricula?: string;
  verificado?: boolean;
  anosExperiencia?: number;
  clientesActivos?: number;
  tituloProfesional?: string;
};

export function buildProductorUpdateFromMyProfile(
  input: UpdateMyProfileInput,
): Prisma.ProductorUpdateInput {
  const data: Prisma.ProductorUpdateInput = {};
  if (input.bio !== undefined) data.bio = input.bio;
  if (input.ciudad !== undefined) data.ciudad = input.ciudad;
  if (input.direccion !== undefined) {
    data.direccion = input.direccion.trim() === '' ? null : input.direccion.trim();
  }
  if (input.telefono !== undefined) {
    data.telefono = input.telefono.trim() === '' ? null : input.telefono.trim();
  }
  if (input.whatsapp !== undefined) {
    data.whatsapp = input.whatsapp.trim() === '' ? null : input.whatsapp.trim();
  }
  if (input.foto !== undefined) {
    data.foto = input.foto.trim() === '' ? null : input.foto.trim();
  }
  if (input.idiomas !== undefined) data.idiomas = input.idiomas;
  if (input.latitud !== undefined) data.latitud = input.latitud;
  if (input.longitud !== undefined) data.longitud = input.longitud;
  if (input.especialidades !== undefined) {
    data.especialidades = serializeEspecialidades(input.especialidades);
  }
  return data;
}

export function buildProductorUpdateFromAdmin(
  input: UpdateAdminProducerInput,
): Prisma.ProductorUpdateInput {
  const data = buildProductorUpdateFromMyProfile(input);
  if (input.nombre !== undefined) data.nombre = input.nombre.trim();
  if (input.apellido !== undefined) data.apellido = input.apellido.trim();
  if (input.matricula !== undefined) {
    data.matricula = input.matricula.trim() === '' ? null : input.matricula.trim();
  }
  if (input.verificado !== undefined) data.verificado = input.verificado;
  if (input.anosExperiencia !== undefined) data.anosExperiencia = input.anosExperiencia;
  if (input.clientesActivos !== undefined) data.clientesActivos = input.clientesActivos;
  if (input.tituloProfesional !== undefined) {
    data.tituloProfesional =
      input.tituloProfesional.trim() === '' ? null : input.tituloProfesional.trim();
  }
  return data;
}
