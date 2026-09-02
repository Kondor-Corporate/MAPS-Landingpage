/**
 * Datos mock locales del admin de Noticias (MAPS-007).
 * Ya no alimenta el flujo productivo; la fuente real es la API vía `useAdminNews`.
 */
import type { News } from '@/modules/admin/types/news';

function isoDaysAgo(days: number, hours = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

function thumb(seed: string): string {
  return `https://picsum.photos/seed/${seed}/240/144`;
}

export const newsMock: News[] = [
  {
    id: 'n-001',
    titulo: 'Aumento de coberturas vida 2024',
    categoria: 'NOVEDAD',
    audiencia: 'PRODUCTORES',
    estado: 'PUBLICADO',
    cuerpo:
      'Comunicamos los nuevos topes de cobertura para la cartera de Vida vigentes a partir del próximo período. Revisar la circular adjunta antes de cotizar nuevas pólizas.',
    imagenPortada: thumb('maps-vida-2024'),
    galeria: [],
    fechaPublicacion: isoDaysAgo(206),
    ultimaModificacion: isoDaysAgo(206),
  },
  {
    id: 'n-002',
    titulo: 'Convención anual Cancún 2024',
    categoria: 'EVENTO',
    audiencia: 'PUBLICO',
    estado: 'BORRADOR',
    cuerpo:
      'Se confirma la convención anual de productores en Cancún del 4 al 9 de noviembre. Cupos limitados según ranking de producción 2023.',
    imagenPortada: thumb('maps-cancun-evento'),
    galeria: [],
    fechaPublicacion: isoDaysAgo(210),
    ultimaModificacion: isoDaysAgo(2),
  },
  {
    id: 'n-003',
    titulo: 'Nueva integración con SELF — facturación automática',
    categoria: 'PRODUCTO',
    audiencia: 'PRODUCTORES',
    estado: 'PUBLICADO',
    cuerpo:
      'A partir de esta semana, todas las pólizas emitidas desde SELF se sincronizan automáticamente con el módulo de facturación. Documentación completa en la biblioteca digital.',
    imagenPortada: thumb('maps-self-facturacion'),
    galeria: [],
    fechaPublicacion: isoDaysAgo(14),
    ultimaModificacion: isoDaysAgo(14),
  },
  {
    id: 'n-004',
    titulo: 'Circular interna 17/2024 — actualización de comisiones',
    categoria: 'CIRCULAR',
    audiencia: 'PRODUCTORES',
    estado: 'PUBLICADO',
    cuerpo:
      'Actualización del esquema de comisiones para los ramos Auto y Hogar. La nueva grilla aplica a producción nueva desde el 1 del próximo mes.',
    imagenPortada: thumb('maps-circular-comisiones'),
    galeria: [],
    fechaPublicacion: isoDaysAgo(40),
    ultimaModificacion: isoDaysAgo(38),
  },
  {
    id: 'n-005',
    titulo: 'MAPS expande cobertura territorial al sur',
    categoria: 'NOVEDAD',
    audiencia: 'PUBLICO',
    estado: 'PUBLICADO',
    cuerpo:
      'Sumamos sucursales en Bariloche y Neuquén para reforzar la red comercial en la Patagonia. Los productores zonales ya están operativos en SELF.',
    imagenPortada: thumb('maps-sur-expansion'),
    galeria: [],
    fechaPublicacion: isoDaysAgo(72),
    ultimaModificacion: isoDaysAgo(70),
  },
  {
    id: 'n-006',
    titulo: 'Comunicado oficial — cambios en horario de atención',
    categoria: 'COMUNICADO',
    audiencia: 'PRODUCTORES',
    estado: 'BORRADOR',
    cuerpo:
      'Borrador del nuevo horario de atención de la mesa de ayuda. Pendiente de aprobación por dirección antes de publicar.',
    imagenPortada: null,
    galeria: [],
    fechaPublicacion: isoDaysAgo(0, 4),
    ultimaModificacion: isoDaysAgo(0, 4),
  },
  {
    id: 'n-007',
    titulo: 'Webinar — IA aplicada a la suscripción de riesgos',
    categoria: 'EVENTO',
    audiencia: 'PRODUCTORES',
    estado: 'PUBLICADO',
    cuerpo:
      'Webinar abierto sobre tendencias de IA en suscripción y siniestros. Cupo: 200 productores; se transmite también por el canal interno.',
    imagenPortada: thumb('maps-webinar-ia'),
    galeria: [],
    fechaPublicacion: isoDaysAgo(5),
    ultimaModificacion: isoDaysAgo(5),
  },
];
