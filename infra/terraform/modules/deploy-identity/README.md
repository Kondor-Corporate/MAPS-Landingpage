# deploy-identity (R6-C2)

Cuenta `maps-prod-deploy` y pool WIF **`maps-github-deploy`** (independiente de `maps-github`).

## Aislamiento respecto de builds

| | Build (`build-identity`) | Deploy (`deploy-identity`) |
|--|--------------------------|----------------------------|
| Pool WIF | `maps-github` | **`maps-github-deploy`** |
| Provider | `github` | `github` (en el pool deploy) |
| Service account | `maps-prod-build-submit` | `maps-prod-deploy` |
| Workflow OIDC | `release-build.yml` | `release-promote.yml` (solo en `main`) |
| Rama OIDC | `main` o `development` | solo `main` |
| Claims | `workflow_dispatch`, IDs numéricos | + `environment == production` |
| workloadIdentityUser | `principalSet …/maps-github/…/attribute.repository_id/1174729313` | `principalSet …/maps-github-deploy/…/attribute.workflow_ref/…release-promote.yml@refs/heads/main` |

Un token emitido vía el pool **`maps-github`** no puede impersonar **`maps-prod-deploy`**, porque el binding de deploy apunta al pool **`maps-github-deploy`**. No se modifica el binding del submitter de builds.

La restricción de promoción no depende solo del nombre del environment en GitHub: el **provider OIDC** exige `assertion.environment == 'production'` además de `workflow_ref`, `ref`, `event_name` e IDs numéricos de org/repo.

Los jobs de promoción deben usar `environment: production` en el paso que llama a `google-github-actions/auth@v2`.

## Activación en el root de producción

El módulo **no usa `count`**. Siempre está compuesto; omitir `terraform_state_bucket_name` hace fallar **`terraform plan`** (variable obligatoria sin default), en lugar de un destroy silencioso.

Proporcionar variables sensibles/no versionadas en cada operación:

```bash
# Ejemplo (nombre ilustrativo; usar el bucket real del backend GCS)
terraform plan \
  -var-file=terraform.tfvars \
  -var-file=/ruta/gitignored/production.secrets.tfvars
```

Archivo gitignored sugerido (`production.secrets.tfvars`, **no commitear**):

```hcl
terraform_state_bucket_name = "<bucket-gcs-del-backend>"
```

Para `terraform validate` local sin secretos:

```bash
terraform validate -var="terraform_state_bucket_name=placeholder-for-validate-only"
```

## Permisos actuales

Cuatro bindings sobre el bucket de state (mismo bucket, sin recursos nuevos), definidos en `main.tf`:

| Binding | Rol | Condición (`resource.name`) | Permite |
|---------|-----|-----------------------------|---------|
| `deploy_bucket_list` | `roles/storage.legacyBucketReader` | ninguna | Listar objetos y leer metadatos del bucket (IAM no permite acotar `list` por prefijo). Sin contenido. |
| `deploy_promotion_read` | `roles/storage.objectViewer` | `promotion/` | Leer planes, bindings, evidencia de migrate y registros. |
| `deploy_promotion_create` | `roles/storage.objectCreator` | `promotion/deployments/` o `promotion/migrate-done/` | Crear objetos nuevos. Sin `delete`/`update`: no puede sobrescribir ni borrar. No escribe en `promotion/plans/` (los sube el operador). |
| `deploy_state` | `mapsTerraformStateRW` (`create`, `get`, `update`, `delete`; sin `list`) | `terraform/production/` | State y locks de Terraform. |

Las condiciones usan el nombre de recurso `projects/_/buckets/<bucket>/objects/<prefijo>`. Requieren acceso uniforme a nivel de bucket: el módulo lo comprueba en el plan y falla antes de cambiar nada. Artifact Registry queda en el repositorio de producción: metadatos y `artifactregistry.repositories.downloadArtifacts`, sin subida ni borrado. Cloud Run no admite `resource.name` en IAM Conditions. `run.services.update` se concede en cada servicio con un rol que solo tiene ese permiso. `run.jobs.update` de migrate y el de bootstrap son roles distintos, cada uno con solo ese permiso. `roles/run.developer` no se usa: sobre un job incluye `run.jobs.run`, `run.jobs.runWithOverrides` y `run.jobs.delete`. `run.jobs.run` y `run.executions.get` quedan solo en el job migrate. `run.operations.get` permanece en el proyecto porque la operación no tiene política propia. `iam.serviceAccounts.actAs` solo en las cuatro cuentas de ejecución. El contrato lo fija `scripts/release/deploy-identity-iam.test.mjs`.

**Pendiente C3 (bloquea la activación):** estos permisos no alcanzan para que `release-promote.yml` actualice servicios ni ejecute `maps-prod-migrate`. Se completan con los 403 de un `terraform plan`/`apply` real con `maps-prod-deploy`, sin roles amplios, sin acceso a secretos y sin permisos sobre `maps-prod-bootstrap`. Ver el checklist de [`R6_RELEASE_OPERATIONS_PLAN.md`](../../../../docs/R6_RELEASE_OPERATIONS_PLAN.md).

**Pendiente C3 (bloquea la activación): ensayar la política del bucket.** La política de la tabla está implementada pero **no aplicada ni ensayada**. Limitaciones y ensayos negativos previos a la activación (crear funciona; sobrescribir, borrar y escribir fuera de los prefijos dan 403): [`GCP_PRODUCTION_RUNBOOK.md`](../../../../docs/GCP_PRODUCTION_RUNBOOK.md), «Protección del registro de despliegues en GCS». No usar retention policy en este bucket: bloquearía los archivos de lock de Terraform. Los permisos exactos de los roles predefinidos se confirman con `gcloud iam roles describe` antes de aplicar.

## Apply

**No aplicar** sin autorización explícita. Tras el apply, quitar el módulo del código requeriría destroy explícito; no hay `count = 0`.
