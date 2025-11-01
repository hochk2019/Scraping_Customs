import IORedis from "ioredis";
import { ENV } from "../_core/env";

let sharedConnection: IORedis | null = null;

function resolveRedisUrl(): string {
  const url = ENV.redisUrl || process.env.BULLMQ_REDIS_URL || "";
  return url.trim();
}

export function getRedisConnection(): IORedis | null {
  if (sharedConnection) {
    return sharedConnection;
  }

  const redisUrl = resolveRedisUrl();
  if (!redisUrl) {
    return null;
  }

  sharedConnection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });

  return sharedConnection;
}

export async function ensureRedisReady(): Promise<boolean> {
  const connection = getRedisConnection();
  if (!connection) {
    return false;
  }

  if (connection.status === "ready") {
    return true;
  }

  try {
    await connection.connect();
    return true;
  } catch (error) {
    console.error("[Queue] Không thể kết nối Redis:", error);
    return false;
  }
}

export async function shutdownRedis(): Promise<void> {
  if (!sharedConnection) {
    return;
  }

  try {
    await sharedConnection.quit();
  } catch (error) {
    console.warn("[Queue] Lỗi khi đóng kết nối Redis:", error);
  } finally {
    sharedConnection = null;
  }
}
