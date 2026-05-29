# MAPS-XXX - Dockerizacion fullstack

Work-log de cierre para la dockerizacion de backend, frontend y compose local. Complementa el TDD [`MAPS-XXX-tdd-dockerizacion-fullstack.md`](../tdd/MAPS-XXX-tdd-dockerizacion-fullstack.md).

---

## Objetivo

Pasar de un compose limitado a PostgreSQL a una configuracion que pueda construir y ejecutar los tres servicios principales del sistema:

- Frontend React/Vite servido como SPA estatica.
- Backend Express/Prisma en Node.
- PostgreSQL 16 con volumen persistente.

La implementacion toma como referencia el repo `is-2026-checkpoint-01`, adaptando sus buenas practicas al stack real de MAPS.

---

## Cambios implementados

### Backend

Archivos:

- `backend/Dockerfile`
- `backend/.dockerignore`

Detalle:

- Dockerfile multi-stage con `node:20-alpine`.
- Instalacion reproducible con `npm ci`.
- `npx prisma generate` durante build.
- Build TypeScript con `npm run build`.
- Runtime con `npm ci --omit=dev`.
- Usuario no-root `appuser`.
- Directorio persistible `uploads/certificaciones`.
- Healthcheck HTTP contra `/api/v1/health`.

### Frontend

Archivos:

- `frontend/Dockerfile`
- `frontend/.dockerignore`
- `frontend/nginx.conf`

Detalle:

- Build Vite en stage Node.
- `VITE_API_BASE_URL` configurable via build arg.
- Runtime con `nginxinc/nginx-unprivileged:1.27-alpine`.
- Puerto interno `8080`.
- Fallback SPA con `try_files ... /index.html`.
- Cache para assets estaticos versionados.
- Healthcheck HTTP contra `/`.

### Compose

Archivo:

- `docker-compose.yml`

Detalle:

- Servicios `db`, `backend`, `frontend`.
- Red bridge `maps-net`.
- Volumen `pgdata` para PostgreSQL.
- Volumen `backend_uploads` para certificados subidos.
- `depends_on` por `service_healthy`.
- Healthchecks para todos los servicios.
- Defaults locales por interpolacion `${VAR:-valor}`.
- Logging rotativo `json-file`.
- Limites/reservas de recursos por servicio.

---

## Decisiones finales

- No se agrego Portainer.
- No se automatizo `prisma migrate deploy` en el arranque del backend.
- No se agrego reverse proxy unico para `/api`; el frontend dockerizado usa por defecto `http://localhost:3000/api/v1`.
- No se modificaron contratos de API ni codigo funcional de producto.

---

## Verificacion pendiente

Por pedido operativo, no se ejecutaron comandos de terminal durante esta implementacion. Quedan recomendados:

```bash
docker compose build
docker compose up -d
docker compose ps
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run db:seed
curl http://localhost:3000/api/v1/health
curl http://localhost:8080
```

Tambien conviene probar en navegador:

- `http://localhost:8080`
- refresh directo en rutas React Router.
- login con credenciales de seed luego de migrar y seedear.

---

## Riesgos residuales

- La primera inicializacion de base sigue requiriendo migracion/seed explicitos.
- El valor de `VITE_API_BASE_URL` se fija en build time.
- Los secretos por defecto del compose son solo de desarrollo.
- No hay HTTPS ni configuracion de dominio productivo.
