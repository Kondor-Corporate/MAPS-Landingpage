# MAPS — runbook de producción en GCP

Operación del entorno de producción. La configuración declarada está en
[`infra/terraform/environments/production/README.md`](../infra/terraform/environments/production/README.md).
La organización de Terraform está en
[`infra/terraform/README.md`](../infra/terraform/README.md).

Este documento no autoriza a ejecutar apply, gcloud ni cambios de DNS por el
solo hecho de leerlo. No incluye payloads, contraseñas ni claves.

Staging es otro entorno y otra topología:
[`GCP_STAGING_RUNBOOK.md`](./GCP_STAGING_RUNBOOK.md).

## Estado al 27/10/2026

La infraestructura está desplegada y la base tiene el contenido migrado.
**El sitio todavía no se ha publicado mediante el dominio oficial.** El
registro A del dominio no apunta todavía a la IP del balanceador.

### Verificado

| Pieza | Estado |
|-------|--------|
| Proyecto | `maps-prod-landing-page` |
| Región | `southamerica-east1` |
| Cloud Run | Frontend y backend desplegados. El frontend final tiene indexación habilitada y dominio canónico. |
| Cloud SQL | `maps-prod-db`, PostgreSQL 17, IP privada `10.30.0.3`. 20 migraciones aplicadas. |
| Usuarios SQL | `maps-app` y `maps-migrate`, creados fuera de Terraform, con roles diferenciados |
| Superadmin | Un `SUPERADMIN` inicial creado. La transferencia posterior a MAPS no está marcada como hecha. |
| Contenido | Migrado desde staging, fuera de Terraform: 8 noticias, 10 imágenes de galería, 1 biblioteca y 20 ramos. |
| GCS | 16 objetos copiados y verificados. |
| Backups | Automáticos, PITR y recuperación probada en una instancia independiente. Esa instancia temporal ya se eliminó. Backup manual `1793126953962`. |
| Borde | IP global `136.110.128.230`. Dos certificados HTTPS configurados: dominio principal y `www`. `www` redirige al dominio principal. |
| Costos | Presupuesto mensual de 110 USD y dos canales de notificación. |
| Monitoring | 18 políticas internas creadas. Auditoría de infraestructura aprobada. |
| Backend | Auditoría aprobada: 119 tests exitosos en 9 archivos. |
| Secretos | Los seis contenedores existen. Los payloads no están en este documento. |
| Cloud Build | Bucket `maps-prod-landing-page-build-source`. `maps-prod-build` escribe en Artifact Registry `maps-prod`. |

No hay contraseñas, payloads ni el nombre del bucket de state en este
documento. El state existe y no se versiona.

La restricción de `maps-app` sobre `_prisma_migrations` no está entre lo
verificado el 27/10.

### Pendiente para el go-live

- Confirmar con MAPS la configuración del correo y los registros DNS.
- Actualizar el registro A del dominio a `136.110.128.230`, mediante el administrador del dominio.
- Esperar la activación y validar los certificados HTTPS.
- Ejecutar smoke tests públicos.
- Verificar `TRUST_PROXY=2` e identificación real de IP a través del balanceador, incluyendo protección frente a `X-Forwarded-For` falsificado.
- Crear o activar los 2 uptime checks públicos y sus 2 políticas de alerta.
- Confirmar la configuración de Billing anomaly detection.

## Qué hace Terraform y qué no

Terraform crea la infraestructura de producción. No crea datos de negocio.

Fuera de Terraform, en el orden del bootstrap:

- proyecto, vínculo de facturación y bucket de state;
- usuarios y contraseñas SQL;
- payloads y versiones de Secret Manager;
- imágenes Docker y sus digests;
- ejecución de migrate y de bootstrap;
- el contenido ya migrado desde staging (noticias, galería, biblioteca y objetos de GCS);
- el registro DNS en el proveedor del dominio;
- Billing anomaly detection.

## Primer despliegue

No es un solo `terraform apply`. Las fases de abajo son el bootstrap. Un
release posterior no las repite.

Los comandos de Terraform se corren en
`infra/terraform/environments/production/`.

Cualquier `terraform plan` del root exige todas las variables sin default,
aunque el apply sea dirigido. Los digests y las versiones de secretos tienen
que ser sintácticamente válidos desde el primer plan. Hasta la fase 2 pueden
hacer falta placeholders que pasen esa validación.

Esos placeholders son exclusivamente temporales de bootstrap. No deben
commitearse. No deben usarse en un plan o apply completo. Antes de la fase 3
hay que reemplazarlos por digests y versiones reales. Mientras sigan en uso,
el apply no debe alcanzar Cloud Run, el balanceador, la observabilidad ni el
presupuesto.

### Fase 0 — Proyecto y backend de Terraform

1. Crear el proyecto de producción. El ID queda en `project_id`.
2. Vincular la cuenta de facturación (`billing_account_id`).
3. Habilitar Service Usage si el proyecto nuevo todavía no puede habilitar APIs.
4. Crear el bucket de state. El nombre no se commitea y no está en este
   documento. El bucket existe antes de Terraform y no está declarado en el
   código. Debe quedar así:

   - privado;
   - Uniform Bucket-Level Access activado;
   - Public Access Prevention enforced;
   - Object Versioning activado;
   - Soft Delete de 7 días.
5. Inicializar el backend. `backend.tf` solo tiene el prefijo
   `terraform/production`:

   ```bash
   terraform init -backend-config="bucket=BUCKET_DE_STATE"
   ```

6. Verificar las credenciales de usuario (Application Default Credentials) y
   el quota project. El alias `google.billing` usa `user_project_override` y
   toma como quota project el `project_id` de producción. Sin eso, el
   presupuesto de la fase 7 no puede llamarse.

El state queda en GCS. No se copia a Git. Se trata como sensible.

### Fase 1 — Fundación

Crear solo:

- APIs (`project-services`);
- red y Private Services Access (`network`);
- Cloud SQL y la base `maps_asesores_prod` (`database`);
- bucket de assets (`storage`);
- service accounts y contenedores de Secret Manager (`iam`);
- Artifact Registry (`artifact-registry`).

Puede hacer falta un apply dirigido. No hay un `-target` confirmado en el
repositorio. El bloque siguiente es un ejemplo para revisar antes de
ejecutarlo, no una orden ya validada:

```powershell
terraform apply -target=module.project_services -target=module.network -target=module.database -target=module.storage -target=module.iam -target=module.artifact_registry
```

`-target` puede saltear dependencias. Sirve para este bootstrap. No es el
flujo de los deploys de después.

Al 27/10/2026 esta fase está aplicada, junto con Cloud Build, el runtime,
el borde, las migraciones y el presupuesto. `maps-prod-db` está en
`10.30.0.3`. Los usuarios SQL están en la fase 2.

### Fase 2 — Preparación fuera de Terraform

Hacer esto antes de crear Cloud Run.

**Usuarios SQL.** Terraform no los crea y el SQL no está en el repositorio.
Al 27/10/2026 ya quedaron configurados fuera de Terraform:

| Usuario | Rol |
|---------|-----|
| `maps-app` | Runtime del backend y job de bootstrap. |
| `maps-migrate` | Migraciones. |

Los roles están diferenciados. También quedaron los privilegios
predeterminados sobre tablas y secuencias futuras. La Data API de Cloud SQL
quedó deshabilitada de nuevo. No hay contraseñas en este documento.

Después del primer migrate hay que validar ese esquema. Sigue pendiente
restringir el acceso de `maps-app` a `_prisma_migrations`: esa tabla la
administra `maps-migrate`.

**URLs.** Leer `database_private_ip` del output. Las dos URLs usan el mismo
host, puerto, base y parámetros, y distinto usuario. Forma conceptual, sin
contraseña:

```text
postgresql://USUARIO@IP_PRIVADA:5432/maps_asesores_prod?sslmode=require&connection_limit=5&pool_timeout=10
```

