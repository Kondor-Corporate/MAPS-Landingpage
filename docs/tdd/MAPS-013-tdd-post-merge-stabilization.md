# MAPS-013 — TDD: Post-merge Stabilization

Documento de diseño técnico para la fase de estabilización post-merge de los tickets MAPS-010, MAPS-011 y MAPS-012 dentro del proyecto MAPS Asesores.

**Estado:** En progreso — Fases A, B y C implementadas (2026-05-29)  
**Autor:** (equipo)  
**Revisores:** —  
**Creado:** 2026-05-28  
**Última actualización:** 2026-05-29

> **Nota de numeración:** El número MAPS-013 fue reutilizado previamente para el ticket "Vista Perfil Productor" (ver `docs/tdd/MAPS-013-tdd-vista-perfil-productor.md` y `docs/worklog/MAPS-013-vista-perfil-productor.md`). Ese trabajo ya está implementado y sus docs están etiquetados con MAPS-013. Este TDD representa la **segunda asignación** del número 013 —correspondiente a la fase de estabilización post-merge— y convive con los anteriores en el filesystem. Se propone como decisión abierta si se retronumera el perfil a MAPS-013a/013b o si se avanza con MAPS-014 para Noticias API real y se reserva este slot para estabilización. Ver sección «Decisiones abiertas».

---

## 1. Resumen

El merge sucesivo de MAPS-010 (security baseline), MAPS-011 (biblioteca digital UI) y MAPS-012 (biblioteca digital API) dejó seis riesgos activos que deben cerrarse antes de continuar con nuevas features: (1) el frontend llama a Nominatim directamente desde el browser sin User-Agent, violando los ToS de OpenStreetMap; (2) las variables de entorno de storage/PDFs (`STORAGE_PROVIDER`, `API_PUBLIC_URL`) están documentadas en `.env.example` pero ausentes del `.env` real de desarrollo y del CI; (3) la Biblioteca Digital no tiene tests de integración en el backend a pesar de tener API completa; (4) varios documentos de los tickets anteriores tienen encabezados con número incorrecto o referencias cruzadas rotas; (5) cuatro links del footer público apuntan a anclas o secciones que no existen; (6) el campo `telefono` del perfil del productor se expone públicamente sin restricción, aunque solo `whatsapp` tiene el nivel de visibilidad acordado.

El objetivo de MAPS-013 es cerrar todos estos riesgos con cambios quirúrgicos y sin ampliar el alcance funcional del producto.

---

## 2. Contexto

### Situación actual

#### 2.1 Llamada directa a Nominatim desde el browser

| Archivo | Línea | Problema |
|---------|-------|---------|
| `frontend/src/shared/lib/geocode.ts` | 7 | `fetch('https://nominatim.openstreetmap.org/search?...')` sin `User-Agent` |
| `frontend/src/modules/public-web/components/FindAdvisorMap.tsx` | 9, 131 | `import { geocodeQuery } from '@/shared/lib/geocode'` → llama a la función anterior |

El navegador no puede enviar cabeceras `User-Agent` arbitrarias en `fetch`. La política de uso de Nominatim exige identificación válida; sin ella la IP del usuario (o la del CDN) puede ser bloqueada. El backend **ya tiene** `backend/src/lib/geocode.ts` con `geocodeAddress()` que usa `NOMINATIM_USER_AGENT` del entorno y manejo de timeout de 5 s, pero no existe ningún endpoint que lo exponga.

#### 2.2 Variables de entorno desalineadas

| Variable | `.env.example` | `.env` real (dev) | `ci.yml` |
|----------|---------------|-------------------|----------|
| `STORAGE_PROVIDER` | ✓ (`local`) | ✗ no versionado (copiar desde `.env.example`) | ✓ `local` — **alineado en Fase A** |
| `API_PUBLIC_URL` | ✓ (`http://localhost:3000`) | ✗ no versionado (copiar desde `.env.example`) | ✓ `http://localhost:3000` — **alineado en Fase A** |
| `NOMINATIM_USER_AGENT` | ✓ (`maps-landingpage-dev/1.0`) | ✗ no versionado (copiar desde `.env.example`) | ✓ `MAPS-Asesores-CI/1.0` — **alineado en Fase A** |

> **Fase A (2026-05-29):** `ci.yml` ya declaraba las tres variables correctamente al momento de la auditoría de Fase A; se confirmó alineación. El `.env` real no se versiona; el `README.md` fue actualizado para documentar explícitamente estas tres variables y el proceso de copia desde `.env.example`. Ver sección §5.2 para la decisión técnica.

