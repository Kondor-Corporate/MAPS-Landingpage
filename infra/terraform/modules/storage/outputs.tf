output "bucket_name" {
  description = "Assets bucket name."
  value       = google_storage_bucket.assets.name
}

output "bucket_url" {
  description = "Assets bucket URL."
  value       = google_storage_bucket.assets.url
}
