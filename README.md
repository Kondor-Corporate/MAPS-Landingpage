# MAPS Asesores — Portal Web + Intranet + Admin

Portal integral para la gestión de productores de seguros de **MAPS Asesores**.  
Incluye tres zonas diferenciadas:

| Zona | Audiencia | Descripción |
|---|---|---|
| **Web Pública** | Visitante anónimo | Landing institucional, mapa de asesores, perfil público del productor |
| **Intranet** | Productor autenticado | Dashboard, Biblioteca Digital, acceso a SELF, gestión de perfil |
| **Admin / SuperAdmin** | Administradores | CRUD de productores y administradores, gestión de noticias, filtros avanzados |

> **Fuera de alcance en esta etapa:** Ecommerce y Cotizador (proyectos separados; la arquitectura contempla su integración futura sin rehacer el core).

> **Nota (MAPS-008):** La tabla resume zonas y propósito del producto; el **grado real de integración con API** por módulo está detallado en [Estado real del sistema](#estado-real-del-sistema). No asumir que las pantallas admin de productores o noticias persisten en servidor hasta que exista el ticket de integración correspondiente.

---

## Estado real del sistema

Última revisión documental: **MAPS-008** (2026-05). Esta sección complementa la tabla de zonas arriba: distingue lo **integrado o alineado con backend/infra**, lo que es **UI con mocks o datos locales**, y lo **pendiente**, para evitar interpretar demos como producción integrada.

### Integrado o alineado con backend e infraestructura

| Pieza | Notas |
|-------|--------|
| **Autenticación** | Login, refresh, logout, JWT y roles contra la API (`/api/v1/auth`). Detalle en [`docs/README.md`](docs/README.md). |
| **Routing y guards** | Rutas públicas, intranet (`PRODUCTOR`) y admin (`ADMIN` / `SUPERADMIN`) con guards de rol. |
| **Base de datos local** | Docker Compose (PostgreSQL), migraciones Prisma, seed (p. ej. usuarios admin/superadmin). |
| **Layouts base** | `PublicLayout`, `AuthLayout`, `AppLayout` (shell autenticado). |
| **Navegación móvil (intranet/admin)** | Menú tipo drawer bajo el breakpoint `lg` en `AppLayout`; mismos ítems de sidebar por rol. |

### UI implementada con mocks o datos locales (no implica API de negocio lista)

| Pieza | Notas |
|-------|--------|
| **Perfil público `/productor/:slug`** | Consume `GET /producers/by-slug/:slug` (público). |
| **Admin — productores** | CRUD vía API REST (`/producers`); alta con **dirección** geocodificada a coordenadas. |
| **Admin — noticias** | Gestión con **mocks** en cliente. |
| **Noticias en landing y dashboards** | Grillas y modales con **contenido mock** (p. ej. `mockNews`). |
| **Mapa en landing (`FindAdvisorMap`)** | MapLibre alimentado por `GET /producers/map` (productores activos con coords); **lazy-load del chunk** pendiente como mejora de performance. |
| **Biblioteca digital (contenido)** | Rutas de app existen; contenido **no** sustentado en API de biblioteca aún. |
| **SELF y enlaces externos tipo Drive** | Hasta tener URLs reales, `dashboardLinks` puede usar **`null`** y la UI muestra **«Próximamente»** en CTAs/sidebar donde aplique. |

### Pendiente explícito

- Integración **API** para **noticias**.
- **URLs reales** portal SELF y biblioteca (Drive u otra).
- **Lazy-load** de MapLibre (o issue con métrica objetivo).
- **Tests E2E** (p. ej. Playwright).

### API pública de productores (mapa y perfiles)

| Método | Ruta | Auth | Uso |
|--------|------|------|-----|
| `GET` | `/api/v1/producers/map` | No | Marcadores para el mapa de la landing (slug, nombre, coords, sin email/id) |
| `GET` | `/api/v1/producers/by-slug/:slug` | No | Perfil público del productor |

Al crear un productor desde admin, el campo **Dirección** se geocodifica vía Nominatim y persiste `latitud`/`longitud` en PostgreSQL.

Documentación relacionada: [TDD MAPS-008](docs/tdd/MAPS-008-tdd-ui-stabilization.md), [worklog MAPS-008](docs/worklog/MAPS-008-ui-stabilization.md).

---

## Stack Tecnológico

### Frontend

| Capa | Tecnología |
|---|---|
| Framework | React 18 + Vite |
| Lenguaje | TypeScript |
| Estilos | TailwindCSS |
| Router | React Router v6 |
| Estado global | Zustand |
| HTTP client | Axios |

### Backend

| Capa | Tecnología |
|---|---|
| Runtime | Node.js (LTS) |
| Framework | Express + TypeScript |
| ORM | Prisma |
| Base de datos | PostgreSQL |
| Validación | Zod (por endpoint) |
| Auth | JWT + RBAC (roles: `PRODUCTOR` / `ADMIN` / `SUPERADMIN`) |

> **Reglas de acceso por zona:** `PRODUCTOR` → `/intranet/*` (solo su propio perfil). `ADMIN` y `SUPERADMIN` → `/admin/*`. Un admin no accede a `/intranet` salvo que tenga también cuenta de productor separada. La web pública (`/`, `/productor/:slug`) es accesible sin autenticación.

### Infraestructura local

| Herramienta | Uso |
|---|---|
| Docker + Docker Compose | PostgreSQL local solamente |
| `.env` | Variables de entorno (ver `.env.example`) |

> En desarrollo, Docker se usa solo para la base de datos. Backend y frontend corren localmente con `npm run dev`.

---

## Estado real del sistema

Resumen ejecutivo para no confundir qué está cableado contra la API y qué sigue en **demo local / mock**:

| Área | Estado |
|------|--------|
| **Login / auth API** | Implementado (`/api/v1/auth`, guards en frontend). |
| **Admin — productores** | **Integrado con API real** `/api/v1/producers` (MAPS-009). |
| **Admin — noticias** | **Mock / estado en cliente** (`useNews`, etc.). |
| **Público — landing y mapa** | Contenidos **locales/mock** según página; no implica backend de catálogo. |
| **Perfil público `/productor/:slug`** | **No** enlazado a la API admin de esta feature. |
| **Intranet productor** | Independiente del cierre MAPS-009. |

Detalle y pruebas manuales: [`docs/worklog/MAPS-009-admin-api-productores.md`](docs/worklog/MAPS-009-admin-api-productores.md).

---

## Requisitos

- **Node.js** LTS (≥ 20) — [descargar](https://nodejs.org/)
- **Docker Desktop** — [descargar](https://www.docker.com/products/docker-desktop/)
- **pnpm** (recomendado) o npm/yarn

```bash
# Verificar versiones
node -v    # >= 20.x
npm -v
docker -v
```

---

## Setup local (paso a paso)

### 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPO>
cd maps-asesores
git checkout development
```

### 2. Configurar variables de entorno

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

Editá los archivos `.env` con los valores correspondientes.  
**Nunca commitees archivos `.env` con credenciales reales.**

### 3. Levantar la base de datos (Docker)

```bash
docker compose up -d
```

Esto levanta un contenedor PostgreSQL en `localhost:5432` con la base oficial de desarrollo `maps_asesores_dev`.
Podés verificar estado y logs con:

```bash
docker compose ps
docker compose logs db
```

### 4. Instalar dependencias

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 5. Ejecutar migraciones de Prisma

```bash
cd backend
npx prisma migrate dev
npm run db:seed
```

### 6. Correr el proyecto

En terminales separadas:

```bash
# Terminal 1 — Backend
cd backend
npm run dev
# Escucha en http://localhost:3000

# Terminal 2 — Frontend
cd frontend
npm run dev
# Escucha en http://localhost:5173
```

### 7. Verificar que la API responde

```bash
curl http://localhost:3000/api/v1/health
# Respuesta esperada: { "status": "ok", "timestamp": "..." }
```

### 8. Tests de integración del backend (auth)

Requisitos: PostgreSQL levantado, migraciones aplicadas y seed ejecutado (`cd backend && npm run db:seed`). El archivo `backend/.env` debe incluir `DATABASE_URL`, `JWT_SECRET`, `REFRESH_SECRET` y el resto de variables validadas en `src/config/env.ts`.

```bash
cd backend
npm test              # una pasada
npm run test:watch    # modo observación
```

Los tests viven en `backend/tests/` y usan **Vitest** + **Supertest** contra la app en memoria (`createApp()`), sin levantar un servidor real.

#### Qué hace cada test (`tests/auth.integration.test.ts`)

| Test | Qué comprueba |
|------|----------------|
| **POST /login — credenciales válidas** | Respuesta `200` con `accessToken` y `refreshToken` en formato JWT, usuario `admin` con rol `ADMIN`, y que la respuesta **no** expone `passwordHash`. |
| **POST /login — contraseña incorrecta** | `401` con mensaje genérico `Credenciales inválidas` (no filtra si el usuario existe). |
| **POST /login — usuario inexistente** | Mismo `401` y mismo mensaje que con contraseña mala (anti-enumeración de usuarios). |
| **POST /login — body inválido** | `400` cuando faltan campos requeridos (validación Zod). |
| **POST /refresh — token válido** | Tras un login correcto, el refresh devuelve `200` y un **nuevo** `accessToken`; no devuelve otro refresh en el payload. |
| **POST /refresh — token inválido** | `401` si el string no es un JWT válido firmado como refresh. |
| **POST /refresh — access como refresh** | `401` si se envía el **access token** en el cuerpo donde debe ir el refresh (secret y tipo distintos). |
| **POST /logout — revoca sesión** | Con `Authorization: Bearer` + `refreshToken` en el body, `200`; un segundo `POST /refresh` con el mismo refresh devuelve `401` (sesión revocada en base de datos). |
| **POST /logout — sin Authorization** | `401` si falta el header `Bearer` (middleware `authenticate`). |

En entorno de test (`NODE_ENV=test`) el rate limit del login está relajado para no interferir con la suite.

---

## Base de datos local con Docker

El archivo [`docker-compose.yml`](./docker-compose.yml) define solo PostgreSQL para desarrollo:

- Servicio: `db`
- Imagen: `postgres:16-alpine`
- Host/puerto desde el equipo: `localhost:5432`
- Base oficial de desarrollo: `maps_asesores_dev`
- Usuario: `postgres`
- Password: `postgres`
- Volumen persistente: `pgdata`

El backend local usa `localhost` en `DATABASE_URL` porque corre fuera de Docker:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/maps_asesores_dev"
```

Si en el futuro el backend corre dentro de Docker, el host de la URL debería ser el nombre del servicio (`db`) en lugar de `localhost`.

Comandos útiles:

```bash
docker compose up -d        # levanta PostgreSQL
docker compose ps           # muestra estado del servicio
docker compose logs db      # muestra logs de PostgreSQL
docker compose down         # detiene y elimina el contenedor, conserva el volumen
docker compose down -v      # detiene y elimina también los datos del volumen

cd backend
npx prisma migrate dev      # aplica migraciones en desarrollo
npm run db:migrate          # alias del comando anterior
npm run db:seed             # carga datos iniciales
npm run prisma:studio       # abre Prisma Studio
```

pgAdmin es opcional y funciona solo como cliente visual. Para conectarlo:

- Host: `localhost`
- Port: `5432`
- User: `postgres`
- Password: `postgres`
- Database: `maps_asesores_dev`

Troubleshooting:

- Si `5432` está ocupado, probablemente hay otro PostgreSQL local corriendo. Detenelo o cambiá el puerto host del compose y actualizá `DATABASE_URL`.
- `docker compose down -v` borra los datos persistidos en `pgdata`; usalo solo cuando quieras resetear la DB.
- Si existe una DB antigua con datos usando rol `PRODUCER`, revisar la migración hacia `PRODUCTOR` antes de migrar sobre datos reales.
- pgAdmin no es necesario para que el backend funcione; Prisma usa directamente `DATABASE_URL`.

---

## Estructura de carpetas

```
maps-asesores/
├── frontend/
│   └── src/
│       ├── shared/          ← componentes, layouts, hooks, types, utils compartidos
│       ├── modules/
│       │   ├── public-web/  ← landing + perfil público
│       │   ├── intranet/    ← portal del productor
│       │   └── admin/       ← panel admin / superadmin
│       └── router/          ← React Router + guards de rol
│
├── backend/
│   ├── tests/               ← Vitest + Supertest (p. ej. auth.integration.test.ts)
│   └── src/
│       ├── api/v1/routes/   ← definición de endpoints
│       ├── controllers/     ← capa HTTP (req → service → res)
│       ├── services/        ← lógica de negocio (usa Prisma)
│       ├── middlewares/     ← authenticate, authorize (RBAC), validate (Zod)
│       ├── validations/     ← Zod schemas por recurso
│       ├── types/           ← roles, augmentación Express
│       └── config/          ← env.ts (validación de variables al startup)
│   └── prisma/
│       ├── schema.prisma
│       └── migrations/
│
├── docker-compose.yml
├── backend/.env.example
├── frontend/.env.example
├── .gitignore
└── README.md
```

> Ver la propuesta completa en la documentación de arquitectura del equipo.

---

## Convenciones del equipo

### Branching y PRs

```
main          ← producción (solo se toca via PR desde development)
development   ← integración continua
feature/*     ← desarrollo de funcionalidades (ej: feature/producer-crud)
fix/*         ← correcciones puntuales
```

- Todo el trabajo se hace en ramas `feature/*` o `fix/*`
- Se abre un **Pull Request** hacia `development`
- Merge strategy: **Squash & Merge** (un commit limpio por feature)
- `main` solo recibe PRs desde `development` (releases)

### Nombrado de archivos

| Tipo | Convención | Ejemplo |
|---|---|---|
| Componentes React | PascalCase | `ProducerTable.tsx` |
| Hooks | camelCase con `use` | `useProducerFilters.ts` |
| Servicios/Controllers | camelCase + sufijo | `producers.service.ts` |
| Schemas Zod | camelCase + `.schema` | `producer.schema.ts` |
| Variables de entorno | SCREAMING_SNAKE_CASE | `DATABASE_URL` |

### API

- Todos los endpoints bajo `/api/v1/`
- Respuestas JSON con estructura consistente:
  ```json
  { "data": ..., "message": "...", "error": null }
  ```
- Errores de validación devuelven `400` con detalle del campo
- Autenticación via header `Authorization: Bearer <token>`

---

## Variables de entorno — referencia

### `backend/.env.example`

```env
# Runtime
NODE_ENV=development
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173

# Base de datos local via Docker Compose
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/maps_asesores_dev"

# Auth / JWT
JWT_SECRET=dev_access_secret_change_me_32_chars_minimum
JWT_EXPIRES_IN=15m
REFRESH_SECRET=dev_refresh_secret_change_me_32_chars_minimum
REFRESH_EXPIRES_IN=30d

# Contraseña inicial al dar de alta un productor desde el admin (MAPS-009). En producción usar valor largo y política de rotación.
DEFAULT_PRODUCER_PASSWORD=Dev_DefaultProducer_12chars
```

### `frontend/.env.example`

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

---

## Licencia

Proyecto privado — © 2026 MAPS Asesores / Kondor. Todos los derechos reservados.