#### 2.3 Biblioteca Digital sin tests de integración

`backend/tests/` contiene actualmente:

```
auth.integration.test.ts
authorize-validate.middleware.test.ts
producers.integration.test.ts
producersMap.integration.test.ts
producersProfile.integration.test.ts
setup.ts
```

No existe `library.integration.test.ts` a pesar de que la API de biblioteca (`/api/v1/library/ramos`) está completamente implementada con RBAC, validaciones Zod y persistencia Prisma.

#### 2.4 Documentación inconsistente

| Archivo | Inconsistencia detectada |
|---------|-------------------------|
| `docs/tdd/MAPS-011-tdd-biblioteca-digital.md` | Título dice **"MAPS-010 — TDD: Biblioteca Digital"** (número incorrecto) |
| `docs/worklog/MAPS-011-biblioteca-digital.md` | Título dice **"MAPS-010 — Biblioteca Digital"** (número incorrecto) |
| `docs/tdd/MAPS-011-tdd-biblioteca-digital.md` | Contratos de API usan `PUT` en lugar de `PATCH`; MAPS-012 adoptó `PATCH` pero el TDD-011 no fue retroactualizado |
| `docs/tdd/MAPS-012-tdd-biblioteca-digital-api.md` | Sección "Plan de rollout" lista `VITE_USE_MOCK_LIBRARY` como feature flag opcional; ese flag nunca se documentó en `.env.example` del frontend |
| Numeración MAPS-013 | Dos documentos (`tdd/MAPS-013-tdd-vista-perfil-productor.md` y `worklog/MAPS-013-vista-perfil-productor.md`) usan el mismo número que este TDD de estabilización |

#### 2.5 Links públicos rotos en el footer

Archivo: `frontend/src/shared/layouts/PublicLayout.tsx` líneas 181–258.

| Link | `href` actual | Problema |
|------|--------------|---------|
| "Nosotros" | `#nosotros` | Funciona solo en `/`; desde `/asesores/:slug` no navega (ancla sin ruta) |
| "Contacto" | `/#contacto` | La sección `contacto` **no existe** en `HomePage.tsx`; las secciones son `inicio`, `nosotros`, `noticias`, `mapa` |
| "Términos y Condiciones" | `#terminos` | No existe página ni sección con ese id |
| "Política de Privacidad" | `#privacidad` | No existe página ni sección con ese id |

Adicionalmente, la columna que contiene "Términos y Condiciones" y "Política de Privacidad" está titulada **"Redes Sociales"**, lo que es semánticamente incorrecto.

#### 2.6 Teléfono expuesto en perfil público

`frontend/src/shared/components/profile/ProfileHeaderCard.tsx` renderiza `profile.telefono` como botón `<a href="tel:...">Llamar</a>` en **ambos** variants (`'intranet'` y `'public'`). La guarda `isPublic` (línea 24) solo controla el botón "Editar Perfil"; no aplica a `telefono`.

El tipo `ProfileViewModel` en `frontend/src/shared/types/producerProfile.ts` incluye `telefono: string | null`. El backend lo serializa desde el modelo `Productor` y lo devuelve al endpoint público `GET /api/v1/producers/:slug`. La decisión de visibilidad no está documentada.

### Por qué ahora

Antes de implementar MAPS-014 (Noticias API real) el equipo debe garantizar que la base es sólida:
- El bug de Nominatim está en producción en el componente de mapa público (alta visibilidad para usuarios finales).
- Las variables de entorno faltantes generan silencio peligroso en CI y en servidores nuevos.
- La Biblioteca Digital sin tests es la única superficie de API del proyecto sin cobertura.
- Los links rotos del footer son visibles para cualquier visitante público.
- La decisión sobre `telefono` debe tomarse antes de que haya productores reales con perfiles publicados.

---

## 3. Problemas detectados

