import { Link } from 'react-router-dom';
import { BadgeCheck } from 'lucide-react';
import { useProducersMap } from '@/modules/public-web/hooks/useProducersMap';
import type { MapProducer } from '@/modules/public-web/types/producerMap';
import { getInitials } from '@/shared/utils/initials';

const TEAM_SIZE = 3;

function pickTeamProducers(producers: MapProducer[]): MapProducer[] {
  const verified = producers.filter((p) => p.verificado);
  const pool = verified.length > 0 ? verified : producers;
  return pool.slice(0, TEAM_SIZE);
}

function TeamProducerAvatar({ producer }: { producer: MapProducer }) {
  if (producer.foto) {
    return (
      <img
        src={producer.foto}
        alt={producer.nombreCompleto}
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden
      className="flex h-full w-full items-center justify-center bg-maps-brand-soft text-2xl font-bold text-maps-brand"
    >
      {getInitials(producer.nombreCompleto)}
    </span>
  );
}

export function TeamSection() {
  const { producers, loading, error } = useProducersMap();
  const team = pickTeamProducers(producers);

  return (
    <section
      id="equipo"
      className="bg-maps-surface px-4 sm:px-6 lg:px-10 pb-20 sm:pb-24 lg:pb-32 pt-16 sm:pt-20 lg:pt-24"
    >
      <div className="mx-auto flex max-w-[1100px] flex-col gap-12">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold leading-tight lg:leading-[48px] tracking-[-0.9px] text-maps-heading">
            Conocé nuestra red de asesores
          </h2>
          <p className="mx-auto mt-4 max-w-[571px] text-lg leading-[28px] text-maps-muted">
            Productores activos de MAPS con perfil público. Explorá el mapa para encontrar al
            asesor más cercano a vos.
          </p>
        </div>

        {loading ? (
          <p className="text-center text-sm text-maps-muted">Cargando asesores…</p>
        ) : null}

        {!loading && error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm text-rose-900">
            <p>{error}</p>
            <a
              href="#mapa"
              className="mt-2 inline-flex font-semibold text-maps-brand underline underline-offset-2"
            >
              Ir al mapa de asesores
            </a>
          </div>
        ) : null}

        {!loading && !error && team.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-10 text-center shadow-card">
            <p className="text-base text-maps-muted">
              Todavía no hay asesores publicados para mostrar acá.
            </p>
            <a
              href="#mapa"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-maps-brand px-6 text-base font-bold text-white transition-colors hover:bg-maps-brand-hover"
            >
              Ver mapa de asesores
            </a>
          </div>
        ) : null}

        {!loading && !error && team.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {team.map((producer) => (
              <article
                key={producer.slug}
                className="flex h-full flex-col items-center gap-2 rounded-2xl bg-white p-8 text-center shadow-card"
              >
                <div className="h-32 w-32 shrink-0 overflow-hidden rounded-full bg-maps-brand-soft">
                  <TeamProducerAvatar producer={producer} />
                </div>
                <div className="mt-6 flex items-center gap-1.5">
                  <h3 className="text-2xl font-bold leading-[32px] text-maps-heading">
                    {producer.nombreCompleto}
                  </h3>
                  {producer.verificado ? (
                    <BadgeCheck
                      className="h-5 w-5 shrink-0 text-maps-brand"
                      aria-label="Productor verificado"
                    />
                  ) : null}
                </div>
                <p className="line-clamp-2 text-base text-maps-muted">
                  {producer.tituloProfesional ?? 'Asesor de seguros'}
                </p>
                {producer.ciudad ? (
                  <p className="line-clamp-2 text-sm text-maps-muted">{producer.ciudad}</p>
                ) : null}
                <Link
                  to={`/productor/${producer.slug}`}
                  className="mt-auto inline-flex h-12 w-full items-center justify-center rounded-lg bg-maps-brand text-base font-bold text-white transition-colors hover:bg-maps-brand-hover"
                >
                  Ver perfil
                </Link>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
