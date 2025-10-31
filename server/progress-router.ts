import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";

// Global progress state
export interface ScrapingProgressState {
  totalItems: number;
  processedItems: number;
  successItems: number;
  failedItems: number;
  currentItem?: string;
  currentStage?: string; // 'fetching', 'parsing', 'downloading', 'ocr'
  errors: Array<{
    item: string;
    stage: string;
    error: string;
    timestamp: number;
    retryCount: number;
  }>;
  startTime?: number;
  endTime?: number;
  isRunning: boolean;
}

// Global state
let progressState: ScrapingProgressState = {
  totalItems: 0,
  processedItems: 0,
  successItems: 0,
  failedItems: 0,
  errors: [],
  isRunning: false,
};

export function getProgressState(): ScrapingProgressState {
  return progressState;
}

export function setProgressState(state: Partial<ScrapingProgressState>) {
  progressState = { ...progressState, ...state };
}

export function resetProgressState() {
  progressState = {
    totalItems: 0,
    processedItems: 0,
    successItems: 0,
    failedItems: 0,
    errors: [],
    isRunning: false,
  };
}

export function addProgressError(
  item: string,
  stage: string,
  error: string,
  retryCount: number = 0
) {
  progressState.errors.push({
    item,
    stage,
    error,
    timestamp: Date.now(),
    retryCount,
  });
}

export function updateProgress(partial: Partial<ScrapingProgressState>) {
  progressState = { ...progressState, ...partial };
}

export const progressRouter = router({
  // Get current progress
  getProgress: publicProcedure.query(() => {
    return progressState;
  }),

  // Get progress percentage
  getPercentage: publicProcedure.query(() => {
    if (progressState.totalItems === 0) return 0;
    return Math.round(
      (progressState.processedItems / progressState.totalItems) * 100
    );
  }),

  // Get errors
  getErrors: publicProcedure.query(() => {
    return progressState.errors;
  }),

  // Get errors by stage
  getErrorsByStage: publicProcedure
    .input(z.object({ stage: z.string() }))
    .query(({ input }: { input: { stage: string } }) => {
      return progressState.errors.filter((e) => e.stage === input.stage);
    }),

  // Get success rate
  getSuccessRate: publicProcedure.query(() => {
    if (progressState.totalItems === 0) return 0;
    return Math.round(
      (progressState.successItems / progressState.totalItems) * 100
    );
  }),

  // Get stats
  getStats: publicProcedure.query(() => {
    const duration = progressState.endTime
      ? progressState.endTime - (progressState.startTime || 0)
      : Date.now() - (progressState.startTime || 0);

    return {
      totalItems: progressState.totalItems,
      processedItems: progressState.processedItems,
      successItems: progressState.successItems,
      failedItems: progressState.failedItems,
      successRate: progressState.totalItems
        ? Math.round((progressState.successItems / progressState.totalItems) * 100)
        : 0,
      percentage: progressState.totalItems
        ? Math.round((progressState.processedItems / progressState.totalItems) * 100)
        : 0,
      errorCount: progressState.errors.length,
      duration: Math.round(duration / 1000), // seconds
      isRunning: progressState.isRunning,
    };
  }),

  // Reset progress
  resetProgress: publicProcedure.mutation(() => {
    resetProgressState();
    return { success: true };
  }),
});
