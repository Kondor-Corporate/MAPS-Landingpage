import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AuthInitializer } from '@/components/AuthInitializer';
import { appRouter } from '@/router';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthInitializer>
      <RouterProvider router={appRouter} />
    </AuthInitializer>
  </StrictMode>,
);
