import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LoginPage } from '@/modules/auth/pages/LoginPage';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LoginPage />
  </StrictMode>,
);
