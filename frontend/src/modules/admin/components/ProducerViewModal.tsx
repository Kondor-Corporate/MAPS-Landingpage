import {
  Activity,
  Award,
  BadgeCheck,
  CalendarDays,
  ExternalLink,
  Globe,
  Languages,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaLinkedin, FaTwitter, FaYoutube } from 'react-icons/fa';
import { Avatar } from '@/shared/components/Avatar';
import { Modal } from '@/shared/components/Modal';
import { SingleProducerMap } from '@/shared/components/map/SingleProducerMap';
import { ProducerStatusBadge } from '@/modules/admin/components/ProducerStatusBadge';
import { ProfileCertificationsList } from '@/shared/components/profile/ProfileCertificationsList';
import type { Producer } from '@/modules/admin/types/producer';
import { producerNombreCompleto } from '@/modules/admin/types/producer';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  producer: Producer | null;
  onEdit?: (p: Producer) => void;
};

const SOCIAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  linkedin: FaLinkedin,
  instagram: FaInstagram,
  facebook: FaFacebook,
  twitter: FaTwitter,
  x: FaTwitter,
  youtube: FaYoutube,
};

const DASH = '—';

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

function fallback(value: string | null | undefined): string {
  if (!value) return DASH;
  const trimmed = value.trim();
  return trimmed === '' ? DASH : trimmed;
}

export function ProducerViewModal({ isOpen, onClose, producer, onEdit }: Props) {
  if (!producer) return null;

  const name = producerNombreCompleto(producer);
  const hasCoords = producer.latitud != null && producer.longitud != null;
  const stats = `${producer.anosExperiencia ?? DASH} años · ${producer.clientesActivos ?? DASH} clientes`;
  const publicProfileUrl = `/productor/${producer.slug}`;
  const waLink = producer.whatsapp
    ? `https://wa.me/${producer.whatsapp.replace(/\D/g, '')}`
    : null;
  const ultimoLoginLabel = producer.ultimoLogin
    ? formatDateTime(producer.ultimoLogin)
    : 'Nunca';

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl">
      <div className="flex max-h-[90vh] flex-col">
        <div className="bg-gradient-to-br from-maps-brand-soft via-white to-white px-8 pb-6 pt-10">
          <div className="flex items-start gap-5">
            <Avatar name={name} src={producer.avatarUrl} size="xl" />
            <div className="flex flex-1 flex-col gap-2">
              <h2 className="text-2xl font-bold text-maps-heading">{name}</h2>
              <div className="flex flex-wrap items-center gap-3">
                <ProducerStatusBadge estado={producer.estado} />
                {producer.verificado && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    <BadgeCheck size={14} aria-hidden />
                    Verificado
                  </span>
                )}
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-maps-muted ring-1 ring-maps-border">
                  /{producer.slug}
                </span>
              </div>
              {producer.tituloProfesional && (
                <p className="text-sm text-maps-muted">
                  {producer.tituloProfesional}
                  {producer.matricula ? ` · Matrícula #${producer.matricula}` : ''}
                </p>
              )}
              {producer.redesSociales.length > 0 && (
                <div className="mt-1 flex items-center gap-2">
                  {producer.redesSociales.map((red) => {
                    const Icon = SOCIAL_ICONS[red.plataforma.toLowerCase()] ?? Globe;
                    return (
                      <a
                        key={`${red.plataforma}-${red.url}`}
                        href={red.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={red.plataforma}
                        className="text-maps-muted transition-colors hover:text-maps-brand"
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoRow icon={<Mail size={16} />} label="Email" value={producer.email} />
            <InfoRow icon={<Phone size={16} />} label="Teléfono" value={fallback(producer.telefono)} />
            <InfoRow
              icon={<MessageCircle size={16} />}
              label="WhatsApp"
              value={fallback(producer.whatsapp)}
              link={waLink}
            />
            <InfoRow
              icon={<MapPin size={16} />}
              label="Dirección"
              value={fallback(producer.ciudad)}
            />
            <InfoRow
              icon={<Award size={16} />}
              label="Matrícula"
              value={producer.matricula ? `#${producer.matricula}` : DASH}
            />
            <InfoRow
              icon={<Activity size={16} />}
              label="Experiencia / Clientes"
              value={stats}
            />
            <InfoRow
              icon={<Languages size={16} />}
              label="Idiomas"
              value={producer.idiomas.length > 0 ? producer.idiomas.join(', ') : DASH}
            />
          </div>

          {producer.bio && (
            <Section title="Bio">
              <p className="whitespace-pre-line text-sm leading-relaxed text-maps-body">
                {producer.bio}
              </p>
            </Section>
          )}

          {producer.especialidades.length > 0 && (
            <Section title="Especialidades">
              <ul className="flex flex-wrap gap-1.5">
                {producer.especialidades.map((esp) => (
                  <li
                    key={esp.clave}
                    className="rounded-full bg-maps-brand-soft px-2.5 py-1 text-xs font-semibold text-maps-brand"
                  >
                    {esp.label}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Geolocalización">
            {hasCoords ? (
              <div className="flex flex-col gap-2">
                <div className="overflow-hidden rounded-xl border border-maps-border">
                  <SingleProducerMap
                    latitud={producer.latitud!}
                    longitud={producer.longitud!}
                    label={`Ubicación de ${name}`}
                    className="relative h-[180px] w-full"
                    zoom={14}
                  />
                </div>
                <p className="text-xs text-maps-muted">
                  Lat {producer.latitud!.toFixed(5)} · Lng {producer.longitud!.toFixed(5)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-maps-muted">
                Sin coordenadas. La geolocalización se calcula al guardar la dirección.
              </p>
            )}
          </Section>

          <Section title="Certificaciones">
            <ProfileCertificationsList
              certificaciones={producer.certificaciones}
              emptyMessage="Sin certificaciones cargadas."
            />
          </Section>

          <Section title="Cuenta">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoRow
                icon={<CalendarDays size={16} />}
                label="Alta"
                value={formatDate(producer.fechaAlta)}
              />
              <InfoRow
                icon={<ShieldCheck size={16} />}
                label="Último login"
                value={ultimoLoginLabel}
              />
            </div>
          </Section>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-maps-border bg-maps-surface px-8 py-4">
          <a
            href={publicProfileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-maps-border bg-white px-4 py-2 text-sm font-medium text-maps-heading transition hover:bg-maps-surface"
          >
            <ExternalLink size={14} aria-hidden />
            Ver perfil público
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-maps-border bg-white px-4 py-2 text-sm font-medium text-maps-heading transition hover:bg-maps-surface"
          >
            Cerrar
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(producer)}
              className="rounded-lg bg-maps-brand px-4 py-2 text-sm font-semibold text-white shadow-cta transition hover:bg-maps-brand-hover"
            >
              Editar productor
            </button>
          )}
        </footer>
      </div>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="text-xs font-bold uppercase tracking-wider text-maps-muted">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function InfoRow({
  icon,
  label,
  value,
  link,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  link?: string | null;
}) {
  const valueNode = link ? (
    <a
      href={link}
      target="_blank"
      rel="noreferrer"
      className="text-sm font-medium text-maps-brand hover:underline"
    >
      {value}
    </a>
  ) : (
    <span className="text-sm font-medium text-maps-heading">{value}</span>
  );

  return (
    <div className="flex items-start gap-3 rounded-xl border border-maps-border bg-white p-3">
      <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-maps-brand-soft text-maps-brand">
        {icon}
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-xs font-semibold uppercase tracking-wider text-maps-muted">
          {label}
        </span>
        {valueNode}
      </div>
    </div>
  );
}
