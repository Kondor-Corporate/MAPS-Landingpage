import { useEffect, useState } from 'react';
import { Filter } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { MapsSelect } from '@/shared/components/MapsSelect';
import {
  CATEGORIA_OPTIONS,
  type NewsAudiencia,
  type NewsCategoria,
  type NewsEstado,
} from '@/modules/admin/types/news';
import type { NewsFilters } from '@/modules/admin/hooks/useNewsFilters';

type Props = {
  isOpen: boolean;
  initialFilters: NewsFilters;
  onClose: () => void;
  onApply: (next: NewsFilters) => void;
  onReset: () => void;
};

const ESTADO_FILTER_OPTIONS: { value: NewsEstado | 'TODOS'; label: string }[] = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'PUBLICADO', label: 'Publicado' },
  { value: 'BORRADOR', label: 'Borrador' },
  { value: 'DESPUBLICADA', label: 'Despublicada' },
];

export function NewsFilterModal({ isOpen, initialFilters, onClose, onApply, onReset }: Props) {
  const [draft, setDraft] = useState<NewsFilters>(initialFilters);

  useEffect(() => {
    if (isOpen) setDraft(initialFilters);
  }, [isOpen, initialFilters]);

  function set<K extends keyof NewsFilters>(key: K, value: NewsFilters[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      <div className="flex flex-col gap-5 p-6">
        <header className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-maps-brand-soft text-maps-brand">
            <Filter size={16} strokeWidth={1.75} />
          </span>
          <div className="flex flex-col">
            <h3 className="text-base font-semibold text-maps-heading">Filtrar noticias</h3>
            <p className="text-xs text-maps-muted">
              Refiná el listado por audiencia, estado o fecha.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-maps-heading">Audiencia</span>
            <MapsSelect
              value={draft.audiencia}
              onChange={(value) => set('audiencia', value as NewsAudiencia | 'TODOS')}
              options={[
                { value: 'TODOS', label: 'Todas' },
                { value: 'PRODUCTORES', label: 'Productores' },
                { value: 'PUBLICO', label: 'Público' },
              ]}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-maps-heading">Estado</span>
            <MapsSelect
              value={draft.estado}
              onChange={(value) => set('estado', value as NewsEstado | 'TODOS')}
              options={ESTADO_FILTER_OPTIONS}
            />
          </label>

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-maps-heading">Categoría</span>
            <MapsSelect
              value={draft.categoria}
              onChange={(value) => set('categoria', value as NewsCategoria | 'TODOS')}
              options={[
                { value: 'TODOS', label: 'Todas' },
                ...CATEGORIA_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label })),
              ]}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-maps-heading">Desde</span>
            <input
              type="date"
              value={draft.fechaDesde}
              onChange={(e) => set('fechaDesde', e.target.value)}
              className="rounded-xl border border-maps-border bg-white px-3 py-2 text-sm text-maps-heading focus:border-maps-brand focus:outline-none focus:ring-2 focus:ring-maps-brand/20"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-maps-heading">Hasta</span>
            <input
              type="date"
              value={draft.fechaHasta}
              onChange={(e) => set('fechaHasta', e.target.value)}
              className="rounded-xl border border-maps-border bg-white px-3 py-2 text-sm text-maps-heading focus:border-maps-brand focus:outline-none focus:ring-2 focus:ring-maps-brand/20"
            />
          </label>
        </div>

        <footer className="flex justify-between gap-2 border-t border-maps-border pt-4">
          <button
            type="button"
            onClick={() => {
              onReset();
              onClose();
            }}
            className="text-sm font-medium text-maps-muted hover:text-maps-heading"
          >
            Limpiar filtros
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-maps-border bg-white px-4 py-2 text-sm font-semibold text-maps-body transition hover:bg-maps-surface"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                onApply(draft);
                onClose();
              }}
              className="rounded-lg bg-maps-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-maps-brand-hover"
            >
              Aplicar
            </button>
          </div>
        </footer>
      </div>
    </Modal>
  );
}
