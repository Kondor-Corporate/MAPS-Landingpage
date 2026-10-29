output "instance_name" {
  description = "Cloud SQL instance name."
  value       = google_sql_database_instance.main.name
}

output "connection_name" {
  description = "Cloud SQL connection name (project:region:instance)."
  value       = google_sql_database_instance.main.connection_name
}

output "private_ip_address" {
  description = "Private IPv4 address of the Cloud SQL instance."
  value       = google_sql_database_instance.main.private_ip_address
}

output "database_name" {
  description = "Logical PostgreSQL database name."
  value       = google_sql_database.main.name
}
