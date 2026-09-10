# D3C — Consistencia Storage ↔ DB

Documentación de la feature D3C dentro del proyecto MAPS Asesores.
Complementa el [índice de docs](../README.md) y el
[README raíz](../../README.md).

**Identificador:** D3C (no es un ticket `MAPS-XXX`; la rama es `fix/d3c-storage-db-consistency`). D3A (validación de contenido de uploads) y D3B (integridad de coordenadas) quedan fuera del scope funcional de esta entrega.

**Estado:** Implementación, validación técnica y QA manual completados en rama `fix/d3c-storage-db-consistency` (2026-09-07). Pendiente commit/push/PR a `development`.

**TDD de diseño:** [`docs/tdd/D3C-tdd-consistencia-storage-db.md`](../tdd/D3C-tdd-consistencia-storage-db.md)

**PR:** Pendiente

---

## Objetivo

D3C reduce las ventanas de inconsistencia entre PostgreSQL y los adapters de storage (local, GCS y S3) en:

- certificaciones de productores;
- foto de perfil de productor;
- portada de noticias;
- galería de noticias;
- eliminación completa de noticia.

**Principio:** PostgreSQL es el source of truth lógico.

No existe transacción distribuida entre Prisma y local FS, GCS o S3. La solución adoptada es:

**CREATE / REPLACE:**

```text
upload → DB → cleanup viejo
```

Si DB falla:

```text
compensar upload nuevo (best-effort) → preservar error DB original
```

**DELETE:**

```text
DB → cleanup storage (best-effort)
```

Un orphan físico residual es preferible a una referencia DB rota (lecturas activas no se rompen; el blob puede reconciliarse después).

**Limitación explícita:** esto **no** garantiza atomicidad cross-system. Pueden quedar huérfanos si compensación y cleanup también fallan.

---

## Cambios implementados

### 1. Helper de consistencia

**Archivo:** `backend/src/lib/storageConsistency.ts`

Funciones:

- `cleanupBestEffort`
- `compensateUploadFailure`

Garantías:

- el fallo de cleanup **no** propaga al caller HTTP;
- warning estructurado: `storage.consistency_cleanup_failed`;
- metadata: `operation`, `category`, `resourceId`, `errorName`, `errorMessage`;
- sin Prisma, HTTP, `AppError` ni adapters concretos;
- no se loguea URL como campo dedicado, buffer, token ni secretos.

### 2. Contrato de adapters

**Local** (`backend/src/lib/storage/local.adapter.ts`):

- reconocimiento estricto de URL managed (origin, path, categoría, naming);
- URL externa o no parseable → no-op;
- `ENOENT` en `unlink` → no-op;
- otro error de filesystem → throw.

**S3** (`backend/src/lib/storage/s3.adapter.ts`):

- parsing con `URL` real; origin exacto;
- soporta `S3_PUBLIC_BASE_URL` con pathname;
- categoría y naming de key validados;
- URL externa o prefijo malicioso → no-op;
- error real de proveedor (`client.send`) → throw.

**GCS** (`backend/src/lib/storage/gcs.adapter.ts`):

- sin cambios en D3C;
- el contrato existente ya era compatible (referencia conceptual para local/S3).

### 3. Productores — flujos A/B/C

**A. Certificación CREATE** (`addCertificacion`):

- validación D3A → upload → `count` + `create` DB dentro del mismo `try`;
- fallo DB → `compensateUploadFailure` sobre el upload nuevo;
- error DB original prevalece.

**B. Certificación DELETE** (`removeCertificacion`):

- `certificacion.delete` en DB primero;
- después `cleanupBestEffort` del blob;
- fallo cleanup → log; HTTP `200` sin revertir delete.

**C. Foto REPLACE** (`replaceFoto`):

- upload nueva → `prisma.productor.update`;
- DB fail → compensar nueva; vieja intacta;
- DB OK → `cleanupBestEffort` de foto anterior.

D3A sigue ejecutándose **antes** del upload en todos los flujos de alta/reemplazo.

### 4. Noticias — flujos D/E/F/G/H

**D. Portada replace** (`setPortada`):

- upload nueva → `prisma.noticia.update` → cleanup portada vieja;
- DB fail → compensar nueva; vieja no se toca.

**E. Portada remove** (`removePortada`):

- `imagenUrl = null` en DB primero → cleanup blob.

**F. Galería create** (`addImagenGaleria`):

- `count`/tope/D3A → upload → `noticiaImagen.create`;
- `create` fail → compensar blob nuevo.

