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
  description = "Public HTTPS origin for MAPS production. Hostname only: no userinfo, port, path, query, fragment, or trailing slash."
  type        = string

  validation {
    condition     = can(regex("^https://(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$", var.public_origin)) && length(trimprefix(var.public_origin, "https://")) <= 253
    error_message = "public_origin must be an HTTPS origin with a lowercase hostname, without userinfo, port, path, query, fragment, or a trailing slash."
  }
}

variable "alert_emails" {
  description = "Email addresses that receive production monitoring alerts. Between 1 and 5. These are not secrets."
  type        = set(string)

  validation {
    condition = length(var.alert_emails) >= 1 && length(var.alert_emails) <= 5 && alltrue([
      for email in var.alert_emails : can(regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", email)) && length(email) <= 254
    ])
    error_message = "alert_emails must contain 1 to 5 email addresses."
  }
}

variable "billing_account_id" {
  description = "Cloud Billing account ID that pays for MAPS production. Format is XXXXXX-XXXXXX-XXXXXX. This is not a secret."
  type        = string

  validation {
    condition     = can(regex("^[A-Za-z0-9]{6}-[A-Za-z0-9]{6}-[A-Za-z0-9]{6}$", var.billing_account_id))
    error_message = "billing_account_id must be a Cloud Billing account ID in the form XXXXXX-XXXXXX-XXXXXX."
  }
}

variable "monthly_budget_usd" {
  description = "Gross monthly production budget in whole US dollars, before credits."
  type        = number
  default     = 110

  validation {
    condition     = var.monthly_budget_usd > 0 && var.monthly_budget_usd == floor(var.monthly_budget_usd)
    error_message = "monthly_budget_usd must be a positive whole number of US dollars."
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

variable "jobs_image" {
  description = "Immutable jobs image reference ending in @sha256 and 64 hexadecimal digits."
  type        = string

  validation {
    condition     = can(regex("@sha256:[0-9a-fA-F]{64}$", var.jobs_image))
    error_message = "jobs_image must be an immutable reference ending in @sha256 and 64 hexadecimal digits."
  }
}

variable "database_url_migrate_secret_version" {
  description = "Existing numeric version of the migrate database URL secret. Terraform does not create it."
  type        = string

  validation {
    condition     = can(regex("^[1-9][0-9]*$", var.database_url_migrate_secret_version))
    error_message = "database_url_migrate_secret_version must be a positive integer string such as 1."
  }
}

variable "bootstrap_admin_email_secret_version" {
  description = "Existing numeric version of the bootstrap admin email secret. Terraform does not create it."
  type        = string

  validation {
    condition     = can(regex("^[1-9][0-9]*$", var.bootstrap_admin_email_secret_version))
    error_message = "bootstrap_admin_email_secret_version must be a positive integer string such as 1."
  }
}

variable "bootstrap_admin_password_secret_version" {
  description = "Existing numeric version of the bootstrap admin password secret. Terraform does not create it."
  type        = string

  validation {
    condition     = can(regex("^[1-9][0-9]*$", var.bootstrap_admin_password_secret_version))
    error_message = "bootstrap_admin_password_secret_version must be a positive integer string such as 1."
  }
}

variable "frontend_cpu" {
  description = "vCPUs for the frontend Cloud Run container. Exposed here so scaling it later does not require editing the runtime-services module."
  type        = string
  default     = "1"
}

variable "frontend_memory" {
  description = "Memory for the frontend Cloud Run container."
  type        = string
  default     = "512Mi"
}

variable "frontend_concurrency" {
  description = "Maximum concurrent requests per frontend instance."
  type        = number
  default     = 80
}

variable "frontend_max_instance_count" {
  description = "Maximum frontend instance count."
  type        = number
  default     = 3
}

variable "backend_cpu" {
  description = "vCPUs for the backend Cloud Run container."
  type        = string
  default     = "1"
}

variable "backend_memory" {
  description = "Memory for the backend Cloud Run container. Lowered from the original 1Gi: 14 days of production metrics show peak container memory utilization at 6.9% of 1Gi (about 70 MB), so 512Mi keeps roughly 7x headroom. Raise it back here if a future workload needs more, without touching the module."
  type        = string
  default     = "512Mi"
}

variable "backend_concurrency" {
  description = "Maximum concurrent requests per backend instance."
  type        = number
  default     = 40
}

variable "backend_max_instance_count" {
  description = "Maximum backend instance count."
  type        = number
  default     = 3
}

variable "backend_startup_cpu_boost" {
  description = "Whether the backend gets an extra CPU burst during cold start. Kept true: with min_instance_count 0, backend cold starts already pay for a Direct VPC attach and a new Cloud SQL connection, and the measured cost delta from the boost is a small fraction of a cent per cold start, not worth the added latency risk."
  type        = bool
  default     = true
}

variable "database_tier" {
  description = "Cloud SQL machine tier for maps-prod-db. db-f1-micro (shared CPU, 614 MB RAM, max_connections 25) is the lowest-cost option while credits run low and traffic stays light; it has no SLA. db-g1-small (shared CPU, 1.7 GB RAM, max_connections 50) is a safer step down if f1-micro proves insufficient. A db-custom-X-Y value restores a dedicated-CPU tier. Changing this resizes the existing instance in place; it does not replace it."
  type        = string
  default     = "db-f1-micro"

  validation {
    condition     = contains(["db-f1-micro", "db-g1-small"], var.database_tier) || can(regex("^db-custom-[1-9][0-9]*-[1-9][0-9]*$", var.database_tier))
    error_message = "database_tier must be db-f1-micro, db-g1-small, or a Cloud SQL custom machine type such as db-custom-1-3840."
  }
}

variable "terraform_state_bucket_name" {
  description = "GCS bucket for Terraform state (backend GCS). Required on every plan/apply. Pass via gitignored tfvars or -var; never commit the name."
  type        = string

  validation {
    condition     = length(trimspace(var.terraform_state_bucket_name)) >= 3 && length(var.terraform_state_bucket_name) <= 63
    error_message = "terraform_state_bucket_name must be 3 to 63 characters and must not be blank. Omitting it must fail the plan, not silently remove deploy_identity."
  }
}
