/**
 * Formateo de fechas para Noticias (es-AR).
 * Cards usan fechas relativas; modales y tablas, formatos absolutos.
 */
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const SHORT_DATE = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const FULL_DATE = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const TABLE_DATE = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Fecha relativa para cards: "Hace 2 días" o "15 jun 2026". */
export function formatNewsCardDate(iso: string | null | undefined): string {
  const date = parseDate(iso);
  if (!date) return '';

  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < MINUTE) return 'Hace un momento';
  if (diff < HOUR) {
    const mins = Math.max(1, Math.round(diff / MINUTE));
    return `Hace ${mins} min`;
  }
  if (diff < DAY) {
    const sameDay = date.toDateString() === now.toDateString();
    if (sameDay) {
      const hours = Math.max(1, Math.round(diff / HOUR));
      return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    }
    return 'Ayer';
  }
  if (diff < 2 * DAY) return 'Ayer';
  if (diff < 7 * DAY) {
    const days = Math.max(1, Math.round(diff / DAY));
    return `Hace ${days} ${days === 1 ? 'día' : 'días'}`;
  }

  return SHORT_DATE.format(date);
}

/** Fecha completa para modales: "15 de junio de 2026". */
export function formatNewsFullDate(iso: string | null | undefined): string {
  const date = parseDate(iso);
  if (!date) return '';
  return FULL_DATE.format(date);
}

/** Fecha corta para tablas admin. */
export function formatNewsTableDate(iso: string | null | undefined): string {
  const date = parseDate(iso);
  if (!date) return '';
  return TABLE_DATE.format(date);
}
