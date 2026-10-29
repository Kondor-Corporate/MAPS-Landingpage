import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProducersDashboard } from '@/modules/admin/components/ProducersDashboard';
import { NewsManagementDashboard } from '@/modules/admin/components/NewsManagementDashboard';
import { useAuthStore } from '@/store/authStore';
import type { Producer } from '@/modules/admin/types/producer';
import type { News } from '@/modules/admin/types/news';

const mocks = vi.hoisted(() => ({
  useAdminProducers: vi.fn(),
  useProducerFilters: vi.fn(),
  useAdminNews: vi.fn(),
  useNewsFilters: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

vi.mock('@/modules/admin/hooks/useAdminProducers', () => ({
  useAdminProducers: mocks.useAdminProducers,
}));
vi.mock('@/modules/admin/hooks/useProducerFilters', () => ({
  useProducerFilters: mocks.useProducerFilters,
}));
vi.mock('@/modules/admin/hooks/useAdminNews', () => ({
  useAdminNews: mocks.useAdminNews,
}));
vi.mock('@/modules/admin/hooks/useNewsFilters', () => ({
  useNewsFilters: mocks.useNewsFilters,
}));
vi.mock('@/shared/components/MapsFeedbackToast', () => ({
  MapsFeedbackToastHost: () => null,
  useMapsFeedback: () => ({
    toast: null,
    dismiss: vi.fn(),
    showSuccess: mocks.showSuccess,
    showError: mocks.showError,
  }),
}));
vi.mock('@/modules/admin/components/ProducerTable', () => ({
  ProducerTable: ({ producers, onToggleEstado }: {
    producers: Producer[];
    onToggleEstado: (producer: Producer) => void;
  }) => (
    <button type="button" onClick={() => onToggleEstado(producers[0])}>
      Abrir cambio estado
    </button>
  ),
}));
vi.mock('@/modules/admin/components/ProducerFilterModal', () => ({
  ProducerFilterModal: () => null,
}));
vi.mock('@/modules/admin/components/NewsForm', () => ({
  EMPTY_FORM: {
    titulo: '',
    categoria: '',
    audiencia: 'PRODUCTORES',
    cuerpo: '',
    imagenPortada: null,
    estado: 'BORRADOR',
    ultimaModificacion: '2026-01-01T00:00:00.000Z',
  },
  NewsForm: () => null,
}));
vi.mock('@/modules/admin/components/RecentNewsTable', () => ({
  RecentNewsTable: ({
    news,
    onDelete,
    onUnpublish,
  }: {
    news: News[];
    onDelete: (item: News) => void;
    onUnpublish?: (item: News) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onUnpublish?.(news[0])}>
        Despublicar tabla
      </button>
      <button type="button" onClick={() => onDelete(news[0])}>
        Abrir eliminar
      </button>
    </div>
  ),
}));

const PRODUCER: Producer = {
  id: '1',
  slug: 'productor-prueba',
  nombre: 'Productor',
  apellido: 'Prueba',
  avatarUrl: null,
  estado: 'ACTIVO',
  dni: null,
  email: 'productor@example.com',
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

const NEWS: News = {
  id: '1',
  titulo: 'Noticia de prueba',
  categoria: 'NOVEDAD',
  audiencia: 'PRODUCTORES',
  estado: 'PUBLICADO',
  cuerpo: 'Contenido suficientemente largo para la noticia de prueba.',
  imagenPortada: null,
  galeria: [],
  fechaPublicacion: '2026-01-01T00:00:00.000Z',
  ultimaModificacion: '2026-01-01T00:00:00.000Z',
};

function pendingPromise() {
  return new Promise<void>(() => undefined);
}

describe('locks síncronos de acciones admin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: 1, usuario: 'admin', rol: 'ADMIN', slug: null },
      accessToken: 'token',
      isAuthenticated: true,
      isInitialized: true,
    });
    mocks.useProducerFilters.mockReturnValue({
      search: '',
      setSearch: vi.fn(),
      filters: {},
      setFilter: vi.fn(),
      reset: vi.fn(),
      apply: (rows: Producer[]) => rows,
      activeCount: 0,
    });
    mocks.useNewsFilters.mockReturnValue({
      filters: {},
      setFilter: vi.fn(),
      reset: vi.fn(),
      apply: (rows: News[]) => rows,
      activeCount: 0,
    });
  });

  it('dos confirmaciones inmediatas de desactivación producen una request', () => {
    const deactivate = vi.fn().mockImplementation(pendingPromise);
    mocks.useAdminProducers.mockReturnValue({
      data: [PRODUCER],
      loading: false,
      error: null,
      refetch: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      uploadCertificacion: vi.fn(),
      deleteCertificacion: vi.fn(),
      activate: vi.fn(),
      deactivate,
      resetPassword: vi.fn(),
    });

    render(<ProducersDashboard scope="active" />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir cambio estado' }));
    const confirm = screen.getByRole('button', { name: /Desactivar/ });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(deactivate).toHaveBeenCalledOnce();
  });

  it('dos clicks inmediatos al despublicar desde tabla producen una request', () => {
    const unpublishNews = vi.fn().mockImplementation(pendingPromise);
    mocks.useAdminNews.mockReturnValue({
      news: [NEWS],
      loading: false,
      error: null,
      refetch: vi.fn(),
      createNews: vi.fn(),
      updateNews: vi.fn(),
      deleteNews: vi.fn(),
      unpublishNews,
    });

    render(<NewsManagementDashboard />);
    const unpublish = screen.getByRole('button', { name: 'Despublicar tabla' });
    fireEvent.click(unpublish);
    fireEvent.click(unpublish);

    expect(unpublishNews).toHaveBeenCalledOnce();
  });

  it('dos confirmaciones inmediatas de eliminación producen una request', () => {
    const deleteNews = vi.fn().mockImplementation(pendingPromise);
    mocks.useAdminNews.mockReturnValue({
      news: [NEWS],
      loading: false,
      error: null,
      refetch: vi.fn(),
      createNews: vi.fn(),
      updateNews: vi.fn(),
      deleteNews,
      unpublishNews: vi.fn(),
    });

    render(<NewsManagementDashboard />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir eliminar' }));
    const confirm = screen.getByRole('button', { name: /Eliminar noticia/ });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(deleteNews).toHaveBeenCalledOnce();
  });
});
