# MAPS — runbook de staging en GCP

Contrato operativo del entorno de staging. No autoriza ni ejecuta comandos de
Google Cloud desde este documento. No inventariar ni copiar secretos.

## Estado actual de staging

El entorno **está provisionado y operativo**. Ya se usó para QA real.

Estado conocido: operativo según la última validación manual conocida.
Última revisión documental: 2026-09-01.
Esa fecha no es una comprobación live de GCP.

Datos no sensibles conocidos (sin inventario de URLs ni secretos):

| Dato | Valor |
|------|--------|
| Proyecto GCP | `maps-staging-landing-page` |
| Región | `southamerica-east1` |
| Frontend | Cloud Run operativo |
| Backend | Cloud Run operativo |
| Base de datos | Cloud SQL PostgreSQL operativo |
| Assets | GCS privado |
| Jobs | migrate y bootstrap utilizados |
| Secretos | Secret Manager (mecanismo; sin valores aquí) |
| IAM | Service accounts dedicadas |
| Observabilidad | Monitoring y alertas configurados |

Este runbook sigue siendo la fuente del **contrato** (imágenes, variables, IAM
conceptual, secuencia reproducible). No es un inventario de URLs internas ni
credenciales. Producción no se documenta aquí como desplegada.

## Topología

- **Frontend Cloud Run:** servicio público. Sirve la SPA y recibe todo el tráfico del navegador.
- **Backend Cloud Run:** servicio públicamente invocable en este staging. Recibe desde
  Nginx las rutas `/api/*`; el proxy no genera identity tokens de Cloud Run.
- **Cloud SQL PostgreSQL:** base vacía de staging, conectada únicamente al backend y a los jobs.
- **Cloud Storage:** bucket privado. El navegador nunca accede directamente al bucket.
- **Job de migración:** aplica únicamente migraciones ya versionadas.
- **Job de bootstrap:** crea el primer `SUPERADMIN` sin cargar datos demo.

## Imágenes y targets Docker

### Backend web

El target final `runner`:

- usa Node.js 22, requerido por la versión actual del cliente oficial de GCS;
- escucha en `0.0.0.0:$PORT`;
- contiene dependencias de producción, `dist/` y Prisma Client generado;
- no contiene `prisma/seed.ts`, migraciones ni Prisma CLI;
- no ejecuta migraciones ni bootstrap al iniciar.

### Backend jobs

Construir el target `jobs` del mismo Dockerfile. Incluye Prisma CLI,
`schema.prisma`, migraciones versionadas y el código compilado, pero no incluye
`seed.ts`.

- Migraciones (comando por defecto del target): `npm run db:migrate:deploy`
- Bootstrap: sobrescribir el comando por `npm run bootstrap:admin`

Los jobs son one-shot: terminan con el exit code del comando. Nunca usar
`prisma migrate dev`, `migrate reset` ni `db:seed` en staging.

### Frontend

El build usa Node.js 22 y `VITE_API_BASE_URL=/api/v1`. En desarrollo la variable
es opcional: Vite redirige `/api` a `http://127.0.0.1:3000` sin reescribir el path.
En runtime, el entrypoint de la imagen Nginx renderiza `nginx.conf` con
`BACKEND_ORIGIN`. La variable debe contener solo el origen HTTPS del backend, sin
`/api`, path, query, fragment ni barra final. Un script del entrypoint rechaza el
contenedor si el formato no cumple este contrato.

`location ^~ /api/` preserva método, body, path y query string. Envía al backend:

- `Host` del servicio backend;
- `X-Forwarded-For`;
- `X-Forwarded-Host`;
- `X-Forwarded-Proto`.

`Set-Cookie` se transmite sin reescritura. Para el navegador la cookie es del
origen público del frontend, por lo que se mantienen `HttpOnly`, `Secure` en
producción, `SameSite=Lax`, `Path=/` y sin `Domain`.

El proxy admite cuerpos de hasta `11 MiB`: el límite funcional mayor de Multer es
`10 MiB` para certificaciones y el margen de `1 MiB` cubre el envelope multipart.
Se conservan los timeouts predeterminados de Nginx (60 segundos), suficientes para
el máximo actual; deben medirse antes de aumentarlos.