La contraseña va en el userinfo de la URL, solo dentro de Secret Manager.
Si contiene caracteres reservados de una URL, hay que URL-encodearla antes
de incluirla. No escribir ninguna contraseña real en documentación ni en Git.
`sslmode=require` acompaña el `ENCRYPTED_ONLY` de la instancia. Puerto
`5432`. `connection_limit` y `pool_timeout` son parámetros del cliente
Prisma, no flags de Cloud SQL.

**Secretos.** Agregar una versión numérica a cada contenedor. Anotar el
número. No usar `latest`.

| Contenedor | Contenido |
|------------|-----------|
| `maps-prod-database-url-app` | URL de `maps-app` |
| `maps-prod-database-url-migrate` | URL de `maps-migrate` |
| `maps-prod-jwt-secret` | Secreto de access token. El proceso exige al menos 32 caracteres. |
| `maps-prod-refresh-secret` | Secreto de refresh. Misma longitud mínima. |
| `maps-prod-bootstrap-admin-email` | Email del primer superadmin. |
| `maps-prod-bootstrap-admin-password` | Contraseña inicial. La política de la app: mínimo 8 caracteres, una mayúscula, una minúscula y un número. |

**Imágenes.** Construir y subir a `maps-prod`. Quedarse con el digest, no con
el tag.

| Imagen | Dockerfile | Target |
|--------|------------|--------|
| Frontend | `frontend/Dockerfile` | etapa final. Escucha en 8080 con Nginx unprivileged. |
| Backend | `backend/Dockerfile` | `runner`. No migra al arrancar. |
| Jobs | `backend/Dockerfile` | `jobs`. Incluye Prisma CLI y migraciones. No incluye el seed. |

`VITE_API_BASE_URL=/api/v1` es el default de build del frontend. Hace falta
para que el navegador llame al mismo origen. `VITE_PUBLIC_INDEXING` y
`VITE_PUBLIC_SITE_URL` también son de build: Terraform no los ve. El frontend
desplegado al 27/10/2026 tiene la indexación habilitada y el dominio
canónico. `VITE_MAPS_WHATSAPP_NUMBER` es opcional y de build.

La service account `maps-prod-build` escribe en el repositorio. En el mismo
proyecto, el pull normalmente lo hace el service agent de Cloud Run, no las
cuentas de runtime. Esas cuentas no tienen por qué llevar
`roles/artifactregistry.reader`. Verificar el pull en el primer deployment.
Si falla, revisar primero los permisos del Cloud Run service agent.

Cloud Build no debe usar la cuenta de Compute Engine por defecto. El build
corre como `maps-prod-build`, con `options.logging: CLOUD_LOGGING_ONLY`, y
el fuente temporal se sube al bucket `${project_id}-build-source`. El
detalle está en el README de producción. Enviar el contexto desde `backend/`
o `frontend/`, nunca desde la raíz, y no incluir `.env`, credenciales, state
de Terraform ni `node_modules`.

Actualizar las variables de digests y de versiones numéricas con los valores
reales. Recién ahí la fase 3 puede crear los servicios.

### Fase 3 — Runtime y borde

Aplicar, con digests y versiones reales:

- frontend y backend;
- jobs migrate y bootstrap;
- IP global, NEGs, balanceador y certificado.

El presupuesto, los dos canales y las 18 políticas internas ya se aplicaron.
Los dos uptime checks públicos y sus dos políticas siguen fuera de ese
apply: si se crean antes de que el DNS y el certificado respondan, alertan
por una causa esperada del go-live.

Ejemplo sujeto a revisión antes de ejecutarlo:

```powershell
terraform apply -target=module.runtime_services -target=module.runtime_jobs -target=module.edge
```

Después de esta fase el camino normal deja de usar `-target`.

### Fase 4 — DNS

Leer el output `global_ip_address`. Pasarle al administrador del dominio el
registro. No se asume el proveedor. Cloud DNS no forma parte de este stack.

| Campo | Valor |
|-------|-------|
| Nombre | El hostname de `public_origin`, sin esquema, y `www` de ese hostname. |
| Tipo | A |
| Valor | `136.110.128.230`, la IPv4 global del balanceador al 27/10/2026. |

Ese registro todavía no está publicado. Lo actualiza el administrador del
dominio, después de confirmar la configuración con MAPS.

Hay dos certificados gestionados: el dominio principal y `www`. Los dos
están configurados y todavía no están validados. Siguen en aprovisionamiento
hasta que esos nombres resuelvan a esa IP. `public_origin` es el dominio
principal. El hostname `www` se arma anteponiendo `www.` a ese nombre.

HTTP en el puerto 80 responde 308 hacia HTTPS y conserva el host. En HTTPS,
`www` redirige al dominio principal y conserva la query.

### Fase 5 — Inicializar la base

Cuando el backend ya llega a la IP privada, ejecutar en este orden:

1. `maps-prod-migrate`
2. `maps-prod-bootstrap`

Migrate aplica las migraciones versionadas (`prisma migrate deploy`).
Bootstrap crea el primer `SUPERADMIN` si no existe. Con
`BOOTSTRAP_ADMIN_FORCE=false`, si ese usuario ya es superadmin activo el job
termina sin cambiar la contraseña. Si existe con otro rol o inactivo, falla
a propósito.

No ejecutar `prisma migrate dev`, `migrate reset` ni `db:seed`. El seed demo
no entra en producción.

El `SUPERADMIN` inicial ya existe. El email y la contraseña quedan solo en
Secret Manager. La transferencia posterior a MAPS sigue siendo el pase
operativo acordado y no está marcada como hecha.

La forma de lanzarlos, con el proyecto creado en la fase 0:

```bash
gcloud run jobs execute maps-prod-migrate --region southamerica-east1 --project PROJECT_ID --wait
gcloud run jobs execute maps-prod-bootstrap --region southamerica-east1 --project PROJECT_ID --wait
```

Esos comandos ya se corrieron. Quedaron 20 migraciones aplicadas y el
`SUPERADMIN` inicial. Los usuarios y los privilegios predeterminados ya
estaban. La restricción de `maps-app` sobre `_prisma_migrations` no está
entre lo verificado el 27/10.

Después del bootstrap inicial, la versión de la contraseña de bootstrap
puede deshabilitarse. El contenedor queda: tiene protección contra borrado.
Un bootstrap futuro necesita una versión nueva y actualizar la variable
numérica. No hace falta para atender tráfico.

### Fase 6 — Smoke tests

Con el certificado ya usable:

| Qué | Dónde |
|-----|-------|
| Home | `/` |
| Health | `/api/v1/health` |
| Login | `/login` y el alta del superadmin de bootstrap |
| Refresh y logout | La sesión real del navegador. Cookie del mismo origen. |
| Archivos | Subida y descarga que pasen por el API hacia el bucket. El navegador no habla con GCS. |
| Admin | `/admin` con el superadmin |
| Intranet | `/intranet` cuando exista un productor. El bootstrap no crea productores. |
| Mapa | `/#mapa`. El bootstrap no crea productores. El mapa puede no tener puntos. |
| Noticias | `/noticias` y, con el admin, `/admin/noticias`. Hay 8 noticias y 10 imágenes de galería migradas. |
| Biblioteca | La biblioteca migrada y sus 20 ramos. |

Validar `TRUST_PROXY=2` con tráfico real a través del balanceador, no solo
leyendo la variable. El rate limit depende de `req.ip`. Hay que comprobar
que dos clientes distintos no compartan cupo y que un `X-Forwarded-For`
antepuesto no abra un cupo nuevo. No cambiar el valor a `true`.

El contenido migrado no lo cargó Terraform: 8 noticias, 10 imágenes de
galería, 1 biblioteca, 20 ramos y 16 objetos de GCS.

### Fase 7 — Observabilidad y costos

Al 27/10/2026 ya están aplicados el presupuesto de 110 USD, los dos canales
de `alert_emails` y las 18 políticas internas de Cloud SQL y Cloud Run.
Esos canales también reciben el presupuesto. El módulo ya no depende de
forma explícita de toda la observabilidad: la referencia a los nombres de
canal alcanza para crear el presupuesto sin crear todavía el uptime.

Siguen pendientes, para después de que el DNS y los certificados respondan:

- uptime de `/` y de `/api/v1/health`;
- las 2 políticas de alerta de esos checks.

