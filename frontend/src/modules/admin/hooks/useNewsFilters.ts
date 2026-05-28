import { useMemo, useState } from 'react';
import type { News, NewsAudiencia, NewsCategoria, NewsEstado } from '@/modules/admin/types/news';

export type NewsFilters = {
  audiencia: NewsAudiencia | 'TODOS';
  estado: NewsEstado | 'TODOS';
  categoria: NewsCategoria | 'TODOS';
  fechaDesde: string;
  fechaHasta: string;
};

const INITIAL_FILTERS: NewsFilters = {
  audiencia: 'TODOS',
  estado: 'TODOS',
  categoria: 'TODOS',
  fechaDesde: '',
  fechaHasta: '',
};

export function useNewsFilters() {
  const [filters, setFilters] = useState<NewsFilters>(INITIAL_FILTERS);
  const [search, setSearch] = useState('');

  const setFilter = <K extends keyof NewsFilters>(key: K, value: NewsFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const reset = () => setFilters(INITIAL_FILTERS);

  const apply = useMemo(
    () =>
      (items: News[]): News[] => {
        const term = search.trim().toLowerCase();
        return items.filter((n) => {
          if (filters.audiencia !== 'TODOS' && n.audiencia !== filters.audiencia) return false;
          if (filters.estado !== 'TODOS' && n.estado !== filters.estado) return false;
          if (filters.categoria !== 'TODOS' && n.categoria !== filters.categoria) return false;
          if (filters.fechaDesde && n.fechaPublicacion < filters.fechaDesde) return false;
          if (filters.fechaHasta && n.fechaPublicacion > `${filters.fechaHasta}T23:59:59.999Z`)
            return false;
          if (term) {
            const haystack = `${n.titulo} ${n.cuerpo}`.toLowerCase();
            if (!haystack.includes(term)) return false;
          }
          return true;
        });
      },
    [filters, search],
  );

  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.audiencia !== 'TODOS') count++;
    if (filters.estado !== 'TODOS') count++;
    if (filters.categoria !== 'TODOS') count++;
    if (filters.fechaDesde) count++;
    if (filters.fechaHasta) count++;
    return count;
  }, [filters]);

  return {
    filters,
    setFilter,
    reset,
    apply,
    search,
    setSearch,
    activeCount,
  };
}
