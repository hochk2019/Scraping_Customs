# Hướng Dẫn Sử Dụng Customs Scraper

**Tên Ứng Dụng:** Hải quan Việt Nam - Thu thập dữ liệu văn bản  
**Mục Đích:** Thu thập, phân tích, tra cứu dữ liệu hải quan Việt Nam  
**Truy Cập:** Cần đăng nhập | **Vai Trò:** User, Admin

---

## Powered by Manus

**Công Nghệ Sử Dụng:**
- **Frontend:** React 19 + TypeScript + Tailwind CSS + Shadcn UI
- **Backend:** Express.js + tRPC + Node.js
- **Database:** MySQL/TiDB + Drizzle ORM
- **Authentication:** Manus OAuth + JWT
- **AI/ML:** LLM Integration + OCR + Similarity Matching
- **Visualization:** Recharts (Pie, Bar, Line Charts)
- **Deployment:** Auto-scaling infrastructure với global CDN

---

## Sử Dụng Website

### 1. Quản Lý Tài Liệu
Truy cập **"Quản lý tài liệu"** từ menu sidebar để:
- Xem danh sách tài liệu từ Hải quan Việt Nam
- Chạy thu thập dữ liệu mới từ trang Hải quan
- Chọn tài liệu để xuất dữ liệu (Excel, JSON, CSV)
- Xem thống kê tổng tài liệu, số đã tải, số chờ xử lý

### 2. Tải Lên & Trích Xuất Dữ Liệu
Truy cập **"Tải Lên File"** trong Dashboard để:
- **Tải file:** Click "Tải Lên File" → Chọn file (Excel/PDF/Word/JSON/CSV) → Hệ thống xử lý OCR tự động
- **Xem tiến trình:** Thanh tiến trình chi tiết với 5 bước (Tải lên → Xác thực → Xử lý → OCR → AI)
- **Xem kết quả:** Gợi ý HS code từ AI, độ tin cậy, tên hàng trích xuất
- **Xác nhận:** Click "Xác Nhận Dữ Liệu" để lưu vào database

### 3. Xem Lịch Sử Tệp
Truy cập **"Lịch Sử Tệp Tải Lên"** để:
- Xem tất cả tệp đã tải lên, sắp xếp theo ngày/trạng thái/kích thước
- Xem chi tiết: loại tệp, kích thước, trạng thái, số dữ liệu trích xuất
- Xem kết quả AI: HS code, tên hàng, độ tin cậy
- Xem gợi ý HS code từ AI

### 4. Tra Cứu HS Code
Truy cập **"Tra Cứu HS Code"** từ menu sidebar để:
- **Tìm theo mã code:** Nhập mã (ví dụ: 6204.62.20) → Click "Tìm"
- **Tìm theo tên hàng:** Nhập tên tiếng Việt/Anh → Click "Tìm"
- **Xem HS code phổ biến:** Danh sách 10 HS code được tham chiếu nhiều nhất
- **Xem chi tiết:** Mã, tên hàng, biểu thuế nhập/xuất, mô tả

### 5. Lập Lịch Tự Động
Truy cập **"Lập lịch tự động"** để:
- Tạo lập lịch mới với biểu thức Cron
- Chỉnh sửa/xóa lập lịch hiện có
- Xem trạng thái (Hoạt động/Vô hiệu) và lần chạy cuối cùng
- Ví dụ: `0 0 * * *` (Hàng ngày), `0 0 * * 0` (Hàng tuần)

### 6. Phản Hồi
Truy cập **"Phản Hồi"** để:
- Gửi báo cáo lỗi hoặc đề xuất cải thiện
- Chọn loại phản hồi (Bug, Suggestion, Other)
- Theo dõi trạng thái phản hồi
- Nhận phản hồi từ admin qua email
- Đánh giá phản hồi (1-5 sao)

### 7. Admin Dashboard (Chỉ Admin)
Truy cập **"Quản lý người dùng"** từ menu sidebar (chỉ admin) để:
- **Xem thống kê:** 4 card (Tổng người dùng, Admin, User, Người dùng mới)
- **Xem biểu đồ:** 5 biểu đồ trực quan:
  - Line Chart: Hoạt động người dùng (7 ngày)
  - Pie Chart: Phân bố vai trò (Admin/User)
  - Bar Chart: Top 10 người dùng phản hồi
  - Pie Chart: Phản hồi theo loại
  - Bar Chart: Phản hồi theo trạng thái
