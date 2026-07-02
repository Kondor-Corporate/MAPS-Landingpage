# MAPS-014 — Noticias API Fullstack

Documento de diseño técnico para convertir el módulo Noticias de MOCK a REAL: backend API, admin, web pública e intranet productor.

**Estado:** Borrador
**Autor:** Tech Lead / Documentation Engineer
**Revisores:** —
**Creado:** 2026-07-01
**Última actualización:** 2026-07-01

> **UI previa:** [`docs/tdd/MAPS-007-tdd-vista-gestion-noticias.md`](./MAPS-007-tdd-vista-gestion-noticias.md) · [`docs/worklog/MAPS-007-vista-gestion-noticias.md`](../worklog/MAPS-007-vista-gestion-noticias.md)
> **Módulo vivo:** [`docs/modules/news.md`](../modules/news.md)
> **Referencias KB:** `MAPS - Estado Real del Sistema`, `MAPS - Fase 0 Alineacion Pre MAPS-014`, `MAPS - Roadmap Actualizado`
> **Auditoría previa:** `MAPS-KnowledgeBase/_imports/Auditorias/Auditoria estado actual repo.md`

---

## 1. Objetivo

Convertir el módulo de Noticias de **MOCK a REAL**, conectando backend, admin, web pública e intranet en un vertical slice coherente.

Debe cerrar la brecha crítica detectada en la auditoría MAPS-014:

| Pieza | Estado hoy |
|-------|------------|
| UI admin (`/admin/noticias`) | Implementada con Zustand + `newsMock.ts` |
| Modelo Prisma `Noticia` | Existe desde migración init; **sin `categoria`** |
| Router montado | `/api/v1/news` registrado en `v1Router` |
| Controller / service / routes | Stub o vacíos — **sin persistencia ni API operativa** |
| Home pública + dashboards | `mockNews.ts` compartido entre público e intranet |
| Detalle público | Modal con contenido **hardcodeado** |

**Resultado esperado:** un admin puede crear, publicar y gestionar noticias que persisten en PostgreSQL; la Home muestra noticias públicas reales; el dashboard intranet muestra novedades internas reales; los borradores no aparecen fuera del panel admin.

---

## 2. Contexto

### Backlog y prioridad

- **EP-06 — Gestión de noticias** en Fase 04 Notion (HU-025 a HU-031): CRUD admin, borrador/publicado, audiencia, categoría, listados.
- **HU-003 / HU-004:** noticias destacadas en Home y detalle público.
- **HU-015:** noticias internas en dashboard productor.
- Roadmap curado (`MAPS - Roadmap Actualizado`): **MAPS-014 es la siguiente feature crítica** tras Fase 0.

### Situación actual — Backend

| Área | Estado | Archivo |
|------|--------|---------|
| Modelo `Noticia` | Existe | `backend/prisma/schema.prisma` |
| Migración tabla | Existe | `20250420120000_init_maps_domain` |
| Seed noticias | **No** | `backend/prisma/seed.ts` |
| Rutas | Router vacío | `backend/src/api/v1/routes/news.routes.ts` |
| Controller | `placeholder` → 501 | `backend/src/controllers/news.controller.ts` |
| Service | `{}` | `backend/src/services/news.service.ts` |
| Validación | Stub UUID (incorrecto) | `backend/src/validations/news.schema.ts` |
| Tests | **Cero** | `backend/tests/` |

### Situación actual — Frontend admin (MAPS-007)

Ruta `/admin/noticias` con `NewsManagementDashboard` operativo en memoria:

- Crear, editar, publicar (borrador/publicado), eliminar, filtrar, paginar (client-side).
- Tipos en `frontend/src/modules/admin/types/news.ts`: `News`, `NewsCategoria`, `NewsAudiencia`, `NewsEstado`.
- Store `useNews` + `newsMock.ts` — **no hay `news.service.ts`**.

### Situación actual — Web pública

- `NewsPreviewSection` en Home consume `mockNews.ts` (3 items con gradientes CSS).
- `NewsDetailModal` abre al click pero renderiza **texto fijo** (no usa `content` del item).
- Sin ruta `/noticias/:slug`.

### Situación actual — Intranet

- `RecentNewsGrid` en `/intranet/dashboard` y `/admin/dashboard` usa el **mismo** `mockNews.ts` que la web pública.
- No existe ruta `/intranet/noticias`.
- Link "Ver todo en novedades" apunta a `/#noticias` (Home pública).

### Por qué ahora

