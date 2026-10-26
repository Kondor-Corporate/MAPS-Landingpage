module "project_services" {
  source = "../../modules/project-services"

  project_id = var.project_id
  services   = local.required_services
}

module "network" {
  source = "../../modules/network"

  project_id = var.project_id
  region     = var.region
  prefix     = local.prefix

  depends_on = [module.project_services]
}
