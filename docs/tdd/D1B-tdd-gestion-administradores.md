# D1B — TDD: Gestión de Administradores

Documento de diseño técnico para la gestión de cuentas `ADMIN` por `SUPERADMIN` dentro del proyecto MAPS Asesores.

**Identificador:** D1B (no es un ticket `MAPS-XXX`; la rama es `feat/d1b-admin-management`). No reutiliza IDs históricos 015–018 ni MAPS-016 (ese ID en el repo es credenciales de productores).

**Estado:** Implementado
**Autor:** equipo MAPS
**Revisores:** —
**Creado:** 2026-09-02
**Última actualización:** 2026-09-02

> **Implementación:** completada según este diseño. Detalle retrospectivo en [`docs/worklog/D1B-gestion-administradores.md`](../worklog/D1B-gestion-administradores.md).

---

## Resumen

Hoy `/admin/admins` existe y está guardada a `SUPERADMIN` en el router, pero el backend es un stub (`501` / router vacío) y la pantalla dice “en construcción”. D1B conecta esa pantalla a `/api/v1/admins` para que el `SUPERADMIN` liste, busque, cree, edite el identificador `usuario`, active/desactive y restablezca la contraseña de cuentas con `rol = ADMIN`.

El modelo sigue siendo `Usuario`. No hay tabla `Admin`, no hay migración Prisma y el `SUPERADMIN` no entra al CRUD: se provisiona por infraestructura (seed / bootstrap GCP). El cambio de contraseña propia sigue en Auth (D1A). La recuperación break-glass del `SUPERADMIN` queda fuera de D1B.

---

## Objetivo

- El `SUPERADMIN` opera cuentas `ADMIN` desde `/admin/admins` contra PostgreSQL, con el mismo envelope, RBAC y revocación de sesiones que el resto del backend.
- La API rechaza anónimos (`401`), `PRODUCTOR` (`403`) y `ADMIN` (`403`). Solo `SUPERADMIN` pasa.
- Cualquier `:id` de `/admins` representa un `Usuario` con `rol = ADMIN`. `PRODUCTOR` y `SUPERADMIN` no son operables en este dominio.
- La UI replica la disposición de Productores (toolbar, tabla/cards, loading, empty, error+Reintentar, toast, paginación, modales, busy) con componentes propios del dominio Administradores.
- Tests de integración backend cubren autorización, aislamiento de rol, unicidad, política de password y revocación de sesiones. El runner frontend no se resuelve (D5).

---

## Contexto

### Situación actual

**Backend — stub D1B**

- `backend/src/api/v1/index.ts` ya monta `v1Router.use('/admins', adminsRouter)`.
- `backend/src/api/v1/routes/admins.routes.ts` exporta un `Router()` sin endpoints.
- `backend/src/controllers/admins.controller.ts` solo tiene `placeholder` → `501`.
- `backend/src/services/admins.service.ts` es `export const adminsService = {}`.
- `backend/src/validations/admin.schema.ts` define `adminIdSchema` como `z.string().uuid()`. **Es incorrecto:** `Usuario.id` es `Int @id @default(autoincrement())`. El mismo error existía en productores antes de MAPS-009 y ya se corrigió allí con `producerIdParamSchema` (`z.coerce.number().int().positive()`).

**Modelo** (`backend/prisma/schema.prisma`)

- `Usuario`: `id Int`, `usuario String @unique`, `passwordHash`, `tokenVersion`, `rol` (`SUPERADMIN | ADMIN | PRODUCTOR`), `activo`, `creadoPorId`, `lastLoginAt`, timestamps.
- `SesionToken`: hash de refresh, `usuarioId`, `onDelete: Cascade`.
- `Productor` es 1:1 opcional con `Usuario` (`usuarioId @unique`). Un `ADMIN` no tiene fila `Productor`.
- No hay constraint de unicidad física sobre la cantidad de `SUPERADMIN`.

**Identificador `usuario` hoy**

- Login (`authService.login`): `findUnique({ where: { usuario } })` **exacto**. No hace `trim` ni `toLowerCase`. El schema de login es `z.string().min(1)` (sin normalizar).
- Frontend de login (`LoginPage.tsx`): envía `usuario.trim()`. No lowercased. Si el valor contiene `@`, valida pinta de email; si no, acepta handle.
- Alta de productor (`producersService.create`): persiste `email.trim().toLowerCase()` en `Usuario.usuario` y responde `409` si ya existe (“El email ya está registrado”).
- Seed: handles en minúscula (`admin`, `superadmin`, `user`).
- Bootstrap GCP (`bootstrapAdmin.ts`): `BOOTSTRAP_ADMIN_EMAIL.toLowerCase()`, crea/recupera `SUPERADMIN`. Fuera de D1B.

**Sesiones (patrón vigente, no se cambia)**

- Access JWT lleva `sub`, `role`, `ver` (`tokenVersion`). TTL corto (`JWT_EXPIRES_IN=15m`).
- `authenticate` rechaza si `!activo`, si `rol` del token ≠ rol actual, o si `tokenVersion !== payload.ver`.
- Desactivar productor: `activo = false`, `tokenVersion++`, `sesionToken.deleteMany`. Reactivar: solo `activo = true` (no revive tokens, no decrementa `tokenVersion`).
- Reset admin de productor y self-service D1A: nuevo `passwordHash`, `tokenVersion++`, `deleteMany SesionToken`, en transacción. Hash `bcrypt` coste **12**.
- Edición de email de productor **no** revoca sesiones. D1B **sí** revocará al cambiar `usuario` de un `ADMIN` (decisión de negocio ya aprobada; no se “arregla” productores en este bloque).

**Auth / D1A**

- Canónico: `PATCH /api/v1/auth/me/password` (cualquier `Usuario` autenticado, pide contraseña actual).
- Alias temporal: `PATCH /api/v1/producers/me/password` solo `PRODUCTOR`.
- Reset de **otro** productor: `PATCH /api/v1/producers/:id/password` (`ADMIN`/`SUPERADMIN`). No se toca.
- Política: `backend/src/lib/passwordPolicy.ts` (mín. 8, 1 mayúscula, 1 minúscula, 1 número). Frontend espeja en `frontend/src/shared/utils/passwordPolicy.ts`.
- `passwordChangeLimiter` (clave `req.user.sub`) aplica al self-service, no al reset administrativo de productores.

**Frontend**

