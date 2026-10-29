import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  autoComplete?: string;
};

/** Input de contraseña con toggle mostrar/ocultar. Reutilizado en alta, reset admin y cambio self-service (MAPS-016). */
export function PasswordField({ label, value, onChange, error, required, autoComplete }: Props) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wider text-maps-muted"
      >
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-maps-border bg-white px-3 py-2 pr-10 text-sm text-maps-heading transition focus:border-maps-brand focus:outline-none focus:ring-2 focus:ring-maps-brand/20"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-maps-muted transition hover:bg-maps-surface hover:text-maps-heading focus:outline-none focus:ring-2 focus:ring-maps-brand/40"
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </div>
  );
}
