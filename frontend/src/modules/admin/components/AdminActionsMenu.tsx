import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { KeyRound, MoreVertical, Pencil, UserCheck, UserMinus } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Admin } from '@/modules/admin/types/admin';

type Props = {
  admin: Admin;
  onEdit: (admin: Admin) => void;
  onToggleEstado: (admin: Admin) => void;
  onResetPassword: (admin: Admin) => void;
};

type MenuPosition = { top: number; left: number };

const MENU_WIDTH = 220;
const ITEM_HEIGHT = 36;
const MENU_PADDING = 8;
const VIEWPORT_MARGIN = 8;
const ITEM_COUNT = 3;

export function AdminActionsMenu({ admin, onEdit, onToggleEstado, onResetPassword }: Props) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function handleToggle() {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const menuHeight = ITEM_COUNT * ITEM_HEIGHT + MENU_PADDING;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward =
        spaceBelow < menuHeight + VIEWPORT_MARGIN && rect.top > menuHeight + VIEWPORT_MARGIN;
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

  return (
    <div className="relative flex items-center justify-end">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="flex h-11 w-11 items-center justify-center rounded-full text-maps-muted transition hover:bg-maps-surface hover:text-maps-heading"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Acciones para ${admin.usuario}`}
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
                icon={<Pencil size={16} />}
                label="Editar usuario"
                onClick={() => {
                  setOpen(false);
                  onEdit(admin);
                }}
              />
              <MenuItem
                icon={<KeyRound size={16} />}
                label="Restablecer contraseña"
                onClick={() => {
                  setOpen(false);
                  onResetPassword(admin);
                }}
              />
              <MenuItem
                icon={admin.activo ? <UserMinus size={16} /> : <UserCheck size={16} />}
                label={admin.activo ? 'Desactivar' : 'Reactivar'}
                onClick={() => {
                  setOpen(false);
                  onToggleEstado(admin);
                }}
                danger={admin.activo}
              />
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
  icon: ReactNode;
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
