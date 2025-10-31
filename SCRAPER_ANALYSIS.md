# Phân tích Cấu trúc Website Hải quan Việt Nam

## URL và Cấu trúc

### Trang danh sách (Search Results)
- **URL**: `https://www.customs.gov.vn/index.jsp?pageId=8&cid=1294&LinhVuc=313`
- **Mục đích**: Hiển thị danh sách các kết quả phân tích phân loại hàng hóa
- **Tham số**:
  - `pageId=8`: Trang tìm kiếm văn bản
  - `cid=1294`: Danh mục "Mã số, Phân tích phân loại hàng hóa"
  - `LinhVuc=313`: Lĩnh vực cụ thể

### Trang chi tiết (Document Details)
- **URL**: `https://www.customs.gov.vn/index.jsp?pageId=3&id={DOCUMENT_ID}&cid=1294`
- **Ví dụ**: `https://www.customs.gov.vn/index.jsp?pageId=3&id=101580&cid=1294`
- **Tham số**:
  - `pageId=3`: Trang chi tiết văn bản
  - `id={DOCUMENT_ID}`: ID của văn bản cần xem
  - `cid=1294`: Danh mục

## Cấu trúc Dữ liệu trên Trang Danh sách

### Bảng kết quả tìm kiếm
Các cột trong bảng:
1. **Số/Ký hiệu** (Số hiệu): Ví dụ: `32168/TB-CHQ`, `29001/TB-CHQ`
2. **Cơ quan ban hành**: Ví dụ: `Cục Hải quan`
3. **Ngày ban hành**: Ví dụ: `28/10/2025`, `13/10/2025`
4. **Nội dung tóm tắt**: Mô tả ngắn gọn nội dung

### Phân trang
- Hiển thị 100 kết quả mỗi trang
- Các nút điều hướng: Trang đầu, <<, 1, 2, 3, ..., >>, Trang cuối

## Cấu trúc Dữ liệu trên Trang Chi tiết

### Thông tin chính
- **Số hiệu**: Ví dụ: `29001/TB-CHQ`
- **Trích yêu nội dung**: Mô tả chi tiết
- **Loại văn bản**: Ví dụ: `Thông báo`
- **Cơ quan ban hành**: Ví dụ: `Cục Hải quan`
- **Ngày ban hành**: Ví dụ: `13/10/2025`
- **Người ký**: Ví dụ: `Đào Thu Hương`

### Liên kết tải tệp
- **Mục**: "Tải tệp nội dung toàn văn"
- **Định dạng**: PDF
- **Liên kết**: Được hiển thị dưới dạng liên kết có thể click
- **URL tệp**: `https://files.customs.gov.vn//CustomsCMS/TONG_CUC/2025/10/14/2.VBDI_29001.pdf`
- **Cấu trúc URL**: `https://files.customs.gov.vn//CustomsCMS/{FOLDER}/{YEAR}/{MONTH}/{DAY}/{FILENAME}.pdf`

### Phần "Văn bản liên quan"
- Hiển thị các văn bản liên quan khác
- Có nút "Bản In" và "Lưu file"

## Quy trình Thu thập Dữ liệu

### Bước 1: Truy cập trang danh sách
1. Truy cập URL: `https://www.customs.gov.vn/index.jsp?pageId=8&cid=1294&LinhVuc=313`
2. Lấy danh sách các kết quả phân tích phân loại

### Bước 2: Lặp qua từng kết quả
1. Trích xuất **Số hiệu** từ bảng
2. Xây dựng URL chi tiết: `https://www.customs.gov.vn/index.jsp?pageId=3&id={DOCUMENT_ID}&cid=1294`
3. Truy cập trang chi tiết

### Bước 3: Thu thập thông tin từ trang chi tiết
1. Trích xuất các thông tin: số hiệu, ngày ban hành, cơ quan ban hành, v.v.
2. Tìm liên kết tải tệp trong mục "Tải tệp nội dung toàn văn"
3. Lưu URL tệp PDF

### Bước 4: Lưu vào cơ sở dữ liệu
1. Lưu thông tin văn bản
2. Lưu liên kết tải tệp
3. Ghi lại thời gian thu thập

## Thách thức và Giải pháp

### Thách thức 1: Tìm Document ID
- **Vấn đề**: Document ID không hiển thị trực tiếp trên trang danh sách
- **Giải pháp**: Sử dụng Selenium/Puppeteer để click vào từng kết quả và trích xuất ID từ URL

### Thách thức 2: Phân trang
- **Vấn đề**: Cần duyệt qua nhiều trang
- **Giải pháp**: Tự động click nút "Trang tiếp theo" hoặc sử dụng tham số URL để điều hướng

### Thách thức 3: Tốc độ
- **Vấn đề**: Mỗi trang cần thời gian để tải
- **Giải pháp**: Sử dụng lập lịch để chạy thu thập vào thời gian không cao điểm

## Công nghệ Khuyến nghị

- **Scraper**: Puppeteer (Node.js) hoặc Playwright
- **Database**: MySQL (đã có trong dự án)
- **Lập lịch**: Node-cron hoặc Bull Queue
- **API**: Express.js (đã có trong dự án)

## Ghi chú Quan trọng

1. Website sử dụng JavaScript để render, nên cần browser automation
2. Liên kết tệp PDF nằm trong thẻ `<a>` với href chứa đường dẫn đầy đủ
3. Cần xử lý CAPTCHA nếu có quá nhiều request
4. Nên thêm delay giữa các request để tránh bị chặn
