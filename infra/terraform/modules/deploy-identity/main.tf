# Production deploy identity (R6-C2). Separate from maps-prod-build-submit.
#
# Uses its own Workload Identity pool (maps-github-deploy), not maps-github.
# Build submitter bindings on maps-prod-build-submit stay in build-identity only.
# OIDC: release-promote.yml on main + GitHub environment production + numeric repo IDs.
#
# C3 still needs a real terraform plan to tighten Cloud Run and job permissions.

locals {
  github_repository_owner    = "Kondor-Corporate"
  github_repository_name     = "MAPS-Landingpage"
  github_repository_owner_id = "266150176"
  github_repository_id       = "1174729313"

  deploy_workflow_pool_id = "maps-github-deploy"

  promote_workflow_ref = "${local.github_repository_owner}/${local.github_repository_name}/${var.promote_workflow_file}@${var.promote_branch_ref}"

  promote_attribute_condition = join(" && ", [
    "assertion.repository_owner_id == '${local.github_repository_owner_id}'",
    "assertion.repository_id == '${local.github_repository_id}'",
    "assertion.event_name == 'workflow_dispatch'",
    "assertion.workflow_ref == '${local.promote_workflow_ref}'",
    "assertion.ref == '${var.promote_branch_ref}'",
    "assertion.environment == '${var.github_environment_name}'",
  ])

  # Principals are limited to this pool only. Build tokens use pool maps-github and
  # cannot satisfy a principalSet under maps-github-deploy.
  deploy_principal_set = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_deploy.name}/attribute.workflow_ref/${local.promote_workflow_ref}"
}

resource "google_iam_workload_identity_pool" "github_deploy" {
  project                   = var.project_id
  workload_identity_pool_id = local.deploy_workflow_pool_id
  display_name              = "MAPS GitHub deploy"
  description               = "GitHub OIDC for production promotion only. Isolated from maps-github build pool."
  disabled                  = false

  lifecycle {
    precondition {
      condition     = local.deploy_workflow_pool_id != "maps-github"
      error_message = "Deploy pool id must not reuse maps-github (build pool)."
    }
  }
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_deploy.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  display_name                       = "GitHub OIDC promote"
  description                        = "release-promote.yml on main with GitHub environment production."
  attribute_condition                = local.promote_attribute_condition
  attribute_mapping = {
    "google.subject"                = "assertion.sub"
    "attribute.repository_id"       = "assertion.repository_id"
    "attribute.repository_owner_id" = "assertion.repository_owner_id"
    "attribute.workflow_ref"        = "assertion.workflow_ref"
    "attribute.environment"         = "assertion.environment"
  }

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  lifecycle {
    precondition {
      condition = (
        !strcontains(local.promote_attribute_condition, "release-build.yml")
        && strcontains(local.promote_attribute_condition, "assertion.environment == 'production'")
        && strcontains(local.promote_attribute_condition, "assertion.repository_owner_id ==")
        && strcontains(local.promote_attribute_condition, "assertion.repository_id ==")
      )
      error_message = "Deploy provider must bind numeric repo IDs, production environment, and must not accept release-build.yml."
    }
  }
}

resource "google_service_account" "deploy" {
  project      = var.project_id
  account_id   = "${var.prefix}-deploy"
  display_name = "MAPS production release deploy"

  lifecycle {
    precondition {
      condition = (
        !strcontains(local.promote_attribute_condition, "release-build.yml")
        && strcontains(local.promote_attribute_condition, "assertion.environment == 'production'")
      )
      error_message = "Deploy federation must not reuse release-build.yml and must require the production environment claim."
    }
  }
}

resource "google_service_account_iam_member" "deploy_workload_identity_user" {
  service_account_id = google_service_account.deploy.name
  role               = "roles/iam.workloadIdentityUser"
  member             = local.deploy_principal_set

  lifecycle {
    precondition {
      condition     = strcontains(local.deploy_principal_set, "/workloadIdentityPools/${local.deploy_workflow_pool_id}/")
      error_message = "Deploy workloadIdentityUser must reference only the maps-github-deploy pool."
    }
  }
}

# State access: list + read + write objects for plan/apply. Prefix enforcement is
# by bucket policy and workflow, not IAM condition here (needs C3 plan review).
resource "google_project_iam_custom_role" "terraform_state" {
  project     = var.project_id
  role_id     = "mapsTerraformStateRW"
  title       = "MAPS Terraform state read/write"
  description = "Read and write state objects in the configured bucket. Does not grant project-wide storage admin."
  permissions = [
    "storage.objects.create",
    "storage.objects.delete",
    "storage.objects.get",
    "storage.objects.list",
    "storage.objects.update",
  ]
  stage = "GA"
}

resource "google_storage_bucket_iam_member" "deploy_state" {
  bucket = var.terraform_state_bucket_name
  role   = google_project_iam_custom_role.terraform_state.id
  member = "serviceAccount:${google_service_account.deploy.email}"
}

# Same digest metadata reads as the build submitter (no blob download).
resource "google_project_iam_custom_role" "artifact_digest_reader" {
  project     = var.project_id
  role_id     = "mapsArtifactDigestReaderDeploy"
  title       = "MAPS Artifact Registry digest reader (deploy)"
  description = "Read image and tag metadata during promotion preflight."
  permissions = [
    "artifactregistry.dockerimages.get",
    "artifactregistry.repositories.get",
    "artifactregistry.tags.get",
    "artifactregistry.versions.get",
  ]
  stage = "GA"
}

resource "google_artifact_registry_repository_iam_member" "deploy_digest_reader" {
  project    = var.project_id
  location   = var.region
  repository = var.artifact_registry_repository
  role       = google_project_iam_custom_role.artifact_digest_reader.id
  member     = "serviceAccount:${google_service_account.deploy.email}"

  lifecycle {
    precondition {
      condition     = var.artifact_registry_repository == var.prefix
      error_message = "Digest reads are limited to the production repository ID."
    }
  }
}

# Placeholder for C3: Cloud Run service/job updates and maps-prod-migrate execute.
# Permissions will be refined after the first scoped terraform plan with this SA.
resource "google_project_iam_custom_role" "cloudrun_promotion_placeholder" {
  project     = var.project_id
  role_id     = "mapsCloudRunPromotionDraft"
  title       = "MAPS Cloud Run promotion (draft)"
  description = "Draft role for R6-C3. Expand only after a real terraform plan lists required permissions."
  permissions = [
    "run.services.get",
    "run.jobs.get",
  ]
  stage = "GA"
}

resource "google_project_iam_member" "deploy_cloudrun_draft" {
  project = var.project_id
  role    = google_project_iam_custom_role.cloudrun_promotion_placeholder.id
  member  = "serviceAccount:${google_service_account.deploy.email}"
}
