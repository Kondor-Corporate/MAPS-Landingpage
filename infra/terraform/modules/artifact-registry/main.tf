# Política de retención (R6-D). Siempre en simulación: cleanup_policy_dry_run solo admite
# true (ver variables.tf). En simulación Artifact Registry no borra nada y registra qué
# borraría en los logs de auditoría Data Access; salir de ahí es un cambio posterior a R6,
# con el informe de simulación revisado.
#
# Qué protege, por qué así:
#  - prod-*          : tags que el operador pone sobre los digests desplegados y el anterior
#                      (prod-current, prod-previous, prod-baseline-r5). Una keep gana siempre
#                      sobre una delete.
#  - últimas N       : las versiones más recientes de cada imagen, sea cual sea su tag.
#  - borrado         : solo versiones SIN tag y de más de 30 días. Los builds de release
#                      publican con tag de SHA completo (backend/cloudbuild.yaml), y la
#                      verificación --gcp del apply y del rollback exige ese tag: una imagen
#                      con tag de SHA nunca es candidata.
# Las imágenes hijas de un manifiesto padre no se borran mientras el padre exista (doc de
# Google), pero un digest desplegado que no tenga tag propio no queda protegido por esa
# regla: por eso se etiqueta con prod-*.
locals {
  protected_tag_prefixes = ["prod-"]
  keep_recent_versions   = 5
  untagged_delete_after  = "2592000s" # 30 días
}

resource "google_artifact_registry_repository" "docker" {
  project       = var.project_id
  location      = var.region
  repository_id = var.prefix
  format        = "DOCKER"
  description   = "MAPS production container images"
  labels        = var.labels

  cleanup_policy_dry_run = var.cleanup_policy_dry_run

  cleanup_policies {
    id     = "keep-prod-tags"
    action = "KEEP"

    condition {
      tag_state    = "TAGGED"
      tag_prefixes = local.protected_tag_prefixes
    }
  }

  cleanup_policies {
    id     = "keep-recent-versions"
    action = "KEEP"

    most_recent_versions {
      keep_count = local.keep_recent_versions
    }
  }

  cleanup_policies {
    id     = "delete-old-untagged"
    action = "DELETE"

    condition {
      tag_state  = "UNTAGGED"
      older_than = local.untagged_delete_after
    }
  }
}

resource "google_artifact_registry_repository_iam_member" "build_writer" {
  project    = var.project_id
  location   = google_artifact_registry_repository.docker.location
  repository = google_artifact_registry_repository.docker.repository_id
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${var.build_service_account_email}"
}
