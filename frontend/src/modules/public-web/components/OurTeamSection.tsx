import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ourTeam } from '@/modules/public-web/data/ourTeam';
import type { OurTeamMember } from '@/modules/public-web/types/ourTeam';
import { getInitials } from '@/shared/utils/initials';

function TeamMemberPhoto({ member }: { member: OurTeamMember }) {
  if (member.foto) {
    return (
      <img
        src={member.foto}
        alt={`${member.nombre} ${member.apellido}`}
        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <span
      aria-hidden
      className="flex h-full w-full items-center justify-center bg-maps-brand-soft text-5xl font-bold text-maps-brand"
    >
      {getInitials(`${member.nombre} ${member.apellido}`)}
    </span>
  );
}

const SCROLL_TOLERANCE_PX = 4;

export function OurTeamSection() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollPrev(el.scrollLeft > SCROLL_TOLERANCE_PX);
    setCanScrollNext(el.scrollLeft + el.clientWidth < el.scrollWidth - SCROLL_TOLERANCE_PX);
  }, []);

  useEffect(() => {
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  }, [updateScrollState]);

  const scrollByDirection = (direction: 'prev' | 'next') => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.9 * (direction === 'prev' ? -1 : 1);
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  if (ourTeam.length === 0) return null;

  return (
    <section
      id="equipo"
      className="bg-white px-4 py-[clamp(2.75rem,7vw,6rem)] sm:px-6 lg:px-10"
    >
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 sm:gap-10 lg:gap-12">
        <div className="text-center">
          <h2 className="text-[clamp(1.5rem,4.5vw,2.25rem)] font-bold leading-[1.15] tracking-[-0.9px] text-maps-heading lg:leading-[48px]">
            Nuestro equipo
          </h2>
          <p className="mx-auto mt-3 max-w-[571px] text-[clamp(1rem,2.5vw,1.125rem)] leading-relaxed text-maps-muted sm:mt-4">
            MAPS se construye con personas. Personas que comparten una manera de trabajar, de
            acompañar y de pensar el futuro. Una visión y un rumbo. Un mismo ADN.
          </p>
        </div>

        <div
          className="relative"
          role="region"
          aria-label="Nuestro equipo"
        >
          <div
            ref={scrollerRef}
            onScroll={updateScrollState}
            className="flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:snap-none sm:pb-0 lg:grid-cols-4"
          >
            {ourTeam.map((member) => (
              <article
                key={member.id}
                className="group w-[70%] max-w-[260px] shrink-0 snap-start overflow-hidden rounded-2xl bg-white shadow-card transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl sm:w-full sm:max-w-none sm:shrink sm:snap-none"
              >
                <div className="aspect-[4/5] w-full overflow-hidden bg-maps-brand-soft sm:aspect-[3/4]">
                  <TeamMemberPhoto member={member} />
                </div>
                <div className="p-3 sm:p-4">
                  <h3 className="text-base font-bold leading-[1.3] text-maps-heading sm:text-lg">
                    {[member.nombre, member.apellido].filter(Boolean).join(' ')}
                  </h3>
                  <p className="text-sm text-maps-muted">{member.puesto}</p>
                </div>
              </article>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scrollByDirection('prev')}
            disabled={!canScrollPrev}
            aria-label="Ver integrante anterior"
            className="absolute left-0 top-1/2 flex -translate-x-4 -translate-y-1/2 items-center justify-center rounded-full border border-maps-border bg-white p-2 text-maps-heading shadow-card transition-opacity disabled:pointer-events-none disabled:opacity-0 sm:hidden"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => scrollByDirection('next')}
            disabled={!canScrollNext}
            aria-label="Ver integrante siguiente"
            className="absolute right-0 top-1/2 flex -translate-y-1/2 translate-x-4 items-center justify-center rounded-full border border-maps-border bg-white p-2 text-maps-heading shadow-card transition-opacity disabled:pointer-events-none disabled:opacity-0 sm:hidden"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </section>
  );
}
