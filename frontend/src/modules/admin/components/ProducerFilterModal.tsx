import { useEffect, useState } from 'react';
import { Filter } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { MapsSelect } from '@/shared/components/MapsSelect';
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

const ESTADO_OPTIONS = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'ACTIVO', label: 'Activos' },
  { value: 'INACTIVO', label: 'Inactivos' },
];

const SUCURSAL_OPTIONS = [{ value: 'TODOS', label: 'Todas (sin datos en API)' }];

const ACTIVIDAD_OPTIONS = Object.entries(RANGE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function ProducerFilterModal({
  isOpen,
  onClose,
  initialFilters,
  onApply,
  onReset,
  hideEstado = false,
}: Props) {
  const [draft, setDraft] = useState<ProducerFilters>(initialFilters);
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft(initialFilters);
      setDateError(null);
    }
  }, [isOpen, initialFilters]);

  function update<K extends keyof ProducerFilters>(key: K, value: ProducerFilters[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    if (dateError && (key === 'fechaAltaDesde' || key === 'fechaAltaHasta')) {
      setDateError(null);
    }
  }

  function handleApply() {
    if (
      draft.fechaAltaDesde &&
      draft.fechaAltaHasta &&
      draft.fechaAltaDesde > draft.fechaAltaHasta
    ) {
      setDateError('"Alta desde" no puede ser posterior a "Alta hasta".');
      return;
    }

    onApply({ ...draft, sucursal: 'TODOS' });
    onClose();
  }

  function handleReset() {
    setDateError(null);
    onReset();
    onClose();
  }

  const hasDateError = Boolean(dateError);

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      <div className="flex flex-col gap-6 p-6">
        <header className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-maps-brand-soft text-maps-brand">
            <Filter size={20} strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-maps-heading">Filtros</h2>
            <p className="text-sm text-maps-muted">Refiná el listado de productores.</p>
          </div>
        </header>

        <div className="grid gap-4">
          {!hideEstado ? (
            <Field label="Estado">
              <MapsSelect
                value={draft.estado}
                onChange={(value) => update('estado', value as ProducerFilters['estado'])}
                options={ESTADO_OPTIONS}
                aria-label="Estado"
              />
            </Field>
          ) : null}

          <Field label="Sucursal">
            <MapsSelect
              value="TODOS"
              onChange={() => {}}
              options={SUCURSAL_OPTIONS}
              disabled
              aria-label="Sucursal"
            />
            <p className="mt-1 text-xs text-maps-muted">
              El listado viene del backend sin sucursal. Próximo si se persiste en MAPS.
            </p>
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Alta desde">
              <input
                type="date"
                value={draft.fechaAltaDesde.slice(0, 10)}
                onChange={(e) => update('fechaAltaDesde', e.target.value)}
                aria-invalid={hasDateError || undefined}
                className={hasDateError ? selectClassesError : selectClasses}
              />
            </Field>
            <Field label="Alta hasta">
              <input
                type="date"
                value={draft.fechaAltaHasta.slice(0, 10)}
                onChange={(e) => update('fechaAltaHasta', e.target.value)}
                aria-invalid={hasDateError || undefined}
                className={hasDateError ? selectClassesError : selectClasses}
              />
            </Field>
          </div>
          {dateError ? (
            <p role="alert" className="-mt-2 text-sm text-rose-600">
              {dateError}
            </p>
          ) : null}

          <Field label="Actividad (aprox.)">
            <MapsSelect
              value={draft.ultimaActividad}
              onChange={(value) => update('ultimaActividad', value as UltimaActividadRange)}
              options={ACTIVIDAD_OPTIONS}
              aria-label="Actividad"
            />
            <p className="mt-1 text-xs text-maps-muted">
              Basado en la última actualización de cuenta devuelta por el servidor.
            </p>
          </Field>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-maps-border pt-4">
          <button
            type="button"
            onClick={handleReset}
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
              onClick={handleApply}
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

const selectClassesError =
  'w-full rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm text-maps-heading transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200/40';

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
