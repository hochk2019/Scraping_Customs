resource "aws_security_group" "redis" {
  name        = "${var.project_name}-redis"
  description = "Cho phép truy cập Redis BullMQ"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = length(var.allowed_cidr_blocks) > 0 ? var.allowed_cidr_blocks : ["10.0.0.0/8"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-redis"
  })
}

resource "aws_elasticache_subnet_group" "redis" {
  name       = "${var.project_name}-redis"
  subnet_ids = var.redis_subnet_ids

  tags = local.common_tags
}

resource "aws_elasticache_replication_group" "ocr_queue" {
  replication_group_id          = "${var.project_name}-ocr"
  description                   = "Redis cho hàng đợi BullMQ"
  node_type                     = var.redis_node_type
  port                          = 6379
  number_cache_clusters         = 2
  automatic_failover_enabled    = true
  multi_az_enabled              = true
  engine                        = "redis"
  engine_version                = var.redis_engine_version
  parameter_group_name          = "default.redis7.cluster.on"
  subnet_group_name             = aws_elasticache_subnet_group.redis.name
  security_group_ids            = [aws_security_group.redis.id]
  at_rest_encryption_enabled    = true
  transit_encryption_enabled    = true
  auto_minor_version_upgrade    = true

  tags = local.common_tags
}

resource "aws_db_subnet_group" "postgres" {
  name       = "${var.project_name}-postgres"
  subnet_ids = var.db_subnet_ids

  tags = local.common_tags
}

resource "aws_db_instance" "postgres" {
  identifier              = "${var.project_name}-postgres"
  engine                  = "postgres"
  engine_version          = "16.3"
  instance_class          = var.db_instance_class
  allocated_storage       = var.db_allocated_storage
  storage_encrypted       = true
  multi_az                = true
  db_subnet_group_name    = aws_db_subnet_group.postgres.name
  publicly_accessible     = false
  username                = "postgres"
  password                = "ChangeMe123!"
  skip_final_snapshot     = false
  backup_retention_period = 7
  delete_automated_backups = true

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-postgres"
  })
}

resource "aws_s3_bucket" "documents" {
  bucket = var.s3_bucket_name

  tags = local.common_tags
}

resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    id     = "glacier-archive"
    status = "Enabled"

    transition {
      days          = var.retention_days
      storage_class = "GLACIER"
    }
  }
}

resource "aws_opensearch_domain" "hs_search" {
  domain_name    = "${var.project_name}-hs"
  engine_version = "OpenSearch_2.13"

  cluster_config {
    instance_type          = var.opensearch_instance_type
    instance_count         = 3
    dedicated_master_enabled = false
    zone_awareness_enabled = true
    zone_awareness_config {
      availability_zone_count = 2
    }
  }

  ebs_options {
    ebs_enabled = true
    volume_type = "gp3"
    volume_size = var.opensearch_volume_size
  }

  vpc_options {
    subnet_ids         = var.opensearch_subnet_ids
    security_group_ids = [aws_security_group.redis.id]
  }

  encrypt_at_rest {
    enabled = true
  }

  node_to_node_encryption {
    enabled = true
  }

  tags = local.common_tags
}

resource "aws_prometheus_workspace" "queue_metrics" {
  alias = var.prometheus_workspace_name

  tags = local.common_tags
}

resource "aws_grafana_workspace" "observability" {
  name        = var.grafana_workspace_name
  account_access_type = "CURRENT_ACCOUNT"
  authentication_providers = ["SAML", "AWS_SSO"]

  tags = local.common_tags
}

resource "aws_budgets_budget" "monthly" {
  name              = "${var.project_name}-monthly"
  budget_type       = "COST"
  limit_amount      = tostring(var.monthly_budget_limit)
  limit_unit        = "USD"
  time_unit         = "MONTHLY"

  cost_filters = {
    TagKeyValue = "Project$${var.project_name}"
  }

  notification {
    comparison_operator = "GREATER_THAN"
    threshold           = 80
    threshold_type      = "PERCENTAGE"
    notification_type   = "ACTUAL"

    subscriber {
      subscription_type = "EMAIL"
      address            = element(var.alert_emails, 0)
    }

    dynamic "subscriber" {
      for_each = slice(var.alert_emails, 1, length(var.alert_emails))
      content {
        subscription_type = "EMAIL"
        address            = subscriber.value
      }
    }

    dynamic "subscriber" {
      for_each = var.slack_webhook_url != "" ? [var.slack_webhook_url] : []
      content {
        subscription_type = "SNS"
        address            = subscriber.value
      }
    }
  }
}
