# D3C — TDD: Consistencia Storage ↔ DB

Documento de diseño técnico para reducir las ventanas de inconsistencia entre PostgreSQL y los adapters de storage (local, GCS y S3) en certificaciones, foto de perfil y assets de noticias dentro del proyecto MAPS Asesores.

**Identificador:** D3C (no es un ticket `MAPS-XXX`; la rama es `fix/d3c-storage-db-consistency`). D3A (validación de contenido de uploads) y D3B (integridad de coordenadas) están mergeados en `development` y quedan fuera de esta entrega.

**Estado:** APROBADO — pendiente implementación  
**Autor:** equipo MAPS  
**Revisores:** —  
**Creado:** 2026-09-07  
**Última actualización:** 2026-09-07 (microcorrección: reconocimiento estricto de URLs managed)

---

## Resumen

D3C reduce las ventanas de inconsistencia entre PostgreSQL y los adapters de storage (local, GCS y S3) en certificaciones, foto de perfil y assets de noticias.

No existe transacción distribuida entre Prisma y storage, por lo que se adopta:

- PostgreSQL como source of truth;
- operaciones ordenadas;
- compensación de uploads nuevos;
- cleanup post-DB best-effort;
- errores de cleanup observables.

Sin migraciones, frontend, outbox ni cambios de contrato HTTP.

---

## Objetivo

- Eliminar los patrones actuales que borran blobs en storage **antes** de confirmar el cambio en PostgreSQL.
- Compensar uploads nuevos cuando la escritura DB falla (CREATE y REPLACE).
- Normalizar la semántica de `delete` en adapters (local/S3) sin cambiar paths ni naming.
- Endurecer el reconocimiento de URLs managed en local/S3 para que una URL externa nunca derive ruta/key interna por basename/pathname arbitrario.
- Hacer observable (log estructurado) cualquier fallo de compensación o cleanup best-effort.
- Mantener intactos D3A, contratos HTTP públicos y quality gates backend.

---

## Contexto / situación actual

### Relevamiento en rama `development` (post-D3B)

Los únicos services que combinan escritura/borrado en storage con persistencia Prisma son `backend/src/services/producers.service.ts` y `backend/src/services/news.service.ts`. No hay transacciones que unifiquen storage y BD en ningún flujo.

**Adapters:** `backend/src/lib/storage/{index,types,local,gcs,s3}.adapter.ts`

**Rutas HTTP relevantes:**

| Familia | Método | Ruta | Service |
|---------|--------|------|---------|
| Certificación propia | `POST` | `/producers/me/certificaciones` | `addCertificacion` |
| Certificación admin | `POST` | `/producers/:id/certificaciones` | `addCertificacion` |
| Certificación baja | `DELETE` | `.../certificaciones/:certId` | `removeCertificacion` |
| Foto perfil | `POST` | `/producers/me/foto` | `replaceFoto` |
| Portada | `POST` | `/news/:id/portada` | `setPortada` |
| Quitar portada | `DELETE` | `/news/:id/portada` | `removePortada` |
| Galería alta | `POST` | `/news/:id/imagenes` | `addImagenGaleria` |
| Galería baja | `DELETE` | `/news/:id/imagenes/:imagenId` | `removeImagenGaleria` |
| Borrar noticia | `DELETE` | `/news/:id` | `deleteNews` |

Admin y productor reutilizan exactamente `addCertificacion` / `removeCertificacion`; los wrappers solo resuelven `productorId`. No existe endpoint admin para foto.

### Flujos auditados (A–H)

| Flujo | Orden actual | Riesgo principal | Severidad |
|-------|--------------|------------------|-----------|
| **A** Certificación alta | upload → count → create DB | DB fail → orphan físico | P2 |
| **B** Certificación baja | storage delete → DB delete | DB fail → referencia DB rota | P1 |
| **C** Foto reemplazo | upload nueva → DB update → cleanup vieja | DB fail → orphan nuevo | P2 |
| **D** Portada reemplazo | upload nueva → delete vieja → DB update | DB fail → referencia rota vieja + orphan nuevo | **P1** |
| **E** Portada eliminación | storage delete → DB null | DB fail → referencia rota | P1 |
| **F** Galería alta | count/tope → upload → DB create | DB fail → orphan | P2 |
| **G** Galería baja | storage delete → DB delete | DB fail → referencia rota | P1 |
| **H** Delete noticia | storage cleanup → DB delete cascade | DB fail → noticia/galería persisten apuntando a blobs borrados | **P1** |

