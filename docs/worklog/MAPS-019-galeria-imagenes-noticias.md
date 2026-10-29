# MAPS-019 — Galería de imágenes y upload de portada para Noticias

Documentación de la feature galería de imágenes y upload de portada dentro del proyecto MAPS Asesores. Complementa el [README técnico](./README.md), el [README raíz](../README.md) y el [TDD MAPS-019](../tdd/MAPS-019-tdd-galeria-imagenes-noticias.md).

> **Estado de este documento:** implementación completada (código + tests). Verificación end-to-end backend pendiente de correr la suite tras regenerar el cliente Prisma (bloqueo de archivo por dev server en Windows durante el desarrollo).

---

## Objetivo

Reemplazar el input manual de URL de portada por upload de archivo (`.jpg`/`.jpeg`/`.png`) y agregar una galería opcional de imágenes adicionales por noticia, visible como carrusel únicamente en la vista completa. Reutiliza la infraestructura de storage (`StorageAdapter`) ya existente para Productores; la integración real con Google Cloud Storage queda fuera de esta feature (ver TDD, sección "Fuera de alcance").

Detalle completo de objetivo, contexto y decisiones: [`docs/tdd/MAPS-019-tdd-galeria-imagenes-noticias.md`](../tdd/MAPS-019-tdd-galeria-imagenes-noticias.md).

---

## Cambios implementados

### 1. Backend — modelo `NoticiaImagen` y extensión de `StorageAdapter`

**Archivos:**

- `backend/prisma/schema.prisma` — nuevo modelo `NoticiaImagen` (patrón `Certificacion`: `id, noticiaId, url, orden, mimeType, tamanoBytes, createdAt`, FK `onDelete: Cascade`, índice `[noticiaId]`) + relación inversa `imagenes NoticiaImagen[]` en `Noticia`. `Noticia.imagenUrl` no cambió de tipo.
- `backend/prisma/migrations/20260831184410_noticia_imagenes/migration.sql` — crea la tabla.
- `backend/src/lib/storage/types.ts` — categoría `'noticias'` agregada a `StoredFileCategory` y `STORED_FILE_PATTERNS` (`uuid.(jpg|jpeg|png)`); nuevos tipos `UploadImagenNoticiaInput`/`Result` y métodos `uploadImagenNoticia`/`deleteImagenNoticia` en la interfaz `StorageAdapter`.
- `backend/src/lib/storage/{local,gcs,s3}.adapter.ts` — implementan los dos métodos nuevos (jpg/png), replicando el patrón de `fotos`. En GCS se extendió `parseManagedUrl` y `cacheControlFor` para incluir `noticias`.
- `backend/src/lib/uploadPaths.ts` — `getNoticiasUploadDir()` y `noticiaPublicUrl()`.
- `backend/src/app.ts` — sirve estáticos locales en `/uploads/noticias`.
- `backend/src/controllers/uploads.controller.ts` — `parseCategory` acepta `'noticias'` (proxy privado GCS/S3).

Regla clave: **todo acceso a archivos pasa por `StorageAdapter`**; el dominio de Noticias no importa `@google-cloud/storage`. Activar GCS es solo cuestión de `STORAGE_PROVIDER=gcs` (integración real fuera de alcance).

---

### 2. Backend — endpoints de portada y galería

**Archivos:**

