import { useEffect, useState } from 'react';
import { Filter } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import type {
  ProducerFilters,
  UltimaActividadRange,
} from '@/modules/admin/hooks/useProducerFilters';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  initialFilters: ProducerFilters;
  onApply: (filters: ProducerFilters) => void;
  onReset: () => void;
  hideEstado?: boolean;
};

const RANGE_LABELS: Record<UltimaActividadRange, string> = {
  TODOS: 'Cualquier momento',
  '24H': 'Últimas 24 horas',
  '7D': 'Últimos 7 días',
  '30D': 'Últimos 30 días',
  '90D': 'Últimos 90 días',
};

export function ProducerFilterModal({
  isOpen,
  onClose,
  initialFilters,
  onApply,
  onReset,
  hideEstado = false,
}: Props) {
  const [draft, setDraft] = useState<ProducerFilters>(initialFilters);

  useEffect(() => {
    if (isOpen) setDraft(initialFilters);
  }, [isOpen, initialFilters]);

  function update<K extends keyof ProducerFilters>(key: K, value: ProducerFilters[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      <div className="flex flex-col gap-6 p-6">
        <header className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-maps-brand-soft text-maps-brand">
            <Filter size={20} strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="text-xl font-bold text-maps-heading">Filtros</h2>
            <p className="text-sm text-maps-muted">Refiná el listado de productores.</p>
          </div>
        </header>

        <div className="grid gap-4">
          {!hideEstado ? (
            <Field label="Estado">
              <select
                value={draft.estado}
                onChange={(e) => update('estado', e.target.value as ProducerFilters['estado'])}
                className={selectClasses}
              >
                <option value="TODOS">Todos</option>
                <option value="ACTIVO">Activos</option>
                <option value="INACTIVO">Inactivos</option>
              </select>
            </Field>
          ) : null}

          <Field label="Sucursal">
            <select value="TODOS" disabled className={selectClassesDisabled}>
              <option value="TODOS">Todas (sin datos en API)</option>
            </select>
            <p className="mt-1 text-xs text-maps-muted">
              El listado viene del backend sin sucursal. Próximo si se persiste en MAPS.
            </p>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Alta desde">
              <input
                type="date"
                value={draft.fechaAltaDesde.slice(0, 10)}
                onChange={(e) => update('fechaAltaDesde', e.target.value)}
                className={selectClasses}
              />
            </Field>
            <Field label="Alta hasta">
              <input
                type="date"
                value={draft.fechaAltaHasta.slice(0, 10)}
                onChange={(e) => update('fechaAltaHasta', e.target.value)}
                className={selectClasses}
              />
            </Field>
          </div>

          <Field label="Actividad (aprox.)">
            <select
              value={draft.ultimaActividad}
              onChange={(e) => update('ultimaActividad', e.target.value as UltimaActividadRange)}
              className={selectClasses}
            >
              {Object.entries(RANGE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-maps-muted">
              Basado en la última actualización de cuenta devuelta por el servidor.
            </p>
          </Field>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-maps-border pt-4">
          <button
            type="button"
            onClick={() => {
              onReset();
              onClose();
            }}
            className="text-sm font-medium text-maps-muted transition hover:text-maps-heading"
          >
            Limpiar filtros
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-maps-border bg-white px-4 py-2 text-sm font-medium text-maps-heading transition hover:bg-maps-surface"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                onApply({
                  ...draft,
                  sucursal: 'TODOS',
                });
                onClose();
              }}
              className="rounded-lg bg-maps-brand px-4 py-2 text-sm font-semibold text-white shadow-cta transition hover:bg-maps-brand-hover"
            >
              Aplicar
            </button>
          </div>
        </footer>
      </div>
    </Modal>
  );
}

const selectClasses =
  'w-full rounded-lg border border-maps-border bg-white px-3 py-2 text-sm text-maps-heading transition focus:border-maps-brand focus:outline-none focus:ring-2 focus:ring-maps-brand/20';

const selectClassesDisabled =
  'w-full cursor-not-allowed rounded-lg border border-maps-border bg-maps-surface px-3 py-2 text-sm text-maps-muted';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wider text-maps-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