Confirmar que los correos de los dos canales son los de `alert_emails` y que
llega un aviso de prueba o el primer umbral real.

Billing anomaly detection se activa a mano en la cuenta de facturación.
Terraform no lo modela. Sigue pendiente.

Los umbrales de alerta son una línea de base. Se recalibran con el primer
mes de métricas. El detalle numérico está en el README de producción.

## Deploys posteriores

Un release normal no recrea el proyecto, no vuelve a crear usuarios SQL y no
vuelve a correr el bootstrap.

**Estado de R6-C (promoción y rollback automatizados):** implementado en el
repositorio y probado solo con tests locales y simulaciones. **No se ha
ejecutado contra GCP.** Hasta completar el checklist de activación de
[`R6_RELEASE_OPERATIONS_PLAN.md`](./R6_RELEASE_OPERATIONS_PLAN.md) y el primer
ensayo real, el camino válido es el manual de abajo. El workflow solo puede
dispararse desde `main`; cómo llegar ahí está en
[`R6_MAIN_ACTIVATION.md`](./R6_MAIN_ACTIVATION.md).

### Camino manual (vigente hasta activar R6-C)

1. Construir frontend, backend y, si cambió el job, la imagen `jobs`.
2. Subirlas a Artifact Registry.
3. Tomar los digests `@sha256`.
4. Actualizar `frontend_image`, `backend_image` y, si aplica, `jobs_image`.
5. `terraform plan` en el directorio de producción.
6. Revisar el plan. Tiene que limitarse a las revisiones esperadas.
7. `terraform apply` después de esa revisión.
8. Si el release trae migraciones, ejecutar `maps-prod-migrate` una vez, con
   la imagen de jobs ya aplicada.
9. Smoke tests de la fase 6 que toque el cambio.

### Promoción automatizada (R6-C3)

Flujo en dos fases con una revisión humana del plan en el medio. El plan se
genera **fuera** del workflow porque GitHub aprueba el job de apply antes de
que corra, y la aprobación tiene que ser sobre un plan que alguien leyó.

Todo comando de esta sección que dice «local» lo corre el operador con sus
propias credenciales; el workflow nunca genera el plan.

1. **Release build** (R6-B) deja el manifiesto. Anotar su `run id`.
2. **Fase verify:** disparar `release-promote` en `main` con `phase=verify`,
   `operation=promote`, `git_sha` y `release_build_run_id`. Publica el artifact
   `promotion-bundle` (`promotion-report.json`, `promotion.auto.tfvars`,
   `release-manifest.json`) y su `run id` es el `VERIFY_RUN_ID`. El informe dice
   si hay migraciones nuevas (`migration.requires_jobs_first_apply`) y qué modos
   de plan corresponden.
3. **Plan local**, desde **el mismo commit de `main`** que ejecutó el verify (su `automation_sha`
   está en `promotion-report.json`; `bind` lo exige y también que no haya cambios locales en
   `infra/terraform`, `scripts/release` y `config/release`) y con la versión de Terraform de
   `infra/terraform/environments/production/.terraform-version`:

   Bash:

   ```bash
   cd infra/terraform/environments/production
   terraform version                                   # debe coincidir con .terraform-version
   terraform init -backend-config="bucket=$TF_STATE_BUCKET"
   terraform plan -out=plan.tfplan \
     -var-file=<tus tfvars no versionados> \
     -var-file=<bundle>/promotion.auto.tfvars \
     $(node ../../../../scripts/release/prepare-promotion-plan.mjs targets --mode=full)
   terraform show -json plan.tfplan > plan.json
   terraform show plan.tfplan                          # leerlo: es la revisión humana
   ```

   PowerShell (Windows):

   ```powershell
   Set-Location infra/terraform/environments/production
   terraform version                                   # debe coincidir con .terraform-version
   terraform init "-backend-config=bucket=$env:TF_STATE_BUCKET"
   # Los -target quedan en un arreglo (uno por elemento) y se pasan con @targets:
   $targets = (node ../../../../scripts/release/prepare-promotion-plan.mjs targets --mode=full --shell=bash) -split " "
   terraform plan -out=plan.tfplan "-var-file=<tus tfvars no versionados>" "-var-file=<bundle>/promotion.auto.tfvars" @targets
   terraform show -json plan.tfplan | Out-File -Encoding utf8 plan.json
   terraform show plan.tfplan                          # leerlo: es la revisión humana
   ```

   Windows PowerShell 5.1 escribe `>` en UTF-16 y `Out-File -Encoding utf8` con BOM. Los
   scripts del operador (`prepare-promotion-plan`, `build-baseline-record`, `retention-report`)
   leen ambos; el workflow de Linux no se ve afectado. Sin `--shell`, los scripts imprimen
   PowerShell en Windows y Bash en el resto.

   Los `-target` acotan el plan a los recursos Cloud Run del modo. Sin ellos el
   plan incluye los cambios pendientes ajenos a R6 (los dos uptime checks y sus
   alertas, que esperan al DNS) y el validador lo rechaza por contener `create`.
   **`-target` es una solución acotada de R6, no un diseño final:** deja fuera del plan
   aprobado cualquier cambio pendiente o deriva del resto del state. Por eso hace falta la
   comprobación independiente de «Deriva fuera del release» (más abajo). Dividir el state en
   varios queda fuera de R6.

