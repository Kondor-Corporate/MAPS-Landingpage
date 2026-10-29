import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, KeyRound, MoreVertical, Pencil, Trash2, UserCheck, UserMinus } from 'lucide-react';
import type { Producer } from '@/modules/admin/types/producer';
import { producerNombreCompleto } from '@/modules/admin/types/producer';

type Props = {
  producer: Producer;
  onView: (p: Producer) => void;
  onEdit: (p: Producer) => void;
  onToggleEstado: (p: Producer) => void;
  onResetPassword: (p: Producer) => void;
  onDelete?: (p: Producer) => void;
};

type MenuPosition = { top: number; left: number };

const MENU_WIDTH = 176; // w-44
const ITEM_HEIGHT = 36;
const MENU_PADDING = 8; // py-1 arriba + abajo
const VIEWPORT_MARGIN = 8;

export function ProducerActionsMenu({
  producer,
  onView,
  onEdit,
  onToggleEstado,
  onResetPassword,
  onDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const name = producerNombreCompleto(producer);
  const itemCount = 4 + (onDelete ? 1 : 0);

  function handleToggle() {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const menuHeight = itemCount * ITEM_HEIGHT + MENU_PADDING;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < menuHeight + VIEWPORT_MARGIN && rect.top > menuHeight + VIEWPORT_MARGIN;
      const top = openUpward ? rect.top - menuHeight - 4 : rect.bottom + 4;
      const left = Math.min(
        Math.max(VIEWPORT_MARGIN, rect.right - MENU_WIDTH),
        window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN,
      );
      setPosition({ top, left });
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    // Cierra el menú ante scroll/resize en vez de recalcular su posición: evita que
    // quede "flotando" desalineado del botón que lo abrió.
    function handleScrollOrResize() {
      setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [open]);

  const isActive = producer.estado === 'ACTIVO';

  return (
    <div className="relative flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={() => onView(producer)}
        className="text-sm font-semibold text-maps-brand transition hover:underline"
      >
        Ver Perfil
      </button>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="flex h-8 w-8 items-center justify-center rounded-full text-maps-muted transition hover:bg-maps-surface hover:text-maps-heading"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Acciones para ${name}`}
      >
        <MoreVertical size={18} strokeWidth={1.75} />
      </button>

      {open && position
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ position: 'fixed', top: position.top, left: position.left, width: MENU_WIDTH }}
              className="z-50 overflow-hidden rounded-xl border border-maps-border bg-white py-1 shadow-floating"
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
                icon={<KeyRound size={16} />}
                label="Restablecer contraseña"
                onClick={() => {
                  setOpen(false);
                  onResetPassword(producer);
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
            </div>,
            document.body,
          )
        : null}
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
