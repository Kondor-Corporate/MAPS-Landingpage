import { useEffect, useRef, useState } from 'react';
import { Eye, MoreVertical, Pencil, Trash2, UserCheck, UserMinus } from 'lucide-react';
import type { Producer } from '@/modules/admin/types/producer';
import { producerNombreCompleto } from '@/modules/admin/types/producer';

type Props = {
  producer: Producer;
  onView: (p: Producer) => void;
  onEdit: (p: Producer) => void;
  onToggleEstado: (p: Producer) => void;
  onDelete?: (p: Producer) => void;
};

export function ProducerActionsMenu({
  producer,
  onView,
  onEdit,
  onToggleEstado,
  onDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const name = producerNombreCompleto(producer);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const isActive = producer.estado === 'ACTIVO';

  return (
    <div ref={containerRef} className="relative flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={() => onView(producer)}
        className="text-sm font-semibold text-maps-brand transition hover:underline"
      >
        Ver Perfil
      </button>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-maps-muted transition hover:bg-maps-surface hover:text-maps-heading"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Acciones para ${name}`}
      >
        <MoreVertical size={18} strokeWidth={1.75} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-xl border border-maps-border bg-white py-1 shadow-floating"
        >
          <MenuItem
            icon={<Eye size={16} />}
            label="Ver perfil"
            onClick={() => {
              setOpen(false);
              onView(producer);
            }}
          />
          <MenuItem
            icon={<Pencil size={16} />}
            label="Editar"
            onClick={() => {
              setOpen(false);
              onEdit(producer);
            }}
          />
          <MenuItem
            icon={isActive ? <UserMinus size={16} /> : <UserCheck size={16} />}
            label={isActive ? 'Desactivar' : 'Reactivar'}
            onClick={() => {
              setOpen(false);
              onToggleEstado(producer);
            }}
            danger={isActive}
          />
          {onDelete ? (
            <MenuItem
              icon={<Trash2 size={16} />}
              label="Eliminar"
              onClick={() => {
                setOpen(false);
                onDelete(producer);
              }}
              danger
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={[
        'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition',
        danger
          ? 'text-rose-600 hover:bg-rose-50'
          : 'text-maps-body hover:bg-maps-surface hover:text-maps-heading',
      ].join(' ')}
    >
      <span className="text-current">{icon}</span>
      {label}
    </button>
  );
}
