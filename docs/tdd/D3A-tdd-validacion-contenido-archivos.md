# D3A — TDD: Validación real del contenido de archivos en uploads

Documento de diseño técnico para verificar el tipo de archivo mediante bytes reales (firmas binarias) antes de persistir uploads en MAPS Asesores.

**Identificador:** D3A (no es un ticket `MAPS-XXX`; la rama es `fix/d3a-file-content-validation`). D3B (coordenadas) y D3C (consistencia Storage ↔ DB / compensaciones) quedan fuera de esta entrega.

**Estado:** APROBADO — pendiente implementación  
**Autor:** equipo MAPS  
**Revisores:** —  
**Creado:** 2026-09-04  
**Última actualización:** 2026-09-04 (cierre técnico documentado en rama)

---

## Resumen

Hoy los cinco caminos de upload del backend confían en `file.mimetype` declarado por el cliente multipart. Multer usa `memoryStorage()`, aplica límites de tamaño y `fileFilter` por MIME declarado, pero no inspecciona el buffer. Ese MIME se propaga a `producers.service` / `news.service` y de ahí a `getStorageAdapter()`, donde define extensión generada, `Content-Type` persistido y, donde el modelo lo tiene, metadatos en BD.

D3A introduce un detector interno, puro y sin dependencias externas, limitado a `application/pdf`, `image/jpeg`, `image/png` e `image/webp`, más una capa de validación por familia de endpoint. Tras Multer, el backend detectará el MIME canónico desde `file.buffer`, lo validará contra la allowlist de la familia y solo entonces llamará al storage con ese MIME verificado — nunca con `file.mimetype` como fuente confiable.

---

## Objetivo

- Verificar el tipo aparente del archivo por firmas binarias conocidas antes de escribir en storage.
- Rechazar contenido inválido o no permitido para la familia del endpoint con `400` y mensajes funcionales, sin filtrar detalles internos.
- Propagar exclusivamente el MIME detectado (`detectedMime`) hacia storage y hacia cualquier metadato de tipo que se persista (p. ej. `mimeType` en `Certificacion` y `NoticiaImagen`; extensión en URL de foto/portada donde no hay columna dedicada).
- Permitir que MIME declarado y detectado difieran cuando el tipo real pertenece a la allowlist del endpoint (p. ej. JPEG declarado como PNG en foto de perfil → aceptar como JPEG).
- Mantener filtros tempranos de Multer, límites de tamaño, RBAC, visibilidad pública de certificaciones y formatos permitidos actuales sin cambios.
- Cubrir el detector con tests unitarios, los cinco endpoints con tests de integración (incluido al menos un caso D3A inválido por ruta admin de certificaciones) y actualizar fixtures ficticios donde hoy pasan solo por MIME declarado.

---

## Contexto / situación actual

### Relevamiento en rama `fix/d3a-file-content-validation`

**Middlewares Multer** (todos usan `multer.memoryStorage()` y campo `file`):

| Middleware | Archivo | Límite | MIME declarado permitido | Mensaje rechazo temprano |
|------------|---------|--------|--------------------------|---------------------------|
| `uploadCertificacionMiddleware` | `backend/src/middlewares/uploadCertificacion.ts` | 10 MB | `application/pdf` | `Solo se permiten archivos PDF` |
| `uploadFotoMiddleware` | `backend/src/middlewares/uploadFoto.ts` | 5 MB | `image/jpeg`, `image/png`, `image/webp` | `Solo se permiten imágenes JPG, PNG o WEBP` |
| `uploadNewsImageMiddleware` | `backend/src/middlewares/uploadNewsImage.ts` | 10 MB | `image/jpeg`, `image/png` | `Solo se permiten imágenes JPG, JPEG o PNG` |

Exceso de tamaño en los tres middlewares → `413` vía `AppError` con mensajes:
- Certificaciones: `El archivo supera el tamaño máximo de 10 MB.`
- Foto: `El archivo supera el tamaño máximo de 5 MB.`
- Noticias: `El archivo supera el tamaño máximo de 10 MB.`

**Rutas HTTP** (`backend/src/api/v1/index.ts` monta bajo `/api/v1`):

| Familia | Método | Ruta | RBAC | Middleware upload | Controller | Service |
|---------|--------|------|------|-------------------|------------|---------|
| Certificación propia | `POST` | `/producers/me/certificaciones` | `authenticate` + `authorize(PRODUCTOR)` | `uploadCertificacionMiddleware` | `producersController.uploadCertificacionMe` | `producersService.uploadCertificacionMe` → `addCertificacion` |
| Certificación admin | `POST` | `/producers/:id/certificaciones` | `authenticate` + `authorize(ADMIN, SUPERADMIN)` | `uploadCertificacionMiddleware` | `producersController.uploadCertificacionAdmin` | `producersService.uploadCertificacionAdmin` → `addCertificacion` |
| Foto perfil | `POST` | `/producers/me/foto` | `authenticate` + `authorize(PRODUCTOR)` | `uploadFotoMiddleware` | `producersController.uploadFotoMe` | `producersService.uploadFotoMe` → `replaceFoto` |
| Portada noticia | `POST` | `/news/:id/portada` | `authenticate` + `authorize(ADMIN, SUPERADMIN)` | `uploadNewsImageMiddleware` | `newsController.setPortada` | `newsService.setPortada` |
| Galería noticia | `POST` | `/news/:id/imagenes` | `authenticate` + `authorize(ADMIN, SUPERADMIN)` | `uploadNewsImageMiddleware` | `newsController.addImagenGaleria` | `newsService.addImagenGaleria` |

