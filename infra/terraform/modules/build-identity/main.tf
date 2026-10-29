# GitHub Actions may submit Cloud Build jobs. It does not run them.
# maps-prod-build stays the only identity in the build serviceAccount field.
# This module does not grant the Compute Engine default service account,
# and it does not bind Workload Identity to the account that runs the build.
#
# The OIDC condition uses GitHub's numeric owner and repository IDs, the
# workflow file, the branch selected for that file, and event_name.
# inputs.git_sha is not an OIDC claim. assertion.sha is the tip of the
# dispatch branch, not the requested commit, so it is not mapped.
# job_workflow_ref is documented only for reusable workflows. This workflow
# is not reusable, so the claim may be absent and must not be required.

locals {
  github_repository_owner    = "Kondor-Corporate"
  github_repository_name     = "MAPS-Landingpage"
  github_repository_owner_id = "266150176"
  github_repository_id       = "1174729313"
  github_workflow_file       = ".github/workflows/release-build.yml"

  # workflow_ref is "<owner>/<repo>/<file>@<ref>". ref is the branch selected
  # in workflow_dispatch, which must be one of these two. A feature branch
  # does not match even if it contains a copy of the workflow file.
  github_workflow_branches = [
    "refs/heads/main",
    "refs/heads/development",
  ]

  workflow_ref_prefix = "${local.github_repository_owner}/${local.github_repository_name}/${local.github_workflow_file}@"

  attribute_condition = join(" && ", [
    "assertion.repository_owner_id == '${local.github_repository_owner_id}'",
    "assertion.repository_id == '${local.github_repository_id}'",
    "assertion.event_name == 'workflow_dispatch'",
    "(${join(" || ", [
      for branch in local.github_workflow_branches :
      "(assertion.workflow_ref == '${local.workflow_ref_prefix}${branch}' && assertion.ref == '${branch}')"
    ])})",
  ])
}

resource "google_service_account" "submit" {
  project      = var.project_id
  account_id   = "${var.prefix}-build-submit"
  display_name = "MAPS production build submit"

  lifecycle {
    precondition {
      condition = (
        can(regex("^[0-9]+$", local.github_repository_owner_id))
        && can(regex("^[0-9]+$", local.github_repository_id))
        && !strcontains(local.attribute_condition, "git_sha")
        && !strcontains(local.attribute_condition, "assertion.sha")
        && !strcontains(local.attribute_condition, "job_workflow_ref")
        && strcontains(local.attribute_condition, "assertion.event_name == 'workflow_dispatch'")
      )
      error_message = "Workload Identity must use numeric GitHub IDs and workflow_dispatch, and must not trust a commit SHA or job_workflow_ref."
    }
  }
}

resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "maps-github"
  display_name              = "MAPS GitHub"
  description               = "GitHub Actions OIDC for MAPS-Landingpage release builds."
  disabled                  = false
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  display_name                       = "GitHub OIDC"
  description                        = "release-build.yml on main or development. The requested commit SHA is not an authorization claim."
  attribute_condition                = local.attribute_condition
  # attribute.repository_id is what the workloadIdentityUser principalSet selects.
  # The other mappings are not principals. allowed_audiences stays unset: the
  # provider then accepts only its canonical audience, which is what
  # google-github-actions/auth@v2 requests when the workflow omits audience.
  attribute_mapping = {
    "google.subject"                = "assertion.sub"
    "attribute.repository_id"       = "assertion.repository_id"
    "attribute.repository_owner_id" = "assertion.repository_owner_id"
    "attribute.workflow_ref"        = "assertion.workflow_ref"
    "attribute.event_name"          = "assertion.event_name"
  }

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# cloudbuild.builds.create is also the permission Google uses to create a
# build trigger. There is no smaller split. A trigger still has to act as
# maps-prod-build, which is the only account this submitter can impersonate.
# serviceusage.services.use is required to call enabled APIs and is not
# included in the storage or Artifact Registry roles below.
resource "google_project_iam_custom_role" "build_submitter" {
  project     = var.project_id
  role_id     = "mapsCloudBuildSubmitter"
  title       = "MAPS Cloud Build submitter"
  description = "Create a Cloud Build job and read its status. builds.create also allows creating a trigger."
  permissions = [
    "cloudbuild.builds.create",
    "cloudbuild.builds.get",
    "serviceusage.services.use",
  ]
  stage = "GA"
}

