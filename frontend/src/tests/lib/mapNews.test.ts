import { describe, expect, it } from 'vitest';
import {
  mapApiNewsToUiNews,
  mapUiNewsToCreatePayload,
  type ApiNews,
} from '@/modules/admin/lib/mapNews';
import type { NewsInput } from '@/modules/admin/types/news';

function makeApiNews(overrides: Partial<ApiNews> = {}): ApiNews {
  return {
    id: 12,
    titulo: 'Nueva sucursal en el sur',
    slug: 'nueva-sucursal-en-el-sur',
    descripcion: 'Bajada opcional',
    contenido: 'Cuerpo completo de la noticia administrativa.',
    categoria: 'NOVEDAD',
    imagenUrl: 'https://cdn.example.com/portada.jpg',
    galeria: [
      { id: 10, url: 'https://cdn.example.com/g1.jpg', orden: 0 },
      { id: 11, url: 'https://cdn.example.com/g2.jpg', orden: 1 },
    ],
    publicada: true,
    publicadaEn: '2026-07-18T12:00:00.000Z',
    visibilidad: 'PUBLICA',
    autorId: 4,
    createdAt: '2026-07-01T09:00:00.000Z',
    updatedAt: '2026-07-19T08:30:00.000Z',
    ...overrides,
  };
}

function makeNewsInput(overrides: Partial<NewsInput> = {}): NewsInput {
  return {
    titulo: 'Título de alta',
    categoria: 'EVENTO',
    audiencia: 'PUBLICO',
    estado: 'BORRADOR',
    cuerpo: 'Cuerpo enviado desde el formulario admin.',
    fechaPublicacion: '2026-08-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('mapApiNewsToUiNews', () => {
  it.each([
    ['PUBLICA', 'PUBLICO'],
    ['INTERNA', 'PRODUCTORES'],
    ['AMBAS', 'AMBOS'],
  ] as const)('visibilidad %s → audiencia %s', (visibilidad, audiencia) => {
    const news = mapApiNewsToUiNews(makeApiNews({ visibilidad }));
    expect(news.audiencia).toBe(audiencia);
  });

  it.each([
    { publicada: true, publicadaEn: '2026-07-18T12:00:00.000Z', estado: 'PUBLICADO' },
    { publicada: false, publicadaEn: null, estado: 'BORRADOR' },
    { publicada: false, publicadaEn: '2026-07-10T11:00:00.000Z', estado: 'DESPUBLICADA' },
  ] as const)(
    'publicada=$publicada + publicadaEn=$publicadaEn → $estado',
    ({ publicada, publicadaEn, estado }) => {
      const news = mapApiNewsToUiNews(makeApiNews({ publicada, publicadaEn }));
      expect(news.estado).toBe(estado);
    },
  );

  it('mapea id, textos, portada, galería y fechas en un mismo caso', () => {
    const news = mapApiNewsToUiNews(makeApiNews());

    expect(news).toMatchObject({
      id: '12',
      titulo: 'Nueva sucursal en el sur',
      categoria: 'NOVEDAD',
      cuerpo: 'Cuerpo completo de la noticia administrativa.',
      imagenPortada: 'https://cdn.example.com/portada.jpg',
      galeria: [
        { id: 10, url: 'https://cdn.example.com/g1.jpg', orden: 0 },
        { id: 11, url: 'https://cdn.example.com/g2.jpg', orden: 1 },
      ],
      fechaPublicacion: '2026-07-18T12:00:00.000Z',
      ultimaModificacion: '2026-07-19T08:30:00.000Z',
    });
  });

  it('usa createdAt cuando publicadaEn es null', () => {
    const news = mapApiNewsToUiNews(makeApiNews({ publicada: false, publicadaEn: null }));
    expect(news.fechaPublicacion).toBe('2026-07-01T09:00:00.000Z');
  });

  it('galeria undefined → []', () => {
    const news = mapApiNewsToUiNews(makeApiNews({ galeria: undefined }));
    expect(news.galeria).toEqual([]);
  });
});

describe('mapUiNewsToCreatePayload', () => {
  it.each([
    ['PUBLICO', 'PUBLICA'],
    ['PRODUCTORES', 'INTERNA'],
    ['AMBOS', 'AMBAS'],
  ] as const)('audiencia %s → visibilidad %s', (audiencia, visibilidad) => {
    const payload = mapUiNewsToCreatePayload(makeNewsInput({ audiencia }), true);
    expect(payload.visibilidad).toBe(visibilidad);
  });

  it('envía titulo, contenido, categoria y publicada', () => {
    const payload = mapUiNewsToCreatePayload(makeNewsInput(), false);
    expect(payload).toEqual({
      titulo: 'Título de alta',
      contenido: 'Cuerpo enviado desde el formulario admin.',
      categoria: 'EVENTO',
      visibilidad: 'PUBLICA',
      publicada: false,
    });
  });
});
