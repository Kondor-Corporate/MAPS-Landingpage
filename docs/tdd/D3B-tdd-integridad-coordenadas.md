# D3B — TDD: Integridad de coordenadas (bounds y pareja lat/lng)

Documento de diseño técnico para garantizar la integridad geográfica global de latitud/longitud en persistencia, geocoding y exposición de productores dentro del proyecto MAPS Asesores.

**Identificador:** D3B (no es un ticket `MAPS-XXX`; la rama es `fix/d3b-coordinate-bounds`). D3A (validación de contenido de uploads) y D3C (consistencia Storage ↔ DB) quedan fuera de esta entrega.

**Estado:** APROBADO — pendiente implementación  
**Autor:** equipo MAPS  
**Revisores:** —  
**Creado:** 2026-09-06  
**Última actualización:** 2026-09-06

---

## Resumen

Hoy `Productor.latitud` y `Productor.longitud` son `Float?` en PostgreSQL sin CHECK constraints. Los schemas de productor aceptan números sin exigir finitud ni bounds; `resolveFinalLocation` exige pareja manual pero no valida rango; `geocodeAddress` solo rechaza `NaN` tras `parseFloat`; reverse geocode ya valida finite + bounds; Redis devuelve JSON cacheado casteado sin validación runtime; `/producers/map` filtra solo `not null`; los DTOs propagan valores legacy tal cual.

D3B introduce un helper puro backend (`coordinates.ts`), alinea schemas admin/perfil con la invariante geográfica global, defiende `resolveFinalLocation` y `geocodeAddress` (incluido cache positivo inválido), normaliza lecturas en DTOs y filtra el mapa público en query Prisma. Sin migraciones, sin frontend obligatorio, sin restricción geográfica Argentina/La Plata más allá del sesgo de búsqueda Nominatim existente.

---

## Objetivo

- Impedir que nuevos inputs de productor persistan coordenadas fuera de los bounds geográficos estándar o no finitas.
- Validar la salida de geocode search (provider + cache positivo) con la misma invariante.
- Mantener el contrato HTTP existente de pareja incompleta (`400`).
- Defender lecturas públicas y DTOs frente a datos legacy potencialmente inválidos (estado en staging/prod: desconocido).
- Cubrir con tests backend diseñados antes de implementación; quality gates verdes al cerrar.

---

## Contexto / situación actual

### Relevamiento en rama `development` (post-D3A)

**Modelo de datos** (`backend/prisma/schema.prisma`):

```prisma
latitud   Float?
longitud  Float?
```

Sin CHECK constraints en migraciones (`20250420120000_init_maps_domain` y posteriores). PostgreSQL `DOUBLE PRECISION` puede almacenar valores fuera de bounds, `Infinity` y `NaN` si la app los escribe.

**Schemas productor:**

| Archivo | Campos | Coerción | Finite/bounds |
|---------|--------|----------|---------------|
| `backend/src/validations/producer.schema.ts` | `optionalNumber` → `z.number().optional()` | `null`/`""` → `undefined`; string → `Number(...)` | ❌ |
| `backend/src/validations/producerProfile.schema.ts` | `z.number().optional()` | Solo JSON number; `null` → **422** (no nullable) | ❌ |

**Nota Zod (corrección de auditoría):** con `zod@^3.23.8`, `z.number()` **rechaza `NaN`**. El gap relevante no es NaN vía schema, sino **`Infinity`/`-Infinity`** (p. ej. `Number("Infinity")` tras coerción admin) y **valores finitos fuera de rango** (91, 181, etc.).

**Service** (`backend/src/services/producers.service.ts`):

- `hasManualCoordinates`: ambos `!== undefined`.
- `resolveFinalLocation`: pareja manual → retorna coords tal cual; una sola coord → `AppError(400, 'Latitud y longitud deben enviarse juntas')`; solo texto → `geocodeAddress`.
- `buildProductorUpdateFromMyProfile` (`producerProfileMapper.ts`) copia lat/lng al Prisma update **antes** de que el service sobrescriba vía `resolveFinalLocation` (sin validación bounds).

**Geocode** (`backend/src/lib/geocode.ts`):

