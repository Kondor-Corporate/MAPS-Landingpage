# Módulo Noticias

Documentación viva del módulo Noticias (MAPS-014).

Historial relacionado:

- UI admin inicial: [`docs/worklog/MAPS-007-vista-gestion-noticias.md`](../worklog/MAPS-007-vista-gestion-noticias.md)
- Diseño fullstack: [`docs/tdd/MAPS-014-tdd-noticias-api-fullstack.md`](../tdd/MAPS-014-tdd-noticias-api-fullstack.md)
- Cierre implementación: [`docs/worklog/MAPS-014-noticias-api-fullstack.md`](../worklog/MAPS-014-noticias-api-fullstack.md)
- Validación de contenido en uploads de imágenes (D3A): [`docs/worklog/D3A-validacion-contenido-uploads.md`](../worklog/D3A-validacion-contenido-uploads.md)
- Consistencia Storage ↔ DB (D3C): [`docs/worklog/D3C-consistencia-storage-db.md`](../worklog/D3C-consistencia-storage-db.md)

---

## Objetivo

Gestionar comunicados editoriales con persistencia en PostgreSQL: CRUD admin, publicación por audiencia (pública o interna), listados en Home, intranet y dashboards. Reemplaza los mocks `newsMock.ts` / `mockNews.ts` del flujo principal.

---

## Modelo de datos

Prisma — modelo `Noticia`:

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | `Int` | PK autoincrement |
| `titulo` | `String` | Mín. 5 caracteres (API) |
| `slug` | `String` @unique | Generado en backend; sufijo numérico si hay conflicto |
| `descripcion` | `String?` | Bajada/resumen opcional |
| `contenido` | `String` | Cuerpo; mín. 20 caracteres en create |
| `categoria` | `CategoriaNoticia` | Requerida |
| `imagenUrl` | `String?` | Portada; poblada por **upload** (`POST /news/:id/portada`), ya no por URL en el body (MAPS-019) |
| `publicada` | `Boolean` | Default `false` |
| `publicadaEn` | `DateTime?` | Set al publicar si estaba vacío |
| `visibilidad` | `Visibilidad` | `PUBLICA` \| `INTERNA` |
| `autorId` | `Int` | FK → `Usuario`; set en POST desde JWT |
| `createdAt` / `updatedAt` | `DateTime` | Auditoría básica |

Prisma — modelo `NoticiaImagen` (galería, MAPS-019; patrón `Certificacion`):

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | `Int` | PK autoincrement |
| `noticiaId` | `Int` | FK → `Noticia`, `onDelete: Cascade` |
| `url` | `String` | URL gestionada por `StorageAdapter` |
| `orden` | `Int` | Orden en el carrusel (asc); asignado por count al agregar |
| `mimeType` | `String` | `image/jpeg` \| `image/png` |
| `tamanoBytes` | `Int?` | Tamaño del archivo |
| `createdAt` | `DateTime` | |

Migraciones: `backend/prisma/migrations/20260701120000_noticia_categoria/`, `.../20260831184410_noticia_imagenes/`.

Seed demo: 6 noticias en `backend/prisma/seed.ts` (PUBLICA/INTERNA, publicadas y borrador).

---

## Categorías

Enum `CategoriaNoticia`:

| Valor | Label UI |
|-------|----------|
| `NOVEDAD` | Novedad |
| `EVENTO` | Evento |
| `CIRCULAR` | Circular |
| `PRODUCTO` | Producto |
| `COMUNICADO` | Comunicado |

---

## Visibilidad y audiencias

| Audiencia UI (admin) | Prisma | Quién la ve |
|----------------------|--------|-------------|
| Público | `PUBLICA` | Home (`GET /news/public`) — sin auth |
| Productores | `INTERNA` | Intranet (`GET /news/intranet`) — JWT PRODUCTOR+ |

Separación estricta: una noticia PUBLICA no aparece en intranet y viceversa.

---

## Estados

| Estado UI (admin) | API / DB | Visible fuera de admin |
|-------------------|----------|------------------------|
| Borrador | `publicada=false`, sin `publicadaEn` | No |
| Publicado | `publicada=true` | Sí (según visibilidad) |
| Despublicado | `publicada=false` con `publicadaEn` histórico | No |

`DESPUBLICADA` es un estado **derivado en frontend** (`mapNews.ts`); la API solo expone `publicada` boolean.

Acciones admin: publicar (`PATCH publicada=true`), despublicar (`PATCH publicada=false`), eliminar (`DELETE` hard).

---

## Endpoints backend

Prefijo: `/api/v1/news`. Envelope: `{ data, message, error }`.

