variable "project_id" {
  description = "Google Cloud project ID whose spend this budget measures."
  type        = string

  validation {
    condition     = length(trimspace(var.project_id)) > 0
    error_message = "project_id must not be empty."
  }
}

variable "billing_account_id" {
  description = "Cloud Billing account ID that pays for the production project. Format is XXXXXX-XXXXXX-XXXXXX. This is not a secret."
  type        = string

  validation {
    condition     = can(regex("^[A-Za-z0-9]{6}-[A-Za-z0-9]{6}-[A-Za-z0-9]{6}$", var.billing_account_id))
    error_message = "billing_account_id must be a Cloud Billing account ID in the form XXXXXX-XXXXXX-XXXXXX."
  }
}

variable "notification_channel_names" {
  description = "Full resource names of the Monitoring email channels that receive budget threshold emails. Between 1 and 5."
  type        = set(string)

  validation {
    condition = length(var.notification_channel_names) >= 1 && length(var.notification_channel_names) <= 5 && alltrue([
      for name in var.notification_channel_names : can(regex("^projects/[^/]+/notificationChannels/[^/]+$", name))
    ])
    error_message = "notification_channel_names must contain 1 to 5 Monitoring channel names: projects/PROJECT/notificationChannels/CHANNEL."
  }
}

variable "monthly_budget_usd" {
  description = "Gross monthly budget in whole US dollars. Alerts measure cost before credits."
  type        = number
  default     = 110

  validation {
    condition     = var.monthly_budget_usd > 0 && var.monthly_budget_usd == floor(var.monthly_budget_usd)
    error_message = "monthly_budget_usd must be a positive whole number of US dollars."
  }
}