- Search: `parseFloat` + rechazo solo si `Number.isNaN`; sin `isFinite` ni bounds; cachea resultado positivo vía `setCachedGeocode`.
- Reverse: `reverseGeocodeCoordinates` valida finite + bounds (redundante con `geocode.schema.ts`).
- Cache (`geocodeCache.ts`): `JSON.parse` + cast genérico `T`; sin validación de coords.

**Mapa público:**

- `listForMap`: `latitud/longitud: { not: null }`, `usuario.activo: true`.
- `toMapProducerDto`: `row.latitud!` / `row.longitud!`.

**Frontend (referencia, fuera de alcance D3B):**

- `frontend/src/shared/lib/coordinates.ts` — `normalizeCoordinates` con finite + bounds (admin write/read; intranet read).
- Backend debe ser la frontera de confianza; no se exige cambio FE para cerrar D3B.

### Por qué ahora

Tras D3A, la siguiente brecha de integridad identificada es geográfica: coords inválidas pueden entrar por API autenticada, geocoder o cache y aparecer en mapas/DTOs. D3B cierra la invariante en app-layer sin migración ni cleanup de legacy desconocido.

---

## Problema

1. **Persistencia productor:** admin y perfil no exigen finite ni bounds; valores como `91/-58` o `Infinity` pueden guardarse si llegan como pareja.
2. **Pareja vs bounds:** el service valida pareja pero no rango; Zod no valida pareja (decisión: mantener en service).
3. **Geocode search:** Nominatim + Redis pueden devolver/propagar coords fuera de bounds; `countrycodes`/`viewbox` es sesgo de búsqueda, no contrato de integridad.
4. **Cache positivo:** JSON inválido cacheado se devuelve sin re-validar.
5. **Lectura:** DTOs y `/producers/map` no defienden legacy inválido; `not null` no implica coords geográficamente válidas.
6. **Doble capa frontend/backend:** admin FE filtra en write; perfil FE no; API debe garantizar independientemente.

---

## Threat / risk concreto

**Riesgo que D3B mitiga:**

Un cliente autenticado (admin o productor) o el pipeline de geocoding persiste/expone coordenadas geográficamente incoherentes (out-of-range, no finitas), degradando mapas públicos, distancias y perfiles.

**Impacto:** integridad de datos / robustez; UX de mapas; no bypass de auth ni pérdida masiva de datos.

**Severidad:** **P2** — integridad de datos / robustez. No P0: inputs productor requieren autenticación; anomalía de provider es escenario externo; impacto principal es incoherencia y mapas, no compromiso de cuenta.

**Lo que D3B no afirma:**

- No garantiza que una coordenada manual esté en Argentina/La Plata.
- No limpia datos legacy en BD ni impide escrituras SQL directas.
- No sustituye validación de dirección textual ni ranking geocoder.

---

## Invariante (contrato geográfico global)

### Latitud

- `Number.isFinite(latitud)`
- `-90 <= latitud <= 90`

### Longitud

- `Number.isFinite(longitud)`
- `-180 <= longitud <= 180`

### Pareja manual

- Cuando el flujo trata coords como **entrada manual completa** (`hasManualCoordinates`), deben enviarse **ambas**.
- Una sola coordenada → **400** `"Latitud y longitud deben enviarse juntas"` (contrato service actual; **no mover a Zod en D3B**).

### Punto `(0, 0)`

- **Válido** (Golfo de Guinea). No rechazar en D3B.

### Fuera de invariante explícita

- **No** restringir a Argentina, Buenos Aires ni La Plata en coords persistidas.
- El `viewbox` / `countrycodes` de Nominatim en search permanece como sesgo de búsqueda, no como validación de integridad.

---

## Alcance

- Helper puro `backend/src/lib/coordinates.ts` + constantes de bounds.
- Schemas `producer.schema.ts` y `producerProfile.schema.ts`: finite + bounds (preservando semántica de coerción distinta).
- Defensa en `resolveFinalLocation` para pareja manual inválida.
- Validación en `geocodeAddress` (cache hit positivo + respuesta Nominatim).
- Normalización defensiva en `toProducerProfileDto` y `toAdminProducerDto`.
- Filtro Prisma en `listForMap` por bounds + finitud.
- Tests unitarios e integración según matriz de este TDD.
- Quality gates al implementar.

