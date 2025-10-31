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
      return Array.isArray(suggestions) ? suggestions.slice(0, 3) : generateDefaultHsSuggestions(productName);
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
export function generateDefaultHsSuggestions(
  productName: string
): { hsCode: string; confidence: number; description: string }[] {
  const lowerName = productName.toLowerCase();
  const suggestions: { hsCode: string; confidence: number; description: string }[] = [];

  // Các pattern phổ biến
  const patterns = [
    { keywords: ["điện tử", "electronics", "device"], hsCodes: ["8471", "8517", "8528"] },
    { keywords: ["quần áo", "clothing", "apparel"], hsCodes: ["6204", "6205", "6206"] },
    { keywords: ["thực phẩm", "food", "beverage"], hsCodes: ["0201", "0202", "0207"] },
    { keywords: ["hóa chất", "chemical", "chemical"], hsCodes: ["2801", "2802", "2803"] },
    { keywords: ["kim loại", "metal", "steel"], hsCodes: ["7208", "7209", "7210"] },
    { keywords: ["nhựa", "plastic"], hsCodes: ["3901", "3902", "3903"] },
    { keywords: ["gỗ", "wood"], hsCodes: ["4401", "4402", "4403"] },
    { keywords: ["giấy", "paper"], hsCodes: ["4801", "4802", "4803"] },
  ];

  for (const pattern of patterns) {
    for (const keyword of pattern.keywords) {
      if (lowerName.includes(keyword)) {
        for (const hsCode of pattern.hsCodes) {
          suggestions.push({
            hsCode,
            confidence: 0.6 + Math.random() * 0.3, // 0.6-0.9
            description: `Suggested based on keyword: ${keyword}`,
          });
        }
        break;
      }
    }
    if (suggestions.length > 0) break;
  }

  // Nếu không tìm thấy pattern, trả về các HS code phổ biến
  if (suggestions.length === 0) {
    suggestions.push(
      { hsCode: "9999", confidence: 0.3, description: "General category" },
      { hsCode: "8999", confidence: 0.2, description: "Miscellaneous" }
    );
  }

  return suggestions.slice(0, 3);
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
    hsCodes: extractedData.hsCodes || [],
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
  }

  // Tính toán độ tin cậy trung bình
  if (analysis.suggestions.length > 0) {
    const avgConfidence = analysis.suggestions.reduce((sum: number, item: any) => {
      const itemConfidence = item.suggestions.length > 0 ? item.suggestions[0].confidence : 0;
      return sum + itemConfidence;
    }, 0) / analysis.suggestions.length;
    analysis.confidence = Math.round(avgConfidence * 100);
  }

  return analysis;
}