En productores, `fileUploadRoute` (`producers.routes.ts`) envuelve el middleware Multer antes del handler. En noticias, el middleware se declara inline en la ruta.

**Propagación actual del MIME** (fuente: `file.mimetype`):

```text
addCertificacion (producers.service.ts)
  → storage.uploadCertificacion({ buffer, mimeType: file.mimetype, productorId })
  → prisma.certificacion.create({ mimeType: uploaded.mimeType, ... })   ← columna mimeType

replaceFoto (producers.service.ts)
  → storage.uploadFoto({ buffer, mimeType: file.mimetype, productorId })
  → prisma.productor.update({ foto: uploaded.url })                     ← sin columna mimeType

setPortada / addImagenGaleria (news.service.ts)
  → storage.uploadImagenNoticia({ buffer, mimeType: file.mimetype, noticiaId })
  → portada: prisma.noticia.update({ imagenUrl })                     ← sin columna mimeType
  → galería: prisma.noticiaImagen.create({ mimeType: uploaded.mimeType, ... })
```

**Storage adapters** (`backend/src/lib/storage/`):

- Contrato en `types.ts`: todos los `upload*` reciben `{ buffer, mimeType, ... }`.
- `LocalStorageAdapter`, `S3StorageAdapter`, `GcsStorageAdapter` derivan extensión de filename vía mapas `FOTO_EXTENSION_BY_MIME` / `NOTICIA_EXTENSION_BY_MIME`; certificaciones fuerzan `.pdf`.
- Los adapters **no** inspeccionan bytes; confían en `mimeType` recibido.
- D3A **no** modifica adapters: recibirán el MIME canónico ya verificado desde services.

**Servicio de archivos públicos** (`GET /api/v1/uploads/:category/:filename`): lectura/streaming de objetos ya persistidos. Fuera del flujo de upload D3A.

**Tests existentes relevantes:**

| Archivo | Qué cubre hoy |
|---------|----------------|
| `backend/tests/producersProfile.integration.test.ts` | Certificaciones productor: PDF con prefijo `%PDF-1.4` (pasa por firma); rechazo MIME declarado imagen; límite 10 MB. Foto: `Buffer.from('fake-png-bytes')` con `contentType: image/png` **pasa** (solo confía en MIME). |
| `backend/tests/news-imagenes.integration.test.ts` | Portada y galería con `PNG_1x1` (PNG decodificable en base64); rechazo GIF por Multer; RBAC. |
| `backend/tests/storage-contracts.unit.test.ts` | Contrato de adapters con buffers ficticios y `mimeType` explícito — **permanece válido**; no introduce detector. |
| `backend/tests/gcs-storage.unit.test.ts`, `uploads.unit.test.ts` | Idem: contrato adapter / controller de lectura. |

No hay test de integración dedicado a `POST /producers/:id/certificaciones` (admin); D3A **debe** añadir al menos un caso de contenido inválido por esa ruta.

### Por qué ahora

Los uploads alimentan URLs públicas, metadatos en BD y `Content-Type` servido. Confiar en MIME declarado permite MIME spoofing: un cliente puede enviar `Content-Type: image/png` con bytes de otro tipo o basura, y MAPS persistiría extensión/MIME incorrectos. D3A cierra esa confianza en metadata controlada por el cliente antes del primer `write` en storage.

---

## Problema

1. La validación de tipo termina en el `fileFilter` de Multer, que solo lee `file.mimetype` del multipart.
2. Services pasan `file.mimetype` directamente a storage y, donde aplica, a metadatos persistidos.
3. Un buffer con firma real distinta al MIME declarado puede almacenarse bajo extensión/MIME incorrectos si el declarado pasó el filtro temprano (p. ej. JPEG declarado como PNG en foto de perfil).
4. Un buffer basura con MIME declarado permitido (p. ej. `application/pdf` + texto) se persiste hoy si el filtro Multer lo dejó pasar.
5. Fixtures de integración como `fake-png-bytes` enmascaran el problema: pasan porque no hay verificación de contenido.

---

## Threat / risk concreto

**Riesgo que D3A mitiga (sin exagerar):**

Un cliente autenticado (según RBAC) puede enviar:

```text
Content-Type permitido por el endpoint
+
bytes de otro formato o contenido no reconocible
```

y hacer que MAPS persista ese contenido con extensión, metadatos de tipo y `Content-Type` derivados del MIME **declarado**, no del contenido real.

**Impacto:** integridad del contenido persistido, metadatos de storage poco confiables, reducción de MIME spoofing. Mejora la coherencia entre bytes almacenados y tipo servido.