| # | Severidad | Área | Descripción breve |
|---|-----------|------|-------------------|
| P1 | **Alta** | Frontend/Nominatim | `geocodeQuery()` llama a Nominatim directamente desde el browser sin User-Agent válido → riesgo de ban de IP |
| P2 | **Alta** | Env/CI | `STORAGE_PROVIDER`, `API_PUBLIC_URL`, `NOMINATIM_USER_AGENT` ausentes en `.env` real y en `ci.yml` |
| P3 | **Media** | Tests | Biblioteca Digital no tiene tests de integración backend |
| P4 | **Media** | Docs | Títulos con número incorrecto en MAPS-011 TDD y worklog; contrato PUT vs PATCH en TDD-011 desactualizado |
| P5 | **Media** | Frontend/Footer | Cuatro links rotos/inexistentes + columna "Redes Sociales" con contenido legal |
| P6 | **Media** | Privacy/Perfil | `telefono` expuesto públicamente sin decisión documentada |
| P7 | **Baja** | Docs | Conflicto de numeración MAPS-013 (dos significados distintos) |

---

## 4. Objetivo

- Crear proxy backend `GET /api/v1/geocode?q=...` (público, sin auth) que use `backend/src/lib/geocode.ts` existente y `NOMINATIM_USER_AGENT`.
- Cambiar `frontend/src/shared/lib/geocode.ts` para consumir el proxy en lugar de llamar a Nominatim directamente.
- Actualizar `.env` real de desarrollo y `ci.yml` con las tres variables faltantes.
- Agregar `backend/tests/library.integration.test.ts` con cobertura de los endpoints críticos.
- Corregir títulos de MAPS-011 TDD y worklog; actualizar referencia `PUT → PATCH` en TDD-011; añadir nota en TDD-012 sobre `VITE_USE_MOCK_LIBRARY`.
- Corregir o desactivar los cuatro links rotos del footer; renombrar columna "Redes Sociales".
- Documentar y aplicar la decisión sobre visibilidad pública de `telefono`.

---

## 5. Alcance

### 5.1 Proxy de geocoding (backend + frontend)

**Backend:**
- Nueva ruta `GET /api/v1/geocode` — pública (sin `authenticate`), rate-limited por IP si fuera necesario en el futuro.
- Controlador delgado: valida que `q` no esté vacía, llama `geocodeAddress(q)` de `backend/src/lib/geocode.ts`, devuelve envelope estándar `{ data: { latitud, longitud } | null }`.
- No hay servicio separado: la lógica ya vive en `lib/geocode.ts`.
- Montar en `backend/src/api/v1/index.ts`: `v1Router.use('/geocode', geocodeRouter)`.

**Frontend:**
- Reescribir `frontend/src/shared/lib/geocode.ts`: eliminar llamada directa a Nominatim; usar `axiosInstance.get('/geocode?q=...')`.
- El tipo de retorno `GeocodeCoords` (`longitude`, `latitude`) se mantiene para no tocar `FindAdvisorMap.tsx`.
- Mapear `latitud/longitud` (nombres del backend) a `latitude/longitude` (nombre del frontend) en la función.

### 5.2 Alineación de variables de entorno

> **Estado Fase A (2026-05-29): ✅ Implementado**

**Decisiones aplicadas:**

- `STORAGE_PROVIDER=local` — valor tanto en desarrollo como en CI. Indica que los PDFs de certificaciones se guardan en `backend/uploads/certificaciones/` (carpeta ignorada por git). No requiere credenciales de S3 en desarrollo.
- `API_PUBLIC_URL=http://localhost:3000` — base para construir URLs de descarga de certificaciones. Sin esta variable, las URLs devuelven `undefined/uploads/...`.
- `NOMINATIM_USER_AGENT=maps-landingpage-dev/1.0 (contact@kondor.local)` en `.env.example` (desarrollo) y `MAPS-Asesores-CI/1.0` en `ci.yml`. El backend (`backend/src/lib/geocode.ts`) consume esta variable para identificar la app ante la API de OpenStreetMap; el browser nunca llama a Nominatim directamente.

**Acciones realizadas:**

- `backend/.env.example`: ya contenía las tres variables con valores correctos. Se verificó y confirmó alineación; se agregaron comentarios explicativos más detallados.
- `.github/workflows/ci.yml`: ya contenía las tres variables en el bloque `env` del job `quality`. Se verificó y confirmó alineación.
- `README.md` (raíz): actualizado con tabla de variables requeridas en setup local (paso 2) y sección "Variables de entorno — referencia" expandida con `STORAGE_PROVIDER`, `API_PUBLIC_URL` y `NOMINATIM_USER_AGENT`, incluyendo explicación de propósito de cada una y nota de que `.env` no se versiona.

