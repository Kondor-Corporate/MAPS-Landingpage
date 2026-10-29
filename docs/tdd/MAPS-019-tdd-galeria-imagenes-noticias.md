# MAPS-019 — TDD: Galería de imágenes y upload de portada para Noticias

Documento de diseño técnico para reemplazar el input de URL de portada por upload de archivo y sumar una galería opcional de imágenes adicionales (carrusel en vista completa) dentro del proyecto MAPS Asesores.

**Estado:** Implementado (verificación de tests backend pendiente)
**Autor:** @lucaslegor
**Revisores:** —
**Creado:** 2026-08-31
**Última actualización:** 2026-08-31

> **Implementación:** completada según este diseño. Decisiones confirmadas: carrusel desde cero (sin dependencias), `object-fit: cover`, borrado físico de archivos en storage al eliminar, límites 10 MB / 10 imágenes de galería, reordenamiento drag&drop fuera de alcance. Detalle en [`docs/worklog/MAPS-019-galeria-imagenes-noticias.md`](../worklog/MAPS-019-galeria-imagenes-noticias.md).

---

## Resumen

Hoy la portada de una noticia se carga pegando una URL `https://` externa (validada por Zod, sin upload real). Este TDD propone reemplazar ese input por una subida de archivo (`.jpg`, `.jpeg`, `.png`) reutilizando la infraestructura de storage que ya existe para fotos de perfil de productores, y sumar una entidad nueva de "galería" (0..N imágenes adicionales por noticia) que se muestra únicamente en la vista completa de la noticia, mediante un carrusel a construir desde cero (no existe ninguna librería de carrusel en el repo hoy). La integración real con Google Cloud Storage **no** es parte de este trabajo: se deja preparada la abstracción de storage ya existente (`StorageAdapter`) para que un desarrollador posterior conecte GCS sin tocar el dominio de Noticias.

---

## Objetivo

- Eliminar el input manual de URL para la portada de noticias y reemplazarlo por selección/subida de archivo desde la computadora del administrador.
- Permitir asociar 0..N imágenes adicionales opcionales ("galería") a una noticia, visibles solo en la vista completa mediante un carrusel.
- No modificar el comportamiento actual de cards, listados y modal-preview (siguen mostrando solo la portada).
- Dejar la arquitectura de almacenamiento desacoplada del dominio de Noticias, lista para conectar Google Cloud Storage en una fase posterior sin reescribir el módulo.

---

## Contexto

### Situación actual

**Backend — modelo y validación** (`backend/prisma/schema.prisma:130-149`):

```prisma
model Noticia {
  id          Int              @id @default(autoincrement())
  titulo      String
  slug        String           @unique
  descripcion String?
  contenido   String
  categoria   CategoriaNoticia
  imagenUrl   String?          @map("imagen_url")
  publicada   Boolean          @default(false)
  publicadaEn DateTime?        @map("publicada_en")
  visibilidad Visibilidad      @default(PUBLICA)
  autorId     Int
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  autor Usuario @relation(fields: [autorId], references: [id])
  @@index([autorId])
  @@index([publicada, visibilidad])
}
```

`imagenUrl` es **nullable** (portada opcional hoy) y se valida en `backend/src/validations/news.schema.ts:24-38` como URL `https://`, rechazando `data:` URLs. No existe ningún campo ni tabla para múltiples imágenes — es un único `String?`. El schema de creación/edición (`createNewsSchema`/`updateNewsSchema`) usa `.strict()`, por lo que cualquier campo nuevo (ej. `galeria`) sería rechazado con 422 hasta que se actualice explícitamente.

No hay ninguna lógica de subida de archivos en el módulo de Noticias: `news.routes.ts`, `news.controller.ts` y `news.service.ts` no referencian multer, storage adapters ni `express.static`. La portada se persiste tal cual llega como string en el body JSON.

**Backend — infraestructura de storage ya existente (para otro dominio)**: el proyecto ya tiene una abstracción de storage genérica, hoy usada solo por `Productor` (foto de perfil y certificaciones PDF):

