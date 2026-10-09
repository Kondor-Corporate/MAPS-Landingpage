import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import axios from 'axios';
import { CheckCircle2, UserPlus } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { createPostulacion } from '@/modules/public-web/services/postulaciones.service';
import type {
  CreatePostulacionPayload,
  PostulacionSituacion,
} from '@/modules/public-web/types/postulacion';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type FormState = {
  nombreCompleto: string;
  dni: string;
  telefono: string;
  matricula: string;
  localidad: string;
  situacion: PostulacionSituacion | '';
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  nombreCompleto: '',
  dni: '',
  telefono: '',
  matricula: '',
  localidad: '',
  situacion: '',
};

const SITUACION_OPTIONS: { value: PostulacionSituacion; label: string }[] = [
  { value: 'PRODUCTOR_NUEVO', label: 'Soy productor nuevo' },
  { value: 'TRABAJA_CON_OTRAS', label: 'Ya trabajo con otras compañías' },
];

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};

  const nombre = form.nombreCompleto.trim();
  if (!nombre) errors.nombreCompleto = 'Ingresá tu nombre completo';
  else if (nombre.length < 3) errors.nombreCompleto = 'Mínimo 3 caracteres';
  else if (nombre.length > 120) errors.nombreCompleto = 'Máximo 120 caracteres';

  const dni = form.dni.replace(/[.\s]/g, '');
  if (!dni) errors.dni = 'Ingresá tu DNI';
  else if (!/^\d{7,9}$/.test(dni)) errors.dni = 'DNI inválido (7 a 9 dígitos)';

  const telefono = form.telefono.trim();
  if (!telefono) errors.telefono = 'Ingresá tu teléfono';
  else if (telefono.length < 6) errors.telefono = 'Teléfono inválido';
  else if (telefono.length > 30) errors.telefono = 'Máximo 30 caracteres';
  else if (!/^[\d\s()+-]+$/.test(telefono)) errors.telefono = 'Teléfono inválido';

  const matricula = form.matricula.trim();
  if (!matricula) errors.matricula = 'Ingresá tu número de matrícula';
  else if (matricula.length > 40) errors.matricula = 'Máximo 40 caracteres';

  const localidad = form.localidad.trim();
  if (!localidad) errors.localidad = 'Ingresá tu localidad';
  else if (localidad.length < 2) errors.localidad = 'Mínimo 2 caracteres';
  else if (localidad.length > 120) errors.localidad = 'Máximo 120 caracteres';

  if (!form.situacion) errors.situacion = 'Seleccioná una opción';

  return errors;
}

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === 'string' && msg.trim() && err.response?.status !== 500) {
      return msg.trim();
    }
  }
  return 'No pudimos enviar tu postulación. Intentá nuevamente en unos minutos.';
}

const inputClass =
  'w-full rounded-lg border border-maps-border bg-white px-3 py-2.5 text-sm text-maps-heading transition focus:border-maps-brand focus:outline-none focus:ring-2 focus:ring-maps-brand/20';
const labelClass = 'text-xs font-semibold uppercase tracking-wider text-maps-muted';

