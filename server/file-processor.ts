import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import { parse as csvParse } from "csv-parse/sync";
import { extractPdfText } from "./pdf-utils";

/**
 * Xử lý file Excel
 */
export async function processExcelFile(filePath: string): Promise<any[]> {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    return data;
  } catch (error) {
    console.error("[FileProcessor] Failed to process Excel file:", error);
    throw error;
  }
}

/**
 * Xử lý file PDF
 */
export async function processPdfFile(filePath: string): Promise<string> {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return await extractPdfText(fileBuffer);
  } catch (error) {
    console.error("[FileProcessor] Failed to process PDF file:", error);
    throw error;
  }
}

/**
 * Xử lý file Word (DOCX)
 */
export async function processWordFile(filePath: string): Promise<string> {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    // Đơn giản hóa: chỉ trích xuất text từ XML
    // Trong thực tế, cần sử dụng docx parser phức tạp hơn
    const text = fileBuffer.toString("utf-8");
    return text;
  } catch (error) {
    console.error("[FileProcessor] Failed to process Word file:", error);
    throw error;
  }
}

/**
 * Xử lý file JSON
 */
export async function processJsonFile(filePath: string): Promise<any[]> {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(fileContent);
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    console.error("[FileProcessor] Failed to process JSON file:", error);
    throw error;
  }
}

/**
 * Xử lý file CSV
 */
export async function processCsvFile(filePath: string): Promise<any[]> {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const records = csvParse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });
    return records;
  } catch (error) {
    console.error("[FileProcessor] Failed to process CSV file:", error);
    throw error;
  }
}

/**
 * Xử lý file dựa trên loại
 */
