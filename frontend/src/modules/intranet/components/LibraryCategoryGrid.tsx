import type { Ramo } from '@/modules/admin/types/library';
import { LibraryRamoCard } from '@/modules/intranet/components/LibraryRamoCard';

type Props = {
  ramos: Ramo[];
};

export function LibraryCategoryGrid({ ramos }: Props) {
  if (ramos.length === 0) {
    return (
      <p className="text-sm text-maps-muted">No hay ramos disponibles en este momento.</p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {ramos.map((ramo) => (
        <li key={ramo.id}>
          <LibraryRamoCard ramo={ramo} />
        </li>
      ))}
    </ul>
  );
}
