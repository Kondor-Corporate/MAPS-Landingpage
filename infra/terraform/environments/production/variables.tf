variable "project_id" {
  description = "Google Cloud project ID for the MAPS production environment."
  type        = string

  validation {
    condition     = length(trimspace(var.project_id)) > 0
    error_message = "project_id must not be empty."
  }
}

variable "region" {
  description = "Primary Google Cloud region for MAPS production resources."
  type        = string
  default     = "southamerica-east1"

  validation {
    condition     = var.region == "southamerica-east1"
    error_message = "MAPS production is currently designed for southamerica-east1."
  }
}

variable "assets_bucket_name" {
  description = "Globally unique name of the production MAPS assets bucket. Confirm availability before apply."
  type        = string

  validation {
    condition     = length(var.assets_bucket_name) >= 3 && length(var.assets_bucket_name) <= 63 && var.assets_bucket_name == trimspace(var.assets_bucket_name)
    error_message = "assets_bucket_name must be 3 to 63 characters and must not have leading or trailing spaces."
  }
}

variable "frontend_image" {
  description = "Immutable frontend image reference ending in @sha256 and 64 hexadecimal digits."
  type        = string

  validation {
    condition     = can(regex("@sha256:[0-9a-fA-F]{64}$", var.frontend_image))
    error_message = "frontend_image must be an immutable reference ending in @sha256 and 64 hexadecimal digits."
  }
}

variable "backend_image" {
  description = "Immutable backend image reference ending in @sha256 and 64 hexadecimal digits."
  type        = string

  validation {
    condition     = can(regex("@sha256:[0-9a-fA-F]{64}$", var.backend_image))
    error_message = "backend_image must be an immutable reference ending in @sha256 and 64 hexadecimal digits."
  }
}

variable "public_origin" {
  description = "Public HTTPS origin for MAPS production. Do not include a trailing slash or hardcode it before the domain is confirmed."
  type        = string

  validation {
    condition     = startswith(var.public_origin, "https://") && !endswith(var.public_origin, "/") && length(var.public_origin) > 8
    error_message = "public_origin must be an HTTPS URL without a trailing slash."
  }
}

variable "nominatim_user_agent" {
  description = "User-Agent the production backend sends to Nominatim."
  type        = string

  validation {
    condition     = length(trimspace(var.nominatim_user_agent)) > 0
    error_message = "nominatim_user_agent must not be empty."
  }
}

variable "database_url_app_secret_version" {
  description = "Existing numeric version of the application database URL secret. Terraform does not create it."
  type        = string

  validation {
    condition     = can(regex("^[1-9][0-9]*$", var.database_url_app_secret_version))
    error_message = "database_url_app_secret_version must be a positive integer string such as 1."
  }
}

variable "jwt_secret_version" {
  description = "Existing numeric version of the JWT secret. Terraform does not create it."
  type        = string

  validation {
    condition     = can(regex("^[1-9][0-9]*$", var.jwt_secret_version))
    error_message = "jwt_secret_version must be a positive integer string such as 1."
  }
}

variable "refresh_secret_version" {
  description = "Existing numeric version of the refresh secret. Terraform does not create it."
  type        = string

  validation {
    condition     = can(regex("^[1-9][0-9]*$", var.refresh_secret_version))
    error_message = "refresh_secret_version must be a positive integer string such as 1."
  }
}
