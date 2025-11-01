import { COOKIE_NAME } from "@shared/const";
import { invokeLLM } from "./_core/llm";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  getDocuments,
  getDocumentById,
  getScrapeSchedules,
  createScrapeSchedule,
  updateScrapeSchedule,
  deleteScrapeSchedule,
  getScrapeLogs,
  getExportSelections,
  addToExportSelection,
  removeFromExportSelection,
  clearExportSelections,
  updateDocumentNotes,
  updateDocumentTags,
  updateProcessedStatus,
  getAllUsers,
  getUserStatistics,
  getUserActivity,
  updateUserRole,
  deleteUser,
  searchUsers,
  upsertDocument,
  searchDocuments,
  saveUploadedFile,
  updateUploadedFileStatus,
  getUserUploadedFilesWithTotal,
  saveUploadedFileAnalysis,
} from "./db";
import { scrapeCustomsData } from "./scraper";
import { adminRouter } from "./admin-router";
import { advancedScraperRouter } from "./advanced-scraper-router";
import { hsCodeRouter } from "./hsCode-router";
import { scrapingHistoryRouter } from "./scraping-history-router";
import { progressRouter } from "./progress-router";
import { scrapingChartsRouter } from "./scraping-charts-router";
import { scraperRouter as pipelineRouter } from "./scraper-router";
import {
  createScheduledTask,
  stopScheduledTask,
  updateScheduledTask,
} from "./scheduler";
import { getDb, saveFeedback, getUserFeedback, updateFeedbackStatus, getFeedbackWithUser, saveOcrResult, saveMultipleOcrResults, saveOcrStatistics, updateOcrStatistics, getOcrStatistics } from "./db";
import { deriveCustomsDocId } from "./document-utils";
import os from "os";
import path from "path";
import { promises as fsp } from "fs";
import { userFeedback } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";
import { processLink, processMultipleLinks, calculateStatistics } from "./link-processor";