- `backend/src/middlewares/uploadNewsImage.ts` (nuevo) — multer en memoria, campo `file`, límite 10 MB, mimetypes `image/jpeg`/`image/png`.
- `backend/src/services/news.service.ts` — DTOs con `galeria` (`NewsAdminDto.galeria: NoticiaImagenDto[]`, `NewsPublicDto.galeria: string[]`); nuevos métodos `setPortada`, `removePortada`, `addImagenGaleria` (tope `MAX_GALERIA_IMAGENES = 10`), `removeImagenGaleria`; `getAdminNewsById`/`getPublicNewsBySlug` incluyen galería ordenada; `deleteNews` limpia los archivos del storage antes del cascade. `CreateNewsInput`/`UpdateNewsInput` ya no exponen `imagenUrl`. Los listados (cards) no incluyen galería.
- `backend/src/controllers/news.controller.ts` — handlers `setPortada` (200), `removePortada` (200), `addImagenGaleria` (201), `removeImagenGaleria` (204).
- `backend/src/api/v1/routes/news.routes.ts` — rutas `adminOnly`: `POST/DELETE /:id/portada`, `POST /:id/imagenes`, `DELETE /:id/imagenes/:imagenId`.
- `backend/src/validations/news.schema.ts` — se quitó `imagenUrl` de `newsCoreFields` (create/update `.strict()` ya no lo aceptan); nuevo `noticiaImagenParamSchema`.

---

### 3. Frontend admin — upload de portada y gestor de galería

**Archivos:**

- `frontend/src/modules/admin/components/NewsImageUploader.tsx` — reescrito de `<input type="url">` a selector de archivo con preview (patrón `ProfileHeaderCard`), validación mime/10 MB en cliente, botón reemplazar/quitar.
- `frontend/src/modules/admin/components/NewsGalleryUploader.tsx` (nuevo) — grilla de miniaturas (persistidas + pendientes), alta múltiple, baja individual, tope 10.
- `frontend/src/modules/admin/components/NewsForm.tsx` — integra ambos uploaders; recolecta operaciones de imágenes (`NewsImageOps`) y las pasa a `onSubmit(input, images)`. La portada dejó de validarse como URL.
- `frontend/src/modules/admin/hooks/useAdminNews.ts` — `applyImageOps(id, images)` aplica portada/galería tras el create/update de texto, con un solo `refetch`. Orquestación de dos fases para create (crear → subir); directa en edit.
- `frontend/src/modules/admin/components/NewsManagementDashboard.tsx` — `handleSubmit(input, images)` y `newsToFormState` con galería.
- `frontend/src/modules/admin/services/news.service.ts` — `uploadPortada`, `deletePortada`, `addImagenGaleria`, `removeImagenGaleria` (FormData).
- `frontend/src/modules/admin/lib/mapNews.ts` + `types/news.ts` — `galeria` en el modelo; `imagenUrl` fuera del payload de escritura.

---

### 4. Frontend público — carrusel de galería en vista completa

**Archivos:**

- `frontend/src/modules/public-web/components/NewsImageCarousel.tsx` (nuevo) — carrusel sin dependencias (scroll-snap + flechas + dots), `object-cover`, alturas `h-[260px] sm:h-[360px]`. Con 1 imagen no muestra controles; con 0 no se monta.
- `frontend/src/modules/public-web/components/NewsArticleContent.tsx` — renderiza el carrusel tras el contenido solo si `galeria.length > 0` (sin galería, la vista queda idéntica). Aplica también al `NewsDetailModal` que comparte este componente.
- `frontend/src/shared/lib/mapPublicNews.ts`, `shared/types/news.ts`, `shared/services/publicNews.service.ts` — `galeria: string[]` en el DTO/modelo público.

---

## Estado del sistema tras MAPS-019

_Pendiente — completar con el estado final real una vez implementado. Mientras tanto, el estado **previo** a esta feature es:_

### Portada (previo a MAPS-019)

```
Noticia.imagenUrl (String?, nullable)
  ← escrita por el admin pegando una URL https:// en un <input type="url">
  ← validada en backend solo como URL https, sin upload real
  → consumida sin cambios en cards, listados, modal preview y vista completa
```

### Galería (previo a MAPS-019)

```
No existe. Una noticia solo tiene una imagen (portada).
```

### Tabla resumen — comportamiento esperado tras la implementación

| Caso | Comportamiento esperado |
|------|----------------------|
| Noticia sin portada ni galería | Igual que hoy: fallback visual (`imageGradient`) en cards y hero |
| Noticia con portada, sin galería | Portada se sube como archivo; vista completa **sin** carrusel (igual que hoy visualmente) |
| Noticia con portada + galería (1 imagen) | Vista completa muestra la imagen adicional sin controles de navegación |
| Noticia con portada + galería (N imágenes) | Vista completa muestra carrusel con navegación, responsive |
| Cards / listados / modal preview | Sin cambios — nunca muestran imágenes de galería |

