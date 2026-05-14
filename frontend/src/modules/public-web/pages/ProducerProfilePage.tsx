import { Link, useParams } from 'react-router-dom';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { getProducerProfileBySlug } from '@/modules/public-web/data/producerProfilesMock';
import type { PublicProducerProfile } from '@/modules/public-web/types/producerProfile';
import { getInitials } from '@/shared/utils/initials';

function contactoTieneDatos(profile: PublicProducerProfile): boolean {
  const { contacto } = profile;
  return Boolean(contacto.email ?? contacto.telefono ?? contacto.whatsapp);
}

export function ProducerProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const profile = slug ? getProducerProfileBySlug(slug) : undefined;

  if (!slug || !profile) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-maps-heading">Perfil no encontrado</h1>
        <p className="text-maps-body">
          No hay un asesor registrado con esta dirección. Verificá el enlace o volvé al inicio.
        </p>
        <Link
          to="/"
          className="inline-flex h-12 items-center justify-center rounded-lg bg-maps-brand px-6 text-sm font-bold text-white transition-colors hover:bg-maps-brand-hover"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  const initials = getInitials(profile.nombre);

  return (
    <article className="bg-maps-surface px-4 py-8 sm:px-6 sm:py-12 lg:px-10 lg:py-16">
      <div className="mx-auto max-w-[900px]">
        <nav className="mb-8" aria-label="Ruta">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-maps-muted">
            <li>
              <Link to="/" className="font-medium text-maps-brand hover:underline">
                Inicio
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="font-medium text-maps-heading">Perfil</li>
            <li aria-hidden>/</li>
            <li className="truncate text-maps-heading">{profile.nombre}</li>
          </ol>
        </nav>

        <div className="overflow-hidden rounded-2xl bg-white shadow-card">
          <div className="flex flex-col gap-8 p-6 sm:p-8 lg:flex-row lg:items-start lg:gap-10 lg:p-10">
            <div className="flex shrink-0 justify-center lg:justify-start">
              {profile.fotoUrl ? (
                <div className="h-36 w-36 overflow-hidden rounded-full border-4 border-maps-brand-soft bg-maps-surface sm:h-44 sm:w-44">
                  <img
                    src={profile.fotoUrl}
                    alt={profile.nombre}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div
                  className="flex h-36 w-36 items-center justify-center rounded-full border-4 border-maps-brand-soft bg-maps-brand-soft text-3xl font-bold text-maps-brand sm:h-44 sm:w-44 sm:text-4xl"
                  aria-hidden
                >
                  {initials}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 text-center lg:text-left">
              <h1 className="text-2xl font-bold tracking-tight text-maps-heading sm:text-3xl lg:text-[32px] lg:leading-tight">
                {profile.nombre}
              </h1>
              <p className="mt-2 text-base font-medium text-maps-brand sm:text-lg">{profile.rol}</p>
              <p className="mt-4 inline-flex items-center justify-center gap-2 text-maps-muted lg:justify-start">
                <MapPin className="h-4 w-4 shrink-0 text-maps-brand" aria-hidden />
                <span>{profile.zona}</span>
              </p>
              <p className="mt-6 text-left text-base leading-relaxed text-maps-body">{profile.bio}</p>
            </div>
          </div>

          {contactoTieneDatos(profile) && (
            <div className="border-t border-maps-border bg-maps-surface/80 px-6 py-6 sm:px-8 sm:py-8 lg:px-10">
              <h2 className="text-lg font-bold text-maps-heading">Contacto</h2>
              <ul className="mt-4 flex flex-col gap-3 sm:gap-4">
                {profile.contacto.email && (
                  <li>
                    <a
                      href={`mailto:${profile.contacto.email}`}
                      className="inline-flex items-center gap-3 break-all text-maps-body transition-colors hover:text-maps-brand"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-maps-border">
                        <Mail className="h-5 w-5 text-maps-brand" aria-hidden />
                      </span>
                      <span className="min-w-0">{profile.contacto.email}</span>
                    </a>
                  </li>
                )}
                {profile.contacto.telefono && (
                  <li>
                    <a
                      href={`tel:+${profile.contacto.telefono.replace(/\D/g, '')}`}
                      className="inline-flex items-center gap-3 text-maps-body transition-colors hover:text-maps-brand"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-maps-border">
                        <Phone className="h-5 w-5 text-maps-brand" aria-hidden />
                      </span>
                      <span>{profile.contacto.telefono}</span>
                    </a>
                  </li>
                )}
                {profile.contacto.whatsapp && (
                  <li>
                    <a
                      href={`https://wa.me/${profile.contacto.whatsapp}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-3 text-maps-body transition-colors hover:text-maps-brand"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-maps-border">
                        <MessageCircle className="h-5 w-5 text-maps-brand" aria-hidden />
                      </span>
                      <span>WhatsApp</span>
                    </a>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-sm text-maps-muted lg:text-left">
          <Link to="/#contacto" className="font-medium text-maps-brand hover:underline">
            Consultá con MAPS Asesores
          </Link>
          {' · '}
          <Link to="/" className="font-medium text-maps-brand hover:underline">
            Volver al sitio público
          </Link>
        </p>
      </div>
    </article>
  );
}
