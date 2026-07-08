import { describe, expect, it } from 'vitest';
import { updateProducerSchema } from '../src/validations/producer.schema.js';

describe('producer admin schema', () => {
  it('tolera opcionales null al editar ubicacion', () => {
    const parsed = updateProducerSchema.safeParse({
      direccion: 'Diagonal 75 172, La Plata, Buenos Aires, Argentina',
      ciudad: 'Diagonal 75 172, La Plata, Buenos Aires, Argentina',
      latitud: -34.91234,
      longitud: -57.98765,
      telefono: null,
      anosExperiencia: null,
      clientesActivos: null,
      redesSociales: null,
    });

    expect(parsed.success).toBe(true);
  });
});
