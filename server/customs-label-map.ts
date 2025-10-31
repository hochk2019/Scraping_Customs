import fs from "node:fs";
import path from "node:path";
import type { FSWatcher } from "node:fs";
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

let lastResolvedConfigPath: string | undefined;

function loadExternalOverrides(): Record<string, DetailFieldKey> {
  const configPath = process.env.CUSTOMS_LABEL_MAP_PATH;
  if (!configPath) {
    lastResolvedConfigPath = undefined;
    return {};
  }

  const resolvedPath = path.isAbsolute(configPath)
    ? configPath
    : path.resolve(process.cwd(), configPath);

  lastResolvedConfigPath = resolvedPath;

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
let fileWatcher: FSWatcher | undefined;
let dirWatcher: FSWatcher | undefined;
let watcherDebounce: NodeJS.Timeout | undefined;
let currentWatchedPath: string | undefined;

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
  autoStartDetailLabelMapWatcher();
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

function clearWatcherDebounce(): void {
  if (watcherDebounce) {
    clearTimeout(watcherDebounce);
    watcherDebounce = undefined;
  }
}

function handleWatcherChange(): void {
  if (watcherDebounce) {
    return;
  }

  watcherDebounce = setTimeout(() => {
    watcherDebounce = undefined;
    try {
      reloadDetailLabelMap();
    } catch (error) {
      console.error(
        "[CustomsLabelMap] Lỗi khi reload cấu hình nhãn qua watcher:",
        error
      );
    }
  }, 50);

  const timer = watcherDebounce as NodeJS.Timeout | undefined;
  if (timer && typeof timer.unref === "function") {
    timer.unref();
  }
}

function attachDirectoryWatcher(targetPath: string): boolean {
  const dirPath = path.dirname(targetPath);

  try {
    dirWatcher = fs.watch(
      dirPath,
      { persistent: false },
      (eventType, filename) => {
        if (!filename) {
          handleWatcherChange();
          return;
        }

        const normalized = path.resolve(dirPath, filename.toString());
        if (normalized === targetPath) {
          handleWatcherChange();
        }
      }
    );

    if (typeof dirWatcher.unref === "function") {
      dirWatcher.unref();
    }

    return true;
  } catch (error) {
    console.error(
      `[CustomsLabelMap] Không thể theo dõi thư mục chứa cấu hình tại ${dirPath}:`,
      error
    );

    return false;
  }
}

function attachFileWatcher(targetPath: string): boolean {
  try {
    fileWatcher = fs.watch(targetPath, { persistent: false }, () => {
      handleWatcherChange();
    });

    if (typeof fileWatcher.unref === "function") {
      fileWatcher.unref();
    }

    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code !== "ENOENT") {
      console.error(
        `[CustomsLabelMap] Không thể theo dõi file cấu hình tại ${targetPath}:`,
        error
      );
    }

    return false;
  }
}

export function startDetailLabelMapWatcher(targetPath?: string): void {
  const resolved = targetPath ?? lastResolvedConfigPath;
  if (!resolved) {
    console.warn(
      "[CustomsLabelMap] Không thể khởi động watcher vì thiếu đường dẫn cấu hình"
    );
    return;
  }

  stopDetailLabelMapWatcher();

  let attached = attachDirectoryWatcher(resolved);

  if (fs.existsSync(resolved)) {
    attached = attachFileWatcher(resolved) || attached;
  }

  if (attached) {
    currentWatchedPath = resolved;
  } else {
    currentWatchedPath = undefined;
  }
}

export function stopDetailLabelMapWatcher(): void {
  clearWatcherDebounce();

  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = undefined;
  }

  if (dirWatcher) {
    dirWatcher.close();
    dirWatcher = undefined;
  }

  currentWatchedPath = undefined;
}

function autoStartDetailLabelMapWatcher(): void {
  if (!lastResolvedConfigPath) {
    stopDetailLabelMapWatcher();
    return;
  }

  if (currentWatchedPath !== lastResolvedConfigPath) {
    startDetailLabelMapWatcher(lastResolvedConfigPath);
  }
}

autoStartDetailLabelMapWatcher();

export function normalizeDetailLabel(label: string): DetailFieldKey | undefined {
  const normalized = normalizeLabelKey(label);
  return detailLabelMap[normalized];
}

export function getDetailLabelMap(): Readonly<Record<string, DetailFieldKey>> {
  return detailLabelMap;
}
