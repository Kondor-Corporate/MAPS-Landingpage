import { describe, expect, it } from 'vitest';
import {
  mapApiRamoToUi,
  mapUiRamoToApi,
  type ApiLibraryRamo,
} from '@/modules/admin/lib/mapLibraryRamo';
import type { RamoInput } from '@/modules/admin/types/library';

function makeApiRamo(overrides: Partial<ApiLibraryRamo> = {}): ApiLibraryRamo {
  return {
    id: 42,
    nombre: 'Automotores',
    descripcion: 'Material de flota y auxilio.',
    icono: 'car',
    gdriveUrl: 'https://drive.google.com/drive/folders/XXXX',
    tipo: 'PRINCIPAL',
    orden: 3,
    activo: true,
    creadoEn: '2026-01-10T10:00:00.000Z',
    modificadoEn: '2026-02-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('mapApiRamoToUi', () => {
  it('convierte id a string y preserva el resto de campos', () => {
    expect(mapApiRamoToUi(makeApiRamo())).toEqual({
      id: '42',
      nombre: 'Automotores',
      descripcion: 'Material de flota y auxilio.',
      icono: 'car',
      gdriveUrl: 'https://drive.google.com/drive/folders/XXXX',
      tipo: 'PRINCIPAL',
      orden: 3,
      activo: true,
      creadoEn: '2026-01-10T10:00:00.000Z',
      modificadoEn: '2026-02-01T12:00:00.000Z',
    });
  });
});

describe('mapUiRamoToApi', () => {
  it('conserva el payload esperado', () => {
    const input: RamoInput = {
      nombre: 'Caución',
      descripcion: 'Garantías.',
      icono: 'key',
      gdriveUrl: 'https://drive.google.com/drive/folders/YYYY',
      tipo: 'SECUNDARIO',
      orden: 8,
      activo: false,
    };
    expect(mapUiRamoToApi(input)).toEqual(input);
  });
});
