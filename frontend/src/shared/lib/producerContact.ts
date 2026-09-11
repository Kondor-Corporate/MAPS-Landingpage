export function getWhatsappLink(whatsapp: string): string {
  return `https://wa.me/${whatsapp.replace(/\D/g, '')}`;
}

export function findRedSocialUrl(
  redesSociales: { plataforma: string; url: string }[],
  plataforma: string,
): string | null {
  return redesSociales.find((r) => r.plataforma === plataforma)?.url ?? null;
}