- `backend/src/lib/storage/types.ts` — interfaz `StorageAdapter` con métodos `uploadFoto/deleteFoto/uploadCertificacion/deleteCertificacion/readPublicFile`. La categoría de archivo es una unión cerrada `'fotos' | 'certificaciones'`.
- `backend/src/lib/storage/index.ts` — `getStorageAdapter()` selecciona implementación según `env.STORAGE_PROVIDER` (`local | s3 | gcs`).
- `backend/src/lib/storage/local.adapter.ts` — implementación de disco local (dev).
- `backend/src/lib/storage/gcs.adapter.ts` — implementación real con `@google-cloud/storage` (ya en `package.json`), usa Application Default Credentials, sirve archivos vía proxy privado `/api/v1/uploads/:category/:filename`.
- `backend/src/lib/storage/s3.adapter.ts` — implementación con `@aws-sdk/client-s3`.
- `backend/src/middlewares/uploadFoto.ts` — multer en memoria, campo `'file'`, 5 MB, mimetypes `image/jpeg, image/png, image/webp`.
- Variables de entorno ya soportadas en `backend/src/config/env.ts:90-167` y `backend/.env.example`: `STORAGE_PROVIDER`, `API_PUBLIC_URL`, `GCS_BUCKET`, `GCS_PREFIX`, más las de S3.

Es decir: **la abstracción de storage y el proveedor GCS ya existen en el repo**, pero nunca fueron conectados al dominio de Noticias. Este TDD reutiliza esa abstracción en vez de crear una nueva.

**Patrón de "galería"/hijos ordenados ya existente**: el modelo `Certificacion` (`backend/prisma/schema.prisma:99-114`) es el mejor precedente — tabla hija con FK a `Productor`, campo `orden Int @default(0)`, `onDelete: Cascade`, y endpoints dedicados de alta/baja de un solo archivo (`POST/DELETE /producers/.../certificaciones[/:certId]`, ver `backend/src/api/v1/routes/producers.routes.ts:133-153,201-225`). Este TDD propone modelar la galería de noticias con el mismo patrón.

**Frontend — portada como URL de texto**: `frontend/src/modules/admin/components/NewsImageUploader.tsx` es hoy un `<input type="url">` con validación https en cliente; el propio código deja un comentario explícito: *"el upload real queda pendiente para una fase de storage"*. No hay `<input type="file">` en ningún componente de Noticias.

**Frontend — patrones de upload ya existentes para reutilizar como referencia visual**:

- `frontend/src/shared/components/profile/ProfileHeaderCard.tsx:98-149` — avatar con `<input type="file" accept="image/jpeg,image/png,image/webp">` oculto, disparado al hacer click, validación de mimetype/tamaño en cliente, estado `uploading` con spinner, prop `onUploadFoto?: (file: File) => Promise<void>`.
- `frontend/src/shared/components/profile/ProducerCertificationsManager.tsx:117-158` — subida de PDF con contenedor `border-dashed border-maps-border`, mismo patrón visual que ya usa `NewsImageUploader` hoy.

**Frontend — todos los consumidores actuales de la portada** (campo `imagenPortada` en admin, `imagenUrl` en el DTO de API, `imageUrl`/`imageGradient` en el modelo público), vía el componente compartido `NewsImage.tsx`:

| Contexto | Archivo |
|---|---|
| Tabla/listado admin | `frontend/src/modules/admin/components/RecentNewsTable.tsx:23-30` |
| Modal preview admin (solo lectura) | `frontend/src/modules/admin/components/NewsViewModal.tsx:23-28` |
| Formulario (editable) | `frontend/src/modules/admin/components/NewsForm.tsx:180-190` → `NewsImageUploader.tsx` |
| Card pública (listado) | `frontend/src/modules/public-web/components/PublicNewsCard.tsx:18-24` |
| Card compartida (Home/intranet/dashboards) | `frontend/src/shared/components/RecentNewsCard.tsx:44-51` |
| Hero de vista completa (pública) | `frontend/src/modules/public-web/components/NewsArticleContent.tsx:19-24` — **objetivo principal para agregar el carrusel** |
| Thumbnail relacionado en modal | `frontend/src/modules/public-web/components/NewsDetailModal.tsx:10-19` |

