# MAPS-016 — TDD: Credenciales administradas por admin para productores

Documento de diseño técnico para credenciales de acceso administradas por admin dentro del proyecto MAPS Asesores.

**Estado:** Aprobado
**Autor:** Lucas
**Revisores:** @lucaslegor
**Creado:** 2026-07-09
**Última actualización:** 2026-07-09

---

## Resumen

Hoy, al dar de alta un productor desde `/admin/productores`, el backend le asigna a **todos** los productores nuevos la misma contraseña fija (`env.DEFAULT_PRODUCER_PASSWORD`). Este TDD propone que el administrador defina una contraseña inicial individual por productor en el alta, que el productor pueda cambiarla desde su perfil privado una vez autenticado, y que el administrador pueda restablecerla manualmente si el productor pierde el acceso. No se agrega recuperación pública/autónoma de contraseña. No requiere migración de esquema: `Usuario.passwordHash` y `Usuario.rol` ya existen y el login ya usa `Usuario.usuario` (email) como identificador.

---

## Objetivo

- El admin define la contraseña inicial de cada productor en el alta (no una contraseña global compartida).
- El productor cambia su propia contraseña desde `/intranet/mi-perfil`, autenticado y validando la contraseña actual.
- El admin puede restablecer la contraseña de un productor desde `/admin/productores` sin conocer la contraseña anterior.
- La tabla admin de productores muestra el email/usuario de acceso y deja de mostrar DNI (no se completa en el flujo actual).
- Ningún endpoint devuelve `passwordHash` ni acepta/expone contraseñas en texto plano fuera del body de la request correspondiente.

---

## Contexto

### Situación actual

- `Usuario` (`backend/prisma/schema.prisma:35`) ya modela login + password: `usuario` (único, es el email), `passwordHash`, `rol` (`SUPERADMIN | ADMIN | PRODUCTOR`), `activo`.
- `Productor` (`backend/prisma/schema.prisma:68`) tiene `usuarioId` único 1:1 con `Usuario`. No hay campo `email` propio en `Productor`; el email vive en `Usuario.usuario`.
- Alta admin: `producersService.create()` (`backend/src/services/producers.service.ts:245-333`) valida unicidad de `email`, y hashea **siempre la misma constante** `env.DEFAULT_PRODUCER_PASSWORD` con `bcrypt.hash(..., 12)` (línea 265). El body no acepta `password`.
- `createProducerSchema` (`backend/src/validations/producer.schema.ts:85-92`) no tiene campo `password`.
- Login (`backend/src/services/auth.service.ts:22-91`) ya es genérico por `Usuario.usuario` + `bcrypt.compare` — no hace falta tocarlo para que las nuevas credenciales funcionen.
- No existe ningún endpoint de cambio ni de reseteo de contraseña, ni en `auth.routes.ts` ni en `producers.routes.ts`.
- No existe endpoint de recuperación pública ("forgot password") — no hay nada que remover ni bloquear.
- Rutas de productor ya están separadas por rol vía middlewares `authenticate` + `authorize(...)` (`backend/src/api/v1/routes/producers.routes.ts:45-47`): `adminOnly` (`ADMIN`, `SUPERADMIN`) y `productorOnly` (`PRODUCTOR`). El patrón para nuevos endpoints ya está establecido.
- `toAdminProducerDto` (`backend/src/lib/producerProfileMapper.ts:143-179`) ya expone `usuario: { id, usuario, activo, rol, createdAt, updatedAt, lastLoginAt }` sin `passwordHash` (el `select` de Prisma en `usuarioListSelect`, línea 24-38, lo excluye a nivel de query). No requiere cambios.
- `toPublicProducerProfileDto` (mapper, línea 90-94) ya excluye `id` y `email` del perfil público por slug. No requiere cambios.
- Frontend admin: `ProducerFormModal.tsx` no tiene campos de contraseña. `ProducerTable.tsx` (`COLUMNS`, línea 17) muestra `Nombre / Estado / DNI / Últ. act. cuenta / Acciones`, sin columna de email — aunque `Producer.email` ya existe en el tipo (`frontend/src/modules/admin/types/producer.ts:21`) y `useProducerFilters.ts` (línea 68) ya busca por email.
- `ProducerActionsMenu.tsx` ya tiene un patrón de menú contextual (`Ver perfil / Editar / Desactivar`) donde encaja una nueva acción "Restablecer contraseña".
- Frontend intranet: `ProducerProfileViewPage.tsx` + `ProducerProfileForm.tsx` no tienen ninguna sección de cambio de contraseña.
- El campo `dni` de `Productor` existe en el schema y se muestra en `ProducerViewModal.tsx`, pero **no se recolecta en el alta** (`createProducerSchema` no lo incluye) — siempre queda `null` salvo que se cargue por otra vía no visible en el código actual.
- No existe ninguna política de fortaleza de password reutilizable; el único precedente es `DEFAULT_PRODUCER_PASSWORD: z.string().min(12)` (`backend/src/config/env.ts:32`) y la contraseña seed de admin `Admin1234!` (mayúscula + minúscula + número + símbolo, 10 caracteres).

