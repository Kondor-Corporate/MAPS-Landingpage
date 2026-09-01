# Productores

Documentacion viva del modulo Productores.

Este modulo cubre:

- Gestion administrativa de productores.
- Perfil propio del productor.
- Perfil publico por slug.
- Datos para mapa publico.
- Certificaciones.

Historial relacionado:

- Admin productores UI mock: `docs/worklog/MAPS-007-seccion-productores-admin.md`.
- API admin productores: `docs/worklog/MAPS-009-admin-api-productores.md`.
- Perfil productor y slug: `docs/worklog/MAPS-013-vista-perfil-productor.md`.
- Credenciales administradas por admin: `docs/worklog/MAPS-016-credenciales-productores.md`.
- Self-service de contraseña movido a Auth: `docs/worklog/D1A-cambio-self-password.md`.

---

## Estado actual

| Area | Estado |
|------|--------|
| Admin CRUD productores | Implementado con API real |
| Activos/inactivos | Implementado |
| Geocodificacion de direccion | Implementada via Nominatim |
| Perfil propio productor | Implementado |
| Perfil publico por slug | Implementado |
| Mapa publico | Implementado |
| Certificaciones PDF | Implementado con storage local/S3-compatible |
| Credenciales individuales por productor (alta con password propia) | Implementado (MAPS-016) |
| Cambio de contraseña self-service | Canónico en Auth (`PATCH /api/v1/auth/me/password`, D1A). El productor lo usa desde su perfil; `PATCH /producers/me/password` queda como alias temporal solo para `PRODUCTOR` |
| Restablecimiento de contraseña por admin | Implementado (MAPS-016) — sigue en este dominio |
| Paginacion/busqueda server-side | Pendiente |
| Primer login por invitación (email) | Pendiente — hoy el admin define la password inicial directamente |

---

## Modelo de datos

Modelos Prisma principales:

- `Usuario`
- `Productor`
- `RedSocial`
- `Certificacion`
- `SesionToken`

Relaciones:

- Un `Usuario` con rol `PRODUCTOR` tiene un `Productor`.
- `Productor` tiene redes sociales y certificaciones.
- La activacion/desactivacion del productor se modela con `Usuario.activo`.

Campos relevantes de `Productor`:

| Campo | Uso |
|-------|-----|
| `slug` | URL publica e intranet por perfil |
| `nombre`, `apellido` | Identidad visible |
| `ciudad` | Direccion/zona visible y fuente para geocoding |
| `latitud`, `longitud` | Mapa publico y zona de influencia |
| `matricula`, `verificado` | Datos profesionales |
| `bio`, `foto`, `whatsapp`, `idiomas` | Perfil |
| `anosExperiencia`, `clientesActivos` | Estadisticas |
| `especialidades` | Areas de especialidad |

---

## Backend

Rutas bajo:

```text
/api/v1/producers
```

### Publicas

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `GET` | `/producers/map` | Productores activos con coordenadas para mapa |
| `GET` | `/producers/by-slug/:slug` | Perfil publico de productor activo |

### Productor autenticado

Requiere rol `PRODUCTOR`.

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `GET` | `/producers/me` | Perfil propio |
| `PATCH` | `/producers/me` | Edita campos permitidos del perfil propio |
| `PATCH` | `/producers/me/password` | **Alias temporal** del cambio self-service. Solo `PRODUCTOR`. La lógica ya no pertenece a este dominio: delega en `authController.changeMyPassword` y el limiter/schema de Auth. El endpoint canónico es `PATCH /api/v1/auth/me/password` (cualquier `Usuario` autenticado; ver `docs/modules/auth.md`) |
| `POST` | `/producers/me/foto` | Sube/reemplaza la foto de perfil propia (JPG/PNG/WEBP, máx. 5MB) |
| `POST` | `/producers/me/certificaciones` | Sube certificacion PDF |
| `DELETE` | `/producers/me/certificaciones/:certId` | Elimina certificacion propia |

### Admin / SuperAdmin

Requiere rol `ADMIN` o `SUPERADMIN`.

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `GET` | `/producers` | Lista productores, con filtro opcional `activo` |
| `GET` | `/producers/:id` | Detalle admin |
| `POST` | `/producers` | Crea usuario productor + perfil (requiere `password` inicial) |
| `PATCH` | `/producers/:id` | Actualiza datos admin/perfil |
| `PATCH` | `/producers/:id/activo` | Activa/desactiva productor |
| `PATCH` | `/producers/:id/password` | Restablece la contraseña (no requiere la anterior; solo admin) |
| `POST` | `/producers/:id/certificaciones` | Sube certificacion como admin |
| `DELETE` | `/producers/:id/certificaciones/:certId` | Elimina certificacion como admin |

Archivos principales:

- `backend/src/api/v1/routes/producers.routes.ts`
- `backend/src/controllers/producers.controller.ts`
- `backend/src/services/producers.service.ts`
- `backend/src/validations/producer.schema.ts`
- `backend/src/validations/producerProfile.schema.ts`
- `backend/src/lib/producerProfileMapper.ts`
- `backend/src/lib/passwordPolicy.ts` (MAPS-016)
- `backend/src/lib/storage/`
- `backend/src/lib/geocode.ts`

