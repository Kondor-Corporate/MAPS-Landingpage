# Inventario del proyecto MAPS Asesores

Documento generado para listar **carpetas y archivos** del repositorio (sin `node_modules`, `.git` ni artefactos de build `dist/`) y las **dependencias npm** declaradas e instaladas.

**Raíz considerada:** `MAPS-Landingpage/` (raíz del monorepo frontend + backend).

---

## 1. Estructura de carpetas y archivos

Las carpetas aparecen como nodos del árbol; los archivos van indicados bajo cada rama con una breve descripción.

```
MAPS-Landingpage/
│
├── .gitignore                          Exclusiones Git (Node, Vite, env, Prisma generado, IDEs, etc.)
├── README.md                           Documentación principal del proyecto y setup
├── docker-compose.yml                  Servicio PostgreSQL 16 para desarrollo local
│
├── backend/
│   ├── .env.example                    Plantilla de variables (DATABASE_URL, PORT, NODE_ENV)
│   ├── package.json                    Manifest npm del backend
│   ├── package-lock.json               Lockfile de dependencias resueltas por npm
│   ├── tsconfig.json                   Configuración TypeScript (ESM, outDir dist)
│   │
│   ├── prisma/
│   │   ├── schema.prisma               Esquema Prisma (datasource PostgreSQL, modelo User inicial)
│   │   └── migrations/
│   │       └── .gitkeep                Carpeta de migraciones versionadas (placeholder Git)
│   │
│   └── src/
│       ├── server.ts                   Punto de entrada: loadEnv + listen HTTP
│       ├── app.ts                      Factory Express: CORS, JSON, /api/v1, error handler
│       │
│       ├── api/v1/
│       │   ├── index.ts                Montaje de routers bajo prefijo /api/v1
│       │   └── routes/
│       │       ├── health.routes.ts    GET /health
│       │       ├── auth.routes.ts      Rutas auth (vacías, pendiente implementación)
│       │       ├── producers.routes.ts Rutas productores (vacías)
│       │       ├── admins.routes.ts    Rutas administradores (vacías)
│       │       ├── news.routes.ts      Rutas noticias (vacías)
│       │       └── library.routes.ts   Rutas biblioteca digital (vacías)
│       │
│       ├── controllers/
│       │   ├── health.controller.ts    Handler JSON status + timestamp
│       │   ├── auth.controller.ts        Stubs auth
│       │   ├── producers.controller.ts   Stubs productores
│       │   ├── admins.controller.ts      Stubs administradores
│       │   ├── news.controller.ts        Stubs noticias
│       │   └── library.controller.ts     Stubs biblioteca
│       │
│       ├── services/
│       │   ├── auth.service.ts           Placeholder servicio auth
│       │   ├── producers.service.ts      Placeholder servicio productores
│       │   ├── admins.service.ts         Placeholder servicio admins
│       │   ├── news.service.ts           Placeholder servicio noticias
│       │   └── library.service.ts        Placeholder servicio biblioteca
│       │
│       ├── middlewares/
│       │   ├── authenticate.ts           Stub JWT → req.user
│       │   ├── authorize.ts              Stub RBAC por roles
│       │   ├── validate.ts                 Stub validación Zod
│       │   └── errorHandler.ts           Manejo global de errores HTTP 500
│       │
│       ├── validations/
│       │   ├── auth.schema.ts            Schemas Zod login (ejemplo)
│       │   ├── producer.schema.ts        Schema Zod id productor (ejemplo)
│       │   ├── admin.schema.ts           Schema Zod id admin (ejemplo)
│       │   └── news.schema.ts            Schema Zod id noticia (ejemplo)
│       │
│       ├── types/
│       │   ├── roles.ts                  Constantes y tipo Role (PRODUCER, ADMIN, SUPERADMIN)
│       │   └── express.d.ts              Augmentación Express.Request con user JWT
│       │
│       └── config/
│           └── env.ts                    Validación de variables de entorno con Zod
│
└── frontend/
    ├── .env.example                      Plantilla VITE_API_BASE_URL
    ├── index.html                        HTML raíz Vite
    ├── package.json                      Manifest npm del frontend
    ├── package-lock.json                 Lockfile de dependencias resueltas por npm
    ├── vite.config.ts                    Config Vite + plugin React + alias @ → src
    ├── tsconfig.json                     TS estricto, JSX react-jsx, paths @/*
    ├── tsconfig.node.json                TS para vite.config.ts
    ├── tailwind.config.ts                Config Tailwind (content paths)
    ├── postcss.config.js                 PostCSS: tailwindcss + autoprefixer
    │
    ├── public/
    │   └── .gitkeep                      Assets estáticos públicos (placeholder)
    │
    └── src/
        ├── main.tsx                      Entry React + import global CSS
        ├── index.css                     Directivas Tailwind (@tailwind base/components/utilities)
        ├── vite-env.d.ts                 Referencia tipos Vite client
        │
        ├── assets/
        │   └── .gitkeep                  Imágenes/fuentes estáticas (placeholder)
        │
        ├── shared/
        │   ├── components/.gitkeep       UI compartida entre módulos (placeholder)
        │   ├── layouts/
        │   │   ├── PublicLayout.tsx      Layout web pública
        │   │   ├── AppLayout.tsx         Layout intranet/admin (sidebar)
        │   │   └── AuthLayout.tsx        Layout login split-screen
        │   ├── hooks/.gitkeep            Hooks compartidos (placeholder)
        │   ├── services/.gitkeep         Cliente API / servicios (placeholder)
        │   ├── store/.gitkeep            Estado global Zustand (placeholder)
        │   ├── types/.gitkeep            Tipos TS compartidos (placeholder)
        │   ├── utils/.gitkeep            Utilidades (placeholder)
        │   └── constants/.gitkeep        Constantes (rutas, roles, etc.) (placeholder)
        │
        ├── modules/
        │   ├── public-web/
        │   │   ├── pages/
        │   │   │   ├── HomePage.tsx              Landing
        │   │   │   └── ProducerProfilePage.tsx   Perfil público productor
        │   │   ├── components/
        │   │   │   ├── HeroSection.tsx
        │   │   │   ├── WhyUsSection.tsx
        │   │   │   ├── NewsPreviewSection.tsx
        │   │   │   ├── FindAdvisorMap.tsx
        │   │   │   ├── TeamSection.tsx
        │   │   │   └── CtaSection.tsx
        │   │   └── hooks/.gitkeep
        │   │
        │   ├── intranet/
        │   │   ├── pages/
        │   │   │   ├── DashboardPage.tsx
        │   │   │   ├── DigitalLibraryPage.tsx
        │   │   │   └── MyProfilePage.tsx
        │   │   ├── components/
        │   │   │   ├── AccessCard.tsx
        │   │   │   ├── LibraryCard.tsx
        │   │   │   ├── RecentNewsCard.tsx
        │   │   │   ├── LibraryCategoryGrid.tsx
        │   │   │   └── ProducerProfileForm.tsx
        │   │   └── hooks/.gitkeep
        │   │
        │   └── admin/
        │       ├── pages/
        │       │   ├── DashboardPage.tsx
        │       │   ├── ProducersPage.tsx
        │       │   ├── InactiveProducersPage.tsx
        │       │   ├── AdminsPage.tsx
        │       │   └── NewsManagementPage.tsx
        │       ├── components/
        │       │   ├── ProducerTable.tsx
        │       │   ├── ProducerFilterModal.tsx
        │       │   ├── ProducerFormModal.tsx
        │       │   ├── ProducerViewModal.tsx
        │       │   ├── DeactivateConfirmModal.tsx
        │       │   └── NewsForm.tsx
        │       └── hooks/
        │           ├── useProducerFilters.ts
        │           └── useNewsForm.ts
        │
        └── router/
            ├── index.tsx                 Router principal (stub)
            ├── PublicRoutes.tsx          Rutas públicas (stub)
            ├── ProtectedRoutes.tsx       Rutas protegidas JWT (stub)
            └── RoleGuard.tsx             Guard por rol RBAC (stub)
```

