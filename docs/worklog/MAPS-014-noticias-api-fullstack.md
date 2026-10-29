# Worklog MAPS-014 — Noticias API Fullstack

Documentación de la feature **Noticias MOCK → REAL** (backend API, admin, Home pública e intranet). Complementa el [TDD](../tdd/MAPS-014-tdd-noticias-api-fullstack.md), el [módulo Noticias](../modules/news.md) y la UI previa [MAPS-007](./MAPS-007-vista-gestion-noticias.md).

---

## Resumen

MAPS-014 conectó el vertical editorial completo: migración Prisma con `CategoriaNoticia`, API REST `/api/v1/news`, 45 tests de integración backend, admin CRUD contra PostgreSQL, Home pública con noticias reales, intranet/dashboard con novedades internas, rutas `/intranet/noticias` y `/admin/novedades`, y pulido UX/UI (NewsImage, MapsSelect, MapsFeedbackToast, estado DESPUBLICADA). Los mocks `mockNews.ts` y el flujo Zustand principal fueron retirados.

---

## Rama

`feature/MAPS-014-noticias-api`

---

## Fases ejecutadas

| Fase | Contenido |
|------|-----------|
| **A** | TDD y contrato API |
| **B** | DB / schema / seed (`CategoriaNoticia`, campo `categoria`, 6 noticias demo) |
| **C** | Backend API (routes, controller, service, slugify, Zod) |
| **D** | Tests backend (`news.integration.test.ts`, 45 casos) |
| **E** | Admin conectado a API (`useAdminNews`, `news.service.ts`, `mapNews.ts`) |
| **E.1** | Estabilización admin (filtros, errores, despublicar) |
| **F** | Home pública (`usePublicNews`, modal con contenido real) |
| **G** | Intranet (`useIntranetNews`, dashboards, listados) |
| **H.1** | Pulido UX/UI (`NewsImage`, gradientes, toasts, `/intranet/noticias`, `/admin/novedades`) |
| **H.2** | Cierre documental (este worklog, TDD → Implementado, `docs/modules/news.md`) |

---

## Commits realizados

| Commit | Mensaje |
|--------|---------|
| `f324687` | `docs(maps-014): documentacion del TDD de noticias` |
| `a5bc28f` | `feat(db): preparar modelo y seed de noticias` |
| `7361687` | `feat(api): implementar endpoints de noticias` |
| `56fea09` | `test(api): agregar integración de noticias` |
| `fa86ac3` | `feat(admin): conectar gestión de noticias a la API` |
| `db91850` | `feat(public): mostrar noticias reales en home` |
| `d52c10f` | `feat(intranet): conectar novedades internas` |
| `e455c5b` | `fix(news): pulir experiencia visual de novedades` |

**Commit sugerido al mergear H.2:**

- `docs(maps-014): cerrar documentación de noticias`

---

## Cambios implementados (referencia)

### Backend

- `GET /api/v1/news/public`, `/public/:slug`, `/intranet`, `/`, `/:id`
- `POST`, `PATCH`, `DELETE /api/v1/news`
- RBAC: público sin auth; intranet PRODUCTOR+; admin ADMIN/SUPERADMIN
- Validaciones Zod; slug con sufijo; rechazo data URLs en `imagenUrl`

### Frontend

- Admin: `useAdminNews`, servicios y mappers; estado DESPUBLICADA en filtros/badges
- Público: `publicNews.service.ts`, `usePublicNews`, `NewsPreviewSection`, `NewsDetailModal`
- Intranet: `intranetNews.service.ts`, `useIntranetNews`, `IntranetNewsPage`, `RecentNewsGrid`
- Compartidos: `NewsImage`, `MapsSelect`, `MapsFeedbackToast`, `mapPublicNews.ts`
- Eliminado del flujo: `mockNews.ts`; legacy sin uso: `newsMock.ts`, `useNews.ts`

---

## Validaciones ejecutadas

Comandos estándar del repo (frontend + backend por separado):

| Comando | Ámbito | Resultado H.2 |
|---------|--------|---------------|
| `npm run typecheck` | frontend | OK |
| `npm run typecheck` | backend | OK |
| `npm run lint` | frontend | OK |
| `npm run lint` | backend | OK |
| `npm run build` | frontend | OK (`vite build`) |
| `npm run build` | backend | OK (`tsc`) |
| `npm test` | backend | Suite completa — última ejecución registrada en Fase D en verde |
| `npx vitest run tests/news.integration.test.ts` | backend | 45 tests noticias — verde en Fase D |

> H.2 no re-ejecuta la suite completa salvo necesidad; la documentación no modifica código productivo.

---

## QA manual

**Estado:** recomendado antes del PR; no ejecutado de punta a punta en H.2 automatizado.

Checklist:

| Caso | Estado |
|------|--------|
| Admin CRUD (crear, editar, eliminar) | Pendiente manual |
| Publicar / despublicar | Pendiente manual |
| Home pública — solo PUBLICA publicadas | Pendiente manual |
| Intranet dashboard — solo INTERNAS | Pendiente manual |
| Modal detalle — contenido real | Pendiente manual |
| Imágenes — URL válida y fallback gradient | Pendiente manual |
| Filtros admin (audiencia, estado, categoría) | Pendiente manual |
| Novedades internas `/intranet/noticias` | Pendiente manual |
| Admin novedades `/admin/novedades` | Pendiente manual |

---

## Riesgos / deudas

| Deuda | Detalle |
|-------|---------|
| Upload / storage | Sin upload real; solo URL https |
| SEO `/noticias/:slug` | Modal en Home; sin página indexable |
| E2E | Sin Playwright |
| Tests frontend | Sin unit/integration en CI |
| Paginación server-side | Client-side en admin v1 |
| Legacy mock | `newsMock.ts` / `useNews.ts` aún en repo |
| NewsDetailModal | Evaluar mover a shared |
| Knowledge Base Obsidian | Actualizar MOCK→REAL post-merge |

---

## Estado final

**Listo para PR** a `development` si no hay bugs manuales bloqueantes en el checklist QA.

Documentación viva:

- [`docs/modules/news.md`](../modules/news.md)
- [`docs/tdd/MAPS-014-tdd-noticias-api-fullstack.md`](../tdd/MAPS-014-tdd-noticias-api-fullstack.md)

---

*Worklog MAPS-014 — Fase H.2 cierre documental.*
