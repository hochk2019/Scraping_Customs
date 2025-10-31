import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.CUSTOMS_LABEL_MAP_PATH;
}

afterEach(() => {
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
});
