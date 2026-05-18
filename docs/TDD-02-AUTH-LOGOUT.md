# TDD-02: Auth Logout Implementation

**Status**: En Desarrollo
**Prioridad**: Alta
**Módulo**: Auth
**Endpoint Backend**: `POST /api/v1/auth/logout` ✅ Implementado

---

## 📋 Descripción

Implementar la funcionalidad de logout en el frontend. Permitir que el usuario cierre sesión de manera segura, revocando su refreshToken y limpiando datos locales.

---

## 🎯 Objetivo

Proporcionar un botón de logout seguro que:
1. Revoque la sesión en el backend
2. Limpie tokens locales
3. Limpie datos de usuario
4. Redirija a página de inicio

---

## 📁 Archivos a Crear/Modificar

### Backend (YA IMPLEMENTADO)
- ✅ `/backend/src/api/v1/routes/auth.routes.ts` - Ruta POST /auth/logout
- ✅ `/backend/src/controllers/auth.controller.ts` - Lógica de logout
- ✅ `/backend/src/services/auth.service.ts` - Revocación de sesión

### Frontend - A CREAR/MODIFICAR

#### 1. **Actualizar authService.ts**
```
📁 /frontend/src/shared/services/
    └── authService.ts (YA EXISTE - ACTUALIZAR)
```

**Funciones a añadir:**
- `logout(refreshToken?: string): Promise<void>`
- Enviar POST a `/auth/logout`
- Limpiar tokens en localStorage/cookies
- Limpiar state de autenticación

#### 2. **Actualizar useAuth.ts Hook**
```
📁 /frontend/src/modules/auth/
    └── hooks/useAuth.ts (ACTUALIZAR)
```

**Funciones a añadir:**
- `logout(): Promise<void>` - Maneja logout
- `isAuthenticated: boolean` - Verifica si está logueado
- `user: User | null` - Datos del usuario actual

#### 3. **Crear Navbar/Header con Botón Logout** (NUEVO/ACTUALIZAR)
```
📁 /frontend/src/shared/components/
    └── Navbar.tsx (CREAR O ACTUALIZAR)
```

**Elementos:**
- Botón "Cerrar Sesión"
- Mostrar nombre de usuario
- Dropdown de perfil (opcional)
- Redirigir a login tras logout

#### 4. **Actualizar Layout Principal**
```
📁 /frontend/src/shared/layout/
    └── MainLayout.tsx (CREAR O ACTUALIZAR)
```

**Cambios:**
- Integrar Navbar
- Proteger rutas autenticadas
- Redirigir a login si no hay token

#### 5. **Actualizar LoginPage**
```
📁 /frontend/src/modules/auth/pages/
    └── LoginPage.tsx (ACTUALIZAR)
```

**Cambios:**
- Integrar `useAuth()` hook
- Usar `authService.logout()` si hay sesión previa
- Mostrar loading state

---

## 🔌 Endpoint Backend (Referencia)

### POST /api/v1/auth/logout

**Requisitos:**
- Header: `Authorization: Bearer {accessToken}`
- Cookie: `maps_refresh={refreshToken}` (automático)

**Request:**
```json
{
  "refreshToken": "string (opcional - fallback de cookie)"
}
```

**Response (200 OK):**
```json
{
  "data": null,
  "message": "Sesión cerrada",
  "error": null
}
```

**Response (401 Unauthorized):**
```json
{
  "data": null,
  "message": "Token inválido",
  "error": "INVALID_TOKEN"
}
```

---

## 📝 Validaciones

### Frontend
- ✅ Verificar que usuario esté autenticado
- ✅ Obtener refreshToken antes de enviar
- ✅ Limpiar incluso si logout falla en backend
- ✅ Confirmar antes de logout (opcional)

### Backend (YA IMPLEMENTADO)
- ✅ Validar accessToken
- ✅ Obtener refreshToken de cookie o body
- ✅ Revocar sesión en BD
- ✅ Limpiar cookie refreshToken

---

## 🏗️ Estructura de Código (Ejemplo)