## Storage

Con `STORAGE_PROVIDER=gcs`:

1. El backend usa `new Storage()` y Application Default Credentials.
2. Guarda objetos bajo `[GCS_PREFIX/]certificaciones/` o `[GCS_PREFIX/]fotos/`.
3. Los nombres son UUID v4 y no contienen IDs de usuario.
4. La URL persistida apunta a
   `/api/v1/uploads/{certificaciones|fotos}/{uuid.ext}` bajo `API_PUBLIC_URL`.
5. El backend valida categoría y UUID, obtiene metadatos y transmite el objeto por
   stream, conservando `Content-Type`, `Content-Length` cuando está disponible y
   `Cache-Control`.
6. La eliminación solo acepta URLs del `API_PUBLIC_URL` configurado y reconstruye
   una clave dentro del prefijo administrado.

No configurar ACL pública, `keyFilename`, `GOOGLE_APPLICATION_CREDENTIALS`,
service-account JSON ni claves HMAC para GCS.

Los proveedores `local` y `s3` mantienen sus contratos anteriores.

Las certificaciones son públicas por decisión funcional: `archivoUrl` forma parte
del perfil devuelto por `GET /producers/by-slug/:slug` y el perfil público renderiza
enlaces de descarga. La URL usa un UUID v4 no predecible, el bucket permanece
privado y el acceso público ocurre exclusivamente mediante el backend.
`Cache-Control: private` evita cachés compartidas, pero no es autorización.

## Redis / Memorystore (rate limiting y caché de geocoding)

MAPS-020 agrega un store distribuido compartido por el rate limiting de
`/geocode`, `/geocode/reverse`, `/producers/map` y la caché de resultados de
geocoding. En staging/producción es un recurso nuevo a provisionar
(Memorystore for Redis, tier básico, sin acceso público, en la misma VPC que
el backend Cloud Run vía conector serverless VPC access).

- Redis **no es un punto único de falla**: si no está disponible, el backend
  degrada solo (fail-open) a un `MemoryStore` local por instancia para rate
  limiting y a consultar Nominatim directamente sin caché. Nunca se responde
  429/503 únicamente por la caída de Redis. El detalle de la degradación en 3
  niveles está en `docs/tdd/MAPS-020-tdd-rate-limiting-geocoding-mapa.md`.
- `REDIS_URL` es **opcional** en dev/test (sin ella, todo corre en memoria) y
  **obligatoria** en staging/producción para que el rate limiting y la caché
  sean efectivos entre instancias.
- IAM conceptual: el backend necesita conectividad de red a la instancia de
  Memorystore (misma VPC / conector serverless); Memorystore no usa IAM de
  objeto como GCS, el control de acceso es de red.

### Prerequisito: verificación de `TRUST_PROXY` (Fase 0 de MAPS-020)

El rate limiting por IP depende de que Express calcule correctamente `req.ip`
detrás de Nginx. Antes de habilitar los limiters por IP en staging, verificar
con tráfico real (no solo revisar el código) que `TRUST_PROXY=1` resuelve al
IP real del cliente y no al IP del proxy interno, usando un endpoint de
diagnóstico temporal (removido antes de dejar el cambio en main). No dejar
logging permanente de IPs completas.

## Variables del frontend

### Build

- `VITE_API_BASE_URL`: opcional en desarrollo por el proxy de Vite; construir
  staging explícitamente con `/api/v1`. No es secreto.

### Runtime

- `BACKEND_ORIGIN`: origen HTTPS del servicio backend. No es secreto.

## Variables del backend

Configuración normal:

- `NODE_ENV=production`
- `PORT`: suministrado por Cloud Run; fallback de imagen `8080`.
- `JWT_EXPIRES_IN`
- `REFRESH_EXPIRES_IN`
- `FRONTEND_ORIGIN`: origen público único del frontend.
- `TRUST_PROXY=1`
- `ALLOW_REFRESH_BODY=false`
- `STORAGE_PROVIDER=gcs`
- `GCS_BUCKET`
- `GCS_PREFIX` opcional
- `API_PUBLIC_URL`: obligatoria con GCS. Debe ser el origen público del frontend,
  sin credenciales, path ni barra final, porque `/api` llega por Nginx.
