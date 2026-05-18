# TDD-01: Auth Refresh Token Implementation

**Status**: En Desarrollo
**Prioridad**: Alta
**Módulo**: Auth
**Endpoint Backend**: `POST /api/v1/auth/refresh` ✅ Implementado

---

## 📋 Descripción

Implementar el consumo del endpoint de refresh token en el frontend. Cuando el accessToken expire, la aplicación debe automáticamente solicitar uno nuevo usando el refreshToken almacenado.

---

## 🎯 Objetivo

Permitir que la sesión del usuario se mantenga activa sin necesidad de volver a hacer login cuando el accessToken expire (expiración: 15 minutos).

---

## 📁 Archivos a Crear/Modificar

### Backend (YA IMPLEMENTADO)
- ✅ `/backend/src/api/v1/routes/auth.routes.ts` - Ruta POST /auth/refresh
- ✅ `/backend/src/controllers/auth.controller.ts` - Lógica de refresh
- ✅ `/backend/src/services/auth.service.ts` - Generación de token

### Frontend - A CREAR/MODIFICAR

#### 1. **Crear servicio HTTP para Auth** (NUEVO)
```
📁 /frontend/src/shared/services/
    └── authService.ts (CREAR)
```

**Funciones a implementar:**
- `refreshAccessToken(refreshToken?: string): Promise<AccessTokenResponse>`
- Obtener refreshToken de cookie o localStorage
- Manejo de errores con renovación de credenciales

#### 2. **Crear/Actualizar Hook de Autenticación**
```
📁 /frontend/src/modules/auth/
    └── hooks/
        └── useAuth.ts (CREAR O ACTUALIZAR)
```

**Funciones a implementar:**
- `useAuth()` - Hook global de autenticación
- `isTokenExpired(token: string): boolean`
- `refreshTokenIfNeeded(): Promise<boolean>`
- Almacenar estado de autenticación (Zustand o Context)

#### 3. **Crear Interceptor/Middleware HTTP** (NUEVO)
```
📁 /frontend/src/shared/utils/
    └── httpClient.ts (CREAR)
```

**Funciones a implementar:**
- Interceptor de request que añade Authorization header
- Interceptor de response que detecta 401 y hace refresh
- Retry automático de request fallida tras refresh exitoso

#### 4. **Actualizar LoginPage**
```
📁 /frontend/src/modules/auth/pages/
    └── LoginPage.tsx (MODIFICAR)
```

**Cambios:**
- Usar `authService.refreshAccessToken()` en lugar de fetch directo
- Guardar refreshToken en cookie (httpOnly si es posible)
- Actualizar contexto/store de autenticación

---

## 🔌 Endpoint Backend (Referencia)

### POST /api/v1/auth/refresh

**Request:**
```json
{
  "refreshToken": "string (opcional - si no está en cookie)"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "OK",
  "error": null
}
```

**Response (401 Unauthorized):**
```json
{
  "data": null,
  "message": "Refresh token inválido o expirado",
  "error": "INVALID_REFRESH_TOKEN"
}
```

---

## 📝 Validaciones

### Frontend
- ✅ Verificar que refreshToken exista antes de solicitar
- ✅ Decodificar JWT para verificar expiración
- ✅ No hacer refresh si token aún es válido
- ✅ Limpiar datos si refresh falla

### Backend (YA IMPLEMENTADO)
- ✅ Validar refreshToken está en BD
- ✅ Verificar que no esté expirado
- ✅ Generar nuevo accessToken

---

## 🏗️ Estructura de Código (Ejemplo)

### authService.ts
```typescript
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export interface AccessTokenResponse {
  data: {
    accessToken: string;
  };
  message: string;
  error: null;
}

export const authService = {
  async refreshAccessToken(refreshToken?: string): Promise<string> {
    try {
      const response = await axios.post<AccessTokenResponse>(
        `${API_BASE}/auth/refresh`,
        refreshToken ? { refreshToken } : {},
        { withCredentials: true } // Envía cookies
      );

      if (response.data.data.accessToken) {
        return response.data.data.accessToken;
      }
      throw new Error('No token received');
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }
};
```

### useAuth.ts (Hook)
```typescript
import { useCallback } from 'react';
import { authService } from '@shared/services/authService';

export const useAuth = () => {
  const refreshToken = useCallback(async () => {
    try {
      const newToken = await authService.refreshAccessToken();
      localStorage.setItem('accessToken', newToken);
      return true;
    } catch (error) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return false;
    }
  }, []);

  return { refreshToken };
};
```

---

## 🧪 Casos de Prueba

### Test 1: Refresh Token Válido
- **Given**: Usuario tiene refreshToken válido
- **When**: accessToken expira
- **Then**: Se solicita nuevo accessToken automáticamente
- **Expected**: Nuevo token se obtiene sin relogueo

### Test 2: Refresh Token Expirado
- **Given**: refreshToken expirado en BD
- **When**: Se intenta hacer refresh
- **Then**: Retorna 401
- **Expected**: Usuario redirigido a login, limpia datos

### Test 3: Request con Token Expirado
- **Given**: Usuario hace request con accessToken expirado
- **When**: Interceptor detecta 401
- **Then**: Hace refresh automático
- **Expected**: Reintentar request con nuevo token

### Test 4: Refresh Fallido
- **Given**: Usuario sin refreshToken válido
- **When**: Intenta hacer refresh
- **Then**: Error de autenticación
- **Expected**: Logout automático, redirige a login

---

## 🔐 Seguridad

- ✅ Usar cookies httpOnly para refreshToken (más seguro)
- ✅ Validar tokens antes de usar
- ✅ Limpiar tokens en logout
- ✅ HTTPS en producción
- ✅ No almacenar accessToken en localStorage (usar memory/sessionStorage)

---

## 📊 Checklist de Implementación

- [ ] Crear `authService.ts` con función `refreshAccessToken()`
- [ ] Crear/actualizar `useAuth.ts` hook
- [ ] Crear `httpClient.ts` con interceptores
- [ ] Actualizar `LoginPage.tsx` para usar nuevos servicios
- [ ] Configurar manejo de errores 401
- [ ] Configurar almacenamiento de tokens (localStorage/cookies)
- [ ] Escribir tests unitarios para cada función
- [ ] Escribir tests de integración para flujo completo
- [ ] Documentar en README si hay cambios en env vars
- [ ] Probar con backend ejecutándose

---

## 🔗 Referencias

- [Backend Auth Routes](/backend/src/api/v1/routes/auth.routes.ts)
- [Backend Auth Service](/backend/src/services/auth.service.ts)
- [JWT Refresh Token Patterns](https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/)
