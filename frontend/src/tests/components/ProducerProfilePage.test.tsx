import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ProducerProfilePage } from '@/modules/public-web/pages/ProducerProfilePage';
import { usePublicProducerProfile } from '@/modules/public-web/hooks/usePublicProducerProfile';
import type { ProfileViewModel } from '@/shared/types/producerProfile';

vi.mock('@/modules/public-web/hooks/usePublicProducerProfile');
vi.mock('@/shared/components/profile/ProfileHeaderCard', () => ({
  ProfileHeaderCard: () => <div>Encabezado del perfil</div>,
}));
vi.mock('@/shared/components/profile/ProfileInfluenceMap', () => ({
  ProfileInfluenceMap: () => <div>Mapa de influencia</div>,
}));
vi.mock('@/shared/components/profile/ProfileSpecialtiesGrid', () => ({
  ProfileSpecialtiesGrid: () => null,
}));
vi.mock('@/shared/components/profile/ProfileStatsCards', () => ({
  ProfileStatsCards: () => null,
}));
vi.mock('@/shared/components/profile/ProfileTrajectorySection', () => ({
  ProfileTrajectorySection: () => null,
}));
vi.mock('@/shared/components/profile/ProfileCertificationsList', () => ({
  ProfileCertificationsList: () => null,
}));

const PROFILE: ProfileViewModel = {
  slug: 'productor-demo',
  nombre: 'Productor',
  apellido: 'Demo',
  nombreCompleto: 'Productor Demo',
  tituloProfesional: null,
  matricula: null,
  verificado: true,
  bio: null,
  ciudad: null,
  direccion: null,
  idiomas: [],
  foto: null,
  telefono: null,
  whatsapp: null,
  anosExperiencia: null,
  clientesActivos: null,
  latitud: null,
  longitud: null,
  especialidades: [],
  redesSociales: [],
  certificaciones: [],
};

describe('ProducerProfilePage', () => {
  it('ofrece una vuelta explícita y estable al mapa', () => {
    vi.mocked(usePublicProducerProfile).mockReturnValue({
      profile: PROFILE,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/productor/productor-demo']}>
        <Routes>
          <Route path="/productor/:slug" element={<ProducerProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /volver al mapa/i })).toHaveAttribute(
      'href',
      '/#mapa',
    );
  });
});
