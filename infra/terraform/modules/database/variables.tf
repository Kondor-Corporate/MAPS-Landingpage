variable "project_id" {
  description = "Google Cloud project ID."
  type        = string

  validation {
    condition     = length(trimspace(var.project_id)) > 0
    error_message = "project_id must not be empty."
  }
}

variable "region" {
  description = "Region for the Cloud SQL instance."
  type        = string

  validation {
    condition     = length(trimspace(var.region)) > 0
    error_message = "region must not be empty."
  }
}

variable "prefix" {
  description = "Resource naming prefix. The Cloud SQL instance name is this prefix plus -db."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,94}$", var.prefix)) && !endswith(var.prefix, "-")
    error_message = "prefix must start with a lowercase letter, contain only lowercase letters, numbers, and hyphens, and must not end with a hyphen."
  }
}

variable "network_id" {
  description = "VPC network ID (projects/PROJECT/global/networks/NAME). Private Services Access on this VPC must already be established; callers should depend on the network module."
  type        = string

  validation {
    condition     = length(trimspace(var.network_id)) > 0 && strcontains(var.network_id, "/global/networks/")
    error_message = "network_id must be a VPC resource ID (projects/PROJECT/global/networks/NAME)."
  }
}

variable "private_services_range_name" {
  description = "Name of the Private Services Access range that hosts the Cloud SQL private IP."
  type        = string

  validation {
    condition     = can(regex("^[a-z](?:[-a-z0-9]{0,61}[a-z0-9])?$", var.private_services_range_name))
    error_message = "private_services_range_name must be an RFC 1035 name of 1 to 63 characters."
  }
}

variable "labels" {
  description = "Labels applied to the Cloud SQL instance."
  type        = map(string)

  validation {
    condition = alltrue([
      for key, value in var.labels :
      can(regex("^[a-z][a-z0-9_-]{0,62}$", key)) && can(regex("^[a-z0-9_-]{0,63}$", value))
    ])
    error_message = "labels must use valid Cloud SQL label keys and values (lowercase letters, numbers, underscores, and hyphens)."
  }
}

variable "database_version" {
  description = "Cloud SQL PostgreSQL version."
  type        = string
  default     = "POSTGRES_17"

  validation {
    condition     = var.database_version == "POSTGRES_17"
    error_message = "database_version must be POSTGRES_17."
  }
}

variable "edition" {
  description = "Cloud SQL edition. Production uses Enterprise, not Enterprise Plus."
  type        = string
  default     = "ENTERPRISE"

  validation {
    condition     = var.edition == "ENTERPRISE"
    error_message = "edition must be ENTERPRISE."
  }
}

variable "tier" {
  description = "Cloud SQL machine tier. Default is 1 vCPU and 3.75 GB RAM."
  type        = string
  default     = "db-custom-1-3840"

  validation {
    condition     = can(regex("^db-custom-[1-9][0-9]*-[1-9][0-9]*$", var.tier))
    error_message = "tier must be a Cloud SQL custom machine type such as db-custom-1-3840."
  }
}

variable "availability_type" {
  description = "Cloud SQL availability type. Production is zonal, without high availability."
  type        = string
  default     = "ZONAL"

  validation {
    condition     = var.availability_type == "ZONAL"
    error_message = "availability_type must be ZONAL."
  }
}

variable "disk_size_gb" {
  description = "Initial PD_SSD size in GB. Later autoresize growth is ignored by Terraform."
  type        = number
  default     = 10

  validation {
    condition     = var.disk_size_gb == floor(var.disk_size_gb) && var.disk_size_gb >= 10 && var.disk_size_gb <= 65536
    error_message = "disk_size_gb must be a whole number of gigabytes from 10 to 65536."
  }
}

variable "database_name" {
  description = "Logical PostgreSQL database created on the instance."
  type        = string
  default     = "maps_asesores_prod"

  validation {
    condition     = can(regex("^[a-z_][a-z0-9_]{0,62}$", var.database_name))
    error_message = "database_name must be a lowercase PostgreSQL identifier of at most 63 characters."
  }
}

variable "backup_start_time" {
  description = "Daily backup start time in UTC, HH:MM. Cloud SQL starts the backup around this time."
  type        = string
  default     = "05:00"

  validation {
    condition     = can(regex("^(?:[01][0-9]|2[0-3]):[0-5][0-9]$", var.backup_start_time))
    error_message = "backup_start_time must be UTC HH:MM, for example 05:00."
  }
}

variable "backup_retained_count" {
  description = "Number of automated backups to retain."
  type        = number
  default     = 14

  validation {
    condition     = var.backup_retained_count == floor(var.backup_retained_count) && var.backup_retained_count >= 1 && var.backup_retained_count <= 365
    error_message = "backup_retained_count must be a whole number from 1 to 365."
  }
}

variable "transaction_log_retention_days" {
  description = "Days of transaction logs retained for point-in-time recovery. Enterprise PostgreSQL allows 1 to 7."
  type        = number
  default     = 7

  validation {
    condition     = var.transaction_log_retention_days == floor(var.transaction_log_retention_days) && var.transaction_log_retention_days >= 1 && var.transaction_log_retention_days <= 7
    error_message = "transaction_log_retention_days must be a whole number from 1 to 7."
  }
}

variable "final_backup_retention_days" {
  description = "Days to retain the final backup taken when the instance is deleted."
  type        = number
  default     = 30

  validation {
    condition     = var.final_backup_retention_days == floor(var.final_backup_retention_days) && var.final_backup_retention_days >= 1 && var.final_backup_retention_days <= 365
    error_message = "final_backup_retention_days must be a whole number from 1 to 365."
  }
}
