import { useNewsModalStore } from '@/shared/store/newsModalStore';
import type { NewsItem } from '@/shared/types/news';

const news: NewsItem[] = [
  {
    category: 'Tecnología',
    date: 'Hace 2 días',
    title: 'El impacto de la IA en la gestión de siniestros modernos',
    href: '#',
    imageGradient:
      'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #00a4c0 100%)',
  },
  {
    category: 'Empresa',
    date: 'Hace 5 días',
    title: 'MAPS Asesores expande su red de cobertura en el sur',
    href: '#',
    imageGradient:
      'linear-gradient(135deg, #1e3a8a 0%, #00a4c0 100%)',
  },
  {
    category: 'Producto',
    date: 'Hace 1 semana',
    title: 'Nuevas funcionalidades en nuestra plataforma para productores',
    href: '#',
    imageGradient:
      'linear-gradient(135deg, #0089a3 0%, #00a4c0 50%, #67e8f9 100%)',
  },
];

const ArrowIcon = () => (
  <svg
    width="6"
    height="9"
    viewBox="0 0 6 9"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <path
      d="M1 1L5 4.5L1 8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function NewsPreviewSection() {
  const openModal = useNewsModalStore((state) => state.openModal);

  return (
    <section id="noticias" className="bg-maps-brand px-4 sm:px-6 lg:px-10 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="h-[2px] w-8 rounded-full bg-white" />
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-white/80">
              Actualidad
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold leading-tight lg:leading-10 tracking-[-0.9px] text-white">
            Últimas Noticias y Novedades
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {news.map((item) => (
            <button
              key={item.title}
              onClick={() => openModal(item)}
              className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-card transition-transform hover:scale-105 hover:shadow-lg"
            >
              <div
                className="h-[195px] w-full"
                style={{ background: item.imageGradient }}
                aria-hidden
              />
              <div className="flex flex-1 flex-col gap-4 p-6">
                <div className="flex items-center gap-3 text-xs">
                  <span className="rounded-md bg-maps-brand-soft px-3 py-1 font-semibold text-maps-brand">
                    {item.category}
                  </span>
                  <span className="text-maps-muted-soft">{item.date}</span>
                </div>
                <h3 className="text-xl font-bold leading-[25px] text-maps-heading">
                  {item.title}
                </h3>
                <span
                  className="mt-auto inline-flex items-center gap-2 text-sm font-bold text-maps-brand"
                >
                  Leer más
                  <ArrowIcon />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