`NewsArticleContent.tsx` es compartido entre la página standalone `NewsDetailPage.tsx` (`/noticias/:slug`) y el modal de preview rápido `NewsDetailModal.tsx` — es el único lugar donde hoy se renderiza el detalle completo de una noticia, y por lo tanto el punto de inserción natural del carrusel.

**No existe ninguna librería de carrusel/slider en el proyecto** (confirmado por búsqueda de `swiper|embla|keen-slider|react-slick` en código y `package.json` — cero resultados). Habrá que construirlo desde cero o incorporar una dependencia liviana.

**Audiencia** ya está modelada vía el enum `Visibilidad` (`PUBLICA`/`INTERNA`), sin relación con este cambio — se mantiene igual.

### Por qué ahora

El módulo de Noticias quedó "MOCK → REAL" en MAPS-014, pero la portada quedó explícitamente como deuda técnica registrada en ese TDD (§15 riesgos, §19 pendientes de MAPS-014): *"Portadas siguen siendo URL externa; uploader admin orientado a URL"*. Pedir al administrador que aloje sus imágenes en un servicio externo y pegue una URL `https://` es fricción real de uso y no es viable de cara a producción. Además, el equipo ya decidió que el storage de imágenes se resolverá con Google Cloud Storage, y la infraestructura (`StorageAdapter`, adapter GCS, variables de entorno) ya está construida y probada para Productores — corresponde extender su uso a Noticias antes de acumular más superficie divergente.

---

## Alcance

- Reemplazar el input de URL de portada (`NewsImageUploader.tsx`) por un selector/subida de archivo (`.jpg`, `.jpeg`, `.png`) en el formulario de creación/edición de noticias.
- Backend: endpoint(s) de subida de portada bajo el módulo de Noticias, reutilizando `StorageAdapter` (categoría nueva, ej. `'noticias'`) y el middleware de multer análogo a `uploadFoto.ts` (jpeg/png, límite de tamaño).
- Backend: nueva entidad `NoticiaImagen` (tabla hija, patrón `Certificacion`) para la galería de imágenes adicionales, con `orden`, FK a `Noticia`, `onDelete: Cascade`.
- Backend: endpoints de alta/baja de imágenes de galería (patrón certificaciones: un archivo por request), y exposición del array de imágenes de galería en el DTO de lectura de una noticia.
- Backend: relajar los schemas Zod de create/update para aceptar el nuevo flujo (la portada deja de aceptar `imagenUrl` como input directo del cliente y pasa a resolverse server-side tras el upload; ver Decisiones tomadas).
- Frontend admin: UI de selección de portada (drag/click, preview, estados de carga/error) siguiendo el patrón visual de `ProfileHeaderCard.tsx` / `ProducerCertificationsManager.tsx`.
- Frontend admin: UI de galería opcional (agregar/quitar múltiples imágenes) en el formulario de noticia.
- Frontend público: carrusel de imágenes de galería en `NewsArticleContent.tsx` (vista completa / modal de detalle), construido desde cero, con navegación, soporte responsive y manejo explícito de 0, 1 y N imágenes.
- Documentar el punto de integración pendiente con Google Cloud Storage (implementación real queda fuera de esta tarea).

### Fuera de alcance

- Integración real con Google Cloud Storage: no se crean buckets, no se configuran credenciales/IAM/service accounts, no se modifica infraestructura de despliegue. El adapter GCS ya existente (`gcs.adapter.ts`) se deja como está; a lo sumo se documenta cómo activarlo vía `STORAGE_PROVIDER=gcs`. Queda explícitamente marcado como **PENDIENTE — Integración Google Cloud Storage** (ver Riesgos y Preguntas abiertas).
- Editor de texto enriquecido con imágenes inline posicionables libremente entre párrafos. La galería es una entidad independiente del `contenido` de la noticia, no un feature del editor.
- Redimensionado, compresión o generación de thumbnails de las imágenes subidas (no existe infraestructura de procesamiento de imágenes en el repo — no se agrega en este TDD).
- Ruta SEO dedicada, Open Graph o metadatos asociados a las imágenes de galería.
- Reordenar imágenes de galería mediante drag & drop en el admin (el campo `orden` se define en el diseño de datos, pero la UI de reordenamiento manual queda como pregunta abierta / fase futura si no entra en el plan de implementación).
- Migración de las noticias existentes que ya tienen `imagenUrl` externa (se documenta la estrategia de convivencia, no una migración de datos masiva).

