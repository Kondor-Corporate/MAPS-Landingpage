export function getWhatsappLink(whatsapp: string, message?: string): string {
  const base = `https://wa.me/${whatsapp.replace(/\D/g, '')}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

function normalizeWhatsappNumber(value: string | undefined): string | null {
  const digits = value?.replace(/\D/g, '');
  return digits ? digits : null;
}

export const MAPS_WHATSAPP_NUMBER = normalizeWhatsappNumber(
  import.meta.env.VITE_MAPS_WHATSAPP_NUMBER,
);

export function findRedSocialUrl(
  redesSociales: { plataforma: string; url: string }[],
  plataforma: string,
): string | null {
  return redesSociales.find((r) => r.plataforma === plataforma)?.url ?? null;
}
