# Arquitectura

Documento vivo de arquitectura del proyecto MAPS Asesores.

Para decisiones historicas o alternativas descartadas, consultar `docs/tdd/` y `docs/worklog/`. Este documento describe como esta organizado el sistema actualmente.

---

## Vision general

MAPS es un monorepo full-stack compuesto por:

| Capa | Ubicacion | Stack |
|------|-----------|-------|
| Frontend | `frontend/` | React, Vite, TypeScript, Tailwind, React Router, Zustand, Axios |
| Backend | `backend/` | Node.js 22+, Express, TypeScript, Prisma, PostgreSQL |
| Base de datos | `backend/prisma/` | Prisma schema + migraciones SQL |
| Infra local | `docker-compose.yml` | PostgreSQL, backend y frontend de desarrollo |
| Staging | GCP (`maps-staging-landing-page`) | Cloud Run + Cloud SQL + GCS — ver [`GCP_STAGING_RUNBOOK.md`](./GCP_STAGING_RUNBOOK.md) |

No se usan npm workspaces: `frontend/` y `backend/` tienen `package.json` y `package-lock.json` independientes.

Runtime: el backend declara `engines.node: ">=22"`. Imagenes Docker y CI usan Node 22.

---

## Topologia Docker de desarrollo

El compose local levanta:

| Servicio | Puerto host | Responsabilidad |
|----------|-------------|-----------------|
| `frontend` | `5173` | Vite dev server |
| `backend` | `3000` | API Express |
| `db` | `5432` | PostgreSQL |

Relaciones:

- `frontend` depende de `backend` saludable.
- `backend` depende de `db` saludable.
- `backend` usa `DATABASE_URL` con host Docker `db`.
- El navegador consume la API via `http://127.0.0.1:3000/api/v1`.

URL canonica local del frontend: `http://127.0.0.1:5173`. No mezclar `localhost` y `127.0.0.1`: el navegador los trata como sitios distintos para cookies HttpOnly (`SameSite=Lax`). Detalle en el README raiz.

El compose esta orientado a desarrollo. No incluye TLS, reverse proxy productivo ni migraciones automaticas al arranque.

---

## Topologia staging GCP

Staging **existe y esta operativo**. Este documento no copia el runbook: solo ubica las piezas.

| Pieza | Rol |
|-------|-----|
| Cloud Run frontend | SPA publica; Nginx proxea `/api/*` al backend |
| Cloud Run backend | API Express; invocable publicamente en este staging |
| Cloud SQL PostgreSQL | Base de staging; no se seedéa con datos demo |
| Cloud Storage (GCS) | Bucket privado; el navegador no accede directo |
| Job migrate | `prisma migrate deploy` (target Docker `jobs`) |
| Job bootstrap | Crea el primer `SUPERADMIN` (sin seed demo) |
| Secret Manager | Secretos de aplicacion (no se documentan valores) |
| IAM | Service accounts dedicadas por rol |

Proyecto GCP: `maps-staging-landing-page`. Region: `southamerica-east1`.

Local y staging son entornos distintos: Compose + seed demo vs Cloud Run + migrate/bootstrap. Contrato operativo: [`GCP_STAGING_RUNBOOK.md`](./GCP_STAGING_RUNBOOK.md).

Produccion no esta documentada como desplegada.

---

## Frontend

### Estructura principal

```text
frontend/src/
  main.tsx
  components/
  store/
  lib/
  router/
  modules/
    public-web/
    auth/
    intranet/
    admin/
  shared/
    components/
    layouts/
    constants/
    types/
    utils/
```

### Responsabilidades

| Carpeta | Responsabilidad |
|---------|-----------------|
| `router/` | Definicion de rutas y guards (`PublicRoutes`, `ProtectedRoutes`, `RoleGuard`) |
| `store/` | Estado global de autenticacion con Zustand |
| `lib/` | Clientes y utilidades transversales, por ejemplo Axios |
| `modules/public-web/` | Landing, mapa publico y perfil publico |
| `modules/auth/` | Login y flujo de autenticacion |
| `modules/intranet/` | Experiencia del productor autenticado |
| `modules/admin/` | Panel administrativo |
| `shared/` | Layouts, componentes, tipos y utilidades reutilizables |

### Flujo de datos frontend

1. Una pagina o componente usa un hook/servicio del modulo.
2. El servicio HTTP llama a la API con `api` o cliente publico Axios.
3. `frontend/src/lib/axios.ts` agrega `Authorization` si hay access token.
4. Ante `401`, el interceptor intenta `POST /auth/refresh`.
5. El estado de sesion vive en `frontend/src/store/authStore.ts`.

---

## Backend

### Estructura principal

```text
backend/src/
  server.ts
  app.ts
  api/v1/
    index.ts
    routes/
  controllers/
  services/
  validations/
  middlewares/
  lib/
  config/
  types/
```

