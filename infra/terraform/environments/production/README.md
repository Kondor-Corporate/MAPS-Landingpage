# Producción — configuración Terraform

Qué declara el root module de `infra/terraform/environments/production/`.
Cómo se despliega y opera está en
[`docs/GCP_PRODUCTION_RUNBOOK.md`](../../../../docs/GCP_PRODUCTION_RUNBOOK.md).

## Estado

**Desplegado al 27/10/2026. El 28/10/2026 se aplicó Workload Identity Federation: 13 recursos nuevos, sin cambios en Cloud Run. El sitio todavía no se ha publicado mediante el dominio oficial.**

El proyecto es `maps-prod-landing-page`, en `southamerica-east1`. Frontend y
backend están en Cloud Run. El frontend final tiene indexación habilitada y
dominio canónico. Cloud SQL PostgreSQL 17 tiene 20 migraciones aplicadas.
Hay un `SUPERADMIN` inicial. Desde staging se migraron, fuera de Terraform,
8 noticias, 10 imágenes de galería, 1 biblioteca, 20 ramos y 16 objetos de
GCS. La recuperación se probó en una instancia independiente, ya eliminada.
El backup manual de esa prueba es `1793126953962`.

El borde tiene la IP `136.110.128.230`, dos certificados HTTPS (dominio
principal y `www`) y la redirección de `www` al principal. Los certificados
están configurados y todavía no validados. El presupuesto es de 110 USD y
notifica a dos canales. Hay 18 políticas internas de monitoreo. Los dos
uptime checks públicos y sus dos políticas siguen sin crear.

La auditoría de infraestructura y la del backend quedaron aprobadas. Esa
última corrió 119 tests en 9 archivos. El detalle operativo está en el
runbook. Los nombres de más abajo son los recursos declarados. El DNS
público no apunta todavía a la IP.

Directorio de trabajo: `infra/terraform/environments/production/`.

Prefijo: `maps-prod`. Labels: `application=maps`, `environment=production`,
`managed_by=terraform`. Región: `southamerica-east1`.

## Arquitectura

Balanceador de aplicación externo global (esquema `EXTERNAL_MANAGED`, nivel
Premium). El hostname de `public_origin` es el dominio principal. `www` de
ese hostname redirige al principal.

| Ruta | Destino |
|------|---------|
| `/api` y `/api/*` | Cloud Run backend |
| El resto | Cloud Run frontend |

Los dos servicios usan `INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER`. La URL
`run.app` puede existir: `default_uri` no está deshabilitada. Con ese
ingress, el acceso directo desde Internet queda bloqueado. Terraform les da
`roles/run.invoker` a `allUsers` para que el balanceador pueda invocarlos
sin identity token.

La imagen del frontend todavía trae un proxy Nginx de `/api/` hacia
`BACKEND_ORIGIN`. En producción `BACKEND_ORIGIN` es `public_origin`, pero el
tráfico público de `/api` no pasa por ese proxy: lo elige el balanceador.
Eso no es la topología de staging.

No hay conector Serverless VPC Access ni Memorystore. El backend y los jobs
usan Direct VPC. El frontend no entra a la VPC.

## Red

| Recurso | Nombre | Detalle |
|---------|--------|---------|
| VPC | `maps-prod-vpc` | Routing regional. Sin subredes automáticas. |
| Subred | `maps-prod-serverless` | `10.20.0.0/24`. Private Google Access. |
| Rango PSA | `maps-prod-private-services` | `10.30.0.0/16`. Peering a `servicenetworking.googleapis.com`. |

Cloud SQL solo tiene IP privada, tomada de ese rango.

Direct VPC del backend y de los jobs: egress `PRIVATE_RANGES_ONLY`. El
tráfico a rangos privados (la IP de Cloud SQL) sale por la VPC. El tráfico
a Internet público, incluido Nominatim, no se fuerza por la VPC.

## Cloud Run

Ambos servicios: región `southamerica-east1`, puerto de contenedor `8080`,
timeout `60s`, mínimo `0`, máximo `3`, `cpu_idle = true`, deletion
protection activada.

| | Frontend `maps-prod-frontend` | Backend `maps-prod-backend` |
|--|-------------------------------|-----------------------------|
| CPU / memoria | 1 / 512 MiB | 1 / 1 GiB |
| Concurrencia | 80 | 40 |
| Entorno de ejecución | el default del recurso | `GEN2` |
| Startup CPU boost | no | sí |
| VPC | no | Direct VPC, `PRIVATE_RANGES_ONLY` |
| Service account | `maps-prod-frontend` | `maps-prod-backend` |