**Nota sobre `.env` real:** El archivo `backend/.env` no se versiona (`.gitignore`). El README documenta explícitamente que debe crearse copiando `.env.example` y que estas tres variables deben estar presentes.

### 5.3 Tests de integración — Biblioteca Digital

Archivo nuevo: `backend/tests/library.integration.test.ts`

Escenarios mínimos:
- PRODUCTOR lista ramos activos (200).
- PRODUCTOR recibe 403 en `GET /library/ramos/:id`.
- PRODUCTOR recibe 403 en `POST /library/ramos`.
- Admin crea ramo (201) y lo recupera por id (200).
- Admin actualiza ramo (200) y lo desactiva vía `PATCH /:id/activo` (200).
- Admin elimina ramo (204).
- Nombre duplicado en la misma biblioteca → 409.
- `gdriveUrl` no HTTPS → 422.
- Sin token → 401.

### 5.4 Corrección de documentación

| Archivo | Corrección |
|---------|-----------|
| `docs/tdd/MAPS-011-tdd-biblioteca-digital.md` | Cambiar "MAPS-010" → "MAPS-011" en título y resumen |
| `docs/worklog/MAPS-011-biblioteca-digital.md` | Cambiar "MAPS-010" → "MAPS-011" en título y primer párrafo |
| `docs/tdd/MAPS-011-tdd-biblioteca-digital.md` | Agregar nota al pie de la tabla de contratos: "El contrato final usa `PATCH` (MAPS-012); el `PUT` en esta tabla quedó obsoleto." |
| `docs/tdd/MAPS-012-tdd-biblioteca-digital-api.md` | Agregar nota: "`VITE_USE_MOCK_LIBRARY` no fue implementado; el frontend siempre usa la API. Eliminar esta referencia en próxima revisión." |

### 5.5 Corrección de links del footer

Archivo: `frontend/src/shared/layouts/PublicLayout.tsx`

| Link actual | Acción |
|-------------|--------|
| `#nosotros` (en columna "Contacto") | Cambiar a `/#nosotros` para que funcione desde cualquier ruta |
| `/#contacto` (en columna "Contacto") | **Eliminar o cambiar a `/#nosotros`** dado que la sección `contacto` no existe |
| `#terminos` | Desactivar (convertir a texto sin `href`) con comentario `{/* TODO: página legal pendiente */}` |
| `#privacidad` | Ídem |
| Columna "Redes Sociales" | Renombrar a "Legal" |

### 5.6 Decisión sobre visibilidad pública de `telefono`

Ver sección «Decisiones recomendadas».

---

## 6. Fuera de alcance

- Noticias API real (MAPS-014).
- Rediseño visual del footer o del perfil.
- Nuevas features de mapa.
- Subir PDFs a S3 (adaptador `S3StorageAdapter` ya existe; activarlo es una tarea operativa, no de código).
- Eliminar el modelo `Recurso` de Prisma.
- Crear páginas legales completas (Términos, Privacidad).
- Invitaciones de usuario y reset de contraseña.
- Rate limiting en el proxy de geocoding (fuera de alcance hasta tener nginx/LB).
- Paginación o caché del geocoding.
- Tests E2E de browser.
- Rediseño del flujo de certificaciones.

---

## 7. Decisiones abiertas

| ID | Pregunta | Responsable | Urgencia |
|----|----------|-------------|---------|
| DA-1 | ¿`telefono` debe ser visible en el perfil público? ¿O solo intranet? | @negocio + @privacidad | **Alta** — bloquea P6 |
| DA-2 | ¿El proxy `/api/v1/geocode` debe requerir autenticación? (El mapa es público, sin login.) | @arquitectura | Media |
| DA-3 | ¿Se retronumera "Vista Perfil Productor" (actualmente MAPS-013) para resolver el conflicto de numeración? | @equipo | Baja |
| DA-4 | ¿Se agrega rate limiting al proxy de geocoding antes de go-live? | @infra | Media |
| DA-5 | ¿La columna "Contacto" del footer debe enlazar a un formulario de contacto real en el futuro? | @negocio | Baja |

---

## 8. Decisiones recomendadas

### DR-1: Proxy de geocoding — público, sin auth

**Recomendación:** El endpoint `GET /api/v1/geocode` debe ser **público** (sin JWT). El mapa de asesores es una sección pública del sitio; exigir login rompe la UX y el propósito del componente `FindAdvisorMap`. El riesgo de abuso se mitiga con el timeout de 5 s ya existente en `backend/src/lib/geocode.ts` y con la responsabilidad de Nominatim de bloquear IPs del servidor (no del usuario). En producción, el reverse proxy (nginx) puede agregar rate limiting sin cambios de código.

