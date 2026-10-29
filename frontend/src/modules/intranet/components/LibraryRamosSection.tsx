import { useMemo } from 'react';
import { useLibraryRamos } from '@/modules/intranet/hooks/useLibraryRamos';
import { LibraryCategoryGrid } from '@/modules/intranet/components/LibraryCategoryGrid';

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
    <path
      d="M2.5 7h9M7.5 3l4 4-4 4"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function LibraryRamosSection() {
  const { ramos, loading, error, refetch } = useLibraryRamos();

  const principales = useMemo(
    () =>
      ramos
        .filter((r) => r.tipo === 'PRINCIPAL' && r.activo)
        .sort((a, b) => a.orden - b.orden),
    [ramos],
  );

  function scrollToSecondary() {
    document.getElementById('explorar-categorias')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <section className="bg-white px-8 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-maps-heading">Ramos Principales</h2>
            <p className="mt-1 text-sm text-maps-muted">
              Selecciona una categoría para explorar material específico.
            </p>
          </div>
          <button
            type="button"
            onClick={scrollToSecondary}
            className="inline-flex items-center gap-1 text-sm font-semibold text-maps-brand transition hover:text-maps-brand-hover"
          >
            Ver todo
            <ArrowIcon />
          </button>
        </div>

        {error ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void refetch()}
              className="font-semibold underline"
            >
              Reintentar
            </button>
          </div>
        ) : null}

        {loading ? (
          <p className="text-center text-sm text-maps-muted">Cargando ramos…</p>
        ) : (
          <LibraryCategoryGrid ramos={principales} />
        )}
      </div>
    </section>
  );
}