// Feedback router
const feedbackRouter = router({
  /**
   * Tạo feedback mới
   */
  create: protectedProcedure
    .input(
      z.object({
        feedbackType: z.enum(["bug_report", "improvement_suggestion", "data_correction"]),
        title: z.string(),
        description: z.string(),
        uploadedFileId: z.number().optional(),
        rating: z.number().min(1).max(5).optional(),
        relatedData: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error("Unauthorized");
      }

      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Lưu feedback vào database
        await db.insert(userFeedback).values({
          userId: ctx.user.id,
          feedbackType: input.feedbackType,
          title: input.title,
          description: input.description,
          uploadedFileId: input.uploadedFileId,
          rating: input.rating,
          relatedData: input.relatedData,
          status: "open",
        });

        return {
          success: true,
          message: "Feedback submitted successfully",
        };
      } catch (error) {
        console.error("[API] Error creating feedback:", error);
        throw new Error("Failed to create feedback");
      }
    }),

  /**
   * Lấy danh sách feedback của người dùng
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error("Unauthorized");
      }

      try {
        const feedbacks = await getUserFeedback(ctx.user.id, input.limit, input.offset);
        return {
          feedbacks,
          total: feedbacks.length,
        };
      } catch (error) {
        console.error("[API] Error fetching feedback:", error);
        throw new Error("Failed to fetch feedback");
      }
    }),

  /**
   * Cập nhật trạng thái feedback (admin only)
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        feedbackId: z.number(),
        status: z.enum(["open", "in_progress", "resolved", "closed"]),
        adminResponse: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new Error("Unauthorized");
      }

      try {
        // Cập nhật feedback status
        await updateFeedbackStatus(input.feedbackId, input.status, input.adminResponse);
        
        // Gửi notification cho chủ dự án nếu admin có trả lời
        if (input.adminResponse) {
          const feedbackData = await getFeedbackWithUser(input.feedbackId);
          
          if (feedbackData?.user?.email) {
            const userEmail = feedbackData.user.email;
            const feedbackTitle = feedbackData.feedback.title;
            const statusLabel = input.status === "resolved" ? "Giải quyết" : input.status === "in_progress" ? "Đang xử lý" : input.status;
            
            // Gửi thông báo cho chủ dự án
            await notifyOwner({
              title: "Phản hồi mới từ người dùng",
              content: `Quản trị viên vừa trả lời feedback: ${feedbackTitle}. Trạng thái: ${statusLabel}. Người dùng: ${userEmail}. Nội dung: ${input.adminResponse}`,
            });
          }
        }
        
        return {
          success: true,
          message: "Feedback status updated successfully",
        };
      } catch (error) {
        console.error("[API] Error updating feedback:", error);
        throw new Error("Failed to update feedback");
      }
    }),
});

// File upload router
const fileUploadRouter = router({
  /**
   * Upload file và trích xuất dữ liệu
   */
  upload: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileType: z.enum(["excel", "pdf", "word", "json", "csv"]),
        fileContent: z.string(), // Base64 encoded
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error("Unauthorized");
      }

      try {
        const {
          processFile,
          extractKeyDataFromText,
          extractHsCodesFromText,
          analyzeExtractedData,
        } = await import("./file-processor");

        const buffer = Buffer.from(input.fileContent, "base64");
        const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "upload-"));
        const safeFileName = input.fileName || `upload-${Date.now()}`;
        const tmpFilePath = path.join(tmpDir, safeFileName);

        await fsp.writeFile(tmpFilePath, buffer);

        const uploadedFileId = await saveUploadedFile(
          ctx.user.id,
          safeFileName.normalize("NFC"),
          input.fileType,
          tmpFilePath,
          buffer.byteLength,
        );

        let processedData: any = null;
        let extractedText = "";

        switch (input.fileType) {
          case "pdf":
          case "word":
            extractedText = await processFile(tmpFilePath, input.fileType);
            processedData = { text: extractedText };
            break;
          default:
            processedData = await processFile(tmpFilePath, input.fileType);
            break;
        }

        const extractedData: any = {
          fileName: safeFileName,
          fileType: input.fileType,
          uploadedAt: new Date(),
          hsCodes: [],
          productNames: [],
          summary: {},
        };

        if (extractedText) {
          const keyData = extractKeyDataFromText(extractedText);
          extractedData.hsCodes = keyData.hsCodes;
          extractedData.productNames = keyData.productNames;
          extractedData.summary = {
            textLength: keyData.textLength,
            wordCount: keyData.wordCount,
          };
        } else if (Array.isArray(processedData)) {
          extractedData.summary = {
            rowCount: processedData.length,
            columns: processedData.length > 0 ? Object.keys(processedData[0]) : [],
          };

          const allText = JSON.stringify(processedData);
          extractedData.hsCodes = extractHsCodesFromText(allText);
        }

        if (uploadedFileId) {
          await updateUploadedFileStatus(
            uploadedFileId,
            "completed",
            (extractedData.hsCodes?.length ?? 0) + (extractedData.productNames?.length ?? 0),
          );
        }

        await fsp.unlink(tmpFilePath).catch(() => undefined);
        await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);

        let aiAnalysis: any = null;
        try {
          aiAnalysis = await analyzeExtractedData(extractedData, async (prompt: string) => {
            const response = await invokeLLM({
              messages: [
                { role: "system", content: "You are an expert in HS code classification. Respond with valid JSON only." },
                { role: "user", content: prompt },
              ],
            });
            const content = response.choices[0].message.content;
            return typeof content === "string" ? content : JSON.stringify(content);
          });
        } catch (error) {
          console.warn("[API] AI analysis failed, using default suggestions:", error);
          aiAnalysis = await analyzeExtractedData(extractedData);
        }

        if (uploadedFileId) {
          await saveUploadedFileAnalysis(uploadedFileId, aiAnalysis, extractedData);
        }

        return {
          success: true,
          message: "File uploaded and processed successfully",
          extractedData,
          aiAnalysis,
          uploadedFileId,
        };
      } catch (error) {
        console.error("[API] Error uploading file:", error);
        throw new Error("Failed to upload file: " + (error instanceof Error ? error.message : "Unknown error"));
      }
    }),

  /**
   * Lấy danh sách file tải lên
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error("Unauthorized");
      }

      try {
        const { files, total } = await getUserUploadedFilesWithTotal(
          ctx.user.id,
          input.limit,
          input.offset,
        );

        return { files, total };
      } catch (error) {
        console.error("[API] Error fetching uploaded files:", error);
        throw new Error("Failed to fetch uploaded files");
      }
    }),
});

const linkProcessingRouter = router({
  processLink: protectedProcedure
    .input(
      z.object({
        linkUrl: z.string().url(),
        documentNumber: z.string(),
        documentTitle: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error("Unauthorized");
      }
      try {
        const result = await processLink(
          input.linkUrl,
          input.documentNumber,
          input.documentTitle
        );
        return result;
      } catch (error) {
        console.error("[API] Error processing link:", error);
        throw new Error("Failed to process link");
      }
    }),

  processMultipleLinks: protectedProcedure
    .input(
      z.object({
        links: z.array(
          z.object({
            url: z.string().url(),
            documentNumber: z.string(),
            documentTitle: z.string(),
          })
        ),
        concurrency: z.number().default(3),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error("Unauthorized");
      }
      try {
        const results = await processMultipleLinks(input.links, input.concurrency);
        const statistics = calculateStatistics(results);
        return { results, statistics };
      } catch (error) {
        console.error("[API] Error processing multiple links:", error);
        throw new Error("Failed to process links");
      }
    }),
});

const ocrStatsRouter = router({
  getByDocumentId: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      try {
        const stats = await getOcrStatistics(input.documentId);
        return stats;
      } catch (error) {
        console.error("[API] Error getting OCR statistics:", error);
        throw new Error("Failed to get OCR statistics");
      }
    }),
});

export const appRouter = router({
  system: systemRouter,
  files: fileUploadRouter,
  feedback: feedbackRouter,
  links: linkProcessingRouter,
  ocrStats: ocrStatsRouter,
  admin: adminRouter,
  hsCode: hsCodeRouter,
  advancedScraper: advancedScraperRouter,
  scrapingHistory: scrapingHistoryRouter,
  progress: progressRouter,
  scrapingCharts: scrapingChartsRouter,
  scraperPipeline: pipelineRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Documents API
  documents: router({
    /**
     * Lấy danh sách tài liệu với phân trang
     */
    list: protectedProcedure
      .input(
        z.object({
          limit: z.number().default(20),
          offset: z.number().default(0),
          status: z.enum(["pending", "downloaded", "failed"]).optional(),
        })
      )
      .query(async ({ input }) => {
        const { documents, total } = await getDocuments(
          input.limit,
          input.offset,
          input.status,
        );
        return { documents, total };
      }),

    /**
     * Lấy chi tiết một tài liệu
     */
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const document = await getDocumentById(input.id);
        return document;
      }),

    /**
     * Tìm kiếm tài liệu
     */
    search: protectedProcedure
      .input(
        z.object({
          query: z.string(),
          limit: z.number().default(20),
        })
      )
      .query(async ({ input }) => {
        const { documents } = await searchDocuments(input.query, input.limit, 0);
        return documents;
      }),

    create: protectedProcedure
      .input(
        z.object({
          documentNumber: z.string().min(1),
          title: z.string().min(1),
          documentType: z.string().optional(),
          issuingAgency: z.string().optional(),
          issueDate: z.string().optional(),
          signer: z.string().optional(),
          fileUrl: z.string().url().optional(),
          fileName: z.string().optional(),
          summary: z.string().optional(),
          detailUrl: z.string().url().optional(),
          notes: z.string().optional(),
          tags: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const customsDocId = deriveCustomsDocId(input.detailUrl, input.documentNumber);
        const tags = input.tags
          ? input.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [];

        const record = await upsertDocument({
          documentNumber: input.documentNumber.normalize("NFC"),
          customsDocId,
          title: input.title.normalize("NFC"),
          documentType: input.documentType?.normalize("NFC"),
          issuingAgency: input.issuingAgency?.normalize("NFC"),
          issueDate: input.issueDate,
          signer: input.signer?.normalize("NFC"),
          fileUrl: input.fileUrl,
          fileName: input.fileName,
          summary: input.summary?.normalize("NFC"),
          detailUrl: input.detailUrl,
          notes: input.notes?.normalize("NFC"),
          tags: tags.length > 0 ? JSON.stringify(tags) : null,
          status: "pending",
          processedStatus: "new",
        });

        if (!record) {
          throw new Error("Không thể lưu tài liệu mới");
        }

        return {
          success: true,
          document: record,
        } as const;
      }),
  }),

  // Scraper API
  scraper: router({
    /**
     * Chạy scraper thủ công
     */
    runManual: protectedProcedure
      .input(
        z.object({
          maxPages: z.number().default(1),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new Error("Unauthorized");
        }

        try {
          let startDate: Date | undefined;
          let endDate: Date | undefined;
          
          if (input.startDate) {
            startDate = new Date(input.startDate);
          }
          if (input.endDate) {
            endDate = new Date(input.endDate);
            endDate.setHours(23, 59, 59, 999);
          }
          
          const result = await scrapeCustomsData(input.maxPages, ctx.user.id, startDate, endDate);
          return {
            success: result.success,
            logId: result.logId,
            count: result.count,
          };
        } catch (error) {
          console.error("[API] Error running scraper:", error);
          throw new Error("Failed to run scraper");
        }
      }),

    /**
     * Lấy lịch sử thu thập
     */
    getLogs: protectedProcedure
      .input(
        z.object({
          limit: z.number().default(20),
        })
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new Error("Unauthorized");
        }

        const logs = await getScrapeLogs(ctx.user.id, input.limit);
        return logs;
      }),
  }),

  // Schedule API
  schedules: router({
    /**
     * Lấy danh sách lập lịch
     */
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) {
        throw new Error("Unauthorized");
      }

      const schedules = await getScrapeSchedules(ctx.user.id);
      return schedules;
    }),

    /**
     * Tạo lập lịch mới
     */
    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          cronExpression: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new Error("Unauthorized");
        }

        try {
          const result = await createScrapeSchedule({
            userId: ctx.user.id,
            name: input.name,
            cronExpression: input.cronExpression,
            isActive: 1,
          });

          if (result && (result as any).id) {
            createScheduledTask(
              (result as any).id,
              input.cronExpression,
              ctx.user.id
            );
          }

          return { success: true, data: result };
        } catch (error) {
          console.error("[API] Error creating schedule:", error);
          throw new Error("Failed to create schedule");
        }
      }),

    /**
     * Cập nhật lập lịch
     */
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          cronExpression: z.string().optional(),
          isActive: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new Error("Unauthorized");
        }

        try {
          const result = await updateScrapeSchedule(input.id, {
            name: input.name,
            cronExpression: input.cronExpression,
            isActive: input.isActive,
          });

          if (input.cronExpression) {
            updateScheduledTask(
              input.id,
              input.cronExpression,
              ctx.user.id
            );
          }

          return { success: true, data: result };
        } catch (error) {
          console.error("[API] Error updating schedule:", error);
          throw new Error("Failed to update schedule");
        }
      }),

    /**
     * Xóa lập lịch
     */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new Error("Unauthorized");
        }

        try {
          stopScheduledTask(input.id);
          const result = await deleteScrapeSchedule(input.id);
          return { success: result };
        } catch (error) {
          console.error("[API] Error deleting schedule:", error);
          throw new Error("Failed to delete schedule");
        }
      }),
  }),

  // Export API
  export: router({
    /**
     * Lấy danh sách tài liệu được chọn để export
     */
    getSelections: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) {
        throw new Error("Unauthorized");
      }

      const selections = await getExportSelections(ctx.user.id);
      return selections;
    }),

    /**
     * Thêm tài liệu vào danh sách export
     */
    addSelection: protectedProcedure
      .input(z.object({ documentId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new Error("Unauthorized");
        }

        try {
          const result = await addToExportSelection(ctx.user.id, input.documentId);
          return { success: result };
        } catch (error) {
          console.error("[API] Error adding to export selection:", error);
          throw new Error("Failed to add to export selection");
        }
      }),

    /**
     * Xóa tài liệu khỏi danh sách export
     */
    removeSelection: protectedProcedure
      .input(z.object({ documentId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new Error("Unauthorized");
        }

        try {
          const result = await removeFromExportSelection(ctx.user.id, input.documentId);
          return { success: result };
        } catch (error) {
          console.error("[API] Error removing from export selection:", error);
          throw new Error("Failed to remove from export selection");
        }
      }),

    /**
     * Xóa tất cả danh sách export
     */
    clearSelections: protectedProcedure.mutation(async ({ ctx }) => {
      if (!ctx.user) {
        throw new Error("Unauthorized");
      }

      try {
        const result = await clearExportSelections(ctx.user.id);
        return { success: result };
      } catch (error) {
        console.error("[API] Error clearing export selections:", error);
        throw new Error("Failed to clear export selections");
      }
    }),

    /**
     * Export dữ liệu ra Excel
     */
    toExcel: protectedProcedure.mutation(async ({ ctx }) => {
      if (!ctx.user) {
        throw new Error("Unauthorized");
      }

      try {
        const selections = await getExportSelections(ctx.user.id);
        // TODO: Implement Excel export
        return { success: true, url: "" };
      } catch (error) {
        console.error("[API] Error exporting to Excel:", error);
        throw new Error("Failed to export to Excel");
      }
    }),

    /**
     * Export dữ liệu ra JSON
     */
    toJson: protectedProcedure.mutation(async ({ ctx }) => {
      if (!ctx.user) {
        throw new Error("Unauthorized");
      }

      try {
        const selections = await getExportSelections(ctx.user.id);
        return { success: true, data: selections };
      } catch (error) {
        console.error("[API] Error exporting to JSON:", error);
        throw new Error("Failed to export to JSON");
      }
    }),

    /**
     * Export dữ liệu ra CSV
     */
    toCsv: protectedProcedure.mutation(async ({ ctx }) => {
      if (!ctx.user) {
        throw new Error("Unauthorized");
      }

      try {
        const selections = await getExportSelections(ctx.user.id);
        // TODO: Implement CSV export
        return { success: true, url: "" };
      } catch (error) {
        console.error("[API] Error exporting to CSV:", error);
        throw new Error("Failed to export to CSV");
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