---

## Diseño propuesto

### Resumen

Se extiende el patrón ya validado en el repo para Productores (`StorageAdapter` + multer + tabla hija ordenada) al dominio de Noticias. La portada pasa de "URL de texto" a "archivo subido", persistiendo igual que hoy en `Noticia.imagenUrl` (columna existente, sin cambios de tipo) pero ahora poblada por el backend tras un upload, no por el cliente. La galería se modela como una tabla nueva `NoticiaImagen` (1 noticia → N imágenes, `orden` para el carrusel), reutilizando el mismo `StorageAdapter`. El frontend admin gana un componente de upload de portada y un gestor de galería; el frontend público gana un carrusel nuevo, aislado en un componente propio para no afectar cards/listados/modal-preview, que solo se renderiza en `NewsArticleContent.tsx` cuando la noticia tiene imágenes de galería.

```
Admin Form
  ├── Portada: <input type="file"> → POST /news/:id/portada (o flujo de creación, ver Decisiones)
  │                                        └── multer (memoria) → StorageAdapter.uploadImagenNoticia() → guarda URL en Noticia.imagenUrl
  └── Galería: N × <input type="file">  → POST /news/:id/imagenes (una por request, patrón certificaciones)
                                                └── multer → StorageAdapter → INSERT NoticiaImagen (orden = count actual)

Vista completa (NewsArticleContent.tsx)
  ├── Hero (portada) — sin cambios
  └── NewsImageCarousel (nuevo) — solo si noticia.galeria.length > 0
```

### Componentes / archivos afectados

**Backend**

| Pieza | Ubicación | Rol |
|-------|-----------|-----|
| `NoticiaImagen` (modelo Prisma) | `backend/prisma/schema.prisma` | Nuevo — tabla hija de `Noticia`, patrón `Certificacion` (`id, noticiaId, url, orden, mimeType, tamanoBytes, createdAt`), `onDelete: Cascade` |
| Migración Prisma | `backend/prisma/migrations/<timestamp>_noticia_imagenes/` | Nueva — crea tabla `NoticiaImagen`, índice `[noticiaId]` |
| `StorageAdapter` (interfaz) | `backend/src/lib/storage/types.ts` | Modificado — agregar categoría `'noticias'` (o método genérico `uploadImagenNoticia`) a la unión de categorías soportadas |
| Adapters (`local`/`s3`/`gcs`) | `backend/src/lib/storage/*.adapter.ts` | Modificado — soportar la nueva categoría siguiendo el mismo patrón que `fotos` |
| `uploadNewsImage` (middleware multer) | `backend/src/middlewares/uploadNewsImage.ts` | Nuevo — análogo a `uploadFoto.ts`: campo `'file'`, mimetypes `image/jpeg, image/png`, límite de tamaño a definir (ver Decisiones) |
| `news.service.ts` | `backend/src/services/news.service.ts` | Modificado — funciones `setPortada`, `addImagenGaleria`, `removeImagenGaleria`, `listImagenesGaleria`; incluir galería en el DTO de detalle |
| `news.controller.ts` | `backend/src/controllers/news.controller.ts` | Modificado — nuevos handlers para portada y galería |
| `news.routes.ts` | `backend/src/api/v1/routes/news.routes.ts` | Modificado — nuevas rutas (ver Contratos de API) |
| `news.schema.ts` | `backend/src/validations/news.schema.ts` | Modificado — quitar/relajar `imagenUrlSchema` como input directo de create/update; agregar validación de params para endpoints de galería |
| Tests de integración | `backend/tests/news.integration.test.ts` (+ posible archivo nuevo `news-imagenes.integration.test.ts`) | Modificado/Nuevo — casos de upload, galería, RBAC |

**Frontend**

