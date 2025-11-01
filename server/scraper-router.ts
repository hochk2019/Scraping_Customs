import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { scrapeCustomsDocuments } from "./customs-scraper";
import { extractHsCodesFromText, extractProductNamesFromText } from "./ocr-processor";
import { loadProductKeywordGroups } from "./product-keyword-service";
import {
  createScrapeLog,
  getDocumentsTotal,
  getLatestScrapeLog,
  updateScrapeLog,
  upsertDocument,
} from "./db";
import { deriveCustomsDocId } from "./document-utils";
import { enqueueOcrJob } from "./queues/ocr-queue";
import { ProcessOcrDocumentResult } from "./services/process-ocr-document";

/**
 * Scraper Router - Xử lý scraping, OCR, và lưu dữ liệu
 */

export const scraperRouter = router({
  /**
   * Thu thập dữ liệu từ trang Hải quan
   */
  scrapeCustoms: publicProcedure.mutation(async () => {
    let logId: number | null = null;
    try {
      console.log("[Scraper Router] Bắt đầu scraping từ trang Hải quan");

      const log = await createScrapeLog({
        userId: 0,
        scrapeType: "manual",
        startTime: new Date(),
        status: "running",
      });
      logId = log?.id ?? null;

      const documents = await scrapeCustomsDocuments();
      const persisted: Array<{ id: number | null; documentNumber: string }> = [];
      let savedCount = 0;

      for (const doc of documents) {
        try {
          const customsDocId = deriveCustomsDocId(doc.detailUrl, doc.documentNumber);
          const result = await upsertDocument({
            documentNumber: doc.documentNumber.normalize("NFC"),
            customsDocId,
            title: doc.title?.normalize("NFC"),
            documentType: doc.documentType?.normalize("NFC"),
            issuingAgency: doc.issuingAgency?.normalize("NFC"),
            issueDate: doc.issueDate,
            signer: doc.signer?.normalize("NFC"),
            fileUrl: doc.fileUrl,
            fileName: doc.fileName,
            summary: doc.title?.normalize("NFC"),
            detailUrl: doc.detailUrl,
            status: "pending",
            processedStatus: "new",
          });

          if (result) {
            savedCount += 1;
            persisted.push({ id: result.id, documentNumber: result.documentNumber });
          }
        } catch (persistError) {
          console.error("[Scraper Router] Không thể lưu tài liệu:", persistError);
        }
      }

      if (logId) {
        await updateScrapeLog(logId, {
          endTime: new Date(),
          status: "completed",
          documentsFound: documents.length,
          documentsDownloaded: savedCount,
        });
      }

      const totalDocuments = await getDocumentsTotal();

      console.log(
        `[Scraper Router] Thu thập ${documents.length} tài liệu, lưu thành công ${savedCount}`,
      );

      return {
        success: true,
        message: `Thu thập thành công ${documents.length} tài liệu, đã lưu ${savedCount}`,
        documents: documents.map((doc) => ({
          documentNumber: doc.documentNumber,
          title: doc.title,
          documentType: doc.documentType,
          issuingAgency: doc.issuingAgency,
          issueDate: doc.issueDate,
          fileUrl: doc.fileUrl,
          fileName: doc.fileName,
          detailUrl: doc.detailUrl,
        })),
        savedCount,
        persisted,
        totalDocuments,
        logId,
      };
    } catch (error) {
      console.error("[Scraper Router] Lỗi scraping:", error);

      if (logId) {
        await updateScrapeLog(logId, {
          endTime: new Date(),
          status: "failed",
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }

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
        console.log(`[Scraper Router] Đưa OCR vào hàng đợi cho: ${input.fileName}`);

        const documentIdNumber = Number.parseInt(input.documentId, 10);
        if (!Number.isFinite(documentIdNumber)) {
          throw new Error("documentId không hợp lệ");
        }

        const enqueueResult = await enqueueOcrJob({
          documentId: documentIdNumber,
          fileName: input.fileName.normalize("NFC"),
          fileUrl: input.fileUrl,
          rawText: input.rawText?.normalize("NFC"),
        });

        if (enqueueResult.status === "processed") {
          const result = enqueueResult.result as ProcessOcrDocumentResult;
          if (!result.success) {
            return {
              success: false,
              message: `Lỗi xử lý ${input.fileName}`,
              error: result.error ?? "Không xác định",
            };
          }

          return result;
        }

        return {
          success: true,
          queued: true,
          jobId: enqueueResult.jobId,
          message: "Tài liệu đã được đưa vào hàng đợi OCR",
        };
      } catch (error) {
        console.error(
          `[Scraper Router] Lỗi enqueue ${input.fileName}:`,
          error
        );
        return {
          success: false,
          message: `Lỗi xử lý ${input.fileName}`,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    })


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
    .query(async ({ input }: any) => {
      try {
        const keywordGroups = await loadProductKeywordGroups();
        const productNames = extractProductNamesFromText(
          input.text,
          keywordGroups
        );
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
  getStatus: publicProcedure.query(async () => {
    const [latestLog, totalDocuments] = await Promise.all([
      getLatestScrapeLog(),
      getDocumentsTotal(),
    ]);

    if (!latestLog) {
      return {
        status: "idle",
        lastScrapedAt: null,
        documentsCount: totalDocuments,
        message: "Chưa có lần thu thập nào. Bạn có thể khởi chạy ngay.",
      };
    }

    const statusMap: Record<string, string> = {
      running: "running",
      completed: "ready",
      failed: "failed",
    };
    const status = statusMap[latestLog.status as keyof typeof statusMap] ?? "ready";
    const lastScrapedAt = latestLog.endTime ?? latestLog.startTime ?? null;

    let message = "Scraper sẵn sàng để chạy";
    if (latestLog.status === "running") {
      message = `Đang thu thập dữ liệu (log #${latestLog.id}).`;
    } else if (latestLog.status === "failed") {
      message = latestLog.errorMessage
        ? `Thu thập gần nhất thất bại: ${latestLog.errorMessage}`
        : "Thu thập gần nhất thất bại.";
    } else {
      message = `Lần thu thập gần nhất tìm thấy ${latestLog.documentsFound} tài liệu, đã lưu ${latestLog.documentsDownloaded}.`;
    }

    return {
      status,
      lastScrapedAt,
      documentsCount: totalDocuments,
      message,
    };
  }),
});
