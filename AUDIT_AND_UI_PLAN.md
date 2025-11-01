# Đánh giá tổng thể & Kế hoạch tái thiết giao diện

## 1. Tình trạng hiện tại của mã nguồn
### 1.1 Thu thập dữ liệu (server/customs-scraper.ts)
- Bộ thu thập chính đã truy cập trang chi tiết cho từng tài liệu, ánh xạ nhãn và trích xuất đúng liên kết "Tải tệp nội dung toàn văn". Vòng lặp xử lý từng hàng, kết hợp dữ liệu dự phòng từ bảng danh sách để đảm bảo tối thiểu số hiệu, cơ quan ban hành và ngày ban hành.【F:server/customs-scraper.ts†L40-L179】
- Cơ chế hàng đợi theo liên kết phân trang hoạt động theo kiểu BFS với tập `visitedPages`, giúp tránh lặp liên kết và cho phép mở rộng số trang tùy ý.【F:server/customs-scraper.ts†L48-L74】【F:server/customs-scraper.ts†L190-L214】

### 1.2 Trình thu thập nâng cao dùng Puppeteer (server/advanced-scraper.ts)
- Bộ thu thập nâng cao điều khiển trình duyệt không đầu, điền khoảng thời gian, chờ bảng kết quả và mở từng trang chi tiết trong tab mới để đọc bảng dữ liệu và liên kết PDF.【F:server/advanced-scraper.ts†L120-L321】
- Vòng lặp phân trang hiện lấy `href` của nút `>>`, xây lại URL tuyệt đối và `page.goto` trang tiếp theo nên không còn phụ thuộc vào thao tác click rủi ro.【F:server/advanced-scraper.ts†L192-L213】
- Hàm `fillDateRange` đặt giá trị trực tiếp cho cả input `type=date` và `type=text`, tự chuẩn hóa định dạng `dd/mm/yyyy` cũng như fallback khi không tìm thấy selector phù hợp.【F:server/advanced-scraper.ts†L226-L285】
- Liên kết PDF luôn được chuẩn hóa bằng `new URL` trước khi tải, đảm bảo pipeline OCR nhận đúng đường dẫn tuyệt đối.【F:server/advanced-scraper.ts†L297-L325】

### 1.3 OCR & phân tích văn bản
- `ocr-processor` sử dụng `extractPdfText` để gọi `pdf-utils`, đảm bảo chuẩn hóa Unicode NFC sau khi trích xuất văn bản, phù hợp với yêu cầu xử lý tiếng Việt.【F:server/ocr-processor.ts†L20-L44】【F:server/pdf-utils.ts†L1-L33】
- Bộ từ khóa tên hàng được tách theo nhóm ngành, chuẩn hóa Unicode và có thể nạp động từ bảng `referenceData`, đồng thời cache lại cho các lần xử lý tiếp theo.【F:server/product-keyword-service.ts†L1-L111】【F:server/ocr-processor.ts†L46-L118】

### 1.4 Giao diện hiện có (client/src/pages/Home.tsx)
- Trang chủ được tái cấu trúc thành layout hai cột: hero súc tích, cột trái tập trung vào công văn mới và biểu mẫu scraper, cột phải gom tra cứu, trạng thái scraper và tác vụ nhanh.【F:client/src/pages/Home.tsx†L79-L168】
- `RecentDocumentsSidebar` hỗ trợ chế độ bảng (`variant="panel"`) để dùng như vùng nội dung chính, cho phép mở rộng số lượng công văn hiển thị.【F:client/src/components/RecentDocumentsSidebar.tsx†L9-L73】

## 2. Rủi ro logic & đề xuất khắc phục
- [x] **Phân trang Puppeteer không ổn định** – Đã thay việc click nút `>>` bằng cách dựng URL tuyệt đối và `page.goto`, đảm bảo luôn trở về trang danh sách trước khi chuyển trang.【F:server/advanced-scraper.ts†L192-L213】
- [x] **Điền ngày sai định dạng** – Hàm `fillDateRange` mới đặt giá trị trực tiếp cho cả input ngày và text, chuẩn hóa chuỗi `dd/mm/yyyy` và fallback gõ thủ công khi cần.【F:server/advanced-scraper.ts†L226-L285】
- [x] **URL PDF tương đối** – Liên kết PDF được chuẩn hóa bằng `new URL` và truyền xuyên suốt sang bước tải/OCR nên không còn lỗi 404 do đường dẫn tương đối.【F:server/advanced-scraper.ts†L297-L325】
- [x] **Danh sách từ khóa sản phẩm khó bảo trì** – Đã tách thành nhóm ngành, chuẩn hóa Unicode, hỗ trợ đọc cấu hình từ bảng `referenceData` và cache để tái sử dụng trong OCR.【F:server/product-keyword-service.ts†L1-L111】【F:server/ocr-processor.ts†L17-L118】
- [x] **Trải nghiệm trang chủ bị phân tán** – Trang chủ được tinh gọn thành hero + hai cột với tác vụ nhanh, trạng thái scraper và khối tra cứu HS code, giúp nổi bật hành động chính.【F:client/src/pages/Home.tsx†L79-L168】【F:client/src/components/RecentDocumentsSidebar.tsx†L9-L73】

## 3. Kế hoạch tái xây dựng giao diện thân thiện
### Giai đoạn A – Xác định trải nghiệm cốt lõi
- [x] Xây dựng sitemap rút gọn gồm 3 vùng chính với sidebar cố định, phân tách rõ "Bảng điều khiển", "Tra cứu" và "Công văn mới".【F:client/src/layouts/MainLayout.tsx†L1-L170】
- [x] Bổ sung luồng điều hướng thu thập phản hồi nội bộ thông qua thẻ tác vụ nhanh, ưu tiên các hành động tra cứu, tải PDF, xem lịch sử và gửi góp ý.【F:client/src/pages/Home.tsx†L24-L74】

