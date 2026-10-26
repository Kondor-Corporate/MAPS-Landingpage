resource "google_service_account" "frontend" {
  project      = var.project_id
  account_id   = "${var.prefix}-frontend"
  display_name = "MAPS production frontend"
}

resource "google_service_account" "backend" {
  project      = var.project_id
  account_id   = "${var.prefix}-backend"
  display_name = "MAPS production backend"
}

resource "google_service_account" "migrate" {
  project      = var.project_id
  account_id   = "${var.prefix}-migrate"
  display_name = "MAPS production database migrate"
}

resource "google_service_account" "bootstrap" {
  project      = var.project_id
  account_id   = "${var.prefix}-bootstrap"
  display_name = "MAPS production bootstrap"
}

resource "google_service_account" "build" {
  project      = var.project_id
  account_id   = "${var.prefix}-build"
  display_name = "MAPS production build"
}

resource "google_secret_manager_secret" "database_url_app" {
  project             = var.project_id
  secret_id           = "${var.prefix}-database-url-app"
  labels              = var.labels
  deletion_protection = true

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "database_url_migrate" {
  project             = var.project_id
  secret_id           = "${var.prefix}-database-url-migrate"
  labels              = var.labels
  deletion_protection = true

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "jwt_secret" {
  project             = var.project_id
  secret_id           = "${var.prefix}-jwt-secret"
  labels              = var.labels
  deletion_protection = true

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "refresh_secret" {
  project             = var.project_id
  secret_id           = "${var.prefix}-refresh-secret"
  labels              = var.labels
  deletion_protection = true

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "bootstrap_admin_email" {
  project             = var.project_id
  secret_id           = "${var.prefix}-bootstrap-admin-email"
  labels              = var.labels
  deletion_protection = true

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "bootstrap_admin_password" {
  project             = var.project_id
  secret_id           = "${var.prefix}-bootstrap-admin-password"
  labels              = var.labels
  deletion_protection = true

  replication {
    auto {}
  }
}

locals {
  secret_readers = {
    backend_database_url_app = {
      secret_id = google_secret_manager_secret.database_url_app.secret_id
      email     = google_service_account.backend.email
    }
    backend_jwt_secret = {
      secret_id = google_secret_manager_secret.jwt_secret.secret_id
      email     = google_service_account.backend.email
    }
    backend_refresh_secret = {
      secret_id = google_secret_manager_secret.refresh_secret.secret_id
      email     = google_service_account.backend.email
    }
    migrate_database_url_migrate = {
      secret_id = google_secret_manager_secret.database_url_migrate.secret_id
      email     = google_service_account.migrate.email
    }
    bootstrap_database_url_app = {
      secret_id = google_secret_manager_secret.database_url_app.secret_id
      email     = google_service_account.bootstrap.email
    }
    bootstrap_admin_email = {
      secret_id = google_secret_manager_secret.bootstrap_admin_email.secret_id
      email     = google_service_account.bootstrap.email
    }
    bootstrap_admin_password = {
      secret_id = google_secret_manager_secret.bootstrap_admin_password.secret_id
      email     = google_service_account.bootstrap.email
    }
  }
}

resource "google_secret_manager_secret_iam_member" "reader" {
  for_each = local.secret_readers

  project   = var.project_id
  secret_id = each.value.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${each.value.email}"
}

resource "google_storage_bucket_iam_member" "backend_assets" {
  bucket = var.assets_bucket_name
  role   = "roles/storage.objectUser"
  member = "serviceAccount:${google_service_account.backend.email}"
}