### Por qué ahora

`docs/modules/producers.md` (línea 256) y `docs/modules/auth.md` (línea 166) ya listan como pendiente conocido el "flujo de invitación o cambio obligatorio de password inicial" / "primer login". La contraseña compartida (`DEFAULT_PRODUCER_PASSWORD`) es un riesgo de seguridad real: cualquier productor activo conoce la contraseña de acceso de cualquier otro productor recién dado de alta hasta que decida cambiarla (hoy no puede, porque tampoco existe esa función).

---

## Alcance

- Alta admin: agregar campo `password` (requerido) al body de `POST /producers`, con validación de fortaleza mínima.
- Endpoint `PATCH /producers/me/password` — productor autenticado cambia su propia contraseña (requiere `currentPassword`).
- Endpoint `PATCH /producers/:id/password` — admin restablece la contraseña de un productor (no requiere `currentPassword`).
- Revocar sesiones activas (`SesionToken`) del usuario afectado al cambiar/restablecer contraseña, para que la contraseña anterior deje de servir de inmediato (mismo patrón ya usado en `setActivo(false)`, `producers.service.ts:410-422`).
- Frontend admin: campo de contraseña inicial en `ProducerFormModal` (solo modo `create`), columna "Usuario" en `ProducerTable`, acción "Restablecer contraseña" en `ProducerActionsMenu` + modal nuevo.
- Frontend intranet: sección "Cambiar contraseña" en el perfil privado del productor.
- Actualizar `docs/modules/producers.md` y `docs/modules/auth.md` (quitar los pendientes que este TDD resuelve).
- Tests backend (integración) y frontend (componentes/hooks) para los tres flujos.

### Fuera de alcance

- Recuperación pública/autónoma de contraseña ("olvidé mi contraseña") — explícitamente no se implementa.
- Gestión de credenciales para `ADMIN`/`SUPERADMIN` (el módulo `admins.*` sigue siendo un stub vacío; no se toca en este TDD).
- Historial/auditoría de cambios de contraseña (log de "quién restableció cuándo") más allá de `Usuario.updatedAt`.
- Notificación por email al productor cuando el admin restablece su contraseña (no hay proveedor de email integrado en el repo).
- Paginación/búsqueda server-side de la tabla de productores (pendiente ya conocido, no relacionado).
- Cambiar el mecanismo de hashing (`bcryptjs`, ya usado en todo el proyecto).

---

## Diseño propuesto

### Resumen

Se reutiliza el modelo `Usuario` existente sin cambios de esquema. El alta admin pasa a exigir `password` en el body en vez de usar una constante compartida. Se agregan dos endpoints de cambio de contraseña con reglas de autorización distintas (self-service vs. admin), ambos delegando en `bcrypt.hash` + revocación de `SesionToken`. En frontend, se extiende el formulario de alta, la tabla y el menú de acciones del admin, y se agrega una sección de cambio de contraseña al perfil del productor.

