import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

export type DetailFieldKey =
  | "documentNumber"
  | "documentType"
  | "issuingAgency"
  | "issueDate"
  | "signer"
  | "title";

const DETAIL_FIELD_KEYS: readonly DetailFieldKey[] = [
  "documentNumber",
  "documentType",
  "issuingAgency",
  "issueDate",
  "signer",
  "title",
] as const;

function isDetailFieldKey(value: string): value is DetailFieldKey {
  return (DETAIL_FIELD_KEYS as readonly string[]).includes(value);
}

const DEFAULT_DETAIL_LABEL_MAP: Record<string, DetailFieldKey> = {
  "Số hiệu": "documentNumber",
  "Số ký hiệu": "documentNumber",
  "Loại văn bản": "documentType",
  "Cơ quan ban hành": "issuingAgency",
  "Đơn vị ban hành": "issuingAgency",
  "Ngày ban hành": "issueDate",
  "Ngày ký": "issueDate",
  "Người ký": "signer",
  "Trích yếu nội dung": "title",
  "Trích yêu nội dung": "title",
};

function normalizeLabelKey(label: string): string {
  return label.trim().replace(/[:：]\s*$/, "");
}

function loadExternalOverrides(): Record<string, DetailFieldKey> {
  const configPath = process.env.CUSTOMS_LABEL_MAP_PATH;
  if (!configPath) {
    return {};
  }

  const resolvedPath = path.isAbsolute(configPath)
    ? configPath
    : path.resolve(process.cwd(), configPath);

  if (!fs.existsSync(resolvedPath)) {
    console.warn(
      `[CustomsLabelMap] Không tìm thấy file cấu hình: ${resolvedPath}`
    );
    return {};
  }

  try {
    const rawContent = fs.readFileSync(resolvedPath, "utf8");
    if (!rawContent.trim()) {
      return {};
    }

    const parsed = parseLabelConfig(resolvedPath, rawContent);
    if (!parsed || typeof parsed !== "object") {
      console.warn(
        `[CustomsLabelMap] Cấu hình nhãn không hợp lệ tại ${resolvedPath}`
      );
      return {};
    }

    const overrides: Record<string, DetailFieldKey> = {};
    for (const [rawKey, rawValue] of Object.entries(parsed)) {
      if (typeof rawKey !== "string" || typeof rawValue !== "string") {
        continue;
      }

      if (!isDetailFieldKey(rawValue)) {
        console.warn(
          `[CustomsLabelMap] Giá trị nhãn không hợp lệ "${rawValue}" cho khóa "${rawKey}"`
        );
        continue;
      }

      const normalizedKey = normalizeLabelKey(rawKey);
      overrides[normalizedKey] = rawValue;
    }

    return overrides;
  } catch (error) {
    console.error(
      `[CustomsLabelMap] Lỗi khi đọc cấu hình nhãn tại ${resolvedPath}:`,
      error
    );
    return {};
  }
}

function parseLabelConfig(
  filePath: string,
  content: string
): Record<string, unknown> | undefined {
  const lowerPath = filePath.toLowerCase();
  if (lowerPath.endsWith(".yaml") || lowerPath.endsWith(".yml")) {
    return YAML.parse(content) as Record<string, unknown> | undefined;
  }

  return JSON.parse(content) as Record<string, unknown> | undefined;
}

function buildDetailLabelMap(): Readonly<Record<string, DetailFieldKey>> {
  return Object.freeze({
    ...DEFAULT_DETAIL_LABEL_MAP,
    ...loadExternalOverrides(),
  });
}

let detailLabelMap: Readonly<Record<string, DetailFieldKey>> =
  buildDetailLabelMap();

let reloadTimer: NodeJS.Timeout | undefined;

function readReloadIntervalFromEnv(): number | undefined {
  const raw = process.env.CUSTOMS_LABEL_MAP_RELOAD_INTERVAL_MS;
  if (!raw) {
    return undefined;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.warn(
      `[CustomsLabelMap] Giá trị CUSTOMS_LABEL_MAP_RELOAD_INTERVAL_MS không hợp lệ: ${raw}`
    );
    return undefined;
  }

  return parsed;
}

export function reloadDetailLabelMap(): Readonly<Record<string, DetailFieldKey>> {
  detailLabelMap = buildDetailLabelMap();
  return detailLabelMap;
}

export function startDetailLabelMapReloader(
  intervalMs: number
): void {
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    console.warn(
      `[CustomsLabelMap] Khoảng thời gian reload không hợp lệ: ${intervalMs}`
    );
    return;
  }

  if (reloadTimer) {
    clearInterval(reloadTimer);
  }

  reloadTimer = setInterval(() => {
    try {
      reloadDetailLabelMap();
    } catch (error) {
      console.error("[CustomsLabelMap] Lỗi khi reload cấu hình nhãn:", error);
    }
  }, intervalMs);

  if (typeof reloadTimer.unref === "function") {
    reloadTimer.unref();
  }
}

export function stopDetailLabelMapReloader(): void {
  if (reloadTimer) {
    clearInterval(reloadTimer);
    reloadTimer = undefined;
  }
}

const autoReloadInterval = readReloadIntervalFromEnv();
if (autoReloadInterval !== undefined) {
  startDetailLabelMapReloader(autoReloadInterval);
}

export function normalizeDetailLabel(label: string): DetailFieldKey | undefined {
  const normalized = normalizeLabelKey(label);
  return detailLabelMap[normalized];
}

export function getDetailLabelMap(): Readonly<Record<string, DetailFieldKey>> {
  return detailLabelMap;
}
