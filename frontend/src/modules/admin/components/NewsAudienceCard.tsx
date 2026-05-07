import { Users } from 'lucide-react';
import type { NewsAudiencia } from '@/modules/admin/types/news';

type Props = {
  value: NewsAudiencia;
  onChange: (next: NewsAudiencia) => void;
};

const OPTIONS: { value: NewsAudiencia; label: string; hint: string }[] = [
  {
    value: 'PRODUCTORES',
    label: 'Productores',
    hint: 'Solo visible en el panel privado',
  },
  {
    value: 'PUBLICO',
    label: 'Público General',
    hint: 'Visible en el sitio web público',
  },
];

export function NewsAudienceCard({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-maps-border bg-white p-5 shadow-card">
      <div className="flex items-center gap-2 text-sm font-semibold text-maps-heading">
        <Users size={16} strokeWidth={1.75} className="text-violet-600" />
        Audiencia
      </div>
      <div className="flex flex-col gap-2">
        {OPTIONS.map((opt) => {
          const checked = value === opt.value;
          return (
            <label
              key={opt.value}
              className={[
                'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition',
                checked
                  ? 'border-maps-brand bg-maps-brand-soft'
                  : 'border-maps-border bg-white hover:border-maps-brand/50',
              ].join(' ')}
            >
              <input
                type="radio"
                name="audiencia"
                value={opt.value}
                checked={checked}
                onChange={() => onChange(opt.value)}
                className="mt-0.5 h-4 w-4 accent-maps-brand"
              />
              <span className="flex flex-col">
                <span className="text-sm font-medium text-maps-heading">{opt.label}</span>
                <span className="text-xs text-maps-muted">{opt.hint}</span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