- **Quản lý người dùng:** Tìm kiếm → Cập nhật vai trò → Xóa người dùng

### 8. Dashboard OCR
Xem các số liệu thống kê về hiệu suất xử lý OCR:
- 4 Summary Cards: Tổng Liên Kết, Tỷ Lệ Thành Công, HS Code, Tên Hàng
- 4 Biểu đồ trực quan: Tỷ lệ thành công, So sánh HS code, So sánh tên hàng, Xu hướng
- Bảng chi tiết thống kê theo tài liệu

### 9. Thu Thập Dữ Liệu Tự Động (Advanced Scraper)
Trên trang chủ, sử dụng form "Thu Thập Dữ Liệu Tự Động" để:
- Nhập khoảng thời gian: Chọn "Từ ngày" và "Đến ngày"
- Chọn số trang: Nhập số trang tối đa cần scrape (mặc định 10)
- Bắt đầu Scraping: Click nút "Bắt đầu Scraping"
- Xem kết quả: Hệ thống sẽ duyệt tất cả trang, trích xuất chi tiết, tải PDF, xử lý OCR, lưu dữ liệu

---

## Quản Lý Website

### Settings (Cài Đặt)
Truy cập **Settings** từ Management UI để:
- **General:** Cập nhật tên website, logo
- **Domains:** Thay đổi tên miền hoặc gắn domain tùy chỉnh
- **Notifications:** Cấu hình thông báo email
- **Secrets:** Quản lý biến môi trường (API keys, tokens)

### Dashboard
Xem thống kê sử dụng: lưu lượng truy cập (UV/PV), trạng thái website, lịch sử hoạt động

### Database
Quản lý dữ liệu trực tiếp: xem/chỉnh sửa tài liệu, lịch sử thu thập, lập lịch, dữ liệu trích xuất, kho OCR

---

## Tiếp Theo

**Nói chuyện với Manus AI bất cứ lúc nào để yêu cầu thay đổi hoặc thêm tính năng mới.**

Bắt đầu bằng cách tải lên tệp tài liệu hải quan để trích xuất HS code tự động, hoặc tra cứu HS code phổ biến để hiểu rõ hơn về hệ thống phân loại hàng hóa!

---

## Các Tính Năng Chính

✅ Thu thập dữ liệu tự động từ website Hải quan  
✅ Xử lý OCR: Trích xuất văn bản từ PDF, Word, ảnh  
✅ AI Analysis: Gợi ý HS code dựa trên tên hàng  
✅ Tra cứu HS code: Tìm kiếm theo mã hoặc tên hàng  
✅ Quản lý phản hồi: Gửi phản hồi, xem trạng thái  
✅ Admin Dashboard: Quản lý người dùng + biểu đồ thống kê  
✅ Lịch sử tệp: Xem lại tất cả tệp đã tải lên  
✅ Thanh tiến trình: Xem chi tiết tiến trình xử lý file  
✅ Dashboard OCR: Theo dõi hiệu suất xử lý OCR  
✅ Lập lịch tự động: Thu thập dữ liệu theo lịch trình  
✅ Advanced Scraper: Thu thập dữ liệu theo khoảng thời gian với Puppeteer


### 10. Quan Tri Lich Su Scraping (Chi Admin)
Tren Admin Dashboard, click tab "Lich Su Scraping" de:
- Xem danh sach tat ca cac lan scraping (thu cong + tu dong)
- Loc theo: Trang thai (running/completed/failed), Loai (manual/scheduled)
- Xem chi tiet: ID, Loai, Trang thai, Thoi gian, Tai lieu
- Quan li: Xem chi tiet, Xoa lan scraping
- Phan trang: Truoc/Tiep, chon so muc (10/20/50/100)

