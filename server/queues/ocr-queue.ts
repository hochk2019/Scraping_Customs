import { Queue, QueueScheduler, JobsOptions } from "bullmq";
import { randomUUID } from "crypto";
import { ensureRedisReady, getRedisConnection } from "./redis-connection";
import { processOcrDocument } from "../services/process-ocr-document";
import { recordQueueJobStart } from "../db";

export interface OcrJobPayload {
  documentId: number;
  fileName: string;
  fileUrl: string;
  rawText?: string;
  jobId?: string;
}

type EnqueueResult =
  | { status: "queued"; jobId: string }
  | { status: "processed"; jobId: string; result: Awaited<ReturnType<typeof processOcrDocument>> };

const QUEUE_NAME = "queue:ocr";
let queue: Queue<OcrJobPayload> | null = null;
let scheduler: QueueScheduler | null = null;

const defaultJobOptions: JobsOptions = {
  removeOnComplete: 100,
  removeOnFail: 1000,
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 30_000,
  },
};

function shouldUseQueue(): boolean {
  return Boolean(getRedisConnection());
}

async function ensureQueue(): Promise<Queue<OcrJobPayload> | null> {
  if (!shouldUseQueue()) {
    return null;
  }

  if (!queue) {
    const ready = await ensureRedisReady();
    if (!ready) {
      return null;
    }

    const connection = getRedisConnection();
    if (!connection) {
      return null;
    }

    queue = new Queue<OcrJobPayload>(QUEUE_NAME, {
      connection,
      defaultJobOptions,
    });

    scheduler = new QueueScheduler(QUEUE_NAME, { connection });
    // Thực hiện kết nối scheduler ở nền, log lỗi nếu có
    scheduler.waitUntilReady().catch((error) => {
      console.error("[Queue] Không thể khởi tạo QueueScheduler:", error);
    });
  }

  return queue;
}

export async function enqueueOcrJob(payload: OcrJobPayload): Promise<EnqueueResult> {
  const resolvedPayload = {
    ...payload,
    jobId: payload.jobId ?? randomUUID(),
  } satisfies OcrJobPayload;

  const activeQueue = await ensureQueue();

  if (!activeQueue) {
    const result = await processOcrDocument(resolvedPayload);
    return { status: "processed", jobId: resolvedPayload.jobId!, result };
  }

  await recordQueueJobStart({
    jobId: resolvedPayload.jobId!,
    documentId: resolvedPayload.documentId,
    type: "ocr",
    payload: JSON.stringify({
      documentId: resolvedPayload.documentId,
      fileName: resolvedPayload.fileName,
      fileUrl: resolvedPayload.fileUrl,
    }),
    status: "pending",
  });

  const job = await activeQueue.add("ocr", resolvedPayload, {
    ...defaultJobOptions,
    jobId: resolvedPayload.jobId,
  });
  return { status: "queued", jobId: job.id as string };
}

export async function shutdownOcrQueue(): Promise<void> {
  await Promise.all([queue?.close(), scheduler?.close()].filter(Boolean) as Array<Promise<void>>);
  queue = null;
  scheduler = null;
}