El frontend solo recibe `BACKEND_ORIGIN` = `public_origin`.

El backend recibe, en texto plano, `NODE_ENV=production`,
`JWT_EXPIRES_IN=15m`, `REFRESH_EXPIRES_IN=30d`, `ALLOW_REFRESH_BODY=false`,
`STORAGE_PROVIDER=gcs`, `GCS_BUCKET`, `API_PUBLIC_URL` y `FRONTEND_ORIGIN`
iguales a `public_origin`, `NOMINATIM_USER_AGENT`, `TZ=America/Argentina/Buenos_Aires`
y `TRUST_PROXY=2`.

`TRUST_PROXY` sale del default del módulo `runtime-services`. No es variable
del root. El comentario del módulo pide validarlo con tráfico real: el rate
limit usa `req.ip`. No se configura como `true`, porque eso confiaría en
toda la cadena `X-Forwarded-For`.

`DATABASE_URL`, `JWT_SECRET` y `REFRESH_SECRET` entran por Secret Manager
con versión numérica. No hay `REDIS_URL`. Sin esa variable el proceso usa
`MemoryStore` local y no comparte la caché de geocoding.

## Jobs

`maps-prod-migrate` y `maps-prod-bootstrap`. Los dos:

- imagen `jobs_image` (target Docker `jobs`);
- Direct VPC, egress `PRIVATE_RANGES_ONLY`, entorno `GEN2`;
- una tarea, paralelismo 1, reintentos `0`, timeout `600s`;
- 1 CPU, 512 MiB;
- deletion protection activada.

Terraform declara los jobs. No los ejecuta.

| Job | Comando | Secretos |
|-----|---------|----------|
| `maps-prod-migrate` | `npm run db:migrate:deploy` | URL de migrate |
| `maps-prod-bootstrap` | `npm run bootstrap:admin` | URL de la app, email y contraseña de bootstrap |

El job de bootstrap fija `BOOTSTRAP_ADMIN_FORCE` en `false`. No es una
variable del root. Una promoción destructiva queda fuera de este job.

La imagen de jobs no incluye `prisma/seed.ts`. No hay job de seed demo.

## Base de datos

Instancia `maps-prod-db`. Base lógica `maps_asesores_prod`.

| Ajuste | Valor |
|--------|-------|
| Motor | PostgreSQL 17 (`POSTGRES_17`) |
| Edición | Enterprise. No es Enterprise Plus. |
| Tier | `db-custom-1-3840` (1 vCPU, 3,75 GB) |
| Disponibilidad | `ZONAL`. Sin alta disponibilidad. |
| Disco | 10 GB `PD_SSD`, autoresize |
| IP | Solo privada. `ipv4_enabled = false`. |
| TLS | `ENCRYPTED_ONLY` |
| Backup | Diario, inicio `05:00` UTC, 14 retenidos |
| PITR | Activo. Logs de transacciones: 7 días. |
| Al borrar la instancia | Conserva backups. Backup final: 30 días. |
| Protección | `deletion_protection` y `deletion_protection_enabled`. La base usa `deletion_policy = PREVENT`. |

Terraform ignora cambios de `disk_size` para no pelear con el autoresize.

No crea usuarios ni contraseñas SQL. La IP privada sale en el output
`database_private_ip`.

## Storage

Un bucket regional, nombre en `assets_bucket_name`.

| Ajuste | Valor |
|--------|-------|
| Clase | `STANDARD` |
| Ubicación | `southamerica-east1` |
| Acceso uniforme | UBLA activado |
| Acceso público | `public_access_prevention = enforced` |
| Soft delete | 7 días (`604800` segundos) |
| `force_destroy` | `false` |

El backend tiene `roles/storage.objectUser` sobre ese bucket. El navegador
no lee el bucket: descarga por el API.

### Fuentes temporales de Cloud Build

Bucket aparte, ya creado: `maps-prod-landing-page-build-source`. No es el
bucket de assets ni el bucket de state de Terraform.

| Ajuste | Valor |
|--------|-------|
| Clase | `STANDARD` |
| Ubicación | La misma región del root (`southamerica-east1`) |
| Acceso uniforme | UBLA activado |
| Acceso público | `public_access_prevention = enforced` |
| Soft delete | Desactivado (`0`). No es un archivo durable. |
| Ciclo de vida | Borra objetos a los 7 días. |
| `force_destroy` | `false` |
| Lectura | `maps-prod-build` tiene `roles/storage.objectViewer` solo en este bucket. |
| Submit | `maps-prod-build-submit` tiene `roles/storage.objectCreator` y `roles/storage.objectViewer` solo en este bucket. Aplicado el 28/10/2026. |

