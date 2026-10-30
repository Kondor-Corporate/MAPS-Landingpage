# R6 — Automatización de releases y operación de producción

Plan de implementación. Este documento no autoriza builds, `terraform apply`, cambios de IAM ni despliegues. El relevamiento del repositorio es del 28/10/2026, sobre `chore/r6-release-operations`. R6-B.1 agrega la configuración de construcción y no la ejecuta.

La operación vigente sigue en [`GCP_PRODUCTION_RUNBOOK.md`](./GCP_PRODUCTION_RUNBOOK.md). La topología de staging sigue en [`GCP_STAGING_RUNBOOK.md`](./GCP_STAGING_RUNBOOK.md).

## Inventario confirmado

El equipo confirmó este inventario. Este bloque no volvió a consultar GCP ni abrió el state de Terraform.

| | Producción | Staging |
|--|------------|---------|
| Proyecto | `maps-prod-landing-page` | `maps-staging-landing-page` |
| Artifact Registry | `maps-prod` | `maps-staging` |
| Imágenes que ya existen | `backend`, `backend-jobs`, `frontend` | Las suyas, en `maps-staging`. No están inventariadas por nombre en este repo. |
| Cloud Run | `maps-prod-backend`, `maps-prod-frontend` | `maps-staging-backend`, `maps-staging-frontend` |
| Jobs | `maps-prod-migrate`, `maps-prod-bootstrap` | `maps-staging-migrate`, `maps-staging-bootstrap` |

Las revisiones de los dos entornos están Ready. Cada uno usa imágenes de su propio repositorio. Decisión provisional de este bloque: las cuatro variantes de build se publican en `maps-prod`, con los nombres `backend`, `backend-jobs`, `frontend` y `frontend-staging`. La última todavía no existe; el primer build real la crea. No se configuran accesos entre staging y producción. Staging sigue leyendo `maps-staging`.

La rama predeterminada del repositorio es `main`. Sigue desactualizada: no es ancestro de `development`, tiene 1 commit que `development` no contiene, y `development` va 209 commits adelante. No se cambia la rama predeterminada y no se publica desde `main` sin una decisión previa.

Los dos digests del frontend productivo son la misma imagen. No hay drift demostrado. Terraform y la configuración del servicio referencian el índice OCI `sha256:27af01940675134c5595631a85febe35d88534a0bbe9147037db6139c15d3465`. Ese índice contiene el manifiesto `linux/amd64` `sha256:3792e9cb6dd59eae18980119d823f022e4af84f84389326d0efa0be468d3e721`. Cloud Run ejecuta ese manifiesto, y la revisión `maps-prod-frontend-00002-zf8` recibe el 100 % del tráfico. El pipeline guarda `image_summary.digest`: en una imagen con índice, ese valor es el índice, la misma clase de referencia que Terraform ya usa.

## Objetivo y alcance

R6 deja un camino reproducible para publicar un commit ya validado: construir las imágenes, guardar el SHA y los digests, ensayar esa versión en staging, promoverla a producción con aprobación, migrar cuando corresponda, verificar el resultado y poder volver a la versión anterior.

Dentro de R6:

- orquestación con GitHub Actions;
- construcción con Cloud Build y la cuenta `maps-prod-build` ya declarada;
- publicación en el Artifact Registry `maps-prod`;
- despliegue de producción por digests, con Terraform como fuente de la revisión de Cloud Run;
- ejecución controlada de `maps-prod-migrate`;
- rollback por digest;
- limpieza de Artifact Registry, primero solo en simulación.

Fuera de R6:

- apuntar el DNS o validar los certificados;
- smoke tests públicos y la comprobación de `TRUST_PROXY=2` con tráfico real;
- uptime checks públicos y Billing anomaly detection;
- recrear el proyecto, los usuarios SQL o el bootstrap;
- cambiar la topología de staging a la de producción;
- pruebas de carga.

## Arquitectura actual verificada

### Ya está implementado

