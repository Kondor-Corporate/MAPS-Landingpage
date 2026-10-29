locals {
  public_domain = trimprefix(var.public_origin, "https://")
}

resource "google_compute_global_address" "lb" {
  project      = var.project_id
  name         = "${var.prefix}-lb-ip"
  address_type = "EXTERNAL"
  ip_version   = "IPV4"
}

resource "google_compute_region_network_endpoint_group" "frontend" {
  project               = var.project_id
  name                  = "${var.prefix}-frontend-neg"
  region                = var.region
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = var.frontend_service_name
  }
}

resource "google_compute_region_network_endpoint_group" "backend" {
  project               = var.project_id
  name                  = "${var.prefix}-backend-neg"
  region                = var.region
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = var.backend_service_name
  }
}

resource "google_compute_backend_service" "frontend" {
  project               = var.project_id
  name                  = "${var.prefix}-frontend-backend"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  protocol              = "HTTP"
  enable_cdn            = false

  backend {
    group = google_compute_region_network_endpoint_group.frontend.id
  }
}

resource "google_compute_backend_service" "api" {
  project               = var.project_id
  name                  = "${var.prefix}-api-backend"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  protocol              = "HTTP"
  enable_cdn            = false

  backend {
    group = google_compute_region_network_endpoint_group.backend.id
  }
}

resource "google_compute_url_map" "https" {
  project         = var.project_id
  name            = "${var.prefix}-url-map"
  default_service = google_compute_backend_service.frontend.id

  host_rule {
    hosts        = [local.public_domain]
    path_matcher = "public"
  }

  host_rule {
    hosts        = ["www.${local.public_domain}"]
    path_matcher = "www-redirect"
  }

  path_matcher {
    name = "www-redirect"

    default_url_redirect {
      host_redirect          = local.public_domain
      redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
      strip_query            = false
    }
  }
  path_matcher {
    name            = "public"
    default_service = google_compute_backend_service.frontend.id

    path_rule {
      paths   = ["/api", "/api/*"]
      service = google_compute_backend_service.api.id
    }
  }
}

resource "google_compute_managed_ssl_certificate" "public" {
  project = var.project_id
  name    = "${var.prefix}-certificate"

  managed {
    domains = [local.public_domain]
  }
}

resource "google_compute_managed_ssl_certificate" "www" {
  project = var.project_id
  name    = "${var.prefix}-www-certificate"

  managed {
    domains = ["www.${local.public_domain}"]
  }
}
resource "google_compute_target_https_proxy" "https" {
  project          = var.project_id
  name             = "${var.prefix}-https-proxy"
  url_map          = google_compute_url_map.https.id
  ssl_certificates = [google_compute_managed_ssl_certificate.public.id, google_compute_managed_ssl_certificate.www.id]
}

resource "google_compute_global_forwarding_rule" "https" {
  project               = var.project_id
  name                  = "${var.prefix}-https"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  network_tier          = "PREMIUM"
  ip_address            = google_compute_global_address.lb.address
  port_range            = "443"
  target                = google_compute_target_https_proxy.https.id
}

resource "google_compute_url_map" "http_redirect" {
  project = var.project_id
  name    = "${var.prefix}-http-redirect"

  default_url_redirect {
    https_redirect         = true
    strip_query            = false
    redirect_response_code = "PERMANENT_REDIRECT"
  }
}

resource "google_compute_target_http_proxy" "http" {
  project = var.project_id
  name    = "${var.prefix}-http-proxy"
  url_map = google_compute_url_map.http_redirect.id
}

resource "google_compute_global_forwarding_rule" "http" {
  project               = var.project_id
  name                  = "${var.prefix}-http"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  network_tier          = "PREMIUM"
  ip_address            = google_compute_global_address.lb.address
  port_range            = "80"
  target                = google_compute_target_http_proxy.http.id
}