**Detalle por flujo:**

- **A:** `storage.uploadCertificacion` → `prisma.certificacion.count` → `prisma.certificacion.create`. Sin compensación si falla count o create.
- **B:** `storage.deleteCertificacion` (sin `.catch`) → `prisma.certificacion.delete`.
- **C:** `storage.uploadFoto` → `prisma.productor.update` → `storage.deleteFoto(vieja).catch(() => undefined)`. Orden REPLACE parcialmente correcto en DB-first para el blob nuevo; cleanup viejo silencioso.
- **D:** `storage.uploadImagenNoticia` → `deleteImagenNoticia(vieja).catch` → `prisma.noticia.update`. El caso crítico: delete viejo OK + DB update FAIL deja `imagenUrl` apuntando a archivo ya borrado.
- **E:** `deleteImagenNoticia` → `prisma.noticia.update({ imagenUrl: null })`.
- **F:** `count` (tope 10) → D3A → upload → `noticiaImagen.create`.
- **G:** `deleteImagenNoticia` → `noticiaImagen.delete`.
- **H:** captura URLs → `Promise.all(deleteImagenNoticia.catch)` → `prisma.noticia.delete` (cascade `NoticiaImagen` en BD).

### Por qué ahora

Tras D3A (validación de contenido) y D3B (coordenadas), la auditoría D3C identificó ventanas de inconsistencia storage ↔ DB con impacto en integridad de lecturas (referencias rotas) y deuda operativa (huérfanos). D3C cierra el gap de orden de operaciones sin introducir infraestructura de consistencia eventual.

---

## Alcance

- Reordenar operaciones en `producers.service.ts` y `news.service.ts` (flujos A–H).
- Compensación de uploads nuevos en CREATE/REPLACE cuando falla la escritura DB.
- DB-first en todos los DELETE.
- Helper `storageConsistency.ts` con logging mínimo de fallos de cleanup/compensación.
- Normalización semántica de deletes y reconocimiento estricto de URLs managed en `local.adapter.ts` y `s3.adapter.ts`.
- Tests unitarios del helper y tests de integración/unitarios con spies para ventanas de fallo.
- Documentación post-implementación (`modules/producers`, `modules/news`, `CHANGELOG`, worklog D3C) — **fuera de este commit de diseño**.

### Fuera de alcance

- Frontend.
- Prisma / migraciones / nuevas tablas.
- Outbox, `pending_files`, cron, Cloud Tasks, Pub/Sub, lifecycle automation.
- Auth en `GET /api/v1/uploads/:category/:filename`.
- Signed URLs, lifecycle bucket, job automático de reconciliación.
- **I1:** `Productor.foto` editable como string vía flujo admin (no invoca `StorageAdapter`).
- Concurrencia: `count` + `orden`, tope galería, doble click, idempotency keys, reemplazos simultáneos, delete/add concurrentes.
- Cambios de contrato HTTP público.
- Nuevas dependencias.

---

## Diseño propuesto

### Principios de diseño

1. **PostgreSQL es el source of truth lógico.** La aplicación expone al usuario lo que está en BD; storage es blob store derivado.

2. **Prioridad operativa:** nunca eliminar deliberadamente un blob todavía referenciado por DB antes de confirmar el cambio DB.

3. **Un orphan de storage es preferible a una referencia DB rota** porque:
   - no rompe lecturas activas;
   - puede reconciliarse posteriormente;
   - no requiere restaurar metadata DB.

4. **Esto NO equivale a consistencia atómica.** Pueden quedar huérfanos si compensación y cleanup también fallan.

5. **`prisma.$transaction` no puede rollbackear GCS/S3/filesystem.** No se usará transacción Prisma para simular atomicidad cross-system.