### Fuera de alcance

- Restricciones geográficas Argentina / La Plata en coords manuales.
- Rechazo de `(0, 0)`.
- CHECK constraints PostgreSQL, migraciones, cleanup staging/prod, backfill.
- Cambios de UX frontend (`ProducerProfileForm`, `AddressMapPicker`, MapLibre).
- Geocoding ranking, rate limiting/cache architecture de geocode.
- Cambios de contrato reverse geocode (salvo reutilizar constantes).
- D3C, dead code `assertNoAdminOnlyProfileFields`.
- Commit/push/implementación en esta etapa (solo TDD).

---

## Diseño propuesto

### Resumen arquitectónico

```text
HTTP JSON
    ↓
Zod schemas (coerción admin / number-only perfil)
    ↓ finite + bounds por campo
producers.service.resolveFinalLocation
    ↓ pareja (400) + normalizeCoordinates (400 bounds)
Prisma Productor

geocodeAddress
    ↓ cache miss → Nominatim
    ↓ cache hit negativo → return null (sin provider)
    ↓ cache hit positivo → normalizeCoordinates; inválido → provider
    ↓ provider → parseFloat → normalizeCoordinates; solo positive cache si válida

Lectura
    ↓ toProducerProfileDto / toAdminProducerDto → null/null si inválido
    ↓ listForMap → query Prisma con bounds
```

**Regla:** la lógica de bounds vive en **un helper puro**; schemas, service, geocode y DTOs lo reutilizan. No duplicar comparaciones mágicas `-90`/`90`/`180` en múltiples archivos.

### 1. Helper puro — `backend/src/lib/coordinates.ts` (**Nuevo**)

Contrato conceptual:

```typescript
export const LATITUDE_MIN = -90;
export const LATITUDE_MAX = 90;
export const LONGITUDE_MIN = -180;
export const LONGITUDE_MAX = 180;

export type CoordinatePair = {
  latitud: number;
  longitud: number;
};

/**
 * Valida una pareja de coordenadas ya numéricas.
 * Puro, síncrono, sin IO.
 * @returns par canónica o null si algún valor no es number finito en bounds.
 */
export function normalizeCoordinates(
  latitud: unknown,
  longitud: unknown,
): CoordinatePair | null;
```

**Debe:**

- Aceptar **únicamente** `number` en la capa interna (si `typeof !== 'number'` → `null`).
- Exigir `Number.isFinite` en ambos.
- Exigir bounds usando constantes exportadas.
- Devolver `{ latitud, longitud }` canónica o `null`.
- **No** coerción de strings.
- **No** lanzar `AppError`.
- **No** depender de Zod, Express ni Prisma.

**No compartir código físico con** `frontend/src/shared/lib/coordinates.ts`. Pueden converger en comportamiento; implementaciones independientes.

### 2. Schemas productor

#### `backend/src/validations/producer.schema.ts`

**Preservar** `optionalNumber` tal cual para todos los campos que ya lo usan (`telefono`-adjacentes, `anosExperiencia`, etc.):

```typescript
// Comportamiento actual de preprocess — NO cambiar para otros campos
if (value === null || value === '') return undefined;
if (typeof value === 'string') return Number(value);
return value;
```

**Solo** para `latitud` y `longitud`, la validación final tras preprocess:

```typescript
z.number().finite().min(LATITUDE_MIN, { message: 'La latitud debe estar entre -90 y 90' }).max(LATITUDE_MAX, { message: 'La latitud debe estar entre -90 y 90' })
// longitud: análogo con LONGITUDE_* y mensaje de longitud
```

| Entrada admin | Tras preprocess | Resultado schema |
|---------------|-----------------|------------------|
| `-90`, `90` | number | ✅ |
| `-180`, `180` (lng) | number | ✅ |
| `91`, `-91` | number | **422** |
| `181`, `-181` (lng) | number | **422** |
| `"91"` | `91` | **422** |
| `"-58"` (lng) | `-58` | ✅ |
| `"Infinity"` | `Infinity` | **422** (`.finite()`) |
| `null`, `""` | `undefined` | omitido (comportamiento actual) |
| `0`, `0` | numbers | ✅ |

