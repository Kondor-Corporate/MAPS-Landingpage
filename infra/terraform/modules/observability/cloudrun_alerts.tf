locals {
  cloudrun_base_filter = "resource.type = \"cloud_run_revision\" AND resource.label.location = \"${var.region}\""

  # 5xx count divided by every request_count for the same service.
  # Both sides use ALIGN_RATE and REDUCE_SUM over 300s, grouped only by
  # service_name, so the ratio survives a new revision. revision_name is
  # not part of the filter. Missing data is left unset and is not an error.
  cloudrun_error_rates = {
    frontend = {
      display_name  = "MAPS PROD Cloud Run frontend 5xx"
      service_name  = var.frontend_service_name
      documentation = "More than 2% of frontend requests were 5xx for 5 minutes. The ratio is 5xx request_count divided by all request_count for this service. Check the latest deploy and application errors first. This is an initial baseline and should be recalibrated after the first month. Missing data is not treated as an error."
    }
    backend = {
      display_name  = "MAPS PROD Cloud Run backend 5xx"
      service_name  = var.backend_service_name
      documentation = "More than 2% of backend requests were 5xx for 5 minutes. The ratio is 5xx request_count divided by all request_count for this service. Check the latest deploy, application errors, and Cloud SQL connectivity first. This is an initial baseline and should be recalibrated after the first month. Missing data is not treated as an error."
    }
  }

  # Latency, CPU, and memory are distributions. ALIGN_PERCENTILE_95 turns
  # each revision series into a number, then REDUCE_MAX keeps the highest
  # revision for that service. instance_count is a gauge: ALIGN_MAX per
  # revision, then REDUCE_SUM of active instances for the service.
  cloudrun_thresholds = {
    backend_latency = {
      display_name        = "MAPS PROD Cloud Run backend latency"
      service_name        = var.backend_service_name
      metric              = "run.googleapis.com/request_latencies"
      metric_label_filter = ""
      threshold           = 2000
      duration            = "600s"
      alignment_period    = "300s"
      aligner             = "ALIGN_PERCENTILE_95"
      reducer             = "REDUCE_MAX"
      documentation       = "Backend request latency P95 stayed above 2000 ms for 10 minutes. request_latencies is measured from when the request reaches the container until the response leaves, and does not include cold-start time before the container handles the request. The value is the highest P95 among current revisions. Check slow handlers and Cloud SQL first. This is an initial baseline and should be recalibrated after the first month."
    }
    frontend_cpu = {
      display_name        = "MAPS PROD Cloud Run frontend CPU"
      service_name        = var.frontend_service_name
      metric              = "run.googleapis.com/container/cpu/utilizations"
      metric_label_filter = ""
      threshold           = 0.80
      duration            = "600s"
      alignment_period    = "300s"
      aligner             = "ALIGN_PERCENTILE_95"
      reducer             = "REDUCE_MAX"
      documentation       = "Frontend container CPU P95 stayed above 80% for 10 minutes. The value is the highest P95 among current revisions. Check traffic and request cost first. This initial threshold should be recalibrated after the first month of real traffic."
    }
    backend_cpu = {
      display_name        = "MAPS PROD Cloud Run backend CPU"
      service_name        = var.backend_service_name
      metric              = "run.googleapis.com/container/cpu/utilizations"
      metric_label_filter = ""
      threshold           = 0.80
      duration            = "600s"
      alignment_period    = "300s"
      aligner             = "ALIGN_PERCENTILE_95"
      reducer             = "REDUCE_MAX"
      documentation       = "Backend container CPU P95 stayed above 80% for 10 minutes. The value is the highest P95 among current revisions. Check traffic, slow handlers, and Cloud SQL first. This initial threshold should be recalibrated after the first month of real traffic."
    }
    frontend_memory = {
      display_name        = "MAPS PROD Cloud Run frontend memory"
      service_name        = var.frontend_service_name
      metric              = "run.googleapis.com/container/memory/utilizations"
      metric_label_filter = ""
      threshold           = 0.80
      duration            = "600s"
      alignment_period    = "300s"
      aligner             = "ALIGN_PERCENTILE_95"
      reducer             = "REDUCE_MAX"
      documentation       = "Frontend container memory P95 stayed above 80% for 10 minutes. The value is the highest P95 among current revisions. Check memory growth and concurrency first. This initial threshold should be recalibrated after the first month of real traffic."
    }
    backend_memory = {
      display_name        = "MAPS PROD Cloud Run backend memory"
      service_name        = var.backend_service_name
      metric              = "run.googleapis.com/container/memory/utilizations"
      metric_label_filter = ""
      threshold           = 0.80
      duration            = "600s"
      alignment_period    = "300s"
      aligner             = "ALIGN_PERCENTILE_95"
      reducer             = "REDUCE_MAX"
      documentation       = "Backend container memory P95 stayed above 80% for 10 minutes. The value is the highest P95 among current revisions. Check memory growth, concurrency, and Cloud SQL client usage first. This initial threshold should be recalibrated after the first month of real traffic."
    }
    frontend_instances = {
      display_name        = "MAPS PROD Cloud Run frontend max instances"
      service_name        = var.frontend_service_name
      metric              = "run.googleapis.com/container/instance_count"
      metric_label_filter = " AND metric.label.state = \"active\""
      threshold           = 2
      duration            = "600s"
      alignment_period    = "60s"
      aligner             = "ALIGN_MAX"
      reducer             = "REDUCE_SUM"
      documentation       = "Frontend active instances stayed above 2 for 10 minutes, which means all 3 configured instances were in use. This is a capacity signal, not necessarily an outage. Review traffic, latency, errors, and Cloud SQL pressure before increasing max_instance_count. This initial threshold should be recalibrated after the first month."
    }
    backend_instances = {
      display_name        = "MAPS PROD Cloud Run backend max instances"
      service_name        = var.backend_service_name
      metric              = "run.googleapis.com/container/instance_count"
      metric_label_filter = " AND metric.label.state = \"active\""
      threshold           = 2
      duration            = "600s"
      alignment_period    = "60s"
      aligner             = "ALIGN_MAX"
      reducer             = "REDUCE_SUM"
      documentation       = "Backend active instances stayed above 2 for 10 minutes, which means all 3 configured instances were in use. This is a capacity signal, not necessarily an outage. Review traffic, latency, errors, and Cloud SQL pressure before increasing max_instance_count. This initial threshold should be recalibrated after the first month."
    }
  }
}

