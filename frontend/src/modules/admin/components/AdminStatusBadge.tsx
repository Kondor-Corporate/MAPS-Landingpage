type Props = {
  activo: boolean;
};

export function AdminStatusBadge({ activo }: Props) {
  const style = activo
    ? { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Activo' }
    : { bg: 'bg-rose-50', text: 'text-rose-600', label: 'Inactivo' };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  );
}
