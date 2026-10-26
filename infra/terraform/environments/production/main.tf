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

module "artifact_registry" {
  source = "../../modules/artifact-registry"

  project_id                  = var.project_id
  region                      = var.region
  prefix                      = local.prefix
  labels                      = local.labels
  build_service_account_email = module.iam.build_service_account_email

  depends_on = [
    module.project_services,
    module.iam,
  ]
}

module "runtime_services" {
  source = "../../modules/runtime-services"

  project_id = var.project_id
  region     = var.region
  prefix     = local.prefix
  labels     = local.labels

  frontend_service_account_email = module.iam.frontend_service_account_email
  backend_service_account_email  = module.iam.backend_service_account_email

  network_name           = module.network.network_name
  serverless_subnet_name = module.network.serverless_subnet_name

  assets_bucket_name = module.storage.bucket_name

  database_url_app_secret_id = module.iam.database_url_app_secret_id
  jwt_secret_id              = module.iam.jwt_secret_id
  refresh_secret_id          = module.iam.refresh_secret_id

  frontend_image = var.frontend_image
  backend_image  = var.backend_image

  database_url_app_secret_version = var.database_url_app_secret_version
  jwt_secret_version              = var.jwt_secret_version
  refresh_secret_version          = var.refresh_secret_version

  public_origin        = var.public_origin
  nominatim_user_agent = var.nominatim_user_agent

  depends_on = [
    module.project_services,
    module.network,
    module.iam,
    module.storage,
    module.artifact_registry,
  ]
}
