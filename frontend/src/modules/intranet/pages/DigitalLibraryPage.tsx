import { LibraryHero } from '@/modules/intranet/components/LibraryHero';
import { LibraryRamosSection } from '@/modules/intranet/components/LibraryRamosSection';
import { LibrarySecondarySection } from '@/modules/intranet/components/LibrarySecondarySection';

export function DigitalLibraryPage() {
  return (
    <div className="flex flex-col">
      <LibraryHero />
      <LibraryRamosSection />
      <LibrarySecondarySection />
    </div>
  );
}