`maps-prod-build` no puede escribir objetos ahí. La cuenta que presenta el
build sube el archivo. No recibe permiso sobre el bucket de assets.

## Secretos

Terraform crea seis contenedores, replicación automática y
`deletion_protection`. El payload y el número de versión se cargan fuera de
Terraform. Las revisiones de Cloud Run referencian una versión numérica.
No se usa `latest`.

| Secret ID | Quién lee |
|-----------|-----------|
| `maps-prod-database-url-app` | backend y job bootstrap |
| `maps-prod-database-url-migrate` | job migrate |
| `maps-prod-jwt-secret` | backend |
| `maps-prod-refresh-secret` | backend |
| `maps-prod-bootstrap-admin-email` | job bootstrap |
| `maps-prod-bootstrap-admin-password` | job bootstrap |

El rol es `roles/secretmanager.secretAccessor` sobre el secreto concreto.
No hay un rol de Secret Manager a nivel proyecto.

## Identidades

| Service account | Uso declarado |
|-----------------|---------------|
| `maps-prod-frontend` | Runtime del frontend. Sin secretos ni bucket. |
| `maps-prod-backend` | Runtime del backend. Tres secretos y objetos del bucket. |
| `maps-prod-migrate` | Job migrate. Solo la URL de migrate. |
| `maps-prod-bootstrap` | Job bootstrap. URL de la app y secretos de bootstrap. |
| `maps-prod-build` | Ejecuta Cloud Build. `roles/artifactregistry.writer` en `maps-prod`. `roles/logging.logWriter` en el proyecto. `roles/storage.objectViewer` solo en el bucket de fuentes. No recibe Workload Identity. |
| `maps-prod-build-submit` | Presenta el build desde GitHub. Rol custom de Cloud Build, `roles/iam.serviceAccountUser` solo sobre `maps-prod-build`, objetos del bucket de fuentes y lectura de digests en `maps-prod`. Aplicada el 28/10/2026. |

No hay `roles/cloudsql.client`. La conexión es IP privada más la URL en
Secret Manager, no Cloud SQL Auth Proxy ni un usuario IAM de base.

En el mismo proyecto, el pull normalmente lo hace el service agent de Cloud
Run, no las service accounts de runtime. No hace falta suponer que esas
cuentas lleven `roles/artifactregistry.reader`. Verificar el pull en el
primer deployment. Si falla, revisar primero los permisos del Cloud Run
service agent.

`maps-prod-build` está en el mismo proyecto que el build. En ese caso la
documentación actual de Cloud Build no pide un `roles/iam.serviceAccountUser`
extra para el service agent. El grant del service agent aparece para una
cuenta en otro proyecto, y ahí el rol es `roles/iam.serviceAccountTokenCreator`.
No se declara ninguno de los dos.

Quien ejecuta `gcloud builds submit` necesita `iam.serviceAccounts.actAs`
sobre `maps-prod-build`. Desde el 28/10/2026 ese permiso lo tiene solo
`maps-prod-build-submit`, sobre esa cuenta y no sobre el proyecto. La cuenta
predeterminada `998773244006-compute@developer.gserviceaccount.com` no
recibió roles. Antes del apply no tenía bindings en el proyecto ni en la
organización, y su propia política de IAM estaba vacía.

## Cloud Build

Terraform no define el pipeline. Un build productivo usa la cuenta dedicada,
no la cuenta de Compute Engine que Cloud Build toma por defecto.

El config del build debe pedir logs solo en Cloud Logging:

```yaml
options:
  logging: CLOUD_LOGGING_ONLY
```

Con eso alcanza `roles/logging.logWriter`. No hace falta un rol sobre un
bucket de logs ni `roles/storage.admin`.

El submit sube el contexto a un prefijo del bucket de fuentes, por ejemplo
`gs://maps-prod-landing-page-build-source/source`, e indica la cuenta
`maps-prod-build`. Se corre desde `backend/` o desde `frontend/`, no desde la
raíz del repo: así no entran `infra/terraform`, el state ni el otro
servicio. Cada directorio tiene un `.gcloudignore` que deja afuera `.env`,
`.env.*`, claves, `node_modules` y archivos locales. `.dockerignore` tiene
que viajar en ese fuente: Docker solo ignora archivos que llegaron al
contexto.

## Artifact Registry