| Método | Ruta | Auth | Roles | Descripción |
|--------|------|------|-------|-------------|
| `GET` | `/news/public` | No | — | Listado público: `publicada=true`, `visibilidad=PUBLICA` |
| `GET` | `/news/public/:slug` | No | — | Detalle público por slug; 404 si borrador/INTERNA/inexistente |
| `GET` | `/news/intranet` | JWT | PRODUCTOR, ADMIN, SUPERADMIN | Listado interno: `publicada=true`, `visibilidad=INTERNA` |
| `GET` | `/news` | JWT | ADMIN, SUPERADMIN | Listado admin (incluye borradores); query opcional |
| `GET` | `/news/:id` | JWT | ADMIN, SUPERADMIN | Detalle admin por id |
| `POST` | `/news` | JWT | ADMIN, SUPERADMIN | Crear noticia; default borrador |
| `PATCH` | `/news/:id` | JWT | ADMIN, SUPERADMIN | Actualizar; publicar/despublicar vía `publicada` |
| `DELETE` | `/news/:id` | JWT | ADMIN, SUPERADMIN | Eliminación física: borra la noticia/galería en DB y luego realiza cleanup best-effort de los assets gestionados |
| `POST` | `/news/:id/portada` | JWT | ADMIN, SUPERADMIN | Sube/reemplaza portada (multipart `file`, jpg/jpeg/png, 10 MB) |
| `DELETE` | `/news/:id/portada` | JWT | ADMIN, SUPERADMIN | Quita la portada (`imagenUrl=null`) |
| `POST` | `/news/:id/imagenes` | JWT | ADMIN, SUPERADMIN | Agrega una imagen a la galería (tope 10) |
| `DELETE` | `/news/:id/imagenes/:imagenId` | JWT | ADMIN, SUPERADMIN | Elimina una imagen de la galería |

El detalle (`GET /news/:id` y `GET /news/public/:slug`) incluye `galeria` (admin: `{id,url,orden}[]`; público: `string[]` de URLs). Los **listados** no incluyen galería.

Archivos: `backend/src/api/v1/routes/news.routes.ts`, `news.controller.ts`, `news.service.ts`, `validations/news.schema.ts`, `middlewares/uploadNewsImage.ts`, `lib/storage/*`.

### Imágenes y storage (MAPS-019, validación D3A)

- Portada y galería se suben como **archivo** (`.jpg/.jpeg/.png`, máx. **10 MB**) vía `StorageAdapter` (`backend/src/lib/storage/`), categoría `noticias`.
- Multer (`uploadNewsImageMiddleware`) filtra MIME declarado (`image/jpeg`, `image/png`) y tamaño; es la barrera temprana.
- Tras Multer, los services detectan el tipo por **firmas binarias** (D3A) y aplican allowlist de familia `noticia`: solo JPEG y PNG reales llegan a storage. WebP con MIME declarado `image/png` → `400`.
- Storage recibe `mimeType` canónico detectado, no `file.mimetype`.
- `NoticiaImagen.mimeType` en BD deriva de `detectedMime` vía el adapter.
- El DTO HTTP de galería sigue siendo `{ id, url, orden }` — **no** expone `mimeType` (sin cambio de contrato API por D3A).
- Provider según `STORAGE_PROVIDER` (`local` por defecto; `gcs`/`s3` disponibles). El dominio de Noticias **no** se acopla a GCP.
- En staging, `STORAGE_PROVIDER=gcs` está en uso. El dominio Noticias no se acopla a un proveedor concreto.
- La galería se muestra como **carrusel** solo en la vista completa (`NewsImageCarousel` en `NewsArticleContent`); nunca en cards/listados/preview.

Detalle de diseño D3A: [`docs/worklog/D3A-validacion-contenido-uploads.md`](../worklog/D3A-validacion-contenido-uploads.md).

### Consistencia Storage ↔ DB (D3C)

PostgreSQL es el source of truth lógico. Sin outbox, job ni transacción distribuida entre Prisma y storage. Detalle: [`docs/worklog/D3C-consistencia-storage-db.md`](../worklog/D3C-consistencia-storage-db.md).

**Portada replace** (`POST /news/:id/portada`):

- **Antes (pre-D3C):** upload → delete blob viejo → DB update.
- **Ahora:** upload → DB update → cleanup blob viejo best-effort.
- Si DB falla: se compensa el upload nuevo; la portada anterior permanece en DB.

**Quitar portada** (`DELETE /news/:id/portada`):

- `imagenUrl = null` en DB primero;
- cleanup del blob después.

