# MAPS-020 — TDD: Rate limiting y caché de geocoding para el mapa de productores

Documento de diseño técnico para proteger `GET /api/v1/geocode`, `GET /api/v1/geocode/reverse` y `GET /api/v1/producers/map` dentro del proyecto MAPS Asesores.

**Estado:** Aprobado
**Autor:** Lucas
**Revisores:** @lucaslegor
**Creado:** 2026-09-02
**Última actualización:** 2026-09-02

---

## Resumen

`GET /api/v1/geocode` y `GET /api/v1/geocode/reverse` son públicos, sin autenticación y sin ningún rate limit: cualquiera en Internet puede usar el backend de MAPS como proxy gratuito e ilimitado hacia Nominatim. No existe caché de resultados, por lo que cada búsqueda (incluso repetida) dispara una llamada externa nueva. Esto viola además la política de uso de Nominatim (máx. 1 req/s, caché obligatoria de resultados repetidos) y expone a MAPS al riesgo de que Nominatim banee el `User-Agent`/IP del servidor, rompiendo el geocoding para todos los usuarios legítimos. `GET /api/v1/producers/map` tampoco tiene límite alguno, permitiendo scraping/ráfagas sin control.

Este TDD propone: rate limiting específico por endpoint (estricto en geocoding, laxo en el mapa), con ventanas dobles (burst + sostenida), store distribuido en Redis/Memorystore (para que el límite sea efectivo aunque Cloud Run escale a múltiples instancias), caché de geocoding también en Redis (con normalización de queries y TTLs diferenciados para hits positivos/negativos), diferenciación de política entre tráfico público (clave = IP) y autenticado (clave = `userId`), y una verificación previa en staging del comportamiento real de `trust proxy`/`X-Forwarded-For` antes de confiar en `req.ip` como clave de ningún limiter. Cloud Armor/WAF y CAPTCHA quedan explícitamente fuera de alcance.

Este análisis fue precedido por una investigación de solo lectura del estado actual del código (sin cambios), cuyos hallazgos se resumen en la sección de Contexto.

---

## Objetivo

- Ningún endpoint de geocoding puede usarse como proxy ilimitado hacia Nominatim.
- El rate limit es efectivo aunque el backend corra en más de una instancia de Cloud Run simultánea.
- Las búsquedas repetidas o equivalentes (variando mayúsculas/espacios) no generan llamadas redundantes a Nominatim.
- El tráfico autenticado (admin/intranet vía `AddressMapPicker`) no comparte cupo con el tráfico público anónimo.
- `GET /api/v1/producers/map` queda protegido contra ráfagas/scraping bruto sin afectar el uso normal del mapa público.
- Antes de confiar en `req.ip` para cualquier limiter, se verifica empíricamente en staging que `trust proxy` resuelve la IP real del cliente en los dos caminos de entrada posibles (vía frontend+Nginx, y directo al backend).
- Queda observabilidad mínima para confirmar que el sistema funciona (requests, cache hit/miss, rate-limited, errores/timeouts de Nominatim).

---

## Contexto

### Situación actual

Hallazgos verificados leyendo el código real (no asumidos), previos a este diseño:

