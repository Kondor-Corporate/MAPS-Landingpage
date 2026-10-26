variable "project_id" {
  description = "Google Cloud project ID."
  type        = string
}

variable "region" {
  description = "Google Cloud region for the MAPS environment."
  type        = string
}

variable "prefix" {
  description = "Resource naming prefix."
  type        = string
}

variable "serverless_subnet_cidr" {
  description = "IPv4 CIDR used by Cloud Run Direct VPC egress."
  type        = string
  default     = "10.20.0.0/24"
}

variable "private_services_cidr" {
  description = "CIDR reserved for Google managed services through Private Services Access."
  type        = string
  default     = "10.30.0.0/16"
}