**No** añadir refine de pareja en Zod (permanece en service).

#### `backend/src/validations/producerProfile.schema.ts`

**Preservar contrato actual:**

- Solo JSON **number** (sin preprocess string).
- **`null` no se convierte a `undefined`** → sigue **422** con `z.number().optional()`.
- Añadir `.finite().min().max()` con los mismos mensajes funcionales.

**No** unificar semántica admin/perfil más allá de reglas geográficas.

### 3. Pareja lat/lng — responsabilidad service

Permanece en `resolveFinalLocation` (`producers.service.ts`):

```typescript
if (input.latitud !== undefined || input.longitud !== undefined) {
  if (!hasManualCoordinates(input)) {
    throw new AppError(400, 'Latitud y longitud deben enviarse juntas');
  }
}
```

**Motivo:** preservar contrato HTTP **400** existente; no necesario para cerrar bounds; defensa para llamadas internas futuras.

### 4. `resolveFinalLocation` — defensa adicional

Cuando `hasManualCoordinates(input)`:

1. `const pair = normalizeCoordinates(input.latitud, input.longitud)`.
2. Si `pair === null` → `throw new AppError(400, 'Las coordenadas están fuera de rango')`.
3. Usar `pair.latitud` / `pair.longitud` en el retorno (no confiar ciegamente en input).

Para camino geocoder (`resolveCoordinates` → `geocodeAddress`):

- `geocodeAddress` debe devolver solo pair válida o `null`.
- `resolveCoordinates` conserva: si `!coords` → `AppError(400, 'No se pudo ubicar la dirección...')`.

**No** duplicar lógica de bounds inline en varias funciones.

### 5. Geocode search — `geocodeAddress`

Dos fronteras; **no** modificar `geocodeCache.ts` genérico. **D3B no cambia** TTL ni semántica de `NOT_FOUND_SENTINEL`.

#### A. Lectura de cache (`getCachedGeocode`)

Hoy: `getCachedGeocode<GeocodeResult>()` → `JSON.parse` + cast sin validación.

Contrato **cerrado** después de D3B:

| Resultado cache | Acción |
|-----------------|--------|
| **Cache miss** (`hit: false`) | Consultar provider (Nominatim). |
| **Cache hit negativo** (`hit: true`, `value: null`) | Retornar `null` **inmediatamente**. **No** consultar provider. Preservar semántica actual del negative cache. |
| **Cache hit positivo válido** | `normalizeCoordinates(cached.latitud, cached.longitud)` → pair válida → **return**. **No** consultar provider. |
| **Cache hit positivo inválido o malformado** | **No** confiar en ese valor. Tratarlo como cache **unusable** → consultar provider. |

Flujo tras consultar provider (solo en miss o positivo unusable):

1. `parseFloat` de respuesta Nominatim.
2. `normalizeCoordinates(latitud, longitud)`.
3. Si pair inválida → normalización devuelve `null` → el flujo puede persistir **negative cache** según comportamiento actual → **return `null`**.
4. Si pair válida → **solo entonces** positive cache (TTL actual) → return pair.

#### B. Nominatim (post-`parseFloat`)

- Pasar `{ latitud, longitud }` por `normalizeCoordinates`.
- Inválida → `null` (mismo contrato externo que hoy ante no encontrado).
- **Solo** cachear resultado positivo si pair válida.
- Pair inválida del provider → `null` + negative cache según flujo actual (sin cambiar TTL ni `NOT_FOUND_SENTINEL`).

**Mantener sin cambio de contrato HTTP:** timeout, limiter, metrics, TTL, envelope `{ data, message, error }`.

**Reverse geocode:** sin cambio funcional; opcional importar constantes compartidas desde `coordinates.ts` en `geocode.schema.ts` para evitar números mágicos divergentes.

### 6. Read defense — DTOs

En `toProducerProfileDto` (`producerProfileMapper.ts`):

```typescript
const coords = normalizeCoordinates(row.latitud, row.longitud);
// exposición:
latitud: coords?.latitud ?? null,
longitud: coords?.longitud ?? null,
```