- `backend/src/api/v1/routes/geocode.routes.ts`: monta `GET /` y `GET /reverse`, ambos públicos, solo con `validate()` (Zod), **sin rate limiter**. Contiene un comentario explícito: *"Rate limiting específico queda pendiente para la fase pre go-live (ver MAPS-013 §5.2)"*.
- `backend/src/lib/geocode.ts`: `geocodeAddress()` / `reverseGeocodeCoordinates()` llaman a Nominatim con `AbortController` (timeout 5s), sesgo geográfico AR/BA/La Plata (`countrycodes=ar`, `viewbox`, `bounded=0`, `limit=1`). **No hay caché en ningún nivel** (ni backend ni frontend).
- `backend/src/validations/geocode.schema.ts`: `q` entre 3 y 200 caracteres, sin normalización de mayúsculas/espacios repetidos.
- `backend/src/api/v1/routes/producers.routes.ts:189`: `GET /map` público, sin `authenticate`, **sin rate limiter**.
- Los únicos rate limiters existentes en el repo son `loginLimiter` (`auth.routes.ts`, `POST /login`) y `passwordChangeLimiter` (`backend/src/middlewares/passwordChangeLimiter.ts`, compartido por `PATCH /auth/me/password` y `PATCH /producers/me/password`). Ambos usan `express-rate-limit@8.3.2` con `windowMs: 15*60*1000`, sin `store` configurado (→ `MemoryStore` en proceso, por defecto de la librería). `passwordChangeLimiter` usa `keyGenerator` custom por `req.user.sub`; `loginLimiter` usa el key por defecto (IP).
- No hay Redis ni ningún store distribuido en el proyecto (`backend/package.json` no lo incluye).
- `backend/src/app.ts:28`: `app.set('trust proxy', env.trustProxy)`; en staging, `docs/GCP_STAGING_RUNBOOK.md:138` fija `TRUST_PROXY=1`.
- `docs/GCP_STAGING_RUNBOOK.md:36,202`: el backend Cloud Run es **públicamente invocable** en esta versión (no solo alcanzable vía el proxy `/api/*` del frontend/Nginx), y Nginx no genera identity tokens ni hace autenticación servicio-a-servicio. Esto crea (al menos) dos caminos de entrada con distinta cantidad de hops de proxy: (a) Browser → GFE frontend → Nginx (agrega `X-Forwarded-For`) → GFE backend → Express, (b) Browser → GFE backend directo → Express. Con `TRUST_PROXY=1` fijo, no está confirmado que `req.ip` resuelva correctamente en ambos caminos — no hay evidencia de tráfico real inspeccionada, solo el análisis de la topología documentada.
- `frontend/src/shared/components/map/AddressMapPicker.tsx` (usado en alta/high edición de productor desde admin e intranet): debounce de 600ms, mínimo 5 caracteres, sin `AbortController` real (usa un `requestId` ref para descartar respuestas obsoletas). Llama a la misma función cliente (`frontend/src/shared/lib/geocode.ts`) y por lo tanto al mismo endpoint público que usa `FindAdvisorMap` (mapa público) — sin distinción de origen ni de cupo.
- `frontend/src/modules/public-web/components/FindAdvisorMap.tsx`: la búsqueda de ciudad dispara geocoding solo en submit del formulario (no por keystroke). "Usar mi ubicación" usa `navigator.geolocation` y hace el cálculo de distancia **en el cliente** contra los productores ya cargados — no llama a `/geocode` en ningún momento.
- Política oficial de Nominatim (`https://operations.osmfoundation.org/policies/nominatim/`, documentación externa, no parte del código del proyecto): máximo absoluto 1 req/s, caché obligatoria de resultados repetidos, prohibido autocompletar por keystroke, prohibidas consultas idénticas repetidas (riesgo de baneo), `User-Agent` identificable obligatorio (ya cumplido vía `NOMINATIM_USER_AGENT`).

### Por qué ahora

`/geocode` está en producción/staging sin ningún control desde su creación (MAPS-013 lo dejó como decisión abierta DA-4, "pre go-live", sin dueño que lo haya tomado). El riesgo no es hipotético: es una superficie completamente abierta hoy, con impacto potencial en la disponibilidad del geocoding para todos los usuarios (baneo de Nominatim) si alguien la explota, intencionalmente o no.

---

## Alcance

- Rate limiting con ventanas dobles (burst + sostenida) en `GET /api/v1/geocode` y `GET /api/v1/geocode/reverse`.
- Rate limiting laxo (ventana simple) en `GET /api/v1/producers/map`.
- Diferenciación de clave/política: IP para tráfico anónimo, `userId` para tráfico autenticado, en los endpoints de geocoding.
- Store distribuido (Redis/Memorystore) compartido por los rate limiters y por la caché de geocoding.
- Caché de resultados de geocoding en Redis, con normalización de `q` (trim, colapso de espacios, lowercase) y TTLs diferenciados para hits positivos y negativos (resultado no encontrado).
- Verificación en staging (diagnóstico temporal, no permanente) del comportamiento de `trust proxy`/`X-Forwarded-For` en los dos caminos de entrada posibles, antes de fijar la configuración definitiva de `TRUST_PROXY`.
- Respuesta `429` estándar (`express-rate-limit`) con headers `RateLimit-*`/`Retry-After` y body consistente con el formato de error del proyecto, sin filtrar detalles internos (Redis, Nominatim, reglas).
- Observabilidad mínima: contadores/logs de `geocode.request`, `geocode.cache_hit`, `geocode.cache_miss`, `geocode.rate_limited`, `geocode.provider_error`, `geocode.provider_timeout`.

