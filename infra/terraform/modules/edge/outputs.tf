output "global_ip_address" {
  description = "Global IPv4 address of the external Application Load Balancer."
  value       = google_compute_global_address.lb.address
}

output "public_domain" {
  description = "Hostname derived from the public HTTPS origin."
  value       = local.public_domain
}

output "https_url" {
  description = "Public HTTPS origin served by the load balancer."
  value       = var.public_origin
}

output "frontend_neg_name" {
  description = "Serverless NEG attached to the frontend Cloud Run service."
  value       = google_compute_region_network_endpoint_group.frontend.name
}

output "backend_neg_name" {
  description = "Serverless NEG attached to the backend Cloud Run service."
  value       = google_compute_region_network_endpoint_group.backend.name
}
