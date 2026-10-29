variable "project_id" {
  description = "Google Cloud project ID."
  type        = string

  validation {
    condition     = length(trimspace(var.project_id)) > 0
    error_message = "project_id must not be empty."
  }
}

variable "region" {
  description = "Region of the Artifact Registry repository."
  type        = string

  validation {
    condition     = length(trimspace(var.region)) > 0
    error_message = "region must not be empty."
  }
}

variable "prefix" {
  description = "Artifact Registry repository ID."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,61}[a-z0-9]$", var.prefix))
    error_message = "prefix must be a 2-63 character repository ID: lowercase letters, numbers, and hyphens, starting with a letter and not ending with a hyphen."
  }
}

variable "labels" {
  description = "Labels applied to the Artifact Registry repository."
  type        = map(string)

  validation {
    condition = alltrue([
      for key, value in var.labels :
      can(regex("^[a-z][a-z0-9_-]{0,62}$", key)) && can(regex("^[a-z0-9_-]{0,63}$", value))
    ])
    error_message = "labels must use valid GCP label keys and values (lowercase letters, numbers, underscores, and hyphens)."
  }
}

variable "build_service_account_email" {
  description = "Email of the service account allowed to push images to this repository."
  type        = string

  validation {
    condition     = can(regex("^[^\\s@]+@[^\\s@]+$", var.build_service_account_email))
    error_message = "build_service_account_email must be a service account email."
  }
}