- `NOMINATIM_USER_AGENT`
- `TZ`
- `REDIS_URL`: obligatoria en staging/producción (ver sección Redis/Memorystore).
  No es secreto por sí sola (sin credenciales embebidas, Memorystore controla
  acceso por red), pero se gestiona igual vía Secret Manager por convención.

Secretos:

- `DATABASE_URL`
- `JWT_SECRET`
- `REFRESH_SECRET`

Variables S3 existentes, solo cuando `STORAGE_PROVIDER=s3`:

- `S3_BUCKET`
- `S3_REGION`
- `S3_PUBLIC_BASE_URL`
- secretos `S3_ACCESS_KEY` y `S3_SECRET_KEY`

## Bootstrap

Variables obligatorias, sin defaults:

- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_PASSWORD`

Opcional:

- `BOOTSTRAP_ADMIN_FORCE=true|false` (default `false`)

La contraseña usa la misma política de la aplicación: mínimo ocho caracteres,
una mayúscula, una minúscula y un número. El administrador solo contiene los
campos admitidos por el modelo `Usuario`; el modelo actual no tiene nombre.

Si el usuario ya es `SUPERADMIN` activo, el job termina correctamente sin cambiar
la contraseña. Si existe con estado o rol incompatible, falla salvo
`BOOTSTRAP_ADMIN_FORCE=true`. Force promueve a `SUPERADMIN`, activa la cuenta, rota
la contraseña, incrementa `tokenVersion` y revoca sesiones.

## IAM conceptual

- Service account backend:
  - conexión a Cloud SQL;
  - lectura de secretos de backend;
  - crear, leer y eliminar objetos únicamente en el bucket de staging.
- Service account job migraciones:
  - conexión a Cloud SQL;
  - lectura de `DATABASE_URL`.
- Service account job bootstrap:
  - conexión a Cloud SQL;
  - lectura de `DATABASE_URL` y secretos de bootstrap.
- Bucket:
  - acceso público deshabilitado;
  - sin ACLs por objeto.

Aplicar privilegios al recurso específico y evitar roles de proyecto amplios.

## Decisión de acceso a Cloud Run

- El frontend es público.
- El backend también es públicamente invocable en esta primera versión.
- Las rutas privadas se autorizan en Express mediante JWT, estado de cuenta, rol
  y `tokenVersion`; CORS no constituye autorización.
- El navegador usa el backend únicamente mediante `/api` del frontend.
- Nginx no genera identity tokens ni implementa autenticación servicio-a-servicio.
- Hacer privado el backend exigiría esa autenticación entre servicios y queda
  fuera de esta versión.

## Secuencia reproducible

Útil para reprovisionar o para onboarding de quien opera GCP. El entorno actual
ya recorrió esta secuencia.

1. Crear recursos e identidades de staging.
2. Construir `runner`, `jobs` y frontend.
3. Desplegar una revisión provisional del frontend con un `BACKEND_ORIGIN`
   sintácticamente válido. Esa revisión todavía no es funcional y no debe
   compartirse con clientes.
4. Obtener la URL pública HTTPS del frontend.
5. Desplegar el backend con esa URL, sin barra final, como `API_PUBLIC_URL` y
   `FRONTEND_ORIGIN`.
6. Obtener la URL HTTPS del backend.
7. Actualizar el frontend con esa URL, sin barra final, como `BACKEND_ORIGIN`.
8. Validar que ambas revisiones estén saludables y que `/api/v1/health` atraviese
   el proxy conservando el path.
9. Ejecutar el job de migraciones contra la base vacía.
10. Ejecutar una vez el job de bootstrap.
11. Recién entonces cargar contenido y realizar QA manual.

El E2E real de subida, descarga y eliminación en GCS se realizará después como
smoke test del staging. Los tests frontend preparados siguen sin runner instalado
y todavía no se ejecutan en CI; CI sí ejecuta typecheck, lint y build con Node 22.
El cableado del runner frontend queda fuera de este runbook (D5).
