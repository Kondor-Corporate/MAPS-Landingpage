output "network_id" {
  description = "VPC network resource ID."
  value       = google_compute_network.main.id
}

output "network_name" {
  description = "VPC network name."
  value       = google_compute_network.main.name
}

output "serverless_subnet_id" {
  description = "Subnet resource ID used by Cloud Run Direct VPC egress."
  value       = google_compute_subnetwork.serverless.id
}

output "serverless_subnet_name" {
  description = "Subnet name used by Cloud Run Direct VPC egress."
  value       = google_compute_subnetwork.serverless.name
}

output "private_services_range_name" {
  description = "Allocated range name used by Private Services Access."
  value       = google_compute_global_address.private_services.name
}

output "private_services_connection" {
  description = "Private Services Access connection."
  value       = google_service_networking_connection.private_services.peering
}
