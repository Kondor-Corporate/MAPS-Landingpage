import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NewsManagementDashboard } from '@/modules/admin/components/NewsManagementDashboard';
import type { ApiNews } from '@/modules/admin/lib/mapNews';
import { useAuthStore } from '@/store/authStore';
import { API_BASE, server } from '@/tests/mocks/server';

const LIST_NEWS_A: ApiNews = {
  id: 7,
  titulo: 'Circular con galería',
  slug: 'circular-con-galeria',
  descripcion: null,
  contenido: 'Cuerpo suficientemente largo para la noticia de prueba.',
  categoria: 'CIRCULAR',
  imagenUrl: null,
  galeria: [],
  publicada: true,
  publicadaEn: '2026-07-18T12:00:00.000Z',
  visibilidad: 'PUBLICA',
  autorId: 1,
  createdAt: '2026-07-01T10:00:00.000Z',
  updatedAt: '2026-07-18T12:00:00.000Z',
};

const LIST_NEWS_B: ApiNews = {
  ...LIST_NEWS_A,
  id: 8,
  titulo: 'Novedad posterior',
  slug: 'novedad-posterior',
};

const DETAIL_A: ApiNews = {
  ...LIST_NEWS_A,
  galeria: [
    { id: 10, url: 'https://cdn.example.com/galeria/a.jpg', orden: 0 },
    { id: 11, url: 'https://cdn.example.com/galeria/b.jpg', orden: 1 },
  ],
};

const DETAIL_B: ApiNews = {
  ...LIST_NEWS_B,
  galeria: [{ id: 20, url: 'https://cdn.example.com/galeria/b-only.jpg', orden: 0 }],
};

const originalScrollIntoView = Element.prototype.scrollIntoView;

function wrap(data: unknown) {
  return { data, message: 'OK', error: null };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function mockNewsList(rows: ApiNews[] = [LIST_NEWS_A]) {
  server.use(http.get(`${API_BASE}/news`, () => HttpResponse.json(wrap(rows))));
}

function mockNewsDetail(respond: (id: string) => Response | Promise<Response>) {
  const requestedIds: string[] = [];
  server.use(
    http.get(`${API_BASE}/news/:id`, ({ params }) => {
      const id = String(params.id);
      requestedIds.push(id);
      return respond(id);
    }),
  );
  return requestedIds;
}

async function clickEdit(user: ReturnType<typeof userEvent.setup>, titulo: string) {
  const buttons = await screen.findAllByRole('button', { name: `Editar "${titulo}"` });
  await user.click(buttons[0]);
}

describe('hidratación de galería al editar noticia admin', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 1, usuario: 'admin', rol: 'ADMIN', slug: null },
      accessToken: 'token',
      isAuthenticated: true,
      isInitialized: true,
    });
    Element.prototype.scrollIntoView = vi.fn();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    mockNewsList();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Element.prototype.scrollIntoView = originalScrollIntoView;
  });

  it('pide el detalle del id clickeado y muestra la galería persistida', async () => {
    const requestedIds = mockNewsDetail(() => HttpResponse.json(wrap(DETAIL_A)));
    const user = userEvent.setup();
    render(<NewsManagementDashboard />);

    await clickEdit(user, 'Circular con galería');

    expect(requestedIds).toEqual(['7']);
    expect(await screen.findByRole('button', { name: 'Cancelar edición' })).toBeInTheDocument();

    const first = await screen.findByAltText('Imagen de galería, posición 1');
    const second = screen.getByAltText('Imagen de galería, posición 2');
    expect(first).toHaveAttribute('src', 'https://cdn.example.com/galeria/a.jpg');
    expect(second).toHaveAttribute('src', 'https://cdn.example.com/galeria/b.jpg');
  });

  it('si el detalle falla no entra a edición vacía y muestra feedback', async () => {
    const requestedIds = mockNewsDetail(() =>
      HttpResponse.json(
        { data: null, message: 'No se pudo leer la noticia', error: 'detalle' },
        { status: 500 },
      ),
    );
    const user = userEvent.setup();
    render(<NewsManagementDashboard />);

    await clickEdit(user, 'Circular con galería');

    expect(requestedIds).toEqual(['7']);
    expect(await screen.findByText('No se pudo leer la noticia')).toBeInTheDocument();
    expect(screen.getByText('No se pudo cargar la noticia para editar')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar edición' })).not.toBeInTheDocument();
    expect(screen.queryByAltText('Imagen de galería, posición 1')).not.toBeInTheDocument();
  });

  it('si B responde antes que A, el formulario se queda con B', async () => {
    mockNewsList([LIST_NEWS_A, LIST_NEWS_B]);
    const pendingA = deferred<Response>();
    const requestedIds = mockNewsDetail((id) => {
      if (id === '7') return pendingA.promise;
      return HttpResponse.json(wrap(DETAIL_B));
    });
    const user = userEvent.setup();
    render(<NewsManagementDashboard />);

    await clickEdit(user, 'Circular con galería');
    await waitFor(() => expect(requestedIds).toEqual(['7']));

    await clickEdit(user, 'Novedad posterior');
    expect(await screen.findByAltText('Imagen de galería, posición 1')).toHaveAttribute(
      'src',
      'https://cdn.example.com/galeria/b-only.jpg',
    );
    expect(screen.getByDisplayValue('Novedad posterior')).toBeInTheDocument();
    expect(requestedIds).toEqual(['7', '8']);

    pendingA.resolve(HttpResponse.json(wrap(DETAIL_A)));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Novedad posterior')).toBeInTheDocument();
      expect(screen.getByAltText('Imagen de galería, posición 1')).toHaveAttribute(
        'src',
        'https://cdn.example.com/galeria/b-only.jpg',
      );
    });
    expect(screen.queryByDisplayValue('Circular con galería')).not.toBeInTheDocument();
    expect(screen.queryByAltText('Imagen de galería, posición 2')).not.toBeInTheDocument();
  });
});
