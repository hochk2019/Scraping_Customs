# Theo dõi tình trạng các vấn đề trọng tâm

Bảng sau tổng hợp trạng thái của từng vấn đề đã nêu, kèm ghi chú và kế hoạch xử lý tiếp theo.

| Vấn đề | Trạng thái | Ghi chú chính | Bước tiếp theo |
| --- | --- | --- | --- |
| OCR từ liên kết tài liệu | ✅ Đã xử lý | `scraperRouter.processDocument` giờ gọi `processOcr` khi không có `rawText`, lưu kết quả HS code, tên hàng và thống kê vào DB trước khi cập nhật trạng thái tài liệu.【F:server/scraper-router.ts†L135-L220】 | Kết nối giao diện (DocumentDetail/RecentDocuments) với mutation OCR để người vận hành kích hoạt trực tiếp; thêm thông báo tiến độ. |
| Pipeline AI gợi ý HS code | ✅ Đã xử lý | Bộ phân tích HS code dùng thư viện từ khóa chuẩn hóa, loại bỏ ngẫu nhiên và trả về điểm tin cậy xác định; kết quả AI được lưu cùng bản ghi upload để tái sử dụng.【F:server/file-processor.ts†L185-L298】【F:server/db.ts†L900-L967】 | Theo dõi phản hồi thực tế để mở rộng thư viện từ khóa và tích hợp embedding khi cần. |
| Luồng tải lên & lưu trữ tài liệu | ✅ Đã xử lý | API tải file lưu kết quả OCR/AI vào bảng phân tích, danh sách lịch sử đọc từ DB và hiển thị chi tiết thật thay vì dữ liệu mẫu.【F:server/routers.ts†L213-L313】【F:client/src/components/UploadHistory.tsx†L1-L227】 | Bổ sung biểu đồ thống kê theo thời gian xử lý (tùy chọn). |
| Mutation `scrapeCustoms` không lưu DB | ✅ Đã xử lý | `scraperRouter.scrapeCustoms` tạo log, gọi `upsertDocument` cho từng tài liệu và cập nhật thống kê trước khi kết thúc.【F:server/scraper-router.ts†L32-L112】 | Mở rộng để tự động xếp hàng OCR/AI và gửi thông báo khi hoàn tất (tính năng bổ sung). |
| Trang chủ cần là tra cứu HS | ✅ Đã xử lý | Tuyến `/` trỏ trực tiếp đến `HsCodeLookup`, trang “Công văn mới” chuyển sang `/cong-van-moi`.【F:client/src/App.tsx†L18-L35】 | Theo dõi phản hồi người dùng, cân nhắc thêm quick link quay lại bảng công văn. |
| Vị trí hiển thị bài đã đăng | ✅ Đã nêu rõ | Trang đăng tài liệu mô tả sau khi lưu sẽ xuất hiện tại trang “Công văn mới” và thanh bên tổng hợp để tra cứu nhanh.【F:client/src/pages/DocumentsUpload.tsx†L121-L125】 | Kiểm tra thực tế khi dữ liệu có thật và bổ sung badge “Mới đăng” trong bảng `RecentDocumentsSidebar`. |

## Việc cần làm tiếp (chưa giải quyết)
- [x] Bổ sung nút “Chạy OCR”/“Làm mới dữ liệu” trong `DocumentDetailDrawer`, gọi `scraper.processDocument` và đồng bộ kết quả vào giao diện.【F:client/src/components/DocumentDetailDrawer.tsx†L26-L212】
- [x] Thiết kế lại `analyzeExtractedData` để loại bỏ ngẫu nhiên, lưu kết quả AI xuống bảng `ocrRepository` hoặc bảng riêng phục vụ thống kê.【F:server/file-processor.ts†L185-L298】【F:server/db.ts†L900-L967】
- [x] Kết nối `UploadHistory` với API thật, hiển thị tiến trình realtime và cho phép tải lại file đã xử lý.【F:client/src/components/UploadHistory.tsx†L1-L227】
- [x] Gắn kết router `links.processLink` với giao diện để xử lý các URL rời, sau đó cho phép lưu tài liệu mới dựa trên kết quả OCR/AI.【F:client/src/components/LinkProcessingPanel.tsx†L1-L228】【F:server/link-processor.ts†L1-L116】

