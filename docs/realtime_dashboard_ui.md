# Thiết kế UI Dashboard thời gian thực

Tài liệu này mô tả wireframe, thành phần và cải tiến UX cho dashboard realtime hiển thị tiến độ job OCR/AI, cảnh báo và thống kê.

## 1. Nguyên tắc thiết kế

1. **Realtime rõ ràng**: trạng thái job cập nhật tối đa mỗi 2s, hiển thị timestamp và badge trạng thái (success, processing, failed).
2. **Ưu tiên mobile-first**: bố cục 1 cột trên màn hình < 768px, sử dụng bottom navigation để truy cập nhanh phần Logs, Thống kê, Cảnh báo.
3. **Khả năng truy vết**: mọi card job có link tới log chi tiết và file nguồn.
4. **Khả năng truy cập**: màu sắc đạt contrast ratio >= 4.5:1, hỗ trợ keyboard navigation và screen reader (ARIA live region cho cập nhật realtime).

## 2. Wireframe tổng quát

```
+---------------------------------------------------------------------------------+
| Header: Customs Scraper Dashboard [Filter thời gian] [Cài đặt cảnh báo]         |
+---------------------------------------------------------------------------------+
| Row 1:                                                                          |
|  [Live KPI Cards - Grid 2x2]                                                    |
|    - Tổng job hôm nay       - Job thất bại      - Thời gian OCR TB  - Độ trễ hàng đợi |
+---------------------------------------------------------------------------------+
| Row 2 (Desktop 2 cột / Mobile accordion):                                       |
|  [Biểu đồ đường: Job theo giờ]      [Heatmap trạng thái theo hàng đợi]          |
+---------------------------------------------------------------------------------+
| Row 3:                                                                          |
|  [Realtime Job Stream]                                                          |
|   - List item có avatar dịch vụ, tên tài liệu, trạng thái, tiến độ %, thời gian |
|   - Icon cảnh báo nếu retry > 1                                                 |
+---------------------------------------------------------------------------------+
| Row 4:                                                                          |
|  [Bảng log gần nhất] [Cảnh báo hệ thống]                                        |
+---------------------------------------------------------------------------------+
```

## 3. Component Specification

| Component | Mô tả | API/Props | Ghi chú |
| --- | --- | --- | --- |
| `DashboardHeader` | Hiển thị tiêu đề, bộ lọc thời gian, nút cấu hình | `range`, `onRangeChange`, `onOpenAlertConfig` | Dùng `Popover` cho bộ lọc ngày |
| `LiveKpiCard` | Card KPI realtime | `title`, `value`, `delta`, `trend` | Hỗ trợ sparkline mini (Recharts) |
| `JobTrendChart` | Biểu đồ đường job theo giờ | `series`, `loading` | Sử dụng SSE để cập nhật điểm mới |
| `QueueHeatmap` | Heatmap trạng thái hàng đợi | `matrix`, `queues` | Tailwind grid + d3-scale |
| `RealtimeJobStream` | Danh sách job realtime | `jobs`, `onSelectJob` | Ảnh đại diện theo loại job, highlight job đang xem |
| `JobDetailDrawer` | Chi tiết job + log | `jobId`, `open`, `onClose` | Hiển thị log (ansi-to-html), tab `Kết quả OCR` |
| `AlertPanel` | Danh sách cảnh báo & SLA | `alerts`, `onAcknowledge` | Tích hợp Slack/Email |
| `BottomNavigation` (mobile) | Điều hướng nhanh | `items`, `activeKey`, `onSelect` | Hiển thị badge cảnh báo |

## 4. Trạng thái realtime & WebSocket

- Sử dụng hook `useRealtimeJobStream` wrap quanh `Socket.IO` hoặc `SSE`.
- `ScraperStatusCard`, `UploadHistory`, `LinkProcessingPanel` subscribe kênh `job-status`.
- Giao thức payload:

```json
{
  "jobId": "ocr-123",
  "type": "ocr",
  "status": "processing",
  "progress": 45,
  "documentId": "doc-789",
  "updatedAt": "2025-04-01T08:30:12Z",
  "metrics": {
    "queueWaitMs": 1200,
    "executionMs": 5400
  }
}
```

- Khi `status = completed`, client tự động refetch dữ liệu chi tiết qua `trpc.job.getDetail`.

## 5. Đề xuất cải tiến UI/UX

1. **Chế độ tối**: tự động đồng bộ chế độ tối của hệ điều hành.
2. **Widget tùy chỉnh**: cho phép người dùng pin card KPI quan trọng.
3. **Lọc nâng cao**: filter theo loại job, trạng thái, worker.
4. **Cảnh báo chủ động**: banner hiển thị khi Redis queue backlog > ngưỡng.
5. **Quick action**: nút retry job thất bại trực tiếp từ danh sách.

## 6. Kiểm thử đề xuất

- Viết test Playwright: mô phỏng job mới, kiểm tra danh sách cập nhật trong 2s.
- Unit test component Recharts với snapshot (dùng `@testing-library/react`).
- Kiểm tra Lighthouse PWA (mobile) đạt > 85 điểm hiệu suất.