| Pieza | Ubicación | Rol |
|-------|-----------|-----|
| `NewsImageUploader.tsx` | `frontend/src/modules/admin/components/NewsImageUploader.tsx` | Modificado — de `<input type="url">` a `<input type="file">` con preview, drag opcional, estado de subida (patrón `ProfileHeaderCard.tsx`) |
| `NewsGalleryUploader.tsx` | `frontend/src/modules/admin/components/NewsGalleryUploader.tsx` | Nuevo — selección/listado de imágenes de galería, alta/baja individual |
| `NewsForm.tsx` | `frontend/src/modules/admin/components/NewsForm.tsx` | Modificado — integrar `NewsGalleryUploader` junto al uploader de portada |
| `news.service.ts` (admin) | `frontend/src/modules/admin/services/news.service.ts` | Modificado — funciones `uploadPortada(file)`, `addImagenGaleria(newsId, file)`, `removeImagenGaleria(newsId, imagenId)` |
| `mapNews.ts` | `frontend/src/modules/admin/lib/mapNews.ts` | Modificado — mapear array de galería del DTO |
| `NewsImageCarousel.tsx` | `frontend/src/modules/public-web/components/NewsImageCarousel.tsx` | Nuevo — carrusel de galería, responsive, sin dependencias externas (o con una librería liviana si se decide en Preguntas abiertas) |
| `NewsArticleContent.tsx` | `frontend/src/modules/public-web/components/NewsArticleContent.tsx` | Modificado — renderizar `NewsImageCarousel` cuando `noticia.galeria.length > 0`, sin cambios si está vacía |
| `mapPublicNews.ts` | `frontend/src/shared/lib/mapPublicNews.ts` | Modificado — mapear array de galería del DTO público |
| Tipos compartidos | `frontend/src/modules/admin/types/news.ts`, `frontend/src/shared/types/news.ts` | Modificado — agregar `galeria: string[]` (o `{id, url}[]`) |

### Modelo de datos

```sql
-- Nueva tabla, patrón Certificacion
CREATE TABLE "NoticiaImagen" (
    "id" SERIAL NOT NULL,
    "noticia_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "mime_type" TEXT NOT NULL,
    "tamano_bytes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NoticiaImagen_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "NoticiaImagen_noticia_id_fkey" FOREIGN KEY ("noticia_id") REFERENCES "Noticia"("id") ON DELETE CASCADE
);
CREATE INDEX "NoticiaImagen_noticia_id_idx" ON "NoticiaImagen"("noticia_id");
```

```prisma
model NoticiaImagen {
  id          Int      @id @default(autoincrement())
  noticiaId   Int      @map("noticia_id")
  url         String
  orden       Int      @default(0)
  mimeType    String   @map("mime_type")
  tamanoBytes Int?     @map("tamano_bytes")
  createdAt   DateTime @default(now()) @map("created_at")

  noticia Noticia @relation(fields: [noticiaId], references: [id], onDelete: Cascade)

  @@index([noticiaId])
}
```

`Noticia.imagenUrl` **no cambia de tipo** (sigue `String?`) — solo cambia quién y cómo la escribe (ver Decisiones tomadas).

### Contratos de API

| Método | Ruta | Body / Query | Respuesta | Errores |
|--------|------|--------------|-----------|---------|
| `POST` | `/api/v1/news/:id/portada` | `multipart/form-data`, campo `file` (jpeg/png) | `200 { data: NewsAdminDto, message: "OK", error: null }` — `imagenUrl` actualizado | `400 ARCHIVO_INVALIDO`, `404` noticia inexistente, `401/403` RBAC |
| `DELETE` | `/api/v1/news/:id/portada` | — | `200 { data: NewsAdminDto, ... }` — `imagenUrl: null` | `404`, `401/403` |
| `POST` | `/api/v1/news/:id/imagenes` | `multipart/form-data`, campo `file` (jpeg/png) | `201 { data: NoticiaImagenDto, message: "OK", error: null }` | `400 ARCHIVO_INVALIDO`, `404`, `401/403` |
| `DELETE` | `/api/v1/news/:id/imagenes/:imagenId` | — | `204` | `404` (noticia o imagen inexistente), `401/403` |
| `GET` | `/api/v1/news/:id` (existente) | — | `200 { data: NewsAdminDto }` — agregar campo `galeria: NoticiaImagenDto[]` | — |
| `GET` | `/api/v1/news/public/:slug` (existente) | — | `200 { data: PublicNewsItem }` — agregar `galeria: string[]` (solo URLs, orden asc) | — |

