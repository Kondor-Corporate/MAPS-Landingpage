import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useNewsFilters } from '@/modules/admin/hooks/useNewsFilters';
import type { News } from '@/modules/admin/types/news';

function makeNews(overrides: Partial<News> = {}): News {
  return {
    id: '1',
    titulo: 'Noticia',
    categoria: 'NOVEDAD',
    audiencia: 'PUBLICO',
    estado: 'PUBLICADO',
    cuerpo: 'Cuerpo',
    imagenPortada: null,
    galeria: [],
    fechaPublicacion: '2026-07-18T12:00:00.000Z',
    ultimaModificacion: '2026-07-18T12:00:00.000Z',
    ...overrides,
  };
}

const ITEMS: News[] = [
  makeNews({ id: 'pub', estado: 'PUBLICADO', audiencia: 'PUBLICO', categoria: 'NOVEDAD' }),
  makeNews({ id: 'draft', estado: 'BORRADOR', audiencia: 'PRODUCTORES', categoria: 'EVENTO' }),
  makeNews({
    id: 'unpub',
    estado: 'DESPUBLICADA',
    audiencia: 'AMBOS',
    categoria: 'CIRCULAR',
    fechaPublicacion: '2026-05-01T10:00:00.000Z',
  }),
];

const DATE_ITEMS: News[] = [
  makeNews({ id: 'before', fechaPublicacion: '2026-07-17T23:59:59.999Z' }),
  makeNews({ id: 'start', fechaPublicacion: '2026-07-18T00:00:00.000Z' }),
  makeNews({ id: 'mid', fechaPublicacion: '2026-07-18T12:00:00.000Z' }),
  makeNews({ id: 'end', fechaPublicacion: '2026-07-18T23:59:59.999Z' }),
  makeNews({ id: 'after', fechaPublicacion: '2026-07-19T00:00:00.000Z' }),
];

describe('useNewsFilters', () => {
  it('TODOS deja el conjunto sin filtrar', () => {
    const { result } = renderHook(() => useNewsFilters());
    expect(result.current.apply(ITEMS).map((n) => n.id)).toEqual(['pub', 'draft', 'unpub']);
  });

  it('distingue BORRADOR de DESPUBLICADA', () => {
    const { result } = renderHook(() => useNewsFilters());

    act(() => result.current.setFilter('estado', 'BORRADOR'));
    expect(result.current.apply(ITEMS).map((n) => n.id)).toEqual(['draft']);

    act(() => result.current.setFilter('estado', 'DESPUBLICADA'));
    expect(result.current.apply(ITEMS).map((n) => n.id)).toEqual(['unpub']);
  });

  it('filtra audiencia AMBOS', () => {
    const { result } = renderHook(() => useNewsFilters());
    act(() => result.current.setFilter('audiencia', 'AMBOS'));
    expect(result.current.apply(ITEMS).map((n) => n.id)).toEqual(['unpub']);
  });

  it('filtra una categoría concreta', () => {
    const { result } = renderHook(() => useNewsFilters());
    act(() => result.current.setFilter('categoria', 'EVENTO'));
    expect(result.current.apply(ITEMS).map((n) => n.id)).toEqual(['draft']);
  });

  it('reset vuelve a los defaults', () => {
    const { result } = renderHook(() => useNewsFilters());
    act(() => {
      result.current.setFilter('estado', 'BORRADOR');
      result.current.setFilter('audiencia', 'AMBOS');
      result.current.setFilter('categoria', 'EVENTO');
    });
    expect(result.current.activeCount).toBe(3);

    act(() => result.current.reset());
    expect(result.current.filters).toEqual({
      audiencia: 'TODOS',
      estado: 'TODOS',
      categoria: 'TODOS',
      fechaDesde: '',
      fechaHasta: '',
    });
    expect(result.current.activeCount).toBe(0);
    expect(result.current.apply(ITEMS)).toHaveLength(3);
  });

  it('fechaDesde excluye publicaciones anteriores e incluye el inicio del día', () => {
    const { result } = renderHook(() => useNewsFilters());
    act(() => result.current.setFilter('fechaDesde', '2026-07-18'));
    expect(result.current.apply(DATE_ITEMS).map((n) => n.id)).toEqual([
      'start',
      'mid',
      'end',
      'after',
    ]);
  });

  it('fechaHasta incluye el final de ese día y excluye el día siguiente', () => {
    const { result } = renderHook(() => useNewsFilters());
    act(() => result.current.setFilter('fechaHasta', '2026-07-18'));
    expect(result.current.apply(DATE_ITEMS).map((n) => n.id)).toEqual([
      'before',
      'start',
      'mid',
      'end',
    ]);
  });

  it('el rango fechaDesde/fechaHasta deja solo el día inclusive', () => {
    const { result } = renderHook(() => useNewsFilters());
    act(() => {
      result.current.setFilter('fechaDesde', '2026-07-18');
      result.current.setFilter('fechaHasta', '2026-07-18');
    });
    expect(result.current.apply(DATE_ITEMS).map((n) => n.id)).toEqual(['start', 'mid', 'end']);
  });
});
