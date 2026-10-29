output "frontend_service_account_email" {
  description = "Frontend service account email."
  value       = google_service_account.frontend.email
}

output "backend_service_account_email" {
  description = "Backend service account email."
  value       = google_service_account.backend.email
}

output "migrate_service_account_email" {
  description = "Database migrate service account email."
  value       = google_service_account.migrate.email
}

output "bootstrap_service_account_email" {
  description = "Bootstrap service account email."
  value       = google_service_account.bootstrap.email
}

output "build_service_account_email" {
  description = "Build service account email."
  value       = google_service_account.build.email
}

output "database_url_app_secret_id" {
  description = "Secret ID of the application database URL container."
  value       = google_secret_manager_secret.database_url_app.secret_id
}

output "database_url_migrate_secret_id" {
  description = "Secret ID of the migrate database URL container."
  value       = google_secret_manager_secret.database_url_migrate.secret_id
}

output "jwt_secret_id" {
  description = "Secret ID of the JWT secret container."
  value       = google_secret_manager_secret.jwt_secret.secret_id
}

output "refresh_secret_id" {
  description = "Secret ID of the refresh secret container."
  value       = google_secret_manager_secret.refresh_secret.secret_id
}

output "bootstrap_admin_email_secret_id" {
  description = "Secret ID of the bootstrap admin email container."
  value       = google_secret_manager_secret.bootstrap_admin_email.secret_id
}

output "bootstrap_admin_password_secret_id" {
  description = "Secret ID of the bootstrap admin password container."
  value       = google_secret_manager_secret.bootstrap_admin_password.secret_id
}