**Lo que D3A no afirma ni cierra:**

- No garantiza que el archivo completo sea válido, inocuo o seguro frente a parsers externos (PDF readers, decoders de imagen).
- No clasifica automáticamente el escenario como RCE ni ejecución remota.
- No corrige visibilidad pública de certificaciones (intencional y aprobada; no es vulnerabilidad en D3A).

Severidad del hueco de confianza en MIME: **P2/P3** — requiere upload autenticado; el daño principal es integridad de metadatos/contenido persistido, no bypass de auth.

---

## Alcance

- Detector interno puro (4 formatos, firmas binarias).
- Capa de validación por familia (`uploadContentValidation`).
- Integración en los cinco caminos de upload antes de cualquier llamada a `getStorageAdapter().upload*`.
- Mensajes de error funcionales para contenido inválido/no permitido (`400`).
- Tests unitarios del detector y de la validación por familia.
- Tests de integración en los cinco endpoints, con verificación de que storage no se invoca ante contenido D3A inválido.
- Fixtures compartidos en `backend/tests/helpers/binaryFixtures.ts` cuando se reutilicen entre suites.
- Actualización de fixtures ficticios que hoy pasan por MIME declarado (foto perfil).

### Fuera de alcance

- Antivirus / malware scanning.
- Sanitización profunda de PDF; parsing completo de PDF.
- Decodificación completa de imágenes; re-encoding; optimización/compresión; EXIF stripping.
- Ampliación o reducción de formatos permitidos por familia.
- Cambios de visibilidad/autorización de certificaciones; URLs públicas existentes.
- Detección dentro de adapters Local/S3/GCS.
- D3B (coordenadas), D3C (consistencia Storage ↔ DB, compensaciones, huérfanos, transacciones GCS ↔ PostgreSQL).
- Frontend; Prisma/migrations; nuevas variables de entorno; nuevas dependencias (`file-type` u otras).
- Commit/push/implementación en esta etapa (solo TDD).

**Límite explícito de garantía:** D3A verifica el tipo binario **aparente** mediante firmas conocidas. Verificar firma ≠ afirmar que el archivo completo es sano o no malicioso.

---

## Contrato actual vs D3A

| Dimensión | Hoy | D3A |
|-----------|-----|-----|
| Fuente de verdad del tipo | `file.mimetype` (cliente) | Bytes en `file.buffer` (detector backend) |
| Filtro Multer | Única validación de tipo antes de storage | Rechazo temprano por MIME declarado; **no** fuente confiable post-Multer |
| MIME → storage | `file.mimetype` | `detectedMime` |
| MIME → metadatos persistidos | `file.mimetype` (vía storage) | `detectedMime` **solo donde el modelo expone tipo** (`Certificacion.mimeType`, `NoticiaImagen.mimeType`; extensión en URL para foto/portada) |
| MIME declarado ≠ detectado | N/A (no se detecta) | **Aceptar** si `detectedMime` ∈ allowlist de la familia |
| Contenido no reconocido / no permitido | Puede persistirse si MIME declarado pasó Multer | `400` antes de storage; **upload* del adapter no invocado** |
| Adapters | Reciben `mimeType`; derivan extensión | **Sin cambios**; reciben MIME ya verificado |
| Dependencias | multer | Sin nuevas |
| Tamaños máximos | 10 MB cert/noticias; 5 MB foto | **Sin cambio** |
| RBAC / visibilidad certificaciones | Actual | **Sin cambio** |

### Modelo de confianza aprobado

```text
Request multipart
      ↓
Multer (memoryStorage)
  - límite fileSize
  - fileFilter por MIME declarado (rechazo temprano)
      ↓
file.buffer
      ↓
detectAllowedUploadType(buffer)          ← detector puro (lib/detectAllowedUploadType.ts)
      ↓
detectedMime | null
      ↓
assertAllowedUploadContent(buffer, family) ← allowlist + AppError (lib/uploadContentValidation.ts)
      ↓
producers.service / news.service
      ↓
storage.upload*({ buffer, mimeType: detectedMime, ... })
```

**Regla crítica:** `file.mimetype` **no** es fuente confiable después de Multer. Multer puede conservar sus filtros actuales; la seguridad real del tipo depende del contenido.

**Ejemplos:**

| Declarado | Bytes reales | Endpoint | Resultado |
|-----------|--------------|----------|-----------|
| `image/png` | JPEG | Foto perfil | **Aceptar**; `detectedMime = image/jpeg`; almacenar como JPEG |
| `image/png` | WebP | Noticias | **Rechazar** 400 (WebP ∉ allowlist noticias) |
| `application/pdf` | basura | Certificaciones | **Rechazar** 400 |
| `image/gif` | cualquiera | Cualquiera | **Rechazar** en Multer (mensaje actual); D3A no interviene |

---

## Diseño: dos módulos

### 1. Detector puro — `backend/src/lib/detectAllowedUploadType.ts`

