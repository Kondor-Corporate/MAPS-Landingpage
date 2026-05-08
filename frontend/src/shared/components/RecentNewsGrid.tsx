import { RecentNewsCard } from '@/shared/components/RecentNewsCard';
import { mockNews } from '@/shared/constants/mockNews';
import { useNewsModalStore } from '@/shared/store/newsModalStore';

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

export function RecentNewsGrid() {
  const openModal = useNewsModalStore((state) => state.openModal);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-2xl font-bold text-maps-heading">
          Comunicados Recientes
        </h2>
        <a
          href="/#noticias"
          className="inline-flex items-center gap-2 text-sm font-semibold text-maps-brand hover:text-maps-brand-hover"
        >
          Ver todo en novedades
          <ArrowIcon />
        </a>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {mockNews.map((item) => (
          <RecentNewsCard key={item.title} item={item} onClick={openModal} />
        ))}
      </div>
    </section>
  );
}