| Row DB | DTO expuesto |
|--------|--------------|
| Par válida | ambos números |
| Solo lat válida / lng inválida | `null`, `null` |
| Cualquier componente inválido o faltante | `null`, `null` |

Aplica a perfil propio y público (`toPublicProducerProfileDto` deriva de `toProducerProfileDto`).

**`toAdminProducerDto`:** misma regla.

Tipos nullable actuales sin cambio. Sin cambio de envelopes ni nombres de campos.

### 7. Mapa público — `listForMap`

Filtrar en **query Prisma** (preferencia de diseño), no en frontend:

```typescript
where: {
  usuario: { activo: true },
  latitud: { not: null, gte: LATITUDE_MIN, lte: LATITUDE_MAX },
  longitud: { not: null, gte: LONGITUDE_MIN, lte: LONGITUDE_MAX },
}
```

Confirmar sintaxis exacta en implementación (Prisma filtra no finitos al no satisfacer gte/lte en la práctica para `Infinity`/`NaN` en PostgreSQL).

`toMapProducerDto` puede mantener `!` asumiendo contrato de `listForMap`.

**No** logging obligatorio por fila legacy excluida.

---

## Contratos de API / errores

Envelope estándar vía `validate` + `errorHandler`:

```json
{ "data": null, "message": "Datos de entrada inválidos", "error": { ... flatten Zod ... } }
```

### Bounds rechazados por Zod → **422**

Mensajes objetivos (path `latitud` / `longitud`):

| Campo | Mensaje |
|-------|---------|
| latitud | `La latitud debe estar entre -90 y 90` |
| longitud | `La longitud debe estar entre -180 y 180` |

Usar `{ message: '...' }` en `.min()`/`.max()`/`.finite()` según serialización actual de `validate.ts` (`err.flatten()`). Verificar en implementación que `.finite()` sobre `Infinity` produce 422 coherente (mensaje default o custom si hace falta).

### Pareja incompleta → **400**

```text
Latitud y longitud deben enviarse juntas
```

(Sin cambio.)

### Pareja completa inválida en service → **400**

```text
Las coordenadas están fuera de rango
```

(Mensaje **cerrado** en este TDD.)

### Geocode provider/cache inválido

- **No** exponer error técnico al cliente.
- Tratar como no encontrado dentro del contrato existente: `200`, `data: null`, `message: 'no encontrado'` (search) o flujo equivalente en create/update vía `resolveCoordinates` → 400 de dirección no ubicada.

| Método | Ruta | Cambio D3B |
|--------|------|------------|
| `POST` | `/api/v1/producers` | 422 bounds; pareja 400 sin cambio |
| `PATCH` | `/api/v1/producers/:id` | idem |
| `PATCH` | `/api/v1/producers/me` | 422 bounds; strings siguen 422 |
| `GET` | `/api/v1/geocode?q=` | salida acotada; sin nuevo status |
| `GET` | `/api/v1/geocode/reverse` | sin cambio funcional |
| `GET` | `/api/v1/producers/map` | excluye legacy inválido |

---

## Plan de tests (diseñar antes de implementación)

### A. Producer schema admin

Archivo: `backend/tests/producerSchema.test.ts` (ampliar) y/o unit dedicado.

| Caso | Esperado |
|------|----------|
| lat `90`, lng `-58` | ✅ parse |
| lat `-90`, lng `-58` | ✅ |
| lng `180`, lat `-34` | ✅ |
| lng `-180` | ✅ |
| lat `91` | ❌ 422 |
| lat `-91` | ❌ 422 |
| lng `181` | ❌ 422 |
| lng `-181` | ❌ 422 |
| lat `"91"` (coerce) | ❌ 422 |
| lat `"Infinity"` (coerce) | ❌ 422 |
| `null` / `""` en lat | `undefined` (comportamiento actual) |

### B. Profile schema / integración

Archivos: tests unit schema (nuevo o ampliado) + `producersProfile.integration.test.ts`.

| Caso | Esperado |
|------|----------|
| Par válida en boundaries | ✅ 200 |
| lat `91` | ❌ 422 |
| lng `181` | ❌ 422 |
| `"91"` string en body | ❌ 422 (sin coerción) |
| Solo latitud (sin lng) llegando al service | **400** pareja (integration PATCH `/me`) |

