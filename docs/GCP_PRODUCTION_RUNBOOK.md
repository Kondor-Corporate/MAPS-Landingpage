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

1. Construir frontend, backend y, si cambió el job, la imagen `jobs`.
2. Subirlas a Artifact Registry.
3. Tomar los digests `@sha256`.
4. Actualizar `frontend_image`, `backend_image` y, si aplica, `jobs_image`.
5. `terraform plan` en el directorio de producción.
6. Revisar el plan. Tiene que limitarse a las revisiones esperadas.
7. `terraform apply` después de esa revisión. No hay apply automático.
8. Si el release trae migraciones, ejecutar `maps-prod-migrate` una vez, con
   la imagen de jobs ya aplicada.
9. Smoke tests de la fase 6 que toque el cambio.

La promoción inmutable, la limpieza de Artifact Registry y las release
operations las cierra R6. El flujo automatizado está en
`.github/workflows/release-promote.yml` y en
[`docs/R6_RELEASE_OPERATIONS_PLAN.md`](./R6_RELEASE_OPERATIONS_PLAN.md) (R6-C3).
Hasta activar `deploy_identity`, el environment `production` y completar
`config/release/production-baseline.json`, la fase **apply** del workflow
permanece bloqueada.

Secuencia resumida:

1. Release build (R6-B) deja manifiesto en GitHub Actions.
2. `release-promote` fase **verify** descarga el manifiesto y publica `promotion-bundle`.
3. Operador genera **`terraform plan` local**, valida con
   `scripts/release/validate-terraform-plan.mjs` y sube el plan a
   `gs://<state-bucket>/promotion/plans/<verify_run_id>.tfplan`.
4. Fase **apply** (environment `production`, identidad deploy) aplica **ese**
   plan; si hay migraciones, `jobs-only` + `maps-prod-migrate` y luego un
   segundo plan `services-only`.
5. Smoke del dominio oficial sigue pendiente de DNS/certificado.

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

R6 define, y todavía no implementa:

- promoción inmutable de imágenes;
- limpieza de Artifact Registry;
- release operations.

Hasta entonces el deploy es el de la sección anterior: digest, plan, revisión, apply.
