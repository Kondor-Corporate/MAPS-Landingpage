# MAPS-012 — Biblioteca Digital — API + integración frontend

Documentación de la feature **API de Biblioteca Digital y sustitución del mock en intranet y admin** dentro del proyecto MAPS Asesores. Complementa el [TDD](../tdd/MAPS-012-tdd-biblioteca-digital-api.md), el [README raíz](../../README.md) y la UI de [MAPS-011](./MAPS-011-biblioteca-digital.md).

---

## Objetivo

Conectar `/intranet/biblioteca` y `/admin/biblioteca` con persistencia real en PostgreSQL bajo `/api/v1/library/ramos`, con JWT y RBAC: **PRODUCTOR** solo lectura de ramos activos; **ADMIN** y **SUPERADMIN** con CRUD completo. Cierra el pendiente de backend dejado por MAPS-011 (`useLibraryStore`, `libraryMock.ts`), siguiendo el patrón de MAPS-009 (productores).

---

## Contexto inicial

- **MAPS-011** entregó la UI de biblioteca con Zustand y mock local.
- El backend tiene `libraryRouter` montado pero sin rutas; `Ramo` en Prisma sin campos de la UI.
- Seguridad reutilizable: `authenticate`, `authorize`, `validate` (ya usados en `/producers`).

---

## Fases planificadas

| Fase | Contenido |
|------|-----------|
| **Fase 0** | Migración Prisma, seed biblioteca + ramos, `library.schema.ts` |
| **Fase 1** | `GET /library/ramos` (+ `GET /:id` admin); hook e intranet vía API |
| **Fase 2** | POST, PATCH, PATCH activo, DELETE; dashboard admin cableado |
| **Fase 3** | Quitar mock/Zustand; actualizar docs; builds |

---

## Cambios implementados

> **Estado:** implementado (MAPS-012).

### 1. Backend — implementado

**Archivos previstos:**

- `backend/prisma/schema.prisma` — enum `RamoTipo`; campos `icono`, `gdriveUrl`, `tipo`, `activo`; `@@unique([bibliotecaId, nombre])`
- `backend/prisma/migrations/...` — migración forward
- `backend/prisma/seed.ts` — 1 `Biblioteca` + 16 ramos (datos de `libraryMock.ts`)
- `backend/src/validations/library.schema.ts` — Zod (id, list query, create, update, activo)
- `backend/src/services/library.service.ts` — list con filtro por rol; CRUD; `toLibraryRamoDto`; 409 en nombre duplicado
- `backend/src/controllers/library.controller.ts` — handlers + envelope
- `backend/src/api/v1/routes/library.routes.ts` — `intranetRead` en GET lista; `adminOnly` en resto

**Comportamiento esperado:**

- PRODUCTOR en `list`: solo `activo === true`.
- ADMIN/SUPERADMIN: listado con `?activo` opcional; mutaciones completas.

---

### 2. Frontend — implementado

**Archivos previstos:**

- `frontend/src/modules/admin/services/library.service.ts` — `listRamos`, `getRamo`, `createRamo`, `updateRamo`, `setRamoActivo`, `deleteRamo`
- `frontend/src/modules/admin/hooks/useAdminLibrary.ts` — `data`, `loading`, `error`, `refetch`, mutaciones
- `frontend/src/modules/admin/lib/mapLibraryRamo.ts` — DTO API ↔ tipo `Ramo` UI
- `frontend/src/modules/admin/components/LibraryManagementDashboard.tsx` — hook en lugar de `useLibraryStore`
- `frontend/src/modules/intranet/components/LibraryRamosSection.tsx`, `LibrarySecondarySection.tsx` — lectura vía API

**Eliminados del flujo principal (Fase 3):**

- `frontend/src/modules/admin/hooks/useLibraryStore.ts`
- `frontend/src/modules/admin/data/libraryMock.ts`

**Añadidos:**

- `frontend/src/modules/intranet/hooks/useLibraryRamos.ts` — lectura intranet con loading/error/refetch

---

## Estado del sistema tras MAPS-012

### Routing (objetivo)

