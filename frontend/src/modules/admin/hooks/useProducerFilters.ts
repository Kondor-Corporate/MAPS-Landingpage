import { useMemo, useState } from 'react';
import type { Producer, ProducerEstado } from '@/modules/admin/types/producer';

export type UltimaActividadRange = 'TODOS' | '24H' | '7D' | '30D' | '90D';

export type ProducerFilters = {
  estado: ProducerEstado | 'TODOS';
  sucursal: string | 'TODOS';
  fechaAltaDesde: string;
  fechaAltaHasta: string;
  ultimaActividad: UltimaActividadRange;
};

const INITIAL_FILTERS: ProducerFilters = {
  estado: 'TODOS',
  sucursal: 'TODOS',
  fechaAltaDesde: '',
  fechaAltaHasta: '',
  ultimaActividad: 'TODOS',
};

const RANGE_DAYS: Record<Exclude<UltimaActividadRange, 'TODOS'>, number> = {
  '24H': 1,
  '7D': 7,
  '30D': 30,
  '90D': 90,
};

function within(iso: string, days: number): boolean {
  const ts = new Date(iso).getTime();
  return Date.now() - ts <= days * 24 * 60 * 60 * 1000;
}

export function useProducerFilters() {
  const [filters, setFilters] = useState<ProducerFilters>(INITIAL_FILTERS);
  const [search, setSearch] = useState('');

  const setFilter = <K extends keyof ProducerFilters>(key: K, value: ProducerFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const reset = () => setFilters(INITIAL_FILTERS);

  const apply = useMemo(
    () =>
      (producers: Producer[]): Producer[] => {
        const term = search.trim().toLowerCase();
        return producers.filter((p) => {
          if (filters.estado !== 'TODOS' && p.estado !== filters.estado) return false;
          if (filters.sucursal !== 'TODOS' && p.sucursal !== filters.sucursal) return false;
          if (filters.fechaAltaDesde && p.fechaAlta < filters.fechaAltaDesde) return false;
          if (filters.fechaAltaHasta && p.fechaAlta > `${filters.fechaAltaHasta}T23:59:59.999Z`)
            return false;
          if (filters.ultimaActividad !== 'TODOS') {
            const days = RANGE_DAYS[filters.ultimaActividad];
            if (!within(p.ultimaActividad, days)) return false;
          }
          if (term) {
            const haystack = `${p.nombre} ${p.dni} ${p.email}`.toLowerCase();
            if (!haystack.includes(term)) return false;
          }
          return true;
        });
      },
    [filters, search],
  );

  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.estado !== 'TODOS') count++;
    if (filters.sucursal !== 'TODOS') count++;
    if (filters.fechaAltaDesde) count++;
    if (filters.fechaAltaHasta) count++;
    if (filters.ultimaActividad !== 'TODOS') count++;
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
