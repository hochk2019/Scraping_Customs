# Kế hoạch nâng cấp giai đoạn tiếp theo (tham chiếu ROADMAP Version 2)

## 1. Tình trạng hiện tại
- Các vấn đề trong `ISSUE_STATUS.md` đã được xử lý toàn bộ; hệ thống đang hoạt động với pipeline OCR, phân tích HS code và lưu trữ lịch sử đầy đủ.
- Hệ thống đã có dữ liệu mẫu để vận hành offline, giao diện chính điều hướng tới tra cứu HS code, và các trang quản lý tài liệu, xử lý liên kết hoạt động ổn định.

## 2. Mục tiêu chiến lược Q2/2025
1. **Hiện đại hóa trải nghiệm người dùng**: cập nhật giao diện thân thiện thiết bị di động, realtime dashboard, biểu đồ động.
2. **Mở rộng phân tích dữ liệu & AI**: triển khai gợi ý HS dựa trên embedding, huấn luyện mô hình phân loại tài liệu, tự động phát hiện bất thường.
3. **Tăng độ tin cậy & hiệu năng**: bổ sung caching, hàng đợi xử lý nền, giám sát và cảnh báo.
4. **Chuẩn hóa dữ liệu & mở rộng tích hợp**: tối ưu schema, thêm lịch sử tìm kiếm, chuẩn bị API/public webhook.

## 3. Lộ trình triển khai đề xuất
### Sprint 1 – Nền tảng realtime & hiệu năng (4 tuần)
- Thiết lập Redis caching layer và chiến lược invalidation cho `documents`, `hsCodes`, `scraperStatus`.
- Tích hợp BullMQ để xử lý OCR/AI bất đồng bộ; cập nhật router để đưa yêu cầu vào hàng đợi và theo dõi tiến độ.
- Bổ sung bảng `scrapeJobs`, `ocrJobs` và cập nhật migration tương ứng.
- Xây dựng Prometheus exporter + dashboard Grafana tối thiểu (số job thành công/thất bại, thời gian OCR trung bình).
- Viết test integration kiểm chứng job queue và cache (sử dụng test container hoặc mô phỏng).

### Sprint 2 – Giao diện realtime & tìm kiếm nâng cao (5 tuần)
- Áp dụng WebSocket (hoặc SSE) cho thông báo trạng thái job; cập nhật `ScraperStatusCard`, `UploadHistory`, `LinkProcessingPanel` hiển thị tiến độ realtime.
- Triển khai trang Dashboard thời gian thực: biểu đồ đường theo ngày, bảng log gần nhất, cảnh báo lỗi.
- Thêm tính năng tìm kiếm mở rộng: autocomplete, lọc đa tiêu chí (ngày, cơ quan ban hành, loại văn bản). Chuẩn bị tích hợp Elasticsearch; giai đoạn đầu dùng Drizzle full-text search.
- Tối ưu giao diện mobile: responsive layout, bottom navigation, cải thiện hiệu suất bundle (code splitting, lazy load).
- Bổ sung test e2e (Playwright) cho luồng tìm kiếm và theo dõi job realtime.

### Sprint 3 – AI nâng cao & trải nghiệm nội dung (5 tuần)
- Xây dựng dịch vụ embedding (OpenAI/BGE) cho văn bản công văn; lưu vector vào bảng `document_embeddings` (hoặc Postgres + pgvector nếu chuyển DB).
- Triển khai mô-đun gợi ý HS code dựa trên cosine similarity + few-shot prompt, ghi lại nguồn gợi ý và độ tin cậy.
- Thêm phân tích bất thường: phát hiện chênh lệch mã HS so với lịch sử, gửi cảnh báo qua email/Slack.
- Thiết kế trình đọc tài liệu nâng cao: highlight từ khóa OCR, hiển thị bảng so sánh các gợi ý HS, hỗ trợ bình luận nội bộ.
- Xây dựng trang kiến thức (Knowledge Hub) tập hợp công văn quan trọng, dùng tagging tự động.
- Hoàn thiện unit test cho thuật toán AI và snapshot test giao diện mới.

## 4. Hạng mục hỗ trợ & chuẩn bị
- Chuẩn hóa pipeline CI/CD: chạy `pnpm lint`, `pnpm test`, e2e, kiểm tra migrate tự động trước khi deploy.
- Viết tài liệu kiến trúc hàng đợi, caching, AI mới vào thư mục `docs/`.
- Thực hiện đánh giá bảo mật: kiểm tra rate limiting, JWT expiration, quy trình quản lý secret.
- Thu thập phản hồi người dùng sau mỗi sprint (form trong ứng dụng) để tinh chỉnh ưu tiên.

## 5. KPI dự kiến
- Giảm thời gian xử lý OCR trung bình xuống < 45s/tài liệu.
- Gợi ý HS chính xác trên 80% bộ dữ liệu kiểm thử.
- Trang Dashboard realtime tải < 2s trên 3G.
- Tối thiểu 95% job OCR/AI thành công và có log đầy đủ.

## 6. Rủi ro & biện pháp
| Rủi ro | Ảnh hưởng | Biện pháp |
| --- | --- | --- |
| Hạ tầng hiện tại không hỗ trợ Redis/BullMQ | Trễ tiến độ Sprint 1 | Chuẩn bị docker-compose, cho phép fallback in-memory, đánh giá chi phí triển khai cloud. |
| Chi phí API AI cao | Vượt ngân sách | Cài đặt quota, caching kết quả embedding, fallback mô hình nội bộ. |
| Độ trễ Elasticsearch | Ảnh hưởng UX tìm kiếm | Bổ sung caching và deferred search, tối ưu mapping. |
| Thiếu dữ liệu gán nhãn | Giảm độ chính xác gợi ý HS | Thiết lập quy trình gán nhãn bán tự động, huy động chuyên gia rà soát định kỳ. |

## 7. Công việc chuẩn bị ngay (Next Actions)
- [x] Xây dựng bản thiết kế kiến trúc hàng đợi OCR/AI (sequence diagram, data flow).
- [x] Lập danh sách yêu cầu hạ tầng (Redis, Prometheus, Elasticsearch) và ước lượng chi phí.
- [x] Thiết kế UI Dashboard realtime (wireframe, spec component) và review với stakeholders.
- [x] Thu thập bộ dữ liệu mẫu gán nhãn HS tối thiểu 500 bản ghi để huấn luyện/đánh giá.
- [x] Cập nhật lịch trình roadmap nội bộ, phân công nhân sự cho từng sprint.

