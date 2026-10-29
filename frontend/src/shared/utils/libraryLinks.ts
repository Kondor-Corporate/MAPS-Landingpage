/**
 * Un ramo tiene material disponible si su link está configurado (no vacío),
 * sin importar si el Drive de destino existe o responde: no se valida remotamente.
 */
export function isResolvableLibraryUrl(url: string | null | undefined): boolean {
  return (url?.trim() ?? '') !== '';
}
