# Environment `production` en GitHub (R6-C2)

Este documento describe la configuración **manual** del environment en el repositorio `Kondor-Corporate/MAPS-Landingpage`. Cursor y los workflows **no** pueden crear revisores obligatorios; solo referencian el environment.

## Crear o abrir el environment

1. GitHub → **Settings** → **Environments** → **New environment** → nombre exacto: `production`.
2. **Deployment branches**: restringir a **`main`** (o “Selected branches” → solo `main`). No autorizar `development` ni ramas de feature.
3. **Required reviewers**: agregar al menos una persona o team con permiso de aprobación. Sin esto, `environment: production` en un workflow **no** exige revisión humana.
4. **Wait timer** (opcional): 0 minutos salvo que el equipo quiera una pausa fija.
5. **Prevent self-review**: activar si quien dispara el workflow no debe aprobar solo.
6. **Deployment protection rules** → conservar historial de deployments habilitado (por defecto).

## Concurrencia

En el futuro `release-promote.yml` (R6-C3), definir:

```yaml
concurrency:
  group: maps-prod-release
  cancel-in-progress: false
```

Eso evita dos applies concurrentes aunque dos workflows pasen la aprobación en paralelo.

## Separación preflight vs apply

| Fase | Environment | Identidad GCP |
|------|-------------|---------------|
| Preflight (validar manifiesto, plan en modo lectura) | ninguno o job sin secrets de apply | opcional: identidad de solo lectura |
| Plan/apply autorizado | `production` | `maps-prod-deploy` vía provider `github-promote` |

Los jobs de preflight de C1/C2 deben correr **sin** `environment: production` cuando solo validan artifacts. El job que ejecute `terraform apply` o `gcloud run jobs execute` debe ser el único con `environment: production` y `id-token: write` contra `GCP_DEPLOY_*`.

## Variables del environment (cuando exista C3)

Configurar en el environment (no en el repo público):

| Variable | Uso |
|----------|-----|
| `TF_STATE_BUCKET` | Nombre del bucket GCS del backend (no commitear). |
| `GCP_DEPLOY_WORKLOAD_IDENTITY_PROVIDER` | Output Terraform `promote_workload_identity_provider`. |
| `GCP_DEPLOY_SERVICE_ACCOUNT` | Email `maps-prod-deploy@…`. |

Los secretos de aplicación siguen en Secret Manager; no copiarlos al environment.

## Comprobación

Tras configurar revisores, disparar un workflow de prueba con un job vacío:

```yaml
jobs:
  probe:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: echo ok
```

Debe quedar **Waiting** hasta aprobar. Si corre sin espera, faltan required reviewers.