Repositorio Docker `maps-prod` en `southamerica-east1`. Terraform no sube
imágenes ni define una política de limpieza. La referencia que acepta el
root termina en `@sha256:` y 64 hexadecimales. Un tag solo no pasa la
validación.

Forma esperada:

```text
southamerica-east1-docker.pkg.dev/PROJECT_ID/maps-prod/NOMBRE@sha256:64HEX
```

## Borde

| Pieza | Nombre | Detalle |
|-------|--------|---------|
| IP global | `maps-prod-lb-ip` | IPv4 externa `136.110.128.230` al 27/10/2026. Output `global_ip_address`. |
| NEG frontend | `maps-prod-frontend-neg` | Serverless, regional |
| NEG API | `maps-prod-backend-neg` | Serverless, regional |
| Certificado principal | `maps-prod-certificate` | Gestionado. Hostname de `public_origin`. Configurado; la activación espera al DNS. |
| Certificado `www` | `maps-prod-www-certificate` | Gestionado. `www.` más ese hostname. Configurado; la activación espera al DNS. |
| HTTPS | `maps-prod-https` | Puerto 443. El proxy usa los dos certificados. |
| HTTP | `maps-prod-http` | Puerto 80. Redirige a HTTPS con `PERMANENT_REDIRECT` (308). Conserva la query y el host. |
| `www` | host rule del URL map HTTPS | Redirección permanente al dominio principal. Conserva la query. |

CDN apagado. Los backend services no declaran `timeout_sec`.

`public_origin` tiene que ser el dominio principal. El módulo arma el
hostname `www` anteponiendo `www.` a ese nombre.

Los dos certificados quedan en aprovisionamiento hasta que el DNS público
apunte a `136.110.128.230`. Cloud DNS no está en este stack. El registro A
lo actualiza el administrador del dominio. El sitio todavía no se ha
publicado mediante el dominio oficial.

## Observabilidad

Un canal de email `MAPS Production Alerts` por dirección de `alert_emails`, entre 1 y 5, todos habilitados. Al 27/10/2026 hay dos canales. Las 18 políticas internas y el presupuesto usan esos canales.

Uptime checks públicos, cada `300s`, timeout `10s`, HTTPS en 443, SSL
validado, solo respuestas 2xx, checkers de IP estática en todas las
regiones:

| Check | Path |
|-------|------|
| `maps-prod-frontend-uptime` | `/` |
| `maps-prod-api-health-uptime` | `/api/v1/health` |

La alerta de uptime exige más de una región fallando durante `120s`. Una
región aislada no alerta.

Alertas de Cloud SQL sobre `maps-prod-db`. Son una línea de base inicial;
el propio código dice recalibrarlas con el primer mes de métricas.

| Alerta | Condición |
|--------|-----------|
| CPU warning / critical | > 70 % por 15 min / > 85 % por 10 min |
| Memoria warning / critical | > 80 % por 10 min / > 90 % por 5 min |
| Disco warning / critical | > 70 % por 10 min / > 85 % por 5 min |
| Conexiones warning / critical | > 60 por 10 min / > 80 por 5 min, suma de backends |
| Unavailable | `database/up` < 1 durante 5 min |

Alertas de Cloud Run, también línea de base:

| Alerta | Condición |
|--------|-----------|
| 5xx frontend y backend | más del 2 % durante 5 min |
| Latencia backend | P95 > 2000 ms durante 10 min |
| CPU y memoria | P95 > 80 % durante 10 min, por servicio |
| Instancias | más de 2 activas durante 10 min (el máximo configurado es 3) |

Las políticas de Cloud SQL y de Cloud Run ya están creadas. Los dos uptime
checks y sus dos políticas siguen declarados en el módulo y todavía no se
crean: el DNS y los certificados no responden por el dominio oficial. El
presupuesto no usa `depends_on` sobre todo el módulo. Le alcanza la
referencia a `notification_channel_names`.

## Presupuesto

`MAPS Production Monthly Budget`, en la cuenta `billing_account_id`.

| Ajuste | Valor |
|--------|-------|
| Importe | 110 USD por mes calendario, entero. Variable `monthly_budget_usd`. |
| Créditos | `EXCLUDE_ALL_CREDITS`. El umbral mira el costo bruto. |
| Gasto actual | 50 %, 75 %, 90 % y 100 % |
| Pronóstico | 100 % |
| Aviso | Solo los canales de Monitoring de `alert_emails`. Sin destinatarios IAM por defecto ni destinatarios de proyecto. |
| Efecto | Email. No detiene Cloud Run, no cambia el autoscaling y no impone un tope de gasto. |

