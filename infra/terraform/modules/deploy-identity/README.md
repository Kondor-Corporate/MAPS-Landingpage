# deploy-identity (R6-C2)

Cuenta `maps-prod-deploy` y pool WIF **`maps-github-deploy`** (independiente de `maps-github`).

## Aislamiento respecto de builds

| | Build (`build-identity`) | Deploy (`deploy-identity`) |
|--|--------------------------|----------------------------|
| Pool WIF | `maps-github` | **`maps-github-deploy`** |
| Provider | `github` | `github` (en el pool deploy) |
| Service account | `maps-prod-build-submit` | `maps-prod-deploy` |
| Workflow OIDC | `release-build.yml` | `release-promote.yml` (futuro) |
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

- Lectura/escritura de objetos en el bucket de state (variable).
- Lectura de metadatos de Artifact Registry.
- Rol borrador Cloud Run (`run.services.get`, `run.jobs.get`).

**Pendiente C3:** permisos adicionales tras un `terraform plan` real con `maps-prod-deploy`.

## Apply

**No aplicar** sin autorización explícita. Tras el apply, quitar el módulo del código requeriría destroy explícito; no hay `count = 0`.