| Pieza | Evidencia | Qué hace hoy |
|-------|-----------|--------------|
| CI | `.github/workflows/ci.yml` | En push a `main`, `master` y `development`, y en todo pull request. Jobs `backend`, `frontend` y `e2e`. Node 22. `prisma migrate deploy` contra Postgres efímero. No construye imágenes, no autentica contra GCP y no declara `permissions` ni `environment`. |
| Imagen backend | `backend/Dockerfile` | `runner` escucha en 8080, health en `/api/v1/health`, sin Prisma CLI ni migraciones. `jobs` incluye CLI, `schema.prisma` y `prisma/migrations`, y su comando por defecto es `npm run db:migrate:deploy`. No copia el seed. |
| Imagen frontend | `frontend/Dockerfile`, `frontend/vite.config.ts` | `VITE_*` entran como `ARG`/`ENV` del stage `build` y quedan en el bundle. El stage `runner` solo recibe el `dist`. `BACKEND_ORIGIN` es runtime de Nginx. |
| Contrato de build de producción | `docs/GCP_PRODUCTION_RUNBOOK.md`, sección «Deploys posteriores» | Construir, subir, copiar el digest, `terraform plan`, revisar, `terraform apply` manual, migrar si hace falta, smoke de la fase 6. El propio runbook dice que la promoción inmutable, la limpieza y las release operations no están implementadas. |
| Cloud Build preparado | `infra/terraform/environments/production/locals.tf`, `modules/storage/main.tf`, `modules/iam/main.tf`, `environments/production/README.md`, `backend/cloudbuild.yaml`, `frontend/cloudbuild.yaml` | API `cloudbuild.googleapis.com` habilitada. Bucket `maps-prod-landing-page-build-source`, objetos borrados a los 7 días. `maps-prod-build` tiene `roles/logging.logWriter`, `roles/storage.objectViewer` solo en ese bucket y `roles/artifactregistry.writer` en el repositorio. Los yaml de R6-B.1 todavía no se enviaron. No hay triggers. |
| Contexto de build | `backend/.gcloudignore`, `frontend/.gcloudignore`, `.gcloudignore` | El submit documentado sale de `backend/` o `frontend/`. Esos ignore excluyen `.git`, `.env*` y credenciales. El SHA no puede leerse desde el contexto: tiene que inyectarlo quien dispara el build. |
| Registry | `modules/artifact-registry/main.tf` y el inventario | Repositorio Docker `maps-prod` en `southamerica-east1`, sin política de limpieza. Imágenes ya existentes: `backend`, `backend-jobs` y `frontend`. Staging tiene otro repositorio, `maps-staging`. |
| Digests obligatorios | `environments/production/variables.tf` | `frontend_image`, `backend_image` y `jobs_image` tienen que terminar en `@sha256:` y 64 hexadecimales. Un tag no pasa la validación. |
| Runtime de producción | `environments/production/main.tf`, `modules/runtime-services/main.tf`, `modules/runtime-jobs/main.tf` | Servicios `maps-prod-frontend` y `maps-prod-backend`, ingress solo desde el balanceador. Jobs `maps-prod-migrate` y `maps-prod-bootstrap`. Los dos jobs usan la variable Terraform `jobs_image`; la imagen en el registry se llama `backend-jobs`. Terraform no ejecuta los jobs. Migrate: una tarea, paralelismo 1, reintentos 0. Bootstrap fija `BOOTSTRAP_ADMIN_FORCE=false`. |
| Secretos | `modules/iam/main.tf` | Seis contenedores. Las revisiones usan versión numérica. `maps-prod-build` no es accessor de ningún secreto. |
| State | `environments/production/backend.tf`, `terraform.tfvars` | Backend GCS con prefijo `terraform/production`. El bucket no está en Git. `terraform.tfvars` está vacío: los digests aplicados no están versionados. |
| Staging | Inventario confirmado y `docs/GCP_STAGING_RUNBOOK.md` | Proyecto `maps-staging-landing-page`. Registry `maps-staging`. Servicios `maps-staging-frontend` y `maps-staging-backend`. Jobs `maps-staging-migrate` y `maps-staging-bootstrap`. La carpeta Terraform de staging sigue vacía. El runbook de staging, revisado el 2026-09-01, no nombra estos recursos; el inventario los confirma. |

El runbook de staging todavía dice que CI no ejecuta los tests de frontend. `.github/workflows/ci.yml` sí los ejecuta, junto con el E2E. Esa frase del runbook quedó vieja.

### Manual

- `gcloud builds submit`, la subida a Artifact Registry y la elección del digest.
- `terraform plan` / `terraform apply` de producción. No hay apply automático.
- `gcloud run jobs execute maps-prod-migrate`.
- El despliegue de staging, según la secuencia del runbook.
- La identidad que presenta los builds. Está aplicada desde el 28/10/2026 en `maps-prod-build-submit`.

### No existe en el repositorio

- Workload Identity Federation está aplicada en GCP desde el 28/10/2026. No hay claves JSON. Las variables de GitHub están configuradas fuera del repositorio. El workflow sigue sin un trigger automático.
- Workflows de promoción o rollback.
- Environments de GitHub, revisores obligatorios o el binding para que staging lea `maps-prod`.
- Un manifiesto ya generado. El workflow lo armaría como artifact, y todavía no corrió.
- Política de limpieza de Artifact Registry.

## Decisiones propuestas

1. **GitHub Actions orquesta y Cloud Build construye.** CI ya vive en Actions. Cloud Build ya tiene API, cuenta, bucket, logs `CLOUD_LOGGING_ONLY` y escritura en `maps-prod`. Actions se autentica con Workload Identity Federation, dispara el submit y se queda con los digests. No se agregan Cloud Deploy, triggers de Cloud Build ni un conector GitHub–Cloud Build.

   Alternativas, y por qué no son la base:

   | Camino | Límite |
   |--------|--------|
   | Construir en el runner de Actions y hacer push | No usa `maps-prod-build` ni el bucket ya creados, y alarga los minutos del runner. |
   | Triggers de Cloud Build conectados al repo | Otra integración, y la aprobación queda peor resuelta que un environment de GitHub. |
   | Cloud Deploy | Servicio nuevo para un caso que Terraform y los digests ya cubren. El frontend no se promociona como una sola imagen. |

2. **El commit que se puede construir tiene que estar en `development` y tener el CI en verde.** La rama predeterminada sigue siendo `main`. El workflow no la cambia y no la usa como origen del código. GitHub solo ofrece `workflow_dispatch` cuando el archivo del workflow está en la rama predeterminada, así que desde `chore/r6-release-operations` o desde `development` ese disparo no está disponible. No se agrega un `push` para saltarse esa limitación.

3. **Backend y `backend-jobs` se pueden construir una vez por SHA.** La configuración de runtime la pone Cloud Run, no la imagen. Reutilizar el mismo digest en staging y producción es posible, pero hoy cada proyecto tiene su registry y sus revisiones Ready apuntan al suyo. Cómo compartir el artefacto —copia por digest o lectura entre proyectos— queda pendiente. No se asume que el service agent de staging pueda leer `maps-prod`.

