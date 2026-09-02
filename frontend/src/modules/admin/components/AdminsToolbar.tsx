import { Plus, Search } from 'lucide-react';
import type { AdminStatusFilter } from '@/modules/admin/types/admin';

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: AdminStatusFilter;
  onStatusFilterChange: (value: AdminStatusFilter) => void;
  onNewClick: () => void;
};

const STATUS_OPTIONS: { value: AdminStatusFilter; label: string }[] = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'ACTIVOS', label: 'Activos' },
  { value: 'INACTIVOS', label: 'Inactivos' },
];

export function AdminsToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onNewClick,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-maps-heading">Listado de administradores</h2>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-md flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-maps-muted"
            strokeWidth={1.75}
            aria-hidden
          />
          <label htmlFor="admins-search" className="sr-only">
            Buscar por usuario
          </label>
          <input
            id="admins-search"
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por usuario..."
            className="w-full rounded-full border border-maps-border bg-white py-2 pl-9 pr-4 text-sm text-maps-heading transition focus:border-maps-brand focus:outline-none focus:ring-2 focus:ring-maps-brand/20"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <div
            role="radiogroup"
            aria-label="Filtrar por estado"
            className="inline-flex rounded-lg border border-maps-border bg-white p-0.5"
          >
            {STATUS_OPTIONS.map((option) => {
              const selected = statusFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onStatusFilterChange(option.value)}
                  className={[
                    'min-h-9 rounded-md px-3 py-1.5 text-sm font-medium transition',
                    selected
                      ? 'bg-maps-brand text-white shadow-cta'
                      : 'text-maps-heading hover:bg-maps-surface',
                  ].join(' ')}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onNewClick}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-maps-brand px-3.5 py-2 text-sm font-semibold text-white shadow-cta transition hover:bg-maps-brand-hover"
          >
            <Plus size={16} strokeWidth={2} aria-hidden />
            Nuevo administrador
          </button>
        </div>
      </div>
    </div>
  );
}
