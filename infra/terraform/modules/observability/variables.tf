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

variable "database_instance_name" {
  description = "Cloud SQL instance name. Monitoring identifies the instance as project_id:instance_name."
  type        = string

  validation {
    condition     = can(regex("^[a-z](?:[a-z0-9-]{0,96}[a-z0-9])?$", var.database_instance_name))
    error_message = "database_instance_name must be a Cloud SQL instance name: lowercase letters, numbers, and hyphens."
  }
}

variable "alert_email" {
  description = "Email address that receives production monitoring alerts. This is not a secret."
  type        = string

  validation {
    condition     = can(regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", var.alert_email)) && length(var.alert_email) <= 254
    error_message = "alert_email must be an email address."
  }
}