### Componentes / archivos afectados

| Pieza | Ubicación | Rol |
|-------|-----------|-----|
| `passwordPolicy` (helper) | `backend/src/lib/passwordPolicy.ts` | Nuevo — regex/reglas de fortaleza compartidas por los 3 flujos (alta, self-service, reset admin) |
| `createProducerSchema` | `backend/src/validations/producer.schema.ts` | Modificado — agrega `password` requerido con la regla de `passwordPolicy` |
| `changeMyPasswordSchema` | `backend/src/validations/producerProfile.schema.ts` | Nuevo — `{ currentPassword, newPassword, confirmPassword }` |
| `resetProducerPasswordSchema` | `backend/src/validations/producer.schema.ts` | Nuevo — `{ newPassword, confirmPassword }` |
| `producersService.create` | `backend/src/services/producers.service.ts` | Modificado — hashea `input.password` en vez de `env.DEFAULT_PRODUCER_PASSWORD` |
| `producersService.changeMyPassword` | `backend/src/services/producers.service.ts` | Nuevo — valida `currentPassword`, hashea nueva, revoca sesiones |
| `producersService.resetPassword` | `backend/src/services/producers.service.ts` | Nuevo — hashea nueva sin validar actual, revoca sesiones |
| `producersController.changeMyPassword` / `.resetPassword` | `backend/src/controllers/producers.controller.ts` | Nuevo — handlers delgados, mismo patrón que el resto del controller |
| Rutas `/me/password`, `/:id/password` | `backend/src/api/v1/routes/producers.routes.ts` | Nuevo — agregadas con `productorOnly` / `adminOnly` respectivamente |
| `env.ts` — `DEFAULT_PRODUCER_PASSWORD` | `backend/src/config/env.ts` | Modificado — pasa a `.optional()` (solo lo usa `seed.ts` directamente vía `process.env`, ya no `producersService.create`) |
| `ProducerFormModal` | `frontend/src/modules/admin/components/ProducerFormModal.tsx` | Modificado — agrega campos `password`/`confirmPassword` solo en modo `create` |
| `ProducerResetPasswordModal` | `frontend/src/modules/admin/components/ProducerResetPasswordModal.tsx` | Nuevo — modal de restablecimiento admin |
| `ProducerActionsMenu` | `frontend/src/modules/admin/components/ProducerActionsMenu.tsx` | Modificado — agrega ítem "Restablecer contraseña" |
| `ProducerTable` | `frontend/src/modules/admin/components/ProducerTable.tsx` | Modificado — columna `DNI` → `Usuario`, desktop y mobile |
| `producers.service.ts` (admin) | `frontend/src/modules/admin/services/producers.service.ts` | Modificado — `resetProducerPassword(id, payload)` |
| `adminProducer.ts` (types) | `frontend/src/modules/admin/types/adminProducer.ts` | Modificado — `CreateProducerPayload` agrega `password`; nuevo `ResetProducerPasswordPayload` |
| `mapAdminProducer.ts` | `frontend/src/modules/admin/lib/mapAdminProducer.ts` | Modificado — `producerFormToApiPayload` incluye `password` en alta |
| `useAdminProducers` | `frontend/src/modules/admin/hooks/useAdminProducers.ts` | Modificado — expone `resetPassword(id, payload)` |
| `ChangePasswordForm` | `frontend/src/modules/intranet/components/ChangePasswordForm.tsx` | Nuevo — formulario self-service en el perfil |
| `producerProfile.service.ts` (intranet) | `frontend/src/modules/intranet/services/producerProfile.service.ts` | Modificado — `changeMyPassword(body)` → `PATCH /producers/me/password` |
| `useProducerProfile` | `frontend/src/modules/intranet/hooks/useProducerProfile.ts` | Modificado — expone `changeMyPassword` |
| `ProducerProfileViewPage` | `frontend/src/modules/intranet/pages/ProducerProfileViewPage.tsx` | Modificado — monta `ChangePasswordForm` |

