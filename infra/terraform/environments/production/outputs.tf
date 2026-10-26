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
