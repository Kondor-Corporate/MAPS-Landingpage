import { HeroSection } from '@/modules/public-web/components/HeroSection';
import { WhyUsSection } from '@/modules/public-web/components/WhyUsSection';
import { NewsPreviewSection } from '@/modules/public-web/components/NewsPreviewSection';
import { NewsDetailModal } from '@/modules/public-web/components/NewsDetailModal';
import { FindAdvisorMap } from '@/modules/public-web/components/FindAdvisorMap';
import { TeamSection } from '@/modules/public-web/components/TeamSection';
import { CtaSection } from '@/modules/public-web/components/CtaSection';

export function HomePage() {
  return (
    <>
      <HeroSection />
      <WhyUsSection />
      <NewsPreviewSection />
      <FindAdvisorMap />
      <TeamSection />
      <CtaSection />
      <NewsDetailModal />
    </>
  );
}
