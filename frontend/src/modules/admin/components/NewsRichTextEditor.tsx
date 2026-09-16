/**
 * Editor de texto enriquecido para el cuerpo de una noticia (MAPS-007).
 *
 * Produce HTML semántico saneado (ver `sanitizeHtml.ts`) usando un área
 * `contentEditable` y `document.execCommand`, sin sumar dependencias. La toolbar
 * aplica: negrita, itálica, subtítulo (H2), listas (viñetas/numerada), cita,
 * link e imagen. La presentación final la define el frontend (`.news-prose`),
 * por eso el contenido guardado sólo lleva estructura, no estilos inline.
 *
 * Compatibilidad: si `value` llega como texto plano (noticias antiguas), se
 * convierte a párrafos preservando los saltos de línea, sin perder contenido.
 */
import { useEffect, useRef } from 'react';
import { Bold, Heading2, Italic, Link as LinkIcon, List, ListOrdered, Quote } from 'lucide-react';
import { looksLikeNewsHtml, sanitizeNewsHtml } from '@/shared/lib/sanitizeHtml';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Normaliza `value` a HTML apto para el área editable. */
function toEditorHtml(value: string): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';
  if (looksLikeNewsHtml(trimmed)) return sanitizeNewsHtml(trimmed);
  // Texto plano (noticia antigua): párrafos por doble salto, <br> por salto simple.
  return trimmed
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/** Detecta el estado "vacío" que deja contentEditable (p.ej. `<br>` o `<p></p>`). */
function isEmptyHtml(html: string): boolean {
  return html.replace(/<br\s*\/?>/gi, '').replace(/<[^>]+>/g, '').replace(/&nbsp;|\s/g, '') === '';
}

type Tool =
  | { kind: 'cmd'; Icon: typeof Bold; label: string; command: string }
  | { kind: 'block'; Icon: typeof Bold; label: string; block: string }
  | { kind: 'link'; Icon: typeof Bold; label: string };

const TOOLS: Tool[] = [
  { kind: 'cmd', Icon: Bold, label: 'Negrita', command: 'bold' },
  { kind: 'cmd', Icon: Italic, label: 'Cursiva', command: 'italic' },
  { kind: 'block', Icon: Heading2, label: 'Subtítulo', block: 'h2' },
  { kind: 'cmd', Icon: List, label: 'Lista con viñetas', command: 'insertUnorderedList' },
  { kind: 'cmd', Icon: ListOrdered, label: 'Lista numerada', command: 'insertOrderedList' },
  { kind: 'block', Icon: Quote, label: 'Cita', block: 'blockquote' },
  { kind: 'link', Icon: LinkIcon, label: 'Enlace' },
];

export function NewsRichTextEditor({
  value,
  onChange,
  placeholder = 'Escribe el contenido aquí...',
  disabled = false,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // Última versión emitida/aplicada, para evitar re-escribir el DOM en cada
  // pulsación (lo que provocaría saltos del cursor).
  const lastHtmlRef = useRef<string>('');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const incoming = toEditorHtml(value);
    if (incoming !== lastHtmlRef.current) {
      el.innerHTML = incoming;
      lastHtmlRef.current = incoming;
    }
  }, [value]);

  function emit() {
    const el = ref.current;
    if (!el) return;
    const raw = el.innerHTML;
    const normalized = isEmptyHtml(raw) ? '' : sanitizeNewsHtml(raw);
    lastHtmlRef.current = normalized;
    onChange(normalized);
  }

  function runTool(tool: Tool) {
    const el = ref.current;
    if (!el || disabled) return;
    el.focus();

    if (tool.kind === 'cmd') {
      document.execCommand(tool.command, false);
    } else if (tool.kind === 'block') {
      // Alterna el bloque: si ya es del tipo pedido, vuelve a párrafo.
      // `formatBlock` es más confiable entre navegadores con el tag entre <>.
      const current = document.queryCommandValue('formatBlock')?.toLowerCase();
      const next = current === tool.block ? 'p' : tool.block;
      document.execCommand('formatBlock', false, `<${next}>`);
    } else if (tool.kind === 'link') {
      const url = window.prompt('URL del enlace (https://...)');
      if (url && url.trim()) {
        document.execCommand('createLink', false, url.trim());
      }
    }

    emit();
  }

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-lg border border-maps-border bg-white focus-within:border-maps-brand focus-within:ring-2 focus-within:ring-maps-brand/20 ${disabled ? 'opacity-60' : ''}`}
    >
      <div
        className="flex flex-wrap items-center gap-1 border-b border-maps-border bg-maps-surface px-3 py-2"
        role="toolbar"
        aria-label="Formato"
      >
        {TOOLS.map((tool) => (
          <button
            key={tool.label}
            type="button"
            disabled={disabled}
            title={tool.label}
            aria-label={tool.label}
            // Evita perder la selección del editor al hacer foco en el botón.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => runTool(tool)}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-maps-muted transition hover:bg-white hover:text-maps-heading disabled:cursor-not-allowed disabled:opacity-60"
          >
            <tool.Icon size={14} strokeWidth={1.75} />
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Cuerpo de la noticia"
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        className="news-editor min-h-[12rem] w-full resize-y overflow-auto bg-white px-4 py-3 text-sm leading-relaxed text-maps-heading focus:outline-none"
      />
    </div>
  );
}