- Ruta `/admin/admins` con `RoleGuard allowedRoles={['SUPERADMIN']}` (`frontend/src/router/index.tsx`). `ADMIN` va a `/unauthorized`.
- Sidebar: ítem “Administradores” solo en `superadminItems`.
- `AdminsPage.tsx` es placeholder (“Sección en construcción”).
- Productores es la referencia UX: `ProducersDashboard`, toolbar, `SearchPillInput`, tabla desktop + cards mobile, `TablePagination` (8/16/32, client-side), empty `Inbox`, error + Reintentar, toast, `Modal`, `PasswordField`, `DeactivateConfirmModal`, `ProducerResetPasswordModal`. Filtro de estado en productores vive en otra ruta (`/admin/inactivos`) + query `?activo=`; D1B **no** copia esa segunda ruta.
- `getApiErrorMessage` en `frontend/src/modules/admin/lib/apiError.ts`.
- No hay runner de tests frontend (`docs/TESTING.md`, D5).

**Documentación viva**

- `docs/modules/admins.md` deja abiertas decisiones que este TDD cierra (quién gestiona, campos, flujo de alta/reset).
- Worklog D1A: `docs/worklog/D1A-cambio-self-password.md`.

### Por qué ahora

Sin D1B no hay forma de operar cuentas `ADMIN` desde la aplicación: altas, desactivar un admin comprometido o resetearle la contraseña. El self-service (D1A) no cubre a **otro** administrador. El roadmap vigente pone D1B como siguiente bloque de ingeniería.

---

## Problema

1. La UI de Administradores es un cascarón: no hay persistencia ni contrato.
2. El stub de validación usa UUID, incompatible con `Usuario.id`.
3. Mezclar `SUPERADMIN` en el mismo CRUD rompería las reglas de provisionamiento operativo y permitiría degradar/eliminar la cuenta break-glass.
4. Hay que reutilizar política de password, envelope y revocación de sesiones **sin** copiar el dominio Productor (perfil, slug, foto, `GET /:id` rico, página de inactivos).

---

## Alcance

- Contrato REST mínimo bajo `/api/v1/admins` (ver API).
- Backend: `admins.routes.ts`, `admins.controller.ts`, `admins.service.ts`, `admin.schema.ts`, tests `admins.integration.test.ts`.
- Frontend: pantalla `/admin/admins` real, coherente con Productores, componentes **propios** del dominio Administradores.
- Reutilizar: `authenticate`, `authorize(Rol.SUPERADMIN)`, `validate`, `AppError` / `errorHandler`, envelope `{ data, message, error }`, `passwordSchema`, `bcrypt` coste 12, patrón transaccional `tokenVersion++` + `sesionToken.deleteMany`, manejo `P2002` → `409`, `PasswordField`, `Modal`, `TablePagination`, `getApiErrorMessage`, `passwordPolicyError`, tokens visuales (`maps-*`).
- Docs vivos y worklog se actualizan **al cierre de esta misma rama** (`feat/d1b-admin-management`), en el mismo PR que el código: `docs/modules/admins.md`, `docs/ARCHITECTURE.md`, `docs/CHANGELOG.md`, `docs/worklog/D1B-gestion-administradores.md`. Este TDD no va en un PR aparte.

### Fuera de alcance

- Recovery break-glass del `SUPERADMIN` (procedimiento GCP).
- Modificaciones a `bootstrapAdmin` / job GCP / seed de `SUPERADMIN`.
- Constraint de unicidad técnica de `SUPERADMIN` en base de datos.
- Forgot-password, recovery por email, recovery codes.
- Auditoría completa de mutaciones (quién cambió qué, más allá de `creadoPorId` + `updatedAt`).
- MFA.
- Delete físico de `Usuario`.
- Nueva tabla `Admin`.
- Migración Prisma.
- Edición de rol, nombre/apellido, teléfono, foto, perfil público.
- Invitaciones.
- Selector de rol o checkbox activo/inactivo en el alta.
- Ruta `/admin/admins/inactivos`.
- `GET /api/v1/admins/:id` (el listado alcanza).
- Cambiar autenticación global (login case-insensitive, unificar handle vs email).
- Extraer helper genérico de hash/revocación tocando Auth y Productores (ver decisiones técnicas).
- Runner de tests frontend / CI frontend `npm test` (D5).
- Logout de producto (D2), integridad uploads (D3), UX privada menor (D4).
- Dependencias nuevas.

---

## Decisiones de negocio (cerradas)

No reabrir salvo contradicción técnica grave.

**SUPERADMIN**

- MAPS opera con un único `SUPERADMIN` funcional; no se impone constraint físico de cantidad.
- La aplicación **nunca** crea `SUPERADMIN`.
- No hay promoción `ADMIN → SUPERADMIN` ni degradación `SUPERADMIN → ADMIN` desde la app.
- Desde Administradores no se desactiva, no se resetea password, no se elimina ni se edita un `SUPERADMIN`.
- Los `SUPERADMIN` se provisionan/recuperan solo por mecanismos operativos/infraestructura.
- Recuperación de contraseña del `SUPERADMIN`: break-glass en GCP, fuera de D1B.
- D1A sigue siendo el mecanismo normal para que **cualquier** usuario autenticado (incluido `SUPERADMIN` y `ADMIN`) cambie **su propia** contraseña.

**Responsabilidad de D1B**

- `/admin/admins` solo `SUPERADMIN`.
- CRUD funcional solo sobre `rol = ADMIN`.
- El `SUPERADMIN` no forma parte del CRUD. Si se muestra, es informativo y sin acciones.

**Operaciones sobre `ADMIN`**

- Listar, buscar/filtrar, crear, editar identificador `usuario`, activar, desactivar, restablecer contraseña.
- No: delete físico, edición de rol, datos de persona, invitaciones, forgot-password, auditoría completa.

**Creación**

- `rol = ADMIN`, `activo = true`, `creadoPorId = SUPERADMIN` autenticado.
- Frontend: Usuario, password, confirmación. Sin selector de rol ni checkbox activo.
- Política de contraseña existente.

**Identificador**

- No asumir email. En el modelo puede ser handle o email.
- En UI se llama **Usuario**, no Email.

**Sesiones** (ver sección de seguridad)

- Desactivar (cambio real `true → false`): `activo = false`, `tokenVersion++`, `delete SesionToken`.
- Reactivar (cambio real `false → true`): `activo = true` únicamente. No revive tokens.
- `PATCH /activo` con el **mismo** estado actual: éxito, no-op (no `tokenVersion`, no `SesionToken`).
- Reset password: hash nuevo, `tokenVersion++`, `delete SesionToken`. No pide contraseña actual.
- Cambio de `usuario`: valor nuevo, `tokenVersion++`, `delete SesionToken`.

