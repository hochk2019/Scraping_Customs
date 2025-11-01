output "redis_endpoint" {
  description = "Endpoint Redis sử dụng cho BullMQ"
  value       = aws_elasticache_replication_group.ocr_queue.primary_endpoint_address
}

output "postgres_endpoint" {
  description = "Endpoint Postgres"
  value       = aws_db_instance.postgres.address
}

output "s3_bucket_id" {
  description = "ID bucket tài liệu"
  value       = aws_s3_bucket.documents.id
}

output "opensearch_endpoint" {
  description = "Endpoint truy cập OpenSearch"
  value       = aws_opensearch_domain.hs_search.endpoint
}

output "prometheus_workspace_arn" {
  description = "ARN workspace Prometheus"
  value       = aws_prometheus_workspace.queue_metrics.arn
}

output "grafana_workspace_id" {
  description = "ID workspace Grafana"
  value       = aws_grafana_workspace.observability.id
}
