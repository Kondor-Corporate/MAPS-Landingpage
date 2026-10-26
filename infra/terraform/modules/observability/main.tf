locals {
  public_domain = trimprefix(var.public_origin, "https://")

  uptime_checks = {
    frontend = {
      display_name = "${var.prefix}-frontend-uptime"
      path         = "/"
    }
    api_health = {
      display_name = "${var.prefix}-api-health-uptime"
      path         = "/api/v1/health"
    }
  }
}

resource "google_monitoring_notification_channel" "email" {
  project      = var.project_id
  display_name = "MAPS Production Alerts"
  type         = "email"
  enabled      = true

  labels = {
    email_address = var.alert_email
  }
}

resource "google_monitoring_uptime_check_config" "public" {
  for_each = local.uptime_checks

  project      = var.project_id
  display_name = each.value.display_name
  timeout      = "10s"
  period       = "300s"

  # Public static checkers resolve the hostname over the internet.
  # Omitting selected_regions runs the check from every region.
  checker_type = "STATIC_IP_CHECKERS"

  http_check {
    request_method = "GET"
    path           = each.value.path
    port           = "443"
    use_ssl        = true
    validate_ssl   = true

    accepted_response_status_codes {
      status_class = "STATUS_CLASS_2XX"
    }
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = local.public_domain
    }
  }
}

# Filter, per check:
#   resource.type = "uptime_url"
#   AND metric.type = "monitoring.googleapis.com/uptime_check/check_passed"
#   AND metric.labels.check_id = <that check's uptime_check_id>
#
# check_passed is true or false for each checker region.
# ALIGN_NEXT_OLDER over 1200s keeps the latest sample, because the check
# runs every 300s. REDUCE_COUNT_FALSE then counts failing regions for the
# same project and host. COMPARISON_GT 1 is true only when more than one
# region is failing, so one isolated location does not alert.
# duration 120s requires that count to stay above 1 for two minutes.
resource "google_monitoring_alert_policy" "uptime" {
  for_each = local.uptime_checks

  project      = var.project_id
  display_name = "${each.value.display_name}-alert"
  combiner     = "OR"
  enabled      = true

  notification_channels = [
    google_monitoring_notification_channel.email.name,
  ]

  conditions {
    display_name = "${each.value.display_name} failing in at least two regions for 120s"

    condition_threshold {
      filter          = "resource.type = \"uptime_url\" AND metric.type = \"monitoring.googleapis.com/uptime_check/check_passed\" AND metric.labels.check_id = \"${google_monitoring_uptime_check_config.public[each.key].uptime_check_id}\""
      duration        = "120s"
      comparison      = "COMPARISON_GT"
      threshold_value = 1

      aggregations {
        alignment_period     = "1200s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields = [
          "resource.label.project_id",
          "resource.label.host",
        ]
      }

      trigger {
        count = 1
      }
    }
  }
}

