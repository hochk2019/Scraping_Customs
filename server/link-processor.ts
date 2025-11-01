import * as pdfParse from "pdf-parse";
import { extractKeyDataFromText } from "./file-processor";
import { getWithNetwork } from "./network-client";

/**
 * Tải và xử lý file PDF từ URL
 */
export async function downloadAndProcessPdf(
  fileUrl: string,
  maxRetries: number = 3
): Promise<{ text: string; success: boolean; error?: string }> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[LinkProcessor] Downloading PDF from ${fileUrl} (attempt ${attempt}/${maxRetries})`);

      // Tải file PDF
      const response = await getWithNetwork<ArrayBuffer>(fileUrl, {
        responseType: "arraybuffer",
        timeout: 30000,
      });

      const buffer = Buffer.from(response.data);

      // Parse PDF
      const pdfData = await (pdfParse as any).default(buffer);
      const text = pdfData.text || "";

      if (!text || text.trim().length === 0) {
        throw new Error("PDF is empty or contains no text");
      }

      console.log(`[LinkProcessor] Successfully processed PDF: ${fileUrl}`);
      return { text, success: true };
    } catch (error) {
      lastError = error as Error;
      console.warn(
        `[LinkProcessor] Attempt ${attempt} failed for ${fileUrl}: ${(error as Error).message}`
      );

      if (attempt < maxRetries) {
        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  return {
    text: "",
    success: false,
    error: lastError?.message || "Failed to download and process PDF",
  };
}

/**
 * Xử lý OCR cho một liên kết
 */
export async function processLink(
  linkUrl: string,
  documentNumber: string,
  documentTitle: string
): Promise<{
  documentNumber: string;
  documentTitle: string;
  linkUrl: string;
  status: "success" | "failed";
  extractedData?: {
    hsCodes: string[];
    productNames: string[];
    textLength: number;
    wordCount: number;
  };
  error?: string;
  processedAt: Date;
}> {
  try {
    // Tải và xử lý PDF
    const result = await downloadAndProcessPdf(linkUrl);

    if (!result.success) {
      return {
        documentNumber,
        documentTitle,
        linkUrl,
        status: "failed",
        error: result.error,
        processedAt: new Date(),
      };
    }

    // Trích xuất dữ liệu
    const extractedData = extractKeyDataFromText(result.text);

    return {
      documentNumber,
      documentTitle,
      linkUrl,
      status: "success",
      extractedData: {
        hsCodes: extractedData.hsCodes,
        productNames: extractedData.productNames,
        textLength: extractedData.textLength,
        wordCount: extractedData.wordCount,
      },
      processedAt: new Date(),
    };
  } catch (error) {
    console.error(`[LinkProcessor] Error processing link ${linkUrl}:`, error);
    return {
      documentNumber,
      documentTitle,
      linkUrl,
      status: "failed",
      error: (error as Error).message,
      processedAt: new Date(),
    };
  }
}

/**
 * Xử lý OCR cho nhiều liên kết
 */
export async function processMultipleLinks(
  links: Array<{
    url: string;
    documentNumber: string;
    documentTitle: string;
  }>,
  concurrency: number = 3
): Promise<
  Array<{
    documentNumber: string;
    documentTitle: string;
    linkUrl: string;
    status: "success" | "failed";
    extractedData?: {
      hsCodes: string[];
      productNames: string[];
      textLength: number;
      wordCount: number;
    };
    error?: string;
    processedAt: Date;
  }>
> {
  const results = [];

  // Xử lý theo batch để tránh quá tải
  for (let i = 0; i < links.length; i += concurrency) {
    const batch = links.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((link) =>
        processLink(link.url, link.documentNumber, link.documentTitle)
      )
    );
    results.push(...batchResults);

    // Log progress
    console.log(
      `[LinkProcessor] Processed ${Math.min(i + concurrency, links.length)}/${links.length} links`
    );
  }

  return results;
}

/**
 * Tính toán thống kê từ kết quả xử lý
 */
export function calculateStatistics(
  results: Array<{
    status: "success" | "failed";
    extractedData?: {
      hsCodes: string[];
      productNames: string[];
      textLength: number;
      wordCount: number;
    };
  }>
) {
  const stats = {
    totalLinks: results.length,
    successfulLinks: 0,
    failedLinks: 0,
    totalHsCodes: 0,
    totalProductNames: 0,
    totalTextLength: 0,
    totalWordCount: 0,
    uniqueHsCodes: new Set<string>(),
    uniqueProductNames: new Set<string>(),
  };

  for (const result of results) {
    if (result.status === "success") {
      stats.successfulLinks++;
      if (result.extractedData) {
        stats.totalHsCodes += result.extractedData.hsCodes.length;
        stats.totalProductNames += result.extractedData.productNames.length;
        stats.totalTextLength += result.extractedData.textLength;
        stats.totalWordCount += result.extractedData.wordCount;

        result.extractedData.hsCodes.forEach((code) =>
          stats.uniqueHsCodes.add(code)
        );
        result.extractedData.productNames.forEach((name) =>
          stats.uniqueProductNames.add(name)
        );
      }
    } else {
      stats.failedLinks++;
    }
  }

  return {
    ...stats,
    uniqueHsCodesCount: stats.uniqueHsCodes.size,
    uniqueProductNamesCount: stats.uniqueProductNames.size,
    successRate: Math.round((stats.successfulLinks / stats.totalLinks) * 100),
  };
}
