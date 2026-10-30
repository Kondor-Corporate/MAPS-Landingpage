variable "project_id" {
  description = "Google Cloud project ID."
  type        = string

  validation {
    condition     = length(trimspace(var.project_id)) > 0
    error_message = "project_id must not be empty."
  }
}

variable "region" {
  description = "Region of the Artifact Registry repository used during promotion preflight."
  type        = string

  validation {
    condition     = length(trimspace(var.region)) > 0
    error_message = "region must not be empty."
  }
}

variable "prefix" {
  description = "Resource naming prefix. The deploy account ID is prefix-deploy."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,18}[a-z0-9]$", var.prefix)) && length("${var.prefix}-deploy") <= 30
    error_message = "prefix must produce a deploy account ID of at most 30 characters."
  }
}

variable "terraform_state_bucket_name" {
  description = "GCS bucket that holds the production Terraform state. Pass on every plan/apply via gitignored tfvars or -var. Never commit the name."
  type        = string

  validation {
    condition     = length(trimspace(var.terraform_state_bucket_name)) >= 3 && length(var.terraform_state_bucket_name) <= 63
    error_message = "terraform_state_bucket_name must be 3 to 63 characters and must not be blank."
  }
}

variable "artifact_registry_repository" {
  description = "Docker repository ID for digest preflight reads."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,61}[a-z0-9]$", var.artifact_registry_repository))
    error_message = "artifact_registry_repository must be a lowercase repository ID."
  }
}

variable "promote_workflow_file" {
  description = "Workflow file path allowed to impersonate the deploy account."
  type        = string
  default     = ".github/workflows/release-promote.yml"

  validation {
    condition     = startswith(var.promote_workflow_file, ".github/workflows/") && endswith(var.promote_workflow_file, ".yml")
    error_message = "promote_workflow_file must be a workflow YAML under .github/workflows/."
  }
}

variable "promote_branch_ref" {
  description = "Only main may run production promotion."
  type        = string
  default     = "refs/heads/main"

  validation {
    condition     = var.promote_branch_ref == "refs/heads/main"
    error_message = "Production promotion is limited to refs/heads/main."
  }
}

variable "github_environment_name" {
  description = "GitHub Actions environment required in the OIDC token."
  type        = string
  default     = "production"

  validation {
    condition     = var.github_environment_name == "production"
    error_message = "Only the production environment is accepted for deploy federation."
  }
}