`NoticiaImagenDto`: `{ id: number, url: string, orden: number }`.

RBAC de los endpoints nuevos: mismos roles que el resto de mutaciones de Noticias (`ADMIN`, `SUPERADMIN`), consistente con `POST/PATCH/DELETE /news`.

### UI / UX

- **Portada (admin):** reemplazo del input URL por una zona de drop/click con preview de la imagen actual, botón para reemplazar/quitar, spinner durante la subida y mensaje de error si el archivo no es `.jpg/.jpeg/.png` o excede el tamaño máximo. Visualmente sigue el contenedor `rounded-lg border border-dashed border-maps-border` ya usado en `NewsImageUploader.tsx` y `ProducerCertificationsManager.tsx`.
- **Galería (admin):** lista de miniaturas con botón "Agregar imagen" (múltiples clicks o selección múltiple) y botón de eliminar por imagen; sin reordenamiento drag & drop en el alcance inicial (ver Fuera de alcance).
- **Carrusel (vista completa pública):** ubicado en `NewsArticleContent.tsx`, debajo del contenido textual o en la posición que defina diseño; navegación por flechas + indicadores (dots), swipe en mobile, alturas responsivas siguiendo el mismo patrón `h-[260px] sm:h-[360px]` ya usado en el hero. Debe:
  - no renderizarse en absoluto si `galeria.length === 0` (vista completa queda igual que hoy);
  - funcionar sin controles de navegación si `galeria.length === 1` (una sola imagen estática, sin flechas ni dots);
  - manejar imágenes de proporciones distintas con `object-fit: cover` (o `contain`, a definir con diseño) dentro de un contenedor de altura fija por breakpoint.
- Cards, listados y modal de preview (`PublicNewsCard`, `RecentNewsCard`, `NewsDetailModal` resumen) **no cambian** — siguen mostrando solo la portada.

### Cambios en código existente

- `NewsImageUploader.tsx`: cambia de tipo (`url` → `file`), rompe el contrato de props actual (pasa a recibir `onUpload: (file: File) => Promise<void>` en vez de un string controlado). Se mantiene el mismo lugar dentro de `NewsForm.tsx`.
- `news.schema.ts`: `createNewsSchema`/`updateNewsSchema` dejan de aceptar `imagenUrl` como campo de entrada del cliente (pasa a ser solo de lectura, poblado por el endpoint de portada). Al ser `.strict()`, esto requiere quitar el campo del schema de escritura, no solo hacerlo opcional.
- `mapNews.ts` / `mapPublicNews.ts`: agregan mapeo del array `galeria`.
- `NewsArticleContent.tsx`: agrega renderizado condicional del carrusel; el resto de la estructura (hero, título, contenido) se mantiene igual.
- Noticias existentes con `imagenUrl` externo (cargado antes de este cambio) siguen funcionando en lectura — ningún consumidor deja de renderizar una URL externa válida; el cambio solo afecta el flujo de **escritura** desde el admin.

---

## Decisiones tomadas

- Reutilizar el `StorageAdapter` ya existente (`backend/src/lib/storage/`) en vez de crear una abstracción nueva — ya soporta `local`/`s3`/`gcs` y ya está probado con Productores.
- La portada sigue viviendo en la columna `Noticia.imagenUrl` (sin cambio de tipo ni migración de ese campo) — solo cambia el mecanismo de escritura, de "URL pegada por el cliente" a "URL resuelta por el backend tras subir un archivo". Esto evita tocar todos los consumidores de lectura ya mapeados.
- La galería se modela como tabla hija `NoticiaImagen` con `orden`, siguiendo el patrón ya validado de `Certificacion`, en vez de un array/JSON embebido en `Noticia` — permite alta/baja individual sin reescribir el documento completo y es consistente con el resto del dominio.
- Formatos aceptados: `.jpg`, `.jpeg`, `.png` (sin `.webp`, a diferencia de `uploadFoto.ts` que sí lo permite) — por pedido explícito del alcance funcional.
- La integración real con Google Cloud Storage queda fuera de esta tarea; el trabajo se limita a que el nuevo flujo pase por `StorageAdapter` para que, cuando otro desarrollador active `STORAGE_PROVIDER=gcs` y configure credenciales, Noticias funcione sin cambios de código adicionales.
- No se agrega procesamiento de imágenes (resize/compresión) en esta fase — no existe esa infraestructura hoy en el repo y no forma parte del alcance funcional pedido.
- El carrusel se construye sin depender de contenido posicionable dentro del rich text — es una entidad de datos independiente (`galeria`), no una feature del editor.