Responsabilidad única: inspeccionar bytes y devolver MIME o `null`. **Sin** `AppError`, **sin** conocimiento de familias de endpoint, **sin** dependencia de Express/Multer.

```typescript
export type AllowedUploadMime =
  | 'application/pdf'
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp';

/**
 * Inspecciona solo los bytes necesarios del buffer.
 * Puro, síncrono, sin IO, sin dependencias externas.
 * No usa filename, extensión ni originalname.
 * @returns MIME canónico o null si vacío, truncado o sin firma reconocida.
 */
export function detectAllowedUploadType(buffer: Buffer): AllowedUploadMime | null;
```

**Firmas aprobadas:**

| Formato | MIME | Regla |
|---------|------|-------|
| PDF | `application/pdf` | Bytes iniciales `%PDF-` → hex `25 50 44 46 2D` |
| JPEG | `image/jpeg` | `FF D8 FF` |
| PNG | `image/png` | `89 50 4E 47 0D 0A 1A 0A` (8 bytes) |
| WebP | `image/webp` | Bytes 0–3 = `RIFF`; bytes 8–11 = `WEBP` (buffer mínimo 12 bytes) |

Buffer vacío, truncado o sin firma reconocida → `null`. Evitar lecturas fuera de rango en buffers cortos.

**No** validar estructura interna completa del archivo.

El orden interno de evaluación de firmas **no forma parte del contrato público** del detector. La implementación puede elegir cualquier orden; los tests verifican únicamente `input → MIME | null`.

### 2. Validación por familia — `backend/src/lib/uploadContentValidation.ts`

Depende de `detectAllowedUploadType`; **nunca al revés**. Conoce familias de endpoint, allowlists y mensajes funcionales (`AppError`).

```typescript
import type { AllowedUploadMime } from './detectAllowedUploadType.js';

export type UploadContentFamily = 'certificacion' | 'foto' | 'noticia';

export function assertAllowedUploadContent(
  buffer: Buffer,
  family: UploadContentFamily,
): AllowedUploadMime;
// detectAllowedUploadType(buffer) → null o MIME fuera de allowlist → AppError(400, mensaje por familia)
```

| Familia | `detectedMime` permitidos |
|---------|---------------------------|
| `certificacion` | `application/pdf` |
| `foto` | `image/jpeg`, `image/png`, `image/webp` |
| `noticia` | `image/jpeg`, `image/png` |

Un archivo reconocido por el detector pero fuera de la allowlist de la familia → mismo `400` que contenido inválido (mensaje de la familia, sin revelar el tipo detectado).

### Decisión arquitectónica: sin librería externa

MAPS tiene solo cuatro formatos con firmas simples. **No** usar `file-type` ni dependencias generalistas en D3A.

Si en el futuro crecen significativamente la cantidad o complejidad de formatos, se reevaluará una librería especializada. Esto es **decisión arquitectónica**, no deuda técnica pendiente de D3A.

---

## Integración con uploads

### Punto de enganche

**Services**, inmediatamente después de comprobar `file.buffer` y **antes** de `getStorageAdapter().upload*`:

| Función | Archivo | Familia |
|---------|---------|---------|
| `addCertificacion` | `backend/src/services/producers.service.ts` | `certificacion` |
| `replaceFoto` | `backend/src/services/producers.service.ts` | `foto` |
| `setPortada` | `backend/src/services/news.service.ts` | `noticia` |
| `addImagenGaleria` | `backend/src/services/news.service.ts` | `noticia` |

Controllers y middlewares Multer **no** duplican la detección. Controllers siguen validando presencia de `req.file`.

Flujo en service (pseudocódigo):

```typescript
import { assertAllowedUploadContent } from '../lib/uploadContentValidation.js';

const detectedMime = assertAllowedUploadContent(file.buffer, 'foto');
const uploaded = await storage.uploadFoto({
  buffer: file.buffer,
  mimeType: detectedMime, // nunca file.mimetype
  productorId,
});
```

**Invariante:** ningún objeto se escribe en storage si D3A no produjo un `detectedMime` válido para la familia.

**Propagación de `detectedMime`:**

- **Storage:** siempre recibe `mimeType: detectedMime` en todos los `upload*`.
- **BD:** donde exista columna `mimeType` (`Certificacion`, `NoticiaImagen`), el valor persistido proviene de `uploaded.mimeType`, que a su vez debe reflejar `detectedMime`. En foto de perfil y portada de noticia no hay columna `mimeType`; el tipo queda reflejado en la extensión de la URL generada por el adapter a partir de `detectedMime`.

### Multer

Sin cambios de contrato previstos en:
- `uploadCertificacion.ts`
- `uploadFoto.ts`
- `uploadNewsImage.ts`

Conservar límites, `memoryStorage()` y mensajes de rechazo temprano por MIME declarado inválido.

### Storage adapters

Sin modificaciones. Responsabilidad continúa siendo almacenamiento; reciben `mimeType` ya verificado.

---

## Contrato de errores

### Errores que permanecen (Multer / existentes)

