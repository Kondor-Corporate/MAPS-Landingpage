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
      className="bg-white px-4 sm:px-6 lg:px-10 py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto flex max-w-[1200px] flex-col gap-12">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold leading-tight lg:leading-[48px] tracking-[-0.9px] text-maps-heading">
            Nuestro equipo
          </h2>
          <p className="mx-auto mt-4 max-w-[571px] text-lg leading-[28px] text-maps-muted">
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
                className="group w-[80%] shrink-0 snap-start overflow-hidden rounded-2xl bg-white shadow-card transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl sm:w-full sm:shrink sm:snap-none"
              >
                <div className="aspect-[3/4] w-full overflow-hidden bg-maps-brand-soft">
                  <TeamMemberPhoto member={member} />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-bold leading-[24px] text-maps-heading">
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
