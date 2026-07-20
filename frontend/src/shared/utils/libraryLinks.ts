/** URLs de seed/demo que no deben ofrecerse como enlaces funcionales en la UI pública. */
const PLACEHOLDER_LIBRARY_URL = /EXAMPLE|example\.com\/placeholder/i;

export function isResolvableLibraryUrl(url: string | null | undefined): boolean {
  const trimmed = url?.trim() ?? '';
  if (!trimmed) return false;
  return !PLACEHOLDER_LIBRARY_URL.test(trimmed);
}
