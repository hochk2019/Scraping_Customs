variable "project_name" {
  description = "Tên dự án dùng để đặt tag cho tài nguyên"
  type        = string
}

variable "environment" {
  description = "Môi trường triển khai (staging/production)"
  type        = string
  default     = "production"
}

variable "aws_region" {
  description = "Khu vực triển khai"
  type        = string
  default     = "ap-southeast-1"
}

variable "vpc_id" {
  description = "ID của VPC chính"
  type        = string
}

variable "redis_subnet_ids" {
  description = "Danh sách subnet dành cho Redis"
  type        = list(string)
}

variable "db_subnet_ids" {
  description = "Danh sách subnet dành cho Postgres"
  type        = list(string)
}

variable "opensearch_subnet_ids" {
  description = "Danh sách subnet triển khai OpenSearch"
  type        = list(string)
}

variable "allowed_cidr_blocks" {
  description = "Các dải IP được phép truy cập các dịch vụ quản trị"
  type        = list(string)
  default     = []
}

variable "redis_node_type" {
  description = "Loại node cho Redis"
  type        = string
  default     = "cache.t3.small"
}

variable "redis_engine_version" {
  description = "Phiên bản Redis"
  type        = string
  default     = "7.1"
}

variable "db_instance_class" {
  description = "Cấu hình instance cho Postgres"
  type        = string
  default     = "db.m6g.large"
}

variable "db_allocated_storage" {
  description = "Dung lượng khởi điểm (GB)"
  type        = number
  default     = 200
}

variable "s3_bucket_name" {
  description = "Tên bucket lưu trữ tài liệu"
  type        = string
}

variable "retention_days" {
  description = "Số ngày trước khi chuyển object sang Glacier"
  type        = number
  default     = 90
}

variable "opensearch_instance_type" {
  description = "Loại node cho OpenSearch"
  type        = string
  default     = "t3.small.search"
}

variable "opensearch_volume_size" {
  description = "Dung lượng EBS cho OpenSearch"
  type        = number
  default     = 200
}

variable "prometheus_workspace_name" {
  description = "Tên workspace cho Amazon Managed Prometheus"
  type        = string
  default     = "customs-scraper"
}

variable "grafana_workspace_name" {
  description = "Tên workspace Grafana"
  type        = string
  default     = "customs-scraper"
}

variable "alert_emails" {
  description = "Danh sách email nhận cảnh báo ngân sách"
  type        = list(string)
  default     = []
}

variable "monthly_budget_limit" {
  description = "Ngưỡng ngân sách tháng (USD)"
  type        = number
  default     = 900
}

variable "slack_webhook_url" {
  description = "Webhook Slack cho cảnh báo"
  type        = string
  default     = ""
}
