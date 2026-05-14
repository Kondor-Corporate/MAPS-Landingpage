import { Bold, Italic, Link as LinkIcon, ListOrdered, Image as ImageIcon } from 'lucide-react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const TOOLS = [
  { Icon: Bold, label: 'Negrita' },
  { Icon: Italic, label: 'Cursiva' },
  { Icon: ListOrdered, label: 'Lista' },
  { Icon: LinkIcon, label: 'Enlace' },
  { Icon: ImageIcon, label: 'Imagen' },
];

export function NewsRichTextEditor({
  value,
  onChange,
  placeholder = 'Escribe el contenido aquí...',
}: Props) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-maps-border bg-white focus-within:border-maps-brand focus-within:ring-2 focus-within:ring-maps-brand/20">
      <div
        className="flex items-center gap-1 border-b border-maps-border bg-maps-surface px-3 py-2"
        role="toolbar"
        aria-label="Formato"
      >
        {TOOLS.map(({ Icon, label }) => (
          <button
            key={label}
            type="button"
            disabled
            title={`${label} (próximamente)`}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-maps-muted opacity-60 transition hover:bg-white disabled:cursor-not-allowed"
            aria-label={`${label} (no disponible)`}
          >
            <Icon size={14} strokeWidth={1.75} />
          </button>
        ))}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={8}
        className="w-full resize-y bg-white px-4 py-3 text-sm text-maps-heading placeholder:text-maps-muted-soft focus:outline-none"
      />
    </div>
  );
}
