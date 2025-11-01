# Đánh giá phương án dự phòng on-prem

Dựa trên yêu cầu của giai đoạn Q2/2025, nhóm đã phân tích khả năng triển khai hệ thống tại trung tâm dữ liệu nội bộ của khách hàng nhằm đáp ứng các trường hợp không thể sử dụng dịch vụ cloud công cộng.

## Hạ tầng đề xuất

| Thành phần | Cấu hình tối thiểu | Ghi chú |
| --- | --- | --- |
| **Máy chủ ứng dụng** | 2 x CPU 16 core, RAM 64GB, SSD NVMe 1TB | Chạy container (k3s/Harbor). Triển khai worker OCR, API, dashboard. |
| **Máy chủ cơ sở dữ liệu** | 2 x CPU 16 core, RAM 128GB, SSD NVMe 2TB (RAID10) | PostgreSQL 16 + pgvector. Sao lưu định kỳ sang NAS nội bộ. |
| **Máy chủ Redis** | 3 node (1 primary, 2 replica), RAM 32GB, SSD 512GB | Redis Sentinel đảm bảo HA. |
| **Kho lưu trữ đối tượng** | NAS hỗ trợ S3 (MinIO/SeaweedFS) 50TB | Lưu file OCR, backup log. |
| **Giám sát** | 1 node Prometheus + Grafana, RAM 16GB | Thu thập metric từ worker, Redis, hệ thống. |

## Kết nối & bảo mật

- Tách VLAN dành riêng cho hàng đợi và cơ sở dữ liệu; giới hạn truy cập qua firewall layer 4.
- Cấu hình VPN site-to-site tới mạng doanh nghiệp để đồng bộ dữ liệu định kỳ.
- Chuẩn hóa chứng chỉ TLS nội bộ (Let's Encrypt nội bộ hoặc Vault) để mã hóa giao tiếp.
- Thiết lập hệ thống sao lưu offline hàng ngày (NAS + băng từ) để phòng chống ransomware.

## Chi phí ước lượng

| Hạng mục | Chi phí đầu tư ban đầu (ước tính) |
| --- | --- |
| Máy chủ ứng dụng (2 chiếc) | ~45,000 USD |
| Máy chủ cơ sở dữ liệu | ~28,000 USD |
| Máy chủ Redis (3 chiếc) | ~18,000 USD |
| NAS lưu trữ S3 50TB | ~22,000 USD |
| Thiết bị mạng & firewall | ~12,000 USD |
| Tổng cộng | ~125,000 USD |

Chi phí vận hành hàng năm (điện, làm mát, nhân sự) khoảng 20% giá trị đầu tư.

## Quy trình chuyển đổi dự phòng

1. Đồng bộ dữ liệu Postgres và S3 từ cloud về on-prem thông qua job nightly.
2. Kiểm tra tính toàn vẹn dữ liệu bằng checksum và snapshot định kỳ.
3. Khi kích hoạt chế độ dự phòng, cập nhật DNS nội bộ trỏ về cụm on-prem, đồng thời vô hiệu hóa job gửi dữ liệu lên cloud.
4. Sau khi cloud hoạt động lại, thực hiện đồng bộ ngược bằng cơ chế change data capture (pglogical) và rsync.

## Kết luận

Phương án on-prem khả thi với thời gian chuẩn bị 6-8 tuần, phù hợp khách hàng có yêu cầu lưu trữ dữ liệu tại chỗ hoặc tuân thủ quy định nghiêm ngặt. Tuy nhiên chi phí đầu tư ban đầu cao; khuyến nghị duy trì cloud làm môi trường chính, on-prem làm dự phòng nóng.
