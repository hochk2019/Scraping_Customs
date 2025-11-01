import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";

const SAMPLE_TEXT = "Mã HS 6204.62.20 áp dụng cho áo khoác dệt kim xuất khẩu.";

const addMock = vi.fn(async (_name: string, _payload: unknown, options?: any) => ({
  id: options?.jobId ?? "job-mock",
}));
const closeMock = vi.fn(() => Promise.resolve());
const ensureReadyMock = vi.fn(async () => Boolean(process.env.REDIS_URL));
const shutdownRedisMock = vi.fn(async () => {});
let connection: Record<string, unknown> | null = null;
const getRedisConnectionMock = vi.fn(() => {
  if (!process.env.REDIS_URL) {
    connection = null;
    return null;
  }
  if (!connection) {
    connection = {};
  }
  return connection;
});

vi.mock("bullmq", () => {
  class Queue {
    add = addMock;
    close = closeMock;
    constructor() {}
  }
  class QueueScheduler {
    constructor() {}
    waitUntilReady() {
      return Promise.resolve();
    }
    close() {
      return Promise.resolve();
    }
  }
  return { Queue, QueueScheduler };
});

vi.mock("../queues/redis-connection", () => ({
  ensureRedisReady: ensureReadyMock,
  getRedisConnection: getRedisConnectionMock,
  shutdownRedis: shutdownRedisMock,
}));

describe("enqueueOcrJob", () => {
  beforeEach(() => {
    vi.resetModules();
    addMock.mockClear();
    closeMock.mockClear();
    ensureReadyMock.mockClear();
    shutdownRedisMock.mockClear();
    getRedisConnectionMock.mockClear();
    connection = null;
    delete process.env.REDIS_URL;
  });

  afterEach(async () => {
    const { shutdownOcrQueue } = await import("../queues/ocr-queue");
    await shutdownOcrQueue();
    addMock.mockClear();
    delete process.env.REDIS_URL;
  });

  it("xử lý nội tuyến khi chưa cấu hình Redis", async () => {
    const { enqueueOcrJob } = await import("../queues/ocr-queue");

    const result = await enqueueOcrJob({
      documentId: 101,
      fileName: "test.pdf",
      fileUrl: "https://example.com/test.pdf",
      rawText: SAMPLE_TEXT,
    });

    expect(result.status).toBe("processed");
    expect(result.result.success).toBe(true);
    expect(result.result.hsCodes).toContain("6204.62.20");
    expect(result.result.productNames.some((item) => item.toLowerCase().includes("áo"))).toBe(true);
    expect(result.result.jobId).toBeTruthy();
    expect(addMock).not.toHaveBeenCalled();
  });

  it("đưa job vào hàng đợi khi Redis sẵn sàng", async () => {
    process.env.REDIS_URL = "redis://mock";
    ensureReadyMock.mockResolvedValueOnce(true);

    const dbModule = await import("../db");
    const startSpy = vi.spyOn(dbModule, "recordQueueJobStart");

    const { enqueueOcrJob } = await import("../queues/ocr-queue");

    const result = await enqueueOcrJob({
      documentId: 202,
      fileName: "queued.pdf",
      fileUrl: "https://example.com/queued.pdf",
      rawText: SAMPLE_TEXT,
    });

    expect(result.status).toBe("queued");
    expect(addMock).toHaveBeenCalledTimes(1);
    const options = addMock.mock.calls[0]?.[2];
    expect(options?.jobId).toBeDefined();
    expect(startSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending", type: "ocr" })
    );

    startSpy.mockRestore();
  });
});
