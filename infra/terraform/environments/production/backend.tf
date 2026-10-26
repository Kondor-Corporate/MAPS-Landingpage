terraform {
  backend "gcs" {
    prefix = "terraform/production"
  }
}