output "frontend_service_name" {
  description = "Frontend Cloud Run service name."
  value       = google_cloud_run_v2_service.frontend.name
}

output "backend_service_name" {
  description = "Backend Cloud Run service name."
  value       = google_cloud_run_v2_service.backend.name
}

output "frontend_uri" {
  description = "Frontend Cloud Run service URI."
  value       = google_cloud_run_v2_service.frontend.uri
}

output "backend_uri" {
  description = "Backend Cloud Run service URI."
  value       = google_cloud_run_v2_service.backend.uri
}