### DR-2: Teléfono — ocultar en perfil público

**Recomendación:** **Ocultar `telefono` en la vista pública**; mantenerlo visible en intranet.

Justificación:
- En el perfil público ya existe el botón "WhatsApp" que cubre la necesidad de contacto inmediato de forma moderna y preferida en el mercado asegurador argentino.
- Exponer un número de celular de texto plano en una página pública indexada por Google aumenta el riesgo de spam y scraping.
- El impacto técnico es mínimo: agregar `isPublic &&` antes del bloque `{profile.telefono && ...}` en `ProfileHeaderCard.tsx`.
- El backend puede optar por omitir el campo del DTO público (`GET /producers/:slug`) o simplemente dejar que el frontend no lo muestre; la solución frontend es suficiente para el corto plazo.

**Implementación recomendada (frontend-only):**
```tsx
// ProfileHeaderCard.tsx — solo mostrar telefono en intranet
{!isPublic && profile.telefono && (
  <a href={`tel:${profile.telefono.replace(/\s/g, '')}`} ...>
    <Phone ... /> Llamar
  </a>
)}
```

### DR-3: Conflicto de numeración MAPS-013

**Recomendación:** No retronumerar los docs existentes de "Vista Perfil Productor" (demasiado ruido en git history). En cambio:
- Designar este TDD como la **versión definitiva de MAPS-013** en el sentido de "estabilización post-merge".
- Agregar una nota al comienzo de `docs/tdd/MAPS-013-tdd-vista-perfil-productor.md` indicando que ese trabajo fue realizado dentro del épico de MAPS-013 como sub-feature y que el sprint de estabilización es la continuación natural.
- El próximo ticket (Noticias API real) pasa a ser **MAPS-014**.

### DR-4: Variables de entorno en CI

**Recomendación:** Agregar `STORAGE_PROVIDER=local`, `API_PUBLIC_URL=http://localhost:3000` y `NOMINATIM_USER_AGENT=maps-landingpage-ci/1.0 (ci@kondor.local)` al bloque `env` del job `quality` en `ci.yml`. Esto evita que tests o builds futuros fallen silenciosamente por variables undefined.

### DR-5: Links del footer — eliminar "Contacto" fantasma

**Recomendación:** Eliminar el link "Contacto" (que apunta a `/#contacto`, sección inexistente) en lugar de redirigirlo a `/#nosotros` (ya existe el link "Nosotros"). Mantener dos links que llevan al mismo lugar genera confusión. Los links legales (Términos / Privacidad) se desactivan visualmente como texto plano hasta que existan las páginas correspondientes.

---

## 9. Plan de implementación por fases

### Fase A — Entorno y variables (½ día) ✅ Implementada — 2026-05-29

Todos los cambios son de configuración; riesgo de regresión nulo.

- [x] `backend/.env.example`: verificado — contiene `STORAGE_PROVIDER=local`, `API_PUBLIC_URL=http://localhost:3000`, `NOMINATIM_USER_AGENT=maps-landingpage-dev/1.0 (contact@kondor.local)` con comentarios claros. El `.env` real no se versiona; se documenta en README el proceso de copia.
- [x] `.github/workflows/ci.yml`: verificado — bloque `env` del job `quality` ya declara `STORAGE_PROVIDER: local`, `API_PUBLIC_URL: http://localhost:3000`, `NOMINATIM_USER_AGENT: MAPS-Asesores-CI/1.0`.
- [x] `README.md`: actualizado — paso 2 del setup incluye tabla de variables requeridas; sección "Variables de entorno — referencia" expandida con las tres variables nuevas y explicación de propósito.
- [x] Documentación de decisión técnica incorporada en §5.2 (este documento).
- [x] Verificación `npm run build` / `lint` / `typecheck` en backend y frontend ejecutada con resultado verde.

### Fase B — Proxy de geocoding backend (½ día) ✅ Implementada — 2026-05-29

