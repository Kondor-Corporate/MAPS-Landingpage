import { Users2 } from 'lucide-react';

type Props = {
  name: string;
  totalProductores: number;
  description?: string;
};

export function ProducersGreeting({
  name,
  totalProductores,
  description = 'Bienvenido de nuevo al panel de gestión de productores.',
}: Props) {
  return (
    <header className="flex flex-col gap-3">
      <h1 className="text-3xl font-bold text-maps-heading">
        Hola, {name} <span aria-hidden>👋</span>
      </h1>
      <p className="text-sm text-maps-body">{description}</p>
      <div className="inline-flex items-center gap-1.5 text-xs text-maps-muted">
        <Users2 size={14} strokeWidth={1.75} />
        <span>
          Total de productores:{' '}
          <span className="font-semibold text-maps-heading">
            {totalProductores.toLocaleString('es-AR')}
          </span>
        </span>
      </div>
    </header>
  );
}
