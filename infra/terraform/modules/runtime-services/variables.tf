variable "project_id" {
  description = "Google Cloud project ID."
  type        = string

  validation {
    condition     = length(trimspace(var.project_id)) > 0
    error_message = "project_id must not be empty."
  }
}

variable "region" {
  description = "Region for the Cloud Run services."
  type        = string

  validation {
    condition     = length(trimspace(var.region)) > 0
    error_message = "region must not be empty."
  }
}

variable "prefix" {
  description = "Resource naming prefix. Cloud Run services are named prefix-frontend and prefix-backend."
  type        = string

  validation {
    condition     = can(regex("^[a-z](?:[-a-z0-9]{0,38}[a-z0-9])?$", var.prefix)) && length("${var.prefix}-frontend") <= 49
    error_message = "prefix must produce Cloud Run service names of at most 49 characters, using lowercase letters, numbers, and hyphens."
  }
}

variable "labels" {
  description = "Labels applied to the Cloud Run services."
  type        = map(string)

  validation {
    condition = alltrue([
      for key, value in var.labels :
      can(regex("^[a-z][a-z0-9_-]{0,62}$", key)) && can(regex("^[a-z0-9_-]{0,63}$", value))
    ])
    error_message = "labels must use valid GCP label keys and values (lowercase letters, numbers, underscores, and hyphens)."
  }
}

variable "frontend_service_account_email" {
  description = "Runtime service account email for the frontend Cloud Run service."
  type        = string

  validation {
    condition     = can(regex("^[^ @]+@[^ @]+$", var.frontend_service_account_email))
    error_message = "frontend_service_account_email must be a service account email."
  }
}

variable "backend_service_account_email" {
  description = "Runtime service account email for the backend Cloud Run service."
  type        = string

  validation {
    condition     = can(regex("^[^ @]+@[^ @]+$", var.backend_service_account_email))
    error_message = "backend_service_account_email must be a service account email."
  }
}

variable "network_name" {
  description = "VPC network name used by backend Direct VPC egress."
  type        = string

  validation {
    condition     = length(trimspace(var.network_name)) > 0
    error_message = "network_name must not be empty."
  }
}

variable "serverless_subnet_name" {
  description = "Subnet name used by backend Direct VPC egress."
  type        = string

  validation {
    condition     = length(trimspace(var.serverless_subnet_name)) > 0
    error_message = "serverless_subnet_name must not be empty."
  }
}

variable "assets_bucket_name" {
  description = "Assets bucket name exposed to the backend as GCS_BUCKET."
  type        = string

  validation {
    condition     = length(var.assets_bucket_name) >= 3 && length(var.assets_bucket_name) <= 63 && var.assets_bucket_name == trimspace(var.assets_bucket_name)
    error_message = "assets_bucket_name must be 3 to 63 characters and must not have leading or trailing spaces."
  }
}

variable "database_url_app_secret_id" {
  description = "Secret Manager secret ID referenced by the backend DATABASE_URL."
  type        = string

  validation {
    condition     = length(trimspace(var.database_url_app_secret_id)) > 0
    error_message = "database_url_app_secret_id must not be empty."
  }
}

variable "jwt_secret_id" {
  description = "Secret Manager secret ID referenced by the backend JWT_SECRET."
  type        = string

  validation {
    condition     = length(trimspace(var.jwt_secret_id)) > 0
    error_message = "jwt_secret_id must not be empty."
  }
}

variable "refresh_secret_id" {
  description = "Secret Manager secret ID referenced by the backend REFRESH_SECRET."
  type        = string

  validation {
    condition     = length(trimspace(var.refresh_secret_id)) > 0
    error_message = "refresh_secret_id must not be empty."
  }
}

variable "frontend_image" {
  description = "Immutable frontend image reference. Must end with @sha256 and a 64-character digest."
  type        = string

  validation {
    condition     = can(regex("@sha256:[0-9a-fA-F]{64}$", var.frontend_image))
    error_message = "frontend_image must be an immutable reference ending in @sha256 and 64 hexadecimal digits."
  }
}

variable "backend_image" {
  description = "Immutable backend image reference. Must end with @sha256 and a 64-character digest."
  type        = string

  validation {
    condition     = can(regex("@sha256:[0-9a-fA-F]{64}$", var.backend_image))
    error_message = "backend_image must be an immutable reference ending in @sha256 and 64 hexadecimal digits."
  }
}

variable "database_url_app_secret_version" {
  description = "Existing Secret Manager version number for DATABASE_URL. Terraform does not create the version."
  type        = string

  validation {
    condition     = can(regex("^[1-9][0-9]*$", var.database_url_app_secret_version))
    error_message = "database_url_app_secret_version must be a positive integer string such as 1."
  }
}

variable "jwt_secret_version" {
  description = "Existing Secret Manager version number for JWT_SECRET. Terraform does not create the version."
  type        = string

  validation {
    condition     = can(regex("^[1-9][0-9]*$", var.jwt_secret_version))
    error_message = "jwt_secret_version must be a positive integer string such as 1."
  }
}

variable "refresh_secret_version" {
  description = "Existing Secret Manager version number for REFRESH_SECRET. Terraform does not create the version."
  type        = string

  validation {
    condition     = can(regex("^[1-9][0-9]*$", var.refresh_secret_version))
    error_message = "refresh_secret_version must be a positive integer string such as 1."
  }
}

variable "public_origin" {
  description = "Public HTTPS origin used by the frontend and backend. Hostname only: no userinfo, port, path, query, fragment, or trailing slash."
  type        = string

  validation {
    condition     = can(regex("^https://(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$", var.public_origin)) && length(trimprefix(var.public_origin, "https://")) <= 253
    error_message = "public_origin must be an HTTPS origin with a lowercase hostname, without userinfo, port, path, query, fragment, or a trailing slash."
  }
}

variable "nominatim_user_agent" {
  description = "User-Agent sent by the backend to Nominatim."
  type        = string

  validation {
    condition     = length(trimspace(var.nominatim_user_agent)) > 0
    error_message = "nominatim_user_agent must not be empty."
  }
}

variable "trust_proxy" {
  description = "TRUST_PROXY value. The initial production value is \"2\", designed for an External Application Load Balancer in front of Cloud Run. Validate it with real traffic in R5-I because rate limiting depends on req.ip. Do not set \"true\": trusting the entire X-Forwarded-For chain would accept unverified earlier hops."
  type        = string
  default     = "2"

  validation {
    condition     = length(trimspace(var.trust_proxy)) > 0 && lower(var.trust_proxy) != "true"
    error_message = "trust_proxy must be a non-empty hop count such as 2, and must not be true."
  }
}
