provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google" {
  alias = "billing"

  project               = var.project_id
  region                = var.region
  billing_project       = var.project_id
  user_project_override = true
}