### authService.ts (Actualizar)
```typescript
export const authService = {
  // ... funciones anteriores ...

  async logout(refreshToken?: string): Promise<void> {
    try {
      await axios.post(
        `${API_BASE}/auth/logout`,
        refreshToken ? { refreshToken } : {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`
          },
          withCredentials: true
        }
      );
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Limpiar siempre, incluso si falla
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }
};
```

### useAuth.ts (Actualizar)
```typescript
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@shared/services/authService';

export const useAuth = () => {
  const navigate = useNavigate();

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await authService.logout(refreshToken || undefined);
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      navigate('/');
    }
  }, [navigate]);

  const isAuthenticated = !!localStorage.getItem('accessToken');

  return { logout, isAuthenticated };
};
```

### Navbar.tsx (Nuevo)
```typescript
import { useAuth } from '@modules/auth/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export const Navbar = () => {
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) return null;

  const handleLogout = async () => {
    await logout();
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">MAPS</div>
      <div className="navbar-menu">
        <button onClick={handleLogout} className="btn btn-logout">
          Cerrar Sesión
        </button>
      </div>
    </nav>
  );
};
```

---

## 🧪 Casos de Prueba

### Test 1: Logout Exitoso
- **Given**: Usuario autenticado con tokens válidos
- **When**: Hace click en botón "Cerrar Sesión"
- **Then**: Envía POST a `/auth/logout`
- **Expected**: Tokens se limpian, redirige a home

### Test 2: Logout sin Conexión Backend
- **Given**: Backend no responde
- **When**: Usuario intenta logout
- **Then**: Error en request
- **Expected**: Tokens se limpian igual, redirige a home

### Test 3: Token Expirado en Logout
- **Given**: accessToken expirado
- **When**: Usuario intenta logout
- **Then**: Backend rechaza (401)
- **Expected**: Tokens se limpian, redirige a home

### Test 4: Logout sin Refresh Token
- **Given**: Usuario solo tiene accessToken
- **When**: Intenta logout
- **Then**: Envía logout con solo accessToken
- **Expected**: Backend revoca la sesión

### Test 5: Logout desde Página Protegida
- **Given**: Usuario en DashboardPage
- **When**: Hace logout
- **Then**: Se limpia estado
- **Expected**: Redirige a home, dashboard no accesible

---

## 🔐 Seguridad

- ✅ No guardar tokens en localStorage si es posible
- ✅ Usar cookies httpOnly para refreshToken
- ✅ Limpiar tokens incluso si backend falla
- ✅ Validar accessToken en header Authorization
- ✅ No enviar tokens en URL o parámetros
- ✅ HTTPS en producción

---

## 🔄 Flujo de Logout

```
1. Usuario hace click en "Cerrar Sesión"
   ↓
2. Obtiene refreshToken de storage
   ↓
3. Envía POST /auth/logout con tokens
   ↓
4. Backend valida tokens y revoca sesión
   ↓
5. Backend responde OK y limpia cookie
   ↓
6. Frontend limpia localStorage
   ↓
7. Frontend limpia state de autenticación
   ↓
8. Redirige a home ("/")
```

---

## 📊 Checklist de Implementación

- [ ] Añadir función `logout()` a `authService.ts`
- [ ] Actualizar `useAuth.ts` con lógica de logout
- [ ] Crear o actualizar `Navbar.tsx` con botón logout
- [ ] Crear o actualizar `MainLayout.tsx`
- [ ] Implementar redirección post-logout
- [ ] Limpiar state/context de usuario
- [ ] Escribir tests para función logout
- [ ] Escribir tests para flujo completo
- [ ] Probar logout en navegación
- [ ] Probar logout desde diferentes páginas
- [ ] Probar logout sin conexión

---

## 🔗 Referencias

- [Backend Auth Routes](/backend/src/api/v1/routes/auth.routes.ts)
- [Backend Auth Controller](/backend/src/controllers/auth.controller.ts)
- [React Router Navigation](https://reactrouter.com/en/main/start/overview)