MAPS-007 dejó una UI admin presentable que **engaña a stakeholders** (parece CMS funcional). El modelo Prisma existe pero está idle. Productores, biblioteca y auth ya siguen el patrón Route → RBAC → Service → Prisma; noticias es el hueco vertical más grande del MVP.

**Rama de trabajo:** `feature/MAPS-014-noticias-api` desde `development`.

**No usar** la rama obsoleta `feature/audit-front-back-routes` (superseded por MAPS-009…013).

---

## 3. Decisiones cerradas para MAPS-014

### Rutas

Usar la **convención real del repo**, no Notion Fase 3:

- **Base:** `/api/v1/news`
- **No** usar `/api/v1/public/news` ni `/api/v1/admin/news`.
- RBAC por endpoint (patrón `producers`, `library/ramos`).
- Sub-rutas de lectura: `/news/public`, `/news/public/:slug`, `/news/intranet`.

### Categoría

La categoría **entra en MAPS-014**.

- Agregar campo `categoria` al modelo `Noticia`.
- **Implementación recomendada:** enum Prisma `CategoriaNoticia` alineado a los 5 valores cerrados de la UI admin (`NOVEDAD`, `EVENTO`, `CIRCULAR`, `PRODUCTO`, `COMUNICADO`).
- Motivo: mismo estilo que `Visibilidad`, `RamoTipo`, `Rol` en `schema.prisma`; UI ya usa enum cerrado en `CATEGORIA_OPTIONS`.
- **No** guardar categoría en `descripcion` ni en otro campo improvisado.

### Imagen

- **No** upload real ni S3 en MAPS-014.
- **No** aceptar base64 / data URLs en API.
- Campo `imagenUrl` opcional; validar URL `https://` si se informa (mismo criterio que `gdriveUrl` en library).
- Si no hay `imagenUrl`, frontend usa **fallback visual existente** (`imageGradient` en cards públicas).

### Detalle público

- **No** crear ruta SEO `/noticias/:slug` en MAPS-014.
- Usar el **modal existente** (`NewsDetailModal`) con contenido real del item seleccionado.
- `GET /news/public/:slug` alimenta el modal vía fetch al abrir o precarga en listado.
- Ruta SEO, Open Graph y share con URL canónica → **fuera de alcance**.

### Intranet

- La intranet **no** reutiliza el listado público por accidente.
- Dashboard intranet consume `GET /news/intranet` → solo `publicada=true` + `visibilidad=INTERNA`.
- Home pública consume `GET /news/public` → solo `publicada=true` + `visibilidad=PUBLICA`.
- **Separación estricta de audiencias** en lectura (Notion Fase 04 criterios).

### Publicar / despublicar

- **MVP:** un solo `PATCH /news/:id` con campo `publicada: boolean`.
- No endpoints dedicados `/publish` / `/unpublish` en v1 (opcionales futuros).
- Admin UI: agregar acción **despublicar** además de eliminar.

### Testing

- Tests de integración backend **obligatorios** (`news.integration.test.ts`).
- Tests frontend automatizados **fuera** de MAPS-014 (toolchain Vitest incompleto en CI).
- **Checklist manual** frontend obligatorio al cerrar fases E, F, G.

### Diseño / Figma

- Antes de fases frontend (E, F, G): revisar Figma vs UI actual.
- **No** rediseñar el módulo completo en MAPS-014.
- Prioridad: conectar datos reales y eliminar mocks engañosos.
- Cambios visuales grandes quedan fuera salvo ajuste mínimo para loading/error/empty o cumplir flujo real.

---

## 4. Alcance funcional

### Admin

Debe permitir:

- Listar todas las noticias (borradores incluidos).
- Crear noticia (borrador por defecto).
- Editar noticia existente.
- Guardar como borrador (`publicada=false`).
- Publicar (`publicada=true`, set `publicadaEn` si vacío).
- Despublicar (`publicada=false`).
- Eliminar (hard delete — acción ya existe en UI).
- Ver detalle / preview en modal.
- Ver estado (borrador/publicado) y audiencia (Pública/Interna).
- Filtrar por audiencia, estado, categoría, fechas (client-side en v1; query server-side opcional).
- Manejar **loading**, **error** y **empty** states.

### Web pública

Debe permitir:

- Mostrar solo noticias `publicada=true` + `visibilidad=PUBLICA`.
- Reemplazar `mockNews.ts` en `NewsPreviewSection`.
- Abrir modal de detalle con **contenido real** (`contenido`, `descripcion`, `titulo`, `categoria`, `imagenUrl`).
- No mostrar borradores ni noticias internas.
- Fallback visual si no hay imagen.

### Intranet productor

Debe permitir:

