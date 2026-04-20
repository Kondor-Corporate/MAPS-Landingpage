# MAPS Asesores — Portal Web + Intranet + Admin

Portal integral para la gestión de productores de seguros de **MAPS Asesores**.  
Incluye tres zonas diferenciadas:

| Zona | Audiencia | Descripción |
|---|---|---|
| **Web Pública** | Visitante anónimo | Landing institucional, mapa de asesores, perfil público del productor |
| **Intranet** | Productor autenticado | Dashboard, Biblioteca Digital, acceso a SELF, gestión de perfil |
| **Admin / SuperAdmin** | Administradores | CRUD de productores y administradores, gestión de noticias, filtros avanzados |

> **Fuera de alcance en esta etapa:** Ecommerce y Cotizador (proyectos separados; la arquitectura contempla su integración futura sin rehacer el core).

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
| Auth | JWT + RBAC (PRODUCER / ADMIN / SUPERADMIN) |

### Infraestructura local

| Herramienta | Uso |
|---|---|
| Docker + Docker Compose | PostgreSQL local |
| `.env` | Variables de entorno (ver `.env.example`) |

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

Esto levanta un contenedor PostgreSQL en `localhost:5432`.  
Podés verificar que esté corriendo con:

```bash
docker compose ps
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
# Base de datos
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/maps_asesores_dev"

# JWT
JWT_SECRET=change_me_in_production
JWT_EXPIRES_IN=7d

# Servidor
PORT=3000
NODE_ENV=development
```

### `frontend/.env.example`

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

---

## Licencia

Proyecto privado — © 2026 MAPS Asesores / Kondor. Todos los derechos reservados.