### Fuera de alcance

- Cloud Armor / WAF / Load Balancer externo delante de Cloud Run.
- CAPTCHA o cualquier challenge interactivo.
- Bloqueo por listas negras manuales de IP o por `User-Agent`.
- Cambio de proveedor de geocoding (se mantiene Nominatim).
- Cambios en la arquitectura de MAPS-015 (el flujo `Frontend → Backend → Nominatim` se mantiene; el browser nunca llama a Nominatim directo).
- Autenticación servicio-a-servicio entre frontend y backend Cloud Run (mencionada en el runbook como fuera de esta versión) — este TDD no la requiere ni la resuelve.
- Migración de datos o cambios de schema Prisma (no aplica: no hay modelo de datos nuevo).

---

## Diseño propuesto

### Resumen

```
                    ┌──────────────────────┐
                    │       Usuario        │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Cloud Run Express   │
                    └──────────┬───────────┘
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
                 ▼                           ▼
         GET /producers/map          GET /geocode(/reverse)
                 │                           │
          rate limit laxo            rate limit BURST
          (60 req / 1 min, IP)               │
                                              ▼
                                     rate limit SOSTENIDO
                                     (clave: IP anónimo /
                                      userId autenticado)
                                              │
                                              ▼
                                       normalizar query
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │ Redis/Memorystore│
                                    │ (limiter store +│
                                    │  cache geocode) │
                                    └────────┬────────┘
                                             │
                              ┌──────────────┴──────────────┐
                              │                              │
                         CACHE HIT                      CACHE MISS
                              │                              │
                              ▼                              ▼
                          responder                     Nominatim
                                                             │
                                                             ▼
                                                     Redis SET (TTL
                                                     24h positivo /
                                                     5min negativo)
```

### Componentes / archivos afectados

| Pieza | Ubicación | Rol |
|-------|-----------|-----|
| Cliente Redis | `backend/src/lib/redis.ts` | Nuevo — conexión única compartida (`ioredis` u otra librería a evaluar), reutilizada por limiters y caché |
| Store de rate limit distribuido | `backend/src/middlewares/rateLimitStore.ts` | Nuevo — adapta el cliente Redis al `Store` de `express-rate-limit` (ej. vía `rate-limit-redis`) |
| Limiter de geocoding | `backend/src/middlewares/geocodeLimiter.ts` | Nuevo — burst + sostenido, clave IP/userId según autenticación, siguiendo el patrón de `passwordChangeLimiter.ts` |
| Limiter del mapa | `backend/src/middlewares/producersMapLimiter.ts` | Nuevo — ventana simple, clave IP |
| Caché de geocoding | `backend/src/lib/geocode.ts` | Modificado — normalización de `q`, lookup/set en Redis antes/después de llamar a Nominatim, TTL diferenciado positivo/negativo |
| Normalización de query | `backend/src/lib/geocode.ts` o helper nuevo | Nuevo — trim, colapso de espacios, lowercase, usado como parte de la clave de caché |
| Rutas de geocoding | `backend/src/api/v1/routes/geocode.routes.ts` | Modificado — monta `geocodeLimiter` antes de `validate()` |
| Rutas de productores | `backend/src/api/v1/routes/producers.routes.ts` | Modificado — monta `producersMapLimiter` en `GET /map` |
| Config de entorno | `backend/src/config/env.ts` | Modificado — nuevas env vars (`REDIS_URL` o equivalente, posiblemente valores de ventana/límite si se decide parametrizarlos) |
| Ejemplo de entorno | `backend/.env.example` | Modificado — documentar las nuevas variables |
| Runbook de staging | `docs/GCP_STAGING_RUNBOOK.md` | Modificado — Redis/Memorystore como recurso nuevo, resultado de la verificación de `trust proxy`, IAM conceptual del nuevo componente |
| Observabilidad | ubicación a definir según patrón de logging existente en el repo | Nuevo/Modificado — eventos `geocode.request` / `cache_hit` / `cache_miss` / `rate_limited` / `provider_error` / `provider_timeout` |
| Tests de integración | `backend/tests/geocode.integration.test.ts` | Modificado — casos de `429`, cache hit/miss, diferenciación auth/anon |
| Tests de librería | `backend/tests/geocode.lib.test.ts` (o nombre equivalente existente) | Modificado — normalización, TTLs |
| Tests de mapa | `backend/tests/producersMap.integration.test.ts` | Modificado — caso de `429` |

