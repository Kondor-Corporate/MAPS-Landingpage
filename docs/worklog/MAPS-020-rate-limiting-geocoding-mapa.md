# MAPS-020 — Rate limiting distribuido y caché de geocoding

Documentación de la feature de rate limiting y caché de geocoding dentro del proyecto MAPS Asesores. Complementa el [README técnico](./README.md), el [README raíz](../README.md) y el [TDD MAPS-020](../tdd/MAPS-020-tdd-rate-limiting-geocoding-mapa.md).

---

## Objetivo

Proteger `/geocode`, `/geocode/reverse` y `/producers/map` de abuso, y respetar la política de uso de Nominatim (máx. 1 req/s saliente para toda la aplicación), sin que una caída de Redis vuelva inutilizable el mapa público. El TDD dejaba abiertos los valores de límites, la estrategia ante caída de Redis y el manejo en dev/test; esas decisiones (fail-open en 3 niveles, límites concretos por IP/usuario, límite global saliente con serialización de cache-misses) se tomaron junto al equipo antes de implementar y quedan documentadas abajo.

---

## Cambios implementados

### 1. Infraestructura Redis compartida

**Archivos:**

- `backend/package.json` — nuevas deps `ioredis`, `rate-limit-redis`.
- `backend/src/config/env.ts` — `REDIS_URL` opcional (Zod `.url().optional()`).
- `backend/src/lib/redis.ts` (nuevo)

Cliente `ioredis` singleton compartido por rate limiting y caché. Sin `REDIS_URL` (dev/test) devuelve `null`, lo que habilita la degradación en el resto del código sin que tenga que saber si Redis existe:

```ts
export function getRedisClient(): Redis | null {
  if (client !== undefined) return client;
  const env = loadEnv();
  if (!env.REDIS_URL) { client = null; return client; }
  const instance = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false, // clave: Redis caído falla rápido, no cuelga la request
  });
  ...
}

export function isRedisHealthy(): boolean {
  const instance = getRedisClient();
  return instance !== null && instance.status === 'ready';
}
```

`enableOfflineQueue: false` es la decisión no obvia acá: sin esto, un Redis caído haría que los comandos se encolen indefinidamente en vez de fallar rápido, lo que rompería el fail-open (la request quedaría esperando en vez de degradar al instante).

---

### 2. Rate limiting con degradación fail-open en 3 niveles

**Archivos:**

- `backend/src/middlewares/rateLimitStore.ts` (nuevo)
- `backend/src/middlewares/optionalAuth.ts` (nuevo)
- `backend/src/middlewares/geocodeLimiter.ts` (nuevo)
- `backend/src/middlewares/producersMapLimiter.ts` (nuevo)
- `backend/src/api/v1/routes/geocode.routes.ts`
- `backend/src/api/v1/routes/producers.routes.ts`

`ResilientRateLimitStore` implementa el `Store` de `express-rate-limit` con Redis como store distribuido y `MemoryStore` local como fallback. La decisión clave: `isRedisHealthy()` se evalúa **en cada operación** (`increment`/`decrement`/`resetKey`), no una sola vez al crear el limiter. Esto permite que el sistema se recupere solo cuando Redis vuelve, sin reiniciar el proceso ni recrear el limiter:

```ts
async increment(key: string): Promise<IncrementResponse> {
  if (this.redisStore && isRedisHealthy()) {
    try {
      return await this.redisStore.increment(key);
    } catch (error) {
      console.error('[rateLimit] Redis increment falló, degradando a MemoryStore local:', error);
    }
  }
  return this.memoryStore.increment(key);
}
```

`optionalAuth` es una variante no bloqueante de `authenticate`: si hay `Bearer` con firma válida setea `req.user`; si no, deja pasar como anónimo. A diferencia de `authenticate`, **no consulta Prisma** (no valida `activo`/`tokenVersion`) — en un endpoint público de alto tráfico no vale la pena esa latencia solo para calcular un cupo de rate limiting; un token revocado simplemente cuenta como autenticado hasta que expire, lo cual es aceptable porque no otorga ningún permiso adicional.

