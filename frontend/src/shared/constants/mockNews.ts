import type { NewsItem } from '@/shared/types/news';

export const mockNews: NewsItem[] = [
  {
    category: 'Tecnología',
    date: 'Hace 2 días',
    title: 'El impacto de la IA en la gestión de siniestros modernos',
    href: '#',
    imageGradient: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #00a4c0 100%)',
  },
  {
    category: 'Empresa',
    date: 'Hace 5 días',
    title: 'MAPS Asesores expande su red de cobertura en el sur',
    href: '#',
    imageGradient: 'linear-gradient(135deg, #1e3a8a 0%, #00a4c0 100%)',
  },
  {
    category: 'Producto',
    date: 'Hace 1 semana',
    title: 'Nuevas funcionalidades en nuestra plataforma para productores',
    href: '#',
    imageGradient: 'linear-gradient(135deg, #0089a3 0%, #00a4c0 50%, #67e8f9 100%)',
  },
];
