import { useState } from 'react';
import { ContactFormModal } from './ContactFormModal';

export function CtaSection() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <section className="bg-gradient-to-br from-maps-brand to-maps-brand-hover py-16 px-4">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            ¿Listo para transformar tu gestión?
          </h2>
          <p className="mt-4 text-lg text-white/90">
            Contáctanos hoy y descubre cómo MAPS puede optimizar tus procesos.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-8 h-14 rounded-lg bg-white px-8 font-semibold text-maps-brand shadow-lg transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-maps-brand"
          >
            Contáctanos
          </button>
        </div>
      </section>

      <ContactFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
