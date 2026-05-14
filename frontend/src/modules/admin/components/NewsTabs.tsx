import { FilePlus2, ListChecks } from 'lucide-react';

export type NewsTab = 'crear' | 'listado';

type Props = {
  active: NewsTab;
  onChange: (tab: NewsTab) => void;
};

const TABS: { id: NewsTab; label: string; Icon: typeof FilePlus2 }[] = [
  { id: 'crear', label: 'Crear Nueva Noticia', Icon: FilePlus2 },
  { id: 'listado', label: 'Listado de Noticias', Icon: ListChecks },
];

export function NewsTabs({ active, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 border-b border-maps-border" role="tablist">
      {TABS.map(({ id, label, Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            className={[
              'inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition',
              isActive
                ? 'border-maps-brand text-maps-brand'
                : 'border-transparent text-maps-muted hover:text-maps-heading',
            ].join(' ')}
          >
            <Icon size={16} strokeWidth={1.75} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
