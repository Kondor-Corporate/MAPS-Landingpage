import {
  BadgeCheck,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
} from 'lucide-react';
import type { ProfileHeaderData } from '@/shared/types/producerProfile';
import { getInitials } from '@/shared/utils/initials';

type Props = {
  profile: ProfileHeaderData;
  onEdit?: () => void;
  variant?: 'intranet' | 'public';
};

export function ProfileHeaderCard({ profile, onEdit, variant = 'intranet' }: Props) {
  const initials = getInitials(profile.nombreCompleto);
  const matriculaLabel = profile.matricula
    ? `#${profile.matricula.replace(/^#/, '')}`
    : null;
  const isPublic = variant === 'public';

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-8 shadow-[0px_4px_20px_-2px_rgba(0,0,0,0.05)]">
      <div
        className="pointer-events-none absolute -right-32 -top-32 size-64 rounded-full bg-maps-brand/10"
        aria-hidden
      />

      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="relative mx-auto shrink-0 lg:mx-0">
          {profile.foto ? (
            <img
              src={profile.foto}
              alt={profile.nombreCompleto}
              className="size-32 rounded-full object-cover shadow-[0_0_0_4px_white]"
            />
          ) : (
            <div
              className="flex size-32 items-center justify-center rounded-full bg-maps-brand-soft text-3xl font-bold text-maps-brand shadow-[0_0_0_4px_white]"
              aria-hidden
            >
              {initials}
            </div>
          )}
          {profile.verificado && (
            <span className="absolute bottom-1 right-1 flex size-6 items-center justify-center rounded-full border-2 border-white bg-maps-brand text-white">
              <BadgeCheck className="size-3.5" aria-hidden />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 text-center lg:text-left">
          <div className="flex flex-col items-center gap-3 lg:flex-row lg:items-center">
            <h1 className="text-[30px] font-extrabold leading-9 text-slate-900">
              {profile.nombreCompleto}
            </h1>
            {profile.verificado && (
              <span className="inline-flex items-center rounded-full bg-maps-brand/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.6px] text-maps-brand">
                Productor verificado
              </span>
            )}
          </div>

          <p className="mt-3 text-lg font-medium text-slate-600">
            {profile.tituloProfesional ?? 'Productor de Seguros'}
            {matriculaLabel && (
              <>
                <span className="mx-2 text-slate-300">•</span>
                <span>Matrícula {matriculaLabel}</span>
              </>
            )}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500 lg:justify-start">
            {profile.ciudad && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0 text-maps-brand" aria-hidden />
                {profile.ciudad}
              </span>
            )}
            {profile.idiomas.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Globe className="size-3.5 shrink-0 text-maps-brand" aria-hidden />
                {profile.idiomas.join(', ')}
              </span>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 pt-1 lg:justify-start">
            {profile.whatsapp && (
              <a
                href={`https://wa.me/${profile.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-[46px] items-center gap-2 rounded-2xl bg-[#22c55e] px-6 text-base font-bold text-white shadow-[0px_10px_15px_-3px_rgba(34,197,94,0.2),0px_4px_6px_-4px_rgba(34,197,94,0.2)] transition-opacity hover:opacity-90"
              >
                <MessageCircle className="size-5" aria-hidden />
                WhatsApp
              </a>
            )}
            {profile.email && (
              <a
                href={`mailto:${profile.email}`}
                className="inline-flex h-[46px] items-center gap-2 rounded-2xl bg-maps-brand px-6 text-base font-bold text-white shadow-[0px_10px_15px_-3px_rgba(61,109,226,0.2),0px_4px_6px_-4px_rgba(61,109,226,0.2)] transition-colors hover:bg-maps-brand-hover"
              >
                <Mail className="size-5" aria-hidden />
                Email
              </a>
            )}
            {isPublic && profile.telefono && (
              <a
                href={`tel:${profile.telefono.replace(/\s/g, '')}`}
                className="inline-flex h-[46px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 text-base font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Phone className="size-[18px]" aria-hidden />
                Llamar
              </a>
            )}
            {!isPublic && onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex h-[46px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 text-base font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Pencil className="size-[18px]" aria-hidden />
                Editar Perfil
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
