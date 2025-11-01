# Thiết kế kiến trúc hàng đợi OCR/AI

Tài liệu này mô tả cách triển khai lớp hàng đợi bất đồng bộ cho các tác vụ OCR và AI gợi ý mã HS trong hệ thống Customs Scraper. Thiết kế ưu tiên khả năng mở rộng, độ tin cậy và tính quan sát, đồng thời tận dụng các thành phần hiện có trong thư mục `server/`.

## Tổng quan thành phần

| Thành phần | Vai trò chính | Ghi chú triển khai |
| --- | --- | --- |
| **Express API (server/routers.ts)** | Nhận yêu cầu tải tài liệu, gợi ý HS, cập nhật trạng thái | Bổ sung middleware chuyển tác vụ tốn thời gian vào hàng đợi thay vì xử lý trực tiếp |
| **Redis + BullMQ** | Hàng đợi phân tán quản lý job `scrape`, `ocr`, `aiRecommendation` | Redis Cluster (2 shard + 1 replica) hoặc Redis Enterprise Cloud. Sử dụng BullMQ Queue + QueueScheduler + Worker |
| **Workers (server/scripts/jobs/...)** | Xử lý job OCR/AI theo hàng đợi, giao tiếp với dịch vụ OCR/AI bên ngoài | Mỗi worker là tiến trình Node.js riêng, scale theo số core. Dùng `BullMQ Worker` với concurrency cấu hình |
| **OCR Service (server/ocr-processor.ts)** | Gọi pipeline OCR (Tesseract/Azure/Google Vision) | Chuyển sang gọi async, retry qua BullMQ, ghi log chi tiết |
| **AI Suggestion Service (server/product-keyword-service.ts, future module)** | Tính embedding, gợi ý HS code | Thực thi trong worker, cache embedding trong Redis + Postgres vector |
| **Postgres/Drizzle** | Lưu trạng thái job, tài liệu, kết quả | Thêm bảng `scrapeJobs`, `ocrJobs`, `aiJobs`, `document_embeddings` |
| **Prometheus Exporter** | Thu thập metric job | Expose endpoint `/metrics` từ worker & API |
| **Grafana Dashboard** | Quan sát | Dashboard realtime số job thành công, thời gian trung bình, tỉ lệ lỗi |

## Luồng dữ liệu chính

```mermaid
sequenceDiagram
    participant Client as Client Web
    participant API as Express API
    participant Redis as Redis/BullMQ
    participant Worker as OCR/AI Worker
    participant OCR as OCR Engine
    participant AI as AI Service
    participant DB as Postgres

    Client->>API: Upload tài liệu / yêu cầu gợi ý HS
    API->>DB: Ghi metadata tài liệu (status = pending)
    API->>Redis: Tạo job OCR (payload: documentId)
    Redis-->>API: Xác nhận jobId
    API-->>Client: 202 Accepted + jobId

    Redis->>Worker: Giao job OCR
    Worker->>OCR: Gọi OCR pipeline
    OCR-->>Worker: Kết quả text + log
    Worker->>DB: Cập nhật `ocrJobs` (status, duration)
    Worker->>Redis: Tạo job AI Recommendation (payload: documentId, text)

    Redis->>Worker: Giao job AI Recommendation
    Worker->>AI: Tính embedding + gợi ý HS
    AI-->>Worker: Danh sách gợi ý + score
    Worker->>DB: Lưu `aiJobs`, cập nhật `documents`
    Worker->>Redis: Phát sự kiện cập nhật tiến độ (BullMQ Events)
    API->>Client: Đẩy realtime qua WebSocket/SSE
```

## Sơ đồ lưu đồ dữ liệu

```mermaid
flowchart LR
    subgraph Ingress
        A[Client Upload/Request]
    end
    A --> B[Express API Layer]
    B -->|Metadata| DB[(Postgres)]
    B -->|Job enqueue| Q[Redis Queue]
    Q --> W1[OCR Worker]
    W1 --> OCR[(OCR Service)]
    OCR --> W1
    W1 -->|Kết quả OCR| DB
    W1 -->|Tạo job AI| Q2[Redis Queue]
    Q2 --> W2[AI Worker]
    W2 --> AI[(Embedding/LLM)]
    W2 -->|Gợi ý HS| DB
    DB --> Obs[Prometheus Exporter]
    Obs --> Grafana
    DB --> APIRealtime[Realtime Gateway]
    APIRealtime --> ClientRealtime[WebSocket/SSE Client]
```

## Chi tiết các bảng mới

- `scrapeJobs`
  - `id`, `documentId`, `type` (`scrape|ocr|ai`), `payload`, `status`, `retryCount`, `errorMessage`, `startedAt`, `completedAt`.
- `ocrJobs`
  - `id`, `documentId`, `engine`, `durationMs`, `confidence`, `status`, `logs`.
- `aiJobs`
  - `id`, `documentId`, `model`, `suggestions`, `confidence`, `status`, `createdAt`.
- `document_embeddings`
  - `documentId`, `embedding_vector`, `model`, `version`, `updatedAt`.

## Quy ước triển khai

1. **Queue naming**: `queue:ocr`, `queue:ai`, `queue:scrape`. Channel sự kiện progress: `events:job-status`.
2. **Retry & Backoff**: OCR tối đa 3 lần (delay tăng dần 30s, 2m, 5m). AI tối đa 2 lần.
3. **Timeout**: OCR job 6 phút, AI job 2 phút.
4. **Observability**: log theo cấu trúc JSON (`pino`). Metric Prometheus: `queue_job_duration_seconds`, `queue_job_failures_total`, `queue_job_active`.
5. **Bảo mật**: Redis bảo vệ TLS, worker đọc secret từ Vault/ENV. Payload job chỉ chứa ID thay vì toàn dữ liệu để giảm rủi ro.

## Checklist triển khai

- [ ] Cấu hình Redis & BullMQ trong `server/_core/queue.ts`.
- [ ] Tạo worker riêng cho OCR (`server/scripts/workers/ocr-worker.ts`).
- [ ] Refactor router upload (`server/scraper-router.ts`) để enqueue job.
- [ ] Bổ sung migration bảng job trong thư mục `drizzle/`.
- [ ] Xuất metric Prometheus từ worker (`/metrics`).
- [ ] Viết test integration (Vitest + Testcontainers) mô phỏng Redis.