6. **Compensación es best-effort:** si DB falla y el cleanup del upload nuevo también falla, se preserva el error DB original (no se enmascara con error de storage).

7. **Cleanup posterior a DB:** si falla, no se revierte la operación DB ni se transforma un éxito lógico en error HTTP.

### CREATE / REPLACE — contrato general

```text
UPLOAD NUEVO
    |
    v
WRITE DB
  /   \
OK    FAIL
|      |
v      v
cleanup viejo    compensar nuevo
best-effort      best-effort
|
v
return success
```

#### CREATE (certificación, imagen galería)

1. Validar (buffer, D3A).
2. Upload a storage.
3. Intentar persistir en DB (`create`).
4. Si DB falla:
   - intentar borrar exactamente el upload recién creado (compensación);
   - si cleanup falla, log estructurado `storage.consistency_cleanup_failed`;
   - relanzar error DB original.
5. Si DB OK → return success.

#### REPLACE (foto, portada)

1. Capturar URL actual.
2. Validar (buffer, D3A).
3. Upload nuevo.
4. DB update a URL nueva.
5. Si DB falla:
   - borrar upload nuevo best-effort;
   - **no tocar** blob viejo;
   - relanzar error DB.
6. Si DB OK:
   - borrar blob viejo best-effort;
   - cleanup fail solo se registra;
7. Return success.

**Cambio obligatorio en `setPortada`:**

| Antes (actual) | Después (D3C) |
|----------------|---------------|
| upload nueva → delete vieja → DB update | upload nueva → DB update → delete vieja best-effort |

### DELETE — contrato general

```text
READ URL
   |
   v
DB DELETE / NULL
   |
   v
STORAGE CLEANUP best-effort
   |
   v
SUCCESS
```

Aplica a: certificación, `removePortada`, `removeImagenGaleria`, `deleteNews`.

#### Certificación (`removeCertificacion`)

1. Leer fila + URL (`findFirst` → `404` si no existe).
2. Borrar fila DB (`certificacion.delete`).
3. Intentar `deleteCertificacion` en storage.
4. Cleanup fail: log; HTTP sigue `200`.

**Nota de riesgo (privacidad):** la ruta `GET /api/v1/uploads/:category/:filename` no requiere auth en el router actual. Un orphan de certificación puede seguir accesible por URL conocida. Mitigación D3C: cleanup inmediato + log obligatorio + documentar reconciliación futura. **No** agregar auth a uploads en D3C.

#### `deleteNews`

1. Cargar noticia + URLs de portada y galería.
2. Borrar noticia en DB (`prisma.noticia.delete`); cascade elimina filas `NoticiaImagen`.
3. Ejecutar cleanup de todas las URLs capturadas **después** del delete DB.
4. Usar `Promise.allSettled` (o equivalente) para intentar todos los deletes.
5. Registrar cada fallo individual.
6. HTTP `204` aunque cleanup parcial falle.

**No** borrar archivos antes de `prisma.noticia.delete`.

### Estado objetivo por flujo (A–H)

| Flujo | Orden objetivo D3C |
|-------|-------------------|
| **A** Certificación alta | upload → DB create → compensate new on DB fail |
| **B** Certificación baja | DB delete → cleanup storage |
| **C** Foto replace | upload new → DB update → cleanup old; DB fail → cleanup new |
| **D** Portada replace | upload new → DB update → cleanup old; DB fail → cleanup new (viejo intacto) |
| **E** Portada remove | DB `imagenUrl=null` → cleanup old |
| **F** Galería alta | upload → DB create; DB fail → cleanup new |
| **G** Galería remove | DB delete → cleanup blob |
| **H** Delete noticia | DB delete cascade → cleanup all captured URLs |

### Storage adapter contract

D3C normaliza semántica de `delete` en todos los adapters:

| Caso | Comportamiento |
|------|----------------|
| URL no gestionada (externa / no parseable) | no-op |
| Objeto/archivo inexistente | success / no-op |
| Error real de proveedor o filesystem | **throw** |