- [x] Crear `backend/src/validations/geocode.schema.ts`: Zod schema con `q` requerido, trim, min 3, max 200. Validación 422 automática vía middleware `validate`.
- [x] Crear `backend/src/controllers/geocode.controller.ts`: `getGeocode` — delega en `geocodeAddress(q)` de `backend/src/lib/geocode.ts`. Devuelve `{ data: { latitud, longitud } | null, message, error: null }`.
- [x] Crear `backend/src/api/v1/routes/geocode.routes.ts`: `GET /` — sin authenticate; usa `validate({ query: geocodeQuerySchema })`. Nota de rate limiting pendiente para pre go-live.
- [x] Montar en `backend/src/api/v1/index.ts`: `v1Router.use('/geocode', geocodeRouter)`.
- [x] Crear `backend/tests/geocode.integration.test.ts`: G-01 (sin q→422), G-02 (q corta→422), G-02b (solo espacios→422), G-03 (resultado→200), G-04 (sin resultado→200 data null), G-05 (sin token→200).
- [x] Verificar typecheck, lint y build backend.

**Decisiones aplicadas:**
- Endpoint público (sin `authenticate`) porque el mapa de asesores es accesible sin login.
- No se duplica lógica: la única llamada HTTP a Nominatim vive en `backend/src/lib/geocode.ts`.
- Rate limiting específico pendiente para fase pre go-live (nginx/LB); documentado en la ruta con comentario.
- `geocodeAddress` retorna null para queries < 5 chars (validación interna de la lib); la validación Zod corta a < 3 chars con 422 previo.

### Fase C — Proxy de geocoding frontend (½ día) ✅ Implementada — 2026-05-29

- [x] Reescribir `frontend/src/shared/lib/geocode.ts`:
  - Eliminada llamada directa a `nominatim.openstreetmap.org`.
  - Usa `api.get('/geocode', { params: { q: query } })` (cliente Axios existente en `@/lib/axios`).
  - Mapea `{ latitud, longitud }` del backend → `{ latitude, longitude }` del frontend.
  - Mantiene tipo `GeocodeCoords` y firma pública `geocodeQuery(query)` sin cambios.
- [x] `FindAdvisorMap.tsx` no requiere modificaciones: la interfaz `geocodeQuery` → `GeocodeCoords | null` es idéntica.
- [x] Verificar typecheck, lint y build frontend.

### Fase D — Tests de integración Biblioteca Digital (1 día)

- [ ] Crear `backend/tests/library.integration.test.ts`.
- [ ] Seguir el patrón de `producers.integration.test.ts` (setup, teardown, helpers de auth).
- [ ] Cubrir los 9 escenarios listados en §5.3.
- [ ] Ejecutar `npm test` en backend y confirmar verde.

### Fase E — Corrección de docs (½ día)

- [ ] `docs/tdd/MAPS-011-tdd-biblioteca-digital.md`: corregir número en título + nota de contrato PUT→PATCH.
- [ ] `docs/worklog/MAPS-011-biblioteca-digital.md`: corregir número en título.
- [ ] `docs/tdd/MAPS-012-tdd-biblioteca-digital-api.md`: agregar nota sobre `VITE_USE_MOCK_LIBRARY`.
- [ ] Agregar nota de numeración en `docs/tdd/MAPS-013-tdd-vista-perfil-productor.md`.

### Fase F — Footer y perfil público (½ día)

- [ ] `frontend/src/shared/layouts/PublicLayout.tsx`:
  - `#nosotros` → `/#nosotros`.
  - Eliminar link "Contacto" (`/#contacto`).
  - Desactivar links `#terminos` y `#privacidad` (convertir a `<span>`).
  - Renombrar columna "Redes Sociales" → "Legal".
- [ ] `frontend/src/shared/components/profile/ProfileHeaderCard.tsx`:
  - Agregar guarda `!isPublic` al bloque de `profile.telefono` (DR-2).
- [ ] Verificar smoke visual en `/` y en `/asesores/:slug`.

---

## 10. Tests requeridos

### Tests nuevos (backend)

**Archivo:** `backend/tests/library.integration.test.ts`

