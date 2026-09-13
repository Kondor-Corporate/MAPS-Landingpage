import { describe, expect, it } from 'vitest';
import {
  mapAdminProducerToProducer,
  producerFormToApiPayload,
} from '@/modules/admin/lib/mapAdminProducer';
import type { AdminProducer, AdminProducerUsuario } from '@/modules/admin/types/adminProducer';

function makeUsuario(overrides: Partial<AdminProducerUsuario> = {}): AdminProducerUsuario {
  return {
    id: 9,
    usuario: 'juan.perez@example.com',
    activo: true,
    rol: 'PRODUCTOR',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    lastLoginAt: '2026-04-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeAdminProducer(
  overrides: Partial<Omit<AdminProducer, 'usuario'>> & {
    usuario?: Partial<AdminProducerUsuario>;
  } = {},
): AdminProducer {
  const { usuario, ...rest } = overrides;
  return {
    id: 21,
    slug: 'juan-perez',
    nombre: 'Juan',
    apellido: 'Pérez',
    bio: 'Bio',
    ciudad: 'La Plata',
    direccion: 'Calle 12 345',
    dni: '30111222',
    foto: 'https://cdn.example.com/foto.jpg',
    latitud: -34.9214,
    longitud: -57.9545,
    telefono: '2215555555',
    matricula: 'M-100',
    verificado: true,
    tituloProfesional: 'PAS',
    idiomas: ['es'],
    whatsapp: '5492215555555',
    anosExperiencia: 8,
    clientesActivos: 40,
    especialidades: [{ clave: 'auto', label: 'Automotor' }],
    redesSociales: [{ plataforma: 'instagram', url: 'https://instagram.com/jp', orden: 0 }],
    certificaciones: [
      {
        id: 1,
        nombre: 'Curso',
        archivoUrl: 'https://cdn.example.com/cert.pdf',
        tamanoBytes: 10,
        mimeType: 'application/pdf',
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
    usuario: makeUsuario(usuario),
    ...rest,
  };
}

const BASE_FORM = {
  nombre: 'Ana',
  apellido: 'López',
  email: 'ana@example.com',
  telefono: '2214000000',
  ciudad: 'La Plata',
  direccion: 'Calle 50 1000',
  latitud: -34.9214,
  longitud: -57.9545,
};

describe('mapAdminProducerToProducer', () => {
  it('trimea nombre/apellido, anula blanks y preserva id/coords/arrays', () => {
    const producer = mapAdminProducerToProducer(
      makeAdminProducer({
        nombre: '  Juan  ',
        apellido: '  Pérez  ',
        foto: '  ',
        dni: null,
        telefono: '',
        bio: '   ',
        ciudad: null,
        direccion: '',
        whatsapp: '  ',
      }),
    );

    expect(producer).toMatchObject({
      id: '21',
      nombre: 'Juan',
      apellido: 'Pérez',
      estado: 'ACTIVO',
      avatarUrl: null,
      dni: null,
      telefono: null,
      bio: null,
      ciudad: null,
      direccion: null,
      whatsapp: null,
      latitud: -34.9214,
      longitud: -57.9545,
      ultimaActividad: '2026-04-01T00:00:00.000Z',
      ultimoLogin: '2026-04-01T00:00:00.000Z',
    });
  });

  it('inactivo usa updatedAt si no hay lastLogin y arrays undefined → []', () => {
    const producer = mapAdminProducerToProducer(
      makeAdminProducer({
        idiomas: undefined,
        especialidades: undefined,
        redesSociales: undefined,
        certificaciones: undefined,
        usuario: { activo: false, lastLoginAt: null },
      }),
    );

    expect(producer.estado).toBe('INACTIVO');
    expect(producer.ultimoLogin).toBeNull();
    expect(producer.ultimaActividad).toBe('2026-03-01T00:00:00.000Z');
    expect(producer.idiomas).toEqual([]);
    expect(producer.especialidades).toEqual([]);
    expect(producer.redesSociales).toEqual([]);
    expect(producer.certificaciones).toEqual([]);
  });

  it('par de coordenadas incompleto deja ambas en null', () => {
    const producer = mapAdminProducerToProducer(
      makeAdminProducer({ latitud: -34.9214, longitud: null }),
    );
    expect(producer.latitud).toBeNull();
    expect(producer.longitud).toBeNull();
  });
});

describe('producerFormToApiPayload', () => {
  it('teléfono blank queda en string vacío', () => {
    expect(producerFormToApiPayload({ ...BASE_FORM, telefono: '   ' }).telefono).toBe('');
  });

  it.each([
    { password: undefined, included: false },
    { password: '   ', included: false },
    { password: 'Temporal123', included: true },
  ])('password $password', ({ password, included }) => {
    const payload = producerFormToApiPayload({ ...BASE_FORM, password });
    if (included) {
      expect(payload.password).toBe(password);
    } else {
      expect(payload).not.toHaveProperty('password');
    }
  });

  it('omite ciudad corta y usa fallback de dirección a ciudad', () => {
    const payload = producerFormToApiPayload({
      ...BASE_FORM,
      ciudad: 'LP',
      direccion: undefined,
      latitud: undefined,
      longitud: undefined,
    });
    expect(payload).not.toHaveProperty('ciudad');
    expect(payload).not.toHaveProperty('direccion');
    expect(payload).not.toHaveProperty('latitud');
    expect(payload).not.toHaveProperty('longitud');
  });

  it('incluye ciudad válida, dirección fallback, coords, matrícula y título trim, verificado false', () => {
    const payload = producerFormToApiPayload({
      ...BASE_FORM,
      direccion: '   ',
      matricula: '  M-9  ',
      tituloProfesional: '  PAS  ',
      verificado: false,
    });

    expect(payload).toMatchObject({
      ciudad: 'La Plata',
      direccion: 'La Plata',
      latitud: -34.9214,
      longitud: -57.9545,
      matricula: 'M-9',
      tituloProfesional: 'PAS',
      verificado: false,
    });
  });

  it('no incluye coords incompletas', () => {
    const payload = producerFormToApiPayload({
      ...BASE_FORM,
      latitud: -34.9214,
      longitud: undefined,
    });
    expect(payload).not.toHaveProperty('latitud');
    expect(payload).not.toHaveProperty('longitud');
  });

  it.each([
    { value: undefined, expected: undefined },
    { value: '  ', expected: undefined },
    { value: '-1', expected: undefined },
    { value: '1.5', expected: undefined },
    { value: 'abc', expected: undefined },
    { value: '0', expected: 0 },
    { value: '7', expected: 7 },
    { value: '9007199254740992', expected: undefined },
  ])('anosExperiencia $value → $expected', ({ value, expected }) => {
    const payload = producerFormToApiPayload({ ...BASE_FORM, anosExperiencia: value });
    if (expected === undefined) {
      expect(payload).not.toHaveProperty('anosExperiencia');
    } else {
      expect(payload.anosExperiencia).toBe(expected);
    }
  });

  it('clientesActivos usa la misma regla numérica', () => {
    expect(producerFormToApiPayload({ ...BASE_FORM, clientesActivos: '12' }).clientesActivos).toBe(
      12,
    );
    expect(producerFormToApiPayload({ ...BASE_FORM, clientesActivos: '1.2' })).not.toHaveProperty(
      'clientesActivos',
    );
  });
});
