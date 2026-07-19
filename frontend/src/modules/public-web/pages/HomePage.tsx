import { HeroSection } from '@/modules/public-web/components/HeroSection';
import { WhyUsSection } from '@/modules/public-web/components/WhyUsSection';
import { NewsPreviewSection } from '@/modules/public-web/components/NewsPreviewSection';
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
    </>
  );
}