### Notas sobre exclusiones en este inventario

| Excluido | Motivo |
|----------|--------|
| `backend/node_modules/` | Dependencias npm (miles de archivos); ver sección 2 |
| `frontend/node_modules/` | Idem |
| `frontend/dist/` | Salida de `vite build` (regenerable) |
| `.git/` | Metadatos de control de versiones |

---

## 2. Dependencias instaladas (npm)

Las versiones indicadas son las **rangos declarados** en cada `package.json`. Las versiones **exactas** instaladas están fijadas en `package-lock.json` de cada paquete.

### 2.1 Frontend (`frontend/package.json`)

#### Dependencias de producción (`dependencies`)

| Paquete | Versión declarada | Uso |
|---------|-------------------|-----|
| `react` | ^18.3.1 | Biblioteca UI |
| `react-dom` | ^18.3.1 | Renderizado DOM |

#### Dependencias de desarrollo (`devDependencies`)

| Paquete | Versión declarada | Uso |
|---------|-------------------|-----|
| `@types/node` | ^22.9.0 | Tipos TypeScript para APIs Node (p. ej. `path` en Vite) |
| `@types/react` | ^18.3.12 | Tipos TS para React |
| `@types/react-dom` | ^18.3.1 | Tipos TS para React DOM |
| `@vitejs/plugin-react` | ^4.3.4 | Plugin Vite para Fast Refresh y JSX |
| `autoprefixer` | ^10.4.20 | PostCSS: prefijos CSS automáticos |
| `postcss` | ^8.4.49 | Procesador CSS (cadena con Tailwind) |
| `tailwindcss` | ^3.4.15 | Framework CSS utility-first |
| `typescript` | ^5.6.3 | Compilador / comprobador de tipos |
| `vite` | ^5.4.11 | Bundler y dev server |