```
/intranet/biblioteca  → DigitalLibraryPage    [lectura: PRODUCTOR, ADMIN, SUPERADMIN]
                          ├── LibraryHero
                          ├── LibraryRamosSection   (GET API, solo activos)
                          └── LibrarySecondarySection

/admin/biblioteca     → LibraryManagementPage  [RoleGuard: ADMIN | SUPERADMIN]
                          └── LibraryManagementDashboard (CRUD vía API)

/api/v1/library/ramos → authenticate + authorize + validate
```

### Permisos por rol

| Acción | PRODUCTOR | ADMIN | SUPERADMIN |
|--------|-----------|-------|------------|
| Ver biblioteca intranet (ramos activos) | ✓ | ✓ | ✓ |
| Explorar contenido (abrir Drive) | ✓ | ✓ | ✓ |
| Panel `/admin/biblioteca` | ✗ | ✓ | ✓ |
| `GET /library/ramos` (solo activos) | ✓ | ✓ (filtro opcional) | ✓ |
| `GET /library/ramos/:id` | ✗ | ✓ | ✓ |
| Crear / editar / activar / eliminar ramo | ✗ | ✓ | ✓ |

---

## Criterios de aceptación verificados

| Criterio | Estado |
|----------|--------|
| Productor ve solo ramos activos en intranet tras recargar (datos desde API) | OK (servicio fuerza `activo: true` para PRODUCTOR) |
| Admin CRUD persiste en PostgreSQL | OK |
| PRODUCTOR en `/admin/biblioteca` → `/unauthorized` | OK (RoleGuard MAPS-011) |
| PRODUCTOR: POST/PATCH/DELETE API → 403 | OK (`adminOnly` en mutaciones y `GET /:id`) |
| Sin token → 401 | OK (`authenticate`) |
| Nombre duplicado en biblioteca → 409 | OK (`@@unique` + `AppError 409`) |
| `gdriveUrl` no HTTPS → 422 | OK (Zod en `library.schema.ts`) |
| Builds backend y frontend sin error | OK (`npm run build`) |

---

## Pruebas manuales recomendadas

```
1. Migración y seed
   → docker + migrate + seed
   → Verificar Biblioteca id=1 y ramos en BD

2. Flujo PRODUCTOR — solo lectura
   → Login PRODUCTOR
   → GET /api/v1/library/ramos con Bearer → solo activos
   → /intranet/biblioteca → grilla y pills OK
   → POST /library/ramos → 403
   → PATCH /library/ramos/1 → 403
   → /admin/biblioteca → /unauthorized

3. Flujo ADMIN — CRUD
   → Login ADMIN
   → /admin/biblioteca → crear ramo → aparece en BD y en tabla
   → Editar gdriveUrl → persiste tras F5
   → Desactivar → no aparece en intranet (productor)
   → Eliminar → 204; desaparece de listados
   → /intranet/biblioteca → lectura de activos (sin botones de gestión)

4. Errores
   → Sin Authorization → 401
   → Crear ramo con nombre duplicado → 409
   → gdriveUrl http:// o inválida → 422
```

```bash
# Ejemplo listado (reemplazar TOKEN)
curl -s http://localhost:3000/api/v1/library/ramos \
  -H "Authorization: Bearer TOKEN"
```

---

## Pendientes fuera de esta feature

| Pendiente | Detalle |
|-----------|---------|
| Tabla `Recurso` | Múltiples archivos/links por ramo |
| Paginación / búsqueda server-side | Cuando crezca el catálogo |
| URLs Drive reales en prod | Reemplazar placeholders del seed |
| TanStack Query | Mejora futura de cache |
| Drag-and-drop de `orden` | Fuera de scope MAPS-011/012 |

---

## Relación con otros documentos

- Diseño: [`docs/tdd/MAPS-012-tdd-biblioteca-digital-api.md`](../tdd/MAPS-012-tdd-biblioteca-digital-api.md)
- UI mock (supersede datos): [`MAPS-011-biblioteca-digital.md`](./MAPS-011-biblioteca-digital.md)
- Patrón API: [`MAPS-009-admin-api-productores.md`](./MAPS-009-admin-api-productores.md)

---

*Documento creado como guía pre-implementación MAPS-012 — Biblioteca Digital API. Completar "Cambios implementados" y criterios al cerrar el código.*
