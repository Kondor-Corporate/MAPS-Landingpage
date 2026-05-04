# MAPS-004 — Auth & Routing Polish

Documentación de la feature de estabilización de autenticación, sesión, routing y roles. Complementa el [README técnico](./README.md) y el [README raíz](../README.md).

---

## Objetivo

Cerrar la base de navegación y autenticación del frontend para que las features de intranet, admin y web pública puedan construirse encima sin deuda técnica en la capa de sesión y permisos.

No se implementó funcionalidad de negocio nueva. Todos los cambios son de estabilización, corrección y documentación.

---

## Cambios implementados

### 1. Corrección de permisos en intranet (BLOQUEANTE)

**Archivo:** `frontend/src/router/index.tsx`

El `RoleGuard` de la rama `/intranet/*` tenía `allowedRoles={['PRODUCTOR', 'ADMIN', 'SUPERADMIN']}`, lo que permitía a un ADMIN navegar libremente a la intranet del productor. Corregido a `['PRODUCTOR']`.

```tsx
// antes
<RoleGuard allowedRoles={['PRODUCTOR', 'ADMIN', 'SUPERADMIN']} />

// después
<RoleGuard allowedRoles={['PRODUCTOR']} />
```

**Regla de negocio aplicada:** un ADMIN no accede a `/intranet` por defecto. Si una persona física necesita ambos contextos, se gestiona con dos cuentas separadas.

---

### 2. Hook `useLogout` — logout completo contra la API

**Archivo nuevo:** `frontend/src/modules/auth/hooks/useLogout.ts`

El `logout()` del store de Zustand limpiaba el estado local pero nunca llamaba a `POST /api/v1/auth/logout`, dejando el refresh token activo en la base de datos (`SesionToken`).

El nuevo hook:
1. Llama `POST /auth/logout` (el interceptor de Axios adjunta `Authorization: Bearer` y `withCredentials: true` automáticamente).
2. Limpia el store de Zustand (user, accessToken, flags) independientemente del resultado de la llamada a la API.
3. Redirige a `/login` con `replace: true`.

Si la petición falla (red cortada, token ya expirado), la sesión local se limpia igualmente para no dejar estado inconsistente.

---

### 3. Header mínimo con logout en `AppLayout`

**Archivo:** `frontend/src/shared/layouts/AppLayout.tsx`

`AppLayout` era un stub que solo renderizaba `{children}` sin ninguna UI. No había ningún punto en la aplicación desde donde el usuario pudiera cerrar sesión.

Se agregó un header mínimo funcional que muestra:
- Nombre de la aplicación ("MAPS Asesores").
- Usuario activo y su rol (`usuario PRODUCTOR`, `usuario ADMIN`, etc.).
- Botón "Cerrar sesión" que invoca `useLogout`.

Es intencional que sea simple. El sidebar, navbar completa y footer son trabajo de features de UI posteriores.

---

### 4. Remoción de `@types/react-router-dom` v5

**Archivo:** `frontend/package.json`

`devDependencies` incluía `@types/react-router-dom@^5.3.3` junto a `react-router-dom@^6.30`. React Router v6 incluye sus propios tipos; el paquete v5 es legacy, genera conflictos de tipos y es obsoleto con v6.

Se eliminó la dependencia y se ejecutó `npm install` para actualizar el lockfile.

---

### 5. Binarios fuera del tracking de git

**Archivos:** `Arquitectura/Domain Model/DomainModel.EAP` y `DomainModel.bmp`

Dos artefactos binarios del modelo de dominio (Enterprise Architect) estaban trackeados en git: un archivo `.EAP` de ~1.2 MB y un `.bmp`. No producen diffs útiles y aumentan el peso del historial.

Acciones realizadas:
- `git rm --cached` sobre ambos archivos (quedan en disco, dejan de estar en el index).
- Se agregaron patrones al `.gitignore`:
  ```
  *.EAP
  *.ldb
  Arquitectura/**/*.bmp
  ```

Si el equipo necesita versionar el modelo, se recomienda un repositorio de documentación separado o Git LFS.

---

### 6. Actualización de `docs/README.md`

El documento técnico de la etapa de auth estaba desalineado con la implementación real. Correcciones aplicadas:

| Sección | Antes | Después |
|---------|-------|---------|
| Stack frontend | React + Vite + Tailwind | React + Vite + Tailwind + **React Router v6 + Zustand + Axios** |
| HTTP client | `fetch` nativo | **Axios** con `withCredentials: true` |
| Token storage | `maps_access_token` en `sessionStorage`/`localStorage` | **Zustand en memoria** (solo `user` persistido); refresh en cookie httpOnly |
| Punto de entrada | "Monta `<LoginPage />`" | "Monta `<RouterProvider router={appRouter} />`" |
| Tabla de implementación | Solo `AuthLayout` y `LoginPage` | Todos los archivos de routing: `router/index.tsx`, guards, store, axios client, `useLogout` |
| Sección "Próxima etapa" | Indicaba routing/guards como pendiente | Reemplazada por tabla de estado real (implementado) + pendientes reales de negocio |
| Roles | No documentados | Tabla de roles + regla de acceso por zona |