4. **El frontend se construye dos veces desde el mismo SHA.** No se promociona la imagen de staging a producción.

   | Build | `VITE_API_BASE_URL` | `VITE_PUBLIC_INDEXING` | `VITE_PUBLIC_SITE_URL` |
   |-------|---------------------|------------------------|------------------------|
   | Staging | `/api/v1` | `false` | vacío, salvo que se confirme otro origen |
   | Producción | `/api/v1` | `true` | `https://mapsasesores.com.ar` |

   `vite.config.ts` escribe `robots` y el canónico en `index.html` durante el build. Con indexación apagada el HTML queda `noindex,nofollow`. El Dockerfile ya declara esos `ARG`; el default de indexación es `false` y el de la URL es vacío. `VITE_MAPS_WHATSAPP_NUMBER` queda fuera del build mientras no se confirme: si falta, el botón de Login sigue deshabilitado. Si más adelante se inyecta, entra como variable del pipeline, no como valor en Git, y el manifiesto anota solo si iba presente.

   `BACKEND_ORIGIN` no obliga a otra imagen: en staging Nginx proxea `/api/` y en producción el balanceador enruta `/api` antes de Nginx. Es variable de la revisión, no del bundle.

5. **Cada build deja un manifiesto.** Actions lo publica como artifact del workflow y, al cerrar una promoción, como resumen del deployment de GitHub. No se commitea y no reemplaza al state. Campos: SHA, ref, URL del CI, IDs de Cloud Build, digest de cada imagen y los `VITE_*` usados. La imagen lleva la etiqueta OCI `org.opencontainers.image.revision` con ese SHA. El workflow falla si la etiqueta no coincide con el SHA que envió, o si el `index.html` de producción no contiene `index,follow` y `https://mapsasesores.com.ar/`, o si el de staging contiene `index,follow`.

6. **Producción se actualiza con Terraform, aplicando el plan revisado.** Las variables siguen siendo digests. El workflow de promoción todavía no existe. Cuando exista, muestra el plan, exige el environment `production` y aplica ese plan. Un control rechaza el plan si cambia recursos distintos de `maps-prod-frontend`, `maps-prod-backend`, `maps-prod-migrate` y `maps-prod-bootstrap`. El job de bootstrap puede cambiar de plantilla porque comparte `jobs_image` (imagen `backend-jobs`); el pipeline no lo ejecuta.

7. **Las migraciones corren antes de cambiar el tráfico de la aplicación.** `prisma migrate deploy` solo avanza y es idempotente. Si entre el SHA que está en producción y el SHA nuevo hay archivos nuevos en `backend/prisma/migrations/`:

   1. Apply con el `jobs_image` nuevo (imagen `backend-jobs`) y los digests anteriores de frontend y backend.
   2. `gcloud run jobs execute maps-prod-migrate` con `--wait`. Si falla, no se sigue.
   3. Apply de `frontend_image` y `backend_image`.

   Si no hay migraciones nuevas, un solo apply alcanza. El primer release automático no tiene manifiesto previo: en ese caso se ejecuta migrate una vez, porque un deploy repetido no reaplica migraciones ya registradas. El SHA que hoy está desplegado hay que anotarlo cuando se confirme, para no depender siempre de esa excepción.

   Contrato para poder volver atrás la aplicación: la migración nueva tiene que ser compatible con la revisión que todavía atiende. Una migración que rompa esa revisión se marca en el manifiesto como ruptura. Ahí el rollback de imágenes no alcanza y la recuperación es la del runbook: restaurar en otra instancia, validar y recién después apuntar la aplicación.

8. **La limpieza nace en simulación.** `cleanup_policy_dry_run = true` hasta revisar un ciclo real. No se borran imágenes en R6.

## Diferencias que el pipeline tiene que respetar

| | Staging | Producción |
|--|------------|------------|
| Proyecto | `maps-staging-landing-page` | `maps-prod-landing-page` |
| Registry | `maps-staging`, propio | `maps-prod`, propio |
| Cloud Run | `maps-staging-frontend`, `maps-staging-backend` | `maps-prod-frontend`, `maps-prod-backend` |
| Jobs | `maps-staging-migrate`, `maps-staging-bootstrap` | `maps-prod-migrate`, `maps-prod-bootstrap` |
| Imágenes ya existentes | En `maps-staging`. Los nombres no están en el repo. | `backend`, `backend-jobs`, `frontend` |
| Imagen nueva posible | `frontend-staging`. El registry de destino sigue pendiente. | El build indexable sigue llamándose `frontend` |
| IaC en este repo | No | `environments/production/` |
| Tráfico | Frontend público; Nginx proxea `/api/*` | Balanceador; `/api` va al backend; ingress de Cloud Run solo desde el balanceador |
| `TRUST_PROXY` | `1`, según el runbook | `2`, pendiente de tráfico real |
| Frontend | `VITE_PUBLIC_INDEXING=false` | `true` y `https://mapsasesores.com.ar` |
| Base | La de staging. El runbook no autoriza seed demo | `maps_asesores_prod`. 20 migraciones ya aplicadas al 27/10/2026 |
| Verificación HTTP pública | Posible contra el origen que staging ya publica | El dominio oficial todavía no apunta a `136.110.128.230` |

Staging y producción pueden convivir. R6 no apaga staging.

## Diseño del pipeline

```text
CI verde en un SHA de development
        │
        ▼
wif-guard: sin variables de WIF, el workflow termina aquí
        │
        ▼
Cloud Build, como maps-prod-build, logs solo en Cloud Logging
  backend         target runner     imagen backend
  backend         target jobs       imagen backend-jobs
  frontend        indexación off    imagen frontend-staging
  frontend        indexación on     imagen frontend
        │
        ▼
Digests leídos de Artifact Registry maps-prod
Manifiesto como artifact. No hay deploy.
        │
        ▼
Compartir con staging: pendiente
  (staging hoy lee maps-staging, no maps-prod)
        │
        ▼
Aprobación del environment production          (R6-C, todavía no)
        │
        ▼
terraform plan acotado a Cloud Run
  migrate primero, si corresponde
  después frontend y backend
```