`geocodeLimiter.ts` define dos ventanas encadenadas (burst + sostenida), con clave `user:<sub>` o IP según `optionalAuth` haya podido identificar al usuario:

| Perfil | Burst (10s) | Sostenido (15min) |
|--------|-------------|--------------------|
| Anónimo (IP) | 5 | 30 |
| Autenticado (userId) | 10 | 120 |

`producersMapLimiter.ts`: 60 req/min por IP.

Montaje: `geocode.routes.ts` aplica `optionalAuth → geocodeBurstLimiter → geocodeSustainedLimiter` en ambas rutas; `producers.routes.ts:189` aplica `producersMapLimiter` en `GET /map`.

---

### 3. Caché de geocoding y límite global saliente a Nominatim

**Archivos:**

- `backend/src/lib/geocodeNormalize.ts` (nuevo)
- `backend/src/lib/geocodeCache.ts` (nuevo)
- `backend/src/lib/nominatimLimiter.ts` (nuevo)
- `backend/src/lib/geocode.ts`

`geocodeNormalize.ts` agrupa direcciones/coordenadas equivalentes bajo la misma clave de caché (trim + colapso de espacios + lowercase; coordenadas redondeadas a 5 decimales, ~1.1m).

`geocodeCache.ts` guarda en Redis con TTL diferenciado: 24h para resultados positivos, 5min para "no encontrado" (usando un centinela para distinguirlo de un cache miss real). Cualquier error de Redis en GET o SET se trata como fail-open (cache miss / no-op), nunca rompe la request:

```ts
if (value === null) {
  await client.set(key, NOT_FOUND_SENTINEL, 'EX', NEGATIVE_TTL_SECONDS);
} else {
  await client.set(key, JSON.stringify(value), 'EX', POSITIVE_TTL_SECONDS);
}
```

`nominatimLimiter.ts` — `runWithNominatimSlot()` serializa las llamadas salientes reales a Nominatim a máx. 1 req/s para toda la aplicación, y solo se invoca en cache-miss (los hits no consumen cupo). Combina un espaciado local por proceso con un lock distribuido de 1s en Redis (`SET NX PX`) cuando está sano; si Redis no responde en el timeout corto, degrada a fail-open (sigue solo con el espaciado local) en vez de bloquear la request indefinidamente.

`geocode.ts` — `geocodeAddress`/`reverseGeocodeCoordinates` ahora resuelven cache → limiter global → Nominatim → guardar en caché, **sin cambiar su firma pública**, por lo que los tests existentes que mockean este módulo (`geocode.integration.test.ts`, `producersMap.integration.test.ts`) siguen funcionando sin tocarlos.

---

### 4. Observabilidad

**Archivos:**

- `backend/src/lib/geocodeMetrics.ts` (nuevo)
- `backend/src/middlewares/geocodeLimiter.ts` (handler custom)

El proyecto no tiene una librería de logging (usa `console` en todo el código); se siguió ese patrón con eventos estructurados en JSON para poder filtrarlos/parsearlos en Cloud Logging: `geocode.cache_hit`, `geocode.cache_miss`, `geocode.provider_error` (`reason: timeout|network_error` o `status`), `geocode.rate_limited` (`authenticated: boolean`). Nunca se loguean IPs completas ni datos personales.

---

### 5. Docs

**Archivos:**

- `docs/GCP_STAGING_RUNBOOK.md`

Sección nueva "Redis / Memorystore" (recurso a provisionar, por qué no es un punto único de falla, `REDIS_URL` obligatoria en staging/prod) y nota de prerequisito: verificar `TRUST_PROXY` con tráfico real en staging antes de confiar en los límites por IP ahí (Fase 0 del TDD, no ejecutable desde este repo).

---

## Estado del sistema tras MAPS-020

### Flujo de una request a `/geocode`

```
GET /geocode?q=...
  → optionalAuth            (JWT opcional, solo firma, sin hit a DB)
  → geocodeBurstLimiter      (5 anon / 10s, 10 auth / 10s)
  → geocodeSustainedLimiter  (30 anon / 15min, 120 auth / 15min)
  → validate(query)
  → controller → geocodeAddress()
       → cache Redis: HIT  → responde (no consume cupo Nominatim)
       → cache Redis: MISS → runWithNominatimSlot() → Nominatim → guarda en caché
```