### Modelo de datos

`N/A` — no se agregan tablas ni columnas. `Usuario.passwordHash`, `Usuario.rol`, `Usuario.updatedAt` ya cubren todo lo necesario. `Usuario.updatedAt` se actualiza automáticamente (`@updatedAt`) al hashear la nueva contraseña, sirviendo como registro de "última actualización de cuenta" sin campo nuevo.

### Contratos de API

Base: `/api/v1/producers` (montado en `backend/src/api/v1/routes/producers.routes.ts`).

| Método | Ruta | Body | Auth | Respuesta | Errores |
|--------|------|------|------|-----------|---------|
| `POST` | `/producers` | body actual **+ `password: string`** | `adminOnly` | `201` — igual `AdminProducerDto` que hoy | `400` password débil / campos inválidos, `409` email duplicado |
| `PATCH` | `/producers/me/password` | `{ currentPassword, newPassword, confirmPassword }` | `productorOnly` | `200 { data: null, message: 'Contraseña actualizada' }` | `401` no autenticado / `currentPassword` incorrecta, `400` `newPassword` no cumple política o no coincide con `confirmPassword` |
| `PATCH` | `/producers/:id/password` | `{ newPassword, confirmPassword }` | `adminOnly` | `200 { data: null, message: 'Contraseña restablecida' }` | `403` no admin, `404` productor no encontrado, `400` `newPassword` no cumple política o no coincide con `confirmPassword` |

Notas:
- Ninguna de las tres respuestas incluye `passwordHash` ni ecoa la contraseña enviada (mismo patrón que `authController.login`, que ya excluye `passwordHash` del body de respuesta).
- `PATCH /producers/:id/password` reutiliza `producerIdParamSchema` ya existente para el parámetro `:id`.
- Ambos endpoints de cambio de password revocan `SesionToken` del usuario afectado (mismo mecanismo que `setActivo(id, false)`), forzando que cualquier refresh token emitido antes del cambio deje de funcionar. El access token de 15 minutos en curso (si lo hay) expira solo por tiempo — aceptable dado el TTL corto ya configurado (`JWT_EXPIRES_IN=15m`).

### UI / UX

**Alta de productor (`ProducerFormModal`, modo `create`):**
- Se agregan dos campos nuevos únicamente cuando `mode === 'create'`: "Contraseña inicial" y "Confirmar contraseña" (ambos `type="password"`), debajo del bloque Nombre/Apellido/Email/Teléfono.
- Validación en frontend (no reemplaza al backend): mismos criterios que la política backend + coincidencia de confirmación.
- Tras submit exitoso, el estado del formulario se resetea a `EMPTY_FORM` (ya ocurre al cerrar/reabrir vía el `useEffect` existente) — los campos de password nunca quedan en memoria más tiempo del necesario.

**Tabla admin (`ProducerTable`):**
- `COLUMNS` pasa de `['Nombre', 'Estado', 'DNI', 'Últ. act. cuenta', 'Acciones']` a `['Nombre', 'Usuario', 'Estado', 'Últ. act. cuenta', 'Acciones']`.
- La celda de DNI se reemplaza por `p.email` (texto, sin badge especial, mismo estilo que las demás celdas de texto).
- Vista mobile: la línea `DNI {p.dni ?? '—'}` se reemplaza por el email debajo del nombre.
- DNI se mantiene visible en el detalle (`ProducerViewModal` ya lo muestra) — no se pierde el dato, solo se saca de la grilla principal.
- El buscador (`useProducerFilters`) se ajusta: se quita `dni` del `haystack` (línea 68), que pasa a construirse solo con `nombre apellido email` — consistente con que DNI deja de ser un dato visible/operativo en el listado.

