variable "project_id" {
  description = "Google Cloud project ID."
  type        = string

  validation {
    condition     = length(trimspace(var.project_id)) > 0
    error_message = "project_id must not be empty."
  }
}

variable "region" {
  description = "Region for the Cloud Run jobs."
  type        = string

  validation {
    condition     = length(trimspace(var.region)) > 0
    error_message = "region must not be empty."
  }
}

variable "prefix" {
  description = "Resource naming prefix. Jobs are named prefix-migrate and prefix-bootstrap."
  type        = string

  validation {
    condition     = can(regex("^[a-z](?:[-a-z0-9]{0,37}[a-z0-9])?$", var.prefix)) && length("${var.prefix}-bootstrap") <= 49
    error_message = "prefix must produce Cloud Run job names of at most 49 characters, using lowercase letters, numbers, and hyphens."
  }
}

variable "labels" {
  description = "Labels applied to the Cloud Run jobs."
  type        = map(string)

  validation {
    condition = alltrue([
      for key, value in var.labels :
      can(regex("^[a-z][a-z0-9_-]{0,62}$", key)) && can(regex("^[a-z0-9_-]{0,63}$", value))
    ])
    error_message = "labels must use valid GCP label keys and values (lowercase letters, numbers, underscores, and hyphens)."
  }
}

variable "migrate_service_account_email" {
  description = "Runtime service account email for the database migrate job."
  type        = string

  validation {
    condition     = can(regex("^[^ @]+@[^ @]+$", var.migrate_service_account_email))
    error_message = "migrate_service_account_email must be a service account email."
  }
}

variable "bootstrap_service_account_email" {
  description = "Runtime service account email for the bootstrap admin job."
  type        = string

  validation {
    condition     = can(regex("^[^ @]+@[^ @]+$", var.bootstrap_service_account_email))
    error_message = "bootstrap_service_account_email must be a service account email."
  }
}

variable "network_name" {
  description = "VPC network name used by Direct VPC egress."
  type        = string

  validation {
    condition     = length(trimspace(var.network_name)) > 0
    error_message = "network_name must not be empty."
  }
}

variable "serverless_subnet_name" {
  description = "Subnet name used by Direct VPC egress."
  type        = string

  validation {
    condition     = length(trimspace(var.serverless_subnet_name)) > 0
    error_message = "serverless_subnet_name must not be empty."
  }
}

variable "jobs_image" {
  description = "Immutable jobs image reference. Must end with @sha256 and a 64-character digest."
  type        = string

  validation {
    condition     = can(regex("@sha256:[0-9a-fA-F]{64}$", var.jobs_image))
    error_message = "jobs_image must be an immutable reference ending in @sha256 and 64 hexadecimal digits."
  }
}

variable "database_url_migrate_secret_id" {
  description = "Secret Manager secret ID referenced by the migrate job DATABASE_URL."
  type        = string

  validation {
    condition     = length(trimspace(var.database_url_migrate_secret_id)) > 0
    error_message = "database_url_migrate_secret_id must not be empty."
  }
}

variable "database_url_app_secret_id" {
  description = "Secret Manager secret ID referenced by the bootstrap job DATABASE_URL."
  type        = string

  validation {
    condition     = length(trimspace(var.database_url_app_secret_id)) > 0
    error_message = "database_url_app_secret_id must not be empty."
  }
}

variable "bootstrap_admin_email_secret_id" {
  description = "Secret Manager secret ID referenced by BOOTSTRAP_ADMIN_EMAIL."
  type        = string

  validation {
    condition     = length(trimspace(var.bootstrap_admin_email_secret_id)) > 0
    error_message = "bootstrap_admin_email_secret_id must not be empty."
  }
}

variable "bootstrap_admin_password_secret_id" {
  description = "Secret Manager secret ID referenced by BOOTSTRAP_ADMIN_PASSWORD."
  type        = string

  validation {
    condition     = length(trimspace(var.bootstrap_admin_password_secret_id)) > 0
    error_message = "bootstrap_admin_password_secret_id must not be empty."
  }
}

variable "database_url_migrate_secret_version" {
  description = "Existing Secret Manager version number for the migrate DATABASE_URL. Terraform does not create the version."
  type        = string

  validation {
    condition     = can(regex("^[1-9][0-9]*$", var.database_url_migrate_secret_version))
    error_message = "database_url_migrate_secret_version must be a positive integer string such as 1."
  }
}

variable "database_url_app_secret_version" {
  description = "Existing Secret Manager version number for the bootstrap DATABASE_URL. Terraform does not create the version."
  type        = string

  validation {
    condition     = can(regex("^[1-9][0-9]*$", var.database_url_app_secret_version))
    error_message = "database_url_app_secret_version must be a positive integer string such as 1."
  }
}

variable "bootstrap_admin_email_secret_version" {
  description = "Existing Secret Manager version number for BOOTSTRAP_ADMIN_EMAIL. Terraform does not create the version."
  type        = string

  validation {
    condition     = can(regex("^[1-9][0-9]*$", var.bootstrap_admin_email_secret_version))
    error_message = "bootstrap_admin_email_secret_version must be a positive integer string such as 1."
  }
}

variable "bootstrap_admin_password_secret_version" {
  description = "Existing Secret Manager version number for BOOTSTRAP_ADMIN_PASSWORD. Terraform does not create the version."
  type        = string

  validation {
    condition     = can(regex("^[1-9][0-9]*$", var.bootstrap_admin_password_secret_version))
    error_message = "bootstrap_admin_password_secret_version must be a positive integer string such as 1."
  }
}
