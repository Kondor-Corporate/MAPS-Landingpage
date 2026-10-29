# Inventario del proyecto

Snapshot orientativo de la estructura del repositorio MAPS Asesores.

| Campo | Valor |
|-------|-------|
| Ultima actualizacion | 2026-05-29 |
| Alcance | Monorepo `MAPS-Landingpage/` |
| Excluye | `.git/`, `node_modules/`, `dist/`, coverage y artefactos generados |
| Vigencia | Snapshot manual; puede quedar desactualizado |

> Este documento no es fuente de verdad del estado actual del sistema. Para arquitectura viva, usar [`ARCHITECTURE.md`](./ARCHITECTURE.md). Para onboarding y comandos principales, usar el [`README` raiz](../README.md).

---

## Estructura general

```text
MAPS-Landingpage/
  .github/
    workflows/
    pull_request_template.md
  backend/
    prisma/
      migrations/
      schema.prisma
      seed.ts
    src/
      api/v1/routes/
      config/
      constants/
      controllers/
      lib/
      middlewares/
      services/
      types/
      validations/
      app.ts
      server.ts
    tests/
    Dockerfile
    package.json
  docs/
    modules/
    tdd/
    worklog/
    ARCHITECTURE.md
    CHANGELOG.md
    CONTRIBUTING.md
    CONVENTIONS.md
    MIGRATIONS.md
    README.md
    TESTING.md
    inventario-proyecto.md
  frontend/
    public/
    src/
      assets/
      components/
      lib/
      modules/
      router/
      shared/
      store/
      tests/
      main.tsx
    Dockerfile
    nginx.conf
    package.json
  docker-compose.yml
  README.md
```

---

## Backend

Ubicacion: `backend/`

Stack:

- Node.js + TypeScript.
- Express.
- Prisma.
- PostgreSQL.
- Zod.
- JWT + cookies httpOnly.
- Vitest + Supertest.

Directorios principales:

| Ruta | Responsabilidad |
|------|-----------------|
| `src/api/v1/routes/` | Definicion de rutas HTTP |
| `src/controllers/` | Capa HTTP: request/response |
| `src/services/` | Logica de negocio y acceso a datos |
| `src/validations/` | Schemas Zod |
| `src/middlewares/` | Auth, RBAC, validacion, errores y uploads |
| `src/lib/` | Prisma, storage, geocode, mappers y helpers |
| `src/config/` | Variables de entorno y cookies |
| `prisma/` | Schema, migraciones y seed |
| `tests/` | Tests backend |

Rutas API montadas:

| Prefijo | Estado resumido |
|---------|-----------------|
| `/api/v1/health` | Implementado |
| `/api/v1/auth` | Implementado |
| `/api/v1/producers` | Implementado |
| `/api/v1/library` | Implementado para ramos |
| `/api/v1/news` | Implementado (MAPS-014) |
| `/api/v1/admins` | Router montado; API pendiente |

---

## Frontend

Ubicacion: `frontend/`

Stack:

- React.
- Vite.
- TypeScript.
- Tailwind CSS.
- React Router.
- Zustand.
- Axios.
- MapLibre/react-map-gl para mapa.

Directorios principales:

| Ruta | Responsabilidad |
|------|-----------------|
| `src/router/` | Router y guards |
| `src/store/` | Auth store |
| `src/lib/` | Cliente HTTP y utilidades transversales |
| `src/modules/public-web/` | Landing, mapa y perfil publico |
| `src/modules/auth/` | Login |
| `src/modules/intranet/` | Dashboard, biblioteca y perfil productor |
| `src/modules/admin/` | Panel admin |
| `src/shared/` | Componentes, layouts, tipos, constantes y utilidades compartidas |
| `src/tests/` | Tests frontend |

---

## Infraestructura local

Archivos principales:

| Archivo | Uso |
|---------|-----|
| `docker-compose.yml` | Stack local de desarrollo |
| `backend/Dockerfile` | Imagen backend Node/Express |
| `frontend/Dockerfile` | Target dev Vite y targets build/runner futuros |
| `frontend/nginx.conf` | Config para servir build estatico en target runner |

Servicios compose:

| Servicio | Puerto host por defecto | Uso |
|----------|-------------------------|-----|
| `frontend` | `5173` | Vite dev server |
| `backend` | `3000` | API Express |
| `db` | `5432` | PostgreSQL |

Volumenes:

- `pgdata`: datos PostgreSQL.
- `backend_uploads`: uploads de certificaciones.
- `frontend_node_modules`: dependencias frontend dentro del contenedor.

---

## Documentacion

| Ruta | Uso |
|------|-----|
| `docs/README.md` | Indice de documentacion |
| `docs/CONVENTIONS.md` | Convenciones documentales |
| `docs/CONTRIBUTING.md` | Ramas, commits, PRs y definition of done |
| `docs/CHANGELOG.md` | Cambios relevantes |
| `docs/ARCHITECTURE.md` | Arquitectura viva |
| `docs/TESTING.md` | Estrategia de pruebas |
| `docs/MIGRATIONS.md` | Prisma, migraciones y seed |
| `docs/modules/` | Documentacion viva por modulo |
| `docs/tdd/` | Disenos prospectivos |
| `docs/worklog/` | Historial de implementacion |

---

## Dependencias principales

### Backend

Dependencias runtime destacadas:

- `@prisma/client`
- `express`
- `cors`
- `cookie-parser`
- `helmet`
- `jsonwebtoken`
- `bcryptjs`
- `express-rate-limit`
- `multer`
- `zod`
- `@aws-sdk/client-s3`

Dependencias desarrollo destacadas:

- `prisma`
- `tsx`
- `typescript`
- `vitest`
- `supertest`
- `eslint`
- `prettier`

### Frontend

Dependencias runtime destacadas:

- `react`
- `react-dom`
- `react-router-dom`
- `axios`
- `zustand`
- `lucide-react`
- `react-icons`
- `maplibre-gl`
- `react-map-gl`

Dependencias desarrollo destacadas:

- `vite`
- `typescript`
- `tailwindcss`
- `eslint`
- `prettier`
- `vitest` si se mantiene o agrega en package correspondiente

---

## Notas de mantenimiento

- Actualizar este inventario solo cuando aporte valor de onboarding o auditoria.
- Si se vuelve costoso mantenerlo, preferir reemplazarlo por un script o moverlo a `docs/archive/`.
- No usar este archivo para decidir el estado actual de un modulo; usar `docs/modules/*.md` y `ARCHITECTURE.md`.
