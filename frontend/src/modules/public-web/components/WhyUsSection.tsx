import type { ReactNode } from 'react';

const MonitorIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <rect x="2" y="3" width="20" height="13" rx="2" />
    <path d="M8 21h8M12 16v5" />
    <path d="M7 9h2M11 9h6M7 12h4" />
  </svg>
);

const MapPinIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M12 2C8.686 2 6 4.686 6 8c0 4.5 6 12 6 12s6-7.5 6-12c0-3.314-2.686-6-6-6z" />
    <circle cx="12" cy="8" r="2" />
  </svg>
);

const HeadsetIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
    <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
  </svg>
);

type Feature = {
  icon: ReactNode;
  title: string;
  description: string;
};

const features: Feature[] = [
  {
    icon: <MonitorIcon />,
    title: 'Gestión Digital',
    description:
      'Plataforma operativa en tiempo real para agilizar tus trámites, cotizaciones y pólizas desde cualquier lugar.',
  },
  {
    icon: <MapPinIcon />,
    title: 'Cobertura Nacional',
    description:
      'Una red de asesores presentes en todo el país para estar cerca tuyo cuando más lo necesites, sin importar dónde estés.',
  },
  {
    icon: <HeadsetIcon />,
    title: 'Atención Personalizada',
    description:
      'Asesoramiento humano y experto enfocado en tus necesidades reales, con el respaldo de una gran compañía como Federación Patronal.',
  },
];

export function WhyUsSection() {
  return (
    <section id="nosotros" className="scroll-mt-[70px] bg-white px-4 sm:px-6 lg:px-10 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold leading-tight lg:leading-10 tracking-[-0.9px] text-maps-heading">
            ¿Por qué elegir MAPS Asesores?
          </h2>
          <p className="max-w-[640px] text-lg leading-[29px] text-maps-muted">
            Ofrecemos un equipo profesional para facilitar la gestión diaria de los asesores,
            desarrollar proyectos comerciales de crecimiento y construir vínculos de confianza con
            los asegurados.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="flex flex-col gap-6 rounded-2xl border border-maps-border bg-white p-8 shadow-card"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-maps-brand-soft text-maps-brand">
                {feature.icon}
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-xl font-bold leading-[25px] text-maps-heading">
                  {feature.title}
                </h3>
                <p className="text-base leading-[26px] text-maps-muted">{feature.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
