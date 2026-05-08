export type ProducerProfileContact = {
  email?: string;
  telefono?: string;
  /** Número para wa.me, solo dígitos (ej. 5491112345678) */
  whatsapp?: string;
};

export type PublicProducerProfile = {
  slug: string;
  nombre: string;
  rol: string;
  zona: string;
  bio: string;
  fotoUrl: string | null;
  contacto: ProducerProfileContact;
};
