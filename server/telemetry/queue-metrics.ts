import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from "prom-client";

const registry = new Registry();
collectDefaultMetrics({ register: registry });

const durationHistogram = new Histogram({
  name: "queue_job_duration_seconds",
  help: "Phân phối thời gian xử lý job BullMQ",
  buckets: [0.5, 1, 2, 5, 10, 30, 60, 120, 300],
  labelNames: ["type"],
  registers: [registry],
});

const failureCounter = new Counter({
  name: "queue_job_failures_total",
  help: "Số lượng job thất bại",
  labelNames: ["type"],
  registers: [registry],
});

const activeGauge = new Gauge({
  name: "queue_job_active",
  help: "Số job đang xử lý",
  labelNames: ["type"],
  registers: [registry],
});

export function markJobActive(type: string): void {
  activeGauge.inc({ type });
}

export function markJobCompleted(type: string, durationMs: number): void {
  activeGauge.dec({ type });
  durationHistogram.observe({ type }, durationMs / 1000);
}

export function markJobFailed(type: string): void {
  activeGauge.dec({ type });
  failureCounter.inc({ type });
}

export function getMetricsRegistry(): Registry {
  return registry;
}