### Giai đoạn B – Thiết kế khung (wireframe)
- [x] Header tinh gọn chỉ giữ logo, chuyển theme và nút đăng nhập, thống nhất trên toàn bộ trang bằng bố cục mới.【F:client/src/layouts/MainLayout.tsx†L55-L123】
- [x] Vùng nội dung hai cột với bảng công văn có bộ lọc đầy đủ và khối tra cứu, trạng thái scraper nằm ở cột phải.【F:client/src/pages/Home.tsx†L76-L158】【F:client/src/components/RecentDocumentsSidebar.tsx†L1-L256】【F:client/src/components/ScraperStatusCard.tsx†L1-L74】
- [x] Thanh tác vụ nhanh gom các hành động chủ chốt giúp điều hướng quản trị và vận hành.【F:client/src/pages/Home.tsx†L24-L74】【F:client/src/pages/Home.tsx†L86-L118】
- [x] Thêm accordion cung cấp hướng dẫn ngắn gọn, giảm tải nội dung dài trên trang chính.【F:client/src/pages/Home.tsx†L120-L149】

### Giai đoạn C – Thiết kế hi-fidelity & phát triển
- [x] Áp dụng nền sáng trung tính và nhấn xanh dương cho CTA, kết hợp hiệu ứng mờ nhẹ ở layout chính.【F:client/src/layouts/MainLayout.tsx†L36-L170】【F:client/src/pages/Home.tsx†L64-L158】
- [x] Chuẩn hóa khoảng cách bằng hệ thống card/button hiện hữu khi dựng lại bảng tài liệu và trang tổng quan.【F:client/src/components/RecentDocumentsSidebar.tsx†L1-L256】【F:client/src/pages/Overview.tsx†L1-L78】
- [x] Tách trang tổng quan riêng hiển thị số liệu tóm tắt và biểu mẫu điều khiển scraper, giữ trang chủ tập trung vào dữ liệu mới.【F:client/src/pages/Overview.tsx†L1-L78】
- [x] Chuỗi tìm kiếm và lọc công văn được normalize NFC trước khi so khớp để đảm bảo hiển thị tiếng Việt chính xác.【F:client/src/components/RecentDocumentsSidebar.tsx†L63-L118】

### Giai đoạn D – Triển khai từng bước
- [x] Bổ sung route `Trang tổng quan` dùng bảng công văn mới với phân trang động để theo dõi dữ liệu tổng hợp.【F:client/src/pages/Overview.tsx†L1-L78】【F:client/src/components/RecentDocumentsSidebar.tsx†L121-L256】
- [x] Tạo trang phụ "Hướng dẫn" và "Tính năng" giúp tách nội dung hỗ trợ khỏi trang chính.【F:client/src/pages/Guide.tsx†L1-L53】【F:client/src/pages/Features.tsx†L1-L45】
- [x] Bổ sung aria-label, trạng thái active cho điều hướng và hỗ trợ di động bằng sheet menu để cải thiện truy cập.【F:client/src/layouts/MainLayout.tsx†L55-L170】
- [x] Cập nhật kế hoạch và tài liệu ngay trong file này sau mỗi thay đổi, bảo đảm lịch sử nâng cấp rõ ràng.【F:AUDIT_AND_UI_PLAN.md†L1-L120】

## 4. Kế hoạch kiểm thử & đảm bảo chất lượng
1. **Kiểm thử đơn vị**: chạy `pnpm test --filter="server"` cho các hàm scraper, OCR; bổ sung test mới cho logic phân trang Puppeteer (mock DOM) và dựng URL tuyệt đối.
2. **Kiểm thử tích hợp**: dùng `pnpm vitest run server/__tests__/scraper.e2e.test.ts` (hoặc tạo mới) để mô phỏng chuỗi scrape → tải PDF → trích xuất văn bản, đảm bảo Unicode giữ nguyên.
3. **Kiểm thử giao diện**: áp dụng Storybook/Chromatic hoặc Playwright để chụp snapshot trang chủ mới ở độ phân giải desktop/mobile; xác nhận text tiếng Việt hiển thị đúng dấu.
4. **Kiểm thử hồi quy**: cấu hình workflow CI (GitHub Actions) chạy lint (`pnpm lint`), test (`pnpm test`), build (`pnpm build`) trên mỗi nhánh để tránh regression.

## 5. Lộ trình triển khai đề xuất
| Sprint | Mục tiêu chính | Hạng mục |
| --- | --- | --- |
| S0 | Ổn định scraper | Sửa phân trang Puppeteer, chuẩn hóa URL PDF, bổ sung logging và giới hạn tốc độ yêu cầu |
| S1 | Nền tảng giao diện mới | Thiết kế wireframe, dựng layout hai cột, chuyển dữ liệu công văn vào bảng trung tâm |
| S2 | Hoàn thiện trải nghiệm | Tích hợp bộ lọc, trạng thái scraper thời gian thực, tối ưu hoá màu sắc và typography |
| S3 | Kiểm thử & chuẩn hóa | Viết test e2e, thiết lập CI/CD, hoàn thiện tài liệu hướng dẫn, chuẩn hóa dữ liệu Unicode |

Kế hoạch trên giúp làm rõ ưu tiên, giữ giao diện thân thiện nhưng vẫn mở rộng được cho các tính năng nâng cao như OCR, biểu đồ và quản trị lịch.