### C. resolveFinalLocation / service

Archivo: `backend/tests/producersMap.integration.test.ts` o suite service dedicada si hace falta.

| Caso | Esperado |
|------|----------|
| Manual pair válida | persistida |
| `0`, `0` | ✅ persistida |
| Manual pair out-of-range vía admin bypass improbable | 422 en HTTP; si se invoca service con pair inválida post-schema, **400** `"Las coordenadas están fuera de rango"` |

**No** exportar `resolveFinalLocation` solo para tests salvo justificación fuerte; preferir tests HTTP o invocación indirecta vía POST/PATCH.

### D. Geocode lib

Archivo: `backend/tests/geocode.lib.test.ts` + `geocodeCacheDegradation.integration.test.ts` / `geocodeCache.unit.test.ts` según aplique.

| Caso | Esperado | fetch / Nominatim |
|------|----------|-------------------|
| Provider normal válido | pair válida | según miss/unusable |
| Provider lat `91` | `null` | — |
| Provider lng `181` | `null` | — |
| Provider `"Infinity"` en string Nominatim | `null` (`parseFloat` → `Infinity`) | — |
| **Negative cache hit** (`hit: true`, `value: null`) | `null` | **NO** llamado |
| **Positive cache hit válido** | pair devuelta | **NO** llamado |
| **Positive cache hit inválido** `{ latitud: 120, longitud: -58 }` | pair del provider (o `null` si provider falla) | **SÍ** llamado |
| Resultado inválido post-provider | `null`; **no** positive cache | provider consultado en ese flujo |

### E. Mapa

Archivo: `backend/tests/producersMap.integration.test.ts`.

| Caso | Esperado |
|------|----------|
| Activo + coords válidas | incluido en `/map` |
| Activo + lat `120` (insert/update directo en test setup vía API con mock, o prisma test helper si existe) | excluido |
| Activo + lng `200` | excluido |
| Boundary `90`/`-90`/±180 | incluido |

Nota implementación: si no hay forma limpia de seedear inválido sin bypass schema, usar `prisma.productor.update` en test **solo en setup** documentado como simulación legacy (no producción).

### F. Profile DTO legacy

Archivo: unit en `backend/tests/` sobre mapper o integration GET.

| Row | DTO |
|-----|-----|
| Par válida | coords numéricas |
| lat inválida | `null`, `null` |
| lng inválida | `null`, `null` |
| solo lat presente | `null`, `null` |

**No** obligar tests frontend.

### Nota — `Infinity` / JSON en tests

- `NaN` e `Infinity` **no son JSON numbers válidos** (RFC 8259). No exigir integración HTTP con literal `Infinity` en el body JSON.
- **Admin:** sí cubrir `"Infinity"` como **string** en tests de schema, porque `optionalNumber` hace `Number("Infinity")` → `Infinity` → `.finite()` → 422.
- **Perfil propio:** cubrir `Infinity` en unit del schema o del helper; **no** es obligatorio vía Supertest con JSON literal.
- **Geocoder:** sí cubrir provider devolviendo `"Infinity"` en el string Nominatim, porque `parseFloat` puede producir `Infinity` y debe normalizarse a `null`.

---

## Quality gates (al implementar)

Ejecutar con PostgreSQL disponible para integración:

```bash
# Targeted (ejemplo)
npm test -- producerSchema geocode.lib producersMap producersProfile

# Suite completa backend
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
```

Todos deben quedar verdes antes de merge.

---

## DB / legacy

**NO agregar:**

- CHECK constraint
- migration
- cleanup script
- consulta/modificación staging
- backfill

**Justificación:** validación en entrada + provider + lecturas defendidas suficiente para D3B; costo/riesgo de migrar datos desconocidos no justificado.

**Residual:** escrituras directas Prisma/SQL pueden saltar garantía app-layer. Decisión DB futura separada.

**Estado staging/prod:** **desconocido** (no consultado).

---

## Frontend

**NO modificar** en D3B salvo regresión demostrable durante implementación.

`normalizeCoordinates` frontend ayuda en admin; API backend es frontera de confianza. No exigir doble validación en `ProducerProfileForm` para cerrar D3B.

