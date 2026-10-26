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
