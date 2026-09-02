# MAPS-020 — Rate limiting y caché de geocoding en el mapa

Documentación de la feature de rate limiting distribuido y caché de geocoding dentro del proyecto MAPS Asesores. Complementa el [TDD MAPS-020](../tdd/MAPS-020-tdd-rate-limiting-geocoding-mapa.md) y el [runbook de staging](../GCP_STAGING_RUNBOOK.md).

> **Estado de este documento:** implementación completada (código + tests unitarios/integración con Redis mockeado). **Pendiente:** verificación empírica de `TRUST_PROXY` en staging con tráfico real (Fase 0 del TDD) antes de considerar confiables los límites por IP en ese entorno, y validación manual contra una instancia real de Redis/Memorystore.

---

## Objetivo

Proteger `/geocode`, `/geocode/reverse` y `/producers/map` de abuso, y respetar la política de uso de Nominatim (máx. 1 req/s saliente para toda la aplicación), sin que una caída de Redis vuelva inutilizable el mapa público (fail-open en 3 niveles: Redis distribuido → `MemoryStore` local por instancia → dejar pasar la request).

Detalle completo de contexto y decisiones: [`docs/tdd/MAPS-020-tdd-rate-limiting-geocoding-mapa.md`](../tdd/MAPS-020-tdd-rate-limiting-geocoding-mapa.md).

---

## Cambios implementados

### 1. Infraestructura Redis compartida

- `backend/package.json` — nuevas deps `ioredis`, `rate-limit-redis`.
- `backend/src/config/env.ts` — `REDIS_URL` opcional (Zod). Sin ella, todo corre en memoria (dev/test); obligatoria de hecho en staging/producción para que el rate limiting y la caché sean efectivos entre instancias.
- `backend/src/lib/redis.ts` (nuevo) — cliente `ioredis` singleton (`getRedisClient()`, `null` si no hay `REDIS_URL`) y `isRedisHealthy()` (chequea `status === 'ready'`). `enableOfflineQueue: false` para que un Redis caído falle rápido en vez de colgar requests.

### 2. Rate limiting con degradación fail-open

- `backend/src/middlewares/rateLimitStore.ts` (nuevo) — `ResilientRateLimitStore`: evalúa `isRedisHealthy()` en **cada operación** (no solo al crear el limiter), así que degrada a `MemoryStore` local si Redis falla y vuelve sola al store distribuido cuando Redis se recupera, sin reiniciar el proceso.
- `backend/src/middlewares/optionalAuth.ts` (nuevo) — variante no bloqueante de `authenticate`: si hay `Bearer` válido setea `req.user` (solo verifica firma JWT, sin consultar Prisma, para no meter latencia de DB en un endpoint público de alto tráfico); si no, deja pasar como anónimo.
- `backend/src/middlewares/geocodeLimiter.ts` (nuevo) — `geocodeBurstLimiter` (10s: 5 anónimo / 10 autenticado por `userId`) y `geocodeSustainedLimiter` (15min: 30 anónimo / 120 autenticado). Clave: `user:<sub>` o IP (`ipKeyGenerator`). `max` es una función evaluada por request (no baked-in), necesario para diferenciar el cupo según `req.user`.
- `backend/src/middlewares/producersMapLimiter.ts` (nuevo) — 60 req/min por IP.
- `backend/src/api/v1/routes/geocode.routes.ts` y `producers.routes.ts` — limiters montados en las rutas correspondientes.

### 3. Caché de geocoding + límite global saliente a Nominatim

- `backend/src/lib/geocodeNormalize.ts` (nuevo) — normalización de queries (trim + colapso de espacios + lowercase) y redondeo de coordenadas a 5 decimales para agrupar cache hits.
- `backend/src/lib/geocodeCache.ts` (nuevo) — GET/SET en Redis con TTL diferenciado: 24h para resultados positivos, 5min para "no encontrado" (vía centinela, para no confundirlo con un cache miss real). Fail-open: cualquier error de Redis se trata como cache miss/no-op, nunca rompe la request.
- `backend/src/lib/nominatimLimiter.ts` (nuevo) — `runWithNominatimSlot()` serializa las llamadas salientes reales a Nominatim a máx. 1/s: espaciado local por proceso + lock distribuido de 1s en Redis (`SET NX PX`) cuando está sano, con timeout corto que degrada a fail-open si Redis no responde. Solo se invoca en cache-miss.
- `backend/src/lib/geocode.ts` (modificado) — `geocodeAddress`/`reverseGeocodeCoordinates` ahora consultan caché → si hay miss, pasan por el limiter global → guardan el resultado. **Firma pública sin cambios**, por lo que los tests que mockean este módulo siguen funcionando igual.

### 4. Observabilidad

- `backend/src/lib/geocodeMetrics.ts` (nuevo) — eventos estructurados por `console.log` (JSON): `geocode.cache_hit`, `geocode.cache_miss`, `geocode.provider_error` (con `reason: 'timeout' | 'network_error'` o `status`), `geocode.rate_limited` (con `authenticated: boolean`, sin IPs). El proyecto no tiene librería de logging, se sigue el patrón existente de `console.error`.
- `handler` custom en `geocodeLimiter.ts` para loguear `rate_limited` antes de responder 429.

### 5. Docs

- `docs/GCP_STAGING_RUNBOOK.md` — sección nueva "Redis / Memorystore", `REDIS_URL` en variables del backend, nota de prerequisito de verificación de `TRUST_PROXY` con tráfico real antes de confiar en los límites por IP en staging.

---

## Tests agregados

Todos corren sin una instancia real de Redis (mockeando `../src/lib/redis.js` o dejando `REDIS_URL` sin definir, como en dev/test):

- `tests/geocodeNormalize.unit.test.ts` — normalización de queries y coordenadas.
- `tests/geocodeCache.unit.test.ts` — TTL positivo/negativo, centinela de "no encontrado", fail-open ante errores de Redis en GET/SET.
- `tests/nominatimLimiter.unit.test.ts` — serialización real (≥1s entre inicios de tarea) con fake timers.
- `tests/rateLimitStore.unit.test.ts` — **escenarios de degradación pedidos explícitamente**: sin `REDIS_URL` funciona en memoria; Redis caído usa fallback local; Redis sano delega en `RedisStore`; recuperación de Redis vuelve sola al comportamiento distribuido, sin reiniciar nada.
- `tests/geocodeCacheDegradation.integration.test.ts` — mismos escenarios pero contra `geocodeAddress` real: cache hit no llama a Nominatim, cache miss con Redis sano cachea, Redis caído no rompe la request y consulta Nominatim directo, recuperación vuelve a cachear.
- `tests/geocodeLimiter.unit.test.ts` y `tests/producersMapLimiter.unit.test.ts` — verifican el 429 real (`NODE_ENV` stubeado a `production` para usar los límites de producción) y que autenticado tiene más cupo que anónimo.

Suite completa: `npm test` (backend) — 22 archivos, 214 tests, todos en verde. `npm run typecheck` y `npm run lint` limpios.

---

## Pendiente / fuera de este cambio

- **Fase 0 del TDD (bloqueante para confiar en los límites por IP en staging):** verificar con tráfico real que `TRUST_PROXY=1` resuelve el IP real del cliente detrás de Nginx, no el del proxy interno.
- Validación manual end-to-end contra una instancia real de Memorystore (provisionamiento de infraestructura, fuera del alcance de este repo).
- Ajuste de los valores numéricos de rate limiting según observabilidad real, una vez en producción.