### Modelo de datos

N/A. No se agregan tablas ni columnas — el estado de rate limiting y caché vive en Redis, no en Postgres.

### Contratos de API

No cambian los contratos de request/response existentes de `GET /geocode`, `GET /geocode/reverse` ni `GET /producers/map`. Se agrega el código de respuesta `429` a los tres:

| Método | Ruta | Body / Query | Respuesta nueva | Notas |
|--------|------|--------------|------------------|-------|
| `GET` | `/api/v1/geocode` | `q` (existente) | `429 { data: null, message: "Demasiadas solicitudes. Intentá nuevamente en unos minutos.", error: null }` | Headers `RateLimit-*`, `Retry-After` |
| `GET` | `/api/v1/geocode/reverse` | `lat`,`lng` (existente) | `429` ídem | ídem |
| `GET` | `/api/v1/producers/map` | — | `429` ídem | ídem |

El formato del body de `429` sigue el mismo shape (`data/message/error`) ya usado por `passwordChangeLimiter` y `loginLimiter`, para consistencia con el resto de la API.

### UI / UX

N/A directo — no hay cambios de interfaz. Efecto indirecto: si un usuario legítimo (público o admin) excede el límite, debe ver el mensaje de error existente en el manejo de errores del frontend (`geocode.ts` / `AddressMapPicker.tsx` / `FindAdvisorMap.tsx`) de forma no distinta a otros errores de red — a confirmar durante implementación si hace falta un mensaje específico para `429` o alcanza con el genérico actual.

### Cambios en código existente

- `backend/src/lib/geocode.ts`: se agrega una capa de caché antes de la llamada HTTP a Nominatim, y normalización de `q`. No cambia la firma pública de `geocodeAddress()`/`reverseGeocodeCoordinates()` de cara a los controllers.
- `backend/src/api/v1/routes/geocode.routes.ts` y `producers.routes.ts`: se agregan middlewares de rate limit en la cadena de cada ruta, sin tocar `validate()` ni los controllers.
- `backend/src/app.ts`: no se prevé cambio (los limiters se montan por ruta, no globalmente), salvo que la verificación de `trust proxy` (ver Preguntas abiertas / Fase 0) determine que `env.trustProxy` necesita otro valor.

---

## Decisiones tomadas

