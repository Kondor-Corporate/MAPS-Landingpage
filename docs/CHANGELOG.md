# Changelog

Todos los cambios relevantes del proyecto MAPS Asesores se resumen en este archivo.

Este changelog es release-oriented: lista cambios importantes para producto, arquitectura, infraestructura o experiencia de desarrollo. No reemplaza a los TDDs ni a los work-logs, que conservan el detalle tecnico de cada feature.

Formato basado en [Keep a Changelog](https://keepachangelog.com/) y versionado semantico cuando el proyecto defina versiones formales.

---

## [Sin publicar]

Entregas posteriores a la etapa documentada antigua (docs vivos + Docker + auth base). No reconstruye cada commit.

### Added

- Noticias fullstack reales (`/api/v1/news`): CRUD admin, listados público/intranet, visibilidad y publicación. Los mocks dejaron de alimentar el flujo principal.
- Galería y portada de noticias por upload de archivo (storage adapter; no URL pegada en el body).
- Geolocalización de productores (Nominatim) y mapa público con coordenadas persistidas.
- Alta de productores con contraseña inicial individual definida por el administrador (`POST /api/v1/producers`), en reemplazo de la contraseña global compartida.
- Cambio de contraseña self-service canónico para cualquier `Usuario` autenticado (`PATCH /api/v1/auth/me/password`): PRODUCTOR, ADMIN y SUPERADMIN. Requiere contraseña actual, política existente y nueva distinta de la actual (D1A).
- Alias temporal `PATCH /api/v1/producers/me/password` conservado solo para `PRODUCTOR`, apuntando a la misma lógica y al mismo rate limiter de Auth.
- Restablecimiento de contraseña por administrador (`PATCH /api/v1/producers/:id/password`), sin requerir la contraseña anterior, exclusivo para roles admin.
- Columna "Usuario" (email de acceso) en la tabla de productores del dashboard admin, con accion "Restablecer contraseña" en el menu de la fila.
- Boton "Cambiar contraseña" en el header del perfil privado del productor, que abre el cambio de contraseña como modal (antes requeria scrollear a una seccion fija).
- Subida de foto de perfil propia haciendo click en el avatar (`POST /api/v1/producers/me/foto`, JPG/PNG/WEBP hasta 5MB), reutilizando el storage adapter (local, GCS o S3).
- Validacion de contraseña en tiempo real (mientras se escribe) y boton de mostrar/ocultar en los tres formularios de contraseña (alta admin, reset admin, cambio self-service).
- Tests de integracion backend para alta con password individual, alias self-service de productor, reset admin y subida de foto de perfil (`backend/tests/producers.integration.test.ts`, `backend/tests/producersProfile.integration.test.ts`).
- Tests de integracion del cambio self-service canónico en Auth para PRODUCTOR, ADMIN y SUPERADMIN (`backend/tests/auth.integration.test.ts`).
- Gestión de cuentas `ADMIN` por `SUPERADMIN` (D1B, 2026-09-02): API `/api/v1/admins` (listado, alta, edición de usuario, activar/desactivar, reset de password), pantalla `/admin/admins` (card “Cuenta principal”, filtros client-side, tabla/cards, toasts) y tests de integración (`backend/tests/admins.integration.test.ts`).
- Logout robusto de producto (D2A, rama `fix/d2-auth-session-hardening`): `POST /api/v1/auth/logout` sin `authenticate`, revocacion por refresh (cookie prioritaria), idempotente, validacion criptografica previa a BD, tests ampliados en `backend/tests/auth.integration.test.ts`; interceptor Axios excluye `/auth/logout` del retry automatico.
- Validacion de contenido real en uploads (D3A, rama `fix/d3a-file-content-validation`): detector interno por firmas binarias en certificaciones, foto de perfil y portada/galeria de noticias; tests unitarios e integracion ampliados (`detectAllowedUploadType`, `uploadContentValidation`, `producersProfile`, `news-imagenes`).
- Dockerizacion fullstack de desarrollo con servicios `frontend`, `backend` y `db`.
- Documentacion viva del modulo Auth/Routing en `docs/modules/auth.md`.
- Indice general de documentacion en `docs/README.md`.
- Guia de contribucion en `docs/CONTRIBUTING.md`.
- Template de Pull Request en `.github/pull_request_template.md`.
- Arquitectura viva en `docs/ARCHITECTURE.md`.
- Estrategia de testing en `docs/TESTING.md`.
- Guia de migraciones y seed en `docs/MIGRATIONS.md`.
- Snapshot actualizado del repositorio en `docs/inventario-proyecto.md`.
- Documentacion viva de modulos en `docs/modules/`: productores, biblioteca, web publica, noticias y administradores.
- Preparación y puesta en marcha de staging en GCP (Cloud Run, Cloud SQL, GCS, jobs migrate/bootstrap). Contrato: `docs/GCP_STAGING_RUNBOOK.md`.

### Changed

- Web pública: copy y flujo de conversión, footer/SEO básico de landing, sección institucional "Nuestro equipo" con datos estáticos (`OurTeamSection`; no es la red de asesores del mapa).
- Estabilización QA posterior a noticias/mapa/credenciales: cookies/host canónico local, biblioteca demo y pulido de intranet/admin.
- El cambio de contraseña propia deja de ser un flujo del dominio Productor: vive en Auth (service, schema, limiter y formulario compartido). Productor, Admin y Superadmin usan el mismo formulario; tras el éxito se limpia el auth store y se vuelve a login, sin `POST /auth/logout` (D1A).
- `POST /api/v1/auth/logout` deja de exigir access token ni middleware `authenticate`: la sesion se identifica solo por refresh (cookie `maps_refresh` con prioridad; body solo si `allowRefreshBody`). Logout idempotente con limpieza de cookie; revocacion server-side via SHA-256 + `SesionToken.deleteMany({ tokenHash })` tras `jwt.verify(..., { ignoreExpiration: true })` y `typ === 'refresh'` (D2A).
- Tabla de productores del dashboard admin: la columna "DNI" fue reemplazada por "Usuario" (email de acceso); el buscador admin ya no filtra por DNI.
- Integridad de coordenadas de productores (D3B, rama `fix/d3b-coordinate-bounds`): inputs admin/perfil y geocoding validan finitud y bounds globales; cache positivo se revalida; DTOs neutralizan legacy invalido y `/producers/map` lo excluye. Sin migracion DB ni cambios frontend.
- Consistencia Storage ↔ DB (D3C, rama `fix/d3c-storage-db-consistency`): PostgreSQL pasa a ser la fuente de verdad operativa para certificaciones, foto y assets de noticias; CREATE/REPLACE compensan uploads nuevos ante fallo DB, DELETE realiza DB-first y cleanup posterior best-effort observable; Local/S3 solo eliminan URLs managed reconocidas. Sin migraciones, cambios frontend ni cambios de contrato HTTP.
- `DEFAULT_PRODUCER_PASSWORD` pasa a ser opcional y queda acotada a `prisma/seed.ts`; ya no participa del alta real de productores.
- "Editar perfil" (intranet) ya no tiene un campo de texto "URL foto"; la foto se gestiona exclusivamente subiendo una imagen desde el avatar.
- Convenciones documentales actualizadas con fuentes de verdad y relacion entre README, modulos, TDDs y work-logs.
- README raiz actualizado como onboarding actual del proyecto.
- Work-log MAPS-011 de Biblioteca Digital aclarado como historico y supersedido por MAPS-012 para API/persistencia.

### Fixed

- Import de errores JWT desde `jsonwebtoken` compatible con runtime ESM/CommonJS.
- Imagen Docker del backend ajustada a Debian slim para compatibilidad Prisma/OpenSSL.

### Removed

- Formulario `frontend/src/modules/intranet/components/ChangePasswordForm.tsx`; el cambio self-service usa `frontend/src/modules/auth/components/ChangePasswordForm.tsx` (D1A).

### Security

- Se elimina el uso de una contraseña global compartida entre productores (`DEFAULT_PRODUCER_PASSWORD`) para el alta real; cada productor recibe una contraseña individual definida por el admin.
- Cambio self-service (`PATCH /auth/me/password`) y restablecimiento admin revocan las sesiones activas (`SesionToken`) del usuario afectado e incrementan `tokenVersion`, invalidando refresh y access tokens emitidos con la contraseña anterior. El controller limpia la cookie `maps_refresh` solo tras un cambio exitoso.
- Reset y cambio real de `usuario` de un `ADMIN`, y su desactivación (D1B), revocan las sesiones de **esa** cuenta (`tokenVersion++` + `SesionToken`); no limpian la cookie del SUPERADMIN caller. Reactivar y no-ops de mismo usuario/estado no revocan.
- Rate limiter de cambio de contraseña claveado por `req.user.sub` (no por IP); canónico y alias comparten la misma instancia/cupo.
- Logout de producto (`POST /auth/logout`, D2A) revoca la sesion refresh actual (hash en `SesionToken`) sin incrementar `tokenVersion` ni cerrar otras sesiones del mismo usuario. Tokens arbitrarios no provocan consultas BD. Si falla la revocacion en BD, el endpoint responde `500` pero limpia la cookie local. **Limitacion:** el access token ya emitido sigue valido hasta su expiracion natural (`JWT_EXPIRES_IN`, ~15 min habitual). Refresh rotation / reuse detection queda como deuda D2C (diferida).
- Uploads de certificaciones, fotos de perfil y portada/galeria de noticias validan el tipo aparente por firmas binarias antes de escribir en storage (D3A). El MIME detectado reemplaza a `file.mimetype` como metadata canonica hacia storage y columnas `mimeType` donde existen. Sin cambio de formatos permitidos, RBAC, visibilidad publica de certificaciones ni contratos HTTP publicos. Firma valida no equivale a archivo completo seguro (sin antivirus ni parsing profundo).
- Ningun endpoint de `/api/v1/producers` expone `passwordHash` en sus respuestas.

---

<!--
Guia de uso:

Cada PR que introduzca cambios relevantes debe agregar una entrada en [Sin publicar].

Categorias:

- Added: funcionalidades, documentos o capacidades nuevas.
- Changed: cambios sobre comportamiento existente, arquitectura o flujo de trabajo.
- Fixed: correcciones de bugs.
- Removed: funcionalidades, archivos o dependencias eliminadas.
- Security: cambios relacionados con seguridad.

Formato recomendado:

- Descripcion breve del cambio (#PR o MAPS-XXX).

Cuando se cierre una version o entrega, mover [Sin publicar] a una version fechada:

## [0.1.0] - YYYY-MM-DD
-->
