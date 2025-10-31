import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  getAllUsers,
  getUserStatistics,
  getUserActivity,
  updateUserRole,
  deleteUser,
  searchUsers,
  getUserActivityByDate,
  getUserDistributionByRole,
  getTopUsersByFeedback,
  getFeedbackStatisticsByType,
  getFeedbackStatisticsByStatus,
} from "./db";

export const adminRouter = router({
  getAllUsers: protectedProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") throw new Error("Unauthorized");
      try {
        return await getAllUsers(input.limit, input.offset);
      } catch (error) {
        console.error("[API] Error getting all users:", error);
        throw new Error("Failed to get users");
      }
    }),

  getUserStatistics: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user || ctx.user.role !== "admin") throw new Error("Unauthorized");
    try {
      return await getUserStatistics();
    } catch (error) {
      console.error("[API] Error getting user statistics:", error);
      throw new Error("Failed to get statistics");
    }
  }),

  getUserActivity: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") throw new Error("Unauthorized");
      try {
        return await getUserActivity(input.userId);
      } catch (error) {
        console.error("[API] Error getting user activity:", error);
        throw new Error("Failed to get activity");
      }
    }),

  updateUserRole: protectedProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") throw new Error("Unauthorized");
      try {
        const success = await updateUserRole(input.userId, input.role);
        return { success };
      } catch (error) {
        console.error("[API] Error updating user role:", error);
        throw new Error("Failed to update role");
      }
    }),

  deleteUser: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") throw new Error("Unauthorized");
      try {
        const success = await deleteUser(input.userId);
        return { success };
      } catch (error) {
        console.error("[API] Error deleting user:", error);
        throw new Error("Failed to delete user");
      }
    }),

  searchUsers: protectedProcedure
    .input(z.object({ query: z.string(), limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") throw new Error("Unauthorized");
      try {
        return await searchUsers(input.query, input.limit);
      } catch (error) {
        console.error("[API] Error searching users:", error);
        throw new Error("Failed to search users");
      }
    }),

  getUserActivityByDate: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user || ctx.user.role !== "admin") throw new Error("Unauthorized");
    try {
      return await getUserActivityByDate();
    } catch (error) {
      console.error("[API] Error getting user activity by date:", error);
      throw new Error("Failed to get activity data");
    }
  }),

  getUserDistributionByRole: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user || ctx.user.role !== "admin") throw new Error("Unauthorized");
    try {
      return await getUserDistributionByRole();
    } catch (error) {
      console.error("[API] Error getting user distribution:", error);
      throw new Error("Failed to get distribution data");
    }
  }),

  getTopUsersByFeedback: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user || ctx.user.role !== "admin") throw new Error("Unauthorized");
    try {
      return await getTopUsersByFeedback();
    } catch (error) {
      console.error("[API] Error getting top users:", error);
      throw new Error("Failed to get top users");
    }
  }),

  getFeedbackStatisticsByType: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user || ctx.user.role !== "admin") throw new Error("Unauthorized");
    try {
      return await getFeedbackStatisticsByType();
    } catch (error) {
      console.error("[API] Error getting feedback statistics:", error);
      throw new Error("Failed to get feedback statistics");
    }
  }),

  getFeedbackStatisticsByStatus: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user || ctx.user.role !== "admin") throw new Error("Unauthorized");
    try {
      return await getFeedbackStatisticsByStatus();
    } catch (error) {
      console.error("[API] Error getting feedback status statistics:", error);
      throw new Error("Failed to get status statistics");
    }
  }),
});
