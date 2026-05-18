import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useRef, useState } from 'react';
import {
  contactFormSchema,
  type ContactFormData,
} from '../schemas/contactFormSchema';
import { contactService } from '@/shared/services/contactService';

export function useContactForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const form = useForm<ContactFormData>({
    resolver: yupResolver(contactFormSchema),
    mode: 'onTouched',
    defaultValues: {
      nombre: '',
      email: '',
      telefono: '',
      asunto: '',
      mensaje: '',
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    setIsLoading(true);
    setError(null);

    try {
      await contactService.submitForm(data);

      form.reset();
      setIsSubmitted(true);

      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        setIsSubmitted(false);
        timeoutRef.current = null;
      }, 5000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al enviar formulario';
      setError(errorMessage);
      console.error('Error al enviar formulario de contacto:', err);
    } finally {
      setIsLoading(false);
    }
  });

  return {
    form,
    handleSubmit,
    isSubmitted,
    error,
    isLoading,
    resetSubmitted: () => setIsSubmitted(false),
    clearError: () => setError(null),
  };
}
