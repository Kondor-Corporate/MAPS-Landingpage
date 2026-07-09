import type { ProfileViewModel } from '@/shared/types/producerProfile';

export type {
  ProducerCertificacion,
  ProducerRedSocial,
  ProducerSpecialty,
  ProfileHeaderData,
  ProfileViewModel,
} from '@/shared/types/producerProfile';

export type ProducerProfile = ProfileViewModel & {
  id: number;
  email: string;
};

export type UpdateMyProfileBody = {
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

export type PublicProducerProfile = ProfileViewModel;