export async function processFile(filePath: string, fileType: string): Promise<any> {
  const ext = path.extname(filePath).toLowerCase();

  try {
    switch (fileType.toLowerCase()) {
      case "excel":
      case "xlsx":
      case "xls":
        return await processExcelFile(filePath);

      case "pdf":
        return await processPdfFile(filePath);

      case "word":
      case "docx":
        return await processWordFile(filePath);

      case "json":
        return await processJsonFile(filePath);

      case "csv":
        return await processCsvFile(filePath);

      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    console.error("[FileProcessor] Error processing file:", error);
    throw error;
  }
}

/**
 * Trích xuất HS code từ text
 * Pattern: Mã HS code thường là 4-10 chữ số hoặc chữ số + ký tự
 */
export function extractHsCodesFromText(text: string): string[] {
  const hsCodePattern = /\b(\d{4,10}|[0-9]{2}\.[0-9]{2}\.[0-9]{2})\b/g;
  const matches = text.match(hsCodePattern) || [];
    return Array.from(new Set(matches)); // Loại bỏ trùng lặp
}

/**
 * Trích xuất tên hàng từ text
 * Tìm kiếm các chuỗi có độ dài 5-100 ký tự, chứa chữ cái
 */
export function extractProductNamesFromText(text: string): string[] {
  const productPattern = /[A-Za-z0-9\s\-\(\)]{5,100}/g;
  const matches = text.match(productPattern) || [];
  return matches
    .filter((m) => m.trim().length > 5)
    .map((m) => m.trim())
    .slice(0, 20); // Giới hạn 20 kết quả
}

/**
 * Trích xuất dữ liệu quan trọng từ text
 */
export function extractKeyDataFromText(text: string) {
  return {
    hsCodes: extractHsCodesFromText(text),
    productNames: extractProductNamesFromText(text),
    textLength: text.length,
    wordCount: text.split(/\s+/).length,
  };
}


/**
 * Tính điểm tương đồng giữa hai chuỗi (Levenshtein distance)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const distance = matrix[len2][len1];
  const maxLen = Math.max(len1, len2);
  return (maxLen - distance) / maxLen;
}

/**
 * Gợi ý HS code dựa trên tên hàng
 * Sử dụng LLM để phân tích và gợi ý
 */
export async function suggestHsCodeWithAI(
  productName: string,
  llmFunction?: (prompt: string) => Promise<string>
): Promise<{ hsCode: string; confidence: number; description: string }[]> {
  // Nếu không có LLM function, trả về các gợi ý mặc định
  if (!llmFunction) {
    return generateDefaultHsSuggestions(productName);
  }

  try {
    const prompt = `Based on the product name "${productName}", suggest the most likely HS (Harmonized System) codes.
    Return a JSON array with objects containing: hsCode (string), confidence (0-1), description (string).
    Suggest top 3 most likely codes.`;

    const response = await llmFunction(prompt);

    try {
      const suggestions = JSON.parse(response);
      if (!Array.isArray(suggestions)) {
        return generateDefaultHsSuggestions(productName);
      }

      const sanitized = suggestions
        .map((item: any) => ({
          hsCode: String(item.hsCode ?? "").trim(),
          confidence: Math.max(0, Math.min(1, Number(item.confidence ?? 0))),
          description: String(item.description ?? "Đề xuất từ AI"),
        }))
        .filter((item) => item.hsCode);

      if (!sanitized.length) {
        return generateDefaultHsSuggestions(productName);
      }

      return sanitized.slice(0, 3);
    } catch {
      return generateDefaultHsSuggestions(productName);
    }
  } catch (error) {
    console.error("[FileProcessor] Error suggesting HS codes with AI:", error);
    return generateDefaultHsSuggestions(productName);
  }
}

/**
 * Tạo các gợi ý HS code mặc định dựa trên tên hàng
 */
const HS_SUGGESTION_LIBRARY: Array<{
  hsCode: string;
  keywords: string[];
  description: string;
}> = [
  {
    hsCode: "8517",
    keywords: ["điện thoại", "smartphone", "viễn thông", "thiết bị mạng"],
    description: "Thiết bị viễn thông, điện thoại di động",
  },
  {
    hsCode: "8471",
    keywords: ["máy tính", "laptop", "pc", "máy chủ", "computer"],
    description: "Máy xử lý dữ liệu tự động",
  },
  {
    hsCode: "6204",
    keywords: ["quần áo", "váy", "đầm", "dệt may", "vest"],
    description: "Quần áo dệt kim dành cho nữ",
  },
  {
    hsCode: "6403",
    keywords: ["giày", "dép", "giày da", "footwear"],
    description: "Giày dép bề mặt da",
  },
  {
    hsCode: "2203",
    keywords: ["bia", "beer", "đồ uống có cồn"],
    description: "Đồ uống có cồn từ mạch nha",
  },
  {
    hsCode: "0901",
    keywords: ["cà phê", "coffee"],
    description: "Cà phê, rang hoặc chưa rang",
  },
  {
    hsCode: "1704",
    keywords: ["kẹo", "sô cô la", "kẹo ngọt", "chocolate"],
    description: "Các loại bánh kẹo, sô cô la",
  },
  {
    hsCode: "3926",
    keywords: ["nhựa", "plastic", "polymer", "chất dẻo"],
    description: "Sản phẩm bằng chất dẻo",
  },
  {
    hsCode: "4412",
    keywords: ["gỗ", "ván ép", "plywood", "gỗ ghép"],
    description: "Gỗ dán, gỗ ghép",
  },
  {
    hsCode: "8207",
    keywords: ["dụng cụ", "dao", "mũi khoan", "tool"],
    description: "Dụng cụ cắt gọt bằng kim loại",
  },
  {
    hsCode: "3004",
    keywords: ["thuốc", "dược phẩm", "medicine"],
    description: "Dược phẩm đã pha chế",
  },
  {
    hsCode: "3402",
    keywords: ["chất tẩy", "xà phòng", "detergent"],
    description: "Sản phẩm giặt tẩy, làm sạch",
  },
  {
    hsCode: "9503",
    keywords: ["đồ chơi", "toy", "trẻ em"],
    description: "Đồ chơi và sản phẩm cho trẻ em",
  },
  {
    hsCode: "9403",
    keywords: ["nội thất", "bàn", "ghế", "tủ"],
    description: "Đồ nội thất các loại",
  },
];

function normalizeText(value: string): string {
  return value.normalize("NFC").toLowerCase();
}

function computeSuggestionConfidence(productName: string, keywords: string[]): number {
  const normalized = normalizeText(productName);
  const hits = keywords.filter((keyword) => normalized.includes(normalizeText(keyword)));
  if (hits.length === 0) {
    return 0;
  }

  const keywordScore = hits.length / keywords.length;
  const lengthPenalty = Math.min(1, normalized.split(/\s+/).length / 12);
  const confidence = Math.min(1, 0.45 + keywordScore * 0.45 + lengthPenalty * 0.1);
  return Number(confidence.toFixed(2));
}

export function generateDefaultHsSuggestions(
  productName: string
): { hsCode: string; confidence: number; description: string }[] {
  const scored = HS_SUGGESTION_LIBRARY.map((entry) => ({
    hsCode: entry.hsCode,
    confidence: computeSuggestionConfidence(productName, entry.keywords),
    description: entry.description,
  }))
    .filter((item) => item.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence);

  if (scored.length === 0) {
    return [
      { hsCode: "9999", confidence: 0.25, description: "Không xác định rõ - cần kiểm tra thêm" },
      { hsCode: "8999", confidence: 0.2, description: "Danh mục khác - cần bổ sung thông tin" },
    ];
  }

  return scored.slice(0, 3);
}

/**
 * Phân tích dữ liệu được trích xuất và gợi ý HS code
 */
export async function analyzeExtractedData(
  extractedData: any,
  llmFunction?: (prompt: string) => Promise<string>
): Promise<any> {
  const analysis = {
    productNames: extractedData.productNames || [],
    hsCodes: Array.from(new Set<string>([...(extractedData.hsCodes || [])])),
    suggestions: [] as any[],
    confidence: 0,
  };

  // Gợi ý HS code cho mỗi tên hàng
  for (const productName of extractedData.productNames || []) {
    const suggestions = await suggestHsCodeWithAI(productName, llmFunction);
    analysis.suggestions.push({
      productName,
      suggestions,
    });

    for (const suggestion of suggestions) {
      analysis.hsCodes.push(suggestion.hsCode);
    }
  }

  analysis.hsCodes = Array.from(new Set(analysis.hsCodes));

  // Tính toán độ tin cậy trung bình
  if (analysis.suggestions.length > 0) {
    const avgConfidence =
      analysis.suggestions.reduce((sum: number, item: any) => {
        if (!item.suggestions || item.suggestions.length === 0) return sum;
        const bestSuggestion = item.suggestions[0];
        return sum + bestSuggestion.confidence;
      }, 0) / analysis.suggestions.length;
    analysis.confidence = Math.round(Math.min(1, avgConfidence) * 100);
  } else if (analysis.hsCodes.length > 0) {
    analysis.confidence = 80;
  }

  return analysis;
}
