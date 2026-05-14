import type { AdminProducer } from '@/modules/admin/types/adminProducer';
import type { Producer } from '@/modules/admin/types/producer';

/**
 * Adapta respuesta API al modelo de fila UI admin.
 *
 * `ultimaActividad` no está persistido como tal en negocio: se usa `usuario.updatedAt`
 * como aproximación visible en tabla (último cambio en cuenta/usuario).
 *
 * `sucursal` no existe en backend: queda sin dato (`''`).
 */
export function mapAdminProducerToProducer(row: AdminProducer): Producer {
  const estado = row.usuario.activo ? 'ACTIVO' : 'INACTIVO';
  const dniDisplay = row.dni?.trim() ? row.dni : '—';

  return {
    id: String(row.id),
    nombre: row.nombre.trim(),
    apellido: row.apellido.trim(),
    avatarUrl: row.foto ?? undefined,
    estado,
    dni: dniDisplay,
    email: row.usuario.usuario,
    telefono: row.telefono?.trim() ?? '',
    sucursal: '',
    fechaAlta: row.createdAt,
    ultimaActividad: row.usuario.updatedAt,
  };
}

export function producerNumericId(row: Producer): number {
  return Number.parseInt(row.id, 10);
}
