output "budget_name" {
  description = "Full resource name of the production monthly budget."
  value       = google_billing_budget.production.name
}

output "monthly_budget_usd" {
  description = "Gross monthly production budget in whole US dollars."
  value       = var.monthly_budget_usd
}