# Describe image_summary.digest. Omits downloadArtifacts and files.download
# so this identity cannot pull image layers.
resource "google_project_iam_custom_role" "artifact_digest_reader" {
  project     = var.project_id
  role_id     = "mapsArtifactDigestReader"
  title       = "MAPS Artifact Registry digest reader"
  description = "Read image and tag metadata. Does not push or download blobs."
  permissions = [
    "artifactregistry.dockerimages.get",
    "artifactregistry.repositories.get",
    "artifactregistry.tags.get",
    "artifactregistry.versions.get",
  ]
  stage = "GA"
}

resource "google_project_iam_member" "submit_builds" {
  project = var.project_id
  role    = google_project_iam_custom_role.build_submitter.id
  member  = "serviceAccount:${google_service_account.submit.email}"
}

resource "google_service_account_iam_member" "workload_identity_user" {
  service_account_id = google_service_account.submit.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository_id/${local.github_repository_id}"
}

resource "google_service_account_iam_member" "act_as_build" {
  service_account_id = "projects/${var.project_id}/serviceAccounts/${var.build_service_account_email}"
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.submit.email}"

  lifecycle {
    precondition {
      condition = (
        var.build_service_account_email == "${var.prefix}-build@${var.project_id}.iam.gserviceaccount.com"
        && !strcontains(var.build_service_account_email, "-compute@developer.gserviceaccount.com")
      )
      error_message = "The submitter may act only as the dedicated build account, never the default Compute Engine service account."
    }
  }
}

# gcloud builds submit calls storage.buckets.get (CreateBucketIfNotExists)
# before it uploads the archive. objectCreator and objectViewer do not
# include that permission. The role stays off the project binding so it
# cannot read metadata of the assets bucket or the Terraform state bucket.
resource "google_project_iam_custom_role" "build_source_bucket_getter" {
  project     = var.project_id
  role_id     = "mapsBuildSourceBucketGetter"
  title       = "MAPS Cloud Build source bucket metadata reader"
  description = "Read metadata of the Cloud Build source bucket. Does not list or read objects."
  permissions = [
    "storage.buckets.get",
  ]
  stage = "GA"
}

resource "google_storage_bucket_iam_member" "submit_source_bucket_getter" {
  bucket = var.build_source_bucket_name
  role   = google_project_iam_custom_role.build_source_bucket_getter.id
  member = "serviceAccount:${google_service_account.submit.email}"

  lifecycle {
    precondition {
      condition     = var.build_source_bucket_name == "${var.project_id}-build-source"
      error_message = "Bucket metadata reads are limited to the project build-source bucket."
    }
  }
}

resource "google_storage_bucket_iam_member" "submit_source_creator" {
  bucket = var.build_source_bucket_name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.submit.email}"

  lifecycle {
    precondition {
      condition     = var.build_source_bucket_name == "${var.project_id}-build-source"
      error_message = "Source upload is limited to the project build-source bucket."
    }
  }
}

resource "google_storage_bucket_iam_member" "submit_source_viewer" {
  bucket = var.build_source_bucket_name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.submit.email}"
}

resource "google_artifact_registry_repository_iam_member" "submit_digest_reader" {
  project    = var.project_id
  location   = var.region
  repository = var.artifact_registry_repository
  role       = google_project_iam_custom_role.artifact_digest_reader.id
  member     = "serviceAccount:${google_service_account.submit.email}"

  lifecycle {
    precondition {
      condition     = var.artifact_registry_repository == var.prefix
      error_message = "Digest reads are limited to the repository named by prefix."
    }
  }
}