El grupo de concurrencia del build es `maps-release-build-<sha>`, con `cancel-in-progress: false`. El de promoción, cuando exista, sigue siendo `maps-prod-release`. El lock del state en GCS cubre el apply.

Verificación de un despliegue de producción, en este orden, cuando R6-C exista:

1. El job de migrate, si corrió, terminó en cero.
2. Las revisiones nuevas de Cloud Run están Ready y su imagen es el digest del manifiesto.
3. Cuando el dominio y el certificado respondan: `/`, `/api/v1/health`, login y el recorrido de la fase 6 que toque el cambio.
4. El deployment de GitHub queda con estado success o failure, el SHA y los tres digests de producción.

Hasta que el DNS exista, el paso 3 se registra como pendiente.

Nombres bajo `southamerica-east1-docker.pkg.dev/maps-prod-landing-page/maps-prod/`:

| Imagen | Estado | Target o args |
|--------|--------|----------------|
| `backend` | Ya existe | `runner` |
| `backend-jobs` | Ya existe | `jobs` |
| `frontend` | Ya existe | `VITE_PUBLIC_INDEXING=true` y `https://mapsasesores.com.ar` |
| `frontend-staging` | No existe todavía | `VITE_PUBLIC_INDEXING=false` y sin URL canónica |

El tag de build es el SHA completo. No se publica `latest`. Si ese tag ya existe y la etiqueta OCI coincide con el SHA, el build no vuelve a hacer push. Terraform sigue recibiendo `@sha256`, el digest del tag. Los tags `prod-current` y `prod-previous` quedan para la retención de R6-D.

Las cuatro variantes salen hacia `maps-prod`. El manifiesto lo registra como `publish_to: maps-prod` y `sharing_between_projects: not_configured`. Eso no concede a staging permiso de lectura ni mueve Cloud Run. Cómo staging consumirá después esas imágenes sigue sin configurar.

Archivos de R6-B.1, sin ejecutar:

- `backend/cloudbuild.yaml`
- `frontend/cloudbuild.yaml`
- `.github/workflows/release-build.yml`

Siguen sin existir `release-promote.yml` y `release-rollback.yml`.

`.dockerignore` viaja en el fuente. Si `.gcloudignore` lo excluye, Docker no lo ve y el marcador `.maps-existing-digest` entra al contexto. El bucket sigue sin recibir `.env`, claves ni `node_modules`, porque eso lo excluye `.gcloudignore`.

`workflow_dispatch` no está disponible desde la rama actual. GitHub solo dispara ese evento si el archivo está en la rama predeterminada, que es `main`. No hay otro trigger. Mergear este archivo a `development` no lo ejecuta. Las variables `GCP_WORKLOAD_IDENTITY_PROVIDER` y `GCP_BUILD_SERVICE_ACCOUNT` ya están en GitHub y no en el repositorio. El workflow igual se detiene si alguien las borra.

El digest no sale del tag. El step `digest`, en la imagen `gcr.io/cloud-builders/gcloud`, lee `image_summary.digest`. El workflow lo vuelve a leer con el mismo campo y el manifiesto guarda `imagen@sha256:…`. La etiqueta OCI `org.opencontainers.image.revision` se agrega con `docker build --label`, sin tocar los Dockerfiles. Un build repetido del mismo SHA reutiliza el tag si esa etiqueta coincide, y falla si el tag apunta a otra revisión.

## R6-B.2 — Identidad federada

El código está en `infra/terraform/modules/build-identity` y el root de producción lo compone. El 28/10/2026 un apply dirigido creó 13 recursos y no modificó ni eliminó ninguno. Cloud Run no cambió. Todavía no hubo un build automático.

Hay tres identidades distintas:

| Identidad | Qué es | Qué hace |
|-----------|--------|----------|
| Token OIDC de GitHub | El repositorio `Kondor-Corporate/MAPS-Landingpage` | GitHub lo emite solo para el job que pide `id-token: write`. No es una clave. |
| `maps-prod-build-submit` | Cuenta nueva, solo para presentar builds | El workflow la impersona. Crea el build, sube el contexto y lee digests. No construye y no despliega. |
| `maps-prod-build` | Cuenta ya declarada en Terraform | Ejecuta Cloud Build. Ya tiene `roles/artifactregistry.writer` en `maps-prod`, `roles/logging.logWriter` y `roles/storage.objectViewer` en el bucket de fuentes. No recibe el binding de Workload Identity. |

APIs. `cloudbuild.googleapis.com`, `iam.googleapis.com`, `artifactregistry.googleapis.com` y `storage.googleapis.com` ya estaban en `locals.tf`. R6-B.3 agrega `iamcredentials.googleapis.com` y `sts.googleapis.com` a esa lista. Habilitarlas forma parte del apply dirigido, no de un apply completo.

Recursos propuestos, en `maps-prod-landing-page`:

| Recurso | Id propuesto |
|---------|----------------|
| Pool | `maps-github`, location `global` |
| Provider | `github`, issuer `https://token.actions.githubusercontent.com` |
| Cuenta que presenta builds | `maps-prod-build-submit` |

El provider compara los IDs numéricos de GitHub, el archivo `release-build.yml`, la rama de ese archivo y `event_name`. No compara `inputs.git_sha` ni `assertion.sha`: ese claim es la punta de la rama, no el commit pedido. `job_workflow_ref` no entra en la condición: GitHub lo documenta para workflows reutilizables, y `release-build.yml` no lo es. Si el claim falta, exigirlo rechazaría el token válido.

