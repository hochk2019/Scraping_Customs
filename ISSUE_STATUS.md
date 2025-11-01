# Theo dõi tình trạng các vấn đề trọng tâm

Bảng sau tổng hợp trạng thái của từng vấn đề đã nêu, kèm ghi chú và kế hoạch xử lý tiếp theo.

| Vấn đề | Trạng thái | Ghi chú chính | Bước tiếp theo |
| --- | --- | --- | --- |
| OCR từ liên kết tài liệu | ✅ Đã xử lý | `scraperRouter.processDocument` giờ gọi `processOcr` khi không có `rawText`, lưu kết quả HS code, tên hàng và thống kê vào DB trước khi cập nhật trạng thái tài liệu.【F:server/scraper-router.ts†L135-L220】 | Kết nối giao diện (DocumentDetail/RecentDocuments) với mutation OCR để người vận hành kích hoạt trực tiếp; thêm thông báo tiến độ. |
| Pipeline AI gợi ý HS code | ⚠️ Cần nâng cấp | Hàm `analyzeExtractedData` vẫn dựa vào gợi ý mặc định với `Math.random()` khi không có phản hồi LLM và chưa ghi kết quả vào DB.【F:server/file-processor.ts†L193-L307】 | Thiết kế mô-đun phân tích dùng embedding hoặc rule-based có trọng số rõ ràng; lưu `aiAnalysis` cùng tài liệu/upload để tái sử dụng. |
| Luồng tải lên & lưu trữ tài liệu | ⚠️ Một phần hoàn thành | Form “Đăng Tài Liệu Công Văn” tạo bản ghi mới qua API và thông báo rằng tài liệu sẽ hiện ở trang “Công văn mới”/sidebar.【F:client/src/pages/DocumentsUpload.tsx†L38-L125】 Lịch sử tải file trong Dashboard vẫn dùng dữ liệu mẫu, chưa đọc API `files.list`. | Hoàn thiện `UploadHistory` để gọi `trpc.files.list`, hiển thị kết quả thực và hỗ trợ tải lại OCR/AI nếu cần. |
| Mutation `scrapeCustoms` không lưu DB | ✅ Đã xử lý | `scraperRouter.scrapeCustoms` tạo log, gọi `upsertDocument` cho từng tài liệu và cập nhật thống kê trước khi kết thúc.【F:server/scraper-router.ts†L32-L112】 | Mở rộng để tự động xếp hàng OCR/AI và gửi thông báo khi hoàn tất (tính năng bổ sung). |
| Trang chủ cần là tra cứu HS | ✅ Đã xử lý | Tuyến `/` trỏ trực tiếp đến `HsCodeLookup`, trang “Công văn mới” chuyển sang `/cong-van-moi`.【F:client/src/App.tsx†L18-L35】 | Theo dõi phản hồi người dùng, cân nhắc thêm quick link quay lại bảng công văn. |
| Vị trí hiển thị bài đã đăng | ✅ Đã nêu rõ | Trang đăng tài liệu mô tả sau khi lưu sẽ xuất hiện tại trang “Công văn mới” và thanh bên tổng hợp để tra cứu nhanh.【F:client/src/pages/DocumentsUpload.tsx†L121-L125】 | Kiểm tra thực tế khi dữ liệu có thật và bổ sung badge “Mới đăng” trong bảng `RecentDocumentsSidebar`. |

## Việc cần làm tiếp (chưa giải quyết)
- [ ] Bổ sung nút “Chạy OCR”/“Làm mới dữ liệu” trong `DocumentDetailDrawer`, gọi `scraper.processDocument` và đồng bộ kết quả vào giao diện.
- [ ] Thiết kế lại `analyzeExtractedData` để loại bỏ ngẫu nhiên, lưu kết quả AI xuống bảng `ocrRepository` hoặc bảng riêng phục vụ thống kê.
- [ ] Kết nối `UploadHistory` với API thật, hiển thị tiến trình realtime và cho phép tải lại file đã xử lý.
- [ ] Gắn kết router `links.processLink` với giao diện để xử lý các URL rời, sau đó cho phép lưu tài liệu mới dựa trên kết quả OCR/AI.

