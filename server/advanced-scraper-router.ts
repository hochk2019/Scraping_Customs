import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { scrapeByDateRange } from "./advanced-scraper";

/**
 * Advanced Scraper Router
 * Cung cấp API endpoints cho advanced web scraper
 */

export const advancedScraperRouter = router({
  /**
   * Scrape dữ liệu theo khoảng thời gian
   * POST /scraper/scrapeByDateRange
   * Body: { fromDate: "dd/mm/yyyy", toDate: "dd/mm/yyyy", maxPages?: number }
   */
  scrapeByDateRange: publicProcedure
    .input(
      z.object({
        fromDate: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),
        toDate: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),
        maxPages: z.number().optional(),
        delay: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        console.log(
          `[API] Bắt đầu scraping từ ${input.fromDate} đến ${input.toDate}`
        );

        const documents = await scrapeByDateRange({
          fromDate: input.fromDate,
          toDate: input.toDate,
          maxPages: input.maxPages || 10,
          delay: input.delay || 1000,
        });

        console.log(`[API] Scraping thành công: ${documents.length} tài liệu`);

        return {
          success: true,
          message: `Thu thập thành công ${documents.length} tài liệu`,
          data: documents,
          count: documents.length,
        };
      } catch (error) {
        console.error("[API] Lỗi scraping:", error);
        return {
          success: false,
          message: `Lỗi scraping: ${error instanceof Error ? error.message : "Unknown error"}`,
          data: [],
          count: 0,
        };
      }
    }),

  /**
   * Lấy trạng thái scraper
   */
  getStatus: publicProcedure.query(async () => {
    return {
      status: "ready",
      message: "Scraper sẵn sàng",
    };
  }),
});
