import { describe, expect, it } from 'vitest';
import {
  estimateReadingMinutes,
  mapApiIntranetNewsToNewsItem,
  mapApiPublicNewsToNewsItem,
} from '@/shared/lib/mapPublicNews';
import type { ApiPublicNews } from '@/shared/services/publicNews.service';
import { formatNewsFullDate } from '@/shared/utils/newsDate';

function makeApiPublicNews(overrides: Partial<ApiPublicNews> = {}): ApiPublicNews {
  return {
    slug: 'novedad-maps',
    titulo: 'Novedad MAPS',
    descripcion: 'Resumen público',
    contenido: 'Cuerpo de la noticia pública.',
    categoria: 'NOVEDAD',
    imagenUrl: 'https://cdn.example.com/novedad.jpg',
    galeria: ['https://cdn.example.com/g1.jpg'],
    publicadaEn: '2026-07-18T12:00:00.000Z',
    ...overrides,
  };
}

function words(count: number): string {
  return Array.from({ length: count }, (_, index) => `palabra${index + 1}`).join(' ');
}

describe('mapApiPublicNewsToNewsItem', () => {
  it('categoría conocida → label', () => {
    expect(mapApiPublicNewsToNewsItem(makeApiPublicNews({ categoria: 'EVENTO' })).category).toBe(
      'Evento',
    );
  });

  it('categoría desconocida → passthrough', () => {
    expect(mapApiPublicNewsToNewsItem(makeApiPublicNews({ categoria: 'OTRA' })).category).toBe(
      'OTRA',
    );
  });

  it('slug → href público', () => {
    const item = mapApiPublicNewsToNewsItem(makeApiPublicNews({ slug: 'circular-junio' }));
    expect(item.slug).toBe('circular-junio');
    expect(item.href).toBe('/noticias/circular-junio');
  });

  it('imagenUrl null se preserva', () => {
    expect(mapApiPublicNewsToNewsItem(makeApiPublicNews({ imagenUrl: null })).imageUrl).toBeNull();
  });

  it('galeria undefined → []', () => {
    expect(mapApiPublicNewsToNewsItem(makeApiPublicNews({ galeria: undefined })).galeria).toEqual(
      [],
    );
  });

  it('description string y null', () => {
    expect(mapApiPublicNewsToNewsItem(makeApiPublicNews()).description).toBe('Resumen público');
    expect(
      mapApiPublicNewsToNewsItem(makeApiPublicNews({ descripcion: null })).description,
    ).toBeNull();
  });

  it('publicadaEn válida copia ISO y labels del helper absoluto', () => {
    const publicadaEn = '2026-07-18T12:00:00.000Z';
    const item = mapApiPublicNewsToNewsItem(makeApiPublicNews({ publicadaEn }));
    expect(item.publishedAt).toBe(publicadaEn);
    expect(item.publishedAtLabel).toBe(formatNewsFullDate(publicadaEn));
    expect(item.date.length).toBeGreaterThan(0);
  });

  it('publicadaEn null → publishedAt vacío', () => {
    const item = mapApiPublicNewsToNewsItem(makeApiPublicNews({ publicadaEn: null }));
    expect(item.publishedAt).toBe('');
    expect(item.publishedAtLabel).toBe('');
    expect(item.date).toBe('');
  });

  it('usa gradient de categoría conocida', () => {
    const item = mapApiPublicNewsToNewsItem(makeApiPublicNews({ categoria: 'PRODUCTO' }));
    expect(item.imageGradient).toBe(
      'linear-gradient(135deg, #161121 0%, #374151 50%, #00a4c0 100%)',
    );
  });

  it('gradient fallback varía con el índice', () => {
    const dto = makeApiPublicNews({ categoria: 'DESCONOCIDA' });
    expect(mapApiPublicNewsToNewsItem(dto, 0).imageGradient).toBe(
      'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #00a4c0 100%)',
    );
    expect(mapApiPublicNewsToNewsItem(dto, 1).imageGradient).toBe(
      'linear-gradient(135deg, #1e3a8a 0%, #00a4c0 100%)',
    );
    expect(mapApiPublicNewsToNewsItem(dto, 3).imageGradient).toBe(
      'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #00a4c0 100%)',
    );
  });

  it('el alias intranet produce el mismo resultado para el mismo DTO', () => {
    const dto = makeApiPublicNews({ categoria: 'COMUNICADO' });
    expect(mapApiIntranetNewsToNewsItem(dto, 2)).toEqual(mapApiPublicNewsToNewsItem(dto, 2));
  });
});

describe('estimateReadingMinutes', () => {
  it.each([
    ['', 1],
    ['   \n\t  ', 1],
    [words(3), 1],
    [words(200), 1],
    [words(201), 2],
  ])('conteo de palabras → minutos', (content, minutes) => {
    expect(estimateReadingMinutes(content)).toBe(minutes);
  });
});