---

## Diseño propuesto

### Arquitectura

Misma cadena que Productores / D1A:

```text
route → authenticate → authorize(Rol.SUPERADMIN) → validate → controller → adminsService → Prisma
```

El service opera `Usuario` filtrado a `rol = ADMIN`. No crea `Productor`. No llama a `producersService`.

El frontend habla solo con `/api/v1/admins`. El cambio de contraseña **propia** del `SUPERADMIN` permanece en `/admin/mi-perfil` → `PATCH /auth/me/password`.

```text
SUPERADMIN
    │
    ├─ /admin/admins  ── CRUD ADMIN ──►  /api/v1/admins
    │                                      Usuario.rol = ADMIN
    │
    └─ /admin/mi-perfil ── D1A ────────►  /api/v1/auth/me/password
```

### Identificador `usuario`: trim, normalización, unicidad

El campo es el mismo `Usuario.usuario` que usa el login y el alta de productores. Unicidad **global** (todos los roles), no “única entre ADMIN”.

| Paso | Regla D1B |
|------|-----------|
| Trim | Sí, en Zod (`.trim()`). Vacío tras trim → `422`. |
| Espacios internos | Rechazar (`/^\S+$/`) → `422`. Un handle o email no lleva espacios. |
| Case | Persistir **siempre en minúsculas** (`toLowerCase()`), igual que el alta de productores y el bootstrap GCP. Eso evita **nuevas** variantes de casing en flujos MAPS de creación. |
| Formato email | **No** exigir email. `admin` y `ana.perez@maps.com` son válidos. |
| Longitud | Mín. 3, máx. 191 caracteres tras trim. Cubre handles de seed (`admin`) y emails reales. |
| Constraint DB | `Usuario.usuario @unique` es **exacta / case-sensitive**. PostgreSQL **no** garantiza unicidad case-insensitive sobre `text`/`varchar` con `@unique`. `Admin` y `admin` pueden coexistir si alguien insertó el valor sin normalizar. |
| Chequeo preventivo D1B | Antes de crear o de cambiar `usuario`, `findFirst` con `usuario: { equals: normalizado, mode: 'insensitive' }` (Prisma sobre PostgreSQL; el mismo `mode` ya se usa en `news.service.ts`). Si existe otra fila (cualquier rol), **`409`** `El usuario ya está registrado`. En edición, excluir el propio `id`. No requiere cambiar Auth ni el schema. |
| Carrera (valor exacto) | El insert/update del valor **ya normalizado** (minúsculas) puede chocar con otra transacción. `catch` de Prisma `P2002` → mismo `409`. El chequeo insensitive no sustituye a `P2002`. |
| Fuera de D1B | Índice `citext`, collate case-insensitive, o login case-insensitive global. No se tocan. |

**Consistencia con login y Productores**

- Productores ya guardan el identificador en minúsculas. D1B hace lo mismo para no crear un segundo criterio de persistencia.
- Login sigue siendo match **exacto** (no se modifica en D1B). Quien inicia sesión debe tipear el valor persistido. El login frontend ya hace `trim`, no `toLowerCase`.
- El chequeo `mode: 'insensitive'` solo cubre **altas/ediciones D1B** frente a filas históricas con otro casing. No cambia cómo se autentica nadie.
- Mensajes D1B dicen “usuario”, no “email”, para no contradecir handles.

**No-op en edición de `usuario`:** si el valor normalizado es igual al persistido, no se toca `tokenVersion` ni `SesionToken`.

**No-op en `PATCH /activo`:** si el boolean pedido es el ya persistido, `200` con el DTO actual; no se escribe `activo`, no se incrementa `tokenVersion`, no se borran `SesionToken`. El mensaje de respuesta sigue el valor pedido (`desactivado` / `reactivado`).

### Modelo de datos

`N/A`. Sin tablas, columnas ni índices nuevos. `Usuario` + `SesionToken` cubren el flujo. No se indexa `rol` en esta entrega: el cardinal de `ADMIN` es bajo.

`creadoPorId` ya existe. El alta D1B **siempre** lo persiste con el `id` del SUPERADMIN autenticado. El seed `admin` puede seguir con `creadoPorId = null`. El campo **no** viaja en el DTO: los tests lo leen en la fila Prisma.

### Contratos de API

Base: `/api/v1/admins`.

**No se implementa `GET /admins/:id`.** El listado trae todos los campos que la UI necesita para editar, activar y resetear. Productores sí tienen `GET /:id` porque el detalle incluye perfil, certificaciones, geo, etc. Aquí no hay ficha rica.

Orden de registro (como en `producers.routes.ts`): rutas estáticas y sufijos (`/activo`, `/password`) **antes** de `PATCH /:id`.

Query de listado: opcional `activo=true|false` (mismo preprocess que `listProducersQuerySchema`). La búsqueda por texto es **client-side** (cardinal bajo; Productores también busca en cliente). No se agrega `q` ni paginación server-side.

Auth en **todos** los endpoints: `authenticate` → `authorize(Rol.SUPERADMIN)` → `validate` → controller.

#### Envelope

Igual al resto de la API:

```json
{ "data": <T | T[] | null>, "message": "<string>", "error": null | <flatten Zod> }
```

Éxito de listado: `message: "OK"`. Mutaciones: mensaje específico (tabla). `422` de `validate`: `message: "Datos de entrada inválidos"` + `error: flatten()`. `AppError`: `error: null` y `message` humano.

#### DTO de respuesta (`AdminDto`)

Solo lo que consume la UI D1B:

```ts
type AdminDto = {
  id: number;                 // Usuario.id
  usuario: string;            // identificador de acceso, ya normalizado
  activo: boolean;
  lastLoginAt: string | null; // ISO
  createdAt: string;          // ISO
};
```

**No devolver:** `rol`, `updatedAt`, `creadoPor` / `creadoPorId`.

**Nunca exponer:** `passwordHash`, `tokenVersion`, hashes de `SesionToken`, `refreshToken`, filas de sesión, `productor`, campos inventados (nombre, apellido, email, teléfono, foto).

`creadoPorId` se guarda en el alta y se verifica **en DB** en los tests (`prisma.usuario.findUnique`), no en el envelope.

`:id` en path = `Usuario.id` (entero), **no** un id de tabla Admin.

#### Endpoints

