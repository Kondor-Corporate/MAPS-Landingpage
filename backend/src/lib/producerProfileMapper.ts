import type { Certificacion, Prisma, Productor, RedSocial, Usuario } from '@prisma/client';
import {
  PRODUCER_SPECIALTY_KEYS,
  specialtyKeyToLabel,
  type ProducerSpecialtyKey,
} from '../constants/producerSpecialties.js';

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

export function parseEspecialidadesJson(raw: string | null): ProducerSpecialtyKey[] {
  if (!raw || raw.trim() === '') return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((k): k is ProducerSpecialtyKey =>
      typeof k === 'string' && (PRODUCER_SPECIALTY_KEYS as readonly string[]).includes(k),
    );
  } catch {
    return [];
  }
}

export function serializeEspecialidades(keys: ProducerSpecialtyKey[]): string | null {
  if (keys.length === 0) return null;
  return JSON.stringify(keys);
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
    idiomas: Array.isArray(row.idiomas) ? (row.idiomas as string[]) : [],
    foto: row.foto,
    telefono: row.telefono,
    whatsapp: row.whatsapp,
    email: row.usuario.usuario,
    anosExperiencia: row.anosExperiencia,
    clientesActivos: row.clientesActivos,
    latitud: row.latitud,
    longitud: row.longitud,
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
  'slug' | 'nombre' | 'apellido' | 'tituloProfesional' | 'ciudad' | 'latitud' | 'longitud' | 'foto'
>;

export type MapProducerDto = {
  slug: string;
  nombreCompleto: string;
  tituloProfesional: string | null;
  ciudad: string | null;
  latitud: number;
  longitud: number;
  foto: string | null;
};

export function toMapProducerDto(row: MapProducerRow): MapProducerDto {
  return {
    slug: row.slug,
    nombreCompleto: `${row.nombre} ${row.apellido}`.trim(),
    tituloProfesional: row.tituloProfesional,
    ciudad: row.ciudad,
    latitud: row.latitud!,
    longitud: row.longitud!,
    foto: row.foto,
  };
}

export function toAdminProducerDto(row: AdminProducerRow) {
  const keys = parseEspecialidadesJson(row.especialidades);
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
  telefono?: string;
  whatsapp?: string;
  foto?: string;
  idiomas?: string[];
  latitud?: number;
  longitud?: number;
  especialidades?: ProducerSpecialtyKey[];
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
