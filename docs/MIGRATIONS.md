# Migraciones y base de datos

Guia para trabajar con Prisma, migraciones, seed y PostgreSQL en MAPS Asesores.

---

## Fuente de verdad

El modelo de datos vive en:

```text
backend/prisma/schema.prisma
```

Las migraciones versionadas viven en:

```text
backend/prisma/migrations/
```

El seed vive en:

```text
backend/prisma/seed.ts
```

Regla: las migraciones generadas deben commitearse. Son parte del codigo fuente.

---

## Prisma Client (`prisma generate`)

El codigo TypeScript del backend importa tipos y queries desde `@prisma/client`, generados a partir de `schema.prisma`. Sin este paso, `npm run typecheck` y `npm run build` pueden fallar aunque el schema este correcto.

### Cuando ejecutarlo

- Tras clonar el repo y `npm install` en `backend/`.
- Tras `git pull` que incluya cambios en `schema.prisma` o migraciones nuevas.
- Antes de typecheck/build local si aparecen errores de tipos Prisma desactualizados.

### Comando

Desde `backend/`:

```bash
npm run prisma:generate
# equivalente: npx prisma generate
```

Dentro del contenedor backend (raro salvo rebuild parcial):

```bash
docker compose exec backend npx prisma generate
```

### Por que no hay `postinstall` en el repo

CI invoca `prisma migrate deploy` explicitamente. Docker genera el client en el stage de build del `Dockerfile`. Un `postinstall` global podria ejecutarse en contextos sin schema o duplicar trabajo en pipelines; se prefiere documentar el paso y el script `prisma:generate`.

`prisma migrate dev` tambien ejecuta `generate` al final; `migrate deploy` aplica SQL pero **no sustituye** tener el client al dia en el entorno de desarrollo del host.

---

## Entornos

### Desarrollo con Docker

El compose local levanta PostgreSQL como servicio `db`.

Dentro de la red Docker, el backend usa:

```env
DATABASE_URL=postgresql://postgres:postgres@db:5432/maps_asesores_dev
```

Desde la maquina host, si se corre Prisma fuera del contenedor, usar:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/maps_asesores_dev
```

### CI

GitHub Actions levanta un PostgreSQL efimero y aplica migraciones con `prisma migrate deploy`.

---

## Crear una migracion nueva

Usar este flujo cuando se modifica `schema.prisma` y se necesita crear una migracion nueva.

Desde `backend/`:

```bash
npx prisma migrate dev --name nombre_descriptivo
```

Ejemplo:

```bash
npx prisma migrate dev --name add_productor_certificaciones
```

Este comando:

1. Compara el schema actual contra la base de desarrollo.
2. Crea una carpeta nueva en `backend/prisma/migrations/`.
3. Aplica la migracion en la base local.
4. Ejecuta `prisma generate`.

Buenas practicas:

- Usar nombres descriptivos en snake_case.
- Revisar el SQL generado antes de commitear.
- No mezclar cambios de schema no relacionados en una misma migracion.
- No editar una migracion que ya fue aplicada por otros desarrolladores salvo acuerdo explicito.

---

## Aplicar migraciones existentes

Usar este flujo cuando la migracion ya existe en Git y solo hay que aplicarla.

Desde el contenedor backend:

```bash
docker compose exec backend npx prisma migrate deploy
```

Desde la maquina host:

```bash
cd backend
npx prisma migrate deploy
```

`migrate deploy`:

- No crea migraciones nuevas.
- No abre prompts interactivos.
- Aplica migraciones pendientes.
- Es apropiado para Docker, CI, staging y produccion.

---

## Seed

El seed carga datos iniciales para desarrollo y pruebas manuales.

Desde el contenedor backend:

```bash
docker compose exec backend npm run db:seed
```

Desde la maquina host:

```bash
cd backend
npm run db:seed
```

El comando usa la configuracion de `backend/package.json`:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

Por eso, en el contenedor de desarrollo el backend conserva dev dependencies disponibles.

---

## Reset local

Para resetear la base de Docker y borrar datos persistidos:

```bash
docker compose down -v
docker compose up -d --build
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run db:seed
```

Advertencia: `docker compose down -v` borra el volumen de PostgreSQL.

Desde host, si se quiere resetear con Prisma:

```bash
cd backend
npx prisma migrate reset
```

Advertencia: `migrate reset` borra datos de la base apuntada por `DATABASE_URL`.

---

## Drift y conflictos

Problemas comunes:

- Dos ramas agregan migraciones en paralelo.
- Se edita manualmente una migracion ya aplicada.
- La base local tiene cambios manuales que no existen en Prisma.
- `DATABASE_URL` apunta a una base distinta a la esperada.

Recomendaciones:

- Coordinar cambios sobre `schema.prisma`.
- Hacer `git pull` antes de crear migraciones.
- No editar migraciones aplicadas por otros.
- Si es desarrollo local y hay drift, preferir resetear la base.
- Antes de borrar datos, confirmar que no hay informacion local importante.

---

## Comandos utiles

Desde `backend/`:

```bash
npm run prisma:generate
npm run db:migrate
npm run db:seed
npm run prisma:studio
```

Desde la raiz con Docker:

```bash
docker compose ps
docker compose logs db
docker compose logs backend
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run db:seed
```

---

## Decision actual

El backend no ejecuta migraciones automaticamente al arrancar.

Motivo:

- Evitar mutaciones implicitas de base de datos en cada restart.
- Mantener visible cuando se altera el schema.
- Facilitar un futuro servicio one-shot `migrate` si el equipo lo decide.

Si mas adelante se busca un `docker compose up` completamente inicializable desde cero, se recomienda agregar un servicio dedicado de migraciones/seed en lugar de esconderlo en el comando principal del backend.