**Regla explícita:** una URL se considera **managed** únicamente si puede demostrarse que fue generada por ese adapter/configuración. **No alcanza** con extraer `basename` o `pathname` de una URL arbitraria.

La capa service decide si ese error se trata como compensación best-effort o cleanup post-DB best-effort (ambos: capturar, loguear, no throw al cliente).

#### Brecha actual (hallazgo de auditoría)

**Local** (`local.adapter.ts`): `filenameFromUrl()` acepta cualquier URL parseable y extrae solo `path.basename(pathname)`. Una URL externa como `https://externo.example/avatar.png` puede convertirse en `avatar.png` e intentar borrarse del directorio managed local.

**S3** (`s3.adapter.ts`): `keyFromUrl()` — si la URL no empieza por `publicBase`, igualmente parsea la URL y usa `pathname` como key. Una URL de otro origen puede interpretarse erróneamente como key del bucket.

**GCS** (`gcs.adapter.ts`): ya valida managed URL de forma estricta (origen, path, categoría, filename). Referencia conceptual para local/S3; sin exigir refactor compartido prematuro.

#### Managed URL recognition

##### Local

Una URL solo se considera managed si corresponde al **origen/ruta pública esperada** del storage local y a la **categoría esperada** de la operación (`certificaciones`, `fotos`, `noticias`).

No usar únicamente `path.basename()` sobre una URL arbitraria para decidir qué archivo eliminar.

URL externa, origen distinto o path fuera de:

- `/uploads/certificaciones/`
- `/uploads/fotos/`
- `/uploads/noticias/`

(según la operación invocada) → **no-op**.

Mantener soporte necesario para las URLs generadas por:

- `certificacionPublicUrl` (`backend/src/lib/uploadPaths.ts`)
- `fotoPublicUrl`
- `noticiaPublicUrl`

(base: `API_PUBLIC_URL` o `http://localhost:${PORT}`). No cambiar naming de archivos.

##### S3

Una URL solo se considera managed si pertenece al `S3_PUBLIC_BASE_URL` efectivo del adapter (`envSchema`: `z.string().url().optional()` en `backend/src/config/env.ts`).

No convertir `pathname` de otro origen en key interna del bucket.

Ejemplos:

| URL | Resultado |
|-----|-----------|
| `https://externo.example/noticias/x.jpg` | unmanaged → no-op |
| `https://assets.maps.example/noticias/x.jpg` (con `S3_PUBLIC_BASE_URL=https://assets.maps.example`) | managed → key `noticias/x.jpg` |

Considerar correctamente:

- `origin` (comparación por URL parseada, no substring ciego);
- base pathname si `S3_PUBLIC_BASE_URL` pudiera contener path (auditar implementación/env antes de fijar parser; no inventar soporte innecesario);
- boundary de prefijo, evitando falsos `startsWith` (p. ej. `https://assets.maps.example.evil.com/...` o prefijos parciales).

##### GCS

Mantener diseño actual (`parseManagedUrl` + `isStoredFilename`); usarlo conceptualmente como referencia de parsing estricto. **No cambiar** comportamiento salvo necesidad demostrada por tests de regresión.

#### Semántica delete por adapter (complemento)

##### Local

Además del reconocimiento managed:

- `ENOENT` en `unlink` → no-op;
- otros errores de `unlink` → throw.

No cambiar paths ni naming de archivos.

##### S3

Además del reconocimiento managed:

- Eliminar catch amplio que traga errores reales en `deleteFoto` / `deleteImagenNoticia`;
- `DeleteObject` sobre objeto inexistente debe ser idempotente (confirmar vía tests/mock del SDK, no asumir);
- Errores reales de red/proveedor deben propagarse al caller;
- `deleteCertificacion` alineado bajo el mismo contrato (propagación de errores reales; no-op solo para URL/key no managed).

**No crear** un parser compartido prematuramente. Primero mantener parsing específico por adapter salvo duplicación real demostrada.

### Helper de consistencia

**Archivo nuevo (no implementar en este TDD):** `backend/src/lib/storageConsistency.ts`

Responsabilidades:

#### A. `cleanupBestEffort`

```typescript
async function cleanupBestEffort(options): Promise<void>
```

- Recibe operación/categoría/resourceId y callback de delete.
- Ejecuta el callback.
- Captura error.
- Registra evento identificable.
- **No throw.**

#### B. `compensateUploadFailure`

Puede reutilizar `cleanupBestEffort` semánticamente (misma implementación o wrapper fino).

**Evitar abstraer demasiado.** No incluir en el helper:

- Prisma;
- `StorageAdapter` concreto;
- HTTP / `AppError`;
- retries;
- jobs.

El helper recibe callbacks; no conoce dominios Productor/Noticia.

**Logging mínimo:**

Evento: `storage.consistency_cleanup_failed`

Metadata segura:

- `operation` (ej. `compensate_upload`, `cleanup_after_db_delete`);
- `category` (`certificaciones` | `fotos` | `noticias`);
- `resourceId` (productorId, noticiaId, certId, etc.);
- `errorName` / `errorMessage`.

**No loguear:** buffer, credenciales, tokens, secrets. No es necesario loguear URL completa.

### Componentes / archivos afectados

| Pieza | Ubicación | Rol |
|-------|-----------|-----|
| Helper consistencia | `backend/src/lib/storageConsistency.ts` | **Nuevo** — cleanup/compensación best-effort + log |
| Service productores | `backend/src/services/producers.service.ts` | **Mod** — flujos A, B, C |
| Service noticias | `backend/src/services/news.service.ts` | **Mod** — flujos D–H |
| Adapter local | `backend/src/lib/storage/local.adapter.ts` | **Mod** — reconocimiento managed + ENOENT vs throw |
| Adapter S3 | `backend/src/lib/storage/s3.adapter.ts` | **Mod** — reconocimiento managed + contrato delete unificado |
| Adapter GCS | `backend/src/lib/storage/gcs.adapter.ts` | Probablemente sin cambios |
| Types/index | `backend/src/lib/storage/types.ts`, `index.ts` | Solo si contrato/tipos lo exigen; evitar si no hace falta |
| Tests helper | `backend/tests/storageConsistency.unit.test.ts` | **Nuevo** |
| Tests productores | `backend/tests/producersProfile.integration.test.ts` | **Mod** |
| Tests noticias | `backend/tests/news-imagenes.integration.test.ts` | **Mod** |
| Tests GCS | `backend/tests/gcs-storage.unit.test.ts` | Posible regresión |
| Tests adapters | `backend/tests/storage-contracts.unit.test.ts` | **Mod** o mínimo archivo nuevo — contrato managed URL + delete |

### Modelo de datos

**N/A.** Sin migraciones ni columnas nuevas.

### Contratos de API

D3C **no cambia** contratos públicos.

| Operación | Método | Status éxito |
|-----------|--------|--------------|
| Certificación create | `POST` | `201` |
| Certificación delete | `DELETE` | `200` |
| Foto upload/replace | `POST` | `200` |
| Portada set / remove | `POST` / `DELETE` | `200` |
| Galería create | `POST` | `201` |
| Galería delete | `DELETE` | `204` |
| Noticia delete | `DELETE` | `204` |

Mantener D3A: `400`, `401`, `403`, `404`, `413`, `422` existentes.

**Reglas de error:**

| Situación | Respuesta HTTP |
|-----------|----------------|
| Upload failure antes de DB | Error actual / `500` provider según middleware |
| DB failure | `500` actual (preservar error DB) |
| Cleanup fail tras DB success | Success HTTP original + log |
| Compensación fail tras DB failure | Preservar `500`/error DB original + log |

**No exponer** al cliente: `CLEANUP_FAILED` ni detalles de storage.

### UI / UX

**N/A.**

---

## Certificaciones — trade-off privacidad

DB-first en delete puede dejar un PDF orphan si cleanup falla.

Como `/api/v1/uploads/:category/:filename` no está autenticado en el router, una URL previamente conocida podría seguir funcionando mientras el blob exista.

**Decisión D3C:** aceptar este riesgo residual frente al riesgo de una referencia DB rota (usuario ve certificación listada que devuelve 404).