**Acciones de tabla (`ProducerActionsMenu`):**
- Nuevo `MenuItem` "Restablecer contraseña" (ícono `KeyRound` de `lucide-react`, ya en dependencias) entre "Editar" y "Desactivar/Reactivar". No se agrega como botón visible aparte — sigue el patrón existente de concentrar acciones secundarias en el menú contextual para no sobrecargar la fila.
- Abre `ProducerResetPasswordModal` (nuevo, mismo componente `Modal` compartido que ya usan `ProducerFormModal`/`ProducerViewModal`).
- El modal pide únicamente "Nueva contraseña" + "Confirmar nueva contraseña" — nunca pide ni muestra la contraseña anterior.
- Maneja `loading` / `success` (toast, mismo patrón que `ProducerProfileViewPage` usa hoy) / `error` (mensaje inline, mismo patrón que `submitError` de `ProducerFormModal`).
- Al confirmar con éxito, limpia los campos y cierra el modal.

**Perfil privado (`ProducerProfileViewPage` + nuevo `ChangePasswordForm`):**
- Nueva sección "Seguridad" o similar, visible siempre que el productor está autenticado en su propio perfil (no depende de `editOpen`, es independiente del form de datos de perfil).
- Pide "Contraseña actual", "Nueva contraseña", "Confirmar nueva contraseña".
- Reutiliza el mecanismo de `toast` ya presente en la página (línea 43, 79-85 de `ProducerProfileViewPage.tsx`) para el mensaje de éxito.
- Limpia los tres campos tras éxito.

### Cambios en código existente

- `producersService.create()` deja de leer `env.DEFAULT_PRODUCER_PASSWORD`; ahora hashea `input.password` (ya validado por `createProducerSchema`). Esto es un **cambio de contrato de API**: `password` pasa a ser requerido en `POST /producers`. No hay clientes externos fuera de este frontend, así que no hace falta versionar el endpoint.
- `env.ts`: `DEFAULT_PRODUCER_PASSWORD` pasa de requerido (`z.string().min(12)`, sin default) a `.optional()`, porque deja de ser leído por `loadEnv()` en el flujo de alta. `seed.ts` sigue usándolo vía `process.env.DEFAULT_PRODUCER_PASSWORD` directamente (no pasa por `loadEnv()`), así que sigue funcionando igual en desarrollo/test.
- `backend/.env.example`: se documenta que `DEFAULT_PRODUCER_PASSWORD` ahora es solo para seed/desarrollo, no para alta real.
- Tests existentes que dependen de `env.DEFAULT_PRODUCER_PASSWORD` para loguearse tras un alta (`producers.integration.test.ts:57,189`) deben actualizarse para enviar y usar una password propia definida en el test.

---

## Decisiones tomadas

- **Email sigue siendo el único identificador de login.** No se agrega `username`: `Usuario.usuario` ya es el email normalizado y así se usa en todo el sistema (login, unicidad, tabla admin).
- **No se crea un modelo `User`/`Auth` nuevo.** `Usuario` + `Productor` (1:1 vía `usuarioId`) ya es exactamente esa separación; se reutiliza tal cual.
- **`password` pasa a ser un campo requerido y explícito del alta admin**, reemplazando la constante `DEFAULT_PRODUCER_PASSWORD` como mecanismo de asignación real (esa env var queda acotada a datos de seed/desarrollo).
- **Política de fortaleza de contraseña confirmada** (no existía una previa en el repo, se define consistente con la password seed de admin `Admin1234!`): mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula y 1 número. Se centraliza en `backend/src/lib/passwordPolicy.ts` para reutilizar en los 3 flujos (alta, self-service, reset admin) y evitar reglas divergentes.
- **DNI se quita también del buscador** (`useProducerFilters`), no solo de la columna de tabla — el buscador admin pasa a contemplar únicamente nombre, apellido y email.
- **Cambiar/restablecer contraseña revoca todas las sesiones (`SesionToken`) del usuario afectado**, replicando el patrón ya usado en `setActivo(id, false)`. Esto garantiza que "la contraseña anterior deja de funcionar" incluso si había un refresh token vivo.
- **DNI se saca de las columnas de la tabla principal** pero se mantiene en el detalle (`ProducerViewModal`), porque el alta actual ni siquiera lo recolecta (`createProducerSchema` no tiene `dni`) — mostrarlo en la grilla principal genera una columna casi siempre vacía (`—`).
- **La acción de reset va dentro del menú contextual** (`ProducerActionsMenu`), no como botón visible aparte, siguiendo el patrón ya usado para "Editar"/"Desactivar" y evitando sobrecargar la fila.
- **No se usan librerías nuevas.** `bcryptjs`, `zod`, `lucide-react` (ícono `KeyRound`) ya están en las dependencias de ambos paquetes.
- **No se toca el módulo `admins.*`** (stub vacío) — gestión de credenciales de ADMIN/SUPERADMIN queda fuera de este alcance.

