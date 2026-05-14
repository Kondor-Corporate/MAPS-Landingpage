import { Menu, Search } from 'lucide-react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onMenuClick?: () => void;
};

export function SearchPillInput({
  value,
  onChange,
  placeholder = 'Buscar productores...',
  onMenuClick,
}: Props) {
  return (
    <div className="flex w-full max-w-xl items-center gap-2 rounded-full border border-maps-border bg-white px-2 py-1.5 shadow-card transition focus-within:border-maps-brand focus-within:ring-2 focus-within:ring-maps-brand/20">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-maps-muted transition hover:bg-maps-surface hover:text-maps-heading"
        aria-label="Abrir filtros"
      >
        <Menu size={18} strokeWidth={1.75} />
      </button>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-maps-heading placeholder:text-maps-muted-soft focus:outline-none"
      />
      <div className="flex h-8 w-8 shrink-0 items-center justify-center text-maps-muted">
        <Search size={18} strokeWidth={1.75} />
      </div>
    </div>
  );
}
