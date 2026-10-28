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

  project_id               = var.project_id
  prefix                   = local.prefix
  labels                   = local.labels
  assets_bucket_name       = module.storage.bucket_name
  build_source_bucket_name = module.storage.build_source_bucket_name

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

module "runtime_jobs" {
  source = "../../modules/runtime-jobs"

  project_id = var.project_id
  region     = var.region
  prefix     = local.prefix
  labels     = local.labels

  migrate_service_account_email   = module.iam.migrate_service_account_email
  bootstrap_service_account_email = module.iam.bootstrap_service_account_email

  network_name           = module.network.network_name
  serverless_subnet_name = module.network.serverless_subnet_name

  jobs_image = var.jobs_image

  database_url_migrate_secret_id     = module.iam.database_url_migrate_secret_id
  database_url_app_secret_id         = module.iam.database_url_app_secret_id
  bootstrap_admin_email_secret_id    = module.iam.bootstrap_admin_email_secret_id
  bootstrap_admin_password_secret_id = module.iam.bootstrap_admin_password_secret_id

  database_url_migrate_secret_version     = var.database_url_migrate_secret_version
  database_url_app_secret_version         = var.database_url_app_secret_version
  bootstrap_admin_email_secret_version    = var.bootstrap_admin_email_secret_version
  bootstrap_admin_password_secret_version = var.bootstrap_admin_password_secret_version

  depends_on = [
    module.project_services,
    module.network,
    module.iam,
    module.artifact_registry,
  ]
}

module "edge" {
  source = "../../modules/edge"

  project_id = var.project_id
  region     = var.region
  prefix     = local.prefix

  frontend_service_name = module.runtime_services.frontend_service_name
  backend_service_name  = module.runtime_services.backend_service_name

  public_origin = var.public_origin

  depends_on = [
    module.project_services,
    module.runtime_services,
  ]
}

module "observability" {
  source = "../../modules/observability"

  project_id    = var.project_id
  prefix        = local.prefix
  public_origin = var.public_origin
  alert_emails  = var.alert_emails

  database_instance_name = module.database.instance_name

  region                = var.region
  frontend_service_name = module.runtime_services.frontend_service_name
  backend_service_name  = module.runtime_services.backend_service_name

  depends_on = [
    module.project_services,
    module.database,
    module.edge,
    module.runtime_services,
  ]
}

module "cost_controls" {
  source = "../../modules/cost-controls"

  providers = {
    google = google.billing
  }

  project_id                 = var.project_id
  billing_account_id         = var.billing_account_id
  monthly_budget_usd         = var.monthly_budget_usd
  notification_channel_names = module.observability.notification_channel_names

  depends_on = [
    module.project_services,
  ]
}
