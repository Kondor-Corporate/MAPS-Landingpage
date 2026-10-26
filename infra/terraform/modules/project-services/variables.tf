variable "project_id" {
  description = "Google Cloud project ID."
  type        = string
}

variable "services" {
  description = "Google Cloud APIs that must be enabled for the environment."
  type        = set(string)
}