### Degradación de Redis (fail-open en 3 niveles)

| Estado de Redis | Rate limiting | Caché de geocoding |
|------------------|----------------|----------------------|
| Sano | Distribuido (Redis) | Activa (24h/5min TTL) |
| Caído | `MemoryStore` local por instancia | Deshabilitada, consulta Nominatim directo |
| Recuperado | Vuelve solo a distribuido (sin reinicio) | Vuelve sola a cachear |

---

## Criterios de aceptación verificados

| Criterio | Estado |
|----------|--------|
| `/geocode`, `/geocode/reverse` y `/producers/map` tienen rate limiting por IP/usuario | Verificado con `geocodeLimiter.unit.test.ts` y `producersMapLimiter.unit.test.ts` (429 real en `NODE_ENV=production`) |
| Anónimo y autenticado tienen cupos distintos | Verificado en `geocodeLimiter.unit.test.ts` |
| Nunca se supera 1 req/s hacia Nominatim, incluso con cache-misses concurrentes | Verificado en `nominatimLimiter.unit.test.ts` con fake timers |
| Cache hits no consumen cupo de Nominatim | Verificado en `geocodeCacheDegradation.integration.test.ts` |
| Redis caído no devuelve 429/503 ni rompe la request | Verificado en `rateLimitStore.unit.test.ts` y `geocodeCacheDegradation.integration.test.ts` |
| Redis caído degrada a `MemoryStore` local | Verificado en `rateLimitStore.unit.test.ts` |
| Redis recuperado vuelve solo al comportamiento distribuido | Verificado en `rateLimitStore.unit.test.ts` y `geocodeCacheDegradation.integration.test.ts` |
| TTL positivo (24h) / negativo (5min) en la caché | Verificado en `geocodeCache.unit.test.ts` |
| Firma pública de `geocode.ts` sin cambios (no rompe mocks existentes) | Suite completa en verde sin tocar `geocode.integration.test.ts` ni `producersMap.integration.test.ts` |
| `npm run typecheck` / `npm run lint` / `npm test` | Todos en verde: 22 archivos, 214 tests |

---

## Pruebas manuales recomendadas

```
1. Con REDIS_URL sin definir (dev normal):
   → GET /api/v1/geocode?q=La+Plata responde 200 igual que antes de MAPS-020
   → No debe haber ningún error de conexión a Redis en consola (getRedisClient devuelve null)

2. Con una instancia local de Redis y REDIS_URL apuntando a ella:
   → Primera consulta a una dirección: log "geocode.cache_miss" + llamada real a Nominatim
   → Segunda consulta idéntica (o con espacios/mayúsculas distintas): log "geocode.cache_hit", sin llamada a Nominatim
   → Disparar > 5 requests anónimas en 10s (con NODE_ENV=production): 429 con { data: null, error: null }

3. Simular caída de Redis (apagar el proceso o bloquear el puerto) mientras el backend sigue corriendo:
   → GET /api/v1/geocode sigue respondiendo 200 (no 429/503 por la caída)
   → Redis vuelve arriba: siguientes requests retoman caché/rate limiting distribuido sin reiniciar el backend
```

---

## Pendientes fuera de esta feature

| Pendiente | Detalle |
|-----------|---------|
| Fase 0 del TDD: verificación de `TRUST_PROXY` con tráfico real en staging | Bloqueante para confiar en los límites por IP en ese entorno; requiere tráfico real detrás de Nginx, no se puede validar desde este repo. Documentado como prerequisito en `docs/GCP_STAGING_RUNBOOK.md`. |
| Provisionamiento de Memorystore/Redis en staging | Infraestructura GCP, fuera del alcance de este repo. |
| Validación manual end-to-end contra una instancia real de Redis | Los tests automatizados mockean Redis; falta un smoke test contra Memorystore real una vez provisionado. |
| Ajuste de los valores numéricos de rate limiting | Los valores actuales (5/10s, 30/15min, etc.) son los iniciales de producción acordados; se ajustarán según observabilidad real. |

---

*Documento generado en la feature MAPS-020 — rate limiting y caché de geocoding.*