**Mitigaciones en D3C:**

- cleanup intentado inmediatamente tras DB delete;
- fallo observable vía log;
- reconciliación futura documentada;
- el archivo deja de publicarse/listarse desde DB tras el delete.

**Fuera de D3C:** auth de uploads, signed URLs, lifecycle bucket, job automático.

---

## I1 — fuera de alcance

`Productor.foto` editable como string vía `producersService.create` / `update` (admin) no se resuelve en D3C.

Motivo: no invoca `StorageAdapter` y requiere decisión separada sobre URLs externas, URLs managed, validación, cleanup y UX admin.

Deuda separada.

---

## Concurrencia — fuera de alcance

No resolver en D3C:

- `count` + `orden` en certificaciones;
- `count`/tope en galería;
- doble click;
- idempotency keys;
- reemplazos simultáneos de foto/portada;
- delete/add concurrentes sobre la misma noticia.

D3C no debe empeorar estos casos. Registrar como deuda P2 separada.

---

## Reconciliación — fuera de alcance

No crear outbox, `pending_files`, cron ni tabla de orphan tracking.

**Follow-up recomendado:** ticket "reconciliación Storage ↔ DB" con objetivo futuro de listar referencias DB, listar objetos managed, detectar huérfanos y referencias rotas, cleanup/manual report.

No es requisito para cerrar D3C.

---

## Decisiones tomadas

- PostgreSQL es source of truth; storage es derivado.
- CREATE/REPLACE: upload → DB → cleanup viejo (o compensar nuevo si DB falla).
- DELETE: DB primero → cleanup storage best-effort.
- `setPortada` pasa de delete-viejo-antes-de-DB a DB-antes-de-delete-viejo.
- `deleteNews` pasa de storage-antes-de-DB a DB-antes-de-storage.
- Cleanup/compensación failure: log `storage.consistency_cleanup_failed`; no cambiar HTTP de éxito.
- Error DB original siempre prevalece sobre error de compensación.
- Helper `storageConsistency.ts` con callbacks; sin Prisma ni dominio.
- GCS: sin cambios salvo regresión demostrada.
- S3/Local: alinear contrato delete (missing/unmanaged no-op; error real throw) y reconocimiento estricto de URLs managed.
- Auth en uploads: fuera de D3C.
- I1, concurrencia, reconciliación: fuera de D3C.

---

## Alternativas consideradas

### A. Storage-first (status quo en varios DELETE)

- **Qué era:** borrar blob antes de confirmar cambio DB.
- **Pros:** blob desaparece pronto; aparente "privacidad inmediata".
- **Contras:** referencias DB rotas; peor UX; irreversible sin restaurar metadata.
- **Por qué se descartó:** contradice source of truth DB; caso D es el más dañino.

### B. Prisma transaction incluyendo storage

- **Qué era:** envolver upload/delete storage dentro de `prisma.$transaction`.
- **Pros:** familiar para devs backend.
- **Contras:** no ofrece atomicidad cross-system; rollback DB no revierte GCS/S3/disco.
- **Por qué se descartó:** falsa sensación de seguridad.

### C. Outbox / pending states

- **Qué era:** estados `pending_upload` / `pending_delete` + worker de reconciliación.
- **Pros:** consistencia eventual robusta; observabilidad.
- **Contras:** sobredimensionado para MAPS hoy; nueva infra y schema.
- **Por qué se descartó:** follow-up post-D3C.

### D. Ignorar cleanup

- **Qué era:** mantener `.catch(() => undefined)` sin log ni compensación.
- **Pros:** mínimo código.
- **Contras:** deuda invisible; costo storage; riesgo privacidad en certs; sin recoverability.
- **Por qué se descartó:** inaceptable tras auditoría D3C.

---

## Plan de tests

Tests determinísticos para failure windows. Preferir mocks/spies sobre `StorageAdapter` + Prisma.

### Helper (`storageConsistency.unit.test.ts`)

- Cleanup success → no log.
- Cleanup reject → no throw.
- Cleanup reject → log una vez.
- Callback ejecutado exactamente una vez.

