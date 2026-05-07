import { Mail, MapPin, Phone, CalendarDays, Activity, IdCard } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { Avatar } from '@/shared/components/Avatar';
import { ProducerStatusBadge } from '@/modules/admin/components/ProducerStatusBadge';
import type { Producer } from '@/modules/admin/types/producer';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  producer: Producer | null;
  onEdit?: (p: Producer) => void;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ProducerViewModal({ isOpen, onClose, producer, onEdit }: Props) {
  if (!producer) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
      <div className="flex flex-col">
        <div className="bg-gradient-to-br from-maps-brand-soft via-white to-white px-8 pb-6 pt-10">
          <div className="flex items-start gap-5">
            <Avatar name={producer.nombre} src={producer.avatarUrl} size="xl" />
            <div className="flex flex-1 flex-col gap-2">
              <h2 className="text-2xl font-bold text-maps-heading">{producer.nombre}</h2>
              <div className="flex items-center gap-3">
                <ProducerStatusBadge estado={producer.estado} />
                <span className="text-sm text-maps-muted">DNI {producer.dni}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 px-8 py-6 sm:grid-cols-2">
          <InfoRow icon={<Mail size={16} />} label="Email" value={producer.email} />
          <InfoRow icon={<Phone size={16} />} label="Teléfono" value={producer.telefono} />
          <InfoRow icon={<MapPin size={16} />} label="Sucursal" value={producer.sucursal} />
          <InfoRow icon={<IdCard size={16} />} label="DNI" value={producer.dni} />
          <InfoRow
            icon={<CalendarDays size={16} />}
            label="Alta"
            value={formatDate(producer.fechaAlta)}
          />
          <InfoRow
            icon={<Activity size={16} />}
            label="Última actividad"
            value={formatDateTime(producer.ultimaActividad)}
          />
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-maps-border bg-maps-surface px-8 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-maps-border bg-white px-4 py-2 text-sm font-medium text-maps-heading transition hover:bg-maps-surface"
          >
            Cerrar
          </button>
          {onEdit ? (
            <button
              type="button"
              onClick={() => onEdit(producer)}
              className="rounded-lg bg-maps-brand px-4 py-2 text-sm font-semibold text-white shadow-cta transition hover:bg-maps-brand-hover"
            >
              Editar productor
            </button>
          ) : null}
        </footer>
      </div>
    </Modal>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-maps-border bg-white p-3">
      <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-maps-brand-soft text-maps-brand">
        {icon}
      </span>
      <div className="flex flex-col">
        <span className="text-xs font-semibold uppercase tracking-wider text-maps-muted">
          {label}
        </span>
        <span className="text-sm font-medium text-maps-heading">{value}</span>
      </div>
    </div>
  );
}
