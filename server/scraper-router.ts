import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { scrapeCustomsDocuments } from "./customs-scraper";
import {
  extractHsCodesFromText,
  extractProductNamesFromText,
  processOcr,
} from "./ocr-processor";

/**
 * Scraper Router - Xử lý scraping, OCR, và lưu dữ liệu
 */

export const scraperRouter = router({
  /**
   * Thu thập dữ liệu từ trang Hải quan
   */
  scrapeCustoms: publicProcedure.mutation(async () => {
    try {
      console.log("[Scraper Router] Bắt đầu scraping từ trang Hải quan");

      const documents = await scrapeCustomsDocuments();

      console.log(
        `[Scraper Router] Thu thập thành công ${documents.length} tài liệu`
      );

      return {
        success: true,
        message: `Thu thập thành công ${documents.length} tài liệu`,
        documents: documents.map((doc) => ({
          documentNumber: doc.documentNumber,
          title: doc.title,
          documentType: doc.documentType,
          issuingAgency: doc.issuingAgency,
          issueDate: doc.issueDate,
          fileUrl: doc.fileUrl,
          fileName: doc.fileName,
        })),
      };
    } catch (error) {
      console.error("[Scraper Router] Lỗi scraping:", error);
      return {
        success: false,
        message: "Lỗi khi scraping từ trang Hải quan",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }),

  /**
   * Xử lý OCR cho một tài liệu
   */
  processDocument: publicProcedure
    .input(
      z.object({
        documentId: z.string(),
        fileName: z.string(),
        fileUrl: z.string(),
        rawText: z.string().optional(),
      })
    )
    .mutation(async ({ input }: any) => {
      try {
        console.log(
          `[Scraper Router] Xử lý OCR cho: ${input.fileName}`
        );

        // Nếu có rawText, sử dụng trực tiếp
        const textToProcess = input.rawText || "";

        // Trích xuất HS code
        const hsCodes = extractHsCodesFromText(textToProcess);

        // Trích xuất tên hàng
        const productNames = extractProductNamesFromText(textToProcess);

        // Tính toán độ tin cậy
        const confidence = Math.min(
          1,
          (hsCodes.length + productNames.length) / 10
        );

        console.log(
          `[Scraper Router] Hoàn thành OCR: ${input.fileName}`
        );
        console.log(`  - HS codes: ${hsCodes.length}`);
        console.log(`  - Product names: ${productNames.length}`);
        console.log(`  - Confidence: ${(confidence * 100).toFixed(2)}%`);

        return {
          success: true,
          documentId: input.documentId,
          fileName: input.fileName,
          hsCodes,
          productNames,
          confidence,
          processedAt: new Date(),
        };
      } catch (error) {
        console.error(
          `[Scraper Router] Lỗi xử lý ${input.fileName}:`,
          error
        );
        return {
          success: false,
          message: `Lỗi xử lý ${input.fileName}`,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  /**
   * Trích xuất HS code từ văn bản
   */
  extractHsCodes: publicProcedure
    .input(
      z.object({
        text: z.string(),
      })
    )
    .query(({ input }: any) => {
      try {
        const hsCodes = extractHsCodesFromText(input.text);
        return {
          success: true,
          hsCodes,
          count: hsCodes.length,
        };
      } catch (error) {
        console.error("[Scraper Router] Lỗi trích xuất HS code:", error);
        return {
          success: false,
          message: "Lỗi trích xuất HS code",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  /**
   * Trích xuất tên hàng từ văn bản
   */
  extractProductNames: publicProcedure
    .input(
      z.object({
        text: z.string(),
      })
    )
    .query(({ input }: any) => {
      try {
        const productNames = extractProductNamesFromText(input.text);
        return {
          success: true,
          productNames,
          count: productNames.length,
        };
      } catch (error) {
        console.error("[Scraper Router] Lỗi trích xuất tên hàng:", error);
        return {
          success: false,
          message: "Lỗi trích xuất tên hàng",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  /**
   * Lấy thông tin scraper status
   */
  getStatus: publicProcedure.query(() => {
    return {
      status: "ready",
      lastScrapedAt: null,
      documentsCount: 0,
      message: "Scraper sẵn sàng để chạy",
    };
  }),
});
