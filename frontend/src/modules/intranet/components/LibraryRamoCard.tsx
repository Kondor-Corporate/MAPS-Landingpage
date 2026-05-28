import { RamoIcon } from '@/modules/admin/components/RamoIcon';
import type { Ramo } from '@/modules/admin/types/library';

type Props = {
  ramo: Ramo;
};

export function LibraryRamoCard({ ramo }: Props) {
  const hasLink = ramo.gdriveUrl.trim().length > 0;

  return (
    <article className="flex h-full flex-col rounded-2xl border border-maps-border bg-white p-6 shadow-card">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-maps-brand-soft text-maps-brand">
        <RamoIcon icon={ramo.icono} size={24} />
      </div>
      <h3 className="text-lg font-bold text-maps-heading">{ramo.nombre}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-maps-muted">{ramo.descripcion}</p>
      <div className="mt-6">
        {hasLink ? (
          <a
            href={ramo.gdriveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 w-full items-center justify-center rounded-lg bg-maps-surface text-sm font-semibold text-maps-heading transition hover:bg-maps-brand-soft hover:text-maps-brand"
          >
            Explorar contenido
          </a>
        ) : (
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="flex h-10 w-full cursor-not-allowed items-center justify-center rounded-lg bg-maps-surface text-sm font-semibold text-maps-muted-soft"
          >
            Sin link disponible
          </button>
        )}
      </div>
    </article>
  );
}
