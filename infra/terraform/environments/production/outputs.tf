output "network_name" {
  description = "Production VPC network name."
  value       = module.network.network_name
}

output "serverless_subnet_name" {
  description = "Subnet used by Cloud Run Direct VPC egress."
  value       = module.network.serverless_subnet_name
}

output "private_services_range_name" {
  description = "Private Services Access allocated range."
  value       = module.network.private_services_range_name
}

output "database_instance_name" {
  description = "Production Cloud SQL instance name."
  value       = module.database.instance_name
}

output "database_name" {
  description = "Production logical PostgreSQL database name."
  value       = module.database.database_name
}

output "database_private_ip" {
  description = "Private IPv4 address of the production Cloud SQL instance."
  value       = module.database.private_ip_address
}

output "assets_bucket_name" {
  description = "Production assets bucket name."
  value       = module.storage.bucket_name
}

output "backend_service_account_email" {
  description = "Production backend service account email."
  value       = module.iam.backend_service_account_email
}

output "frontend_service_account_email" {
  description = "Production frontend service account email."
  value       = module.iam.frontend_service_account_email
}

output "migrate_service_account_email" {
  description = "Production database migrate service account email."
  value       = module.iam.migrate_service_account_email
}

output "bootstrap_service_account_email" {
  description = "Production bootstrap service account email."
  value       = module.iam.bootstrap_service_account_email
}

output "build_service_account_email" {
  description = "Production build service account email."
  value       = module.iam.build_service_account_email
}

output "artifact_registry_repository" {
  description = "Production Artifact Registry repository ID."
  value       = module.artifact_registry.repository_id
}

output "frontend_service_name" {
  description = "Production frontend Cloud Run service name."
  value       = module.runtime_services.frontend_service_name
}

output "backend_service_name" {
  description = "Production backend Cloud Run service name."
  value       = module.runtime_services.backend_service_name
}

output "migrate_job_name" {
  description = "Production database migrate Cloud Run job name."
  value       = module.runtime_jobs.migrate_job_name
}

output "bootstrap_job_name" {
  description = "Production bootstrap admin Cloud Run job name."
  value       = module.runtime_jobs.bootstrap_job_name
}

output "global_ip_address" {
  description = "Production global load balancer IPv4 address."
  value       = module.edge.global_ip_address
}

output "public_origin" {
  description = "Production public HTTPS origin."
  value       = module.edge.https_url
}

output "frontend_uptime_check_id" {
  description = "ID of the production frontend uptime check."
  value       = module.observability.frontend_uptime_check_id
}

output "api_uptime_check_id" {
  description = "ID of the production API health uptime check."
  value       = module.observability.api_uptime_check_id
}
