import { useId, useEffect } from 'react';
import { Modal } from '@/shared/components/Modal';
import { useContactForm } from '../hooks/useContactForm';

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactFormModal({ isOpen, onClose }: ContactFormModalProps) {
  const formId = useId();
  const { form, handleSubmit, isSubmitted, resetSubmitted, error, isLoading, clearError } = useContactForm();

  const {
    register,
    formState: { errors },
    reset,
  } = form;

  useEffect(() => {
    if (isSubmitted) {
      const timeout = setTimeout(() => {
        onClose();
        resetSubmitted();
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [isSubmitted, onClose, resetSubmitted]);

  useEffect(() => {
    if (!isOpen) {
      reset();
      resetSubmitted();
      clearError();
    }
  }, [isOpen, reset, resetSubmitted, clearError]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Contáctanos">
      {isSubmitted ? (
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-emerald-600"
              aria-hidden
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-maps-heading">
              Mensaje enviado
            </h3>
            <p className="mt-1 text-sm text-maps-body">
              Te responderemos a la brevedad
            </p>
          </div>
        </div>
      ) : (
        <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {error}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label
              htmlFor={`${formId}-nombre`}
              className="text-sm font-medium text-maps-body"
            >
              Nombre
            </label>
            <input
              id={`${formId}-nombre`}
              type="text"
              autoComplete="name"
              placeholder="Tu nombre completo"
              {...register('nombre')}
              aria-invalid={Boolean(errors.nombre)}
              aria-describedby={
                errors.nombre ? `${formId}-nombre-err` : undefined
              }
              className="h-14 w-full rounded-lg border border-maps-border bg-white px-4 text-sm text-maps-heading outline-none ring-maps-brand transition placeholder:text-maps-muted focus:border-maps-brand focus:ring-2 focus:ring-maps-brand/25"
            />
            {errors.nombre ? (
              <p
                id={`${formId}-nombre-err`}
                className="text-sm text-red-600"
                role="alert"
              >
                {errors.nombre.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor={`${formId}-email`}
              className="text-sm font-medium text-maps-body"
            >
              Correo electrónico
            </label>
            <input
              id={`${formId}-email`}
              type="email"
              autoComplete="email"
              placeholder="nombre@ejemplo.com"
              {...register('email')}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={
                errors.email ? `${formId}-email-err` : undefined
              }
              className="h-14 w-full rounded-lg border border-maps-border bg-white px-4 text-sm text-maps-heading outline-none ring-maps-brand transition placeholder:text-maps-muted focus:border-maps-brand focus:ring-2 focus:ring-maps-brand/25"
            />
            {errors.email ? (
              <p
                id={`${formId}-email-err`}
                className="text-sm text-red-600"
                role="alert"
              >
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor={`${formId}-telefono`}
              className="text-sm font-medium text-maps-body"
            >
              Teléfono (opcional)
            </label>
            <input
              id={`${formId}-telefono`}
              type="tel"
              autoComplete="tel"
              placeholder="+54 11 1234-5678"
              {...register('telefono')}
              aria-invalid={Boolean(errors.telefono)}
              aria-describedby={
                errors.telefono ? `${formId}-telefono-err` : undefined
              }
              className="h-14 w-full rounded-lg border border-maps-border bg-white px-4 text-sm text-maps-heading outline-none ring-maps-brand transition placeholder:text-maps-muted focus:border-maps-brand focus:ring-2 focus:ring-maps-brand/25"
            />
            {errors.telefono ? (
              <p
                id={`${formId}-telefono-err`}
                className="text-sm text-red-600"
                role="alert"
              >
                {errors.telefono.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor={`${formId}-asunto`}
              className="text-sm font-medium text-maps-body"
            >
              Asunto
            </label>
            <input
              id={`${formId}-asunto`}
              type="text"
              placeholder="Motivo de tu consulta"
              {...register('asunto')}
              aria-invalid={Boolean(errors.asunto)}
              aria-describedby={
                errors.asunto ? `${formId}-asunto-err` : undefined
              }
              className="h-14 w-full rounded-lg border border-maps-border bg-white px-4 text-sm text-maps-heading outline-none ring-maps-brand transition placeholder:text-maps-muted focus:border-maps-brand focus:ring-2 focus:ring-maps-brand/25"
            />
            {errors.asunto ? (
              <p
                id={`${formId}-asunto-err`}
                className="text-sm text-red-600"
                role="alert"
              >
                {errors.asunto.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor={`${formId}-mensaje`}
              className="text-sm font-medium text-maps-body"
            >
              Mensaje
            </label>
            <textarea
              id={`${formId}-mensaje`}
              rows={4}
              placeholder="Describe tu consulta o solicitud..."
              {...register('mensaje')}
              aria-invalid={Boolean(errors.mensaje)}
              aria-describedby={
                errors.mensaje ? `${formId}-mensaje-err` : undefined
              }
              className="w-full resize-none rounded-lg border border-maps-border bg-white px-4 py-3 text-sm text-maps-heading outline-none ring-maps-brand transition placeholder:text-maps-muted focus:border-maps-brand focus:ring-2 focus:ring-maps-brand/25"
            />
            {errors.mensaje ? (
              <p
                id={`${formId}-mensaje-err`}
                className="text-sm text-red-600"
                role="alert"
              >
                {errors.mensaje.message}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="h-14 w-full rounded-lg bg-maps-brand font-semibold text-white shadow-md shadow-maps-brand/25 transition hover:bg-maps-brand-hover focus:outline-none focus:ring-2 focus:ring-maps-brand focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? 'Enviando...' : 'Enviar mensaje'}
          </button>
        </form>
      )}
    </Modal>
  );
}