---

## Alternativas consideradas

### Alternativa A — Generar contraseña aleatoria en backend y devolverla una sola vez en la respuesta del alta

- **Qué era:** en vez de que el admin escriba la contraseña, el backend genera una aleatoria y la devuelve en el `201` para que el admin la copie y se la pase al productor.
- **Pros:** contraseñas más fuertes garantizadas; menos superficie de "el admin elige `1234`".
- **Contras:** contradice el requerimiento explícito ("el administrador ingresa una nueva contraseña" en alta y en reset); complica el flujo de UI (hay que mostrar la contraseña generada una sola vez, con su propio riesgo de exposición en pantalla/portapapeles).
- **Por qué se descartó:** el requerimiento funcional pide explícitamente que el admin defina la contraseña, no que el sistema la genere.

### Alternativa B — Token de "primer acceso" con expiración en vez de contraseña inicial directa

- **Qué era:** el admin no define contraseña; se genera un token de invitación de un solo uso que el productor canjea para setear su propia contraseña en el primer ingreso.
- **Pros:** patrón más estándar en productos con onboarding por invitación; evita que el admin conozca la contraseña del productor incluso temporalmente.
- **Contras:** requiere tabla nueva (tokens de invitación), flujo de email (no hay proveedor integrado en el repo), y una pantalla pública nueva fuera del login existente — mucho mayor alcance que lo pedido.
- **Por qué se descartó:** el requerimiento es explícito en que el admin asigna la contraseña inicial directamente y que la única vía de recuperación es manual por admin, no invitación por email. Queda como posible evolución futura, no como parte de este TDD.

---

## Plan de implementación

### Fase 1 — Backend: alta con password individual
- [ ] `backend/src/lib/passwordPolicy.ts` — regex/reglas + schema Zod reutilizable
- [ ] `createProducerSchema` — agregar `password` requerido
- [ ] `producersService.create` — hashear `input.password`, quitar dependencia de `env.DEFAULT_PRODUCER_PASSWORD`
- [ ] `env.ts` — `DEFAULT_PRODUCER_PASSWORD` a `.optional()`
- [ ] Actualizar tests de `producers.integration.test.ts` que dependían del password compartido

### Fase 2 — Backend: cambio de contraseña self-service y reset admin
- [ ] `changeMyPasswordSchema`, `resetProducerPasswordSchema`
- [ ] `producersService.changeMyPassword`, `producersService.resetPassword` (con revocación de `SesionToken`)
- [ ] Controllers + rutas `PATCH /producers/me/password`, `PATCH /producers/:id/password`
- [ ] Tests de integración de los tres flujos (alta, self-service, reset) según casos listados en la sección de Tests del ticket

### Fase 3 — Frontend admin
- [ ] `ProducerFormModal` — campos de password en alta
- [ ] `adminProducer.ts` / `mapAdminProducer.ts` — payload con `password`
- [ ] `ProducerTable` — columna Usuario/Email en vez de DNI
- [ ] `ProducerActionsMenu` + `ProducerResetPasswordModal` — acción de reset
- [ ] `producers.service.ts` (admin) + `useAdminProducers` — `resetPassword`
- [ ] Tests de componentes/hooks correspondientes

