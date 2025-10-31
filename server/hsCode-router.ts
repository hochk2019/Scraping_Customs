import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  searchHsCodeByCode,
  searchHsCodeByName,
  getPopularHsCodes,
  getHsCodesByDocument,
  getAllHsCodes,
  getHsCodeStatistics,
} from "./db";

export const hsCodeRouter = router({
  searchByCode: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      try {
        const result = await searchHsCodeByCode(input.code);
        return result;
      } catch (error) {
        console.error("[API] Error searching HS code by code:", error);
        throw new Error("Failed to search HS code");
      }
    }),

  searchByName: publicProcedure
    .input(z.object({ query: z.string(), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      try {
        const results = await searchHsCodeByName(input.query, input.limit);
        return results;
      } catch (error) {
        console.error("[API] Error searching HS code by name:", error);
        throw new Error("Failed to search HS codes");
      }
    }),

  getPopular: publicProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ input }) => {
      try {
        const results = await getPopularHsCodes(input.limit);
        return results;
      } catch (error) {
        console.error("[API] Error getting popular HS codes:", error);
        throw new Error("Failed to get popular HS codes");
      }
    }),

  getByDocument: publicProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ input }) => {
      try {
        const results = await getHsCodesByDocument(input.documentId);
        return results;
      } catch (error) {
        console.error("[API] Error getting HS codes by document:", error);
        throw new Error("Failed to get HS codes");
      }
    }),

  getAll: publicProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      try {
        const result = await getAllHsCodes(input.limit, input.offset);
        return result;
      } catch (error) {
        console.error("[API] Error getting all HS codes:", error);
        throw new Error("Failed to get HS codes");
      }
    }),

  getStatistics: publicProcedure.query(async () => {
    try {
      const result = await getHsCodeStatistics();
      return result;
    } catch (error) {
      console.error("[API] Error getting HS code statistics:", error);
      throw new Error("Failed to get statistics");
    }
  }),
});
