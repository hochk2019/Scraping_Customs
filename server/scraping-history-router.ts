import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  getAllScrapeLogs,
  getScrapingStatistics,
  getScrapingTrend,
  getScrapingDetail,
  deleteScrapeLog,
} from "./db";

/**
 * Scraping History Router
 * Cung cấp API endpoints cho admin dashboard quản lý lịch sử scraping
 */

export const scrapingHistoryRouter = router({
  /**
   * Lấy danh sách tất cả scraping logs với lọc và phân trang
   * GET /scraping-history/list
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
        status: z.enum(["running", "completed", "failed"]).optional(),
        scrapeType: z.enum(["manual", "scheduled"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Chỉ admin mới có quyền xem
      if (ctx.user?.role !== "admin") {
        throw new Error("Unauthorized: Only admin can view scraping history");
      }

      const result = await getAllScrapeLogs(input.limit, input.offset, {
        status: input.status,
        scrapeType: input.scrapeType,
        startDate: input.startDate,
        endDate: input.endDate,
      });

      return {
        logs: result.logs,
        total: result.total,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Lấy thống kê tổng hợp scraping history
   * GET /scraping-history/statistics
   */
  statistics: protectedProcedure.query(async ({ ctx }) => {
    // Chỉ admin mới có quyền xem
    if (ctx.user?.role !== "admin") {
      throw new Error("Unauthorized: Only admin can view statistics");
    }

    const stats = await getScrapingStatistics();
    return stats || {
      totalScrapes: 0,
      successfulScrapes: 0,
      failedScrapes: 0,
      successRate: 0,
      totalDocumentsFound: 0,
      totalDocumentsDownloaded: 0,
      typeDistribution: [],
    };
  }),

  /**
   * Lấy xu hướng scraping (7 ngày gần đây)
   * GET /scraping-history/trend
   */
  trend: protectedProcedure.query(async ({ ctx }) => {
    // Chỉ admin mới có quyền xem
    if (ctx.user?.role !== "admin") {
      throw new Error("Unauthorized: Only admin can view trend");
    }

    const trend = await getScrapingTrend();
    return trend || [];
  }),

  /**
   * Lấy chi tiết một lần scraping
   * GET /scraping-history/detail/:id
   */
  detail: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      // Chỉ admin mới có quyền xem
      if (ctx.user?.role !== "admin") {
        throw new Error("Unauthorized: Only admin can view detail");
      }

      const detail = await getScrapingDetail(input.id);
      if (!detail) {
        throw new Error("Scraping log not found");
      }

      return detail;
    }),

  /**
   * Xóa một lần scraping
   * DELETE /scraping-history/:id
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Chỉ admin mới có quyền xóa
      if (ctx.user?.role !== "admin") {
        throw new Error("Unauthorized: Only admin can delete");
      }

      const success = await deleteScrapeLog(input.id);
      if (!success) {
        throw new Error("Failed to delete scraping log");
      }

      return {
        success: true,
        message: "Scraping log deleted successfully",
      };
    }),

  /**
   * Lấy tổng số scraping logs
   * GET /scraping-history/count
   */
  count: protectedProcedure.query(async ({ ctx }) => {
    // Chỉ admin mới có quyền xem
    if (ctx.user?.role !== "admin") {
      throw new Error("Unauthorized: Only admin can view count");
    }

    const result = await getAllScrapeLogs(1, 0);
    return {
      total: result.total,
    };
  }),
});
