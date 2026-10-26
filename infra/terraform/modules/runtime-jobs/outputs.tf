output "migrate_job_name" {
  description = "Database migrate Cloud Run job name."
  value       = google_cloud_run_v2_job.migrate.name
}

output "bootstrap_job_name" {
  description = "Bootstrap admin Cloud Run job name."
  value       = google_cloud_run_v2_job.bootstrap.name
}
