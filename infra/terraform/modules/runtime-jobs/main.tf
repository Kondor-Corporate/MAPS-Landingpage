resource "google_cloud_run_v2_job" "migrate" {
  project             = var.project_id
  name                = "${var.prefix}-migrate"
  location            = var.region
  labels              = var.labels
  deletion_protection = true

  template {
    task_count  = 1
    parallelism = 1

    template {
      service_account       = var.migrate_service_account_email
      execution_environment = "EXECUTION_ENVIRONMENT_GEN2"
      max_retries           = 0
      timeout               = "600s"

      vpc_access {
        egress = "PRIVATE_RANGES_ONLY"

        network_interfaces {
          network    = var.network_name
          subnetwork = var.serverless_subnet_name
        }
      }

      containers {
        image   = var.jobs_image
        command = ["npm"]
        args    = ["run", "db:migrate:deploy"]

        resources {
          limits = {
            cpu    = "1"
            memory = "512Mi"
          }
        }

        env {
          name = "DATABASE_URL"
          value_source {
            secret_key_ref {
              secret  = var.database_url_migrate_secret_id
              version = var.database_url_migrate_secret_version
            }
          }
        }
      }
    }
  }
}

resource "google_cloud_run_v2_job" "bootstrap" {
  project             = var.project_id
  name                = "${var.prefix}-bootstrap"
  location            = var.region
  labels              = var.labels
  deletion_protection = true

  template {
    task_count  = 1
    parallelism = 1

    template {
      service_account       = var.bootstrap_service_account_email
      execution_environment = "EXECUTION_ENVIRONMENT_GEN2"
      max_retries           = 0
      timeout               = "600s"

      vpc_access {
        egress = "PRIVATE_RANGES_ONLY"

        network_interfaces {
          network    = var.network_name
          subnetwork = var.serverless_subnet_name
        }
      }

      containers {
        image   = var.jobs_image
        command = ["npm"]
        args    = ["run", "bootstrap:admin"]

        resources {
          limits = {
            cpu    = "1"
            memory = "512Mi"
          }
        }

        env {
          name = "DATABASE_URL"
          value_source {
            secret_key_ref {
              secret  = var.database_url_app_secret_id
              version = var.database_url_app_secret_version
            }
          }
        }

        env {
          name = "BOOTSTRAP_ADMIN_EMAIL"
          value_source {
            secret_key_ref {
              secret  = var.bootstrap_admin_email_secret_id
              version = var.bootstrap_admin_email_secret_version
            }
          }
        }

        env {
          name = "BOOTSTRAP_ADMIN_PASSWORD"
          value_source {
            secret_key_ref {
              secret  = var.bootstrap_admin_password_secret_id
              version = var.bootstrap_admin_password_secret_version
            }
          }
        }

        # A destructive promotion must be an explicit exception outside this job.
        env {
          name  = "BOOTSTRAP_ADMIN_FORCE"
          value = "false"
        }
      }
    }
  }
}