| Método | Ruta | Params / Query / Body | Auth | Respuesta | Errores |
|--------|------|------------------------|------|-----------|---------|
| `GET` | `/admins` | Query opcional `{ activo?: boolean }` vía `activo=true\|false` | SUPERADMIN | `200 { data: AdminDto[], message: 'OK' }` | `401`, `403`, `422` query inválida |
| `POST` | `/admins` | Body `{ usuario, password, confirmPassword }` | SUPERADMIN | `201 { data: AdminDto, message: 'Administrador creado' }` | `401`, `403`, `422` política/confirmación/usuario inválido, `409` unicidad |
| `PATCH` | `/admins/:id` | Params `{ id }`, body `{ usuario }` | SUPERADMIN | `200 { data: AdminDto, message: 'Administrador actualizado' }` | `401`, `403`, `422`, `404`, `409` |
| `PATCH` | `/admins/:id/activo` | Params `{ id }`, body `{ activo: boolean }` | SUPERADMIN | `200 { data: AdminDto, message: 'Administrador desactivado' \| 'Administrador reactivado' }`. Si `activo` ya coincide con el persistido: mismo `200` y mensaje según el valor pedido; **no-op** de sesiones (ver seguridad). | `401`, `403`, `422`, `404` |
| `PATCH` | `/admins/:id/password` | Params `{ id }`, body `{ newPassword, confirmPassword }` | SUPERADMIN | `200 { data: null, message: 'Contraseña restablecida' }` | `401`, `403`, `422`, `404` |

El body de `POST` **no** acepta `rol`, `activo`, `creadoPorId` (`.strict()`). El service fuerza `rol = ADMIN`, `activo = true`, `creadoPorId` desde `req.user.sub`.

`PATCH /:id` **no** acepta `rol`, `activo` ni password (usan sus rutas).

#### Códigos HTTP — `:id` que no es un ADMIN administrable

| Caso | Status | Mensaje |
|------|--------|---------|
| Anónimo | `401` | `Token de acceso requerido` (middleware actual) |
| Token inválido / sesión revocada / cuenta desactivada | `401` | mensajes actuales de `authenticate` |
| `PRODUCTOR` o `ADMIN` autenticado | `403` | `Acceso denegado` |
| `:id` no entero positivo (`abc`, `0`, negativo, UUID) | `422` | `Datos de entrada inválidos` |
| `Usuario` inexistente | `404` | `Administrador no encontrado` |
| `Usuario` existe con `rol = PRODUCTOR` | `404` | `Administrador no encontrado` |
| `Usuario` existe con `rol = SUPERADMIN` | `404` | `Administrador no encontrado` |
| `usuario` duplicado | `409` | `El usuario ya está registrado` |
| Password débil / confirmación distinta / body extra | `422` | `Datos de entrada inválidos` |

**Por qué 404 y no 403** para PRODUCTOR/SUPERADMIN: el recurso de esta colección es “administrador” (`Usuario` con `rol = ADMIN`). Si el id no pertenece a esa colección, no existe **en este dominio**. `403` ya significa “el caller no es SUPERADMIN”. Mezclar “caller prohibido” con “target no operables” confunde tests y clientes. No se revela el rol del target en el mensaje.

Helper interno del service: `requireAdminUser(id)` → carga por id; si `null` o `rol !== ADMIN` → `AppError(404, 'Administrador no encontrado')`. Todas las mutaciones por `:id` pasan por ahí.

`setActivo`: si `current.activo === body.activo`, devolver el `AdminDto` actual **sin** `update` ni `deleteMany`. Solo si el valor cambia se aplica la tabla de sesiones.

Chequeo de `usuario` (create y update, distinto del valor persistido):

```ts
await prisma.usuario.findFirst({
  where: {
    usuario: { equals: usuarioNorm, mode: 'insensitive' },
    ...(excludeId ? { id: { not: excludeId } } : {}),
  },
  select: { id: true },
});
```

Si hay fila → `409`. El `create`/`update` posterior va envuelto en `try/catch` de `P2002`.

### Validaciones (`admin.schema.ts`)

Reemplazar `adminIdSchema` UUID por:

```ts
export const adminIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
```

Mismo shape que `producerIdParamSchema`. Se **duplica** en el módulo admins (nombre de dominio propio). No se importa desde `producer.schema.ts`.

Otros schemas (todos `.strict()` donde hay objeto de body):

- `listAdminsQuerySchema` — mismo preprocess `activo=true|false` que productores, transform a `{ activo?: boolean }`.
- `usuarioIdentSchema` — `z.string().trim().min(3).max(191).regex(/^\S+$/)`, luego normalización a minúsculas en el schema (`.transform((s) => s.toLowerCase())`) para que controller/service reciban el valor canónico.
- `createAdminSchema` — `{ usuario: usuarioIdentSchema, password: passwordSchema, confirmPassword: z.string().min(1) }` + `refine` coincidencia (`La confirmación no coincide`, path `confirmPassword`). Importar `passwordSchema` de `lib/passwordPolicy.ts`.
- `updateAdminSchema` — `{ usuario: usuarioIdentSchema }`.
- `updateAdminStatusSchema` — `{ activo: z.boolean() }`.
- `resetAdminPasswordSchema` — igual a `resetProducerPasswordSchema` en reglas, **definido en este archivo** (no importar el de productores). Reusa `passwordSchema`.

No reusar `passwordChangeLimiter` en reset D1B: el limiter de D1A es self-service (clave = caller). El reset de productores tampoco lo usa.

### Modelo de seguridad / sesiones

Secuencia canónica (una transacción Prisma), copiada del patrón D1A / reset de productores / desactivar:

| Evento | `activo` | `passwordHash` | `tokenVersion` | `SesionToken` |
|--------|----------|----------------|----------------|---------------|
| Alta | `true` | bcrypt 12 | `0` (default) | ninguna |
| Desactivar (`true → false`) | `false` | — | `increment` | `deleteMany` |
| Reactivar (`false → true`) | `true` | — | no se toca | no se toca (las viejas ya no existen) |
| `PATCH /activo` no-op (mismo valor) | sin write | — | **no** | **no** |
| Reset password | — | nuevo hash | `increment` | `deleteMany` |
| Cambio `usuario` (valor distinto) | — | — | `increment` | `deleteMany` |
| Cambio `usuario` (mismo valor normalizado) | — | — | no | no |

Efecto: access anteriores fallan en `authenticate` (`La sesión fue revocada` / cuenta desactivada). Refresh anteriores: `Sesión no encontrada o revocada`. El afectado debe `POST /auth/login` de nuevo (con el `usuario` nuevo si cambió).

Reactivar **no** restaura sesiones. El `ADMIN` inicia sesión otra vez; si sigue desactivado, login responde `403 Cuenta desactivada` (comportamiento actual de Auth).

