# Báo cáo liên hệ nhà cung cấp cloud (AWS & Azure)

Ngày liên hệ: 2024-03-29.

## 1. Thông tin liên hệ
- **AWS**: gửi ticket qua AWS Support (case `#889237451`). Đại diện kinh doanh: *Nguyễn Minh Hùng*.
- **Azure**: gửi biểu mẫu tư vấn Azure Sales. Đại diện phản hồi: *Trần Thảo Ly*.

## 2. Tóm tắt trao đổi và báo giá sơ bộ
| Hạng mục | AWS đề xuất | Giá ước tính (USD/tháng) | Azure đề xuất | Giá ước tính (USD/tháng) | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| Redis/BullMQ | Amazon ElastiCache for Redis `cache.t3.small` (2 shard, 1 replica) | ~128 | Azure Cache for Redis `C1 Premium` (clustering 2 shard) | ~135 | Cả hai đều gợi ý bật TLS, lưu snapshot 24h. |
| Postgres | Amazon RDS `db.m6g.large`, Multi-AZ | ~228 | Azure Database for PostgreSQL Flexible Server `Standard_D4ds_v5` | ~240 | Cần xác nhận dung lượng IOPS bổ sung. |
| Object Storage | Amazon S3 Standard 200GB + Intelligent Tiering | ~6 | Azure Blob Storage Hot Tier 200GB | ~5 | Đã hỏi thêm về chi phí Data Transfer Out. |
| OpenSearch/Elastic | Amazon OpenSearch `t3.small.search` (3 node + 1 UltraWarm) | ~162 | Azure AI Search S1 (3 replica) | ~155 | Cả hai khuyến nghị bật Auto-Scaling theo tải. |
| Prometheus/Grafana | Amazon Managed Service for Prometheus + Grafana | ~52 | Azure Monitor + Grafana Managed | ~58 | AWS yêu cầu tối thiểu 3 workspace metric. |
| Email/SMS | Amazon SES + SNS | ~20 | Azure Communication Services | ~23 | Cần cấu hình gửi từ domain tùy chỉnh. |
| AI/Embedding | Amazon Bedrock (Titan Embeddings) | ~92 | Azure OpenAI (text-embedding-3-large) | ~88 | Cần kiểm tra giới hạn vùng Singapore. |

## 3. Câu hỏi cần phản hồi thêm
1. Yêu cầu tài liệu chứng nhận tuân thủ (ISO 27001, SOC2) để gửi khách hàng.
2. Cam kết SLA cụ thể cho Redis và Postgres (>= 99.9%).
3. Tùy chọn hỗ trợ Enterprise khi cần mở rộng > 10 worker OCR.

## 4. Bước tiếp theo đề xuất
- Chờ báo giá chính thức bằng văn bản trong 3 ngày làm việc.
- Cập nhật `infrastructure/terraform` với tùy chọn instance type linh hoạt (biến cho số shard Redis, kích thước Postgres).
- Chuẩn bị họp nội bộ tuần tới để quyết định nhà cung cấp chính, cân nhắc triển khai đa đám mây.

