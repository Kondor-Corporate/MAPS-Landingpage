# D3B — Integridad de coordenadas

Documentación de la feature D3B dentro del proyecto MAPS Asesores.
Complementa el [índice de docs](../README.md) y el
[README raíz](../../README.md).

**Identificador:** D3B (no es un ticket `MAPS-XXX`; la rama es `fix/d3b-coordinate-bounds`). D3A (uploads) y D3C (consistencia Storage ↔ DB) quedan fuera de esta entrega.

**Estado:** Implementación, validación técnica y QA manual completados en rama `fix/d3b-coordinate-bounds` (2026-09-07). Pendiente merge/PR a `development`. Sin commit ni deploy al cierre de este documento.

**TDD de diseño:** [`docs/tdd/D3B-tdd-integridad-coordenadas.md`](../tdd/D3B-tdd-integridad-coordenadas.md)

**PR:** Pendiente

---

## Objetivo

Garantizar la invariante geográfica global de latitud/longitud en el backend: finitud y bounds estándar (`lat` −90…90, `lng` −180…180), incluyendo `(0, 0)` como valor técnicamente válido.

Impedir que nuevos inputs de productor persistan coordenadas inválidas; validar la salida de geocode search (Nominatim + cache Redis); neutralizar en DTOs y excluir del mapa público cualquier legacy inválido que pudiera existir en PostgreSQL.

Sin restricción geográfica de negocio más allá del sesgo de búsqueda Nominatim ya existente (Argentina / La Plata). Sin migración de schema, sin CHECK constraint en DB y sin cambios frontend obligatorios.

---

## Cambios implementados

### 1. Helper puro de coordenadas

**Archivo:** `backend/src/lib/coordinates.ts`

- Constantes `LATITUDE_MIN/MAX`, `LONGITUDE_MIN/MAX`.
- `normalizeCoordinates(lat, lng)` → `{ latitud, longitud } | null`.
- Solo acepta `typeof === 'number'`, exige `Number.isFinite` en ambos ejes.
- Bounds inclusivos: lat [−90, 90], lng [−180, 180].
- `(0, 0)` válido. Sin coerción, sin `AppError`, sin IO.

Schemas, service, geocode y DTOs reutilizan este helper como única fuente de la invariante.

### 2. Validación de inputs Productor

**Archivos:** `backend/src/validations/producer.schema.ts`, `backend/src/validations/producerProfile.schema.ts`

- **Admin:** conserva preprocess `null` / `""` → `undefined` y coerción de strings numéricos; solo `latitud`/`longitud` con `.finite()` + bounds → **422** con mensajes por campo.
- **Perfil:** conserva number-only (strings y `null` rechazados por Zod); mismos bounds → **422**.
- Ningún schema valida pareja completa; la pareja parcial sigue resolviéndose en service → **400**.

### 3. Defensa service

**Archivo:** `backend/src/services/producers.service.ts`

- `resolveFinalLocation`: pareja manual completa pasa por `normalizeCoordinates`; inválida → `AppError(400, 'Las coordenadas están fuera de rango')`; parcial → `400` `'Latitud y longitud deben enviarse juntas'`.
- Coordenadas manuales tienen prioridad sobre geocoder cuando vienen en pareja.
- Persistencia en `$transaction` ocurre después de la validación; no hay write a DB con pair inválida.

### 4. Geocode / cache

**Archivo:** `backend/src/lib/geocode.ts` (sin cambios en `geocodeCache.ts`)

- Respuesta Nominatim search: `parseFloat` → `normalizeCoordinates`; out-of-range / no finito → `null`.
- **Cache miss:** consulta provider.
- **Negative hit** (`value === null`): retorna `null` sin provider.
- **Positive hit válido:** revalida con `normalizeCoordinates`; retorna pair sin provider.
- **Positive hit inválido o malformado:** ignora cache, consulta provider; el store se reemplaza con positive válido o negative cache según el resultado.
- Provider inválido → `setCachedGeocode(null)` (negative cache existente, TTL 5 min).
- `reverseGeocodeCoordinates`: sin cambio funcional en D3B.

### 5. Lectura legacy

**Archivos:** `backend/src/lib/producerProfileMapper.ts`, `backend/src/services/producers.service.ts` (`listForMap`)

- DTOs admin y perfil: `normalizeCoordinates` en lectura; legacy inválido o pareja incompleta → `null` / `null`. Perfil público hereda vía `toPublicProducerProfileDto`.
- `GET /producers/map`: solo productores activos con `latitud`/`longitud` no null y dentro de bounds inclusivos; legacy fuera de rango excluido; boundaries ±90 / ±180 incluidos.

---

## Estado final del sistema

| Input / origen | Garantía final |
|----------------|----------------|
| Cliente HTTP admin | Schema Zod (422 bounds) + `resolveFinalLocation` (400 pareja / bounds) antes de persistir |
| Cliente HTTP productor | Schema perfil (422) + mismo service; pareja parcial → 400 |
| Nominatim search | Solo devuelve pair normalizada o `null`; no propaga out-of-range |
| Redis geocode cache | Positive revalidado; inválido no confiable; negative hit → `null` sin provider |
| PostgreSQL legacy | Puede contener valores inválidos históricos; DTOs → `null/null`; mapa los excluye |
| `GET /producers/map` | Solo activos con pair válida en bounds |

**Limitación explícita:** PostgreSQL no tiene CHECK constraint en `latitud`/`longitud`. Escrituras directas vía Prisma/SQL o scripts fuera de la API pueden saltar la app-layer.

---

## Criterios de aceptación verificados

| Verificación | Resultado |
|--------------|-----------|
| Targeted D3B (coordinates, schemas, producers profile/map, geocode lib/cache) | **130/130 PASS** |
| Full backend `npm test` | **373/373 PASS** |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| `git diff --check` | PASS |
| QA manual (6 flujos) | **6/6 PASS** |

Review técnico global: **APROBADO CON OBSERVACIONES** (P3: bounds 422 admin/perfil cubiertos en unit schema, no en HTTP integration; no bloqueante).

---

## QA manual realizado

Todos los flujos ejecutados en entorno local con rama `fix/d3b-coordinate-bounds`:

| # | Flujo | Resultado |
|---|-------|-----------|
| 1 | Admin alta por dirección (geocode → coords persistidas) | PASS |
| 2 | Admin mover pin + persistencia de coordenadas manuales | PASS |
| 3 | Productor editar propia ubicación (dirección + coords) | PASS |
| 4 | Mapa público (`/`): marcadores y exclusiones coherentes | PASS |
| 5 | Dirección → geocoding real (Nominatim) | PASS |
| 6 | Regresión básica / recargas (admin, perfil, mapa) | PASS |

No se ejecutó QA HTTP manual explícito de lat `91` → 422; esa garantía está cubierta por tests unitarios de schema y service bypass.

---

## Pendientes fuera de D3B

| Pendiente | Detalle |
|-----------|---------|
| Merge / PR | Integración a `development` |
| TDD → Implementado | Tras merge a `main`, según `docs/CONVENTIONS.md` |
| CHECK constraint DB | Opcional futuro; no incluido en D3B |
| Cleanup batch legacy | Solo si staging/prod revelan coords inválidas |
| Restricciones geográficas de negocio | No definidas; fuera de alcance |
| D3C | Consistencia Storage ↔ DB, compensaciones |
| P3 testing HTTP bounds | Opcional; unit schema + middleware `validate` suficientes para cierre |

---

*Documento generado al cierre documental de D3B — integridad de coordenadas.*