---

### 7. Actualización de `README.md` raíz

- Corregido `PRODUCER` → `PRODUCTOR` en la tabla de stack de backend (Auth).
- Agregada nota de reglas de acceso por zona: PRODUCTOR→intranet, ADMIN/SUPERADMIN→admin, web pública accesible sin sesión.

---

## Estado del sistema tras MAPS-004

### Routing

```
/                        → web pública (sin guard)
/productor/:slug         → web pública (sin guard)
/login                   → PublicRoutes (redirige si hay sesión activa)
/intranet/*              → ProtectedRoutes → RoleGuard(['PRODUCTOR'])
/admin/*                 → ProtectedRoutes → RoleGuard(['ADMIN','SUPERADMIN'])
/unauthorized            → página de acceso denegado
*                        → redirige a /
```

### Redirecciones post-login

| Rol | Destino |
|-----|---------|
| `PRODUCTOR` | `/intranet/dashboard` |
| `ADMIN` | `/admin/dashboard` |
| `SUPERADMIN` | `/admin/dashboard` |

### Flujo de sesión

1. **Inicio de app:** `AuthInitializer` espera hidratación de Zustand `persist`. Si hay `user` sin `accessToken`, ejecuta `POST /auth/refresh` (cookie httpOnly) para renovar el token silenciosamente.
2. **Login:** `LoginPage` llama `POST /auth/login`, guarda `user` y `accessToken` en el store, redirige según rol.
3. **Peticiones autenticadas:** el interceptor de Axios adjunta `Authorization: Bearer`. Ante `401`, intenta renovar el token una vez (`_retry`); si falla, ejecuta logout y redirige a `/login`.
4. **Logout:** `useLogout` llama `POST /auth/logout` (revoca refresh en BD), limpia el store, redirige a `/login`.

---

## Criterios de aceptación verificados

| Criterio | Estado |
|----------|--------|
| `/login` funciona | Estaba bien |
| Usuario autenticado no queda atrapado en `/login` | `PublicRoutes` redirige |
| PRODUCTOR entra a intranet, no a admin | `RoleGuard(['PRODUCTOR'])` en intranet |
| ADMIN entra a admin, no a intranet por defecto | Guard bloquea, redirige a `/unauthorized` |
| SUPERADMIN entra a admin | `RoleGuard(['ADMIN','SUPERADMIN'])` |
| Sin sesión → rutas privadas → `/login` | `ProtectedRoutes` |
| Rol insuficiente → `/unauthorized` | `RoleGuard` con `Navigate` |
| Logout limpia sesión y redirige | `useLogout` llama API + store + navigate |
| Sin `@types/react-router-dom` v5 | Removido |
| README/docs alineados con el código | Actualizados |
| Roles unificados: PRODUCTOR / ADMIN / SUPERADMIN | Corregido en docs y guards |
| Binarios documentados y sacados del tracking | `git rm --cached` + `.gitignore` |

---

## Pruebas manuales recomendadas

```
1. Login con admin / Admin1234!
   → debe redirigir a /admin/dashboard
   → acceder manualmente a /intranet/dashboard debe mostrar /unauthorized

2. Login con superadmin / Super1234!
   → mismo comportamiento que ADMIN

3. (Requiere seed de PRODUCTOR) Login con productor
   → debe redirigir a /intranet/dashboard
   → acceder a /admin/dashboard debe mostrar /unauthorized

4. Botón "Cerrar sesión" en el header
   → redirige a /login
   → el botón Atrás del navegador no debe volver a la zona protegida

5. Recargar la app con sesión activa (F5)
   → AuthInitializer debe renovar el token y mantener la sesión sin forzar login

6. Con sesión activa, navegar a /login manualmente
   → debe redirigir al dashboard del rol correspondiente
```

---

## Pendientes fuera de esta feature

| Pendiente | Detalle |
|-----------|---------|
| Seed de PRODUCTOR | Agregar usuario productor en `backend/prisma/seed.ts` para pruebas con ese rol |
| Assets locales | Logo en `AuthLayout` usa URL temporal de Figma; copiar a `frontend/public/` |
| Layouts finales | Sidebar, navbar y footer en `AppLayout` y `PublicLayout` |
| Páginas de negocio | Dashboards, CRUD productores, noticias, biblioteca digital, mapa |
| Tests E2E | Flujo login → zona protegida → logout por cada rol (valorar Playwright) |
| CORS en producción | Verificar `FRONTEND_ORIGIN` y `secure: true` en cookies por entorno |

---

*Documento generado en la feature MAPS-004 — Auth & Routing Polish.*