---

## Archivos previstos para implementación

| Pieza | Ubicación | Rol |
|-------|-----------|-----|
| Helper puro | `backend/src/lib/coordinates.ts` | **Nuevo** — constantes + `normalizeCoordinates` |
| Unit helper | `backend/tests/coordinates.unit.test.ts` | **Nuevo** |
| Schema admin | `backend/src/validations/producer.schema.ts` | **Modificar** — finite + bounds lat/lng |
| Schema perfil | `backend/src/validations/producerProfile.schema.ts` | **Modificar** — finite + bounds |
| Service | `backend/src/services/producers.service.ts` | **Modificar** — `resolveFinalLocation` defensivo; `listForMap` filter |
| Geocode | `backend/src/lib/geocode.ts` | **Modificar** — cache + provider validation |
| Mapper DTOs | `backend/src/lib/producerProfileMapper.ts` | **Modificar** — `toProducerProfileDto`, `toAdminProducerDto` |
| Schema geocode (opcional) | `backend/src/validations/geocode.schema.ts` | **Modificar** — import constantes |
| Tests schema | `backend/tests/producerSchema.test.ts` | **Modificar** |
| Tests geocode | `backend/tests/geocode.lib.test.ts`, cache suites | **Modificar** |
| Tests mapa/perfil | `backend/tests/producersMap.integration.test.ts`, `producersProfile.integration.test.ts` | **Modificar** |
| Prisma schema | — | **Sin cambio** |
| Frontend | — | **Fuera de alcance** |

---

## Decisiones tomadas

- Identificador D3B; rama `fix/d3b-coordinate-bounds`.
- Severidad **P2** (integridad / robustez).
- Invariante global estándar; `(0,0)` válido; sin restricción Argentina/La Plata en persistencia.
- Helper puro backend independiente del frontend.
- Coerción admin preservada; perfil number-only preservado.
- Pareja incompleta permanece en service (**400**), no en Zod.
- Bounds inválidos en service (**400** `"Las coordenadas están fuera de rango"`).
- Bounds en Zod (**422** con mensajes por campo).
- `geocodeAddress` valida cache positivo y provider; negative cache hit → `null` sin provider; cache genérico sin cambios de TTL/`NOT_FOUND_SENTINEL`.
- DTOs: invalid → `null`/`null`.
- Mapa: filtro Prisma, no frontend.
- Sin migración, sin CHECK, sin cleanup legacy, sin frontend requerido.
- Zod 3.23.8: **no** afirmar aceptación de NaN en `z.number()`.

---

## Alternativas consideradas

### A — Solo frontend `normalizeCoordinates`

- **Contras:** bypass HTTP directo; geocoder/cache; legacy reads.
- **Descartada.**

### B — CHECK constraint PostgreSQL

- **Pros:** garantía DB.
- **Contras:** migración, legacy desconocido, escrituras directas igualmente raras.
- **Descartada para D3B.**

### C — Pareja en Zod `.superRefine`

- **Contras:** cambia mezcla 422/400; innecesario para bounds.
- **Descartada.**

### D — Filtrar mapa solo en `toMapProducerDto`

- **Contras:** query trae filas inválidas; costo + lógica duplicada.
- **Descartada** frente a filtro Prisma.

### E — Restringir coords manuales a viewbox La Plata

- **Contras:** sin evidencia de producto; contradice invariante global acordada.
- **Descartada.**

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Legacy válido en boundary excluido por error de filtro | Baja | Medio | Tests ±90/±180 en mapa |
| Cache inválido antiguo hasta TTL 24h | Media | Bajo | Re-validar en read; refrescar desde provider |
| Tests necesitan seed legacy vía Prisma directo | Media | Bajo | Solo en setup de test documentado |
| Mensajes Zod `.finite()` distintos a min/max | Baja | Bajo | Unificar messages en implementación |

---

## Criterios de aceptación

