resource "google_sql_database_instance" "main" {
  project          = var.project_id
  name             = "${var.prefix}-db"
  region           = var.region
  database_version = var.database_version

  deletion_protection = true

  settings {
    tier                        = var.tier
    edition                     = var.edition
    availability_type           = var.availability_type
    disk_type                   = "PD_SSD"
    disk_size                   = var.disk_size_gb
    disk_autoresize             = true
    deletion_protection_enabled = true
    retain_backups_on_delete    = true
    user_labels                 = var.labels

    backup_configuration {
      enabled                        = true
      start_time                     = var.backup_start_time
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = var.transaction_log_retention_days

      backup_retention_settings {
        retained_backups = var.backup_retained_count
        retention_unit   = "COUNT"
      }
    }

    # Provider 8.7.0 nests final backup settings inside settings, not on the instance.
    final_backup_config {
      enabled        = true
      retention_days = var.final_backup_retention_days
    }

    ip_configuration {
      ipv4_enabled       = false
      private_network    = var.network_id
      allocated_ip_range = var.private_services_range_name
      ssl_mode           = "ENCRYPTED_ONLY"
    }
  }

  # disk_autoresize can grow the disk outside Terraform; do not reconcile it downward.
  lifecycle {
    ignore_changes = [
      settings[0].disk_size,
    ]
  }
}

resource "google_sql_database" "main" {
  project  = var.project_id
  name     = var.database_name
  instance = google_sql_database_instance.main.name

  deletion_policy = "PREVENT"
}
