# Yêu cầu hạ tầng & ước lượng chi phí

Tài liệu này tổng hợp nhu cầu hạ tầng cho giai đoạn Q2/2025 khi triển khai các cải tiến realtime, AI và giám sát. Các chi phí bên dưới được ước lượng cho môi trường production tại khu vực Singapore (USD/tháng). Giá tham khảo tháng 03/2024.

## 1. Thành phần bắt buộc

| Hạng mục | Mô tả | Thông số đề xuất | Chi phí ước lượng | Ghi chú |
| --- | --- | --- | --- | --- |
| **Redis Cluster** | Lưu hàng đợi BullMQ, cache tài liệu | 2 shard (cache.t3.small) + 1 replica | ~$120 | Có TLS, backup hàng ngày |
| **BullMQ Workers** | Container Node.js chạy job OCR/AI | 3 pod (2 vCPU, 4GB RAM) | ~$90 | Triển khai qua Kubernetes/Manus |
| **Postgres (Managed)** | Lưu dữ liệu chính & vector | db.m6g.large (2 vCPU, 8GB RAM) | ~$210 | Bật storage auto-scaling |
| **Object Storage** | Lưu file upload/OCR | 200GB S3 Standard | ~$5 | Lifecycle chuyển Glacier sau 90 ngày |
| **Prometheus** | Thu thập metric hệ thống | 1 pod (2 vCPU, 4GB RAM) | ~$40 | Dùng helm chart kube-prometheus |
| **Grafana Cloud/OSS** | Quan sát realtime | Grafana Cloud Pro | ~$49 | Có alerting, team features |
| **Elasticsearch (Managed)** | Tìm kiếm nâng cao | 3 node t3.small + 1 Kibana | ~$150 | Có snapshot định kỳ |
| **OpenAI/BGE API** | Embedding & AI suggestion | 500k token + 50k embedding | ~$80 | Bật caching nội bộ |
| **Email/Slack Integration** | Gửi cảnh báo | SendGrid Essentials + Slack webhook | ~$25 | Dự phòng SMS nếu SLA cao |

**Tổng dự kiến:** ~**$769/tháng** (chưa gồm chi phí dự phòng 15%).

## 2. Thành phần tùy chọn / mở rộng

| Hạng mục | Mục đích | Khi nào cần |
| --- | --- | --- |
| **Redis Sentinel tại on-prem** | High availability offline | Khi triển khai tại khách hàng nội bộ |
| **Vector Database riêng (Pinecone/pgvector cluster)** | Mở rộng gợi ý HS nâng cao | Khi embedding vượt 5 triệu vector |
| **Log Aggregation (ELK/Datadog)** | Phân tích log tập trung | Khi số worker > 5, yêu cầu audit |
| **Feature Store (Feast)** | Quản lý feature cho ML | Khi xây dựng nhiều mô hình thời gian thực |
| **API Gateway** | Rate limiting, auth trung tâm | Khi mở API cho đối tác bên ngoài |

## 3. Hành động tiếp theo

- [ ] Liên hệ nhà cung cấp cloud (AWS/Azure) để xác nhận báo giá chính thức.
- [x] Chuẩn bị `infrastructure/terraform` mô tả tài nguyên và môi trường staging (đã tạo Terraform template bao gồm Redis, Postgres, OpenSearch, Prometheus và AWS Budgets).
- [x] Đánh giá phương án dự phòng on-prem (máy chủ nội bộ) cho khách hàng cần dữ liệu nội bộ (xem `docs/infrastructure_onprem_assessment.md`).
- [x] Đặt ngưỡng cảnh báo chi phí (AWS Budgets) ở mức 80% hạn mức tháng (khai báo trong Terraform với biến `monthly_budget_limit`).