```text
assertion.repository_owner_id == '266150176'
&& assertion.repository_id == '1174729313'
&& assertion.event_name == 'workflow_dispatch'
&& (
  (assertion.workflow_ref == 'Kondor-Corporate/MAPS-Landingpage/.github/workflows/release-build.yml@refs/heads/main' && assertion.ref == 'refs/heads/main')
  || (assertion.workflow_ref == 'Kondor-Corporate/MAPS-Landingpage/.github/workflows/release-build.yml@refs/heads/development' && assertion.ref == 'refs/heads/development')
)
```

Esos IDs son los de la organización `Kondor-Corporate` (`266150176`) y del repositorio `MAPS-Landingpage` (`1174729313`). Están fijos en el módulo. Una rama de feature no obtiene token aunque copie el archivo. El SHA que se construye lo sigue validando el workflow contra `development`.

El binding `roles/iam.workloadIdentityUser` va sobre `maps-prod-build-submit`, no sobre `maps-prod-build`, para el principal `attribute.repository_id/1174729313` del pool `maps-github`. El número de proyecto sale del nombre del pool cuando se crea. No se escribe a mano.

Permisos de `maps-prod-build-submit`, todos acotados al recurso:

| Permiso | Dónde | Para qué |
|---------|-------|----------|
| `cloudbuild.builds.create`, `cloudbuild.builds.get` y `serviceusage.services.use` | proyecto, rol custom `mapsCloudBuildSubmitter` | Presentar el build, leer su estado y llamar APIs ya habilitadas. `builds.create` también permite crear un trigger; no hay un permiso más chico. El trigger igual solo puede actuar como `maps-prod-build`. |
| `roles/iam.serviceAccountUser` | solo `maps-prod-build` | `iam.serviceAccounts.actAs` para que el build corra como esa cuenta. |
| `roles/storage.objectCreator` y `roles/storage.objectViewer` | solo `maps-prod-landing-page-build-source` | Subir y releer el contexto. No hace falta borrar objetos: el nombre de cada subida es único y el bucket ya los borra a los 7 días. |
| `artifactregistry.dockerimages.get`, `repositories.get`, `tags.get` y `versions.get` | solo el repositorio `maps-prod`, rol custom `mapsArtifactDigestReader` | Resolver `image_summary.digest`. No incluye descarga de blobs ni escritura. La escritura sigue en `maps-prod-build`. |

No recibe `roles/owner`, `roles/editor`, `roles/cloudbuild.builds.editor`, escritura en Artifact Registry, Secret Manager, Cloud Run, Cloud SQL ni `serviceAccountUser` sobre la cuenta default de Cloud Build, `maps-prod-frontend`, `maps-prod-backend`, `maps-prod-migrate` o `maps-prod-bootstrap`. Un `cloudbuild.yaml` que borre `serviceAccount` no debe poder correr con la cuenta default: el workflow rechaza un archivo que no fije `maps-prod-build`, y el alta no le da `actAs` sobre ninguna otra.

`maps-prod-build` no gana roles en R6-B.2. Ya puede leer el fuente, escribir el registry y escribir logs con `CLOUD_LOGGING_ONLY`.

Variables de repositorio en GitHub, no secretos y no claves JSON:

| Variable | Valor |
|----------|-------|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Configurada en GitHub el 28/10/2026. Es el output `workload_identity_provider`, con la forma `projects/998773244006/locations/global/workloadIdentityPools/maps-github/providers/github`. |
| `GCP_BUILD_SERVICE_ACCOUNT` | Configurada en GitHub. Es `maps-prod-build-submit@maps-prod-landing-page.iam.gserviceaccount.com`, no `maps-prod-build`. |

El workflow ya lee esos nombres y se detiene si faltan o si la forma no es la de un provider y una cuenta. No trae los ids puestos.

Antes del apply se leyó la política del proyecto, la de la organización y la de la cuenta predeterminada `998773244006-compute@developer.gserviceaccount.com`. No tenía roles directos ni `actAs`. Cloud Asset API sigue apagada, así que no hubo un inventario de cada recurso. La federación igual quedó aplicada porque el submitter no puede actuar como esa cuenta.

## Seguridad y permisos

El módulo de identidad está aplicado desde el 28/10/2026. No hay claves JSON. El diseño de la cuenta que presenta los builds está en la sección anterior.

La cuenta de deploy, recién en R6-C, queda separada de la de builds:

| Cuenta | Uso | Permiso que necesita | Permiso que no recibe |
|--------|-----|----------------------|------------------------|
| Deploy | Plan, apply y execute de migrate | Leer y escribir el bucket de state. Leer el stack para el refresh. Actualizar solo los dos servicios y los dos jobs. Ejecutar `maps-prod-migrate`. | Accessor de secretos. Administrar Cloud SQL, IAM o el balanceador. Ejecutar `maps-prod-bootstrap`. `roles/owner` y `roles/editor`. |

`maps-prod-build` se queda como está: writer del registry, logs y lectura del bucket de fuentes.

El apply refresca todo el state, así que la cuenta de deploy necesita lectura del stack aunque solo cambien imágenes. El conjunto fino sale del primer `terraform plan` con esa identidad: se agregan los permisos que ese plan pida y no se parte de un rol de administración. Los 403 de esa prueba son el criterio, no un rol amplio “por las dudas”.

Producción:

