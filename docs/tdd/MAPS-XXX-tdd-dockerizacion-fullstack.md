# MAPS-XXX - TDD - Dockerizacion fullstack

## Metadata


| Campo   | Valor                                        |
| ------- | -------------------------------------------- |
| Estado  | Aprobado                                     |
| Fecha   | 2026-05-29                                   |
| Autor   | Santiago Talavera                            |
| Alcance | Dockerizar backend, frontend y compose local de desarrollo |


---

## Contexto

El repositorio ya tenia `docker-compose.yml` para PostgreSQL local, pero backend y frontend se ejecutaban fuera de Docker con `npm run dev`. El objetivo de esta tarea es sumar contenedores reproducibles para la API Express/Prisma y la SPA React/Vite, tomando como referencia las buenas practicas vistas en `is-2026-checkpoint-01` (Ing. software UTN-FRLP 2026): healthchecks, usuarios no-root, red propia, dependencias entre servicios por salud, logging rotativo y limites razonables de recursos.

---

## Alcance

Incluido:

- `backend/Dockerfile` multi-stage para build TypeScript y runtime Node.
- `backend/.dockerignore`.
- `frontend/Dockerfile` multi-stage para build Vite y runtime Nginx no-root.
- `frontend/nginx.conf` con fallback SPA.
- `frontend/.dockerignore`.
- `docker-compose.yml` con servicios `db`, `backend` y `frontend`.
- Healthchecks para los tres servicios.
- Variables de entorno por defecto para desarrollo Docker, definidas desde Compose.

Fuera de alcance:

- Deploy productivo, TLS, dominios reales o reverse proxy externo.
- Portainer.
- Pipeline CI/CD.
- Migraciones automaticas al levantar el backend.
- Separar compose de desarrollo y produccion.
- Cambios funcionales en la app.

---

## Decisiones

### 1. Backend Node en multi-stage

Se usa `node:20-bookworm-slim` para alinear con el requisito Node >= 20 y evitar incompatibilidades Prisma/OpenSSL observadas con Alpine. La imagen instala dependencias, genera Prisma Client, compila TypeScript y ejecuta `node dist/server.js` en runtime.

Motivo: mantener el flujo actual del paquete (`npm ci`, `prisma generate`, `npm run build`, `npm start`) sin introducir PM2 ni otro supervisor.

### 2. Runtime backend no-root y ambiente definido por Compose

El contenedor crea `appuser`/`appgroup` y ejecuta el proceso sin root. Se crea `uploads/certificaciones` con permisos para ese usuario, porque el storage local de certificaciones escribe en disco.

El Dockerfile no fija `NODE_ENV`; el ambiente lo define `docker-compose.yml`. Para este flujo, el default del compose es `development`, porque el objetivo es seguir desarrollando y poder correr comandos auxiliares como seed dentro del contenedor.

### 3. Prisma migrate queda como operacion explicita

El backend no ejecuta `prisma migrate deploy` automaticamente en el `CMD`.

Motivo: evitar mutaciones de base de datos implicitas al arrancar cada replica o restart. Para desarrollo local, las migraciones se pueden correr manualmente dentro del contenedor o desde la maquina host. Si mas adelante se necesita, conviene agregar un servicio one-shot `migrate`.

### 4. Frontend como artefacto estatico

Vite compila a `dist/` y se sirve con `nginxinc/nginx-unprivileged`, escuchando en el puerto interno `8080`.

Motivo: la SPA no necesita Node en runtime y Nginx cubre fallback a `index.html` para React Router.

### 5. API base del frontend en build time

`VITE_API_BASE_URL` se pasa como `ARG` al build del frontend. El valor por defecto apunta a `http://localhost:3000/api/v1`, que es accesible desde el navegador del desarrollador cuando `backend` publica el puerto `3000`.

Riesgo: para ambientes con dominio real, el frontend debe reconstruirse con el `VITE_API_BASE_URL` correcto o evolucionar a proxy/runtime config.

### 6. Compose con defaults locales de desarrollo

El compose usa interpolacion con defaults (`${VAR:-valor}`), por lo que puede levantar sin `.env` raiz. El default de `NODE_ENV` es `development`. En ambientes reales se deben sobreescribir secretos, origenes y ambiente.

### 7. Healthchecks

- `db`: `pg_isready`.
- `backend`: `GET /api/v1/health`.
- `frontend`: request HTTP a `/`.

`frontend` depende de `backend: service_healthy` y `backend` depende de `db: service_healthy`.

---

## Plan de verificacion

Verificacion estatica:

- Revisar que los Dockerfiles no copien `.env`, `node_modules`, `dist` ni caches.
- Revisar que backend y frontend usen usuarios no-root.
- Revisar que los healthchecks apunten a endpoints existentes.
- Revisar que `DATABASE_URL` use host `db` dentro de la red Docker.

Verificacion manual recomendada:

```bash
docker compose build
docker compose up -d
docker compose ps
```

Migraciones y seed en entorno Docker, si la base esta vacia:

```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run db:seed
```

Checks funcionales:

```bash
curl http://localhost:3000/api/v1/health
curl http://localhost:8080
```

Validacion en navegador:

- Abrir `http://localhost:8080`.
- Confirmar que la landing carga.
- Confirmar que las rutas SPA funcionan al refrescar.
- Confirmar que llamadas publicas al backend usan `http://localhost:3000/api/v1`.

---

## Riesgos y pendientes

- Falta un servicio one-shot de migraciones si el equipo quiere `docker compose up` completamente inicializable desde cero.
- `VITE_API_BASE_URL` queda fijado al momento del build.
- Las credenciales incluidas como defaults son solo para desarrollo; no son aptas para produccion.
- No se agrego HTTPS ni proxy de borde.
