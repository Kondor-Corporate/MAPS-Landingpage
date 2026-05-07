const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function todayTime(date: Date): string {
  return date.toLocaleTimeString('es-AR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function relativeTimeFromNow(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < HOUR) {
    const mins = Math.max(1, Math.round(diff / MINUTE));
    return `${mins} min`;
  }
  if (diff < DAY) {
    const sameDay = date.toDateString() === now.toDateString();
    if (sameDay) return `Hoy, ${todayTime(date)}`;
    const hours = Math.round(diff / HOUR);
    return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  }
  if (diff < 2 * DAY) return 'Ayer';
  if (diff < 7 * DAY) {
    const days = Math.round(diff / DAY);
    return `${days} días`;
  }
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}
