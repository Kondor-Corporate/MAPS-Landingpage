import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProducerTable } from '@/modules/admin/components/ProducerTable';
import type { Producer } from '@/modules/admin/types/producer';

/**
 * MAPS-016: no ejecuta todavía (sin runner de tests wireado en el frontend,
 * ver docs/TESTING.md). Escrito siguiendo el patrón de `LoginPage.test.tsx`.
 */

const PRODUCER: Producer = {
  id: '1',
  slug: 'juan-perez',
  nombre: 'Juan',
  apellido: 'Pérez',
  avatarUrl: null,
  estado: 'ACTIVO',
  dni: '30111222',
  email: 'juan.perez@example.com',
  telefono: null,
  sucursal: '',
  fechaAlta: '2026-01-01T00:00:00.000Z',
  ultimaActividad: '2026-01-01T00:00:00.000Z',
  ultimoLogin: null,
  matricula: null,
  verificado: false,
  tituloProfesional: null,
  anosExperiencia: null,
  clientesActivos: null,
  bio: null,
  ciudad: null,
  direccion: null,
  whatsapp: null,
  latitud: null,
  longitud: null,
  idiomas: [],
  especialidades: [],
  redesSociales: [],
  certificaciones: [],
};

function renderTable(producers: Producer[] = [PRODUCER]) {
  render(
    <ProducerTable
      producers={producers}
      onView={vi.fn()}
      onEdit={vi.fn()}
      onToggleEstado={vi.fn()}
      onResetPassword={vi.fn()}
    />,
  );
}

describe('ProducerTable', () => {
  it('muestra la columna "Usuario" y el email del productor, no "DNI"', () => {
    renderTable();

    expect(screen.getByRole('columnheader', { name: 'Usuario' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'DNI' })).not.toBeInTheDocument();
    expect(screen.getAllByText('juan.perez@example.com').length).toBeGreaterThan(0);
    expect(screen.queryByText('30111222')).not.toBeInTheDocument();
  });

  it('mantiene las columnas Nombre, Estado, Últ. act. cuenta y Acciones', () => {
    renderTable();

    expect(screen.getByRole('columnheader', { name: 'Nombre' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Estado' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Últ. act. cuenta' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Acciones' })).toBeInTheDocument();
  });
});
