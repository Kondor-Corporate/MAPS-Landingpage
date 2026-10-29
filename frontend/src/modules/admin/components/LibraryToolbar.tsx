import { Plus, Search } from 'lucide-react';

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  onNewClick: () => void;
};

export function LibraryToolbar({ search, onSearchChange, onNewClick }: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative max-w-md flex-1">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-maps-muted"
          strokeWidth={1.75}
        />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por nombre..."
          className="w-full rounded-full border border-maps-border bg-white py-2 pl-9 pr-4 text-sm text-maps-heading transition focus:border-maps-brand focus:outline-none focus:ring-2 focus:ring-maps-brand/20"
        />
      </div>
      <button
        type="button"
        onClick={onNewClick}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-maps-brand px-4 py-2 text-sm font-semibold text-white shadow-cta transition hover:bg-maps-brand-hover"
      >
        <Plus size={16} strokeWidth={2} />
        Nuevo Ramo
      </button>
    </div>
  );
}