### Adapters — contrato managed URL y delete (Fase 1, obligatorio)

Usar `backend/tests/storage-contracts.unit.test.ts` si encaja; si no, crear el mínimo archivo de test necesario. **No** duplicar cobertura GCS ya existente en `gcs-storage.unit.test.ts`.

#### Local

1. URL managed de cada categoría (`certificacionPublicUrl`, `fotoPublicUrl`, `noticiaPublicUrl`) → intenta borrar el archivo correcto en el directorio esperado.
2. URL externa con mismo basename que archivo local managed → **no** intenta borrar archivo managed.
3. Path de categoría distinta (p. ej. URL de `/uploads/fotos/` pasada a `deleteCertificacion`) → no-op.
4. Archivo managed inexistente → no-op.
5. `unlink` error `ENOENT` → no-op.
6. `unlink` error distinto de `ENOENT` → throw.

#### S3

1. URL bajo `S3_PUBLIC_BASE_URL` efectivo → genera key correcta y llama `DeleteObject`.
2. URL de otro origin → **no** `DeleteObject`.
3. URL con origin parecido/prefijo malicioso (p. ej. `https://assets.maps.example.evil.com/...`) → **no** `DeleteObject`.
4. URL de categoría/path managed → `DeleteObject` con key correcta.
5. Key/URL no gestionada → no-op.
6. Error real de `client.send` → throw.

**Nota implementación:** auditar `S3_PUBLIC_BASE_URL` en `envSchema` e implementación actual antes de fijar parser; hoy es `z.string().url().optional()` sin restricción de path — no inventar soporte de path en base URL salvo evidencia en código.

#### GCS

Mantener tests de regresión existentes (`gcs-storage.unit.test.ts`) si ya cubren:

- origin distinto → no-op;
- path inválido → no-op;
- 404 → success;
- provider real error → throw.

No agregar duplicación si ya existe evidencia.

### Certificación CREATE

- Upload OK + `prisma.certificacion.create` FAIL → `deleteCertificacion` llamado con URL nueva → error DB original preservado.
- Opcional si queda barato: `count` FAIL con misma expectativa de compensación.

### Certificación DELETE

- Verificar orden: `certificacion.delete` **antes** de `deleteCertificacion`.
- Cleanup reject → HTTP `200`; fila DB ausente; log generado.

### Foto REPLACE

- Upload new + DB update FAIL → `deleteFoto(new)` llamado; `deleteFoto(old)` **no** llamado; error DB original.
- DB update OK + delete old FAIL → HTTP `200`; DB con URL nueva; log.

### Portada REPLACE (caso crítico obligatorio)

- Upload new + DB update FAIL → blob viejo **no** se intenta borrar; blob nuevo compensado; DB conserva URL vieja.
- Success: DB update ocurre **antes** de delete old.
- Cleanup old fail → response `200`.

### Portada REMOVE

- `imagenUrl=null` en DB **antes** de delete blob.
- Cleanup fail → response `200`; DB null.

### Galería CREATE

- Upload OK + DB create FAIL → compensate new.

### Galería DELETE

- DB delete **antes** de storage delete.
- Cleanup fail → `204`.

### DELETE NEWS

- DB delete FAIL → **ningún** `deleteImagenNoticia` ejecutado.
- DB delete OK → intentar limpiar portada + todas las URLs de galería.
- Uno de varios deletes falla → los demás igualmente se intentan; `204`; log por fallo.

### Orden de operaciones en tests

Cuando sea necesario verificar ordering, usar lista de eventos compartida en spies:

```typescript
const events: string[] = [];
// events.push('db'); events.push('storage');
// assert exacto del array
```

No basarse solo en "fue llamado". No usar sleeps ni timing tests.

---

## Plan de implementación

### Fase 1 — Infraestructura de consistencia

- [ ] Crear `storageConsistency.ts` con `cleanupBestEffort` (y compensación si aplica).
- [ ] Normalizar semántica delete y reconocimiento managed URL en `local.adapter.ts` y `s3.adapter.ts`.
- [ ] Unit tests helper + tests de contrato adapters (managed URL + delete) en `storage-contracts.unit.test.ts` o archivo mínimo nuevo.

