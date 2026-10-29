/** Formateo de fechas absolutas (es-AR) compartido por tablas y modales admin. */
const SHORT_DATE = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const LONG_DATE = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Fecha corta para celdas de tabla: "15 jun 2026". */
export function formatDateShort(iso: string | null | undefined): string {
  const date = parseDate(iso);
  if (!date) return '';
  return SHORT_DATE.format(date);
}

/** Fecha completa para vistas de detalle: "15 junio 2026". */
export function formatDateLong(iso: string | null | undefined): string {
  const date = parseDate(iso);
  if (!date) return '';
  return LONG_DATE.format(date);
}
