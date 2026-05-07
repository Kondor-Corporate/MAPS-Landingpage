import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
};

const DEFAULT_OPTIONS = [8, 16, 32];

function pageList(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

export function ProducersPagination({
  page,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_OPTIONS,
}: Props) {
  const safeTotalPages = Math.max(1, totalPages);
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-maps-border bg-white px-6 py-3 sm:flex-row">
      <p className="text-xs text-maps-muted">
        Mostrando <span className="font-semibold text-maps-heading">{start}</span>–
        <span className="font-semibold text-maps-heading">{end}</span> de{' '}
        <span className="font-semibold text-maps-heading">{totalItems}</span>
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-maps-border text-maps-body transition hover:bg-maps-surface disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Página anterior"
        >
          <ChevronLeft size={16} />
        </button>
        {pageList(page, safeTotalPages).map((item, idx) =>
          item === 'ellipsis' ? (
            <span
              key={`e-${idx}`}
              className="flex h-8 w-8 items-center justify-center text-xs text-maps-muted"
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={[
                'flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-medium transition',
                item === page
                  ? 'border-maps-brand bg-maps-brand text-white shadow-card'
                  : 'border-maps-border text-maps-body hover:bg-maps-surface',
              ].join(' ')}
              aria-current={item === page ? 'page' : undefined}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(safeTotalPages, page + 1))}
          disabled={page === safeTotalPages}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-maps-border text-maps-body transition hover:bg-maps-surface disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Página siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <label className="flex items-center gap-2 text-xs text-maps-muted">
        Filas:
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="rounded-lg border border-maps-border bg-white px-2 py-1 text-sm font-medium text-maps-heading focus:border-maps-brand focus:outline-none focus:ring-2 focus:ring-maps-brand/20"
        >
          {pageSizeOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