| Condición | Status | Mensaje actual (mantener) |
|-----------|--------|---------------------------|
| MIME declarado inválido (cert) | 400 | `Solo se permiten archivos PDF` |
| MIME declarado inválido (foto) | 400 | `Solo se permiten imágenes JPG, PNG o WEBP` |
| MIME declarado inválido (noticias) | 400 | `Solo se permiten imágenes JPG, JPEG o PNG` |
| Tamaño excedido cert | 413 | `El archivo supera el tamaño máximo de 10 MB.` |
| Tamaño excedido foto | 413 | `El archivo supera el tamaño máximo de 5 MB.` |
| Tamaño excedido noticias | 413 | `El archivo supera el tamaño máximo de 10 MB.` |
| Sin archivo | 400 | `Archivo PDF requerido` / `Imagen requerida` (controllers) |

### Errores nuevos D3A (contenido real inválido o no permitido)

Status: **`400`**. Envelope estándar vía `AppError` + `errorHandler`:

```json
{ "data": null, "message": "<mensaje funcional>", "error": null }
```

| Familia | Mensaje objetivo |
|---------|------------------|
| Certificación | `El archivo no es un PDF válido` |
| Foto perfil | `La foto debe ser un archivo JPG, PNG o WEBP válido` |
| Noticias (portada + galería) | `La imagen debe ser un archivo JPG, JPEG o PNG válido` |

**No revelar al cliente:** magic bytes, signature mismatch, MIME interno detectado, estructura del archivo, detalles del storage.

### Decisión pendiente (mensajes)

El test existente de certificaciones con imagen declarada espera hoy `Solo se permiten archivos PDF` (rechazo Multer). Eso **permanece** para MIME declarado inválido.

Si en implementación un caso borde mezcla rechazo Multer vs D3A con mensajes distintos, documentar en PR; no resolver silenciosamente en código.

---

## Plan de tests

### Fixtures compartidos

**Aprobado:** `backend/tests/helpers/binaryFixtures.ts` para buffers reutilizados entre `producersProfile.integration.test.ts` y `news-imagenes.integration.test.ts`.

- Exportar constantes `Buffer` (desde base64 o bytes literales).
- Sin archivos binarios físicos en disco.
- **`PNG_1x1`:** PNG decodificable (migrar desde `news-imagenes.integration.test.ts`).
- **Fixtures de firma mínima** (JPEG, WebP, PDF texto con `%PDF-`): suficientes para el contrato D3A; no implican imagen/PDF completamente decodificables salvo que el fixture lo sea explícitamente (como `PNG_1x1`).

### Unitarios — detector

Archivo: `backend/tests/detectAllowedUploadType.unit.test.ts`  
Runner: Vitest (mismo estilo que `geocodeNormalize.unit.test.ts`).

Cada caso verifica **únicamente** `input → MIME | null`. No hay tests sobre orden interno de evaluación.

| Caso | Entrada | Esperado |
|------|---------|----------|
| PDF con firma correcta | Buffer que empieza con `%PDF-` | `application/pdf` |
| JPEG con firma correcta | `FF D8 FF` + padding mínimo | `image/jpeg` |
| PNG firma completa | 8 bytes PNG + padding | `image/png` |
| WebP RIFF + WEBP | 12+ bytes con RIFF....WEBP | `image/webp` |
| Buffer vacío | `Buffer.alloc(0)` | `null` |
| Buffer demasiado corto | 1–2 bytes | `null` |
| Texto arbitrario | `Buffer.from('hello')` | `null` |
| PDF firma alterada | bytes que no empiezan con `%PDF-` | `null` |
| JPEG firma alterada | sin `FF D8 FF` | `null` |
| PNG un byte alterado | firma con un byte cambiado | `null` |
| RIFF sin WEBP | RIFF válido sin WEBP en offset 8 | `null` |
| WEBP sin RIFF | WEBP en offset 8 sin RIFF al inicio | `null` |
| Truncamiento WebP | buffer de 11 bytes con prefijo RIFF parcial | `null` (sin throw / sin lectura OOR) |
| Truncamiento PNG | 7 bytes | `null` |

### Unitarios — validación por familia

Archivo: `backend/tests/uploadContentValidation.unit.test.ts` (o casos en el mismo archivo del detector si la suite queda pequeña).

| Caso | Entrada | Familia | Esperado |
|------|---------|---------|----------|
| WebP detectado | fixture firma WebP válida | `noticia` | `AppError` 400, mensaje noticias |
| PDF detectado | fixture firma PDF válida | `certificacion` | retorna `application/pdf` |
| basura | `Buffer.from('hello')` | cualquiera | `AppError` 400 |

### Propiedad obligatoria: storage no invocado ante contenido D3A inválido

En **todos** los casos de integración donde el rechazo ocurre por D3A (contenido no reconocido o no permitido para la familia, con MIME declarado que ya pasó Multer), el test **debe** verificar que el adapter de storage **no** recibió el upload:

| Familia | Método que no debe llamarse |
|---------|----------------------------|
| Certificación | `uploadCertificacion` |
| Foto | `uploadFoto` |
| Noticias | `uploadImagenNoticia` |