**Galería create** (`POST /news/:id/imagenes`):

- `count`/tope/D3A antes del upload;
- upload → `noticiaImagen.create`;
- si `create` falla → compensar blob nuevo.

**Galería delete** (`DELETE /news/:id/imagenes/:imagenId`):

- delete de fila DB primero;
- cleanup del blob después.

**Delete noticia** (`DELETE /news/:id`):

- captura URLs de portada y galería;
- `prisma.noticia.delete` (cascade de filas `NoticiaImagen`);
- después intenta cleanup de todos los blobs capturados.

Si un cleanup falla: no impide intentar los demás; HTTP sigue `204`; el fallo queda observable en log. Un fallo de cleanup no revierte el delete en DB.

---

## Reglas de negocio

- Público anónimo ve solo `PUBLICA` + publicada.
- Intranet autenticada ve solo `INTERNA` + publicada.
- Admin ve todas (borradores incluidos) vía `GET /news`.
- Slug automático desde título con sufijo numérico en conflicto.
- Portada (`imagenUrl`) opcional; se sube como archivo y la resuelve el backend (MAPS-019). Ya no se acepta `imagenUrl` en el body de create/update.
- Galería opcional (0..10 imágenes); una noticia puede tener solo portada, o portada + galería.
- `autorId` asignado server-side en POST; no editable en body.

---

## Frontend

### Admin — gestión

- Ruta: `/admin/noticias`
- Hook: `useAdminNews` — loading, error, refetch, CRUD
- Service: `frontend/src/modules/admin/services/news.service.ts`
- Mapper: `frontend/src/modules/admin/lib/mapNews.ts`
- UI: `NewsManagementDashboard`, filtros con `MapsSelect`, toasts con `MapsFeedbackToast`, imágenes con `NewsImage`

### Home pública

- `NewsPreviewSection` → `usePublicNews` → `GET /news/public`
- `NewsDetailModal` con contenido real; gradient fallback vía `NewsImage` / `mapPublicNews.ts`

### Intranet / dashboards

- Dashboard: `RecentNewsGrid` → `useIntranetNews` → `GET /news/intranet`
- Listado completo productor: `/intranet/noticias` (`IntranetNewsPage`)
- Listado admin novedades internas: `/admin/novedades` (misma página, contexto admin)

Servicios compartidos:

- `frontend/src/shared/services/publicNews.service.ts`
- `frontend/src/shared/services/intranetNews.service.ts`
- `frontend/src/shared/lib/mapPublicNews.ts`
- `frontend/src/shared/components/NewsImage.tsx`

**Mocks retirados del flujo principal:** `mockNews.ts` eliminado; `newsMock.ts` / `useNews.ts` legacy sin uso en dashboard conectado.

---

## Testing

### Backend — integración

- Archivo: `backend/tests/news.integration.test.ts`
- **45 tests** cubriendo RBAC, CRUD, validaciones, slug, lectura pública/intranet
- Ejecutar: `npx vitest run tests/news.integration.test.ts` (desde `backend/`)
- Archivo: `backend/tests/news-imagenes.integration.test.ts` — MAPS-019 (portada/galería), validación D3A y failure windows D3C (portada, galería, delete noticia). Cierre técnico D3C: full backend **437/437 PASS**.

### Frontend

- Sin tests automatizados en CI para MAPS-014
- QA manual recomendado (ver worklog)

---

## Deudas técnicas

| Deuda | Detalle |
|-------|---------|
| Upload / storage | Portada y galería por archivo (MAPS-019). Política productiva de bucket ya operativa en staging GCS |
| Consistencia storage ↔ DB | Implementada en app-layer (D3C); reconciliación periódica futura |
| Concurrencia galería | `count`/tope y orden sin resolver en D3C |
| SEO `/noticias/:slug` | Sin página dedicada; modal + API slug |
| E2E | Sin Playwright editorial |
| Tests frontend unitarios | Pendiente toolchain CI |
| Paginación server-side | Admin filtra/pagina en cliente |
| Limpieza legacy | Retirar `newsMock.ts` y `useNews.ts` huérfanos |
| `NewsDetailModal` shared | Evaluar mover a `shared/` si se unifica intranet + público |

---

## Verificación rápida

```bash
# Backend (desde backend/)
npm run test -- tests/news.integration.test.ts

# Manual
# 1. Login ADMIN → /admin/noticias → CRUD + publicar/despublicar
# 2. Home → solo PUBLICA publicadas
# 3. Login PRODUCTOR → /intranet/dashboard → solo INTERNAS
# 4. /intranet/noticias y /admin/novedades → listados completos
```
