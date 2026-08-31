import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { HomePage } from '@/modules/public-web/pages/HomePage';
import { PublicLayout } from '@/shared/layouts/PublicLayout';
import { ProtectedRoutes } from './ProtectedRoutes';
import { PublicRoutes } from './PublicRoutes';
import { RoleGuard } from './RoleGuard';
import { RouteFallback } from './RouteFallback';

const LoginPage = lazy(() =>
  import('@/modules/auth/pages/LoginPage').then((module) => ({
    default: module.LoginPage,
  })),
);

const NewsListPage = lazy(() =>
  import('@/modules/public-web/pages/NewsListPage').then((module) => ({
    default: module.NewsListPage,
  })),
);

const NewsDetailPage = lazy(() =>
  import('@/modules/public-web/pages/NewsDetailPage').then((module) => ({
    default: module.NewsDetailPage,
  })),
);

const ProducerProfilePage = lazy(() =>
  import('@/modules/public-web/pages/ProducerProfilePage').then((module) => ({
    default: module.ProducerProfilePage,
  })),
);

const AppLayout = lazy(() =>
  import('@/shared/layouts/AppLayout').then((module) => ({
    default: module.AppLayout,
  })),
);

const AdminDashboardPage = lazy(() =>
  import('@/modules/admin/pages/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
);

const AdminsPage = lazy(() =>
  import('@/modules/admin/pages/AdminsPage').then((module) => ({
    default: module.AdminsPage,
  })),
);

const ProducersPage = lazy(() =>
  import('@/modules/admin/pages/ProducersPage').then((module) => ({
    default: module.ProducersPage,
  })),
);

const InactiveProducersPage = lazy(() =>
  import('@/modules/admin/pages/InactiveProducersPage').then((module) => ({
    default: module.InactiveProducersPage,
  })),
);

const NewsManagementPage = lazy(() =>
  import('@/modules/admin/pages/NewsManagementPage').then((module) => ({
    default: module.NewsManagementPage,
  })),
);

const LibraryManagementPage = lazy(() =>
  import('@/modules/admin/pages/LibraryManagementPage').then((module) => ({
    default: module.LibraryManagementPage,
  })),
);

const AdminProfilePage = lazy(() =>
  import('@/modules/admin/pages/AdminProfilePage').then((module) => ({
    default: module.AdminProfilePage,
  })),
);

const IntranetDashboardPage = lazy(() =>
  import('@/modules/intranet/pages/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
);

const DigitalLibraryPage = lazy(() =>
  import('@/modules/intranet/pages/DigitalLibraryPage').then((module) => ({
    default: module.DigitalLibraryPage,
  })),
);

const IntranetNewsPage = lazy(() =>
  import('@/modules/intranet/pages/IntranetNewsPage').then((module) => ({
    default: module.IntranetNewsPage,
  })),
);

const MyProfilePage = lazy(() =>
  import('@/modules/intranet/pages/MyProfilePage').then((module) => ({
    default: module.MyProfilePage,
  })),
);

const ProducerProfileViewPage = lazy(() =>
  import('@/modules/intranet/pages/ProducerProfileViewPage').then((module) => ({
    default: module.ProducerProfileViewPage,
  })),
);

function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

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
      element: <RoleGuard allowedRoles={['PRODUCTOR']} />,
      children: [
        {
          element: (
            <LazyRoute>
              <AppLayout>
                <Outlet />
              </AppLayout>
            </LazyRoute>
          ),
          children: [
            {
              path: 'dashboard',
              element: (
                <LazyRoute>
                  <IntranetDashboardPage />
                </LazyRoute>
              ),
            },
            {
              path: 'biblioteca',
              element: (
                <LazyRoute>
                  <DigitalLibraryPage />
                </LazyRoute>
              ),
            },
            {
              path: 'noticias',
              element: (
                <LazyRoute>
                  <IntranetNewsPage />
                </LazyRoute>
              ),
            },
            {
              path: 'mi-perfil',
              element: (
                <LazyRoute>
                  <MyProfilePage />
                </LazyRoute>
              ),
            },
            {
              path: 'perfil/:slug',
              element: (
                <LazyRoute>
                  <ProducerProfileViewPage />
                </LazyRoute>
              ),
            },
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
            <LazyRoute>
              <AppLayout>
                <LazyRoute>
                  <AdminsPage />
                </LazyRoute>
              </AppLayout>
            </LazyRoute>
          ),
        },
      ],
    },
    {
      element: <RoleGuard allowedRoles={['ADMIN', 'SUPERADMIN']} />,
      children: [
        {
          element: (
            <LazyRoute>
              <AppLayout>
                <Outlet />
              </AppLayout>
            </LazyRoute>
          ),
          children: [
            {
              path: 'dashboard',
              element: (
                <LazyRoute>
                  <AdminDashboardPage />
                </LazyRoute>
              ),
            },
            {
              path: 'novedades',
              element: (
                <LazyRoute>
                  <IntranetNewsPage />
                </LazyRoute>
              ),
            },
            {
              path: 'productores',
              element: (
                <LazyRoute>
                  <ProducersPage />
                </LazyRoute>
              ),
            },
            {
              path: 'inactivos',
              element: (
                <LazyRoute>
                  <InactiveProducersPage />
                </LazyRoute>
              ),
            },
            {
              path: 'noticias',
              element: (
                <LazyRoute>
                  <NewsManagementPage />
                </LazyRoute>
              ),
            },
            {
              path: 'biblioteca',
              element: (
                <LazyRoute>
                  <LibraryManagementPage />
                </LazyRoute>
              ),
            },
            {
              path: 'mi-perfil',
              element: (
                <LazyRoute>
                  <AdminProfilePage />
                </LazyRoute>
              ),
            },
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
    children: [
      {
        index: true,
        element: (
          <LazyRoute>
            <LoginPage />
          </LazyRoute>
        ),
      },
    ],
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
      {
        path: 'noticias',
        element: (
          <LazyRoute>
            <NewsListPage />
          </LazyRoute>
        ),
      },
      {
        path: 'noticias/:slug',
        element: (
          <LazyRoute>
            <NewsDetailPage />
          </LazyRoute>
        ),
      },
      {
        path: 'productor/:slug',
        element: (
          <LazyRoute>
            <ProducerProfilePage />
          </LazyRoute>
        ),
      },
    ],
  },
  intranetRolePath,
  adminBranch,
  { path: '*', element: <Navigate to="/" replace /> },
]);
