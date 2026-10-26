output "notification_channel_name" {
  description = "Full resource name of the production email notification channel."
  value       = google_monitoring_notification_channel.email.name
}

output "frontend_uptime_check_id" {
  description = "ID of the public frontend uptime check."
  value       = google_monitoring_uptime_check_config.public["frontend"].uptime_check_id
}

output "api_uptime_check_id" {
  description = "ID of the public API health uptime check."
  value       = google_monitoring_uptime_check_config.public["api_health"].uptime_check_id
}