- [ ] Nuevos inputs producer no pueden persistir coords fuera de bounds.
- [ ] Inputs manuales parciales mantienen rechazo **400** actual.
- [ ] `(0, 0)` continúa siendo válido.
- [ ] D3A (uploads MIME/contenido) permanece sin cambios no relacionados.
- [ ] Geocode search nunca devuelve ni cachea positivamente pair fuera de bounds.
- [ ] Cache positivo inválido no se considera coordenada confiable; negative cache hit no reconsulta provider.
- [ ] DTOs producer no exponen legacy inválido: `null`/`null`.
- [ ] `/producers/map` excluye legacy fuera de bounds.
- [ ] Reverse geocode conserva contrato actual.
- [ ] Sin migration / Prisma schema change.
- [ ] Sin frontend requerido.
- [ ] Suite backend y quality gates verdes.

---

## Preguntas abiertas

Ninguna bloqueante tras este TDD.

Informativas (producto futuro, no D3B):

- ¿Cleanup batch de legacy si staging revela coords inválidas? → fuera de alcance.
- ¿CHECK constraint DB en hardening posterior? → decisión separada.

---

## Preguntas / contradicciones para revisión

Hallazgos al contrastar auditoría vs código releído:

| Tema | Código real | Resolución D3B |
|------|-------------|----------------|
| NaN en `z.number()` | Zod 3.23.8 rechaza NaN | TDD no afirma aceptación de NaN; tests NaN opcionales en helper |
| `assertNoAdminOnlyProfileFields` | Definido, no usado; `.strict()` rechaza campos extra | Fuera de alcance; no confundir con D3B |
| `buildProductorUpdateFromMyProfile` escribe lat/lng antes de service | Duplicación sin validación previa | Service + schema cierran; mapper puede seguir escribiendo campos no-ubicación |
| Admin FE ya filtra write | `producerFormToApiPayload` usa normalize FE | Backend sigue siendo obligatorio |
| Perfil FE no filtra write | PATCH directo | Schema + service cierran |
| `geocode.schema.ts` reverse | Ya alineado con invariante | Reutilizar constantes opcional |
| PostgreSQL NaN en `NOT NULL` filter | NaN ≠ null | Filtro gte/lte excluye NaN/Infinity en práctica |

**Contradicción material:** ninguna que impida implementar según este TDD.

---

## Referencias

- **TDD de estilo:** `docs/tdd/D3A-tdd-validacion-contenido-archivos.md`, `docs/tdd/D2A-tdd-logout-robusto.md`, `docs/tdd/_TEMPLATE-tdd.md`
- **Schemas:** `backend/src/validations/producer.schema.ts`, `producerProfile.schema.ts`, `geocode.schema.ts`
- **Service:** `backend/src/services/producers.service.ts`
- **Geocode:** `backend/src/lib/geocode.ts`, `geocodeCache.ts`, `geocodeNormalize.ts`
- **Mapper:** `backend/src/lib/producerProfileMapper.ts`
- **Prisma:** `backend/prisma/schema.prisma`
- **Frontend (referencia):** `frontend/src/shared/lib/coordinates.ts`
- **Tests existentes:** `producerSchema.test.ts`, `geocode.lib.test.ts`, `producersMap.integration.test.ts`, `producersProfile.integration.test.ts`, `geocode.integration.test.ts`
- **Validate:** `backend/src/middlewares/validate.ts`
- **Errores:** `backend/src/lib/errors.ts`

---

## Plan de implementación

### Fase 1 — Lib + unit tests
- [ ] Crear `backend/src/lib/coordinates.ts` + `coordinates.unit.test.ts`
- [ ] `npm test` unitarios del helper

### Fase 2 — Schemas
- [ ] Actualizar `producer.schema.ts` y `producerProfile.schema.ts`
- [ ] Ampliar `producerSchema.test.ts` (+ profile schema tests)

### Fase 3 — Service + geocode + DTOs
- [ ] `resolveFinalLocation` defensivo
- [ ] `geocodeAddress` cache + provider
- [ ] DTOs + `listForMap` query

### Fase 4 — Integración
- [ ] `geocode.lib.test.ts`, cache suites, `producersMap.integration.test.ts`, profile/map DTO tests
- [ ] `npm test` backend completo

### Fase 5 — Quality gates
- [ ] typecheck, lint, build, diff-check
- [ ] Worklog + actualizar este TDD a **Implementado** post-merge (PR de código)