### Responsabilidades

| Carpeta | Responsabilidad |
|---------|-----------------|
| `server.ts` | Entrada HTTP: carga env y ejecuta `listen` |
| `app.ts` | Factory Express: middlewares globales, rutas y error handler |
| `api/v1/routes/` | Definicion de endpoints y middlewares por recurso |
| `controllers/` | Capa HTTP: request, response, status codes y envelope JSON |
| `services/` | Logica de negocio y acceso a Prisma |
| `validations/` | Schemas Zod para params, query y body |
| `middlewares/` | Auth, RBAC, validacion y manejo de errores |
| `lib/` | Helpers compartidos: Prisma, errores, storage, geocode, mappers |
| `config/` | Variables de entorno y configuracion runtime |

### Flujo de una request

```text
React component/hook
  -> frontend service
  -> Axios
  -> Express route
  -> authenticate/authorize/validate
  -> controller
  -> service
  -> Prisma
  -> PostgreSQL
  -> response envelope
```

Envelope de respuesta esperado:

```json
{
  "data": {},
  "message": "OK",
  "error": null
}
```

---

## Autenticacion y autorizacion

El sistema usa tres roles:

| Rol | Acceso principal |
|-----|------------------|
| `PRODUCTOR` | `/intranet/*` |
| `ADMIN` | `/admin/*` |
| `SUPERADMIN` | `/admin/*` con permisos adicionales, incluida la gestión de cuentas `ADMIN` (`/admin/admins`) |

Backend:

- Access token JWT via `Authorization: Bearer <token>`.
- Refresh token en cookie httpOnly `maps_refresh`.
- Sesiones persistidas como hash en `SesionToken`.
- `authenticate` valida access token.
- `authorize` restringe por rol.
- Cambio self-service de contraseña: `PATCH /api/v1/auth/me/password` para cualquier `Usuario` autenticado (D1A). Revoca `SesionToken` e incrementa `tokenVersion`.
- Gestión de administradores: `SUPERADMIN` opera cuentas `ADMIN` en `/api/v1/admins` (D1B). Detalle: [`modules/admins.md`](./modules/admins.md).

Frontend:

- Access token en memoria.
- Usuario persistido en Zustand.
- `AuthInitializer` intenta renovar access token al cargar.
- Guards de rutas redirigen segun autenticacion y rol.

Detalle: [`modules/auth.md`](./modules/auth.md).

---

## Base de datos

Prisma es la fuente de verdad para el modelo de datos:

- Schema: `backend/prisma/schema.prisma`.
- Migraciones: `backend/prisma/migrations/`.
- Seed: `backend/prisma/seed.ts`.

Modelos principales:

- `Usuario`
- `SesionToken`
- `Productor`
- `Certificacion`
- `RedSocial`
- `Noticia`
- `Biblioteca`
- `Ramo`
- `Recurso`

Las migraciones deben versionarse en Git. Para el flujo detallado, ver `docs/MIGRATIONS.md`.

---

## Modulos funcionales

| Modulo | Estado actual resumido |
|--------|------------------------|
| [Auth/routing](./modules/auth.md) | Implementado (incluye self-service de contraseña, D1A) |
| [Productores](./modules/producers.md) | CRUD admin, perfil productor, mapa publico y certificaciones |
| [Biblioteca](./modules/library.md) | API real de ramos e integracion frontend |
| [Web publica/mapa](./modules/public-web.md) | Landing, mapa y perfil publico conectados a productores |
| [Noticias](./modules/news.md) | API real; admin, Home, intranet conectados |
| [Admins](./modules/admins.md) | Gestión de cuentas ADMIN por SUPERADMIN (`/admin/admins`, `/api/v1/admins`); perfil + self-service D1A |

Los detalles de cada modulo deben vivir en `docs/modules/*.md`.

---

## Variables de entorno

Backend valida variables en `backend/src/config/env.ts`.

Frontend usa variables `VITE_*`, principalmente:

```env
VITE_API_BASE_URL=http://127.0.0.1:3000/api/v1
```

En Docker desarrollo, Compose define los defaults. En ejecucion local host, usar `backend/.env` y `frontend/.env`.

---

## Principios de organizacion

- Mantener rutas, controllers, services y validations separados.
- Mantener codigo de modulo dentro de `frontend/src/modules/<modulo>`.
- Promover a `shared/` solo lo que realmente se reutiliza entre modulos.
- No usar TDDs/work-logs como fuente de verdad del estado actual.
- Documentar cambios de arquitectura en este archivo cuando afecten a mas de un modulo.
- El detalle de provision y variables de staging vive en [`GCP_STAGING_RUNBOOK.md`](./GCP_STAGING_RUNBOOK.md), no aqui.
