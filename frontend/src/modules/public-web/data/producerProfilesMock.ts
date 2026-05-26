import avatar1 from '@/assets/images/avatar-1.jpg';
import avatar2 from '@/assets/images/avatar-2.jpg';
import type { PublicProducerProfile } from '@/modules/public-web/types/producerProfile';

const PROFILES: PublicProducerProfile[] = [
  {
    slug: 'carlos-rivera',
    nombre: 'Carlos Rivera',
    rol: 'Productor MAPS · Asesor senior',
    zona: 'CABA y GBA Norte',
    bio: 'Más de 15 años acompañando familias y pymes en la elección de coberturas integrales. Especialista en seguros patrimoniales y accidentes personales.',
    fotoUrl: avatar1,
    contacto: {
      email: 'carlos.rivera@example.com',
      telefono: '+54 11 5555-0101',
      whatsapp: '5491155550101',
    },
  },
  {
    slug: 'lucia-mendez',
    nombre: 'Lucía Méndez',
    rol: 'Productora MAPS',
    zona: 'Córdoba Capital',
    bio: 'Enfoque en seguros de vida y salud prepaga. Priorizo diagnóstico claro y seguimiento durante todo el año de la póliza.',
    fotoUrl: avatar2,
    contacto: {
      email: 'lucia.mendez@example.com',
    },
  },
  {
    slug: 'martin-torres',
    nombre: 'Martín Torres',
    rol: 'Asesor de seguros MAPS',
    zona: 'Mendoza',
    bio: 'Trabajo con productores agropecuarios y comercios regionales. Cotizaciones ágiles y respuesta en incidentes.',
    fotoUrl: null,
    contacto: {
      telefono: '+54 261 555-8899',
      whatsapp: '5492615558899',
    },
  },
];

const bySlug = new Map(PROFILES.map((p) => [p.slug, p]));

export function getProducerProfileBySlug(slug: string): PublicProducerProfile | undefined {
  return bySlug.get(slug);
}