- Mostrar solo noticias `publicada=true` + `visibilidad=INTERNA` en dashboard.
- Reemplazar `mockNews.ts` en `RecentNewsGrid` **solo en intranet** (fuente distinta a Home).
- No mostrar borradores ni depender del mock público.
- Auth JWT requerida (`PRODUCTOR`, `ADMIN`, `SUPERADMIN`).

### Backend

Debe implementar:

- CRUD admin bajo `/api/v1/news`.
- Endpoints de lectura pública e intranet.
- Validaciones Zod (reemplazar stub UUID).
- RBAC por endpoint.
- Generación automática de `slug` desde título.
- Manejo de `publicada` / `publicadaEn`.
- `autorId` desde usuario autenticado en `POST`.
- Tests de integración.

---

## 5. Fuera de alcance

Queda **explícitamente fuera** de MAPS-014:

- Upload real de imágenes / S3 / storage para portadas.
- Editor rich text avanzado (toolbar MAPS-007 sigue decorativo).
- Ruta SEO `/noticias/:slug` y navegación por URL.
- Open Graph, metadatos SEO, analytics.
- Notificaciones push al publicar.
- Auditoría avanzada de acciones editoriales.
- Contacto / sumate, admins API, SELF, deploy/release.
- E2E Playwright (MAPS-017).
- Tests frontend automatizados en CI.
- Paginación/filtros server-side admin (client-side aceptable en v1).
- Rama `feature/audit-front-back-routes`.
- Rediseño visual completo vs Figma.

---

## 6. Modelo de dominio actual y cambios esperados

### Campos actuales (`Noticia` en `schema.prisma`)

| Campo | Tipo Prisma | Notas |
|-------|-------------|-------|
| `id` | `Int` autoincrement | PK |
| `titulo` | `String` | Requerido |
| `slug` | `String` @unique | Generado en backend |
| `descripcion` | `String?` | Bajada/resumen opcional |
| `contenido` | `String` | Cuerpo |
| `imagenUrl` | `String?` | `@map("imagen_url")` |
| `publicada` | `Boolean` | default `false` |
| `publicadaEn` | `DateTime?` | `@map("publicada_en")` |
| `visibilidad` | `Visibilidad` | `INTERNA` \| `PUBLICA`; default `PUBLICA` |
| `autorId` | `Int` | FK → `Usuario` |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |

Índices existentes: `[autorId]`, `[publicada, visibilidad]`.

### Cambio propuesto — `categoria`

**Enum Prisma** `CategoriaNoticia` (nuevo):

```prisma
enum CategoriaNoticia {
  NOVEDAD
  EVENTO
  CIRCULAR
  PRODUCTO
  COMUNICADO
}
```

**Campo en `Noticia`:**

```prisma
categoria CategoriaNoticia @default(NOVEDAD)
```

Motivo enum vs string: categorías **cerradas** en `frontend/src/modules/admin/types/news.ts` (`NewsCategoria`); coherencia con `Visibilidad`, `RamoTipo`, `Rol`.

**Migración:** nueva migración Prisma (no editar migración init).

**Seed demo (recomendado):** 2–3 noticias `PUBLICA` publicadas, 2 `INTERNA` publicadas, 1 borrador — asignadas al usuario `admin` como autor.

---

## 7. DTOs y mapeo de datos

### Tabla de campos

| Campo | Prisma | API DTO | Admin UI | Public UI | Intranet UI | Observación |
|-------|--------|---------|----------|-----------|-------------|-------------|
| `id` | Int | `number` | — (mapper a string opcional) | — | — | Admin puede usar `number` en service |
| `titulo` | String | `string` | `titulo` | `title` | `title` | |
| `slug` | String | `string` | — (solo lectura admin opcional) | — | — | Detalle público vía slug en API |
| `descripcion` | String? | `string \| null` | — (opcional futuro) | excerpt en modal | excerpt en modal | MVP: usar como bajada si se envía |
| `contenido` | String | `string` | `cuerpo` | `content` | `content` | |
| `categoria` | CategoriaNoticia | enum string | `categoria` | `category` (label) | `category` (label) | API usa valores enum; UI label vía `CATEGORIA_LABEL` |
| `imagenUrl` | String? | `string \| null` | `imagenPortada` | URL o gradient fallback | URL o gradient fallback | Rechazar data URL en API |
| `publicada` | Boolean | `boolean` | `estado` BORRADOR/PUBLICADO | — (filtro implícito) | — (filtro implícito) | `false`↔BORRADOR, `true`↔PUBLICADO |
| `publicadaEn` | DateTime? | ISO string \| null | `fechaPublicacion` | `date` (relativo) | `date` (relativo) | Formatear en frontend |
| `visibilidad` | Visibilidad | `PUBLICA` \| `INTERNA` | `audiencia` PUBLICO/PRODUCTORES | — | — | PUBLICO↔PUBLICA, PRODUCTORES↔INTERNA |
| `autorId` | Int | `number` | — | — | — | Set en POST; no editable |
| `createdAt` | DateTime | ISO string | — | — | — | |
| `updatedAt` | DateTime | ISO string | `ultimaModificacion` | — | — | |