- Environment `production` con revisores obligatorios. El job de apply es el que lo exige; el build puede correr antes.
- El plan se lee en el resumen del workflow. El archivo de plan se trata como el state: artifact de corta vida, sin commitearlo ni pegarlo en el chat.
- Se aplica ese plan, no un apply suelto generado otra vez sin comparar.
- Si el plan toca algo fuera de los cuatro recursos de Cloud Run, el workflow falla antes de la aprobación.
- Cambios de Terraform que no sean un release de imágenes siguen el runbook: plan humano y apply humano. R6 no automatiza ese camino.

Secretos de aplicación: siguen en Secret Manager, versión numérica, fuera del repositorio y fuera de los logs del workflow. Las variables de Terraform no sensibles que hoy no están en Git (ID de proyecto ya público en el runbook, origen, bucket de state, versiones numéricas) entran como variables del environment. El nombre del bucket de state no se escribe en el repo.

Staging, cuando se automatice, usa otro environment y otra identidad. Leer `maps-prod` desde `maps-staging-landing-page` sigue sin configurar. El reader de la cuenta que presenta builds está descrito en R6-B.2 y tampoco se crea aquí.

## Rollback

El registro de lo aplicado es el deployment exitoso de GitHub más el manifiesto: SHA, tres digests de producción, si corrió migrate y si la migración era compatible con la revisión anterior.

Volver atrás:

1. Elegir un deployment exitoso anterior. El workflow de rollback solo acepta digests que figuren ahí.
2. Misma aprobación de `production` y el mismo grupo de concurrencia.
3. `terraform plan` con esos digests. Mismas reglas: solo Cloud Run, y se aplica el plan guardado.
4. No se ejecuta migrate hacia atrás. Prisma no tiene ese paso en este proyecto.
5. Comprobar que las revisiones Ready usan otra vez esos digests.

Si el manifiesto de la versión que se abandona dice que la migración no era compatible con el código anterior, el rollback de imágenes se detiene. La recuperación es la sección «Backups y recuperación» del runbook de producción: restaurar en una instancia nueva, validar y cambiar la URL con una versión nueva de Secret Manager.

Cloud Run conserva revisiones anteriores. El procedimiento de R6 igual pasa por Terraform, para que el state y la revisión no queden distintos. Un cambio de tráfico hecho a mano en la consola queda como excepción de emergencia y tiene que seguirlo un apply con los mismos digests.

## Limpieza de imágenes

Hoy el módulo `artifact-registry` no define cleanup. El bucket de fuentes sí borra a los 7 días; eso no toca imágenes.

Política a introducir en R6-D, con simulación activada:

- conservar cualquier digest etiquetado `prod-current` o `prod-previous`;
- conservar las etiquetas `release-<sha>` de las versiones que sigan dentro de la ventana de rollback (propuesta: las últimas cinco promociones exitosas de cada imagen);
- marcar como candidatas a borrar las imágenes sin etiqueta y más viejas de 30 días;
- `cleanup_policy_dry_run = true`.

Antes de salir de la simulación hay que etiquetar los digests que producción usa hoy. El pasaje a borrado real es un cambio posterior, con el informe de simulación ya revisado, y no forma parte de cerrar R6.

No se eliminan imágenes en ninguno de estos bloques.

## Bloques

### R6-A — Plan

Entregable: este documento.

Hecho cuando el equipo confirma o corrige las decisiones abiertas de la sección siguiente. No incluye workflows ni cambios de GCP.

### R6-B — Construcción y manifiesto

**Estado (30/10/2026):** R6-B cerrado en operación. El Release build #6 (`40992146277`) terminó en success para el SHA `274a938e483e0474ab5d4bf8f344a8387690c6d0`, publicó cuatro imágenes en `maps-prod` y dejó el artifact `release-manifest-<sha>`.

R6-B.1, en el repositorio y sin ejecutar:

- `backend/cloudbuild.yaml` y `frontend/cloudbuild.yaml`, con `CLOUD_LOGGING_ONLY` y `maps-prod-build`;
- `.github/workflows/release-build.yml`, que verifica el SHA, exige CI verde y corta en `wif-guard` si no hay Workload Identity Federation.

Sigue afuera de este bloque:

- crear el pool, el provider y la cuenta que hace el submit;
- poner el workflow en `main` para que GitHub permita `workflow_dispatch`;
- el primer `gcloud builds submit`.

Criterios para dar por cerrado R6-B, cuando eso se active:

- un SHA de `development` con CI verde genera cuatro digests en el registry elegido y el manifiesto los cita por `@sha256`;
- el `index.html` de `frontend` lleva `index,follow` y `https://mapsasesores.com.ar/`; el de `frontend-staging` lleva `noindex,nofollow`;
- `backend` sale del target `runner` y `backend-jobs` del target `jobs`;
- Cloud Run, los jobs y el state no cambian;
- los logs no muestran payloads de secretos.

### R6-C — Promoción, identidad y rollback

R6-C se divide en sub-bloques. Staging deja de ser un requisito obligatorio del camino de promoción: no tiene que permanecer operativo para promover a producción. Apagar o reducir staging es una tarea aparte de control de costos, no parte de R6-C1.

| Sub-bloque | Contenido |
|------------|-----------|
| **R6-C1** | Validación reutilizable del manifiesto (`scripts/release/validate-manifest.mjs`). Primera barrera estructural; **no** autoriza despliegue ni demuestra por sí sola que el artifact vino de un Release build exitoso ni que los digests existen en Artifact Registry. |
| **R6-C2** | Identidad de deploy, environment `production`, aprobación humana y comprobaciones de autenticidad del manifiesto (procedencia del artifact, coherencia con la corrida de release). |
| **R6-C3** | Workflow de promoción: `release-promote.yml`, plan revisado localmente, apply del plan en GCS, migrate si corresponde. |
| **R6-C4** | Workflow de rollback por manifiesto anterior y nota breve en el runbook de producción. |