#### Scripts npm (frontend)

| Script | Comando |
|--------|---------|
| `dev` | `vite` |
| `build` | `vite build` |
| `preview` | `vite preview` |

---

### 2.2 Backend (`backend/package.json`)

#### Dependencias de producción (`dependencies`)

| Paquete | Versión declarada | Uso |
|---------|-------------------|-----|
| `@prisma/client` | ^5.22.0 | Cliente Prisma para consultas a PostgreSQL |
| `cors` | ^2.8.5 | Middleware CORS para Express |
| `express` | ^4.21.1 | Framework HTTP |
| `zod` | ^3.23.8 | Validación de esquemas (env, body, query) |

#### Dependencias de desarrollo (`devDependencies`)

| Paquete | Versión declarada | Uso |
|---------|-------------------|-----|
| `@types/cors` | ^2.8.17 | Tipos TS para `cors` |
| `@types/express` | ^4.17.21 | Tipos TS para Express |
| `@types/node` | ^22.9.0 | Tipos TS para APIs Node |
| `prisma` | ^5.22.0 | CLI Prisma (`migrate`, `generate`) |
| `tsx` | ^4.19.2 | Ejecutar TypeScript en dev (`tsx watch`) |
| `typescript` | ^5.6.3 | Compilador `tsc` para build producción |

#### Scripts npm (backend)

| Script | Comando |
|--------|---------|
| `dev` | `tsx watch src/server.ts` |
| `build` | `tsc` |
| `start` | `node dist/server.js` |
| `prisma:generate` | `prisma generate` |
| `prisma:migrate` | `prisma migrate dev` |

---

### 2.3 Dependencias transitivas

Al ejecutar `npm install` en `frontend/` y `backend/`, npm instala también **subdependencias** (dependencias de las dependencias). No se listan aquí una a una; para inspección local:

```bash
cd frontend && npm ls --all
cd ../backend && npm ls --all
```

Para ver solo paquetes de primer nivel:

```bash
npm ls --depth=0
```

---

### 2.4 Herramientas externas al package.json (documentación)

| Herramienta | Rol |
|-------------|-----|
| **Node.js** (LTS) | Runtime para frontend tooling y backend |
| **Docker / Docker Compose** | PostgreSQL local vía `docker-compose.yml` (imagen `postgres:16-alpine`) |

---

*Fin del inventario. Actualizar este archivo cuando se añadan carpetas, archivos o dependencias relevantes.*
