import "dotenv/config";
import { Worker } from "bullmq";
import { ensureRedisReady, getRedisConnection, shutdownRedis } from "../../queues/redis-connection";
import { OcrJobPayload } from "../../queues/ocr-queue";
import { processOcrDocument } from "../../services/process-ocr-document";

async function bootstrap() {
  const ready = await ensureRedisReady();
  if (!ready) {
    console.error("[OCR Worker] Không thể kết nối Redis. Kiểm tra REDIS_URL.");
    process.exit(1);
  }

  const connection = getRedisConnection();
  if (!connection) {
    console.error("[OCR Worker] Chưa cấu hình REDIS_URL, worker sẽ thoát.");
    process.exit(1);
  }

  const concurrency = Number.parseInt(process.env.OCR_WORKER_CONCURRENCY ?? "2", 10) || 2;

  const worker = new Worker<OcrJobPayload>(
    "queue:ocr",
    async (job) => {
      const result = await processOcrDocument(job.data);
      if (!result.success) {
        throw new Error(result.error ?? "OCR job failed");
      }
      return result;
    },
    {
      connection,
      concurrency,
    },
  );

  worker.on("completed", (job) => {
    console.log(`💡 [OCR Worker] Hoàn thành job ${job.id} cho tài liệu ${job.data.documentId}`);
  });

  worker.on("failed", (job, error) => {
    console.error(`⚠️ [OCR Worker] Job ${job?.id} thất bại:`, error);
  });

  const shutdown = async () => {
    console.log("[OCR Worker] Đang dừng...");
    await worker.close();
    await shutdownRedis();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((error) => {
  console.error("[OCR Worker] Lỗi khởi tạo:", error);
  process.exit(1);
});