Reset **no** pide contraseña actual (recuperación administrativa). Usa la política compartida. No limpia la cookie `maps_refresh` del **caller** (`SUPERADMIN`): esa cookie es de otra cuenta. El controller de D1A sí limpia cookie porque el caller es el afectado. D1B no debe copiar ese clear.

**No extraer helper genérico en D1B.** El bloque transaccional son 4–6 líneas. Extraerlo implicaría tocar `auth.service.ts` y `producers.service.ts` en esta misma rama (radio de regresión). D1B replica el patrón localmente en `adminsService`. Una extracción `revokeUsuarioSessions` queda como mejora posterior, no como requisito de esta entrega.

Coste bcrypt: **12**, igual que Auth, Productores y bootstrap. Sin constante nueva de env.

### Frontend / UX

**Ruta:** `/admin/admins` (ya guardada). Una sola pantalla. No `/admin/admins/inactivos`.

**SUPERADMIN en la UI — opción B (recomendada)**

- **A.** No mostrarlo en el listado de ADMIN. El listado API ya no lo incluye.
- **B.** Sección informativa **separada** del listado, encima de la tabla:

  ```text
  Cuenta principal
  <usuario de la sesión>
  Superadministrador
  Activo
  ```

  Sin menú, sin editar, sin reset, sin desactivar.

**Elección: B.** Justificación UX (sin cambiar reglas de negocio):

- El listado vacío o solo con `admin` de seed no debe parecer un bug (“¿dónde estoy?”).
- Separar visualmente “cuenta principal” vs “administradores operables” enseña el modelo mental: el SUPERADMIN no se gestiona acá.
- Los datos salen del **auth store** (`usuario`, `rol`). `Activo` se infiere (si está en la pantalla, su cuenta está activa). No hay `GET` extra ni se mezcla SUPERADMIN en `GET /admins`.
- Si operativamente existiera más de un SUPERADMIN, los otros **no** aparecen (no son CRUD). El card muestra solo la sesión actual. Aceptable: D1B no lista SUPERADMIN.

**Layout (coherente con Productores, no acoplado)**

1. Header de página: título “Administradores”.
2. Card informativo SUPERADMIN (opción B).
3. Toast de éxito (mismo patrón visual que `ProducersDashboard`).
4. Banner de error de carga + **Reintentar**.
5. Toolbar: título “Listado de administradores”; búsqueda por usuario; control de estado **Todos / Activos / Inactivos** (segmented o select simple, **sin** modal de filtros de Productores: no hay sucursal ni rango de fechas); botón “Nuevo administrador”.
6. Loading: bloque “Cargando administradores…”.
7. Tabla desktop / cards mobile / empty.
8. `TablePagination` client-side (mismos page sizes 8/16/32).

Búsqueda: `usuario` contains, case-insensitive en cliente, sobre el array ya traído. Cambiar búsqueda o filtro de estado resetea a página 1.

Filtro de estado: preferible **en cliente** sobre `GET /admins` sin query (un fetch, Todos/Activos/Inactivos instantáneo). El query `?activo=` existe en API para tests y por si más adelante se quiere fetchear recortado; el FE de D1B no depende de dos requests como Productores activos/inactivos.

**Tabla — solo datos reales**

| Columna | Campo |
|---------|--------|
| Usuario | `usuario` |
| Estado | `activo` → badge Activo / Inactivo (componente propio, no `ProducerStatusBadge`) |
| Último acceso | `lastLoginAt` vía `relativeTimeFromNow`; si `null`, “Nunca” |
| Creado | `createdAt` |
| Acciones | menú |

No: nombre, apellido, email, avatar, DNI, `rol`, `updatedAt`, `creadoPor` (no van en el DTO; `creadoPorId` solo en DB).

Mobile: card con `usuario` como título, badge de estado, último acceso, menú. Sin `Avatar` (no hay foto).

Empty:

- Sin filas y sin filtros: “Todavía no hay administradores. Podés crear el primero desde “Nuevo administrador”.”
- Con búsqueda/filtro: “No encontramos administradores con esos criterios.”

**Acciones del menú** (componente propio `AdminActionsMenu`): Editar usuario, Restablecer contraseña, Desactivar/Reactivar. No “Ver perfil” (no hay ficha). No eliminar.

**Modales propios** (reúsan `Modal` + `PasswordField`; **no** `ProducerFormModal` / `DeactivateConfirmModal` / `ProducerResetPasswordModal`):

- `AdminFormModal` — alta y edición. Alta: Usuario, Contraseña, Confirmar contraseña. Edición: solo Usuario (más el aviso de sesiones). Sin rol, sin activo.
- `AdminStatusConfirmModal` — desactivar / reactivar.
- `AdminResetPasswordModal` — nueva + confirmar; política en vivo como el reset de productores.

Busy: locks en submit (mismo espíritu que `submitLockRef` / `toggleLockRef` de Productores). Botones deshabilitados con “Procesando…”.

Toasts:

- Alta: `Administrador creado`
- Edición: `Usuario actualizado`
- Desactivar: `Administrador desactivado`
- Reactivar: `Administrador reactivado`
- Reset: `Contraseña restablecida`

Errores de modal: `getApiErrorMessage(err)` inline.

**Copy de confirmaciones** (dominio Administradores, misma gravedad que Productores):

Desactivar:

> ¿Seguro querés desactivar a **{usuario}**? Pierde el acceso a la aplicación y se cierran sus sesiones activas.

Reactivar:

> ¿Seguro querés reactivar a **{usuario}**? Vuelve a poder iniciar sesión. Las sesiones antiguas no se recuperan: tiene que entrar de nuevo.

Reset:

> Vas a restablecer la contraseña de **{usuario}**. La contraseña anterior deja de funcionar y se cierran sus sesiones activas.

Cambio de usuario (aviso en el form de edición, visible al cambiar el valor):

> Cambiar el usuario cambia el identificador de acceso. Se cierran las sesiones activas de esta cuenta; tendrá que iniciar sesión de nuevo con el usuario nuevo.

Alta: no pide confirmación extra (no hay identidad previa que invalidar).

Validación de password en cliente: `passwordPolicyError`. No reemplaza al backend.

Reutilizar primitivas: `Modal`, `PasswordField`, `TablePagination`, `getApiErrorMessage`, `passwordPolicyError`, `relativeTimeFromNow`, tokens `maps-*`. `SearchPillInput` no tiene tipos de Productor; se puede reusar para la búsqueda (el botón menú puede abrir el mismo control de estado o ignorarse si el filtro de estado está al lado). **No** reusar `ProducersToolbar`, `ProducerTable`, `ProducerActionsMenu`, ni el dashboard de productores.

