import type { OurTeamMember } from '@/modules/public-web/types/ourTeam';

// El orden de aparición en el carrusel es el orden de este array.
// TODO(MAPS-018): confirmar apellido de Ezequiel y puesto de Federico Espinosa.
export const ourTeam: OurTeamMember[] = [
  {
    id: '1',
    nombre: 'Maximiliano',
    apellido: 'Perez',
    puesto: 'Líder Organización',
    foto: '/team/maximiliano-perez.webp',
  },
  {
    id: '2',
    nombre: 'Diana',
    apellido: 'Niz',
    puesto: 'Gestión Siniestros',
    foto: '/team/diana-niz.webp',
  },
  {
    id: '3',
    nombre: 'Cesar',
    apellido: 'Doporto',
    puesto: 'Gestión Procesos',
    foto: '/team/cesar-doporto.webp',
  },
  {
    id: '4',
    nombre: 'Ezequiel',
    apellido: '',
    puesto: 'Gestión Comunicación',
    foto: '/team/ezequiel.webp',
  },
  {
    id: '5',
    nombre: 'Federico',
    apellido: 'Espinosa',
    puesto: 'Puesto pendiente',
    foto: '/team/federico-espinosa.webp',
  },
  {
    id: '6',
    nombre: 'Martin',
    apellido: 'Ingaramo',
    puesto: 'Asesor de Seguros',
    foto: '/team/martin-ingaramo.webp',
  },
  {
    id: '7',
    nombre: 'Julio',
    apellido: 'Perez',
    puesto: 'Gestión Producción',
    foto: '/team/julio-perez.webp',
  },
];
