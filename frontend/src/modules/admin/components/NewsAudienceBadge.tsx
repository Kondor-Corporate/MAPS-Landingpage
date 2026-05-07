import { AUDIENCIA_LABEL, type NewsAudiencia } from '@/modules/admin/types/news';

type Props = {
  audiencia: NewsAudiencia;
};

export function NewsAudienceBadge({ audiencia }: Props) {
  return (
    <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
      {AUDIENCIA_LABEL[audiencia]}
    </span>
  );
}