locals {
  # Monitoring resource label, not the Cloud SQL connection name.
  # connection name is project:region:instance; database_id is project:instance.
  database_id = "${var.project_id}:${var.database_instance_name}"

  cloudsql_alerts = {
    cpu_warning = {
      display_name     = "MAPS PROD Cloud SQL CPU warning"
      metric           = "cloudsql.googleapis.com/database/cpu/utilization"
      threshold        = 0.70
      duration         = "900s"
      comparison       = "COMPARISON_GT"
      aligner          = "ALIGN_MEAN"
      alignment_period = "300s"
      reducer          = null
      group_by_fields  = null
      documentation    = "Warning: Cloud SQL CPU stayed above 70% for 15 minutes. This is not an outage. Check long-running queries and PostgreSQL backends before changing the 1 vCPU size. Critical is above 85% for 10 minutes."
    }
    cpu_critical = {
      display_name     = "MAPS PROD Cloud SQL CPU critical"
      metric           = "cloudsql.googleapis.com/database/cpu/utilization"
      threshold        = 0.85
      duration         = "600s"
      comparison       = "COMPARISON_GT"
      aligner          = "ALIGN_MEAN"
      alignment_period = "300s"
      reducer          = null
      group_by_fields  = null
      documentation    = "Critical: Cloud SQL CPU stayed above 85% for 10 minutes. Check active queries and PostgreSQL backends first. A warning at 70% for 15 minutes may already be open."
    }
    memory_warning = {
      display_name     = "MAPS PROD Cloud SQL memory warning"
      metric           = "cloudsql.googleapis.com/database/memory/utilization"
      threshold        = 0.80
      duration         = "600s"
      comparison       = "COMPARISON_GT"
      aligner          = "ALIGN_MEAN"
      alignment_period = "300s"
      reducer          = null
      group_by_fields  = null
      documentation    = "Warning: Cloud SQL memory stayed above 80% for 10 minutes. Check connection count and heavy queries before raising the 3.75 GB size. Critical is above 90% for 5 minutes."
    }
    memory_critical = {
      display_name     = "MAPS PROD Cloud SQL memory critical"
      metric           = "cloudsql.googleapis.com/database/memory/utilization"
      threshold        = 0.90
      duration         = "300s"
      comparison       = "COMPARISON_GT"
      aligner          = "ALIGN_MEAN"
      alignment_period = "300s"
      reducer          = null
      group_by_fields  = null
      documentation    = "Critical: Cloud SQL memory stayed above 90% for 5 minutes. The instance can start rejecting work or restart. Check PostgreSQL backends and heavy queries first."
    }
    disk_warning = {
      display_name     = "MAPS PROD Cloud SQL disk warning"
      metric           = "cloudsql.googleapis.com/database/disk/utilization"
      threshold        = 0.70
      duration         = "600s"
      comparison       = "COMPARISON_GT"
      aligner          = "ALIGN_MAX"
      alignment_period = "300s"
      reducer          = null
      group_by_fields  = null
      documentation    = "Warning: Cloud SQL disk stayed above 70% for 10 minutes. Autoresize is on, so this tracks unexpected growth and cost, not a full disk by itself. Check data, WAL, and temporary files. Critical is above 85% for 5 minutes."
    }
    disk_critical = {
      display_name     = "MAPS PROD Cloud SQL disk critical"
      metric           = "cloudsql.googleapis.com/database/disk/utilization"
      threshold        = 0.85
      duration         = "300s"
      comparison       = "COMPARISON_GT"
      aligner          = "ALIGN_MAX"
      alignment_period = "300s"
      reducer          = null
      group_by_fields  = null
      documentation    = "Critical: Cloud SQL disk stayed above 85% for 5 minutes. Autoresize is on, but growth at this level still needs a look for cost and capacity. Check data, WAL, and temporary files first."
    }
    connections_warning = {
      display_name     = "MAPS PROD Cloud SQL connections warning"
      metric           = "cloudsql.googleapis.com/database/postgresql/num_backends"
      threshold        = 60
      duration         = "600s"
      comparison       = "COMPARISON_GT"
      aligner          = "ALIGN_MAX"
      alignment_period = "300s"
      reducer          = "REDUCE_SUM"
      group_by_fields  = ["resource.label.database_id"]
      documentation    = "Warning: PostgreSQL backends stayed above 60 for 10 minutes. The count is the sum of every database on this instance. These initial thresholds should be recalibrated after the first month of real metrics. Check idle connections and the application pool first. Critical is above 80 for 5 minutes."
    }
    connections_critical = {
      display_name     = "MAPS PROD Cloud SQL connections critical"
      metric           = "cloudsql.googleapis.com/database/postgresql/num_backends"
      threshold        = 80
      duration         = "300s"
      comparison       = "COMPARISON_GT"
      aligner          = "ALIGN_MAX"
      alignment_period = "300s"
      reducer          = "REDUCE_SUM"
      group_by_fields  = ["resource.label.database_id"]
      documentation    = "Critical: PostgreSQL backends stayed above 80 for 5 minutes, summed across databases on this instance. Check connection leaks and pool size first. These initial thresholds should be recalibrated after the first month of real metrics."
    }
    unavailable = {
      display_name     = "MAPS PROD Cloud SQL unavailable"
      metric           = "cloudsql.googleapis.com/database/up"
      threshold        = 1
      duration         = "300s"
      comparison       = "COMPARISON_LT"
      aligner          = "ALIGN_MIN"
      alignment_period = "60s"
      reducer          = null
      group_by_fields  = null
      documentation    = "Critical: Cloud SQL database/up stayed below 1 for 5 minutes, so the server was not fully up. Check instance operations for a restart, maintenance, or zone outage. This policy does not use instance state."
    }
  }
}

# Filter, for every policy:
#   resource.type = "cloudsql_database"
#   AND metric.type = <native cloudsql.googleapis.com metric>
#   AND resource.label.database_id = "<project_id>:<instance_name>"
#
# CPU and memory use ALIGN_MEAN. Disk uses ALIGN_MAX.
# PostgreSQL connections sum num_backends per database into one series
# with ALIGN_MAX and REDUCE_SUM, grouped by resource.label.database_id.
# Availability uses ALIGN_MIN on database/up and alerts when it stays below 1.
# Only that policy treats missing data as active. The other Cloud SQL
# policies leave evaluation_missing_data unset.
resource "google_monitoring_alert_policy" "cloudsql" {
  for_each = local.cloudsql_alerts

  project      = var.project_id
  display_name = each.value.display_name
  combiner     = "OR"
  enabled      = true

  notification_channels = [
    google_monitoring_notification_channel.email.name,
  ]

  documentation {
    mime_type = "text/markdown"
    content   = each.value.documentation
  }

  conditions {
    display_name = each.value.display_name

    condition_threshold {
      filter                  = "resource.type = \"cloudsql_database\" AND metric.type = \"${each.value.metric}\" AND resource.label.database_id = \"${local.database_id}\""
      duration                = each.value.duration
      comparison              = each.value.comparison
      threshold_value         = each.value.threshold
      evaluation_missing_data = each.key == "unavailable" ? "EVALUATION_MISSING_DATA_ACTIVE" : null

      aggregations {
        alignment_period     = each.value.alignment_period
        per_series_aligner   = each.value.aligner
        cross_series_reducer = each.value.reducer
        group_by_fields      = each.value.group_by_fields
      }

      trigger {
        count = 1
      }
    }
  }
}
