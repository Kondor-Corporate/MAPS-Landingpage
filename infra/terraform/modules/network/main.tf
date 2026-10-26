resource "google_compute_network" "main" {
  project                 = var.project_id
  name                    = "${var.prefix}-vpc"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
}

resource "google_compute_subnetwork" "serverless" {
  project       = var.project_id
  name          = "${var.prefix}-serverless"
  region        = var.region
  network       = google_compute_network.main.id
  ip_cidr_range = var.serverless_subnet_cidr

  private_ip_google_access = true
}

resource "google_compute_global_address" "private_services" {
  project       = var.project_id
  name          = "${var.prefix}-private-services"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  address       = split("/", var.private_services_cidr)[0]
  prefix_length = tonumber(split("/", var.private_services_cidr)[1])
  network       = google_compute_network.main.id
}

resource "google_service_networking_connection" "private_services" {
  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_services.name]
}
