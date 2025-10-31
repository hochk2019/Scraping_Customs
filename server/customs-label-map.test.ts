import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.CUSTOMS_LABEL_MAP_PATH;
  delete process.env.CUSTOMS_LABEL_MAP_RELOAD_INTERVAL_MS;
}

afterEach(async () => {
  vi.useRealTimers();
  try {
    const module = await import("./customs-label-map");
    module.stopDetailLabelMapReloader();
  } catch {
    // Module có thể chưa được nạp trong ca kiểm thử.
  }

  vi.clearAllTimers();
  resetEnv();
  vi.resetModules();
});

describe("customs-label-map", () => {
  test("sử dụng mapping mặc định khi không có cấu hình", async () => {
    const module = await import("./customs-label-map");
    expect(module.normalizeDetailLabel("Số hiệu")).toBe("documentNumber");
  });

  test("có thể nạp thêm nhãn từ file JSON", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "label-json-"));
    const filePath = path.join(tempDir, "labels.json");

    try {
      fs.writeFileSync(
        filePath,
        JSON.stringify({ "Số hiệu bổ sung": "documentNumber" }),
        "utf8"
      );

      process.env.CUSTOMS_LABEL_MAP_PATH = filePath;
      vi.resetModules();
      const module = await import("./customs-label-map");
      expect(module.normalizeDetailLabel("Số hiệu bổ sung")).toBe(
        "documentNumber"
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("có thể nạp thêm nhãn từ file YAML", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "label-yaml-"));
    const filePath = path.join(tempDir, "labels.yaml");

    try {
      fs.writeFileSync(
        filePath,
        [
          "Số hiệu mở rộng: documentNumber",
          "Nội dung tóm tắt: title",
        ].join("\n"),
        "utf8"
      );

      process.env.CUSTOMS_LABEL_MAP_PATH = filePath;
      vi.resetModules();
      const module = await import("./customs-label-map");
      expect(module.normalizeDetailLabel("Số hiệu mở rộng")).toBe(
        "documentNumber"
      );
      expect(module.normalizeDetailLabel("Nội dung tóm tắt")).toBe("title");
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("reload thủ công cập nhật mapping khi file thay đổi", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "label-reload-"));
    const filePath = path.join(tempDir, "labels.json");

    try {
      fs.writeFileSync(
        filePath,
        JSON.stringify({ "Số hiệu ban đầu": "documentNumber" }),
        "utf8"
      );

      process.env.CUSTOMS_LABEL_MAP_PATH = filePath;
      vi.resetModules();
      const module = await import("./customs-label-map");

      expect(module.normalizeDetailLabel("Số hiệu ban đầu")).toBe(
        "documentNumber"
      );

      fs.writeFileSync(
        filePath,
        JSON.stringify({ "Nội dung cập nhật": "title" }),
        "utf8"
      );

      module.reloadDetailLabelMap();

      expect(module.normalizeDetailLabel("Nội dung cập nhật")).toBe("title");
      expect(module.normalizeDetailLabel("Số hiệu ban đầu")).toBeUndefined();
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("tùy chọn reload theo chu kỳ cập nhật mapping khi file đổi", async () => {
    vi.useFakeTimers();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "label-interval-"));
    const filePath = path.join(tempDir, "labels.json");

    try {
      fs.writeFileSync(
        filePath,
        JSON.stringify({ "Ban đầu": "documentNumber" }),
        "utf8"
      );

      process.env.CUSTOMS_LABEL_MAP_PATH = filePath;
      vi.resetModules();
      const module = await import("./customs-label-map");

      expect(module.normalizeDetailLabel("Ban đầu")).toBe("documentNumber");

      module.startDetailLabelMapReloader(100);

      fs.writeFileSync(
        filePath,
        JSON.stringify({ "Sau reload": "title" }),
        "utf8"
      );

      await vi.advanceTimersByTimeAsync(200);

      expect(module.normalizeDetailLabel("Sau reload")).toBe("title");
      expect(module.normalizeDetailLabel("Ban đầu")).toBeUndefined();

      module.stopDetailLabelMapReloader();
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("tự động đọc chu kỳ reload từ biến môi trường", async () => {
    vi.useFakeTimers();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "label-env-"));
    const filePath = path.join(tempDir, "labels.yaml");

    try {
      fs.writeFileSync(
        filePath,
        ["Trạng thái: title"].join("\n"),
        "utf8"
      );

      process.env.CUSTOMS_LABEL_MAP_PATH = filePath;
      process.env.CUSTOMS_LABEL_MAP_RELOAD_INTERVAL_MS = "150";
      vi.resetModules();
      const module = await import("./customs-label-map");

      expect(module.normalizeDetailLabel("Trạng thái")).toBe("title");

      fs.writeFileSync(
        filePath,
        ["Cơ quan cập nhật: issuingAgency"].join("\n"),
        "utf8"
      );

      await vi.advanceTimersByTimeAsync(300);

      expect(module.normalizeDetailLabel("Cơ quan cập nhật")).toBe(
        "issuingAgency"
      );
      expect(module.normalizeDetailLabel("Trạng thái")).toBeUndefined();

      module.stopDetailLabelMapReloader();
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