- Rate limiting específico por endpoint, no un limiter global agresivo para toda la API — la superficie de riesgo real está concentrada en geocoding (dependencia externa) y, en menor medida, en el mapa (scraping).
- `GET /producers/map` recibe un límite mucho más permisivo (60 req/min por IP) que geocoding, porque no depende de un servicio externo, solo de Cloud SQL.
- Store distribuido en Redis/Memorystore para los rate limiters de esta feature, en vez de `MemoryStore` en proceso — porque el análisis previo confirmó que un contador en memoria pierde efectividad si Cloud Run escala a más de una instancia, y porque el mismo componente se reutiliza para la caché de geocoding (una sola pieza de infraestructura nueva para dos necesidades).
- Caché de geocoding implementada ahora, no diferida — reduce directamente el volumen real de llamadas a Nominatim (no solo el abuso) y es requisito de la propia política de uso de Nominatim.
- Normalización de `q` (trim, colapso de espacios, lowercase) como parte de la clave de caché, para que variantes triviales de una misma búsqueda compartan resultado cacheado.
- TTL positivo inicial: 24h. TTL negativo (sin resultados) inicial: 5min — evita que un `not found` puntual (ej. typo transitorio corregido por el usuario) quede "pegado" por mucho tiempo, sin dejar de amortiguar reintentos en ráfaga.
- Diferenciación de clave: IP para tráfico anónimo, `userId` para tráfico autenticado, con fallback a IP si no hay usuario autenticado — mismo endpoint público (`GET /geocode`), el limiter decide la política internamente según si la request trae identidad válida, sin duplicar rutas. El detalle de cómo el limiter detecta "autenticado" en un endpoint que no pasa por `authenticate` (`/geocode` es público, no exige JWT) debe resolverse en implementación: probablemente aceptando el JWT si viene presente y válido (sin exigirlo), reutilizando la lógica de verificación existente sin convertir la ruta en protegida.
- Cloud Armor/WAF y CAPTCHA quedan fuera de esta feature — se evalúan solo si aparece evidencia de abuso a nivel de infraestructura/red que el rate limiting de aplicación no cubra.
- La verificación de `trust proxy` es un prerequisito de esta feature, no una tarea paralela: no se debe confiar en `req.ip` como clave de un limiter sin haber confirmado antes, con tráfico real en staging, que resuelve correctamente en los dos caminos de entrada (vía frontend+Nginx, y directo al backend). El diagnóstico usado para esa verificación es temporal y se retira (o se reduce a algo no sensible) una vez confirmada la configuración correcta — no debe quedar logging permanente de IPs completas como efecto colateral de esta feature.
- Respuesta `429` no debe filtrar detalles internos (existencia de Redis, de Nominatim, reglas exactas del limiter) al cliente — mismo criterio ya aplicado por los limiters existentes del proyecto.

---

## Alternativas consideradas

### Alternativa A — Rate limit simple, un único limiter por IP para toda la API

- **Qué era:** un solo `express-rate-limit` montado globalmente en `app.ts`, mismo límite para todos los endpoints.
- **Pros:** mínima complejidad de implementación.
- **Contras:** no distingue el costo real de cada endpoint (geocoding cuesta una llamada externa; el mapa no); un límite lo bastante laxo para no molestar el uso normal del mapa sería demasiado laxo para proteger geocoding, y viceversa.
- **Por qué se descartó:** la superficie de riesgo real (dependencia de Nominatim) está concentrada en dos endpoints específicos; tratarlos igual que el resto de la API desperdicia la oportunidad de un límite más ajustado donde realmente importa.

### Alternativa B — MemoryStore en vez de Redis/Memorystore

- **Qué era:** mantener el patrón ya usado por `loginLimiter`/`passwordChangeLimiter` (store en memoria de proceso), sin agregar infraestructura nueva.
- **Pros:** cero infraestructura adicional, cero costo operativo nuevo, implementación más simple y rápida.
- **Contras:** el contador no se comparte entre instancias de Cloud Run; si el servicio escala horizontalmente, el límite efectivo se multiplica por la cantidad de instancias activas, contradiciendo el objetivo de la feature.
- **Por qué se descartó:** el propósito explícito de esta feature es una protección real contra bots/abuso, no un placeholder — diseñarla asumiendo una sola instancia para siempre no es aceptable dado que Cloud Run puede escalar. Además, Redis se reutiliza para la caché de geocoding, lo que reparte su costo entre dos necesidades reales.

### Alternativa C — Diferir la caché de geocoding a una segunda etapa

- **Qué era:** implementar solo rate limiting ahora, dejar la caché para más adelante.
- **Pros:** alcance más chico para esta primera entrega.
- **Contras:** el rate limiting solo no resuelve el volumen de llamadas redundantes a Nominatim (búsquedas populares repetidas por usuarios legítimos distintos); la política de Nominatim exige caché de resultados repetidos, no es opcional.
- **Por qué se descartó:** ambos problemas (abuso y volumen redundante) comparten la misma causa raíz (ausencia de control en `/geocode`) y la misma pieza de infraestructura (Redis ya se agrega para el limiter distribuido) — resolverlos juntos es más barato que dos entregas separadas.