### Fase 2 — Productores

- [ ] Certificación create (A) con compensación.
- [ ] Certificación delete (B) DB-first.
- [ ] Foto replace (C) — verificar compensación en DB fail.
- [ ] Tests targeted en `producersProfile.integration.test.ts`.

### Fase 3 — Noticias

- [ ] Portada set (D) y remove (E).
- [ ] Galería create (F) y remove (G).
- [ ] `deleteNews` (H).
- [ ] Tests targeted en `news-imagenes.integration.test.ts`.

### Fase 4 — Cierre

- [ ] Full backend test suite.
- [ ] `typecheck` / lint / build.
- [ ] QA manual smoke (upload/replace/delete en local).
- [ ] Docs: `modules/producers`, `modules/news`, `CHANGELOG`, worklog D3C.

No mezclar fases salvo necesidad real.

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Orphan físico si compensación/cleanup también falla | Media | Medio | Log observable; follow-up reconciliación |
| Orphan certificación accesible por URL conocida | Baja | Alto (privacidad) | DB-first; cleanup inmediato; no listar en DB; follow-up auth/signed URLs |
| Logger mínimo no reemplaza reconciliación | Alta | Medio | Documentar follow-up explícito |
| Cambios adapter revelan errores antes tragados | Media | Bajo | Tests S3/local; service captura en best-effort |
| Mocks Prisma no restaurados en tests | Media | Alto (CI flaky) | `try/finally` + `mockRestore` como D3A |
| Cleanup de URL legacy externa borra archivo managed homónimo (basename/pathname) | Baja | Alto (integridad) | Reconocimiento managed estricto en local/S3; tests Fase 1 |
| Concurrencia orden/tope sin resolver | Media | Bajo | Fuera de scope; no empeorar |

---

## Plan de rollout

- [ ] Feature flag: **no**
- [ ] Migraciones: **no**
- [ ] Variables de entorno nuevas: **no**
- [ ] Comunicación a usuarios: **no** (sin cambio de contrato)
- [ ] Plan de rollback: revert de código (ver abajo)

### Rollback

Sin migración ni datos nuevos. Rollback = revert del merge/commit D3C.

**Riesgo residual:** un orphan creado durante una operación fallida en producción no se revierte automáticamente; requiere limpieza manual o reconciliación futura.

---

## Métricas / criterios de éxito

1. Ningún CREATE/REPLACE deja upload nuevo sin intentar compensación si DB falla.
2. Ningún DELETE elimina storage antes de confirmar DB.
3. `setPortada` nunca borra portada vieja antes del DB update.
4. `deleteNews` nunca toca storage si DB delete falla.
5. Cleanup failure post-DB no cambia contrato HTTP.
6. Cleanup/compensation failure queda observable (log).
7. Local/GCS/S3 siguen contrato delete coherente: missing/unmanaged no-op; error real observable en capa adapter.
8. D3A sigue intacto.
9. Full backend PASS.
10. `typecheck` / lint / build PASS.
11. Sin migration / frontend / deps.
12. Ningún adapter puede derivar una ruta/key managed desde una URL externa únicamente por basename/pathname.
13. Cleanup de una URL legacy externa nunca puede borrar accidentalmente un objeto managed del mismo nombre/path.

---

## Preguntas abiertas

Sin preguntas abiertas bloqueantes.

---

## Referencias

- **Auditoría D3C:** conversación / informe de auditoría storage ↔ DB (2026-09-07).
- **TDD relacionados:** `docs/tdd/D3A-tdd-validacion-contenido-archivos.md`, `docs/tdd/D3B-tdd-integridad-coordenadas.md`
- **Módulos:** `docs/modules/producers.md`, `docs/modules/news.md`
- **Código:** `backend/src/services/producers.service.ts`, `backend/src/services/news.service.ts`, `backend/src/lib/storage/`
- **Work-log de implementación:** `docs/worklog/D3C-consistencia-storage-db.md` (cuando exista)