4. **Binding y hash** (valida `plan.json`, no sube nada):

   Bash:

   ```bash
   node ../../../../scripts/release/prepare-promotion-plan.mjs bind \
     --plan=plan.tfplan --plan-json=plan.json \
     --report=<bundle>/promotion-report.json \
     --mode=full --verify-run-id=<VERIFY_RUN_ID>
   ```

   PowerShell:

   ```powershell
   node ../../../../scripts/release/prepare-promotion-plan.mjs bind `
     --plan=plan.tfplan --plan-json=plan.json `
     --report=<bundle>/promotion-report.json `
     --mode=full --verify-run-id=<VERIFY_RUN_ID>
   ```

   Sin `--expect-terraform-version` toma `.terraform-version` del repositorio. Falla si el
   checkout no es el commit de `main` del verify o tiene cambios locales, si el plan toca algo
   fuera de Cloud Run, si no es solo `update`, si cambia algo que no sea la imagen, o si las
   imágenes del plan no son las del manifiesto aprobado. Escribe el binding con el
   `automation_sha`, imprime `plan_sha256` y los dos `gsutil cp` create-only en la sintaxis de
   tu shell.

5. **Subir** el plan y el binding con esos comandos
   (`x-goog-if-generation-match:0`: no se pisa un plan ya subido). El bucket de
   state tiene acceso restringido; los planes no van a artifacts ni a logs. En PowerShell el
   bucket va en `$env:TF_STATE_BUCKET` (`$env:TF_STATE_BUCKET = "<bucket>"`).
6. **Fase apply:** `phase=apply`, `verify_run_id`, `plan_sha256`, `plan_mode`,
   mismos `git_sha`/`release_build_run_id`. El job pide aprobación del environment
   `production`. Antes de `terraform apply` revalida, solo con lecturas: que `verify_run_id`
   sea una corrida terminada en success de `release-promote.yml` en `main` **cuyo `head_sha`
   sea el commit de `main` que ejecuta este apply** (si `main` avanzó desde el verify se
   rechaza: repetir verify, plan y binding); la autenticidad del manifiesto; que los digests
   existan; que los inputs describan el mismo bundle; **el punto de partida** (ver «Punto de
   partida del apply»); el binding, con su `automation_sha`; el SHA-256 del plan y el contenido
   del plan. Aplica **ese** plan, con `terraform init -backend-config="bucket=…"` explícito.
7. **Con migraciones nuevas** (`requires_jobs_first_apply`): `plan_mode=full` está
   prohibido. Se hace `jobs-only` (el workflow ejecuta `maps-prod-migrate` y escribe
   `promotion/migrate-done/<verify_run_id>.json`), después se genera un **plan nuevo**
   `services-only` —el estado cambió— y se repite 3 a 6 con ese modo. `maps-prod-bootstrap`
   nunca se ejecuta.
8. **Resultado:** `promotion/deployments/<apply_run_id>.json`. Es `succeeded` solo si
   la verificación posterior comprobó servicios **y** jobs contra Cloud Run con los
   digests aprobados; si no, es `partial` y el run falla. `jobs-only` no registra un
   despliegue (los servicios siguen con la imagen anterior).

**Plan obsoleto o apply fallido.** Si Terraform rechaza el plan por estado cambiado,
no se reintenta: se repite la fase verify, el plan y el binding. Un apply que falla
deja un registro `failed` (no es objetivo de rollback) y hay que revisar Cloud Run
antes de actuar: un apply parcial puede haber cambiado un recurso y otro no. Si
`jobs-only` se aplicó pero `maps-prod-migrate` falló, el workflow no puede repetirlo
(el plan ya está aplicado y el punto de partida lo rechaza): ejecutar la migración a
mano con autorización y revisar antes de seguir.

### Punto de partida del apply

El preflight calcula las migraciones pendientes contra `MAPS_PRODUCTION_BASELINE_JSON`,
una variable que mantiene una persona. Si estuviera adelantada respecto de lo realmente
desplegado, el diff omitiría migraciones y los servicios nuevos arrancarían sobre un
esquema viejo. Por eso, **antes de cualquier cambio** (antes de `terraform apply` y de
`maps-prod-migrate`) el apply ejecuta `scripts/release/verify-starting-point.mjs`, que no
confía en esa variable y la contrasta con dos fuentes que ya puede leer con la identidad de
deploy (sin permisos nuevos ni escrituras):

| Comprobación | Fuente | Bloquea cuando |
|--------------|--------|----------------|
| Despliegue actual | `promotion/deployments/*.json` | no hay ningún `succeeded` (falta `r5-baseline`) o el registro está corrupto |
| Estado productivo | `gcloud run services/jobs describe` (frontend, backend, migrate, bootstrap) | alguno no se puede leer, o sirve una imagen distinta de la del registro |
| Baseline de migraciones | `baseline_git_sha` del informe vs. `git_sha` del despliegue actual | el baseline no es el despliegue actual ni un antecesor suyo (adelantado o ajeno), o git no puede ordenarlos |
| Rollback | `migration.current_git_sha` del informe | no es el despliegue actual del registro (el estado cambió desde el verify) |

Un baseline **atrasado** respecto del despliegue actual pasa con aviso: el diff incluye
migraciones de más, nunca de menos. En la promoción en dos fases el estado intermedio es
exacto: `jobs-only` parte de todo en la versión registrada; `services-only` exige los **dos**
jobs en la imagen nueva (lo que dejó el `jobs-only`, con su evidencia de migrate) y los
servicios todavía en la registrada. Jobs divididos, en una tercera versión, servicios ya
movidos o un cambio manual bloquean. Sin migraciones no existe estado intermedio: los jobs
deben seguir en la registrada y `services-only` se rechaza si dejaría los jobs atrás (usar
`full`). Cubierto por `r6-two-phase.test.mjs`.

Qué hacer cuando bloquea:

- *Sin `r5-baseline`:* registrarlo (sección siguiente) antes de la primera promoción.
- *Baseline adelantado:* corregir la variable de repositorio al `git_sha` y las imágenes
  del despliegue actual y repetir verify.
- *Cloud Run distinto del registro:* producción no está donde el registro la da. No se
  promueve sobre un estado desconocido: reconciliar con autorización (volver Cloud Run a lo
  registrado, o registrar con evidencia lo que realmente corre) y repetir verify.

Límite conocido: tras un apply `partial` o `failed` el registro no refleja producción, así
que este control —y con él el rollback por workflow— se bloquea hasta reconciliar a mano.
El procedimiento está en la sección siguiente. No hay camino automático.

### Reconciliación tras un apply parcial o fallido

Esto lo hace el owner, con su cuenta, fuera del workflow. No se ejecuta `maps-prod-migrate`,
no se ejecuta `maps-prod-bootstrap` y el `-target` no incluye Cloud SQL. No pisa
`r5-baseline`. No reintenta el plan que falló.

**Cómo se reconoce.** El job de apply terminó en fallo, o la verificación posterior no
quedó en `succeeded`. Terraform puede haber cambiado un recurso de Cloud Run y otro no.
En GCS puede existir `promotion/deployments/<apply_run_id>.json` con `outcome` `partial`
o `failed`. Si el registro del fallo no llegó a escribirse, el run de GitHub igual falló
y Cloud Run es la fuente: no dar por hecho que no hubo cambios. Un registro `partial` o
`failed` no es el despliegue actual. El actual sigue siendo el `succeeded` más reciente
por `applied_at` (hoy, `r5-baseline`).

**Qué está corriendo.** Describir los cuatro recursos y leer solo imagen, revisión y
tráfico. No volcar el JSON completo: trae la configuración del servicio.

Bash:

```bash
gcloud run services describe maps-prod-frontend --project=maps-prod-landing-page \
  --region=southamerica-east1 \
  --format='yaml(status.latestReadyRevisionName,status.latestCreatedRevisionName,status.traffic,spec.template.spec.containers[0].image)'
gcloud run services describe maps-prod-backend --project=maps-prod-landing-page \
  --region=southamerica-east1 \
  --format='yaml(status.latestReadyRevisionName,status.latestCreatedRevisionName,status.traffic,spec.template.spec.containers[0].image)'
gcloud run jobs describe maps-prod-migrate --project=maps-prod-landing-page \
  --region=southamerica-east1 \
  --format='yaml(spec.template.spec.containers[0].image)'
gcloud run jobs describe maps-prod-bootstrap --project=maps-prod-landing-page \
  --region=southamerica-east1 \
  --format='yaml(spec.template.spec.containers[0].image)'
```

Esas imágenes se comparan con `config/release/production-baseline.json` y con
`promotion/deployments/r5-baseline.json`. El workflow usa la imagen de la plantilla del
servicio (`spec.template.spec.containers[0].image`), no la que devuelve
`gcloud run revisions describe`.

**Revisiones R5 que siguen vivas** (lectura del 3 de noviembre de 2026, sin
modificarlas). Las dos están Ready y reciben el 100 % del tráfico:

| Recurso | Revisión | Imagen de la plantilla, igual al baseline |
|---------|----------|--------------------------------------------|
| `maps-prod-frontend` | `maps-prod-frontend-00002-zf8` | `frontend@sha256:27af01940675134c5595631a85febe35d88534a0bbe9147037db6139c15d3465` |
| `maps-prod-backend` | `maps-prod-backend-00001-6rt` | `backend@sha256:ab3f9099fbeec3637a660b6921b8d4dd31003e15df29ede6897d54870fa91bee` |

Los jobs `maps-prod-migrate` y `maps-prod-bootstrap` sirven
`backend-jobs@sha256:b7647612ed23f18ee676a84abfa3ffccbcb401c38fca1fa04f6a55364cfdf202`,
el mismo digest del baseline. El objeto de la revisión de frontend informa otro digest
(`sha256:3792e9cb…`). No copiar ese valor a Terraform ni al registro: la plantilla del
servicio y el baseline coinciden en `sha256:27af0194…`.

**Volver el tráfico sin tocar Cloud SQL.** Si el apply creó una revisión nueva y la
anterior sigue Ready, se puede devolver el 100 % del tráfico a la revisión de la tabla.
Eso no cambia la base, no ejecuta jobs y no alinea el state: la plantilla puede seguir
apuntando a la imagen nueva. Es un corte de emergencia, no el cierre.

```bash
gcloud run services update-traffic maps-prod-frontend --project=maps-prod-landing-page \
  --region=southamerica-east1 --to-revisions=maps-prod-frontend-00002-zf8=100
gcloud run services update-traffic maps-prod-backend --project=maps-prod-landing-page \
  --region=southamerica-east1 --to-revisions=maps-prod-backend-00001-6rt=100
```

**Reconciliar el state.** En un checkout limpio, con las credenciales de owner y las
imágenes del baseline en las variables que ya usa el plan de producción, generar un plan
dirigido solo a los cuatro recursos de Cloud Run. Revisarlo. Tiene que mostrar como máximo
la vuelta de esos cuatro a los digests R5. Si aparece Cloud SQL, IAM, un destroy o
cualquier otro recurso, no se aplica.

```bash
cd infra/terraform/environments/production
terraform init -backend-config="bucket=$TF_STATE_BUCKET"
terraform plan -lock=false -out=reconcile.tfplan \
  -target=module.runtime_services.google_cloud_run_v2_service.frontend \
  -target=module.runtime_services.google_cloud_run_v2_service.backend \
  -target=module.runtime_jobs.google_cloud_run_v2_job.migrate \
  -target=module.runtime_jobs.google_cloud_run_v2_job.bootstrap
```

Solo después de esa lectura se aplica `reconcile.tfplan`. No es el plan de la promoción
R6 y no se sube a `promotion/plans/`. No usa `-auto-approve` sobre un plan que no se
revisó. Los jobs cambian de imagen; no se ejecutan.

**Registrar.** Si los cuatro describes vuelven a las imágenes de `r5-baseline`, el
`succeeded` vigente ya es ese registro: no se crea otro y no se sobrescribe (la subida
es create-only y ese objeto tiene que seguir existiendo). Un `partial` o `failed` se
deja como está. No se redacta a mano un `succeeded`: el contrato exige `post_verify.ok`
y el manifiesto capturado en el apply. Cuando Cloud Run y `r5-baseline` coinciden, el
punto de partida deja de bloquear.

**Cuándo no usar el rollback del workflow.** No usarlo mientras un describe no coincida
con el `succeeded` más reciente: `verify-starting-point` lo rechaza a propósito. No
usarlo para completar un apply a medias ni para reintentar el mismo plan si Terraform
dijo que el state cambió. No usarlo si en esa promoción llegó a ejecutarse
`maps-prod-migrate` y el esquema nuevo no tolera el código anterior: ahí el camino es
**Backups y recuperación**, no un cambio de imagen. Esta promoción no trae migraciones
nuevas; un fallo de imágenes no justifica tocar Cloud SQL. El rollback automatizado
hacia `r5-baseline` corresponde cuando ya hay un despliegue `succeeded` posterior y
producción coincide con ese registro.

### Deriva fuera del release (comprobación propuesta, solo lectura)

El plan aprobado de una promoción usa `-target` y solo ve los recursos Cloud Run del modo:
un cambio pendiente o una deriva en el resto del state (IAM, base, red, observabilidad…) no
aparece ahí. Para detectarlo sin mezclarlo con el plan de imágenes, un operador corre, con
sus credenciales y de forma periódica y antes de cada promoción, un plan **sin `-target`,
sin `-out` y sin lock**, con las imágenes que hoy sirve producción (las del último despliegue
`succeeded` del registro), de modo que Cloud Run no muestre cambios. Nunca se aplica.

Bash:

```bash
cd infra/terraform/environments/production
terraform init -backend-config="bucket=$TF_STATE_BUCKET"
gsutil cat gs://$TF_STATE_BUCKET/promotion/deployments/<ID_ULTIMO_SUCCEEDED>.json > current.json
FE="$(node -pe 'require("./current.json").images.frontend_image')"
BE="$(node -pe 'require("./current.json").images.backend_image')"
JOBS="$(node -pe 'require("./current.json").images.jobs_image')"
terraform plan -lock=false -input=false -detailed-exitcode \
  -var-file=<tus tfvars no versionados> \
  -var "frontend_image=$FE" -var "backend_image=$BE" -var "jobs_image=$JOBS"
echo "exit=$?"   # 0 sin cambios; 2 hay cambios o deriva; 1 error
rm current.json
```

PowerShell:

```powershell
Set-Location infra/terraform/environments/production
terraform init "-backend-config=bucket=$env:TF_STATE_BUCKET"
$rec = (gsutil cat "gs://$env:TF_STATE_BUCKET/promotion/deployments/<ID_ULTIMO_SUCCEEDED>.json") -join "`n" | ConvertFrom-Json
terraform plan -lock=false -input=false -detailed-exitcode "-var-file=<tus tfvars no versionados>" `
  "-var=frontend_image=$($rec.images.frontend_image)" `
  "-var=backend_image=$($rec.images.backend_image)" `
  "-var=jobs_image=$($rec.images.jobs_image)"
"exit=$LASTEXITCODE"   # 0 sin cambios; 2 hay cambios o deriva; 1 error
```

Mientras el DNS no esté listo, el único cambio esperado son los dos uptime checks y sus
alertas (`create`). Cualquier otro cambio hay que explicarlo antes de promover. No se
incorpora al workflow ni al validador del plan: es una revisión humana separada, y cuando se
automatice debería correr con una identidad de solo lectura distinta de la de deploy.

**Límites conocidos de R6-C (no resueltos, documentados):**

- *Baseline de migraciones.* El preflight compara el SHA a promover con
  `MAPS_PRODUCTION_BASELINE_JSON`, no con lo desplegado. El apply ya no confía en esa
  variable (ver «Punto de partida del apply»): un baseline adelantado o ajeno se bloquea y
  uno atrasado solo agrega pasos (`jobs-only` + `services-only` sin migraciones nuevas).
  Tras cada promoción con migraciones exitosa, actualizar la variable con el `git_sha` y las
  imágenes del despliegue actual para evitar pasos de más.
- *Validador de plan probado con fixtures.* La lista de atributos de solo salida de
  Cloud Run se armó sin un plan real de actualización. El primer plan real puede
  mostrar un atributo observado que falta: revisarlo y recién entonces agregarlo a
  `scripts/release/terraform-plan-diff.mjs`; no relajar la regla por reflejo.
- *`-target`.* Acotado a Cloud Run por diseño en R6; ver la comprobación de deriva de arriba.
- *Permisos de la cuenta de deploy.* Update y ejecución van en la política del
  servicio o del job, no en una condición de proyecto. `downloadArtifacts` queda
  en el repositorio de producción. Está en Terraform y todavía no aplicado.
- *Evidencia en GCS.* Ver «Protección del registro de despliegues en GCS».
- *Smoke público.* Sigue pendiente del DNS y del certificado.
- *Concurrencia.* El grupo `maps-prod-release` serializa verify, apply y rollback, pero
  GitHub conserva una sola ejecución en cola por grupo: una tercera cancela a la
  pendiente. Lanzar una operación a la vez.
- *Main que avanza.* Cualquier merge a `main` entre verify y apply invalida el verify
  (el apply exige el mismo commit). En una ventana de promoción, no mergear a `main`.

### Protección del registro de despliegues en GCS

El registro (`promotion/deployments/`), la evidencia de migrate (`promotion/migrate-done/`) y
los planes (`promotion/plans/`) viven en el bucket de state. Se escriben con
`x-goog-if-generation-match:0` (create-only), pero eso es una cabecera del cliente: protege
contra un error, no contra una cuenta con permiso de borrar o reescribir.

**Riesgo del diseño anterior (el módulo `deploy-identity` todavía no se aplicó según el
checklist; si ya se hubiera aplicado, este cambio reemplaza el binding):** la cuenta
de deploy recibía el rol personalizado `mapsTerraformStateRW` sobre **todo el bucket**, con
`storage.objects.create`, `get`, `list`, **`update` y `delete`**. El propio módulo lo
admite: la restricción por prefijo queda «por política del bucket y del workflow», y esa
política no está definida. Quien ejecute el job de apply (o un commit malicioso en `main`
aprobado por error) puede borrar o reescribir registros de despliegue, evidencias de
migrate y planes, y con ello alterar qué se considera «despliegue actual» o destino de
rollback.

**Qué permite y qué no permite IAM en Cloud Storage (documentación de Google):**

- *Listar se evalúa sobre el bucket, no sobre un objeto.* Una condición sobre `resource.name`
  con prefijo de objeto es falsa para `storage.objects.list`: `resource.name` es
  `projects/_/buckets/<bucket>`. El atributo `storage.googleapis.com/objectListPrefix` que
  resolvería eso **solo se admite en Credential Access Boundaries**; usarlo en un binding
  condicional hace que los métodos de Cloud Storage funcionen mal
  ([fuente](https://docs.cloud.google.com/iam/docs/downscoping-short-lived-credentials)).
  **Conclusión: el listado no se puede limitar a un prefijo con IAM Conditions.** La
  propuesta anterior de este runbook (condición de prefijo sobre `list`) no es aplicable y
  se descartó.
- *Sobrescribir un objeto exige `storage.objects.create` **y** `storage.objects.delete`*
  ([fuente](https://docs.cloud.google.com/storage/docs/access-control/iam-permissions)). Una
  cuenta con `create` pero sin `delete` ni `update` solo puede crear objetos nuevos: no puede
  reescribir ni borrar. Esa es la propiedad que se busca para el historial.

**Política IAM — implementada en `infra/terraform/modules/deploy-identity/main.tf`, no aplicada;
sin bucket ni rol personalizado nuevo.** Cuatro bindings sobre el mismo bucket sustituyen al
binding único anterior (`deploy_state`); un test (`deploy-identity-iam.test.mjs`) exige que este
cuadro y el Terraform coincidan:

| # | Necesidad | Rol | Condición | Efecto |
|---|-----------|-----|-----------|--------|
| 1 | **Listar** (`terraform init`, `gsutil ls` del registro) | `roles/storage.legacyBucketReader` (predefinido: `storage.objects.list` y `storage.buckets.get`, sin leer contenido) | ninguna | Lista nombres y metadatos de **todo** el bucket. Es la limitación aceptada: IAM no permite acotar el listado a un prefijo. |
| 2 | **Leer** registros, evidencias y planes | `roles/storage.objectViewer` | `resource.name.startsWith("projects/_/buckets/<bucket>/objects/promotion/")` | Lee contenido solo bajo `promotion/`. Su permiso de listado queda sin efecto bajo condición; el listado lo da la fila 1. |
| 3 | **Crear** registros y evidencia de migrate | `roles/storage.objectCreator` | `resource.name.startsWith(".../objects/promotion/deployments/") \|\| resource.name.startsWith(".../objects/promotion/migrate-done/")` | Crea objetos nuevos en esos dos prefijos. Sin `delete` ni `update`: no puede sobrescribir ni borrar. No escribe en `promotion/plans/` (los sube el operador). |
| 4 | **State y locks de Terraform** | el rol personalizado `mapsTerraformStateRW` ya existente, **sin** `storage.objects.list` | `resource.name.startsWith(".../objects/terraform/production/")` | `create`, `get`, `update`, `delete` solo bajo el prefijo del state (el state se reescribe y el lock se crea y se borra en cada operación). |

Requisitos: las IAM Conditions en buckets piden acceso uniforme a nivel de bucket (UBLA). El
módulo lo comprueba con un `data "google_storage_bucket"` y una precondición en cada binding:
sin UBLA el plan falla **antes** de cambiar nada. La política versión 3 la maneja el provider. El
nombre del bucket se interpola en las expresiones CEL, así que la variable solo admite
caracteres válidos de bucket. Si el módulo estuviera ya aplicado con el binding anterior,
`deploy_state` se crea con `create_before_destroy` para que la cuenta no pierda acceso al state
durante el cambio; aun así, aplicar fuera de una promoción en curso. Las expresiones resueltas
son `resource.name.startsWith("projects/_/buckets/<bucket>/objects/<prefijo>")`, el formato de
nombre de recurso de objeto de Cloud Storage.

**Limitaciones que esta política no resuelve:**

- *El state sigue siendo reescribible por la cuenta de deploy:* `terraform apply` lo necesita.
  Solo se protege el historial de promoción, no el state.
- *Crear sigue permitido:* IAM no impide que la identidad de deploy cree un registro o una
  evidencia **nuevos** con contenido falso. Eso lo frenan que el token solo se emita para el
  workflow de `main` aprobado (condición del provider), los validadores del registro y el
  contraste con Cloud Run del punto de partida; no es un control de acceso.
- *Roles heredados:* cualquier rol de almacenamiento concedido a la cuenta (o a un grupo que la
  contenga) en el proyecto, la carpeta o la organización —`storage.admin`, `editor`,
  `owner`— anula todo lo anterior. La cuenta tampoco debe tener `setIamPolicy` sobre el
  bucket ni poder suplantar a otra cuenta con más permisos.
- *Humanos:* los operadores que suben planes con sus credenciales pueden hacer lo que su rol
  permita; revisar quién tiene `objectAdmin` en el bucket.
- *Listado del bucket completo:* la cuenta ve los nombres de todos los objetos del bucket,
  no su contenido.
- *Versionado y borrado temporal:* activar el versionado deja recuperables las versiones
  sobrescritas o borradas por quien sí tiene `delete` (humanos y state). Comprobar también la
  configuración de soft delete. No usar retention policy en este bucket: bloquearía el borrado
  de los archivos de lock de Terraform.
- *Si el listado global o las condiciones resultaran inaceptables o inviables en el ensayo,*
  la alternativa que sí permite acotar todo es un **bucket aparte** para `promotion/` (listado
  por bucket y, si se quiere, retention policy bloqueada). Agrega un recurso, costo mínimo y
  una identidad más que configurar: solo se justifica si el ensayo de abajo falla o el modelo
  de amenazas exige evidencia inmutable frente a un administrador comprometido.

**Auditoría de lo anterior (dos configuraciones de logs distintas, no intercambiables):**

| Para qué | Servicio | Tipo de log | Dónde se habilita |
|----------|----------|-------------|-------------------|
| Detectar que alguien creó, sobrescribió o borró objetos del bucket de state | `storage.googleapis.com` (Cloud Storage) | Data Access `DATA_WRITE` (lecturas: `DATA_READ`, opcional) | Auditoría del proyecto. Es por servicio, no por bucket: también registra los demás buckets del proyecto; revisar volumen y, si hace falta, un filtro de exclusión. |
| Leer el resultado del dry-run de la política de limpieza de imágenes | `artifactregistry.googleapis.com` (Artifact Registry) | Data Access `DATA_WRITE` | Auditoría del proyecto. Ver «Retención de imágenes (R6-D)». |

Los cambios de IAM y de configuración del bucket salen en los logs de Admin Activity, que
están siempre activos; los de objetos no.

**Qué comprobar en el plan de activación (antes del primer apply real) y ensayos negativos.**
Primero la configuración, con credenciales de administrador:

- `gcloud storage buckets describe gs://<bucket> --format="yaml(versioning,uniform_bucket_level_access,soft_delete_policy)"`
- `gcloud storage buckets get-iam-policy gs://<bucket>`: solo los cuatro bindings de arriba para la
  cuenta de deploy, con sus condiciones.
- `gcloud projects get-iam-policy maps-prod-landing-page`: ningún rol de almacenamiento amplio ni
  `setIamPolicy` para la cuenta de deploy ni para grupos que la contengan.

Después, con la identidad de deploy (suplantada por un administrador con
`roles/iam.serviceAccountTokenCreator` sobre ella; `gsutil -i`), **antes de cualquier
promoción real**. Los objetos de prueba van en `promotion/migrate-done/ensayo-*.json`: ese
prefijo nunca se lista como registro. **No** crear objetos de prueba en
`promotion/deployments/`: `fetch-deployment-registry` parsea todo lo que hay ahí y un archivo
ajeno corrompería el registro.

Bash:

```bash
SA=maps-prod-deploy@maps-prod-landing-page.iam.gserviceaccount.com
B=gs://$TF_STATE_BUCKET
echo '{}' > ensayo.json
gsutil -i $SA ls "$B/promotion/deployments/*.json"                   # OK
gsutil -i $SA cat "$B/promotion/deployments/r5-baseline.json"        # OK
gsutil -i $SA -h "x-goog-if-generation-match:0" cp ensayo.json "$B/promotion/migrate-done/ensayo-1.json"   # OK (crea)
gsutil -i $SA cp ensayo.json "$B/promotion/migrate-done/ensayo-1.json"                                     # debe fallar (sobrescribir)
gsutil -i $SA cp ensayo.json "$B/promotion/deployments/r5-baseline.json"                                   # debe fallar (sobrescribir un registro real)
gsutil -i $SA rm "$B/promotion/migrate-done/ensayo-1.json"           # debe fallar (borrar)
gsutil -i $SA cp ensayo.json "$B/promotion/plans/ensayo.json"        # debe fallar (plans los sube el operador)
gsutil -i $SA cp ensayo.json "$B/ensayo-raiz.json"                   # debe fallar (fuera de los prefijos)
gcloud storage buckets add-iam-policy-binding $B --member=serviceAccount:$SA --role=roles/storage.objectAdmin --impersonate-service-account=$SA   # debe fallar (no puede cambiar IAM)
```

PowerShell:

```powershell
$SA = "maps-prod-deploy@maps-prod-landing-page.iam.gserviceaccount.com"
$B = "gs://$env:TF_STATE_BUCKET"
"{}" | Out-File -Encoding ascii ensayo.json
gsutil -i $SA ls "$B/promotion/deployments/*.json"                   # OK
gsutil -i $SA cat "$B/promotion/deployments/r5-baseline.json"        # OK
gsutil -i $SA -h "x-goog-if-generation-match:0" cp ensayo.json "$B/promotion/migrate-done/ensayo-1.json"  # OK (crea)
gsutil -i $SA cp ensayo.json "$B/promotion/migrate-done/ensayo-1.json"                                    # debe fallar (sobrescribir)
gsutil -i $SA cp ensayo.json "$B/promotion/deployments/r5-baseline.json"                                  # debe fallar (sobrescribir un registro real)
gsutil -i $SA rm "$B/promotion/migrate-done/ensayo-1.json"           # debe fallar (borrar)
gsutil -i $SA cp ensayo.json "$B/promotion/plans/ensayo.json"        # debe fallar (plans los sube el operador)
gsutil -i $SA cp ensayo.json "$B/ensayo-raiz.json"                   # debe fallar (fuera de los prefijos)
gcloud storage buckets add-iam-policy-binding $B --member="serviceAccount:$SA" --role=roles/storage.objectAdmin --impersonate-service-account=$SA   # debe fallar (no puede cambiar IAM)
```

Cada línea marcada «debe fallar» tiene que terminar en 403 (o 412 si la precondición se evalúa
antes); si alguna **funciona**, la política no está bien y no se sigue. El objeto de prueba
`ensayo-1.json` lo borra después un administrador. Además:

- el registro se lista y se lee con la sintaxis de `fetch-deployment-registry` (`gsutil ls` con
  comodín y `gsutil cat`): si el listado pide `storage.buckets.get` u otro permiso, el 403 lo
  dirá y se agrega solo ese;
- `terraform init` y un `plan` contra el state con la cuenta de deploy funcionan, y un apply del
  ensayo reescribe el state y crea y borra el lock (fila 4);
- el primer `release-promote` completo de ensayo crea su registro y su evidencia con esta política
  (fila 3) y deja su rastro en los logs de Cloud Storage.

Los permisos exactos de los roles predefinidos se confirman con
`gcloud iam roles describe roles/storage.legacyBucketReader` (y los demás) antes de aplicar.
Los permisos de Cloud Run de la cuenta de deploy no cambian con esto y siguen pendientes del
ensayo real.

### Registro baseline R5 (una vez, antes del primer rollback y de la primera promoción)

El rollback al estado previo a R6 y el punto de partida del apply necesitan el registro
`r5-baseline` con evidencia real de Cloud Run. Con `config/release/production-baseline.json`
completo (ver `config/release/README.md`) y credenciales de solo lectura:

Bash:

```bash
mkdir evidence
for svc in frontend backend; do
  gcloud run services describe maps-prod-$svc --project=maps-prod-landing-page \
    --region=southamerica-east1 --format=json > evidence/$svc.json
done
for job in migrate bootstrap; do
  gcloud run jobs describe maps-prod-$job --project=maps-prod-landing-page \
    --region=southamerica-east1 --format=json > evidence/$job-job.json
done
node scripts/release/build-baseline-record.mjs \
  --baseline=config/release/production-baseline.json \
  --frontend=evidence/frontend.json --backend=evidence/backend.json \
  --migrate-job=evidence/migrate-job.json --bootstrap-job=evidence/bootstrap-job.json
```

PowerShell:

```powershell
New-Item -ItemType Directory -Force evidence | Out-Null
foreach ($svc in "frontend", "backend") {
  gcloud run services describe "maps-prod-$svc" --project=maps-prod-landing-page `
    --region=southamerica-east1 --format=json | Out-File -Encoding utf8 "evidence/$svc.json"
}
foreach ($job in "migrate", "bootstrap") {
  gcloud run jobs describe "maps-prod-$job" --project=maps-prod-landing-page `
    --region=southamerica-east1 --format=json | Out-File -Encoding utf8 "evidence/$job-job.json"
}
node scripts/release/build-baseline-record.mjs `
  --baseline=config/release/production-baseline.json `
  --frontend=evidence/frontend.json --backend=evidence/backend.json `
  --migrate-job=evidence/migrate-job.json --bootstrap-job=evidence/bootstrap-job.json
```

Falla si Cloud Run sirve una imagen distinta de la del baseline. Si pasa, escribe
`r5-baseline.json` e imprime el `gsutil cp` create-only en la sintaxis de tu shell. Los
describe incluyen configuración de los servicios: borrar `evidence/` al terminar y no
versionarlo.

### Rollback de aplicación (R6-C4)

No es restauración de base de datos. Si el esquema avanzó con migraciones que el
código anterior no tolera, detener el rollback de imágenes y seguir **Backups y
recuperación** (instancia nueva + validación + Secret Manager).

1. Listar despliegues: `node scripts/release/fetch-deployment-registry.mjs --bucket=<TF_STATE_BUCKET>`.
2. Elegir `deployment_id` con `outcome: succeeded` (incluye `r5-baseline`). Un registro
   de rollback previo (`restored_baseline`) no sirve como destino: elegir `r5-baseline`.
3. Disparar `release-promote` con `operation=rollback`, `phase=verify`, `target_deployment_id=<id>` y el `git_sha` del registro. `release_build_run_id` solo si el registro lo tiene; el baseline R5 no tiene corrida release-build ni artifact.
4. Si hay migraciones Prisma entre esa versión y la actual, el preflight **bloquea** el rollback de imágenes. No hay aprobación automática. Seguir **Backups y recuperación**.
5. Plan Terraform **`plan_mode=full`** con los mismos pasos 3 a 5 de la promoción.
6. Fase **apply** con `operation=rollback`, `plan_mode=full`, `target_deployment_id` y environment `production`; no se ejecuta `maps-prod-migrate` ni bootstrap.
7. Post-verify: servicios y jobs con el digest esperado y la revisión lista con todo el tráfico; si falla, estado **parcial** — no declarar éxito.
8. El apply registra el rollback en `promotion/deployments/<apply_run_id>.json`.

Concurrencia: `maps-prod-release` (compartida con promociones).

### Retención de imágenes (R6-D)

**Estado: simulación.** El módulo `artifact-registry` declara una política de limpieza con
`cleanup_policy_dry_run = true`, y el módulo rechaza `false` (variable validada). Con
simulación activa Artifact Registry **no borra nada**. Salir de la simulación es un cambio
posterior a R6, con el informe de simulación revisado, y no forma parte de cerrarlo.

Política (la misma en `infra/terraform/modules/artifact-registry/main.tf` y en
`config/release/retention-policy.json`; un test exige que coincidan):

| Regla | Efecto |
|-------|--------|
| `keep-prod-tags` | Conserva todo tag que empiece con `prod-` (`prod-current`, `prod-previous`, `prod-baseline-r5`). |
| `keep-recent-versions` | Conserva las 5 versiones más recientes de cada imagen. |
| `delete-old-untagged` | Candidatas a borrado: versiones **sin tag** y de más de 30 días. |

Una regla de conservación gana siempre sobre la de borrado. Los builds de release publican
con tag de SHA completo y la verificación `--gcp` del apply y del rollback exige ese tag:
una imagen con tag de SHA nunca es candidata. (El diseño original hablaba de tags
`release-<sha>`; el pipeline real usa el SHA solo.)

**Informe de protección** (solo lectura; no etiqueta ni borra). Bash y PowerShell usan el
mismo comando (las continuaciones de línea son `\` en Bash y `` ` `` en PowerShell):

```bash
node scripts/release/retention-report.mjs --bucket=<TF_STATE_BUCKET> \
  --live-images --live-running --print-tag-commands
```

Identifica los digests desplegados (`current`), la versión anterior válida para rollback
(`previous`, con el mismo criterio del workflow de rollback), el baseline R5 y la ventana
de las últimas 5 promociones. Entrega **dos resultados separados**:

- *Simulación local* (`simulation_ok`): falla si algún protegido no existe en Artifact
  Registry, sería candidato a borrado con la política, o si Cloud Run sirve algo distinto de lo
  registrado. Es una aproximación del criterio, **no** el resultado real de Artifact Registry.
- *Protecciones obligatorias* (`protection_ready`): exige que los digests de `current`,
  `previous` y `baseline` (cuando existen en el registro) tengan en sus tres imágenes la
  etiqueta `prod-current`, `prod-previous` y `prod-baseline-r5`. Sin ellas un digest
  desplegado solo lo cubre la regla de «últimas 5», que deja de hacerlo tras 5 builds más.
  Las etiquetas que faltan salen en `protection_gaps` y como comandos impresos, nunca
  ejecutados.

El código de salida es 0 solo si **ambos** están en verde; `--simulation-only` evalúa
únicamente la simulación (útil antes de etiquetar) pero sigue avisando que la protección no
está lista. Hasta que `protection_ready` sea verdadero no se da por revisado el dry-run ni
se plantea salir de la simulación. Con `--registry=`, `--images=` y `--running=` corre sobre
archivos, sin credenciales; con `--bucket`, `--live-images` y `--live-running` consulta GCP
en solo lectura y es la única forma de saber si un digest histórico sigue existiendo.

**Pasos para llegar a un informe revisable (cada uno con autorización del operador):**

1. Etiquetar los digests protegidos con los `gcloud artifacts docker tags add` que
   imprime el informe. Sin esas etiquetas un digest desplegado solo está protegido por la
   regla de «últimas 5», que deja de cubrirlo tras 5 builds más.
2. Aplicar la política: `terraform plan`/`apply` de `module.artifact_registry` por el
   camino de infraestructura normal (no por `release-promote`, que solo admite Cloud Run).
3. Habilitar los logs de auditoría **Data Access (DATA_WRITE)** de Artifact Registry en el
   proyecto (servicio `artifactregistry.googleapis.com`): los resultados del dry-run salen ahí y
   esa configuración **no** está en Terraform. Es independiente de los Data Access de Cloud
   Storage (`storage.googleapis.com`), que sirven para auditar el bucket de state; habilitar uno
   no activa el otro (ver «Protección del registro de despliegues en GCS»).
4. Esperar al menos un día (la limpieza corre en segundo plano) y leer el resultado:

   ```bash
   gcloud logging read \
     'protoPayload.serviceName="artifactregistry.googleapis.com" AND protoPayload.request.parent="projects/maps-prod-landing-page/locations/southamerica-east1/repositories/maps-prod/packages/-" AND protoPayload.request.validateOnly=true' \
     --resource-names="projects/maps-prod-landing-page" --project=maps-prod-landing-page --limit=100 --format=json
   ```

5. Buscar en esa salida los digests de `current`, `previous` y `r5-baseline` (los lista
   el informe). **Ninguno** puede aparecer como candidato. Si aparece, no seguir: corregir
   etiquetas o política.

El cruce del paso 5 es manual a propósito: el formato exacto de estas entradas de log no
se verificó en este repositorio y no se automatiza una lectura que podría fallar en silencio.

## Secretos y rotación

Siempre una versión numérica. Nunca `latest`.

1. Crear una versión nueva en el contenedor existente.
2. Actualizar la variable numérica del root.
3. `terraform plan` y, revisado, `terraform apply`.
4. Validar el flujo que usa ese secreto.
5. Deshabilitar la versión anterior cuando la nueva ya atiende.

Rotar `maps-prod-database-url-app` obliga a alinear la variable que leen el
backend y el job de bootstrap. La URL de migrate es independiente.

La contraseña de bootstrap no es un secreto de runtime. Después del primer
bootstrap exitoso se puede deshabilitar su versión.

## Backups y recuperación

Implementado en la instancia `maps-prod-db`:

| Control | Valor |
|---------|-------|
| Backup automático | Diario, alrededor de las 05:00 UTC |
| Retención | 14 backups |
| PITR | 7 días de transaction logs |
| Si se borra la instancia | Los backups se conservan |
| Backup final | 30 días |
| Borrado | Protección de instancia y de la base lógica |

Estrategia de restore, cuando haya que usarla:

1. Restaurar en una instancia nueva. No pisar primero la instancia de producción.
2. Validar la base restaurada.
3. Smoke test contra esa instancia, aparte del tráfico real.
4. Recién entonces apuntar la aplicación, con una versión nueva de la URL en Secret Manager y un apply revisado.

La recuperación ya se probó en una instancia independiente. Esa instancia
temporal se eliminó. El backup manual usado en la prueba es
`1793126953962`. La prueba no reemplazó la instancia de producción.

## Costos

Estimaciones de arquitectura. No son la factura.

| Pieza | Orden de magnitud |
|-------|-------------------|
| Cloud SQL Enterprise, zonal, `db-custom-1-3840` | unos 65–70 USD por mes |
| Balanceador global de aplicación | unos 18 USD por mes |
| Cloud Run | Variable según uso. Mínimo 0 en frontend y backend. |
| GCS, Artifact Registry, Monitoring, Secret Manager | Chicos al lado de SQL y del balanceador. |

Presupuesto de alerta: **110 USD por mes, brutos**. `EXCLUDE_ALL_CREDITS`:
los créditos promocionales no sirven para estimar el costo futuro. El
presupuesto no apaga nada.

La factura real del primer mes es la que recalibra estas cifras. No hay un
precio final cerrado.

## Staging después del go-live

Durante el rollout, staging y producción pueden convivir. No borrar staging
al publicar producción.

Después de estabilizar:

- Cloud Run de staging puede quedar en mínimo 0.
- Cloud SQL de staging puede detenerse mientras no se use, conservando la
  capacidad de volver a levantarlo.

Eso es estrategia futura. No cambia el staging que hoy está operativo ni
autoriza apagarlo ahora. Su topología sigue siendo la del runbook de staging.

## Pendiente

El sitio todavía no se ha publicado mediante el dominio oficial.

### Antes del go-live

- Confirmar con MAPS la configuración del correo y los registros DNS.
- Actualizar el registro A del dominio a `136.110.128.230`, mediante el administrador del dominio.
- Esperar la activación y validar los certificados HTTPS del dominio principal y de `www`.
- Ejecutar los smoke tests públicos de la fase 6.
- Verificar `TRUST_PROXY=2` e identificación real de IP a través del balanceador, incluyendo protección frente a `X-Forwarded-For` falsificado.
- Crear o activar los 2 uptime checks públicos y sus 2 políticas de alerta.
- Confirmar la configuración de Billing anomaly detection.
- La restricción de `maps-app` sobre `_prisma_migrations` no está verificada en este cierre.
- La transferencia del `SUPERADMIN` inicial a MAPS no está marcada como hecha.

### Después del primer mes

- Recalibrar umbrales de Cloud SQL y Cloud Run con métricas reales.
- Recalibrar la lectura de costo con la factura bruta, sin créditos.

### R6

R6-A a R6-D están implementados en el repositorio, sin ejecutar contra GCP. Lo que falta para
darlos por operativos está en el checklist de activación de
[`R6_RELEASE_OPERATIONS_PLAN.md`](./R6_RELEASE_OPERATIONS_PLAN.md): permisos reales de la
cuenta de deploy, environment, baseline R5 con su registro, el primer ensayo de promoción y de
rollback, y revisar el dry-run de retención. Hasta entonces el deploy sigue siendo el camino
manual de «Deploys posteriores».
