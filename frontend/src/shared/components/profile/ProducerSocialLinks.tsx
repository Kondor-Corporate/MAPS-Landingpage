import { FaInstagram, FaLinkedin, FaWhatsapp } from 'react-icons/fa';
import { findRedSocialUrl, getWhatsappLink } from '@/shared/lib/producerContact';
import type { ProducerRedSocial } from '@/shared/types/producerProfile';

type Props = {
  whatsapp: string | null;
  redesSociales: ProducerRedSocial[];
  variant?: 'profile' | 'map-card';
  className?: string;
};

const ITEM_BASE =
  'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90';
const ICON_CLASS = 'h-[18px] w-[18px] shrink-0';

const INSTAGRAM_GRADIENT = 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]';
const LINKEDIN_BLUE = 'bg-[#0A66C2]';

export function ProducerSocialLinks({
  whatsapp,
  redesSociales,
  variant = 'profile',
  className,
}: Props) {
  const waLink = whatsapp ? getWhatsappLink(whatsapp) : null;
  const instagram = findRedSocialUrl(redesSociales, 'instagram');
  const linkedin = findRedSocialUrl(redesSociales, 'linkedin');

  if (!waLink && !instagram && !linkedin) return null;

  const isProfile = variant === 'profile';
  const wrapperClass = isProfile
    ? 'flex flex-wrap items-center gap-3'
    : 'flex shrink-0 flex-nowrap items-center gap-2';
  // En perfil: icono chico en mobile/tablet, icono + nombre de la red a partir de lg.
  // En la card del mapa siempre queda icono-only, sin importar el ancho de pantalla.
  const itemClass = isProfile ? `${ITEM_BASE} w-11 lg:w-auto lg:px-4` : `${ITEM_BASE} w-11`;

  return (
    <div className={`${wrapperClass} ${className ?? ''}`}>
      {waLink && (
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp"
          className={`${itemClass} bg-maps-whatsapp`}
        >
          <FaWhatsapp className={ICON_CLASS} aria-hidden />
          {isProfile && <span className="hidden lg:inline">WhatsApp</span>}
        </a>
      )}
      {instagram && (
        <a
          href={instagram}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          className={`${itemClass} ${INSTAGRAM_GRADIENT}`}
        >
          <FaInstagram className={ICON_CLASS} aria-hidden />
          {isProfile && <span className="hidden lg:inline">Instagram</span>}
        </a>
      )}
      {linkedin && (
        <a
          href={linkedin}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn"
          className={`${itemClass} ${LINKEDIN_BLUE}`}
        >
          <FaLinkedin className={ICON_CLASS} aria-hidden />
          {isProfile && <span className="hidden lg:inline">LinkedIn</span>}
        </a>
      )}
    </div>
  );
}