### Mapeos admin (`frontend/src/modules/admin/lib/mapNews.ts` — nuevo)

```text
estado BORRADOR     ↔ publicada false
estado PUBLICADO    ↔ publicada true
audiencia PUBLICO   ↔ visibilidad PUBLICA
audiencia PRODUCTORES ↔ visibilidad INTERNA
imagenPortada       ↔ imagenUrl (solo https:// o null)
cuerpo              ↔ contenido
```

### Mapeos público / intranet (`frontend/src/modules/public-web/lib/mapPublicNews.ts` — nuevo)

```text
titulo      → title
categoria   → category (CATEGORIA_LABEL)
publicadaEn → date (Intl/es-AR relativo)
contenido   → content
imagenUrl   → imageUrl; si null → imageGradient determinístico por id/slug
descripcion → excerpt (modal)
```

---

## 8. Reglas de negocio

1. Solo **ADMIN** y **SUPERADMIN** pueden crear, editar, publicar, despublicar y eliminar noticias.
2. **PRODUCTOR** no administra noticias (403 en mutaciones y listado admin).
3. **Público anónimo** solo ve noticias con `publicada=true` AND `visibilidad=PUBLICA`.
4. **Intranet autenticada** solo ve noticias con `publicada=true` AND `visibilidad=INTERNA`.
5. **Borradores** (`publicada=false`) nunca aparecen fuera del panel admin.
6. **Publicar:** `publicada=true`; si `publicadaEn` es null, setear a `now()`.
7. **Despublicar:** `publicada=false`; `publicadaEn` puede conservarse (histórico) o null — **recomendado conservar** para auditoría simple.
8. **Eliminar:** hard `DELETE` (acción UI existente); **no reemplaza** despublicar — ambos flujos coexisten.
9. **Slug:** generado automáticamente desde `titulo` (slugify: minúsculas, sin acentos, guiones).
10. **Slug único:** en conflicto, agregar sufijo numérico (`-2`, `-3`, …) — ver §17 si el equipo prefiere 409.
11. **`imagenUrl`:** opcional; si presente, debe ser URL `https://` válida.
12. **No** se aceptan data URLs / base64 en API.
13. **`autorId`:** tomado de `req.user.id` en `POST`; no enviable en body.
14. **`categoria`:** requerida en create; validada contra enum.
15. **`titulo`:** mínimo 5 caracteres (alinear validación admin UI).
16. **`contenido`:** mínimo 20 caracteres en create (alinear admin UI).

---

## 9. Contrato API propuesto

Prefijo: `/api/v1`. Envelope estándar: `{ data, message, error }`.

Errores comunes: `401` sin token, `403` rol incorrecto, `404` no encontrado, `409` conflicto (si se elige), `422` validación Zod.

### Público (sin auth)

#### `GET /news/public`

| | |
|---|---|
| **Auth** | Ninguna |
| **Query** | `limit?: number` (default 6, max 20), `page?: number` (opcional v1) |
| **Respuesta 200** | `{ data: PublicNewsItem[], message: "OK", error: null }` |
| **Filtro servidor** | `publicada=true`, `visibilidad=PUBLICA` |
| **Orden** | `publicadaEn DESC`, fallback `updatedAt DESC` |

**PublicNewsItem (lectura):**

```json
{
  "slug": "maps-expande-cobertura",
  "titulo": "...",
  "descripcion": "...",
  "contenido": "...",
  "categoria": "NOVEDAD",
  "imagenUrl": "https://...",
  "publicadaEn": "2026-06-01T12:00:00.000Z"
}
```

#### `GET /news/public/:slug`

| | |
|---|---|
| **Auth** | Ninguna |
| **Params** | `slug` string (regex: `[a-z0-9]+(?:-[a-z0-9]+)*`) |
| **Respuesta 200** | `{ data: PublicNewsItem, ... }` |
| **404** | Slug inexistente, borrador, o visibilidad INTERNA |

---

### Intranet (auth)

#### `GET /news/intranet`

