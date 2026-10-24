import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { PostulacionesDashboard } from '@/modules/admin/components/PostulacionesDashboard';
import type { Postulacion } from '@/modules/admin/types/postulacion';
import { useAuthStore } from '@/store/authStore';
import { API_BASE, server } from '@/tests/mocks/server';

const ANA: Postulacion = {
  id: 10,
  nombreCompleto: 'Ana Gómez',
  dni: '30111222',
  telefono: '2215550101',
  matricula: 'MAT-10',
  localidad: 'La Plata',
  situacion: 'PRODUCTOR_NUEVO',
  createdAt: '2026-10-01T12:00:00.000Z',
};

const LUIS: Postulacion = {
  id: 11,
  nombreCompleto: 'Luis Pérez',
  dni: '27888999',
  telefono: '2214447788',
  matricula: 'MAT-11',
  localidad: 'Berisso',
  situacion: 'TRABAJA_CON_OTRAS',
  createdAt: '2026-10-02T12:00:00.000Z',
};

function wrap(data: unknown) {
  return { data, message: 'OK', error: null };
}

let deletedIds: string[] = [];

function renderAs(rol: 'ADMIN' | 'SUPERADMIN') {
  useAuthStore.setState({
    user: { id: 1, usuario: rol === 'ADMIN' ? 'admin' : 'superadmin', rol, slug: null },
    accessToken: 'token',
    isAuthenticated: true,
    isInitialized: true,
  });
  render(<PostulacionesDashboard />);
}

async function openDeleteForAna(user: ReturnType<typeof userEvent.setup>) {
  const buttons = await screen.findAllByRole('button', {
    name: /eliminar postulación de ana gómez/i,
  });
  await user.click(buttons[0]);
}

describe('PostulacionesDashboard', () => {
  beforeEach(() => {
    deletedIds = [];
    server.use(
      http.get(`${API_BASE}/postulaciones`, () => HttpResponse.json(wrap([ANA, LUIS]))),
      http.delete(`${API_BASE}/postulaciones/:id`, ({ params }) => {
        deletedIds.push(String(params.id));
        return HttpResponse.json({ data: null, message: 'Postulación eliminada', error: null });
      }),
    );
  });

  it('ADMIN ve el listado y no ve la acción Eliminar', async () => {
    renderAs('ADMIN');

    expect((await screen.findAllByText('Ana Gómez')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Luis Pérez').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument();
  });

  it('SUPERADMIN ve Eliminar, y confirmar borra sólo esa fila', async () => {
    const user = userEvent.setup();
    renderAs('SUPERADMIN');

    await openDeleteForAna(user);

    expect(
      screen.getByRole('dialog', { name: 'Confirmar eliminación de postulación' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/esta acción no se puede deshacer/i)).toBeInTheDocument();
    expect(deletedIds).toEqual([]);

    await user.click(screen.getByRole('button', { name: /Eliminar definitivamente/ }));

    expect(await screen.findByRole('status')).toHaveTextContent('Postulación eliminada');
    expect(screen.queryByText('Ana Gómez')).not.toBeInTheDocument();
    expect(screen.getAllByText('Luis Pérez').length).toBeGreaterThan(0);
    expect(deletedIds).toEqual(['10']);
    expect(
      screen.queryByRole('dialog', { name: 'Confirmar eliminación de postulación' }),
    ).not.toBeInTheDocument();
  });

  it('cancelar la confirmación no llama DELETE', async () => {
    const user = userEvent.setup();
    renderAs('SUPERADMIN');

    await openDeleteForAna(user);
    await user.click(screen.getByRole('button', { name: /Cancelar/ }));

    expect(
      screen.queryByRole('dialog', { name: 'Confirmar eliminación de postulación' }),
    ).not.toBeInTheDocument();
    expect(deletedIds).toEqual([]);
    expect(screen.getAllByText('Ana Gómez').length).toBeGreaterThan(0);
  });

  it('si DELETE falla, la fila permanece y se muestra el error', async () => {
    server.use(
      http.delete(`${API_BASE}/postulaciones/:id`, () =>
        HttpResponse.json(
          { data: null, message: 'Acceso denegado', error: null },
          { status: 403 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderAs('SUPERADMIN');

    await openDeleteForAna(user);
    await user.click(screen.getByRole('button', { name: /Eliminar definitivamente/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Acceso denegado');
    expect(screen.getAllByText('Ana Gómez').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('dialog', { name: 'Confirmar eliminación de postulación' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Postulación eliminada')).not.toBeInTheDocument();
  });
});
