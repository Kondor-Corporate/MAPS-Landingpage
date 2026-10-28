resource "google_storage_bucket" "assets" {
  project                     = var.project_id
  name                        = var.bucket_name
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false
  labels                      = var.labels

  soft_delete_policy {
    retention_duration_seconds = 604800
  }
}

# Temporary Cloud Build source staging. Not the assets bucket and not the
# Terraform state bucket. The name is derived from the project ID so it stays
# globally unique without a second caller-supplied name.
resource "google_storage_bucket" "build_source" {
  project                     = var.project_id
  name                        = "${var.project_id}-build-source"
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false
  labels                      = var.labels

  # Source archives are disposable. Disable soft delete so an object removed
  # by the lifecycle rule is not retained for another week.
  soft_delete_policy {
    retention_duration_seconds = 0
  }

  lifecycle_rule {
    condition {
      age = 7
    }
    action {
      type = "Delete"
    }
  }

  lifecycle {
    precondition {
      condition     = "${var.project_id}-build-source" != var.bucket_name
      error_message = "The Cloud Build source bucket must stay separate from the assets bucket."
    }
  }
}