Validación local del manifiesto (Windows PowerShell, desde la raíz del repositorio):

```powershell
node scripts/release/validate-manifest.mjs .\ruta\release-manifest.json 274a938e483e0474ab5d4bf8f344a8387690c6d0
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
```

Los tests del validador corren en CI en el job `Release manifest validator`, sin credenciales de GCP.

### R6-C2 — Autenticidad, identidad de deploy y environment

Entregables en repositorio (sin apply ni workflow de promoción):

- `scripts/release/verify-release-authenticity.mjs` y módulos `github-release-api`, `gcp-artifact-verify`, `git-development-verify`;
- tests en `verify-release-authenticity.test.mjs`;
- módulo Terraform `infra/terraform/modules/deploy-identity` (cuenta `maps-prod-deploy`, pool WIF **`maps-github-deploy`** independiente de `maps-github`);
- instrucciones del environment GitHub: [`R6_GITHUB_PRODUCTION_ENVIRONMENT.md`](./R6_GITHUB_PRODUCTION_ENVIRONMENT.md).

Capas de verificación:

| Capa | Requiere | Qué demuestra |
|------|---------|----------------|
| Local | nada | Contrato C1 + coherencia de `build_run_url` |
| GitHub API | `GH_TOKEN` | Run de `release-build.yml` exitoso, artifact `release-manifest-<sha>` en esa run, CI verde, SHA en `development` |
| git | remoto `origin` | Ancestro en `origin/development` |
| GCP | `gcloud` autenticado | Digest y etiqueta OCI `org.opencontainers.image.revision` en Artifact Registry |

El manifiesto descargado en promoción debe obtenerse del artifact de la run citada en `build_run_url`, no confiar en un JSON subido a mano.

Identidades: el provider de builds **no** se amplía. Deploy usa el pool **`maps-github-deploy`** (distinto de `maps-github`) con provider OIDC que exige `release-promote.yml` en `main`, IDs numéricos de org/repo, `workflow_dispatch` y claim **`environment=production`**. El `workloadIdentityUser` de deploy apunta solo a principals de ese pool. Ver README del módulo `deploy-identity`.

El módulo `deploy_identity` en producción **no usa `count`**: `terraform_state_bucket_name` es obligatoria en cada plan/apply (tfvars gitignored o `-var`). Omitirla debe fallar el plan, no destruir recursos en silencio.

Entregables pendientes de R6-C (conjunto):

- environment `production` con revisores (R6-C2);
- apply de `deploy_identity` en GCP y variables `GCP_DEPLOY_*` / `TF_STATE_BUCKET`;
- completar `config/release/production-baseline.json` antes de la primera promoción automática;
- workflow de rollback por manifiesto anterior (R6-C4);
- actualización breve del runbook de producción para que «Deploys posteriores» apunte a este flujo (R6-C4, parcialmente hecho en R6-C3).

### R6-C3 — Promoción controlada (implementado en repo, no ejecutado)

Archivos principales:

- `.github/workflows/release-promote.yml` — fases `verify` (sin environment) y `apply` (environment `production`, identidad deploy);
- `scripts/release/run-promotion-preflight.mjs` — descarga manifiesto desde artifact GitHub;
- `scripts/release/validate-terraform-plan.mjs` — alcance del plan;
- `config/release/production-baseline.json` — punto de recuperación R5 (completar manualmente).

**Revisión del plan (no simulada):** GitHub aprueba el job `apply` **antes** de que corra; por eso el `terraform plan` ocurre **fuera** del job protegido. El operador valida `plan.json`, sube `plan.tfplan` a GCS y dispara apply con `verify_run_id` + `plan_sha256`. El job apply vuelve a validar manifiesto, digests GCP, hash del plan y JSON del plan antes de `terraform apply plan.tfplan`.

Concurrencia: `maps-prod-release`. Prohibido `maps-prod-bootstrap`. Smoke público: pendiente DNS.

### R6-C4 — Rollback seguro (implementado en repo, no ejecutado)

Mismo workflow **`release-promote.yml`**, input `operation=rollback`:

- Registro persistente en GCS `promotion/deployments/*.json`, con `verified_manifest` del apply (el rollback no depende del artifact de 30 días).
- Baseline R5: sin `release_build_run_id`. Rollback con migraciones intermedias: **bloqueado** (sin auto-aprobación). Apply usa checkout `github.sha` (main), no el SHA de la app.
- Verify rollback (environment `production`): lee registro, valida target, manifiesto ligado al `release_build_run_id` del registro, compatibilidad Prisma (`rollback-schema-guard.mjs`).
- Apply: mismos plan/binding/SHA-256/C3; **sin migrate**; post-verify + nuevo registro.
- Concurrencia compartida `maps-prod-release`.

Scripts: `run-rollback-preflight.mjs`, `fetch-deployment-registry.mjs`, `record-deployment-outcome.mjs`, `post-deployment-verify.mjs`, tests `promotion-c4.test.mjs`.

Criterios de aceptación (ensayo en GCP pendiente):

- dos operaciones no corren en paralelo;
- rollback rechaza target no registrado, mismos digests que producción, o incompatibilidad de esquema sin aprobación;
- plan fuera de alcance (SQL, IAM, etc.) falla;
- bootstrap prohibido;
- smoke del dominio oficial sigue pendiente DNS.

### Checklist activación R6-C en GCP (Git ≠ producción lista)