---

## Alternativas consideradas

### Alternativa A — Guardar la galería como array de URLs (JSON) directamente en `Noticia`

- **Qué era:** agregar `imagenesGaleria String[]` (o JSON) a la tabla `Noticia` en vez de una tabla hija.
- **Pros:** menos tablas, menos joins, cambio de schema más simple.
- **Contras:** no hay forma limpia de guardar metadata por imagen (orden explícito, mimeType, tamaño) sin serializar objetos dentro del array; borrar una imagen individual implica reescribir todo el array; no es consistente con el patrón `Certificacion` ya usado en el repo para el mismo problema (archivos hijos de una entidad).
- **Por qué se descartó:** rompe la consistencia con el patrón ya establecido (`Certificacion`/`RedSocial` con `orden Int`) y complica el alta/baja individual que pide el requerimiento.

### Alternativa B — Un solo endpoint de creación/edición de noticia que reciba archivos junto con el resto de los campos (multipart en `POST/PATCH /news`)

- **Qué era:** que `POST /news` y `PATCH /news/:id` acepten `multipart/form-data` con los campos de texto + portada + galería en un solo request.
- **Pros:** un solo request desde el cliente, menos llamadas de red.
- **Contras:** rompe el contrato `.strict()` de Zod actual (que valida JSON), complica el manejo de errores parciales (¿qué pasa si el texto es válido pero un archivo no?), y se aleja del patrón ya usado en Productores (donde texto y archivos son endpoints separados: `PATCH /producers/me` vs `POST /producers/me/foto`).
- **Por qué se descartó:** mantener endpoints separados para texto vs. archivos es el patrón ya validado en el repo (Productores) y simplifica el manejo de errores y RBAC por endpoint.

---

## Plan de implementación

_A definir en detalle en una instancia posterior, cuando se solicite el plan de implementación. Fases tentativas de alto nivel, sujetas a confirmación:_

### Fase 1 — Backend: modelo y storage
- [ ] Migración `NoticiaImagen` + extensión de `StorageAdapter` para categoría de imágenes de noticias

### Fase 2 — Backend: endpoints
- [ ] Endpoints de portada y galería + ajuste de `news.schema.ts` + tests de integración

### Fase 3 — Frontend admin
- [ ] `NewsImageUploader` a file upload + `NewsGalleryUploader` nuevo + integración en `NewsForm`

### Fase 4 — Frontend público
- [ ] `NewsImageCarousel` nuevo + integración en `NewsArticleContent`

### Fase 5 — Documentación de cierre
- [ ] Actualizar `docs/modules/news.md` + worklog `docs/worklog/MAPS-019-galeria-imagenes-noticias.md`

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| `imagenUrl` sigue en el schema de escritura y algún cliente sigue mandando URLs externas | Media | Medio | Quitar el campo de `createNewsSchema`/`updateNewsSchema` (`.strict()` ya lo rechazaría si se hace bien) |
| Confusión entre "portada opcional hoy" y expectativa de portada obligatoria a futuro | Baja | Bajo | Documentado explícitamente: `imagenUrl` sigue nullable, sin cambio de comportamiento de negocio |
| Carrusel construido desde cero introduce bugs de swipe/responsive no cubiertos por librerías maduras | Media | Medio | Cubrir explícitamente los casos 0/1/N imágenes y breakpoints en QA manual antes de cerrar la fase de frontend público |
| Se empieza a acoplar el dominio de Noticias a GCS "por adelantado" | Baja | Alto | Todo el acceso a storage pasa exclusivamente por `StorageAdapter`; ningún import directo de `@google-cloud/storage` en `news.service.ts`/`news.controller.ts` |
| Migraciones de datos: noticias ya creadas con `imagenUrl` externo | Baja | Bajo | No se migran datos existentes; siguen funcionando en lectura sin cambios |