| # | Descripción | Método | Ruta | Actor | Código esperado |
|---|-------------|--------|------|-------|----------------|
| L-01 | Lista ramos activos como PRODUCTOR | GET | `/api/v1/library/ramos` | PRODUCTOR | 200, solo activos |
| L-02 | Filtro `?activo=false` ignorado para PRODUCTOR | GET | `/api/v1/library/ramos?activo=false` | PRODUCTOR | 200, solo activos |
| L-03 | PRODUCTOR rechazado en GET por id | GET | `/api/v1/library/ramos/:id` | PRODUCTOR | 403 |
| L-04 | PRODUCTOR rechazado en POST | POST | `/api/v1/library/ramos` | PRODUCTOR | 403 |
| L-05 | Admin lista todos los ramos (activos + inactivos) | GET | `/api/v1/library/ramos` | ADMIN | 200, todos |
| L-06 | Admin crea ramo válido | POST | `/api/v1/library/ramos` | ADMIN | 201, ramo creado |
| L-07 | Admin recupera ramo por id | GET | `/api/v1/library/ramos/:id` | ADMIN | 200 |
| L-08 | Admin actualiza ramo | PATCH | `/api/v1/library/ramos/:id` | ADMIN | 200 |
| L-09 | Admin desactiva ramo | PATCH | `/api/v1/library/ramos/:id/activo` | ADMIN | 200, `activo: false` |
| L-10 | Admin elimina ramo | DELETE | `/api/v1/library/ramos/:id` | ADMIN | 204 |
| L-11 | Nombre duplicado en misma biblioteca | POST | `/api/v1/library/ramos` | ADMIN | 409 |
| L-12 | `gdriveUrl` sin HTTPS | POST | `/api/v1/library/ramos` | ADMIN | 422 |
| L-13 | Sin token | GET | `/api/v1/library/ramos` | — | 401 |

**Archivo:** `backend/tests/geocode.integration.test.ts` (nuevo, opcional en Fase D)

| # | Descripción | Esperado |
|---|-------------|---------|
| G-01 | `q` ausente → 422 | `{ error: ... }` |
| G-02 | `q` demasiado corta (<3 chars) → 422 | `{ error: ... }` |
| G-03 | `q` válida → 200 con `data: null` o `data: { latitud, longitud }` | (mock Nominatim o stub) |

> El test G-03 requiere mockear `geocodeAddress` o usar `nock` para interceptar la llamada HTTP a Nominatim.

### Tests existentes a ejecutar (regresión)

- `auth.integration.test.ts`
- `producers.integration.test.ts`
- `producersMap.integration.test.ts`
- `producersProfile.integration.test.ts`
- `authorize-validate.middleware.test.ts`

---

## 11. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| El proxy de geocoding agrega latencia perceptible al usuario | Media | Medio | `TIMEOUT_MS=5000` ya está en `lib/geocode.ts`; el usuario ya tenía esa latencia con Nominatim directo. No hay degradación neta. |
| Tests de biblioteca fallan porque el seed no insertó ramos | Media | Medio | Reutilizar patrón `beforeAll` con `prisma.ramo.create` propio del test, aislado del seed global. |
| CI falla porque se agrega `NOMINATIM_USER_AGENT` al env antes de que el código lo use | Baja | Bajo | La variable ya tiene default en `env.ts` (Zod); agregar el valor explícito al CI es más seguro. |
| Ocultar `telefono` en el perfil público rompe un flujo de negocio no documentado | Baja | Alto | Confirmar DA-1 con negocio antes de implementar Fase F. Si hay dudas, hacer el cambio detrás de un feature flag de front. |
| Conflicto de numeración genera confusión en revisiones de git | Baja | Bajo | Nota en ambos TDDs; issue de seguimiento abierto. |
| `/#nosotros` funciona en SPA si el router de React maneja el hash correctamente | Media | Bajo | Ya existe la lógica en `PublicLayout.tsx` (líneas 86–95): `useEffect` que lee `location.hash` y hace `scrollIntoView`. |

---

## 12. Criterios de aceptación

### CA-01 — Proxy geocoding ✅ Fases B y C completadas
- [x] `GET /api/v1/geocode?q=La+Plata` devuelve `200` con `data: { latitud: number, longitud: number }` o `data: null`.
- [x] `GET /api/v1/geocode` sin `q` devuelve `422`.
- [x] `frontend/src/shared/lib/geocode.ts` no contiene referencias a `nominatim.openstreetmap.org`.
- [ ] El mapa de asesores (`FindAdvisorMap`) sigue funcionando: al buscar una ciudad centra el mapa (verificación manual en navegador).

### CA-02 — Variables de entorno ✅ Fase A completada
- [x] `backend/.env.example` contiene `STORAGE_PROVIDER`, `API_PUBLIC_URL` y `NOMINATIM_USER_AGENT` con comentarios claros.
- [x] `ci.yml` declara las tres variables en `env` del job `quality`.
- [x] `README.md` documenta las variables, su propósito y que `.env` no se versiona.
- [ ] El job CI pasa en verde tras el cambio (verificación manual en próximo push a CI).
- [ ] Las URLs de descarga de certificaciones en dev tienen forma `http://localhost:3000/uploads/certificaciones/...` (verificable al subir un PDF de certificación).

