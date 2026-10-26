variable "project_id" {
  description = "Google Cloud project ID."
  type        = string

  validation {
    condition     = length(trimspace(var.project_id)) > 0
    error_message = "project_id must not be empty."
  }
}

variable "region" {
  description = "Region of the Cloud Run services attached to the load balancer."
  type        = string

  validation {
    condition     = length(trimspace(var.region)) > 0
    error_message = "region must not be empty."
  }
}

variable "prefix" {
  description = "Resource naming prefix."
  type        = string

  validation {
    condition     = can(regex("^[a-z](?:[-a-z0-9]{0,43}[a-z0-9])?$", var.prefix)) && length("${var.prefix}-frontend-backend") <= 63
    error_message = "prefix must produce load balancer resource names of at most 63 characters, using lowercase letters, numbers, and hyphens."
  }
}

variable "frontend_service_name" {
  description = "Cloud Run frontend service name attached to the frontend serverless NEG."
  type        = string

  validation {
    condition     = length(trimspace(var.frontend_service_name)) > 0
    error_message = "frontend_service_name must not be empty."
  }
}

variable "backend_service_name" {
  description = "Cloud Run backend service name attached to the API serverless NEG."
  type        = string

  validation {
    condition     = length(trimspace(var.backend_service_name)) > 0
    error_message = "backend_service_name must not be empty."
  }
}

variable "public_origin" {
  description = "Public HTTPS origin. The hostname is derived by removing the https:// prefix."
  type        = string

  validation {
    condition     = can(regex("^https://(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$", var.public_origin)) && length(trimprefix(var.public_origin, "https://")) <= 253
    error_message = "public_origin must be an HTTPS origin with a lowercase hostname, without userinfo, port, path, query, fragment, or a trailing slash."
  }
}
