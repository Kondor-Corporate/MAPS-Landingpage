export type ProducerSpecialty = {
  clave: string;
  label: string;
};

export type ProducerRedSocial = {
  plataforma: string;
  url: string;
  orden: number;
};

export type ProducerCertificacion = {
  id: number;
  nombre: string;
  archivoUrl: string;
  tamanoBytes: number | null;
  mimeType: string;
};

/** Perfil visible en vistas públicas e intranet (sin id ni email). */
export type ProfileViewModel = {
  slug: string;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  tituloProfesional: string | null;
  matricula: string | null;
  verificado: boolean;
  bio: string | null;
  ciudad: string | null;
  idiomas: string[];
  foto: string | null;
  telefono: string | null;
  whatsapp: string | null;
  anosExperiencia: number | null;
  clientesActivos: number | null;
  latitud: number | null;
  longitud: number | null;
  especialidades: ProducerSpecialty[];
  redesSociales: ProducerRedSocial[];
  certificaciones: ProducerCertificacion[];
};

export type ProfileHeaderData = ProfileViewModel & {
  email?: string;
};

export function formatCertificacionSize(bytes: number | null): string {
  if (bytes == null || bytes <= 0) return 'PDF · Documento';
  if (bytes < 1024) return `PDF · ${bytes} B`;
  if (bytes < 1024 * 1024) return `PDF · ${(bytes / 1024).toFixed(1)} KB`;
  return `PDF · ${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
