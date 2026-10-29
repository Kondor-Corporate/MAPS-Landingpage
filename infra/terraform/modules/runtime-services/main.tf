resource "google_cloud_run_v2_service" "frontend" {
  project             = var.project_id
  name                = "${var.prefix}-frontend"
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"
  labels              = var.labels
  deletion_protection = true

  template {
    service_account                  = var.frontend_service_account_email
    timeout                          = "60s"
    max_instance_request_concurrency = 80

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }

    containers {
      image = var.frontend_image

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle          = true
        startup_cpu_boost = false
      }

      env {
        name  = "BACKEND_ORIGIN"
        value = var.public_origin
      }
    }
  }
}

resource "google_cloud_run_v2_service" "backend" {
  project             = var.project_id
  name                = "${var.prefix}-backend"
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"
  labels              = var.labels
  deletion_protection = true

  template {
    service_account                  = var.backend_service_account_email
    timeout                          = "60s"
    max_instance_request_concurrency = 40
    execution_environment            = "EXECUTION_ENVIRONMENT_GEN2"

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }

    vpc_access {
      egress = "PRIVATE_RANGES_ONLY"

      network_interfaces {
        network    = var.network_name
        subnetwork = var.serverless_subnet_name
      }
    }

    containers {
      image = var.backend_image

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "JWT_EXPIRES_IN"
        value = "15m"
      }

      env {
        name  = "REFRESH_EXPIRES_IN"
        value = "30d"
      }

      env {
        name  = "ALLOW_REFRESH_BODY"
        value = "false"
      }

      env {
        name  = "STORAGE_PROVIDER"
        value = "gcs"
      }

      env {
        name  = "GCS_BUCKET"
        value = var.assets_bucket_name
      }

      env {
        name  = "API_PUBLIC_URL"
        value = var.public_origin
      }

      env {
        name  = "FRONTEND_ORIGIN"
        value = var.public_origin
      }

      env {
        name  = "NOMINATIM_USER_AGENT"
        value = var.nominatim_user_agent
      }

      env {
        name  = "TZ"
        value = "America/Argentina/Buenos_Aires"
      }

      # Initial value for an external Application Load Balancer in front of Cloud Run.
      # Confirm with real traffic in R5-I. Rate limiting depends on req.ip.
      # Do not set true: that trusts the entire X-Forwarded-For chain.
      env {
        name  = "TRUST_PROXY"
        value = var.trust_proxy
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
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = var.jwt_secret_id
            version = var.jwt_secret_version
          }
        }
      }

      env {
        name = "REFRESH_SECRET"
        value_source {
          secret_key_ref {
            secret  = var.refresh_secret_id
            version = var.refresh_secret_version
          }
        }
      }
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "frontend_invoker" {
  project  = var.project_id
  location = google_cloud_run_v2_service.frontend.location
  name     = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "backend_invoker" {
  project  = var.project_id
  location = google_cloud_run_v2_service.backend.location
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
