output "notification_channel_names" {
  description = "Full resource names of the production email notification channels."
  value       = toset(local.notification_channel_names)
}

output "frontend_uptime_check_id" {
  description = "ID of the public frontend uptime check."
  value       = google_monitoring_uptime_check_config.public["frontend"].uptime_check_id
}

output "api_uptime_check_id" {
  description = "ID of the public API health uptime check."
  value       = google_monitoring_uptime_check_config.public["api_health"].uptime_check_id
}
