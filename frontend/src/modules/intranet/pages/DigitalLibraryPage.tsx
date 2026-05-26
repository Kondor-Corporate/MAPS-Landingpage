import { LibraryHero } from '@/modules/intranet/components/LibraryHero';
import { LibraryRamosSection } from '@/modules/intranet/components/LibraryRamosSection';
import { LibrarySecondarySection } from '@/modules/intranet/components/LibrarySecondarySection';
import { useLibraryRamos } from '@/modules/intranet/hooks/useLibraryRamos';

export function DigitalLibraryPage() {
  const library = useLibraryRamos();

  return (
    <div className="flex flex-col">
      <LibraryHero />
      <LibraryRamosSection
        ramos={library.ramos}
        loading={library.loading}
        error={library.error}
        refetch={library.refetch}
      />
      <LibrarySecondarySection
        ramos={library.ramos}
        loading={library.loading}
        error={library.error}
        refetch={library.refetch}
      />
    </div>
  );
}
