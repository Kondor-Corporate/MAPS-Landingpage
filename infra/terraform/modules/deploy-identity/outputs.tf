output "deploy_service_account_email" {
  description = "Service account GitHub Actions impersonates for production promotion (future release-promote.yml)."
  value       = google_service_account.deploy.email
}

output "promote_workload_identity_provider" {
  description = "Provider resource name for GitHub variable GCP_DEPLOY_WORKLOAD_IDENTITY_PROVIDER."
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "deploy_workload_identity_pool_id" {
  description = "Isolated pool ID for deploy federation (maps-github-deploy)."
  value       = google_iam_workload_identity_pool.github_deploy.workload_identity_pool_id
}

output "deploy_workload_identity_pool_name" {
  description = "Full pool resource name for deploy federation."
  value       = google_iam_workload_identity_pool.github_deploy.name
}

output "promote_workflow_ref" {
  description = "Exact workflow_ref enforced in the OIDC condition."
  value       = local.promote_workflow_ref
}
