import axios from "axios";
import { extractPdfText } from "./pdf-utils";
import {
  DEFAULT_PRODUCT_KEYWORD_GROUPS,
  ProductKeywordGroup,
  buildKeywordDictionary,
  loadProductKeywordGroups,
  normalizeKeyword,
} from "./product-keyword-service";
// PDF parsing sẽ được xử lý thông qua server endpoint

/**
 * OCR Processor - Xử lý OCR cho các tài liệu PDF
 * Mục đích: Trích xuất văn bản từ PDF để phân tích HS code
 */

interface OcrResult {
  documentId: string;
  fileName: string;
  rawText: string;
  extractedHsCodes: string[];
  extractedProductNames: string[];
  confidence: number;
  processedAt: Date;
}

/**
 * Trích xuất văn bản từ PDF
 * Note: PDF parsing sẽ được xử lý trên server
 */
export async function extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
  try {
    return await extractPdfText(pdfBuffer);
  } catch (error) {
    console.error("[OCR] Lỗi parse PDF:", error);
    throw error;
  }
}

/**
 * Tải PDF từ URL
 */
export async function downloadPdfFromUrl(url: string): Promise<Buffer> {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 30000,
    });

    return Buffer.from(response.data);
  } catch (error) {
    console.error(`[OCR] Lỗi tải PDF từ ${url}:`, error);
    throw error;
  }
}

/**
 * Trích xuất HS code từ văn bản
 * Pattern: HS code có 6-10 chữ số, có thể có dấu chấm hoặc gạch ngang
 * Ví dụ: 6204.62.20, 6204-62-20, 620462
 */
export function extractHsCodesFromText(text: string): string[] {
  const hsCodes: string[] = [];

  // Pattern 1: HS code có dấu chấm (6204.62.20)
  const pattern1 = /\b(\d{2,4}\.\d{2}\.\d{2})\b/g;
  let match;

  while ((match = pattern1.exec(text)) !== null) {
    hsCodes.push(match[1]);
  }

  // Pattern 2: HS code có gạch ngang (6204-62-20)
  const pattern2 = /\b(\d{2,4}-\d{2}-\d{2})\b/g;
  while ((match = pattern2.exec(text)) !== null) {
    hsCodes.push(match[1]);
  }

  // Pattern 3: HS code không có dấu (620462)
  const pattern3 = /\b(\d{6,10})\b/g;
  while ((match = pattern3.exec(text)) !== null) {
    const code = match[1];
    // Lọc ra những mã có 6 chữ số trở lên
    if (code.length >= 6) {
      hsCodes.push(code);
    }
  }

  // Loại bỏ trùng lặp
  return Array.from(new Set(hsCodes));
}

/**
 * Trích xuất tên hàng từ văn bản
 * Tìm các từ khóa liên quan đến hàng hóa
 */
export function extractProductNamesFromText(
  text: string,
  keywordGroups: ProductKeywordGroup[] = DEFAULT_PRODUCT_KEYWORD_GROUPS
): string[] {
  const normalizedText = text.normalize("NFC").toLowerCase();
  const dictionary = buildKeywordDictionary(keywordGroups);
  const canonicalMap = new Map<string, string>();

  for (const group of keywordGroups) {
    for (const keyword of group.keywords) {
      const normalized = normalizeKeyword(keyword);
      if (!canonicalMap.has(normalized)) {
        canonicalMap.set(normalized, keyword.normalize("NFC"));
      }
    }
  }

  const results = new Set<string>();

  for (const normalizedKeyword of dictionary) {
    const escapedKeyword = escapeKeywordForPattern(normalizedKeyword);
    const regex = new RegExp(
      `(?<![\\p{L}\\p{N}])${escapedKeyword}(?![\\p{L}\\p{N}])`,
      "gu"
    );

    if (regex.test(normalizedText)) {
      const canonical = canonicalMap.get(normalizedKeyword);
      if (canonical) {
        results.add(canonical);
      }
    }
  }

  return Array.from(results);
}

function escapeKeywordForPattern(keyword: string): string {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return escaped.replace(/\s+/g, "\\s+");
}

/**
 * Xử lý OCR cho một tài liệu
 */
export async function processOcr(
  documentId: string,
  fileName: string,
  pdfUrl: string
): Promise<OcrResult> {
  try {
    console.log(`[OCR] Bắt đầu xử lý: ${fileName}`);

    // Bước 1: Tải PDF
    const pdfBuffer = await downloadPdfFromUrl(pdfUrl);

    // Bước 2: Trích xuất văn bản
    const rawText = await extractTextFromPdf(pdfBuffer);
    const trimmedText = rawText.trim();

    if (!trimmedText) {
      console.warn(`[OCR] Văn bản trích xuất rỗng cho ${fileName}`);
    }

    // Bước 3: Trích xuất HS code
    const extractedHsCodes = extractHsCodesFromText(rawText);

    // Bước 4: Trích xuất tên hàng
    const keywordGroups = await loadProductKeywordGroups();
    const extractedProductNames = extractProductNamesFromText(
      rawText,
      keywordGroups
    );

    // Bước 5: Tính toán độ tin cậy
    const totalIndicators =
      extractedHsCodes.length + extractedProductNames.length;
    const wordCount = trimmedText ? trimmedText.split(/\s+/).length : 0;
    const denominator = Math.max(wordCount, 10);
    const confidence =
      totalIndicators === 0
        ? 0
        : Math.min(1, totalIndicators / denominator);

    const result: OcrResult = {
      documentId,
      fileName,
      rawText,
      extractedHsCodes,
      extractedProductNames,
      confidence,
      processedAt: new Date(),
    };

    console.log(`[OCR] Hoàn thành: ${fileName}`);
    console.log(`  - HS codes: ${extractedHsCodes.length}`);
    console.log(`  - Product names: ${extractedProductNames.length}`);
    console.log(`  - Confidence: ${(confidence * 100).toFixed(2)}%`);

    return result;
  } catch (error) {
    console.error(`[OCR] Lỗi xử lý ${fileName}:`, error);
    throw error;
  }
}

/**
 * Xử lý OCR cho nhiều tài liệu
 */
export async function processMultipleOcr(
  documents: Array<{ id: string; fileName: string; fileUrl: string }>
): Promise<OcrResult[]> {
  const results: OcrResult[] = [];

  for (const doc of documents) {
    try {
      const result = await processOcr(doc.id, doc.fileName, doc.fileUrl);
      results.push(result);
    } catch (error) {
      console.error(`[OCR] Lỗi xử lý ${doc.fileName}:`, error);
    }
  }

  return results;
}
