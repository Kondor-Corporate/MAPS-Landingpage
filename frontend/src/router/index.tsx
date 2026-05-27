import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { AdminsPage } from '@/modules/admin/pages/AdminsPage';
import { DashboardPage as AdminDashboardPage } from '@/modules/admin/pages/DashboardPage';
import { InactiveProducersPage } from '@/modules/admin/pages/InactiveProducersPage';
import { LibraryManagementPage } from '@/modules/admin/pages/LibraryManagementPage';
import { NewsManagementPage } from '@/modules/admin/pages/NewsManagementPage';
import { ProducersPage } from '@/modules/admin/pages/ProducersPage';
import { LoginPage } from '@/modules/auth/pages/LoginPage';
import { DashboardPage as IntranetDashboardPage } from '@/modules/intranet/pages/DashboardPage';
import { DigitalLibraryPage } from '@/modules/intranet/pages/DigitalLibraryPage';
import { MyProfilePage } from '@/modules/intranet/pages/MyProfilePage';
import { ProducerProfileViewPage } from '@/modules/intranet/pages/ProducerProfileViewPage';
import { HomePage } from '@/modules/public-web/pages/HomePage';
import { ProducerProfilePage } from '@/modules/public-web/pages/ProducerProfilePage';
import { AppLayout } from '@/shared/layouts/AppLayout';
import { PublicLayout } from '@/shared/layouts/PublicLayout';
import { ProtectedRoutes } from './ProtectedRoutes';
import { PublicRoutes } from './PublicRoutes';
import { RoleGuard } from './RoleGuard';

function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-4">
      <h1 className="text-lg font-semibold text-maps-heading">Acceso denegado</h1>
      <p className="text-center text-sm text-maps-body">
        No tenés permiso para acceder a esta sección.
      </p>
    </div>
  );
}

const intranetRolePath = {
  path: 'intranet',
  element: <ProtectedRoutes />,
  children: [
    {
      element: (
        <RoleGuard allowedRoles={['PRODUCTOR']} />
      ),
      children: [
        {
          element: (
            <AppLayout>
              <Outlet />
            </AppLayout>
          ),
          children: [
            { path: 'dashboard', element: <IntranetDashboardPage /> },
            { path: 'biblioteca', element: <DigitalLibraryPage /> },
            { path: 'mi-perfil', element: <MyProfilePage /> },
            { path: 'perfil/:slug', element: <ProducerProfileViewPage /> },
            { index: true, element: <Navigate to="dashboard" replace /> },
          ],
        },
      ],
    },
  ],
};

const adminBranch = {
  path: 'admin',
  element: <ProtectedRoutes />,
  children: [
    {
      path: 'admins',
      element: <RoleGuard allowedRoles={['SUPERADMIN']} />,
      children: [
        {
          index: true,
          element: (
            <AppLayout>
              <AdminsPage />
            </AppLayout>
          ),
        },
      ],
    },
    {
      element: <RoleGuard allowedRoles={['ADMIN', 'SUPERADMIN']} />,
      children: [
        {
          element: (
            <AppLayout>
              <Outlet />
            </AppLayout>
          ),
          children: [
            { path: 'dashboard', element: <AdminDashboardPage /> },
            { path: 'productores', element: <ProducersPage /> },
            { path: 'inactivos', element: <InactiveProducersPage /> },
            { path: 'noticias', element: <NewsManagementPage /> },
            { path: 'biblioteca', element: <LibraryManagementPage /> },
            { path: 'mi-perfil', element: <MyProfilePage /> },
            { index: true, element: <Navigate to="dashboard" replace /> },
          ],
        },
      ],
    },
  ],
};

export const appRouter = createBrowserRouter([
  {
    path: '/login',
    element: <PublicRoutes />,
    children: [{ index: true, element: <LoginPage /> }],
  },
  { path: '/unauthorized', element: <UnauthorizedPage /> },
  {
    path: '/',
    element: (
      <PublicLayout>
        <Outlet />
      </PublicLayout>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: 'productor/:slug', element: <ProducerProfilePage /> },
    ],
  },
  intranetRolePath,
  adminBranch,
  { path: '*', element: <Navigate to="/" replace /> },
]);