---

## Criterios de aceptación verificados

| Criterio | Estado |
|----------|--------|
| Admin puede subir un archivo `.jpg/.jpeg/.png` como portada (sin pegar URL) | Implementado — `NewsImageUploader` file-based + `POST /news/:id/portada` |
| Admin puede agregar/quitar 0..N imágenes de galería opcionales | Implementado — `NewsGalleryUploader` + `POST/DELETE /news/:id/imagenes` |
| Galería no aparece en cards, listados ni modal de preview | Implementado — listados no incluyen galería en el DTO; carrusel solo en `NewsArticleContent` |
| Vista completa muestra carrusel solo cuando hay imágenes de galería | Implementado — render condicional `galeria.length > 0` |
| Vista completa sin galería se ve igual que antes de esta feature | Implementado — sin galería no se monta el carrusel |
| Acceso a storage pasa exclusivamente por `StorageAdapter` (sin acoplar el dominio a GCS) | Implementado — sin imports de `@google-cloud/storage` en `news.service`/`news.controller` |
| Frontend typecheck (`tsc --noEmit`) en verde | ✅ Verificado |
| Tests de integración backend en verde para los endpoints nuevos | Pendiente de correr (`npm test` tras regenerar cliente Prisma) |

---

## Pruebas manuales recomendadas

```
1. Crear noticia nueva subiendo una imagen de portada (.jpg/.png)
   → La portada se guarda y se muestra correctamente en card, listado y vista completa

2. Editar una noticia existente y agregar 3 imágenes a la galería
   → Las 3 imágenes aparecen como carrusel solo en la vista completa
   → El listado y las cards de esa noticia no cambian visualmente

3. Noticia con una sola imagen de galería
   → Se muestra la imagen sin flechas/dots de navegación

4. Noticia sin imágenes de galería
   → La vista completa no muestra ningún carrusel ni espacio vacío reservado

5. Intentar subir un archivo con formato no soportado (ej. .gif, .webp, .pdf)
   → Error de validación claro en el formulario, sin romper el resto del formulario

6. Ver el carrusel en mobile (viewport angosto) y desktop
   → Navegación usable en ambos, sin overflow horizontal de la página

7. Eliminar una imagen de la galería
   → Desaparece del carrusel sin afectar el resto de las imágenes ni la portada
```

```bash
# Ejemplos de verificación backend (ajustar una vez definidos los endpoints finales)
curl -s -X POST http://localhost:3000/api/v1/news/1/portada \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@./portada.jpg"

curl -s -X POST http://localhost:3000/api/v1/news/1/imagenes \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@./adicional-1.png"
```

---

## Pendientes fuera de esta feature

| Pendiente | Detalle |
|-----------|---------|
| **Integración Google Cloud Storage** | No forma parte de esta tarea. El diseño deja el acceso a storage encapsulado en `StorageAdapter` (`backend/src/lib/storage/`), con un adapter GCS ya existente pero sin credenciales/bucket configurados. Activar `STORAGE_PROVIDER=gcs` y provisionar el bucket real queda para otro desarrollador del equipo. |
| Reordenamiento manual de galería (drag & drop) | Pendiente de definir si entra en el plan de implementación (ver Preguntas abiertas del TDD) |
| Redimensionado/compresión de imágenes | No existe infraestructura de procesamiento de imágenes en el repo; no se agrega en esta feature |
| Editor con imágenes inline en el cuerpo | Explícitamente fuera de alcance — la galería es una entidad independiente del rich text |
| Migración de noticias existentes con `imagenUrl` externo | No se migran datos; siguen funcionando en lectura sin cambios |

---

*Documento generado junto con el TDD MAPS-019 — galería de imágenes y upload de portada para Noticias. Pendiente de completar tras ejecutar el plan de implementación.*
