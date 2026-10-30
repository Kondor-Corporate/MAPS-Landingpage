output "submit_service_account_email" {
  description = "Service account GitHub Actions impersonates to submit Cloud Build. This is not the account that runs the build."
  value       = google_service_account.submit.email
}

output "workload_identity_provider" {
  description = "Full provider resource name for GitHub variable GCP_WORKLOAD_IDENTITY_PROVIDER."
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "workload_identity_pool_id" {
  description = "Pool ID shared with deploy-identity."
  value       = google_iam_workload_identity_pool.github.workload_identity_pool_id
}

output "workload_identity_pool_name" {
  description = "Full pool resource name for deploy principalSet bindings."
  value       = google_iam_workload_identity_pool.github.name
}