El mecanismo concreto (spy/mock sobre `getStorageAdapter`, mock del service, etc.) se elige en implementación según el patrón ya usado en el repo, pero la **propiedad es obligatoria** en cada suite afectada.

### Integración — certificaciones

Archivo: `backend/tests/producersProfile.integration.test.ts`.

**Caminos obligatorios:** productor (`POST /producers/me/certificaciones`) **y** admin (`POST /producers/:id/certificaciones`).

| Caso | Ruta | Attach | Esperado |
|------|------|--------|----------|
| PDF con firma válida, declarado `application/pdf` | `/me/certificaciones` | Buffer con `%PDF-1.4 ...` (fixture actual MAPS-013) | 201; `certificacion.mimeType === 'application/pdf'` |
| Texto/basura, declarado `application/pdf` | `/me/certificaciones` | `Buffer.from('not-a-pdf')` | 400; mensaje D3A; **`uploadCertificacion` no llamado** |
| PNG decodificable, declarado `application/pdf` | `/me/certificaciones` | `PNG_1x1` + `contentType: application/pdf` | 400; mensaje D3A; **`uploadCertificacion` no llamado** |
| Contenido D3A inválido vía admin | `/:id/certificaciones` | basura o PNG con `contentType: application/pdf` | 400; mensaje D3A; **`uploadCertificacion` no llamado** |
| Confirmar MIME en storage/BD | `/me/certificaciones` | PDF firma válida | `mimeType` en respuesta = `application/pdf`; URL coherente con `.pdf` |

Importar fixtures desde `backend/tests/helpers/binaryFixtures.ts`.

### Integración — foto perfil

Archivo: `backend/tests/producersProfile.integration.test.ts` — bloque `POST /producers/me/foto`.

| Caso | Attach | Esperado |
|------|--------|----------|
| PNG decodificable | `PNG_1x1`, `image/png` | 200; URL con extensión `.png` |
| Fixture firma JPEG válida | buffer firma `FF D8 FF` + padding, `image/jpeg` | 200; URL con `.jpg` |
| Fixture firma WebP válida | buffer RIFF+WEBP mínimo, `image/webp` | 200; URL con `.webp` |
| Fixture firma JPEG declarado `image/png` | JPEG firma + `contentType: image/png` | 200; URL con `.jpg` (MIME canónico JPEG) |
| Texto declarado `image/png` | `Buffer.from('fake-png-bytes')` | 400; mensaje D3A; **`uploadFoto` no llamado** |

**Fixture a reemplazar en implementación:** `const pngBuffer = Buffer.from('fake-png-bytes')` — **no** es regresión; sustituir por `PNG_1x1` u otro fixture válido para D3A.

### Integración — noticias (portada + galería)

Archivo: `backend/tests/news-imagenes.integration.test.ts`.

Portada y galería comparten `uploadNewsImageMiddleware` y familia `noticia`; diseñar casos en ambos donde aplique.

| Caso | Ruta | Attach | Esperado |
|------|------|--------|----------|
| PNG decodificable | portada + galería | `PNG_1x1` | 200 / 201 (existente; mantener verde) |
| Fixture firma JPEG válida | portada + galería | JPEG firma mínima | 200 / 201; extensión `.jpg`; en galería verificar `NoticiaImagen.mimeType` vía Prisma |
| Fixture firma WebP declarado `image/png` | portada + galería | WebP firma mínima + `image/png` | 400; mensaje D3A; **`uploadImagenNoticia` no llamado** |
| Basura declarada `image/png` | portada | `fake-png-bytes` | 400; mensaje D3A; **`uploadImagenNoticia` no llamado** |
| MIME canónico en galería | `POST .../imagenes` con fixture firma JPEG | — | DTO HTTP `{ id, url, orden }` sin cambios; `NoticiaImagen.mimeType === 'image/jpeg'` verificado en integración vía Prisma |

Fixtures desde `binaryFixtures.ts`. **`GIF_1x1`:** sigue sirviendo para rechazo **Multer** (MIME declarado no permitido), no para D3A.

### Tests que no cambian de enfoque

- `storage-contracts.unit.test.ts`, `gcs-storage.unit.test.ts`: buffers ficticios con `mimeType` explícito prueban **contrato del adapter**; el detector no se introduce ahí.
- Tests de RBAC, límites de tamaño Multer, tope galería 10 imágenes: permanecen; solo ajustar fixtures de contenido donde corresponda.

---

## Compatibilidad / regresiones esperadas

| Cambio | ¿Regresión? |
|--------|-------------|
| Foto perfil con `fake-png-bytes` deja de pasar | **No** — corrección intencional |
| Uploads con MIME declarado correcto y bytes coherentes | Deben seguir pasando |
| PDF test MAPS-013 con prefijo `%PDF-1.4` | Debe seguir pasando (firma válida) |
| JPEG declarado como PNG en foto perfil | Pasa **después** de D3A (comportamiento nuevo aprobado) |
| Rechazo GIF en noticias por Multer | Sin cambio |
| Adapters / frontend / Prisma | Sin cambio |