| | |
|---|---|
| **Auth** | Bearer JWT |
| **Roles** | `PRODUCTOR`, `ADMIN`, `SUPERADMIN` |
| **Query** | `limit?: number` (default 6) |
| **Respuesta 200** | `{ data: PublicNewsItem[], ... }` (mismo DTO lectura) |
| **Filtro servidor** | `publicada=true`, `visibilidad=INTERNA` |

---

### Admin (auth)

#### `GET /news`

| | |
|---|---|
| **Auth** | Bearer JWT |
| **Roles** | `ADMIN`, `SUPERADMIN` |
| **Query** | `publicada?: boolean`, `visibilidad?: PUBLICA\|INTERNA`, `categoria?: CategoriaNoticia`, `q?: string` (opcional v1) |
| **Respuesta 200** | `{ data: NewsAdminDto[], ... }` — incluye borradores |

**NewsAdminDto:** todos los campos Prisma + opcional `autor: { id, usuario }` en lectura.

#### `GET /news/:id`

| | |
|---|---|
| **Auth** | ADMIN, SUPERADMIN |
| **Params** | `id` Int positivo |
| **200** | `NewsAdminDto` |
| **404** | No existe |

#### `POST /news`

| | |
|---|---|
| **Auth** | ADMIN, SUPERADMIN |
| **Body** | `createNewsSchema` (ver §10) |
| **201** | `NewsAdminDto` |
| **422** | Validación |
| **Side effects** | Genera `slug`; set `autorId` desde JWT; default `publicada=false` |

#### `PATCH /news/:id`

| | |
|---|---|
| **Auth** | ADMIN, SUPERADMIN |
| **Body** | `updateNewsSchema` — incluye `publicada: true/false` para publicar/despublicar |
| **200** | `NewsAdminDto` |
| **404** | No existe |
| **422** | Body vacío o inválido |

Al pasar `publicada: true` con `publicadaEn` null en DB → set `publicadaEn = now()`.

#### `DELETE /news/:id`

| | |
|---|---|
| **Auth** | ADMIN, SUPERADMIN |
| **204** | Sin body |
| **404** | No existe |

---

## 10. Validaciones Zod

Archivo: `backend/src/validations/news.schema.ts` — **reemplazar** stub UUID.

### Helpers

```typescript
const httpsUrlSchema = z.string().trim().url().refine(u => u.startsWith('https://'));
const categoriaNoticiaSchema = z.enum(['NOVEDAD','EVENTO','CIRCULAR','PRODUCTO','COMUNICADO']);
const visibilidadSchema = z.enum(['PUBLICA','INTERNA']);
```

### `createNewsSchema`

```typescript
z.object({
  titulo: z.string().trim().min(5),
  contenido: z.string().trim().min(20),
  descripcion: z.string().trim().optional().nullable(),
  categoria: categoriaNoticiaSchema,
  visibilidad: visibilidadSchema,
  imagenUrl: httpsUrlSchema.optional().nullable(),
  publicada: z.boolean().optional(), // default false en service
}).strict();
```

- `slug`, `autorId`, `publicadaEn` — **no** en body create (server-side).
- Campos extra → 422 (`.strict()`).

### `updateNewsSchema`

```typescript
createNewsSchema.partial().strict().refine(
  obj => Object.keys(obj).length > 0,
  { message: 'Se requiere al menos un campo' }
);
```

### Params

```typescript
newsIdParamSchema = z.object({ id: z.coerce.number().int().positive() });
newsSlugParamSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});
```

### Query

```typescript
listNewsAdminQuerySchema = z.object({
  publicada: z.enum(['true','false']).optional().transform(...),
  visibilidad: visibilidadSchema.optional(),
  categoria: categoriaNoticiaSchema.optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

listNewsPublicQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(20).optional(),
});
```

### Rechazo imagen base64

Refine en `imagenUrl`:

```typescript
.refine(u => !u.startsWith('data:'), { message: 'No se permiten data URLs' })
```

**Nota:** el schema actual con `id: z.string().uuid()` es **incorrecto** — Prisma usa `Int`; usar `z.coerce.number().int().positive()` como en `library.schema.ts` / `producer.schema.ts`.

---

## 11. RBAC

| Endpoint | Público | PRODUCTOR | ADMIN | SUPERADMIN |
|----------|---------|-----------|-------|------------|
| `GET /news/public` | ✅ | ✅ (sin token) | ✅ (sin token) | ✅ (sin token) |
| `GET /news/public/:slug` | ✅ | ✅ | ✅ | ✅ |
| `GET /news/intranet` | ❌ 401 | ✅ | ✅ | ✅ |
| `GET /news` | ❌ 401 | ❌ 403 | ✅ | ✅ |
| `GET /news/:id` | ❌ 401 | ❌ 403 | ✅ | ✅ |
| `POST /news` | ❌ 401 | ❌ 403 | ✅ | ✅ |
| `PATCH /news/:id` | ❌ 401 | ❌ 403 | ✅ | ✅ |
| `DELETE /news/:id` | ❌ 401 | ❌ 403 | ✅ | ✅ |