Billing anomaly detection no está en Terraform. Es un ajuste de la cuenta
de facturación y sigue pendiente de hacerse a mano.

## Variables del root

Todas se evalúan en cualquier `plan`, también en un apply dirigido. Tienen
que existir antes del primer plan. Los payloads no van en `terraform.tfvars`.

### Con default

| Variable | Default | Cuándo importa |
|----------|---------|----------------|
| `region` | `southamerica-east1` | Siempre. La validación rechaza otra región. |
| `monthly_budget_usd` | `110` | Al aplicar `cost-controls`. Entero positivo, dólares brutos. |

### Sin default

| Variable | Qué es | Cuándo tiene un valor real |
|----------|--------|----------------------------|
| `project_id` | ID del proyecto. El aplicado es `maps-prod-landing-page`. | Ya existe. |
| `assets_bucket_name` | Nombre global del bucket de assets. | Antes de crear storage. Confirmar que esté libre. |
| `billing_account_id` | Cuenta de facturación `XXXXXX-XXXXXX-XXXXXX`. No es secreto. | Al vincular billing. Lo usa el presupuesto. |
| `public_origin` | `https://hostname` en minúsculas, sin usuario, puerto, path, query, fragmento ni barra final. | Antes de runtime, borde y uptime. |
| `alert_emails` | Conjunto de 1 a 5 correos de alerta. No son secretos. No van valores reales en el repositorio. | Antes de observabilidad. |
| `nominatim_user_agent` | User-Agent hacia Nominatim. No es secreto. | Antes del backend. |
| `frontend_image` | Digest inmutable del frontend. | Después de construir y subir la imagen. |
| `backend_image` | Digest inmutable del backend (`runner`). | Igual. |
| `jobs_image` | Digest inmutable del target `jobs`. | Igual. |
| `database_url_app_secret_version` | Versión numérica (`1`, `2`, …) ya existente. | Después de cargar el payload de la URL de la app. |
| `database_url_migrate_secret_version` | Igual, URL de migrate. | Después de cargar esa versión. |
| `jwt_secret_version` | Igual, secreto JWT. | Después de cargar esa versión. |
| `refresh_secret_version` | Igual, secreto de refresh. | Después de cargar esa versión. |
| `bootstrap_admin_email_secret_version` | Igual, email del primer superadmin. | Antes del job de bootstrap. |
| `bootstrap_admin_password_secret_version` | Igual, contraseña inicial. | Antes del job de bootstrap. Puede deshabilitarse después. |

Si el primer plan ocurre antes de tener imágenes y versiones reales, los
valores tienen que pasar igual la validación, y el apply de esa corrida no
debe crear Cloud Run. El ejemplo de apply dirigido está en el runbook y hay
que revisarlo antes de ejecutarlo.

## Outputs

Los que usa la operación: `database_private_ip`, `global_ip_address`,
`public_origin`, nombres de servicios y jobs, emails de las service accounts
y el presupuesto. La lista completa está en `outputs.tf`.

## Backend del state

`backend.tf` solo fija el prefijo `terraform/production`. El bucket se
indica en el init:

```bash
terraform init -backend-config="bucket=BUCKET_DE_STATE"
```

`BUCKET_DE_STATE` se elige en el bootstrap. No está en el repositorio.
Un `terraform init -backend=false` no lee ese state y no sirve para el plan.

## Workload Identity Federation

Aplicado el 28/10/2026 con un plan dirigido a `module.build_identity`. El
resultado fue 13 creaciones, 0 modificaciones y 0 eliminaciones. No cambió
Cloud Run, Cloud SQL, el balanceador, la red, el presupuesto ni el IAM que
ya existía.

Quedaron habilitadas `iamcredentials.googleapis.com` y
`sts.googleapis.com`. La cuenta nueva es `maps-prod-build-submit`. El pool
es `maps-github` y el provider es `github`. Las variables
`GCP_WORKLOAD_IDENTITY_PROVIDER` y `GCP_BUILD_SERVICE_ACCOUNT` están en
GitHub y no en el repositorio. Todavía no se ejecutó un Cloud Build
automático.

Un `terraform apply` completo seguiría creando estos cuatro recursos de R5.
Ese apply no forma parte de R6-B.

- `module.observability.google_monitoring_uptime_check_config.public["frontend"]`
- `module.observability.google_monitoring_uptime_check_config.public["api_health"]`
- `module.observability.google_monitoring_alert_policy.uptime["frontend"]`
- `module.observability.google_monitoring_alert_policy.uptime["api_health"]`