Tras implementación: `npm test`, lint, typecheck y build backend deben permanecer verdes.

---

## Archivos previstos para implementación

| Pieza | Ubicación | Rol |
|-------|-----------|-----|
| Detector puro | `backend/src/lib/detectAllowedUploadType.ts` | **Nuevo** — `AllowedUploadMime`, `detectAllowedUploadType` |
| Validación por familia | `backend/src/lib/uploadContentValidation.ts` | **Nuevo** — allowlists, `assertAllowedUploadContent`, `AppError` funcional; importa detector |
| Unit tests detector | `backend/tests/detectAllowedUploadType.unit.test.ts` | **Nuevo** |
| Unit tests validación | `backend/tests/uploadContentValidation.unit.test.ts` | **Nuevo** (o fusionado si la suite queda pequeña) |
| Fixtures compartidos | `backend/tests/helpers/binaryFixtures.ts` | **Nuevo** — buffers base64/bytes reutilizables |
| Service productores | `backend/src/services/producers.service.ts` | **Modificar** — `addCertificacion`, `replaceFoto` |
| Service noticias | `backend/src/services/news.service.ts` | **Modificar** — `setPortada`, `addImagenGaleria` |
| Tests integración productores | `backend/tests/producersProfile.integration.test.ts` | **Modificar** — fixtures, casos D3A, admin cert, spy storage |
| Tests integración noticias | `backend/tests/news-imagenes.integration.test.ts` | **Modificar** — casos D3A, spy storage |
| Middlewares Multer | `uploadCertificacion.ts`, `uploadFoto.ts`, `uploadNewsImage.ts` | **Sin cambio** previsto |
| Storage adapters | `local.adapter.ts`, `s3.adapter.ts`, `gcs.adapter.ts` | **Sin cambio** |
| Controllers | `producers.controller.ts`, `news.controller.ts` | **Sin cambio** previsto |
| Frontend | — | **Fuera de alcance** |
| package.json / Prisma | — | **Sin cambio** |

---

## Criterios de aceptación

- [x] Los cuatro formatos (`application/pdf`, `image/jpeg`, `image/png`, `image/webp`) se reconocen correctamente en unit tests (`input → MIME | null`).
- [x] `assertAllowedUploadContent` rechaza tipos fuera de allowlist por familia.
- [x] Archivos con MIME declarado permitido pero contenido inválido o no permitido para la familia → `400` con mensaje funcional; **`uploadCertificacion` / `uploadFoto` / `uploadImagenNoticia` no invocados**.
- [x] MIME declarado y detectado pueden diferir sin rechazo cuando el tipo real ∈ allowlist del endpoint (caso JPEG declarado PNG en foto).
- [x] Storage recibe exclusivamente `detectedMime`; cualquier metadato de tipo persistido (columnas `mimeType` donde existan, extensión en URL donde no) refleja `detectedMime`, nunca `file.mimetype`.
- [x] Ningún `storage.upload*` se ejecuta antes de pasar D3A.
- [x] Los cinco caminos de upload cubiertos; **al menos un caso D3A inválido en `POST /producers/:id/certificaciones` (admin)**.
- [x] Límites 10 MB / 5 MB, RBAC y visibilidad pública de certificaciones sin cambios.
- [x] Sin dependencias nuevas.
- [x] Fixtures ficticios (`fake-png-bytes`) reemplazados donde prueban uploads reales; fixtures compartidos en `binaryFixtures.ts` cuando aplique.
- [x] `npm test` backend verde; lint/typecheck/build verdes.
- [x] Mensajes de error no filtran detalles internos (bytes, MIME detectado, storage).

---

## Riesgos / residuales

| Riesgo | Probabilidad | Impacto | Notas |
|--------|--------------|---------|-------|
| Falsos negativos en PDFs con whitespace/BOM antes de `%PDF-` | Baja | Medio | Firmas aprobadas exigen prefijo estricto; PDFs no estándar podrían rechazarse. Aceptado en D3A. |
| JPEG/WebP polyglot edge cases | Baja | Bajo | Solo firma inicial; no parsing completo. |
| Confusión mensaje Multer vs D3A | Media | Bajo | Documentado en sección errores. |
| Spy/mock de storage inconsistente entre suites | Baja | Medio | Elegir un patrón en implementación; la propiedad “no upload” es obligatoria. |

**Residual explícito:** un archivo con firma válida pero contenido malformado o malicioso puede persistirse. D3A no sustituye antivirus ni validación profunda de parsers.

---

## Decisiones ya cerradas

