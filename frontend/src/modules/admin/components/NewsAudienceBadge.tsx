/** Badge de audiencia destino (público general vs productores). */
import { AUDIENCIA_LABEL, type NewsAudiencia } from '@/modules/admin/types/news';

type Props = {
  audiencia: NewsAudiencia;
};

const STYLES: Record<NewsAudiencia, string> = {
  PRODUCTORES: 'bg-blue-50 text-blue-800',
  PUBLICO: 'bg-violet-50 text-violet-700',
  AMBOS: 'bg-emerald-50 text-emerald-700',
};

export function NewsAudienceBadge({ audiencia }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[audiencia]}`}
    >
      {AUDIENCIA_LABEL[audiencia]}
    </span>
  );
}