### 11. Thong Ke Scraping (Chi Admin)
Tren Admin Dashboard, click tab "Thong Ke Scraping" de:
- Xem 4 Summary Cards: Tong lan, Ty le thanh cong, Tai lieu, Lan that bai
- Xem 4 Bieu do:
  - Line Chart: Xu huong 7 ngay (Tong lan + Lan thanh cong)
  - Pie Chart: Phan bo loai (Thu cong vs Tu dong)
  - Bar Chart: Phan bo trang thai
  - Bar Chart: Thong ke tai lieu
- Xem bang thong ke chi tiet (6 chi so)


### 12. Xuat CSV Lich Su Scraping (Chi Admin)
Tren tab "Lich Su Scraping" trong Admin Dashboard:
- Chon cac hang: Click checkbox o dau hang hoac checkbox "Select All" o header
- Highlight: Cac hang duoc chon se co nen xanh nhat
- Xuat CSV: Click nut "Xuat CSV (X muc)" o Filters card
- File CSV: Duoc tai ve voi ten "scraping_history_[timestamp].csv"
- Cac cot CSV: ID, Loai, Trang thai, Thoi gian bat dau, Thoi gian ket thuc, Tai lieu tim, Tai lieu tai, Loi
- Bo chon: Click nut "Bo chon tat ca" de bo chon tat ca hang da chon


### 13. Retry & Progress Tracking (Cơ Chế Thử Lại & Theo Dõi Tiến Trình)
Khi bắt đầu scraping, ứng dụng sẽ hiển thị thanh tiến trình trực quan:

**Thanh Tiến Trình:**
- Hiển thị phần trăm hoàn thành (0-100%)
- Cập nhật mỗi 1 giây

**Thống Kê Trực Quan:**
- 4 thẻ thống kê: Tổng mục, Thành công, Thất bại, Tỷ lệ thành công (%)
- Thời gian chạy (duration)

**Mục Đang Xử Lý:**
- Hiển thị mục hiện tại đang scrape
- Công đoạn hiện tại: fetching (tải trang), parsing (phân tích), downloading (tải PDF), ocr (xử lý OCR)

**Danh Sách Lỗi Chi Tiết:**
- Hiển thị tất cả lỗi xảy ra
- Click vào lỗi để expand và xem chi tiết lỗi
- Hiển thị: Mục, Công đoạn, Số lần thử lại, Thời gian lỗi

**Cơ Chế Retry Tự Động:**
- Nếu scraping một mục bị lỗi timeout hoặc network error, ứng dụng sẽ tự động thử lại
- Tối đa 3 lần retry với delay tăng dần (1 giây → 2 giây → 4 giây)
- Nếu vẫn thất bại sau 3 lần, lỗi sẽ được ghi lại trong danh sách lỗi
- Scraping sẽ tiếp tục với mục tiếp theo (không dừng lại)

**Thông Báo Hoàn Thành:**
- Khi scraping hoàn thành, hiển thị thông báo "Scraping thành công!" với số mục thu thập được


### 14. Biểu Đồ Scraping (Chi Admin)
Trên Admin Dashboard, click tab "Biểu Đồ Scraping" để xem biểu đồ trực quan hóa dữ liệu scraping:

**4 Summary Cards:**
- Tổng Lần Scraping: Tổng số lần scraping đã thực hiện
- Thành Công: Số lần scraping thành công
- Tỷ Lệ Thành Công: Phần trăm lần scraping thành công
- Tổng Tài Liệu: Tổng số tài liệu được tìm thấy

**4 Biểu Đồ Trực Quan:**
1. **Line Chart - Xu Hướng 7 Ngày:** Hiển thị số lần scraping mỗi ngày (Tổng, Thành công, Thất bại)
2. **Pie Chart - Phân Bố Loại:** Phân bố giữa scraping thủ công (manual) và tự động (scheduled)
3. **Bar Chart - Phân Bố Trạng Thái:** Phân bố giữa thành công, thất bại, đang chạy
4. **Bar Chart - Thống Kê Tài Liệu:** So sánh số tài liệu tìm thấy, tải thành công, chờ xử lý

**Tính Năng:**
- Tất cả biểu đồ được cập nhật tự động từ dữ liệu scraping
- Dữ liệu được tính toán từ bảng scrapeLogs trong database
- Hữu ích để theo dõi hiệu suất scraping theo thời gian
