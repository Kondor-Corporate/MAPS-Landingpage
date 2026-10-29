variable "project_id" {
  description = "Google Cloud project ID."
  type        = string

  validation {
    condition     = length(trimspace(var.project_id)) > 0
    error_message = "project_id must not be empty."
  }
}

variable "region" {
  description = "Region of the Artifact Registry repository that the submitter may describe."
  type        = string

  validation {
    condition     = length(trimspace(var.region)) > 0
    error_message = "region must not be empty."
  }
}

variable "prefix" {
  description = "Resource naming prefix. The submitter account ID is prefix-build-submit."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,18}[a-z0-9]$", var.prefix)) && length("${var.prefix}-build-submit") <= 30
    error_message = "prefix must produce a submitter account ID of at most 30 characters."
  }
}

variable "build_service_account_email" {
  description = "Existing service account that executes Cloud Build. The submitter may act as this account and no other."
  type        = string

  validation {
    condition     = can(regex("^[^\\s@]+@[^\\s@]+\\.iam\\.gserviceaccount\\.com$", var.build_service_account_email))
    error_message = "build_service_account_email must be a service account email."
  }
}

variable "build_source_bucket_name" {
  description = "Temporary Cloud Build source bucket. The submitter can create and read objects here, and read this bucket's metadata. It has no access to other buckets."
  type        = string

  validation {
    condition     = length(var.build_source_bucket_name) >= 3 && length(var.build_source_bucket_name) <= 63 && var.build_source_bucket_name == trimspace(var.build_source_bucket_name)
    error_message = "build_source_bucket_name must be 3 to 63 characters and must not have leading or trailing spaces."
  }
}

variable "artifact_registry_repository" {
  description = "Docker repository the submitter may describe. It cannot push."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,61}[a-z0-9]$", var.artifact_registry_repository))
    error_message = "artifact_registry_repository must be a lowercase repository ID."
  }
}
