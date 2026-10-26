data "google_project" "project" {
  project_id = var.project_id
}

# Measurement and email alerts only. Thresholds do not stop services,
# change autoscaling, or cap spend.
# Billing anomaly detection stays outside this module. It is a billing
# account setting and is pending operational setup in R5-D.
resource "google_billing_budget" "production" {
  billing_account = var.billing_account_id
  display_name    = "MAPS Production Monthly Budget"

  budget_filter {
    projects = ["projects/${data.google_project.project.number}"]

    calendar_period        = "MONTH"
    credit_types_treatment = "EXCLUDE_ALL_CREDITS"
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = tostring(var.monthly_budget_usd)
    }
  }

  threshold_rules {
    threshold_percent = 0.5
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 0.75
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 0.9
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "FORECASTED_SPEND"
  }

  # The block name is all_updates_rule. For a Monitoring email channel,
  # mail is sent when a threshold rule fires. Periodic updates that are
  # not tied to a threshold belong to Pub/Sub, which this budget does not use.
  all_updates_rule {
    monitoring_notification_channels = [
      var.notification_channel_name,
    ]
    disable_default_iam_recipients  = true
    enable_project_level_recipients = false
  }
}
