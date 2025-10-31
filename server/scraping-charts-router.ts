import { router, publicProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { scrapeLogs } from "../drizzle/schema";
import { sql, and, gte, lte } from "drizzle-orm";

export const scrapingChartsRouter = router({
  // Lấy xu hướng 7 ngày gần đây
  getTrend: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const logs = await db
      .select({
        date: sql`DATE(${scrapeLogs.startTime})`.as("date"),
        total: sql`COUNT(*)`.as("total"),
        success: sql`SUM(CASE WHEN ${scrapeLogs.status} = 'completed' THEN 1 ELSE 0 END)`.as(
          "success"
        ),
        failed: sql`SUM(CASE WHEN ${scrapeLogs.status} = 'failed' THEN 1 ELSE 0 END)`.as(
          "failed"
        ),
      })
      .from(scrapeLogs)
      .where(gte(scrapeLogs.startTime, sevenDaysAgo))
      .groupBy(sql`DATE(${scrapeLogs.startTime})`)
      .orderBy(sql`DATE(${scrapeLogs.startTime})`);

    return logs.map((log: any) => ({
      date: log.date || "N/A",
      total: Number(log.total) || 0,
      success: Number(log.success) || 0,
      failed: Number(log.failed) || 0,
    }));
  }),

  // Lấy phân bố loại scraping
  getTypeDistribution: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const distribution = await db
      .select({
        type: scrapeLogs.scrapeType,
        count: sql`COUNT(*)`.as("count"),
      })
      .from(scrapeLogs)
      .groupBy(scrapeLogs.scrapeType);

    return distribution.map((item: any) => ({
      name: item.type === "manual" ? "Thủ Công" : "Tự Động",
      value: Number(item.count) || 0,
      type: item.type,
    }));
  }),

  // Lấy phân bố trạng thái
  getStatusDistribution: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const distribution = await db
      .select({
        status: scrapeLogs.status,
        count: sql`COUNT(*)`.as("count"),
      })
      .from(scrapeLogs)
      .groupBy(scrapeLogs.status);

    const statusMap: Record<string, string> = {
      completed: "Thành Công",
      failed: "Thất Bại",
      running: "Đang Chạy",
    };

    const colorMap: Record<string, string> = {
      completed: "#10b981",
      failed: "#ef4444",
      running: "#3b82f6",
    };

    return distribution.map((item: any) => ({
      name: statusMap[item.status] || item.status,
      value: Number(item.count) || 0,
      status: item.status,
      fill: colorMap[item.status] || "#6b7280",
    }));
  }),

  // Lấy thống kê tài liệu
  getDocumentStats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { found: 0, downloaded: 0, pending: 0 };

    const stats = await db
      .select({
        totalFound: sql`SUM(${scrapeLogs.documentsFound})`.as("totalFound"),
        totalDownloaded: sql`SUM(${scrapeLogs.documentsDownloaded})`.as(
          "totalDownloaded"
        ),
      })
      .from(scrapeLogs);

    const result = stats[0];
    return {
      found: Number(result?.totalFound) || 0,
      downloaded: Number(result?.totalDownloaded) || 0,
      pending: Math.max(0, (Number(result?.totalFound) || 0) - (Number(result?.totalDownloaded) || 0)),
    };
  }),

  // Lấy thống kê tổng hợp
  getOverallStats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, completed: 0, failed: 0, running: 0, successRate: 0, totalDocuments: 0, totalDownloaded: 0 };

    const stats = await db
      .select({
        total: sql`COUNT(*)`.as("total"),
        completed: sql`SUM(CASE WHEN ${scrapeLogs.status} = 'completed' THEN 1 ELSE 0 END)`.as(
          "completed"
        ),
        failed: sql`SUM(CASE WHEN ${scrapeLogs.status} = 'failed' THEN 1 ELSE 0 END)`.as(
          "failed"
        ),
        running: sql`SUM(CASE WHEN ${scrapeLogs.status} = 'running' THEN 1 ELSE 0 END)`.as(
          "running"
        ),
        totalDocuments: sql`SUM(${scrapeLogs.documentsFound})`.as("totalDocuments"),
        totalDownloaded: sql`SUM(${scrapeLogs.documentsDownloaded})`.as(
          "totalDownloaded"
        ),
      })
      .from(scrapeLogs);

    const result = stats[0];
    const total = Number(result?.total) || 0;
    const completed = Number(result?.completed) || 0;
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      failed: Number(result?.failed) || 0,
      running: Number(result?.running) || 0,
      successRate,
      totalDocuments: Number(result?.totalDocuments) || 0,
      totalDownloaded: Number(result?.totalDownloaded) || 0,
    };
  }),

  // Lấy top 10 ngày có nhiều scraping nhất
  getTopDays: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const logs = await db
      .select({
        date: sql`DATE(${scrapeLogs.startTime})`.as("date"),
        count: sql`COUNT(*)`.as("count"),
        documents: sql`SUM(${scrapeLogs.documentsFound})`.as("documents"),
      })
      .from(scrapeLogs)
      .groupBy(sql`DATE(${scrapeLogs.startTime})`)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);

    return logs.map((log: any) => ({
      date: log.date || "N/A",
      scrapes: Number(log.count) || 0,
      documents: Number(log.documents) || 0,
    }));
  }),
});