**Borradores:** visibles solo vía endpoints admin (`GET /news`, `GET /news/:id`).

**Implementación:** `authenticate` + `authorize(Rol.ADMIN, Rol.SUPERADMIN)` en rutas admin; `authorize(Rol.PRODUCTOR, Rol.ADMIN, Rol.SUPERADMIN)` en `/news/intranet`; rutas `/news/public*` sin middleware auth.

**Orden de registro en router:** declarar `/public`, `/public/:slug`, `/intranet` **antes** de `/:id` para evitar colisiones.

---

## 12. Impacto frontend

### Admin

| Cambio | Detalle |
|--------|---------|
| **Nuevo** | `frontend/src/modules/admin/services/news.service.ts` — patrón `library.service.ts` |
| **Nuevo** | `frontend/src/modules/admin/lib/mapNews.ts` — API ↔ UI |
| **Nuevo** | `frontend/src/modules/admin/hooks/useAdminNews.ts` — async, loading, error, refetch, mutaciones |
| **Modificar** | `NewsManagementDashboard.tsx` — usar hook API en lugar de `useNews` Zustand |
| **Modificar** | `NewsImageUploader.tsx` — input URL https (o mantener file picker deshabilitado + campo URL) |
| **Modificar** | `NewsPublishActionsCard` / tabla — acción **Despublicar** (`PATCH publicada=false`) |
| **Retirar del flujo** | `newsMock.ts`, `useNews.ts` Zustand como fuente principal |
| **Mantener** | Componentes MAPS-007: form, tabla, filtros, modales, badges |
| **Estados** | Loading skeleton/spinner, error con retry, empty en tabla |

**Revisión Figma:** antes de Fase E — comparar formulario, tabla y badges; solo ajustes necesarios.

### Web pública

| Cambio | Detalle |
|--------|---------|
| **Nuevo** | `frontend/src/modules/public-web/services/news.service.ts` — `listPublicNews()`, `getPublicNewsBySlug()` |
| **Nuevo** | `frontend/src/modules/public-web/lib/mapPublicNews.ts` |
| **Modificar** | `NewsPreviewSection.tsx` — fetch `/news/public`; loading/empty |
| **Modificar** | `NewsDetailModal.tsx` — renderizar `contenido`/`descripcion` del item; eliminar lorem hardcodeado |
| **Modificar** | `newsModalStore.ts` — tipo enriquecido con content real |
| **Retirar** | Dependencia de `mockNews.ts` en Home |

**Revisión Figma:** antes de Fase F — sección `#noticias` y modal.

### Intranet

| Cambio | Detalle |
|--------|---------|
| **Nuevo** | `frontend/src/modules/intranet/services/news.service.ts` o reexport admin/public service con token |
| **Modificar** | `RecentNewsGrid.tsx` — aceptar prop `source: 'public' \| 'intranet'` o componentes separados |
| **Modificar** | `DashboardPage.tsx` intranet — `GET /news/intranet` |
| **Modificar** | `DashboardPage.tsx` admin — `GET /news` (últimas N) o subset; **no** usar mock público |
| **Retirar** | Uso compartido de `mockNews.ts` en intranet |

**Revisión Figma:** antes de Fase G — bloque "Comunicados Recientes".

---

## 13. Testing

### Backend — `backend/tests/news.integration.test.ts`

Patrón: `producers.integration.test.ts` + `createApp()` + `loginUsuarioPassword`.

#### Auth / RBAC

- [ ] `GET /news` sin token → 401
- [ ] `GET /news` con PRODUCTOR → 403
- [ ] `GET /news` con ADMIN → 200
- [ ] `POST /news` sin token → 401
- [ ] `POST /news` con PRODUCTOR → 403
- [ ] `POST /news` con ADMIN → 201
- [ ] `POST /news` con SUPERADMIN → 201

#### Admin CRUD

- [ ] POST borrador → `publicada=false`, `publicadaEn=null`
- [ ] PATCH `publicada=true` → `publicadaEn` set
- [ ] PATCH editar titulo/contenido/categoria
- [ ] PATCH `publicada=false` (despublicar)
- [ ] DELETE → 204; GET posterior → 404
- [ ] GET `/news/:id` existente → 200
- [ ] GET `/news/:id` inexistente → 404