### Fase 4 — Frontend intranet
- [ ] `ChangePasswordForm` — nuevo componente
- [ ] `producerProfile.service.ts` (intranet) + `useProducerProfile` — `changeMyPassword`
- [ ] `ProducerProfileViewPage` — montar el formulario
- [ ] Tests de componente/hook

### Fase 5 — Documentación
- [ ] `docs/modules/producers.md` — actualizar tabla de estado y quitar el pendiente resuelto
- [ ] `docs/modules/auth.md` — actualizar pendiente de "primer login"
- [ ] `docs/CHANGELOG.md` — entrada en `[Sin publicar]`
- [ ] `docs/worklog/MAPS-016-credenciales-productores.md` — al cerrar la implementación

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Cambiar `password` a requerido en `POST /producers` rompe algún consumidor no versionado del endpoint | Baja | Medio | El único consumidor es el frontend de este mismo repo; se actualiza en el mismo PR |
| Tests existentes que asumen `DEFAULT_PRODUCER_PASSWORD` como password de cualquier productor creado en test fallan silenciosamente si no se actualizan | Alta | Medio | Fase 1 incluye actualizar explícitamente `producers.integration.test.ts` |
| Política de password nueva bloquea passwords "simples" que el admin quiere usar como temporales | Media | Bajo | Política mínima razonable (8 car., 1 mayús., 1 minús., 1 número) — sigue permitiendo passwords temporales simples tipo `Temporal123` |
| Revocar `SesionToken` en cambio de password corta sesiones activas legítimas en otros dispositivos | Baja | Bajo | Es el comportamiento esperado de seguridad tras cambio de contraseña; documentado explícitamente en este TDD |

---

## Plan de rollout

- [ ] Feature flag: no aplica — cambio de contrato de API acotado a este repo, se despliega junto al frontend actualizado
- [ ] Migraciones: `N/A`, sin cambios de schema
- [ ] Variables de entorno: `DEFAULT_PRODUCER_PASSWORD` pasa a opcional (documentar en `.env.example` y `docs/MIGRATIONS.md` si corresponde)
- [ ] Comunicación a usuarios: informar a administradores actuales que el alta ahora pide contraseña inicial obligatoria
- [ ] Plan de rollback: revertir el PR restaura `DEFAULT_PRODUCER_PASSWORD` como password fija; no hay migración de datos que revertir

---

## Métricas de éxito

- `POST /producers` sin `password` responde `400` (ya no crea productor con password compartida).
- 0 endpoints del módulo `producers` devuelven `passwordHash` en ninguna respuesta (verificable con los tests de integración).
- Un productor puede loguearse con la password restablecida por el admin y la anterior deja de funcionar inmediatamente (sesión revocada).

---

## Preguntas abiertas

Todas resueltas — ver `docs/CONVENTIONS.md` para el criterio de qué mantener documentado aunque ya no estén "abiertas".

- [x] ¿La política de password propuesta (8 car., mayúscula, minúscula, número) es la que el equipo quiere? — _respondido:_ @lucaslegor — Sí, confirmada tal cual.
- [x] ¿Se quita `dni` también del buscador (`useProducerFilters`) o se mantiene buscable? — _respondido:_ @lucaslegor — Se quita.
- [x] ¿Número de ticket: `MAPS-017` u otro? — _respondido:_ @lucaslegor — Se numera como `MAPS-016`.

---

## Referencias

- **Figma:** N/A
- **Tickets:** MAPS-016
- **PRs relacionados:** _pendiente_
- **Diagramas / pruebas de concepto:** N/A
- **Work-log de implementación:** `docs/worklog/MAPS-016-credenciales-productores.md` — código implementado en la rama; backend `npm test` y verificación manual quedan pendientes de correr (sin Docker/Postgres en el entorno de implementación). El TDD pasa a `Implementado` cuando el PR se mergee a `development`, según `docs/CONVENTIONS.md`.
