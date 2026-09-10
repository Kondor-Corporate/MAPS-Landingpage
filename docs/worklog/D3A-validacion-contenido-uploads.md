# D3A — Validación de contenido en uploads

Documentación de la feature D3A dentro del proyecto MAPS Asesores.
Complementa el [índice de docs](../README.md) y el
[README raíz](../../README.md).

**Identificador:** D3A (no es un ticket `MAPS-XXX`; la rama es `fix/d3a-file-content-validation`). D3B (coordenadas) y D3C (consistencia Storage ↔ DB / compensaciones) quedan fuera de esta entrega.

**Estado:** Implementación y validación técnica completadas en rama `fix/d3a-file-content-validation` (2026-09-04). Pendiente merge/PR. Sin commit ni deploy al cierre de este documento.

**TDD de diseño:** [`docs/tdd/D3A-tdd-validacion-contenido-archivos.md`](../tdd/D3A-tdd-validacion-contenido-archivos.md)

**PR:** Pendiente

---

## Objetivo

Dejar de confiar en `file.mimetype` (controlado por el cliente multipart) como fuente de verdad del tipo de archivo después de Multer. Verificar el tipo aparente por firmas binarias antes del primer `write` en storage, y propagar un MIME canónico detectado hacia adapters y metadatos persistidos.

Alcance: certificaciones PDF, foto de perfil y portada/galería de noticias (cinco caminos HTTP, cuatro funciones de service).

---

## Problema original

- Multer filtraba solo por MIME declarado y tamaño; no inspeccionaba `file.buffer`.
- Services pasaban `file.mimetype` a `StorageAdapter`, definiendo extensión, `Content-Type` y columnas `mimeType` en BD.
- Un cliente autenticado podía declarar `application/pdf` o `image/png` con bytes de otro tipo o basura y persistir metadatos incorrectos.
- Fixtures como `fake-png-bytes` en tests de integración enmascaraban el hueco.

---

## Decisión

Detector interno pequeño, **sin** `file-type` ni dependencias externas. Dos módulos en `backend/src/lib/`:

1. `detectAllowedUploadType` — puro, solo bytes → MIME o `null`.
2. `uploadContentValidation` — allowlist por familia de endpoint + `AppError(400)`.

Integración únicamente en services, inmediatamente antes de `getStorageAdapter().upload*`.

---

## Arquitectura final

```text
multipart
  → Multer (memoryStorage, fileFilter, límite tamaño)
  → file.buffer
  → detectAllowedUploadType(buffer)
  → assertAllowedUploadContent(buffer, family)
  → detectedMime
  → service → storage.upload*({ mimeType: detectedMime })
  → extensión / mimeType persistido derivados de detectedMime
```

**Regla:** el MIME declarado puede diferir del detectado; manda el contenido real si el tipo detectado pertenece a la allowlist de la familia (p. ej. JPEG declarado PNG en foto → aceptado como JPEG).

---

## Firmas y allowlists

| Formato | Firma D3A | MIME |
|---------|-----------|------|
| PDF | `%PDF-` | `application/pdf` |
| JPEG | `FF D8 FF` | `image/jpeg` |
| PNG | 8 bytes estándar | `image/png` |
| WebP | `RIFF` @ 0–3 + `WEBP` @ 8–11 | `image/webp` |

| Familia | Tipos permitidos |
|---------|------------------|
| `certificacion` | PDF |
| `foto` | JPEG, PNG, WebP |
| `noticia` | JPEG, PNG (WebP rechazado) |

**Errores 400 por familia:**

- Certificación: `El archivo no es un PDF válido`
- Foto: `La foto debe ser un archivo JPG, PNG o WEBP válido`
- Noticia: `La imagen debe ser un archivo JPG, JPEG o PNG válido`

**Límite explícito:** firma válida ≠ archivo completo seguro. D3A no parsea PDFs ni decodifica imágenes por completo.

---

## Cambios implementados

### Backend (producción)

| Archivo | Rol |
|---------|-----|
| `backend/src/lib/detectAllowedUploadType.ts` | **Nuevo** — detector puro |
| `backend/src/lib/uploadContentValidation.ts` | **Nuevo** — política por familia |
| `backend/src/services/producers.service.ts` | `addCertificacion`, `replaceFoto` |
| `backend/src/services/news.service.ts` | `setPortada`, `addImagenGaleria` |

Sin cambios en controllers, middlewares Multer, adapters, frontend, Prisma ni `package.json`.

### Tests

| Archivo | Cobertura |
|---------|-----------|
| `backend/tests/detectAllowedUploadType.unit.test.ts` | 4 tipos + null/truncados |
| `backend/tests/uploadContentValidation.unit.test.ts` | Allowlists + mensajes |
| `backend/tests/helpers/binaryFixtures.ts` | Fixtures compartidos |
| `backend/tests/producersProfile.integration.test.ts` | Cert productor/admin, foto, spies storage |
| `backend/tests/news-imagenes.integration.test.ts` | Portada, galería, spies storage |

Casos destacados: JPEG declarado PNG → extensión `.jpg`; WebP en noticias → 400; todos los rechazos D3A verifican que `uploadCertificacion` / `uploadFoto` / `uploadImagenNoticia` no se invocan; `NoticiaImagen.mimeType` verificado vía Prisma (DTO galería sigue `{ id, url, orden }`).

---

## Validación D3A

Validación **local** en rama `fix/d3a-file-content-validation`. No se afirma deploy a staging.

### Automatizada

| Comando | Resultado |
|---------|-----------|
| Integración targeted (`producersProfile` + `news-imagenes`) | **47/47 PASS** |
| `backend` `npm test` | **293/293 PASS** |
| `backend` typecheck | OK |
| `backend` lint | OK |
| `backend` build | OK |
| `git diff --check` | OK |

### Review final

APROBADA — sin findings funcionales, de seguridad ni regresión pendientes dentro del alcance D3A.

---

## Residual y fuera de alcance

| Tema | Notas |
|------|-------|
| Firma válida, payload malicioso | Fuera de contrato D3A |
| Antivirus / parsing profundo de PDF | Fuera de alcance |
| D3B (coordenadas) | Entrega distinta |
| D3C (Storage ↔ DB) | Deuda observada: huérfanos, deletes no atómicos entre storage y BD |

---

## Archivos del diff D3A (código + docs)

**Código:**

- `backend/src/lib/detectAllowedUploadType.ts`
- `backend/src/lib/uploadContentValidation.ts`
- `backend/src/services/producers.service.ts`
- `backend/src/services/news.service.ts`
- `backend/tests/detectAllowedUploadType.unit.test.ts`
- `backend/tests/uploadContentValidation.unit.test.ts`
- `backend/tests/helpers/binaryFixtures.ts`
- `backend/tests/producersProfile.integration.test.ts`
- `backend/tests/news-imagenes.integration.test.ts`

**Documentación (este cierre):**

- `docs/tdd/D3A-tdd-validacion-contenido-archivos.md` (checklists y cierre técnico; Estado formal pendiente post-merge)
- `docs/worklog/D3A-validacion-contenido-uploads.md` (este archivo)
- `docs/modules/producers.md`
- `docs/modules/news.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`

---

## Pendientes fuera de esta feature

| Pendiente | Detalle |
|-----------|---------|
| Merge / PR | Integración a `development` |
| TDD → Implementado | Tras merge, actualizar estado formal del TDD |
| D3B | Coordenadas |
| D3C | Consistencia Storage ↔ DB, compensaciones, huérfanos |

---

*Documento generado al cierre documental de D3A — validación de contenido en uploads.*