export function PostulacionModal({ isOpen, onClose }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const submitLockRef = useRef(false);
  const fieldId = useId();

  useEffect(() => {
    if (!isOpen) return;
    setForm(EMPTY_FORM);
    setErrors({});
    setSubmitError(null);
    setSuccess(false);
    setSubmitting(false);
    submitLockRef.current = false;
  }, [isOpen]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || submitLockRef.current) return;

    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload: CreatePostulacionPayload = {
      nombreCompleto: form.nombreCompleto.trim(),
      dni: form.dni.replace(/[.\s]/g, ''),
      telefono: form.telefono.trim(),
      matricula: form.matricula.trim(),
      localidad: form.localidad.trim(),
      situacion: form.situacion as PostulacionSituacion,
    };

    submitLockRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createPostulacion(payload);
      setSuccess(true);
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md" ariaLabel="Postularse como productor">
      {success ? (
        <div className="flex flex-col items-center gap-4 p-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-maps-brand-soft text-maps-brand">
            <CheckCircle2 size={30} strokeWidth={1.75} aria-hidden />
          </span>
          <h2 className="text-xl font-bold text-maps-heading">¡Postulación enviada!</h2>
          <p className="max-w-sm text-sm text-maps-body">
            Recibimos tus datos. El equipo de MAPS revisará tu postulación y se pondrá en contacto
            con vos.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 min-h-11 rounded-lg bg-maps-brand px-6 py-2 text-sm font-semibold text-white shadow-cta transition hover:bg-maps-brand-hover"
          >
            Cerrar
          </button>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col" noValidate>
          <div className="flex flex-col gap-5 p-6">
            <header className="flex items-center gap-3 pr-10">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-maps-brand-soft text-maps-brand">
                <UserPlus size={20} strokeWidth={1.75} aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-bold text-maps-heading">Postularse como productor</h2>
                <p className="text-sm text-maps-muted">Completá tus datos y nos contactamos.</p>
              </div>
            </header>

            {submitError ? (
              <p
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
              >
                {submitError}
              </p>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${fieldId}-nombre`} className={labelClass}>
                Nombre completo<span className="ml-0.5 text-rose-500">*</span>
              </label>
              <input
                id={`${fieldId}-nombre`}
                type="text"
                autoComplete="name"
                value={form.nombreCompleto}
                onChange={(e) => updateField('nombreCompleto', e.target.value)}
                aria-invalid={Boolean(errors.nombreCompleto)}
                className={inputClass}
              />
              {errors.nombreCompleto ? (
                <span className="text-xs text-rose-600">{errors.nombreCompleto}</span>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${fieldId}-dni`} className={labelClass}>
                DNI<span className="ml-0.5 text-rose-500">*</span>
              </label>
              <input
                id={`${fieldId}-dni`}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={form.dni}
                onChange={(e) => updateField('dni', e.target.value)}
                aria-invalid={Boolean(errors.dni)}
                className={inputClass}
              />
              {errors.dni ? <span className="text-xs text-rose-600">{errors.dni}</span> : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${fieldId}-telefono`} className={labelClass}>
                Teléfono<span className="ml-0.5 text-rose-500">*</span>
              </label>
              <input
                id={`${fieldId}-telefono`}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={form.telefono}
                onChange={(e) => updateField('telefono', e.target.value)}
                aria-invalid={Boolean(errors.telefono)}
                className={inputClass}
              />
              {errors.telefono ? (
                <span className="text-xs text-rose-600">{errors.telefono}</span>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${fieldId}-matricula`} className={labelClass}>
                Número de matrícula<span className="ml-0.5 text-rose-500">*</span>
              </label>
              <input
                id={`${fieldId}-matricula`}
                type="text"
                autoComplete="off"
                value={form.matricula}
                onChange={(e) => updateField('matricula', e.target.value)}
                aria-invalid={Boolean(errors.matricula)}
                className={inputClass}
              />
              {errors.matricula ? (
                <span className="text-xs text-rose-600">{errors.matricula}</span>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${fieldId}-localidad`} className={labelClass}>
                Localidad<span className="ml-0.5 text-rose-500">*</span>
              </label>
              <input
                id={`${fieldId}-localidad`}
                type="text"
                autoComplete="address-level2"
                value={form.localidad}
                onChange={(e) => updateField('localidad', e.target.value)}
                aria-invalid={Boolean(errors.localidad)}
                className={inputClass}
              />
              {errors.localidad ? (
                <span className="text-xs text-rose-600">{errors.localidad}</span>
              ) : null}
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className={labelClass}>
                Situación actual<span className="ml-0.5 text-rose-500">*</span>
              </legend>
              <div className="flex flex-col gap-2">
                {SITUACION_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={[
                      'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition',
                      form.situacion === option.value
                        ? 'border-maps-brand bg-maps-brand-soft text-maps-heading'
                        : 'border-maps-border bg-white text-maps-body hover:bg-maps-surface',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name={`${fieldId}-situacion`}
                      value={option.value}
                      checked={form.situacion === option.value}
                      onChange={() => updateField('situacion', option.value)}
                      className="h-4 w-4 accent-maps-brand"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
              {errors.situacion ? (
                <span className="text-xs text-rose-600">{errors.situacion}</span>
              ) : null}
            </fieldset>
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-maps-border bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="min-h-11 w-full rounded-lg border border-maps-border bg-white px-4 py-2 text-sm font-medium text-maps-heading transition hover:bg-maps-surface disabled:opacity-50 sm:w-auto"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-11 w-full rounded-lg bg-maps-brand px-4 py-2 text-sm font-semibold text-white shadow-cta transition hover:bg-maps-brand-hover disabled:opacity-60 sm:w-auto"
            >
              {submitting ? 'Enviando…' : 'Enviar postulación'}
            </button>
          </footer>
        </form>
      )}
    </Modal>
  );
}