---

## Frontend

### Admin productores

Rutas:

```text
/admin/productores
/admin/inactivos
```

Archivos principales:

- `frontend/src/modules/admin/pages/ProducersPage.tsx`
- `frontend/src/modules/admin/pages/InactiveProducersPage.tsx`
- `frontend/src/modules/admin/hooks/useAdminProducers.ts`
- `frontend/src/modules/admin/services/producers.service.ts`
- `frontend/src/modules/admin/components/ProducersDashboard.tsx`
- `frontend/src/modules/admin/components/ProducerFormModal.tsx`
- `frontend/src/modules/admin/components/ProducerTable.tsx`
- `frontend/src/modules/admin/components/ProducerResetPasswordModal.tsx` (MAPS-016)

### Perfil productor intranet

Rutas:

```text
/intranet/mi-perfil
/intranet/perfil/:slug
```

Archivos principales:

- `frontend/src/modules/intranet/pages/MyProfilePage.tsx`
- `frontend/src/modules/intranet/pages/ProducerProfileViewPage.tsx`
- `frontend/src/modules/intranet/hooks/useProducerProfile.ts`
- `frontend/src/modules/intranet/services/producerProfile.service.ts`
- `frontend/src/modules/intranet/components/ProducerProfileForm.tsx`
- `frontend/src/modules/auth/components/ChangePasswordForm.tsx` (formulario compartido de Auth; ya no vive en intranet)
- `frontend/src/modules/auth/services/auth.service.ts` (`PATCH /auth/me/password`)
- `frontend/src/shared/components/profile/`

### Web publica

Rutas:

```text
/
/productor/:slug
```

Archivos principales:

- `frontend/src/modules/public-web/components/FindAdvisorMap.tsx`
- `frontend/src/modules/public-web/pages/ProducerProfilePage.tsx`
- `frontend/src/modules/public-web/services/producersMap.service.ts`
- `frontend/src/modules/public-web/services/producerProfile.service.ts`
- `frontend/src/shared/components/map/`

---

## Geocodificacion

Al crear o actualizar productores desde admin, la direccion/ciudad puede geocodificarse con Nominatim para persistir:

- `latitud`
- `longitud`

Variable relacionada:

```env
NOMINATIM_USER_AGENT=maps-landingpage-dev/1.0 (contact@kondor.local)
```

Riesgos:

- Nominatim puede fallar por direccion ambigua, rate limit o conectividad.
- La direccion debe ser suficientemente especifica.
- No hay cache externa documentada.

---

## Certificaciones, foto de perfil y storage

Las certificaciones son PDFs asociados a productores. La foto de perfil (JPG/PNG/WEBP, máx. 5MB) se sube desde `/intranet/mi-perfil` haciendo click en el avatar propio — reemplaza el antiguo campo de texto "URL foto". Ambos reutilizan el mismo `StorageAdapter` (`backend/src/lib/storage/`).

Storage:

- `local`: disco en `backend/uploads/certificaciones` y `backend/uploads/fotos`.
- `s3`: bucket S3-compatible (prefijos `certificaciones/` y `fotos/`).

Variables relacionadas:

```env
STORAGE_PROVIDER=local
API_PUBLIC_URL=http://localhost:3000
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_PUBLIC_BASE_URL=
```

En Docker desarrollo, `backend_uploads` persiste los archivos subidos.

---

## Verificacion manual

Admin:

1. Login como `admin`.
2. Abrir `/admin/productores`.
3. Crear productor con direccion valida y contraseña inicial propia.
4. Confirmar que aparece activo y que la columna Usuario muestra el email.
5. Editar datos.
6. Usar "Restablecer contraseña" desde el menu de acciones (sin pedir la anterior).
7. Desactivar.
8. Abrir `/admin/inactivos` y reactivar.

Productor:

1. Login con el email y la contraseña inicial definida por el admin.
2. Abrir `/intranet/mi-perfil`.
3. Confirmar redireccion a `/intranet/perfil/:slug`.
4. Editar campos permitidos.
5. Subir/eliminar certificacion PDF.
6. En la seccion "Seguridad", cambiar la contraseña (pide la actual). El formulario es el de Auth y llama `PATCH /auth/me/password`.
7. Tras el éxito la SPA limpia el auth store y vuelve a `/login` (no llama `POST /auth/logout`). Volver a entrar con la contraseña nueva; la anterior debe fallar.

Publico:

1. Abrir `/`.
2. Confirmar marcadores en mapa si hay productores activos con coordenadas.
3. Abrir `/productor/:slug`.

---

## Pendientes conocidos

- Paginacion y busqueda server-side para listados grandes.
- Invitacion por email para el primer acceso (hoy el admin comunica la password inicial fuera del sistema).
- Notificacion por email al productor cuando el admin restablece su contraseña.
- Auditoria/historial de cambios de contraseña (solo queda `Usuario.updatedAt`).
- E2E admin/productor/publico.
- Mejor manejo operacional de geocoding.
- Upload de foto de perfil.
- Definir politica final para storage productivo.
