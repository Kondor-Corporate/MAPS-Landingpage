import { Filter, Plus } from 'lucide-react';
import { SearchPillInput } from '@/modules/admin/components/SearchPillInput';

type Props = {
  title: string;
  search: string;
  onSearchChange: (value: string) => void;
  onFilterClick: () => void;
  onNewClick: () => void;
  filterBadge?: number;
  newButtonLabel?: string;
  newButtonHint?: string;
};

export function ProducersToolbar({
  title,
  search,
  onSearchChange,
  onFilterClick,
  onNewClick,
  filterBadge,
  newButtonLabel = 'Nuevo Productor',
  newButtonHint,
}: Props) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <h2 className="text-lg font-bold text-maps-heading">{title}</h2>

      <div className="flex flex-1 justify-center">
        <SearchPillInput
          value={search}
          onChange={onSearchChange}
          onMenuClick={onFilterClick}
          placeholder="Buscar por nombre o email..."
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onFilterClick}
          className="relative inline-flex items-center gap-2 rounded-lg border border-maps-border bg-white px-3.5 py-2 text-sm font-medium text-maps-heading transition hover:bg-maps-surface"
        >
          <Filter size={16} strokeWidth={1.75} />
          Filtrar
          {filterBadge && filterBadge > 0 ? (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-maps-brand px-1.5 text-[10px] font-bold text-white">
              {filterBadge}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={onNewClick}
          title={newButtonHint}
          className="inline-flex items-center gap-1.5 rounded-lg bg-maps-brand px-3.5 py-2 text-sm font-semibold text-white shadow-cta transition hover:bg-maps-brand-hover"
        >
          <Plus size={16} strokeWidth={2} />
          {newButtonLabel}
        </button>
      </div>
    </div>
  );
}
