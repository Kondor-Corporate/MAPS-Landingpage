import { useMemo } from 'react';
import { useLibraryRamos } from '@/modules/intranet/hooks/useLibraryRamos';
import { RamoIcon } from '@/modules/admin/components/RamoIcon';

const LIBRARY_GRADIENT =
  'linear-gradient(135deg, #1e3a8a 0%, #312e81 50%, #00a4c0 100%)';

export function LibrarySecondarySection() {
  const { ramos, loading, error, refetch } = useLibraryRamos();

  const secundarios = useMemo(
    () =>
      ramos
        .filter((r) => r.tipo === 'SECUNDARIO' && r.activo)
        .sort((a, b) => a.orden - b.orden),
    [ramos],
  );

  if (!loading && !error && secundarios.length === 0) return null;

  return (
    <section
      id="explorar-categorias"
      className="px-8 py-16 text-white"
      style={{ background: LIBRARY_GRADIENT }}
    >
      <div className="mx-auto max-w-7xl">
        <h2 className="text-2xl font-bold">Explorar más categorías</h2>
        <p className="mt-1 text-sm text-white/85">
          Otros ramos y recursos adicionales disponibles para descarga.
        </p>

        {error ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm">
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
          <p className="mt-8 text-sm text-white/85">Cargando categorías…</p>
        ) : (
          <ul className="mt-8 flex flex-wrap gap-3">
            {secundarios.map((ramo) => {
              const hasLink = ramo.gdriveUrl.trim().length > 0;
              return (
                <li key={ramo.id}>
                  {hasLink ? (
                    <a
                      href={ramo.gdriveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-white/40 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
                    >
                      <RamoIcon icon={ramo.icono} size={15} className="shrink-0" />
                      {ramo.nombre}
                    </a>
                  ) : (
                    <span
                      className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-sm font-medium text-white/50"
                      aria-disabled="true"
                    >
                      <RamoIcon icon={ramo.icono} size={15} className="shrink-0 opacity-50" />
                      {ramo.nombre}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
