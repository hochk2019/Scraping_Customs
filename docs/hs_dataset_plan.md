# Kế hoạch thu thập dữ liệu gán nhãn HS (>= 500 bản ghi)

Mục tiêu: xây dựng bộ dữ liệu chất lượng cao phục vụ huấn luyện và đánh giá mô-đun gợi ý HS code. Bộ dữ liệu tối thiểu 500 bản ghi, đa dạng theo ngành hàng và cơ quan ban hành.

## 1. Cấu trúc dữ liệu đề xuất

| Trường | Kiểu | Mô tả |
| --- | --- | --- |
| `id` | UUID | Định danh duy nhất |
| `documentTitle` | text | Tên công văn/biên bản |
| `issuingAuthority` | enum | Tổng cục Hải quan, Bộ Công thương, Cục Kiểm dịch... |
| `issuedDate` | date | Ngày ban hành |
| `documentType` | enum | Công văn, thông báo, quyết định... |
| `excerpt` | text | Đoạn nội dung liên quan tới phân loại |
| `hsCode` | varchar(10) | Mã HS chuẩn (6-10 ký tự) |
| `hsConfidence` | numeric | Độ tin cậy (0-1) |
| `notes` | text | Ghi chú chuyên gia |
| `sourceUrl` | text | Liên kết tài liệu gốc |
| `attachmentPath` | text | Đường dẫn file OCR/scan |
| `labelerId` | uuid | Người gán nhãn |
| `reviewerId` | uuid | Người kiểm duyệt |
| `status` | enum | `draft`, `reviewed`, `approved` |

## 2. Nguồn dữ liệu

1. **Kho công văn nội bộ**: trích xuất từ `server/scraping-history-router.ts` & `sample-data.json`.
2. **Cổng thông tin Hải quan**: sử dụng scraper hiện có (`server/customs-scraper.ts`) thu thập thêm tài liệu năm 2023-2024.
3. **Nguồn mở (Bộ Công Thương, Bộ NN&PTNT)**: thu thập các quyết định phân loại.
4. **Phản hồi người dùng**: tận dụng `userFeedback` làm nguồn bổ sung.

## 3. Quy trình gán nhãn

1. **Chuẩn bị dữ liệu**
   - Làm sạch OCR (loại bỏ ký tự lạ, chuẩn hóa Unicode NFC để tránh lỗi hiển thị tiếng Việt).
   - Tách đoạn nội dung liên quan bằng regex/heuristic (ưu tiên mục “Kết luận”).
2. **Gán nhãn sơ cấp**
   - 2 chuyên viên thương mại quốc tế gán HS code và ghi chú.
   - Sử dụng guideline chung (Biểu thuế xuất nhập khẩu 2024).
3. **Rà soát & phê duyệt**
   - 1 chuyên gia cấp cao review, cập nhật `hsConfidence`.
   - Nếu có bất đồng -> phiên họp định kỳ để thống nhất.
4. **Đảm bảo chất lượng**
   - Kiểm tra chéo 10% mẫu bằng script (so sánh với lịch sử HS tương tự).
   - Tạo rule validation trong Drizzle migration (`CHECK (length(hsCode) >= 6)`).

## 4. Lộ trình thực hiện

| Tuần | Công việc | Sản phẩm |
| --- | --- | --- |
| Tuần 1 | Tổng hợp tài liệu từ kho nội bộ, chuẩn hóa định dạng | 200 bản ghi ở trạng thái `draft` |
| Tuần 2 | Hoàn tất OCR + gán nhãn sơ cấp | +150 bản ghi `reviewed` |
| Tuần 3 | Review & phê duyệt, bổ sung dữ liệu từ nguồn ngoài | +100 bản ghi `approved` |
| Tuần 4 | Kiểm thử, thống nhất guideline, bổ sung dữ liệu thiếu ngành | Đủ 500 bản ghi, báo cáo chất lượng |

## 5. Công cụ hỗ trợ

- **Label Studio** hoặc **Doccano** với hỗ trợ tiếng Việt.
- Script chuẩn hóa Unicode (Node.js `unorm` hoặc `Intl`).
- Dashboard theo dõi tiến độ (tận dụng bảng `scrapeJobs` + `aiJobs`).

## 6. Deliverables

- `datasets/hs_labeled_records.csv` (ẩn thông tin nhạy cảm).
- Báo cáo chất lượng (`docs/reports/hs_dataset_quality.md`).
- Checklist kiểm thử dữ liệu (null check, trùng mã, phân bố ngành hàng).

