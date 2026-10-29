variable "project_id" {
  description = "Google Cloud project ID."
  type        = string

  validation {
    condition     = length(trimspace(var.project_id)) > 0
    error_message = "project_id must not be empty."
  }
}

variable "prefix" {
  description = "Resource naming prefix."
  type        = string

  validation {
    condition     = can(regex("^[a-z](?:[-a-z0-9]{0,43}[a-z0-9])?$", var.prefix))
    error_message = "prefix must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens."
  }
}

variable "public_origin" {
  description = "Public HTTPS origin. The uptime check hostname is derived by removing the https:// prefix."
  type        = string

  validation {
    condition     = can(regex("^https://(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$", var.public_origin)) && length(trimprefix(var.public_origin, "https://")) <= 253
    error_message = "public_origin must be an HTTPS origin with a lowercase hostname, without userinfo, port, path, query, fragment, or a trailing slash."
  }
}

variable "region" {
  description = "Region of the Cloud Run services. Uptime checks are global; Cloud Run alerts filter on this location."
  type        = string

  validation {
    condition     = length(trimspace(var.region)) > 0 && var.region == trimspace(var.region)
    error_message = "region must not be empty."
  }
}

variable "frontend_service_name" {
  description = "Cloud Run frontend service name used by the production alerts."
  type        = string

  validation {
    condition     = can(regex("^[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$", var.frontend_service_name))
    error_message = "frontend_service_name must be a Cloud Run service name: lowercase letters, numbers, and hyphens."
  }
}

variable "backend_service_name" {
  description = "Cloud Run backend service name used by the production alerts."
  type        = string

  validation {
    condition     = can(regex("^[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$", var.backend_service_name))
    error_message = "backend_service_name must be a Cloud Run service name: lowercase letters, numbers, and hyphens."
  }
}

variable "database_instance_name" {
  description = "Cloud SQL instance name. Monitoring identifies the instance as project_id:instance_name."
  type        = string

  validation {
    condition     = can(regex("^[a-z](?:[a-z0-9-]{0,96}[a-z0-9])?$", var.database_instance_name))
    error_message = "database_instance_name must be a Cloud SQL instance name: lowercase letters, numbers, and hyphens."
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
