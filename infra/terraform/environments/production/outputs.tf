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
