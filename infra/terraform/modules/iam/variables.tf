variable "project_id" {
  description = "Google Cloud project ID."
  type        = string

  validation {
    condition     = length(trimspace(var.project_id)) > 0
    error_message = "project_id must not be empty."
  }
}

variable "prefix" {
  description = "Resource naming prefix. Service accounts and secrets are named from this prefix."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,18}[a-z0-9]$", var.prefix)) && length("${var.prefix}-bootstrap") <= 30
    error_message = "prefix must produce service account IDs of at most 30 characters, using lowercase letters, numbers, and hyphens."
  }
}

variable "labels" {
  description = "Labels applied to Secret Manager secret containers."
  type        = map(string)

  validation {
    condition = alltrue([
      for key, value in var.labels :
      can(regex("^[a-z][a-z0-9_-]{0,62}$", key)) && can(regex("^[a-z0-9_-]{0,63}$", value))
    ])
    error_message = "labels must use valid GCP label keys and values (lowercase letters, numbers, underscores, and hyphens)."
  }
}

variable "assets_bucket_name" {
  description = "Production assets bucket that receives roles/storage.objectUser for the backend service account."
  type        = string

  validation {
    condition     = length(var.assets_bucket_name) >= 3 && length(var.assets_bucket_name) <= 63 && var.assets_bucket_name == trimspace(var.assets_bucket_name)
    error_message = "assets_bucket_name must be 3 to 63 characters and must not have leading or trailing spaces."
  }
}
