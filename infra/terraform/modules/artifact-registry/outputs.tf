output "repository_id" {
  description = "Artifact Registry repository ID."
  value       = google_artifact_registry_repository.docker.repository_id
}

output "repository_name" {
  description = "Artifact Registry repository short name."
  value       = google_artifact_registry_repository.docker.name
}

output "repository_location" {
  description = "Artifact Registry repository location."
  value       = google_artifact_registry_repository.docker.location
}

output "repository_docker_base" {
  description = "Docker registry base URL for this repository."
  value       = google_artifact_registry_repository.docker.registry_uri
}
