import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { extractTextFromPdf } from "./ocr-processor";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("extractTextFromPdf", () => {
  it("trích xuất và chuẩn hóa tiếng Việt từ PDF", async () => {
    const pdfPath = path.resolve(
      __dirname,
      "__tests__",
      "fixtures",
      "vietnamese-text.pdf"
    );
    const buffer = readFileSync(pdfPath);

    const text = await extractTextFromPdf(buffer);

    expect(text).toContain("Cà phê nóng");
    expect(text).toBe(text.normalize("NFC"));
  });
});