### Alternativa D — Endpoints separados para geocoding público vs. autenticado

- **Qué era:** exponer `GET /geocode` (público) y algo como `GET /geocode/internal` (autenticado) con límites propios, en vez de un único endpoint con política interna diferenciada por identidad.
- **Pros:** separación más explícita a nivel de routing; más simple de razonar en logs de acceso.
- **Contras:** duplica lógica de controller/validación, y `AddressMapPicker` (admin/intranet) tendría que apuntar a una ruta distinta de la usada hoy, aumentando el diff sin necesidad real. La política de la Alternativa D del análisis previo (diferenciar por IP+usuario) ya se puede lograr con una sola ruta y un `keyGenerator`/límite condicional.
- **Por qué se descartó:** el mismo resultado (cupos distintos para público vs. autenticado) se logra con menor superficie de cambio manteniendo un único endpoint, que es el patrón que ya usa el proyecto (`passwordChangeLimiter` decide la clave según `req.user`, no según la ruta).

### Alternativa E — Cloud Armor / WAF ahora en vez de rate limiting de aplicación

- **Qué era:** resolver la protección a nivel de infraestructura (Load Balancer externo + Cloud Armor) en esta misma entrega.
- **Pros:** protegería también contra volumen bruto a nivel de red, no solo abuso de aplicación.
- **Contras:** el runbook de staging documenta que hoy no existe un Load Balancer externo delante de Cloud Run — agregarlo es un cambio de infraestructura mayor, no incremental; el problema identificado es principalmente de abuso de aplicación (uso indebido de un endpoint específico), no de volumen de red.
- **Por qué se descartó:** desproporcionado para el problema actual; queda como evolución futura condicionada a evidencia real de abuso de infraestructura, no como parte de esta feature.

---

## Plan de implementación

### Fase 0 — Verificación de `trust proxy` (prerequisito, sin código productivo)
- [ ] Agregar diagnóstico temporal en staging para loggear `req.ip` / `req.ips` / `X-Forwarded-For` en un endpoint de bajo riesgo (o vía middleware temporal), sin dejarlo como logging permanente
- [ ] Probar el camino Browser → frontend/Nginx → backend
- [ ] Probar el camino Browser → backend directo
- [ ] Determinar el valor correcto de `TRUST_PROXY` para que `req.ip` represente la IP real del cliente en el camino que realmente se quiere proteger (o documentar la limitación si no es unificable)
- [ ] Retirar o reducir el diagnóstico temporal una vez confirmado

### Fase 1 — Infraestructura compartida (Redis)
- [ ] Definir y aprovisionar Redis/Memorystore para staging (fuera del código: recurso de infraestructura)
- [ ] Cliente Redis compartido en `backend/src/lib/redis.ts`
- [ ] Nuevas env vars (`backend/src/config/env.ts`, `backend/.env.example`)

### Fase 2 — Rate limiting
- [ ] Store distribuido para `express-rate-limit` sobre Redis
- [ ] `geocodeLimiter` (burst + sostenido, clave IP/userId) en `geocode.routes.ts`
- [ ] `producersMapLimiter` (ventana simple, clave IP) en `producers.routes.ts`
- [ ] Respuesta `429` consistente con el formato de error del proyecto

### Fase 3 — Caché de geocoding
- [ ] Normalización de `q` (trim, colapso de espacios, lowercase)
- [ ] Lookup/set en Redis en `lib/geocode.ts`, TTL positivo 24h / negativo 5min
- [ ] Métrica/log de cache hit/miss

