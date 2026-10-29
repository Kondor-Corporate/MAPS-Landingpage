variable "project_id" {
  description = "Google Cloud project ID."
  type        = string

  validation {
    condition     = length(trimspace(var.project_id)) > 0
    error_message = "project_id must not be empty."
  }
}

variable "region" {
  description = "Region where the assets and Cloud Build source buckets store objects."
  type        = string

  validation {
    condition     = length(trimspace(var.region)) > 0
    error_message = "region must not be empty."
  }
}

variable "bucket_name" {
  description = "Globally unique Cloud Storage bucket name."
  type        = string

  validation {
    condition     = length(var.bucket_name) >= 3 && length(var.bucket_name) <= 63 && var.bucket_name == trimspace(var.bucket_name)
    error_message = "bucket_name must be 3 to 63 characters and must not have leading or trailing spaces."
  }
}

variable "labels" {
  description = "Labels applied to the assets bucket."
  type        = map(string)

  validation {
    condition = alltrue([
      for key, value in var.labels :
      can(regex("^[a-z][a-z0-9_-]{0,62}$", key)) && can(regex("^[a-z0-9_-]{0,63}$", value))
    ])
    error_message = "labels must use valid Cloud Storage label keys and values (lowercase letters, numbers, underscores, and hyphens)."
  }
}
