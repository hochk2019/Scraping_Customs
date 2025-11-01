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
- Xây dựng sitemap rút gọn gồm 3 vùng chính: "Bảng điều khiển", "Tra cứu", "Công văn mới". Áp dụng menu trái (sidebar) cố định với biểu tượng đơn giản.
- Thu thập phản hồi từ người dùng nội bộ về hành động quan trọng nhất (tra cứu, tải PDF, xem lịch sử) để xác định ưu tiên hiển thị.

### Giai đoạn B – Thiết kế khung (wireframe)
1. **Header tinh gọn**: chỉ giữ logo, nút chuyển tối/sáng, và nút đăng nhập/đăng xuất.
2. **Vùng nội dung hai cột**:
   - Cột trái: bảng công văn mới với bộ lọc theo ngày, cơ quan, loại văn bản.
   - Cột phải: khối tra cứu HS code + trạng thái scraper (tiến trình, số lỗi gần nhất).
3. **Thanh tác vụ nhanh**: thẻ nhỏ chứa các nút "Tạo lịch thu thập", "Tải lên tài liệu", "Xem lịch sử OCR".
4. **Thông điệp hỗ trợ**: dùng accordion hoặc modal để chứa hướng dẫn chi tiết, giảm độ dài trang.

### Giai đoạn C – Thiết kế hi-fidelity & phát triển
- Sử dụng màu nền trung tính (#F5F7FA) với nhấn màu xanh đậm duy nhất cho CTA chính để đảm bảo tương phản AA.
- Tái sử dụng bộ component sẵn có (`Card`, `Button`, `Tabs`) nhưng chuẩn hóa kích thước, khoảng cách `spacing` theo scale (4/8/16 px).
- Tích hợp biểu đồ thu thập vào dashboard riêng, trang chủ chỉ hiển thị số liệu tóm tắt (số công văn mới, số PDF đã OCR trong ngày).
- Đảm bảo tất cả text sử dụng Unicode NFC và font hỗ trợ tiếng Việt (VD: Inter hoặc Roboto) để tránh lỗi hiển thị dấu.

### Giai đoạn D – Triển khai từng bước
1. Tạo route mới `Trang tổng quan` đơn giản, chuyển `RecentDocumentsSidebar` thành bảng chính và bổ sung phân trang.
2. Chuyển các section phụ của trang Home sang trang phụ (`/huong-dan`, `/tinh-nang`).
3. Kiểm tra accessibility (tab order, aria-label) và tối ưu hiệu suất (lazy load biểu đồ, phân tách bundle).
4. Sau khi hoàn thiện, cập nhật tài liệu hướng dẫn người dùng và ghi chú thay đổi UI trong changelog.

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