resource "google_monitoring_alert_policy" "cloudrun_error_rate" {
  for_each = local.cloudrun_error_rates

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
      filter = join(" AND ", [
        local.cloudrun_base_filter,
        "metric.type = \"run.googleapis.com/request_count\"",
        "resource.label.service_name = \"${each.value.service_name}\"",
        "metric.label.response_code_class = \"5xx\"",
      ])
      denominator_filter = join(" AND ", [
        local.cloudrun_base_filter,
        "metric.type = \"run.googleapis.com/request_count\"",
        "resource.label.service_name = \"${each.value.service_name}\"",
      ])
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.02

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.service_name"]
      }

      denominator_aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.service_name"]
      }

      trigger {
        count = 1
      }
    }
  }
}

resource "google_monitoring_alert_policy" "cloudrun" {
  for_each = local.cloudrun_thresholds

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
      filter = "${join(" AND ", [
        local.cloudrun_base_filter,
        "metric.type = \"${each.value.metric}\"",
        "resource.label.service_name = \"${each.value.service_name}\"",
      ])}${each.value.metric_label_filter}"
      duration        = each.value.duration
      comparison      = "COMPARISON_GT"
      threshold_value = each.value.threshold

      aggregations {
        alignment_period     = each.value.alignment_period
        per_series_aligner   = each.value.aligner
        cross_series_reducer = each.value.reducer
        group_by_fields      = ["resource.label.service_name"]
      }

      trigger {
        count = 1
      }
    }
  }
}