### Fase 4 — Observabilidad y documentación
- [ ] Eventos `geocode.request` / `cache_hit` / `cache_miss` / `rate_limited` / `provider_error` / `provider_timeout`
- [ ] Actualizar `docs/GCP_STAGING_RUNBOOK.md` (Redis como recurso nuevo, resultado de Fase 0, IAM conceptual)
- [ ] Tests: `429` por endpoint, cache hit/miss, diferenciación auth/anon, comportamiento de `keyGenerator` bajo el `trust proxy` confirmado en Fase 0

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| `trust proxy` mal configurado hace que `req.ip` no represente al cliente real, rompiendo la clave del limiter anónimo | Media | Alto | Fase 0 obligatoria antes de depender de `req.ip`; no avanzar a Fase 2 sin confirmar |
| Redis/Memorystore no disponible o con latencia alta afecta la latencia de cada request de geocoding/mapa | Baja | Medio | Definir comportamiento de fallback explícito (a decidir: negar la request de forma segura vs. dejar pasar sin límite) durante implementación, no dejarlo implícito |
| TTL de caché demasiado largo sirve una dirección desactualizada si Nominatim corrige un dato | Baja | Bajo | TTL de 24h es un punto de partida ajustable; no hay evidencia de que Nominatim cambie resultados con frecuencia relevante para este caso de uso |
| Límites iniciales demasiado estrictos generan falsos positivos en uso legítimo (ej. NAT/CGNAT compartiendo IP) | Media | Medio | Observabilidad de Fase 4 permite ajustar valores con datos reales; valores iniciales no son definitivos |
| Detección de "autenticado" en un endpoint público (`/geocode` no exige JWT) mal implementada, permitiendo bypass del límite estricto anónimo | Baja | Medio | Reutilizar la misma lógica de verificación de JWT ya validada en `authenticate`, en modo opcional (no bloqueante), no reimplementar decodificación propia |

---

## Plan de rollout

- [ ] Feature flag: no — el rate limiting y la caché se activan directamente al desplegar, no hay necesidad de apagarlos condicionalmente más allá de la propia configuración de límites
- [ ] Migraciones: N/A (sin cambios de schema)
- [ ] Cambios de configuración / variables de entorno nuevas: sí — Redis (URL/credenciales vía Secret Manager) y valor confirmado de `TRUST_PROXY` tras Fase 0
- [ ] Comunicación a usuarios: no aplica (cambio transparente salvo en caso de exceder límites)
- [ ] Plan de rollback: desmontar los middlewares de rate limit de las rutas (revierte a comportamiento actual) sin tocar la caché, que es aditiva y no afecta la corrección funcional si se desactiva

---

## Métricas de éxito

- 0 requests a Nominatim por encima del límite sostenido configurado por IP/usuario, medido vía `geocode.rate_limited` vs. `geocode.request`.
- Reducción medible de llamadas reales a Nominatim respecto al total de requests a `/geocode`, vía relación `cache_hit`/`request`.
- 0 falsos positivos reportados por usuarios legítimos (admin/intranet) durante uso normal, en el primer período de observación tras el rollout.

---

## Preguntas abiertas

- [ ] ¿Qué librería concreta de store distribuido para `express-rate-limit` sobre Redis se usa (`rate-limit-redis` u otra)? — _responde:_ @lucaslegor (o se decide en implementación si no cambia el diseño)
- [ ] ¿Comportamiento exacto si Redis no está disponible: fail-open (dejar pasar sin límite/caché) o fail-closed (rechazar)? — _responde:_ @lucaslegor
- [ ] ¿Dónde vive el mecanismo de detección de "usuario autenticado" en `/geocode` (que no pasa por `authenticate`) — helper compartido, o lógica puntual en `geocodeLimiter`? — a resolver en implementación, no bloquea el diseño
- [ ] Resultado de la Fase 0 (verificación de `trust proxy`): valor final de `TRUST_PROXY` para staging — _responde:_ @lucaslegor, con evidencia de staging

---

## Referencias

- **Tickets:** MAPS-020
- **TDD relacionado:** `docs/tdd/MAPS-013-tdd-post-merge-stabilization.md` (decisión abierta DA-4, origen de este TDD)
- **TDD relacionado:** `docs/tdd/MAPS-015-tdd-ubicacion-productores-mapa.md` (arquitectura de geocoding/mapa que este TDD protege, sin modificar)
- **Runbook de staging:** `docs/GCP_STAGING_RUNBOOK.md`
- **Política externa citada:** Nominatim Usage Policy — `https://operations.osmfoundation.org/policies/nominatim/` (documentación externa, no parte del repo)
- **Work-log de implementación:** `docs/worklog/MAPS-020-rate-limiting-geocoding-mapa.md` (a crear al cerrar el/los PR de implementación)