- Rama `fix/d3a-file-content-validation`; identificador D3A.
- **Dos módulos:** `detectAllowedUploadType.ts` (puro) + `uploadContentValidation.ts` (familias + `AppError`); dependencia unidireccional.
- Detector interno; **no** `file-type` ni deps externas.
- Cuatro MIME soportados; firmas binarias documentadas en este TDD.
- Orden interno de evaluación de firmas: **fuera del contrato**; tests solo `input → MIME | null`.
- Multer conserva filtros tempranos por MIME declarado.
- Post-Multer: contenido es fuente de verdad; **no** exigir igualdad declarado vs detectado.
- `detectedMime` propagado a storage; metadatos de tipo persistidos derivan de `detectedMime` donde aplique.
- Integración en services antes de storage.
- Errores D3A → `400` con mensajes funcionales por familia.
- Visibilidad pública de certificaciones: sin cambio.
- Fixtures compartidos: **`backend/tests/helpers/binaryFixtures.ts`** aprobado.
- Test admin certificaciones (`POST /producers/:id/certificaciones`) con contenido D3A inválido: **obligatorio**.
- Rechazo D3A inválido: verificar que **`uploadCertificacion` / `uploadFoto` / `uploadImagenNoticia` no se llamen**.
- Reevaluación de librería especializada solo si crece complejidad de formatos (decisión arquitectónica futura, no deuda D3A).

---

## Preguntas abiertas

Ninguna bloqueante tras esta revisión.

---

## Preguntas / contradicciones para revisión

*Ninguna contradicción material encontrada entre las decisiones aprobadas y el código releído en `fix/d3a-file-content-validation`.*

Hallazgos informativos (no bloquean el diseño):

- Los cinco uploads usan efectivamente `memoryStorage()` y campo `file` — alineado con D3A.
- No existen otros endpoints Multer de upload en el backend auditado.
- `addCertificacion` / `replaceFoto` / `setPortada` / `addImagenGaleria` son los únicos puntos que llaman `uploadCertificacion` / `uploadFoto` / `uploadImagenNoticia`.
- El patrón `STORED_FILE_PATTERNS.noticias` en `types.ts` admite extensión `.jpeg` en regex, pero `NOTICIA_EXTENSION_BY_MIME` solo mapea a `.jpg` — comportamiento preexistente; **fuera de alcance D3A**.

---

## Referencias

- **TDD de estilo:** `docs/tdd/D2A-tdd-logout-robusto.md`, `docs/tdd/_TEMPLATE-tdd.md`
- **Middlewares:** `backend/src/middlewares/uploadCertificacion.ts`, `uploadFoto.ts`, `uploadNewsImage.ts`
- **Rutas:** `backend/src/api/v1/routes/producers.routes.ts`, `news.routes.ts`
- **Services:** `backend/src/services/producers.service.ts`, `news.service.ts`
- **Storage:** `backend/src/lib/storage/types.ts`, adapters Local/S3/GCS
- **Tests:** `backend/tests/producersProfile.integration.test.ts`, `news-imagenes.integration.test.ts`, `storage-contracts.unit.test.ts`
- **Errores:** `backend/src/lib/errors.ts`, `backend/src/middlewares/errorHandler.ts`

---

## Plan de implementación

### Fase 1 — Lib
- [x] Crear `detectAllowedUploadType.ts` + unit tests
- [x] Crear `uploadContentValidation.ts` + unit tests
- [x] Crear `backend/tests/helpers/binaryFixtures.ts`
- [x] `npm test` unitarios

### Fase 2 — Services
- [x] Integrar `assertAllowedUploadContent` en `addCertificacion`, `replaceFoto`, `setPortada`, `addImagenGaleria`
- [x] Sustituir `file.mimetype` por `detectedMime` en llamadas storage

### Fase 3 — Integración
- [x] Actualizar fixtures y ampliar tests en `producersProfile.integration.test.ts` (incl. admin cert D3A inválido) y `news-imagenes.integration.test.ts`
- [x] Verificar propiedad “storage no invocado” en todos los casos D3A inválidos
- [x] `npm test` backend completo

### Fase 4 — Cierre
- [x] Verificar lint/typecheck/build
- [x] Cierre documental (worklog, módulos, ARCHITECTURE, CHANGELOG)
- [ ] Integración/merge a `development`
- [ ] Actualizar este TDD a **Implementado** (post-merge, en PR de código)

---

## Cierre técnico en rama (2026-09-04)

Implementación y validación técnica completadas en rama `fix/d3a-file-content-validation`; **pendiente integración/merge**.

El **Estado** formal del documento permanece **APROBADO — pendiente implementación** hasta el merge; la implementación ya existe en la rama indicada.

### Resultados de validación

| Verificación | Resultado |
|--------------|-----------|
| Integración targeted (`producersProfile` + `news-imagenes`) | **47/47 PASS** |
| `npm test` backend completo | **293/293 PASS** |
| `npm run typecheck` | OK |
| `npm run lint` | OK |
| `npm run build` | OK |
| `git diff --check` | OK |

### Review final

Review read-only del diff acumulado: **APROBADA** — sin findings funcionales, de seguridad ni regresión pendientes dentro del alcance D3A.

### Quality gates

- [x] Detector y política sin dependencias externas
- [x] Cuatro funciones de service integradas; controllers/middlewares/adapters sin cambios
- [x] Cinco endpoints HTTP cubiertos en integración
- [x] Propiedad “storage no invocado” en todos los rechazos D3A de integración
- [x] Suite backend completa verde
- [x] typecheck / lint / build / diff-check verdes
