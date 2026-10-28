output "submit_service_account_email" {
  description = "Service account GitHub Actions impersonates to submit Cloud Build. This is not the account that runs the build."
  value       = google_service_account.submit.email
}

output "workload_identity_provider" {
  description = "Full provider resource name for GitHub variable GCP_WORKLOAD_IDENTITY_PROVIDER."
  value       = google_iam_workload_identity_pool_provider.github.name
}