---

## Plan de rollout

- [ ] Feature flag: no — cambio de flujo de escritura sin impacto en lectura pública si no hay galería
- [ ] Migraciones: nueva tabla `NoticiaImagen`, aditiva, no rompe datos existentes; reversible con `prisma migrate` estándar
- [ ] Cambios de configuración / variables de entorno nuevas: ninguna nueva — reutiliza `STORAGE_PROVIDER`, `GCS_BUCKET`, etc. ya definidas para Productores
- [ ] Comunicación a usuarios: aviso a administradores del cambio de "URL de portada" a "subir archivo" antes del deploy
- [ ] Plan de rollback: revertir el deploy de frontend/backend; la tabla `NoticiaImagen` puede quedar sin uso sin romper nada (no hay FK inversa desde `Noticia`)

---

## Métricas de éxito

- 0 errores 5xx en los endpoints nuevos de portada/galería durante la primera semana post-deploy.
- El administrador puede crear una noticia completa (portada + galería opcional) sin salir del panel admin ni depender de un servicio externo de hosting de imágenes.
- La vista completa de una noticia sin galería se ve idéntica a como se ve hoy (regresión visual = 0).

---

## Preguntas abiertas

- [ ] ¿Se permite reordenar manualmente las imágenes de la galería en el admin (drag & drop), o el orden queda fijo según orden de subida en esta primera fase? — _responde:_ @lucaslegor
- [ ] ¿Límite de tamaño de archivo para portada/galería (ej. 5 MB como `uploadFoto.ts`, u otro valor)? — _responde:_ @lucaslegor
- [ ] ¿Existe un límite máximo de imágenes de galería por noticia? — _responde:_ @lucaslegor
- [ ] ¿El carrusel se construye 100% a mano (sin dependencias) o se evalúa incorporar una librería liviana (ej. embla-carousel, sin CSS propio) para acelerar accesibilidad/gestos táctiles? — _responde:_ @lucaslegor
- [ ] ¿`object-fit: cover` o `contain` para imágenes de proporciones distintas dentro del carrusel? — _responde:_ diseño / @lucaslegor
- [ ] ¿Se elimina físicamente el archivo del storage al borrar una imagen de galería o una noticia completa, o solo se borra el registro en DB? (Impacta el diseño de `deleteImagenGaleria` en el `StorageAdapter`) — _responde:_ @lucaslegor

---

## Referencias

- **Figma:** _pendiente de link_
- **Tickets:** MAPS-019
- **PRs relacionados:** _pendiente_
- **Diagramas / pruebas de concepto:** _N/A_
- **Work-log de implementación:** `docs/worklog/MAPS-019-galeria-imagenes-noticias.md` (creado en paralelo a este TDD, pendiente de completar tras la implementación)

**Documentos relacionados del módulo Noticias:**

| Recurso | Ruta |
|---------|------|
| Módulo vivo | `docs/modules/news.md` |
| TDD fullstack original | `docs/tdd/MAPS-014-tdd-noticias-api-fullstack.md` |
| Worklog fullstack original | `docs/worklog/MAPS-014-noticias-api-fullstack.md` |
| TDD UI admin original | `docs/tdd/MAPS-007-tdd-vista-gestion-noticias.md` |
| Storage abstraction | `backend/src/lib/storage/types.ts`, `index.ts`, `local.adapter.ts`, `gcs.adapter.ts`, `s3.adapter.ts` |
| Patrón de referencia (galería PDF) | `backend/prisma/schema.prisma` (`Certificacion`), `backend/src/services/producers.service.ts` |
| Patrón de referencia (upload UI) | `frontend/src/shared/components/profile/ProfileHeaderCard.tsx`, `ProducerCertificationsManager.tsx` |
