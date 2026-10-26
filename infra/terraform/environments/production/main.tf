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

module "database" {
  source = "../../modules/database"

  project_id                  = var.project_id
  region                      = var.region
  prefix                      = local.prefix
  network_id                  = module.network.network_id
  private_services_range_name = module.network.private_services_range_name
  labels                      = local.labels

  depends_on = [module.network]
}

module "storage" {
  source = "../../modules/storage"

  project_id  = var.project_id
  region      = var.region
  bucket_name = var.assets_bucket_name
  labels      = local.labels

  depends_on = [module.project_services]
}

module "iam" {
  source = "../../modules/iam"

  project_id         = var.project_id
  prefix             = local.prefix
  labels             = local.labels
  assets_bucket_name = module.storage.bucket_name

  depends_on = [
    module.project_services,
    module.storage,
  ]
}
