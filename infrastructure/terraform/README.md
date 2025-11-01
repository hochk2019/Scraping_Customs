# Hạ tầng chuẩn bị cho hàng đợi OCR/AI

Thư mục này chứa cấu hình Terraform giúp khởi tạo nhanh các dịch vụ bắt buộc được mô tả trong tài liệu "Yêu cầu hạ tầng & ước lượng chi phí".

## Thành phần được khởi tạo

- **Redis (ElastiCache)**: replication group 1 primary + 1 replica, bật TLS cho BullMQ.
- **Postgres (RDS)**: instance Multi-AZ, mã hóa lưu trữ, sao lưu 7 ngày.
- **S3 Bucket**: lưu trữ file tài liệu và bản OCR kèm lifecycle chuyển sang Glacier sau `retention_days`.
- **OpenSearch**: cụm 3 node phục vụ tìm kiếm nâng cao và phân tích log.
- **Amazon Managed Prometheus & Grafana**: thu thập và trực quan hóa metric hàng đợi.
- **AWS Budgets**: cảnh báo khi chi phí thực tế vượt 80% hạn mức tháng, hỗ trợ gửi email và Slack.

## Hướng dẫn sử dụng nhanh

```bash
cd infrastructure/terraform
terraform init
terraform plan \
  -var="project_name=customs-scraper" \
  -var="vpc_id=vpc-xxxxxxxx" \
  -var='redis_subnet_ids=["subnet-aaa","subnet-bbb"]' \
  -var='db_subnet_ids=["subnet-ccc","subnet-ddd"]' \
  -var='opensearch_subnet_ids=["subnet-eee","subnet-fff"]' \
  -var="s3_bucket_name=customs-scraper-docs" \
  -var='alert_emails=["alert@example.com"]'
```

> ⚠️ **Lưu ý:**
>
> - Mật khẩu Postgres (`password`) cần được thay thế bằng secret an toàn trước khi apply.
> - Các subnet truyền vào phải thuộc cùng VPC, đã bật route private tới NAT/Internet gateway.
> - Với cảnh báo Slack, cấu hình webhook thông qua SNS, nhập ARN vào biến `slack_webhook_url`.

## Kế hoạch mở rộng

- Thêm module riêng cho môi trường staging với cấu hình chi phí thấp hơn.
- Hỗ trợ Redis Serverless và Aurora Postgres khi cần scale động.
- Tích hợp Terraform Cloud/Atlantis để tự động hóa apply theo pull request.