#### Validaciones

- [ ] Body inválido (titulo corto) → 422
- [ ] `id` param no numérico → 422
- [ ] `imagenUrl` data URL → 422
- [ ] Campos extra en body → 422
- [ ] PATCH body vacío → 422

#### Slug

- [ ] Slug auto-generado desde titulo
- [ ] Segundo create mismo titulo → slug único (suffix o 409 según decisión §17)

#### Lectura pública

- [ ] `GET /news/public` sin auth → 200
- [ ] Solo `publicada=true` + `PUBLICA`
- [ ] Borrador PUBLICA no listada
- [ ] INTERNA publicada no listada
- [ ] `GET /news/public/:slug` válido → 200
- [ ] Borrador / INTERNA / slug inexistente → 404

#### Lectura intranet

- [ ] `GET /news/intranet` sin token → 401
- [ ] PRODUCTOR → solo INTERNAS publicadas
- [ ] No incluye borradores
- [ ] No incluye PUBLICA (separación estricta)

### Frontend — checklist manual (obligatorio)

- [ ] Admin: crear borrador → persiste tras refresh
- [ ] Admin: publicar → visible según audiencia
- [ ] Admin: despublicar → desaparece de Home/intranet
- [ ] Admin: eliminar → removida de listado
- [ ] Home: solo noticias PUBLICA publicadas
- [ ] Modal Home: contenido real (no lorem)
- [ ] Intranet dashboard: solo INTERNAS publicadas
- [ ] Borrador no visible fuera de admin
- [ ] Loading/error/empty razonables en admin y Home
- [ ] Imagen URL válida se muestra; sin URL → gradient fallback

---

## 14. Plan de implementación por fases

### Fase A — TDD y contrato

**Entrega:** este documento revisado y aprobado.

**Commit sugerido:** `docs(maps-014): documentar TDD de noticias`

---

### Fase B — DB / schema / seed

**Entrega:**

- Migración enum `CategoriaNoticia` + campo en `Noticia`
- `news.schema.ts` Zod completo (sin UUID)
- Seed demo opcional (5 noticias)

**Commit sugerido:** `feat(db): preparar modelo y seed de noticias`

---

### Fase C — Backend API

**Entrega:**

- `news.service.ts` — Prisma, slugify, reglas publicación
- `news.controller.ts` — handlers + DTO
- `news.routes.ts` — rutas + middlewares
- Slug helper en `backend/src/lib/slugify.ts` (o inline si trivial)

**Commit sugerido:** `feat(api): implementar endpoints de noticias`

---

### Fase D — Tests backend

**Entrega:**

- `news.integration.test.ts` — casos §13 en verde
- CI pasa `npm test` backend

**Commit sugerido:** `test(api): agregar integración de noticias`

---

### Fase E — Admin frontend

**Entrega:**

- `news.service.ts`, `mapNews.ts`, `useAdminNews.ts`
- Dashboard conectado; mock retirado del flujo principal
- Despublicar + URL imagen
- Revisión Figma previa documentada en PR

**Commit sugerido:** `feat(admin): conectar gestión de noticias a la API`

---

### Fase F — Web pública

**Entrega:**

- Home con `/news/public`
- Modal con contenido real
- Revisión Figma previa

**Commit sugerido:** `feat(public): mostrar noticias reales en home`

---

### Fase G — Intranet

**Entrega:**

- Dashboard intranet con `/news/intranet`
- Separación PUBLICA/INTERNA
- Admin dashboard sin mock público

**Commit sugerido:** `feat(intranet): conectar novedades internas`

---

### Fase H — Docs / worklog

**Entrega:**

- Actualizar `docs/modules/news.md`
- Worklog `docs/worklog/MAPS-014-noticias-api-fullstack.md`
- Este TDD → Estado **Implementado** + links PR
- KB Obsidian si aplica (fuera del repo)

**Commit sugerido:** `docs(maps-014): cerrar documentación de noticias`

---

## 15. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| UI mock engañosa en demos | Alta | Alto | MAPS-014 prioritario; comunicar hasta merge |
| Modelo sin `categoria` | Alta | Medio | Migración Fase B antes de API |
| Admin uploader guarda base64 | Media | Alto | Validar https en API; adaptar UI a URL |
| Rutas Notion `/admin/news` vs repo | Media | Bajo | Documentado en TDD — usar `/news` |
| Slug conflictivo | Media | Medio | Suffix automático (default) |
| Modal con lorem hardcodeado | Alta | Alto | Fase F obligatoria antes de demo pública |
| Intranet comparte mock público | Alta | Alto | Fase G + endpoint `/intranet` |
| Frontend tests huérfanos | Baja | Medio | Checklist manual; MAPS-017 |
| Scope creep (contacto, SELF, admins) | Media | Alto | §5 fuera de alcance explícito |
| Rama audit-front-back-routes | Baja | Alto | No portar; archivar decisión KB |

