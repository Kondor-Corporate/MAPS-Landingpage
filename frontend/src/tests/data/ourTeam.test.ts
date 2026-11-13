import { describe, expect, it } from 'vitest';
import { ourTeam } from '@/modules/public-web/data/ourTeam';

describe('ourTeam', () => {
  it('conserva integrantes, datos y orden sin Satya', () => {
    expect(ourTeam.map((member) => member.id)).toEqual(['1', '2', '3', '4', '8', '5', '7']);
    expect(ourTeam).toEqual([
      {
        id: '1',
        nombre: 'Maximiliano',
        apellido: 'Pérez',
        puesto: 'Líder Organización',
        foto: '/team/maximiliano-perez.webp',
      },
      {
        id: '2',
        nombre: 'Diana',
        apellido: 'Niz',
        puesto: 'Coordinación Gestión Siniestros y Producción',
        foto: '/team/Diana.webp',
      },
      {
        id: '3',
        nombre: 'César',
        apellido: 'do Porto',
        puesto: 'Gestión Procesos y Comercial',
        foto: '/team/Cesar.webp',
      },
      {
        id: '4',
        nombre: 'Ezequiel',
        apellido: 'Coria',
        puesto: 'Gestión Comunicación y Proyectos',
        foto: '/team/ezequiel.webp',
      },
      {
        id: '8',
        nombre: 'Martín',
        apellido: 'Ingaramo',
        puesto: 'Desarrollo de asesores',
        foto: '/team/Martin.webp',
      },
      {
        id: '5',
        nombre: 'Federico',
        apellido: 'Espinosa',
        puesto: 'Gestión Producción y Siniestros',
        foto: '/team/Federico.webp',
      },
      {
        id: '7',
        nombre: 'Julio',
        apellido: 'Pérez',
        puesto: 'Gestión Producción y Siniestros',
        foto: '/team/Julio.webp',
      },
    ]);
    expect(ourTeam.some((member) => /satya/i.test(`${member.nombre} ${member.apellido}`))).toBe(
      false,
    );
    expect(ourTeam.some((member) => member.foto?.includes('Satya.webp'))).toBe(false);
    expect(ourTeam.some((member) => /guadalupe/i.test(member.nombre))).toBe(false);
  });
});