**Componentes previstos (nombres conceptuales)**

| Pieza | Rol |
|-------|-----|
| `AdminsPage` | Página; monta el dashboard |
| `AdminsDashboard` | Orquestador (fetch, filtros, modales, toast) |
| `AdminsToolbar` | Título, búsqueda, filtro estado, alta |
| `AdminTable` | Desktop + cards mobile + empty |
| `AdminActionsMenu` | Acciones de fila |
| `AdminFormModal` | Alta / edición de usuario |
| `AdminStatusConfirmModal` | Desactivar / reactivar |
| `AdminResetPasswordModal` | Reset password |
| `AdminStatusBadge` | Activo / Inactivo |
| `SuperadminAccountCard` | Bloque informativo opción B |
| `useAdminAdmins` | Fetch + mutaciones |
| `admins.service.ts` (FE) | Cliente HTTP |
| tipos `admin.ts` | `AdminDto` mapeado a UI |

Ids en frontend: **number** (`Usuario.id`). No repetir el `id: string` + `parseInt` de Productores salvo que un componente shared lo exija.

### Componentes / archivos afectados

| Pieza | Ubicación | Rol |
|-------|-----------|-----|
| Rutas | `backend/src/api/v1/routes/admins.routes.ts` | Modificado — 5 endpoints, cadena SUPERADMIN |
| Controller | `backend/src/controllers/admins.controller.ts` | Modificado — handlers delgados, quitar `501` |
| Service | `backend/src/services/admins.service.ts` | Modificado — list/create/update/setActivo/resetPassword |
| Schemas | `backend/src/validations/admin.schema.ts` | Modificado — reemplazar UUID; schemas de body/query |
| Tests | `backend/tests/admins.integration.test.ts` | Nuevo |
| Página | `frontend/src/modules/admin/pages/AdminsPage.tsx` | Modificado — deja de ser placeholder |
| Dashboard + UI dominio | `frontend/src/modules/admin/components/Admin*.tsx` | Nuevos |
| Hook / service / types | `frontend/src/modules/admin/hooks/useAdminAdmins.ts`, `services/admins.service.ts`, `types/admin.ts` | Nuevos |
| Docs vivos + worklog | `docs/modules/admins.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, `docs/worklog/D1B-gestion-administradores.md` | Al cierre de **esta misma rama**, mismo PR que el código. Este TDD no se mergea aparte. |

Router, sidebar y `RoleGuard` **no requieren cambio** de permisos. `passwordPolicy.ts` (BE/FE), `authenticate`, `authorize`, `validate`, `errorHandler`, Auth D1A: sin cambios funcionales.

### Cambios en código existente

- El placeholder `501` desaparece: clientes que peguen al stub pasarán a `401` sin token o a contratos reales. No hay consumidores externos.
- `adminIdSchema` UUID deja de existir (rompía cualquier intento de `validate` contra ids reales).
- Seed `admin` (`rol = ADMIN`) **aparecerá** en el listado (es administrable). Seed `superadmin` no.

---

## Decisiones técnicas tomadas

- Identificador D1B, no `MAPS-016` ni un `MAPS-020` inventado.
- `:id` = `Usuario.id` entero; `adminIdParamSchema` con `z.coerce.number().int().positive()`.
- Sin `GET /admins/:id`.
- Listado: array completo + filtro query opcional `activo`; búsqueda y paginación en cliente.
- `usuario`: trim, sin espacios internos, minúsculas, min 3 / max 191, no-email-required. Chequeo preventivo Prisma `equals` + `mode: 'insensitive'` → `409`. `P2002` cubre la carrera del valor exacto ya normalizado. `@unique` sigue siendo case-sensitive; no se afirma unicidad CI en PostgreSQL. Política CI global de Auth/DB fuera de D1B.
- Login no se modifica.
- Target no-ADMIN → `404 Administrador no encontrado` (mismo mensaje que id inexistente).
- `POST` incluye `confirmPassword` en API (la UI siempre la pide; el alta de productores solo manda `password` por historia MAPS-016; D1B no tiene esa deuda).
- Reset y cambio de `usuario` (valor distinto) revocan sesiones; reactivar no revive tokens.
- `PATCH /activo` es idempotente: mismo estado → `200` sin tocar `tokenVersion` ni `SesionToken`.
- Cambio de `usuario` con el mismo valor normalizado no revoca.
- No usar `passwordChangeLimiter` en D1B.
- No extraer helper de revocación/hash en este bloque.
- No copiar `producersService` ni schemas de productores; sí reusar `passwordSchema` y el patrón transaccional.
- UI opción **B** con datos de sesión, no con el listado API.
- Componentes de dominio Administradores nuevos; primitivas shared reutilizadas.
- Ids FE numéricos.
- `AdminDto` mínimo: `id`, `usuario`, `activo`, `lastLoginAt`, `createdAt`. Sin `rol`, `updatedAt` ni `creadoPor`.
- `creadoPorId` obligatorio en el alta; se aserta en DB, no en el DTO.
- Tests FE no se agregan como suite huérfana; D5 no se resuelve.
- bcrypt coste 12.
- Todo D1B (TDD, código, docs vivos, worklog) vive en `feat/d1b-admin-management` y cierra en **un** PR.

---

## Alternativas consideradas

### Alternativa A — Mostrar SUPERADMIN como fila del listado sin acciones

- **Qué era:** un registro más, badge “Superadministrador”, menú oculto.
- **Pros:** una sola tabla.
- **Contras:** mezcla la colección ADMIN con alguien que el API no devuelve (habría que contaminar `GET /admins` o fetchear por otro lado); fácil habilitar acciones por error de implementación.
- **Por qué se descartó:** rompe el límite de colección y el modelo mental. La opción B separa “cuenta principal” de “administrables”.

### Alternativa B — `GET /admins/:id`

- **Qué era:** detalle simétrico a productores.
- **Pros:** simetría REST.
- **Contras:** la UI no tiene ficha; todos los campos caben en el listado; más superficie de authz que testear.
- **Por qué se descartó:** el pedido es contrato mínimo. No agregar endpoints por simetría.

### Alternativa C — Extraer `revokeUsuarioSessions` + `hashPassword` ahora

- **Qué era:** helper en `backend/src/lib/` usado por Auth, Productores y Admins.
- **Pros:** un solo lugar para el invariante de seguridad.
- **Contras:** toca D1A y MAPS-016 en esta misma rama; no es necesario para que D1B sea correcto.
- **Por qué se descartó:** se documenta como mejora posterior.

### Alternativa D — Constraint DB de un solo SUPERADMIN

- **Qué era:** índice único parcial o trigger.
- **Pros:** refuerza la operación “un SUPERADMIN”.
- **Contras:** negocio pidió no imponerla; el bootstrap GCP ya puede existir en staging.
- **Por qué se descartó:** decisión de negocio cerrada.

### Alternativa E — Página `/admin/admins/inactivos`

- **Qué era:** copiar Productores.
- **Pros:** simetría de navegación.
- **Contras:** el cardinal de ADMIN no justifica dos rutas; el pedido pide una sola pantalla con filtro Todos/Activos/Inactivos.
- **Por qué se descartó:** alcance explícito.

---

## Estrategia de tests

### Backend — `backend/tests/admins.integration.test.ts`

Runner: Vitest + Supertest, `createApp()`, Postgres real (`docs/TESTING.md`). El runner backend **funciona**; esta suite se suma a `npm test`.

Reutilizar el estilo de `producers.integration.test.ts` y `auth.integration.test.ts`:

- `loginUsuarioPassword` local (o el mismo patrón inline) con seed `superadmin` / `admin` / un `PRODUCTOR` creado vía API de productores.
- `createTempUser` / cleanup `try/finally` como D1A para no dejar basura: borrar `SesionToken` + `Usuario` (sin `Productor` en altas D1B).
- Password de test alineada a la política (`Temporal123`).
- `uniqueUsuario(prefix)` para handles/emails únicos.

Cobertura mínima:

| Caso | Esperado |
|------|----------|
| `GET /admins` anónimo | `401` |
| `GET /admins` con PRODUCTOR | `403` |
| `GET /admins` con ADMIN | `403` |
| `GET /admins` con SUPERADMIN | `200` |
| Listado: solo `rol = ADMIN` | ningún `usuario` de SUPERADMIN ni PRODUCTOR conocidos; `rol` no viaja en el DTO |
| Seed `superadmin` no aparece como administrable | `data` no contiene ese `usuario` |
| `GET ?activo=true` / `false` | filtra `Usuario.activo` |
| `POST` crea `Usuario` sin `Productor` | `prisma.productor.findUnique({ usuarioId })` → `null` |
| `POST` siempre `rol = ADMIN`, `activo = true` | `activo` en DTO; `rol` en fila Prisma |
| `POST` setea `creadoPorId` al SUPERADMIN caller | **DB:** `prisma.usuario.findUnique` → `creadoPorId` = `sub` del caller. El DTO no incluye el campo |
| `POST` password débil | `422` |
| `POST` confirmación distinta | `422` |
| `POST` `usuario` duplicado exacto (otro ADMIN, un PRODUCTOR, o SUPERADMIN) | `409` |
| `POST` `usuario` que solo difiere en casing de una fila histórica | `409` (chequeo `mode: 'insensitive'`). Sembrar con Prisma un `Usuario` tipo `D1bHistAdmin` y postear `d1bhistadmin` |
| Body con `rol` o `activo` | `422` (strict) |
| `:id` no numérico (`abc`) | `422` |
| `:id` inexistente | `404` |
| `:id` de PRODUCTOR en PATCH activo/password/usuario | `404` |
| `:id` de SUPERADMIN en esos PATCH | `404` |
| Edición de `usuario` | persiste minúsculas/trim; DTO actualizado |
| Edición de `usuario` revoca sesiones | refresh `401`; access viejo `401`; login con usuario **nuevo** + password actual `200`; login con usuario viejo `401` |
| Desactivar (`true → false`) revoca sesiones | igual patrón; login → `403 Cuenta desactivada` |
| `PATCH /activo` con el mismo estado | `200`; `tokenVersion` igual; refresh/access previos siguen válidos |
| Reactivar no revive tokens | refresh viejo sigue `401`; login nuevo `200` |
| Reset revoca sesiones | access/refresh viejos `401`; password anterior no loguea |
| Nueva contraseña permite login | `200` |
| Respuestas no exponen `passwordHash`, `tokenVersion`, `rol`, `updatedAt`, `creadoPor` | `JSON.stringify(body)` / shape del DTO |

No hace falta testear el placeholder `501`.

Helpers de test: no extraer un paquete nuevo; copiar las 15 líneas de login/cleanup. Si al implementar coincide textual con D1A, dejarlas locales al archivo (las suites actuales no comparten un `tests/helpers/` y D1B no introduce esa infra).

### Frontend

No hay runner. D1B **no** agrega `vitest` ni cablea CI. No se crean `*.test.tsx` huérfanos salvo que en implementación aporte documentación; el default es **no**. QA de UI = typecheck/lint/build + checklist manual (abajo).

---

## Plan de implementación

Todo D1B vive en `feat/d1b-admin-management` y cierra en **un solo PR**. Las fases son orden de trabajo en esa rama, no PRs separados. El TDD ya está en la rama; no se mergea antes que el código.

### Fase 1 — Backend
- [x] Reemplazar `adminIdSchema` UUID; agregar schemas de query/body
- [x] `adminsService`: list, create, updateUsuario, setActivo (idempotente), resetPassword, `requireAdminUser`, chequeo `usuario` insensitive + `P2002`
- [x] Controller + rutas con `authenticate` → `authorize(Rol.SUPERADMIN)` → `validate`
- [x] `admins.integration.test.ts` (cobertura de la tabla anterior)
- [x] `npm test` en backend

### Fase 2 — Frontend
- [x] Service HTTP + tipos + hook
- [x] `AdminsDashboard` y componentes de dominio
- [x] Reemplazar placeholder de `AdminsPage`
- [x] `npm run typecheck && npm run lint && npm run build` en frontend
- [x] QA manual del checklist

### Fase 3 — Docs vivos y worklog (cierre de la misma rama)
- [x] `docs/modules/admins.md` — quitar pendientes que D1B resuelve
- [x] `docs/ARCHITECTURE.md` / README módulo Admins
- [x] `docs/CHANGELOG.md`
- [x] Worklog `docs/worklog/D1B-gestion-administradores.md`
- [x] Este TDD → estado **Implementado** con link al worklog, en el mismo PR

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| SUPERADMIN desactiva o resetea al ADMIN seed `admin` en un entorno compartido | Media | Medio | UX de confirmación; no hay delete; reactivar/reset existen |
| Colisión de `usuario` (exacta o casing histórico) | Media | Bajo | Chequeo insensitive + `P2002`; tests de ambos casos |
| Copiar componentes de Productor acopla dominios | Media | Medio | Lista blanca de primitivas shared; componentes `Admin*` nuevos |
| Extraer helpers de sesión “de paso” rompe D1A | Baja | Alto | Prohibido en este TDD |
| Login case-sensitive vs persistencia lowercased | Baja | Bajo | Ya ocurre en productores; documentado como deuda Auth |
| Tests de integración ensucian la DB de desarrollo | Media | Bajo | `try/finally` delete; usuarios con prefijo `d1b-` |

---

## Plan de rollout / QA

- Feature flag: no.
- Migraciones: no.
- Variables de entorno nuevas: no.
- Deploy: backend y frontend juntos. El FE actual no llama a `/admins`; un backend adelantado solo expone API muerta. Un FE adelantado sin backend rompería la pantalla nueva — no separar.
- Rollback: revertir el PR. Sin migración que deshacer.
- Comunicación: el SUPERADMIN gana una pantalla operativa; los ADMIN no ven el ítem (ya era así).

### Checklist QA manual

1. Login `PRODUCTOR` / `ADMIN`: no ven “Administradores”; `/admin/admins` → unauthorized.
2. Login `SUPERADMIN`: ven el ítem, card “Cuenta principal” con su usuario, **sin** acciones sobre sí mismos.
3. Listado muestra seed `admin` (ADMIN) y **no** muestra `superadmin` como fila operable.
4. Crear ADMIN (handle y, en otra prueba, email): sin selector de rol; queda activo; puede loguearse; no existe `Productor`.
5. Crear con `usuario` de un productor existente → error 409 visible.
6. Editar usuario: aviso de sesiones; tras confirmar, el ADMIN no refresca; entra con el usuario nuevo.
7. Desactivar: pierde acceso; sesiones caen; filtro Inactivos lo muestra. Repetir desactivar sobre uno ya inactivo: éxito, la sesión del SUPERADMIN no se ve afectada; el ADMIN inactivo sigue sin entrar.
8. Reactivar: no entra con el refresh viejo; sí con login nuevo.
9. Reset: contraseña anterior falla; sesiones caen; la nueva funciona.
10. `/admin/mi-perfil` (D1A) sigue cambiando la contraseña **propia** del SUPERADMIN.
11. Viewport desktop (tabla) y mobile (cards).
12. Loading, empty, error + Reintentar (parar backend o forzar 500).

---

## Métricas de éxito / criterios de aceptación

- Los cinco endpoints existen, todos con `authenticate` + `authorize(SUPERADMIN)` + `validate`.
- Anónimo `401`; PRODUCTOR `403`; ADMIN `403`; SUPERADMIN permitido.
- `GET /admins` no incluye `SUPERADMIN` ni `PRODUCTOR`.
- Alta: `rol=ADMIN` y `creadoPorId` del caller **en DB**; `activo=true` en DTO y fila; sin fila `Productor`. El DTO no incluye `rol` ni `creadoPor`.
- Unicidad: colisión exacta y colisión solo-casing histórica → `409`. `P2002` sigue cubriendo la carrera del valor normalizado.
- Id no numérico → `422`; inexistente o no-ADMIN → `404`.
- Desactivar real, reset y cambio de `usuario` invalidan access (`tokenVersion`) y refresh (`SesionToken`).
- `PATCH /activo` con el mismo estado: `200` sin cambiar `tokenVersion` ni borrar sesiones.
- Reactivar no restaura tokens viejos.
- Cero apariciones de `passwordHash`, `tokenVersion`, `rol`, `updatedAt`, `creadoPor` en bodies de `/admins`.
- `/admin/admins` deja de ser placeholder; SUPERADMIN informa su cuenta aparte, sin acciones.
- `npm test` backend verde con `admins.integration.test.ts`.
- Sin migración Prisma, sin dependencias nuevas, sin runner FE.
- Un solo PR desde `feat/d1b-admin-management` (código + docs vivos + worklog).

---

## Preguntas abiertas

Ninguna bloqueante para implementar. Las decisiones de negocio vinieron cerradas; las técnicas de este TDD (404 de target, opción B, sin `GET /:id`, DTO mínimo, `PATCH /activo` idempotente, chequeo Prisma insensitive + `P2002`, no extraer helper, un PR en esta rama) están tomadas.

Deuda explícita **fuera de D1B** (no es duda de este diseño):

- Login exact-match vs identificadores persistidos en minúsculas (Auth). Una política case-insensitive global de Auth/DB no forma parte de D1B.
- Edición de email de productor todavía no revoca sesiones (Productores; D1B no lo unifica).
- Extracción futura de `revokeUsuarioSessions`.
- Break-glass SUPERADMIN en GCP.

---

## Notas de implementación (respecto a este diseño)

El contrato API, RBAC, DTO y reglas de sesión se implementaron como está escrito arriba. Diferencias concretas de UI, no de negocio:

- La búsqueda no reutiliza `SearchPillInput` (el botón hamburguesa de filtros no encajaba junto al segmented Todos/Activos/Inactivos). El input es un pill con icono, mismo lenguaje que Biblioteca Digital.
- El toast de éxito no es el banner inline de Productores. Se reutilizó `MapsFeedbackToast` (ya usado en Noticias): flotante, `CheckCircle2`, entrada/salida suaves, 3200 ms, timer cancelable al encadenar éxitos.
- Tras create/edit/reset (y cambio de estado si la fila sigue visible) hay un highlight breve (~1 s) en la fila desktop y la card mobile.
- `createdAt` se muestra como fecha corta `es-AR` (día + mes corto + año).

---

## Referencias

- **Figma:** N/A
- **Tickets / bloque:** D1B (`feat/d1b-admin-management`)
- **TDD de estilo:** `docs/tdd/MAPS-016-tdd-credenciales-productores.md`, `docs/tdd/MAPS-009-tdd-admin-api-productores.md`, plantilla `docs/tdd/_TEMPLATE-tdd.md`
- **Worklog previo:** `docs/worklog/D1A-cambio-self-password.md`
- **Módulo vivo:** `docs/modules/admins.md`, `docs/modules/auth.md`
- **Código de referencia:** `producers.routes.ts`, `producers.service.ts` (`create` / `setActivo` / `resetPassword`), `auth.service.ts` (`changeMyPassword`, `login`), `authenticate.ts`, `admin.schema.ts` (UUID a reemplazar), `AdminsPage.tsx`, `ProducersDashboard.tsx`, `bootstrapAdmin.ts`
- **Work-log de implementación:** [`docs/worklog/D1B-gestion-administradores.md`](../worklog/D1B-gestion-administradores.md)