---

## 16. Criterios de aceptación

MAPS-014 se considera **aceptado** cuando:

- [ ] Admin crea noticia borrador y persiste tras refresh.
- [ ] Admin publica noticia (`publicada=true`, `publicadaEn` set).
- [ ] Admin despublica noticia (`publicada=false`).
- [ ] Admin elimina noticia (hard delete).
- [ ] PRODUCTOR no puede crear/editar/eliminar vía API (403).
- [ ] Anónimo no accede a listado admin (401).
- [ ] Home muestra **solo** PUBLICA + publicada.
- [ ] Intranet dashboard muestra **solo** INTERNA + publicada.
- [ ] Borrador no aparece en Home ni intranet.
- [ ] Modal público muestra `contenido` real de la noticia seleccionada.
- [ ] Validaciones Zod rechazan body inválido e imagen data URL.
- [ ] `news.integration.test.ts` pasa en CI.
- [ ] Flujos principales admin/Home/intranet **no dependen** de `newsMock.ts` ni `mockNews.ts`.
- [ ] `docs/modules/news.md` y worklog actualizados.

---

## 17. Preguntas abiertas

Solo las que requieren confirmación del equipo antes o durante implementación:

| # | Pregunta | Recomendación TDD | Responsable |
|---|----------|-------------------|-------------|
| 1 | ¿`categoria` como enum Prisma o string validado? | **Enum** `CategoriaNoticia` | Tech Lead — confirmar en review PR Fase B |
| 2 | ¿Slug conflictivo: suffix automático o 409? | **Suffix** (`titulo-2`) | Backend dev |
| 3 | ¿DELETE físico, despublicar, o ambos? | **Ambos** — DELETE hard + PATCH despublicar | Producto |
| 4 | ¿Seed demo entra en MAPS-014? | **Sí** — facilita QA y tests | Backend dev |
| 5 | ¿Admin dashboard usa `GET /news` o subset? | **`GET /news?limit=6`** orden reciente (todas audiencias) | Frontend dev |
| 6 | ¿Qué ajustes Figma son obligatorios vs opcionales? | Documentar diff en PR Fase E/F/G | Diseño + frontend |

---

## 18. Revisión Figma

### Cuándo

**Antes de Fase E (admin), Fase F (pública) y Fase G (intranet)** — no antes del TDD.

### Proceso

1. Abrir board MAPS-007 / Home / Dashboard intranet en Figma.
2. Comparar con implementación actual (`NewsManagementDashboard`, `NewsPreviewSection`, `RecentNewsGrid`, `NewsDetailModal`).
3. Documentar diferencias relevantes en descripción del PR de cada fase (tabla breve: componente | Figma | código | acción).
4. **No** rediseñar módulos completos.
5. Aplicar solo ajustes necesarios para:
   - estados loading / error / empty;
   - campo imagen como URL (si Figma asumía upload);
   - contenido real en modal (eliminar placeholder);
   - separación visual intranet vs público si aplica.

### Fuera de revisión MAPS-014

- Nueva página `/noticias/:slug`
- Rediseño tipográfico global
- Rich text toolbar funcional

---

## Referencias

| Recurso | Ruta |
|---------|------|
| Schema Prisma | `backend/prisma/schema.prisma` |
| Rutas news (stub) | `backend/src/api/v1/routes/news.routes.ts` |
| Patrón library API | `docs/tdd/MAPS-012-tdd-biblioteca-digital-api.md` |
| UI admin MAPS-007 | `docs/tdd/MAPS-007-tdd-vista-gestion-noticias.md` |
| Tipos admin | `frontend/src/modules/admin/types/news.ts` |
| Mock admin | `frontend/src/modules/admin/data/newsMock.ts` |
| Mock público | `frontend/src/shared/constants/mockNews.ts` |
| Home | `frontend/src/modules/public-web/pages/HomePage.tsx` |
| Notion EP-06 | `MAPS-KnowledgeBase/_imports/Notion/Fase 04 - Backlog y orden.md` |
| Fase 0 MAPS-014 | `MAPS-KnowledgeBase/01 - Estado Actual/MAPS - Fase 0 Alineacion Pre MAPS-014.md` |

---

*Documento en estado **Borrador**. No implementar código hasta aprobación en PR a `development`.*