### CA-03 — Tests de biblioteca
- [ ] `npm test` en backend pasa con al menos los escenarios L-01 a L-13.
- [ ] La cobertura del módulo `library` aparece en el reporte de Jest (no se exige umbral específico en esta iteración).

### CA-04 — Documentación
- [ ] Títulos de MAPS-011 TDD y worklog muestran "MAPS-011", no "MAPS-010".
- [ ] TDD-011 contiene nota sobre `PUT → PATCH`.
- [ ] TDD-012 contiene nota sobre `VITE_USE_MOCK_LIBRARY`.

### CA-05 — Footer
- [ ] Desde `/asesores/:slug`, el link "Nosotros" lleva a `/#nosotros` y funciona el scroll.
- [ ] No existe link funcional a "Contacto" (sección inexistente).
- [ ] "Términos y Condiciones" y "Política de Privacidad" no son links clicables (o redirigen a una página 404 clara con mensaje de "próximamente").
- [ ] La columna ya no se llama "Redes Sociales".

### CA-06 — Perfil público y teléfono
- [ ] (Si DA-1 se resuelve como "ocultar") El botón "Llamar" no aparece en `/asesores/:slug`.
- [ ] El botón "Llamar" sigue apareciendo en `/intranet/mi-perfil` y `/intranet/perfil/:slug`.
- [ ] La decisión queda documentada en este TDD (ya incorporada en DR-2).

---

## 13. Relación con próximos pasos — MAPS-014 Noticias API real

MAPS-013 (este ticket) es **prerequisito** de MAPS-014 por las siguientes razones:

| Dependencia | Motivo |
|-------------|--------|
| Variables de entorno alineadas (Fase A) | MAPS-014 introducirá posibles nuevas variables (`VITE_API_BASE_URL`, etc.); tener el `.env` y CI en orden evita confusiones al agregar más. |
| Proxy de geocoding (Fases B+C) | Confirma el patrón de "endpoints públicos sin auth" que Noticias API también usará si las noticias son públicas en la homepage. |
| Tests de biblioteca (Fase D) | Establece el patrón de test de integración para los futuros endpoints de noticias. |
| Documentación limpia (Fase E) | MAPS-014 referenciará MAPS-012/011 como antecedente; conviene que esos docs sean precisos. |

**Secuencia recomendada:** MAPS-013 completo → MAPS-014 Noticias API real (backend + frontend).

**Acoplamiento mínimo:** MAPS-013 no introduce cambios de esquema Prisma (sin migraciones), no toca las rutas de productores ni de auth, y no modifica el layout de la intranet. El riesgo de regresión en MAPS-014 es prácticamente nulo.

---

## Referencias cruzadas

| Documento | Relevancia |
|-----------|-----------|
| `docs/tdd/MAPS-011-tdd-biblioteca-digital.md` | TDD de la UI de biblioteca (P4 de este ticket) |
| `docs/tdd/MAPS-012-tdd-biblioteca-digital-api.md` | TDD del API de biblioteca (P3 de este ticket) |
| `docs/tdd/MAPS-010-tdd-quality-security-baseline.md` | Baseline de seguridad; precursor de P1 y P2 |
| `docs/tdd/MAPS-013-tdd-vista-perfil-productor.md` | TDD de perfil de productor (P6 y P7 de este ticket) |
| `docs/worklog/MAPS-010-quality-security-baseline.md` | Worklog que introdujo las variables de storage |
| `backend/src/lib/geocode.ts` | Función reutilizable para el proxy |
| `frontend/src/shared/lib/geocode.ts` | Punto exacto del llamado directo a Nominatim |
| `frontend/src/modules/public-web/components/FindAdvisorMap.tsx` | Consumidor del geocoding frontend |
| `frontend/src/shared/layouts/PublicLayout.tsx` | Footer con links rotos (líneas 181–258) |
| `frontend/src/shared/components/profile/ProfileHeaderCard.tsx` | Exposición de `telefono` sin guarda pública |
| `backend/.env.example` | Fuente de verdad de variables de entorno |
| `.github/workflows/ci.yml` | CI que requiere actualización de env vars |
