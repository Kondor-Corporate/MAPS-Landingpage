# Terraform en MAPS

Guía general de la infraestructura como código. El detalle del entorno de
producción está en [`environments/production/README.md`](environments/production/README.md).
La operación está en [`docs/GCP_PRODUCTION_RUNBOOK.md`](../../docs/GCP_PRODUCTION_RUNBOOK.md).

Terraform administra infraestructura. No administra datos de negocio.

## Estado

| Entorno | Código Terraform | Despliegue |
|---------|------------------|------------|
| Producción | `environments/production/` | Desplegado al 27/10/2026 en `maps-prod-landing-page`. Cloud Run, balanceador y presupuesto aplicados. El dominio oficial todavía no publica el sitio. |
| Staging | Carpeta reservada, sin configuración | Sigue operando como está documentado en `docs/GCP_STAGING_RUNBOOK.md`. Su topología no es la de producción. |

## Versiones

Terraform queda restringido por `required_version = "~> 1.16.0"` en
`environments/production/versions.tf`. Esa restricción no la fija
`.terraform.lock.hcl`.

`.terraform.lock.hcl` fija la versión del provider `hashicorp/google`:
`8.7.0`, dentro de `~> 8.7.0`.

No hay provider `google-beta`. El provider de facturación es un alias del
mismo provider Google (`google.billing`), con `billing_project` y
`user_project_override` apuntando al proyecto de producción. Hace falta para
la API de Cloud Billing Budgets.

## Estructura

```text
infra/terraform/
  modules/                         módulos reutilizables
  environments/production/         root module de producción
  environments/staging/            reservado; hoy solo un README vacío
```

El root de producción está en `environments/production/`. Los comandos de
esta guía se ejecutan desde ese directorio. El prefijo de nombres de
producción es `maps-prod`. La región validada es `southamerica-east1`.

## Módulos

El root los compone en `environments/production/main.tf`.

| Módulo | Qué crea |
|--------|----------|
| `project-services` | APIs de GCP del entorno. `disable_on_destroy = false`: destruir el stack no las apaga. |
| `network` | VPC regional sin subredes automáticas, subred de Direct VPC y Private Services Access para Cloud SQL. |
| `database` | Instancia Cloud SQL PostgreSQL y la base lógica. No crea usuarios SQL. |
| `storage` | Bucket regional de assets y bucket regional, aparte, para el fuente temporal de Cloud Build. |
| `iam` | Service accounts, contenedores de Secret Manager y bindings no autoritativos. No carga el payload de ningún secreto. |
| `artifact-registry` | Repositorio Docker y el rol de escritura para la service account de build. |
| `runtime-services` | Cloud Run del frontend y del backend. |
| `runtime-jobs` | Cloud Run Jobs de migrate y bootstrap. No los ejecuta. |
| `edge` | IP global, NEGs serverless, balanceador HTTPS, certificado administrado y redirección HTTP. |
| `observability` | Canales de email (`alert_emails`), uptime checks y alertas de Cloud SQL y Cloud Run. |
| `cost-controls` | Presupuesto mensual de facturación. Solo alerta. No corta servicios ni limita el gasto. |

`environments/production/locals.tf` lista las APIs que habilita
`project-services`. Habilitar `cloudbuild.googleapis.com` no crea un pipeline
de Cloud Build. Terraform solo prepara la cuenta `maps-prod-build`, su
permiso de logs y el bucket de fuentes. El submit queda fuera de Terraform.
El uso está en el README de producción.

## Qué no administra Terraform

- Payload ni versiones de Secret Manager.
- Contraseñas SQL y usuarios SQL (`maps-app`, `maps-migrate`).
- Migraciones ya aplicadas y la ejecución del job de bootstrap.
- DNS del dominio del cliente. No hay recursos de Cloud DNS.
- Contenido copiado desde staging.
- Imágenes Docker. Terraform solo recibe una referencia inmutable
  (`@sha256:` y 64 hexadecimales).

Tampoco administra datos de negocio: usuarios de la aplicación, noticias,
productores, archivos del bucket ni filas creadas por el bootstrap.

## State

El backend está en `environments/production/backend.tf`:

```hcl
terraform {
  backend "gcs" {
    prefix = "terraform/production"
  }
}
```

El nombre del bucket no está en Git. Se crea a mano durante el bootstrap,
privado, y se pasa en `terraform init`. El state nunca se versiona. Se
considera sensible: puede contener identificadores, direcciones IP y
atributos de recursos. No se pega en tickets ni en el chat.

## Qué se versiona

| Archivo | Git |
|---------|-----|
| `.terraform.lock.hcl` | Sí. Fija el provider. |
| `.terraform/` | No. |
| `*.tfstate` y `*.tfstate.*` | No. |
| `*.tfplan` | No. |

`terraform.tfvars` puede versionarse solo con valores no sensibles. Nunca
lleva payloads de secretos. Hoy el de producción está vacío.

## Comandos normales

Después del bootstrap, el flujo de un cambio de infraestructura es revisión
humana. No hay apply automático.

Desde `infra/terraform/environments/production/`:

```bash
terraform init
terraform validate
terraform plan
terraform apply
```

`plan` se lee antes de `apply`. Un apply del root completo crea también
observabilidad y presupuesto. Durante el primer bootstrap eso se hace por
fases; el procedimiento está en el runbook de producción. Un `-target` es
una excepción de bootstrap, no el camino de los releases siguientes.

## Documentos relacionados

- [`environments/production/README.md`](environments/production/README.md): configuración declarada de producción.
- [`docs/GCP_PRODUCTION_RUNBOOK.md`](../../docs/GCP_PRODUCTION_RUNBOOK.md): bootstrap, deploys y operación.
- [`docs/GCP_STAGING_RUNBOOK.md`](../../docs/GCP_STAGING_RUNBOOK.md): staging. Otra topología, otro documento.
