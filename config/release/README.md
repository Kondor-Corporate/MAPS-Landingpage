# Baseline de producción (R5)

El archivo **`production-baseline.json`** (gitignored) registra el commit y los digests `@sha256` desplegados antes de la primera promoción automática. No incluye secretos; solo referencias de imagen y `git_sha`.

## Captura (solo lectura en GCP)

1. Confirmar el commit desplegado en producción (tag, release notes o historial acordado).
2. Desde el repo, con credenciales de **lectura** en `maps-prod-landing-page`, guardar el describe completo (los scripts leen la imagen de la forma que devuelve gcloud, para servicios y jobs):

```bash
mkdir evidence   # contiene configuración de los servicios: no versionar y borrar al terminar
for svc in frontend backend; do
  gcloud run services describe maps-prod-$svc --region=southamerica-east1 --project=maps-prod-landing-page --format=json > evidence/$svc.json
done
for job in migrate bootstrap; do
  gcloud run jobs describe maps-prod-$job --region=southamerica-east1 --project=maps-prod-landing-page --format=json > evidence/$job-job.json
done
```

3. Comparar con Terraform **sin apply**:

```bash
cd infra/terraform/environments/production
terraform init -input=false -backend-config="bucket=$TF_STATE_BUCKET"
terraform plan -input=false -no-color   # con tus tfvars no versionados
```

Las variables `frontend_image`, `backend_image` y `jobs_image` en el plan/state deben coincidir con los `@sha256` de Cloud Run. Si difieren, detener y reconciliar manualmente.

4. Opcional: `node scripts/release/capture-production-baseline.mjs --git-sha=<sha40> --frontend=evidence/frontend.json --backend=evidence/backend.json --jobs=evidence/migrate-job.json` (admite estos describe o un archivo con la referencia sola).

5. Copiar `production-baseline.json.example` → `production-baseline.json` (local, gitignored) o publicar el JSON en la variable de **repositorio** `MAPS_PRODUCTION_BASELINE_JSON`. Esta variable no es la fuente de verdad: el apply verifica que su `git_sha` sea el del último despliegue `succeeded` del registro (o un antecesor) y que Cloud Run sirva esas imágenes (`scripts/release/verify-starting-point.mjs`); si está adelantada, bloquea.

6. Registrar el baseline en el registro de despliegues (ver «Registro de despliegues»):
   `node scripts/release/build-baseline-record.mjs --baseline=config/release/production-baseline.json --frontend=evidence/frontend.json --backend=evidence/backend.json --migrate-job=evidence/migrate-job.json --bootstrap-job=evidence/bootstrap-job.json`.
   Falla si algún describe no muestra la imagen del baseline.

## Binding del plan (GCS)

Lo genera `scripts/release/prepare-promotion-plan.mjs bind` (valida `plan.json`, calcula el SHA-256 e imprime los comandos de subida); no se escribe a mano. Formato:

```json
{
  "schema_version": 1,
  "verify_run_id": "<run id fase verify>",
  "git_sha": "<40 hex>",
  "release_build_run_id": "<id release-build, o null para el baseline R5>",
  "plan_mode": "full|jobs-only|services-only",
  "plan_sha256": "<64 hex del plan.tfplan>"
}
```

Rutas: `promotion/plans/<verify_run_id>/<plan_mode>.tfplan` y `.../<plan_mode>.binding.json`, ambas con `x-goog-if-generation-match:0`.

## Evidencia de migrate

Tras `jobs-only` + `maps-prod-migrate` exitoso, el workflow escribe `promotion/migrate-done/<verify_run_id>.json`. `services-only` exige ese objeto antes del apply.

## Registro de despliegues (GCS)

Cada apply exitoso (promoción o rollback) crea **`promotion/deployments/<apply_run_id>.json`** con `git_sha`, digests, `promotion_verify_run_id`, evidencia post-verify y, en rollback, `replaced_deployment_id` / `rollback_from`.

- **Persistencia:** cada apply `succeeded` guarda `verified_manifest` (el manifiesto ya verificado en ese apply) dentro del mismo objeto. Un artifact de GitHub expirado no alcanza para inventar una versión: sin ese campo el rollback falla.
- Baseline R5: `operation: baseline`, `release_build_run_id` nulo, `cloud_run_digest_evidence` obligatoria. No hay manifiesto R6-B.
- Un rollback **al** baseline se registra como `operation: rollback` con `restored_baseline: true` y `release_build_run_id` nulo. No sirve como destino de un rollback posterior: el destino es `r5-baseline`.
- Un registro `succeeded` exige `post_verify.cloud_run.verified` con servicios **y** jobs, y que lo verificado sea exactamente `images`. Una fase `jobs-only` nunca se registra.
- Baseline R5 inicial: subir registro `operation: baseline` con `cloud_run_digest_evidence` verificada (`record-deployment-outcome.mjs` / runbook).
- Rollback: `release-promote` con `operation=rollback` y `target_deployment_id` **solo** desde este registro (no JSON arbitrario del operador).

Aprobación de esquema en GCS **no** desbloquea un rollback: la cuenta de deploy no puede aprobarse a sí misma. Si hay migraciones Prisma entre el target y la versión actual, el rollback de imágenes queda bloqueado y la recuperación es el restore de Cloud SQL del runbook.

## CI / verify en GitHub

Fase **verify** no incluye el archivo gitignored. Configurar **`MAPS_PRODUCTION_BASELINE_JSON`** (variable de repositorio) con el JSON completo. Sin baseline válido, el preflight falla y no hay comparación automática de migraciones Prisma ni promoción automática segura.