**G. Galería delete** (`removeImagenGaleria`):

- `noticiaImagen.delete` en DB primero → cleanup blob.

**H. Delete noticia** (`deleteNews`):

- captura URLs de portada y galería;
- `prisma.noticia.delete` (cascade DB);
- después intenta cleanup de todos los blobs capturados (`Promise.all` sobre `cleanupBestEffort`).

Un fallo de cleanup post-DB **no** cambia el status HTTP de éxito (`200`/`201`/`204` según endpoint).

---

## Estado final del sistema

| Flujo | Estado final |
|-------|----------------|
| **A** Cert create | Upload nuevo compensado si DB falla |
| **B** Cert delete | DB nunca queda apuntando a un PDF borrado por la misma operación |
| **C** Foto replace | Vieja intacta si DB falla; nueva compensada |
| **D** Portada replace | Vieja no se elimina antes de confirmar DB |
| **E** Portada remove | DB `null` antes de cleanup storage |
| **F** Gallery create | Upload compensado si `create` falla |
| **G** Gallery delete | DB delete antes de storage |
| **H** Delete news | DB delete antes de cualquier cleanup |
| **Managed URLs** | Adapters solo borran recursos reconocidos como propios |

---

## Contrato HTTP

**Sin cambios de contrato HTTP.**

| Operación | Status éxito |
|-----------|--------------|
| Certificación create | `201` |
| Certificación delete | `200` |
| Foto upload/replace | `200` |
| Portada set / remove | `200` |
| Galería create | `201` |
| Galería delete | `204` |
| Delete noticia | `204` |

D3A, RBAC y validaciones previas (`400`, `401`, `403`, `404`, `413`, `422`) permanecen.

- Cleanup post-DB fail: **no** convierte success en `500`.
- Compensation fail: **no** sustituye el error DB original.

---

## Evidencia técnica

| Verificación | Resultado |
|--------------|-----------|
| Fase 1 targeted (helper + adapters) | **39/39 PASS** |
| Fase 2 targeted (productores D3C) | **72/72 PASS** |
| Fase 3 targeted (noticias D3C) | **81/81 PASS** |

**Aclaración:** las suites targeted de fases se superponen; **no** deben sumarse como tests únicos.

| Verificación | Resultado |
|--------------|-----------|
| Full backend `npm test` | **28** test files, **437** tests, **437 PASS**, 0 skipped/todo |
| Duration | 117.52s |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| `git diff --check` | PASS |
| Review global (Fase 4A) | **APROBADO** — sin P0/P1/P2 bloqueantes |

**Finding P3 (no bloqueante):** `backend/tests/news-imagenes.integration.test.ts` quedó grande/denso tras los tests D3C.

**Info:**

- sin deduplicación `Set` de URLs en `deleteNews` (opcional según TDD);
- concurrencia de `count`/orden/tope fuera de scope;
- auth de uploads públicos fuera de D3C.

---

## QA manual realizado

**Fecha:** 2026-09-07

| # | Flujo | Resultado |
|---|-------|-----------|
| 1 | Subir y borrar certificación productor | PASS |
| 2 | Reemplazar foto de perfil | PASS |
| 3 | Subir y reemplazar portada noticia | PASS |
| 4 | Quitar portada | PASS |
| 5 | Agregar y borrar imagen galería | PASS |
| 6 | Borrar noticia temporal con portada + galería | PASS |
| 7 | Smoke público productores/noticias | PASS |

**Resultado: 7/7 PASS**

Las ventanas forzadas DB/storage no se reprodujeron manualmente; están cubiertas por tests determinísticos con mocks/spies en `producersProfile.integration.test.ts` y `news-imagenes.integration.test.ts`.

---

## Pendientes fuera de D3C

| Pendiente | Detalle |
|-----------|---------|
| PR / merge `development` | Pendiente |
| TDD → Implementado | Tras merge a `main`, según `docs/CONVENTIONS.md` |
| Reconciliación Storage ↔ DB | Job o herramienta para detectar/limpiar huérfanos |
| Auth / signed URLs en uploads | Decisión de negocio separada (privacidad certificaciones) |
| Concurrencia | `count` + `orden` en certificaciones; tope galería; doble submit; idempotency keys |
| I1 | `Productor.foto` editable como string vía admin sin `StorageAdapter` |
| Test noticias grande | Separación opcional de `news-imagenes.integration.test.ts` (P3) |

---

*Documento generado al cierre documental de D3C — consistencia Storage ↔ DB.*