| Ítem | Estado |
|------|--------|
| `deploy_identity` aplicado | Pendiente operador |
| Environment `production` + revisores | Pendiente |
| `GCP_DEPLOY_*`, `TF_STATE_BUCKET` | Pendiente |
| `MAPS_PRODUCTION_BASELINE_JSON` o baseline local | Pendiente |
| Registro R5 en GCS (`baseline` + evidencia Cloud Run) | Pendiente |
| Bucket: sin acceso público; prefijos `promotion/*` | Verificar IAM |
| Primer `release-promote` verify+plan+apply (sin DNS smoke) | Pendiente ensayo |
| Rollback de prueba contra registro real | Pendiente ensayo |

### R6-D — Retención en simulación y cierre operativo

Entregables:

- etiquetas `prod-current`, `prod-previous` y `release-<sha>` sobre los digests que hay que conservar;
- cleanup de Artifact Registry en `cleanup_policy_dry_run = true`;
- nota en el README de producción y en el runbook.

Criterios:

- el informe de simulación lista candidatas y muestra que los digests de la revisión actual y de la anterior no son candidatas;
- no se borra ninguna imagen;
- un release siguiente sigue pudiendo desplegar por digest.

## Riesgos, dependencias y confirmaciones

Confirmado:

1. Nombres de imagen en producción: `backend`, `backend-jobs`, `frontend`. `frontend-staging` se publica en el mismo `maps-prod`, y todavía no existe.
2. Servicios y jobs de los dos proyectos, y el registry `maps-staging`. No hay acceso cruzado.
3. La rama predeterminada es `main` y no se toca en este bloque.
4. Los digests `sha256:27af01940675134c5595631a85febe35d88534a0bbe9147037db6139c15d3465` y `sha256:3792e9cb6dd59eae18980119d823f022e4af84f84389326d0efa0be468d3e721` son el índice y el manifiesto `linux/amd64` de la misma imagen. La revisión `maps-prod-frontend-00002-zf8` tiene el 100 % del tráfico. No hay drift demostrado.

Sigue abierto:

1. Cómo staging consumirá las imágenes de `maps-prod`. El acceso entre proyectos no se configura en R6-B.
2. SHA de backend y jobs que Cloud Run sirve hoy, para el manifiesto base. El frontend productivo ya quedó identificado.
3. Revisores del environment `production`.
4. Si `VITE_MAPS_WHATSAPP_NUMBER` se inyecta más adelante. El build actual rechaza cualquier valor distinto de `none`.
5. Si el frontend de staging debe llevar `VITE_PUBLIC_SITE_URL` vacío. Hoy el yaml lo deja vacío.
6. Nombre del bucket de state, como variable del environment, sin entrar al repo.
7. Aceptar el contrato de migraciones compatibles con la revisión anterior. Si una migración no lo cumple, se marca como ruptura y el rollback de aplicación no se ofrece.
8. La restricción de `maps-app` sobre `_prisma_migrations` sigue sin verificar en el runbook. Migrate ya usa `maps-migrate`.
9. El primer build automático. Las variables de GitHub ya están cargadas, pero `workflow_dispatch` no existe hasta que el archivo esté en `main`. Un apply completo seguiría creando los dos uptime checks públicos y sus dos alertas.

Riesgos:

- Automatizar `terraform apply` con una cuenta amplia podría cambiar más que las imágenes. El filtro del plan y el environment son el control; hay que probarlo con un plan real en R6-C.
- El state y el archivo de plan son sensibles. No van a Git ni a los logs.
- Sin acceso entre proyectos, un digest publicado en `maps-prod` no arranca en staging. Las revisiones Ready de staging siguen en `maps-staging`.
- `workflow_dispatch` no corre desde esta rama. Copiar solo el archivo a `main` habilita el botón, y el SHA a construir igual tiene que estar en `development`. No es una autorización para publicar el árbol de `main`. El token OIDC de esa corrida lleva `ref` de la rama elegida en la UI, no el SHA del input.
- Si una de las cuatro variantes falla, las que ya hicieron push dejan un tag de SHA en el registry. Sin manifiesto completo no son un release, y Cloud Run no se entera porque nadie aplica Terraform. `fail-fast` no cancela un Cloud Build que ya empezó.
- Repetir el mismo SHA no pisa el tag si la etiqueta OCI coincide. Si el tag existe con otra revisión, el build falla. Tags inmutables del registry, si estuvieran activos, también rechazarían un push distinto.
- El primer submit real escribe el contexto en `maps-prod-landing-page-build-source`. Eso no actualiza Cloud Run.
- El primer release automático no conoce el SHA que hoy atiende producción. Una migración incompatible con la revisión anterior no se resuelve volviendo la imagen: hace falta el restore del runbook.

## Antes del go-live y con tráfico real

Puede cerrarse antes de que el dominio apunte al balanceador:

- R6-A, R6-B completo y R6-D en simulación;
- el deploy a staging, si la identidad y los nombres ya están confirmados;
- un apply de producción y la comprobación de revisiones Ready;
- el rollback ensayado contra esas revisiones;
- etiquetar los digests que producción ya usa.

Necesita el dominio, el certificado o tráfico real:

- smoke de `/`, `/api/v1/health` y el resto de la fase 6 contra `https://mapsasesores.com.ar`;
- validar `TRUST_PROXY=2` y el rate limit, como ya pide el runbook;
- crear los dos uptime checks y sus alertas;
- salir del modo simulación de Artifact Registry, recién después de ver un informe sobre un release real;
- dar por cerrada la recuperación de un rollback con usuarios en el sitio.

Esos pendientes siguen siendo del go-live y del primer mes. R6 no los adelanta.
