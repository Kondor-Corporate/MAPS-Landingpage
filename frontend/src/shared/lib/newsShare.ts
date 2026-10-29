export function getPublicNewsUrl(slug: string, origin = window.location.origin): string {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) return '';

  return `${origin.replace(/\/+$/, '')}/noticias/${encodeURIComponent(normalizedSlug)}`;
}

export function getNewsShareUrl(
  platform: 'whatsapp' | 'linkedin',
  title: string,
  articleUrl: string,
): string {
  if (!articleUrl) return '';

  if (platform === 'whatsapp') {
    return `https://wa.me/?text=${encodeURIComponent(`${title} ${articleUrl}`.trim())}`;
  }

  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`;
}
