import * as cron from "node-cron";
import { scrapeCustomsData } from "./scraper";
import { getScrapeSchedules, updateScrapeSchedule } from "./db";

/**
 * Quản lý lập lịch thu thập dữ liệu tự động
 */

interface ScheduledTask {
  id: number;
  task: cron.ScheduledTask | null;
}

const scheduledTasks = new Map<number, ScheduledTask>();

/**
 * Khởi động scheduler - gọi khi server khởi động
 */
export async function initializeScheduler() {
  console.log("[Scheduler] Initializing scheduler...");

  try {
    // Lấy tất cả các lập lịch từ database
    // TODO: Cần thêm hàm để lấy tất cả schedules (không chỉ của một user)
    // Tạm thời skip bước này, sẽ implement sau

    console.log("[Scheduler] Scheduler initialized successfully");
  } catch (error) {
    console.error("[Scheduler] Failed to initialize scheduler:", error);
  }
}

/**
 * Tạo một scheduled task mới
 */
export function createScheduledTask(
  scheduleId: number,
  cronExpression: string,
  userId: number
): boolean {
  try {
    // Kiểm tra xem task đã tồn tại chưa
    if (scheduledTasks.has(scheduleId)) {
      console.warn(
        `[Scheduler] Task ${scheduleId} already exists, stopping old task`
      );
      stopScheduledTask(scheduleId);
    }

    // Tạo task mới
    const task = cron.schedule(cronExpression, async () => {
      console.log(`[Scheduler] Running scheduled task ${scheduleId}`);

      try {
        // Chạy scraper
        const result = await scrapeCustomsData(1, userId);

        if (result.success) {
          console.log(
            `[Scheduler] Task ${scheduleId} completed successfully. Found: ${result.count}`
          );
        } else {
          console.error(`[Scheduler] Task ${scheduleId} failed`);
        }

        // Cập nhật thời gian chạy lần cuối
        await updateScrapeSchedule(scheduleId, {
          lastRunAt: new Date(),
        });
      } catch (error) {
        console.error(`[Scheduler] Error running task ${scheduleId}:`, error);
      }
    });

    // Lưu task vào map
    scheduledTasks.set(scheduleId, {
      id: scheduleId,
      task,
    });

    console.log(
      `[Scheduler] Scheduled task ${scheduleId} created with cron: ${cronExpression}`
    );
    return true;
  } catch (error) {
    console.error(`[Scheduler] Failed to create scheduled task:`, error);
    return false;
  }
}

/**
 * Dừng một scheduled task
 */
export function stopScheduledTask(scheduleId: number): boolean {
  try {
    const scheduled = scheduledTasks.get(scheduleId);
    if (scheduled && scheduled.task) {
      scheduled.task.stop();
      scheduled.task.destroy();
      scheduledTasks.delete(scheduleId);
      console.log(`[Scheduler] Scheduled task ${scheduleId} stopped`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(
      `[Scheduler] Failed to stop scheduled task ${scheduleId}:`,
      error
    );
    return false;
  }
}

/**
 * Cập nhật một scheduled task
 */
export function updateScheduledTask(
  scheduleId: number,
  newCronExpression: string,
  userId: number
): boolean {
  try {
    // Dừng task cũ
    stopScheduledTask(scheduleId);

    // Tạo task mới với cron expression mới
    return createScheduledTask(scheduleId, newCronExpression, userId);
  } catch (error) {
    console.error(
      `[Scheduler] Failed to update scheduled task ${scheduleId}:`,
      error
    );
    return false;
  }
}

/**
 * Lấy trạng thái của một scheduled task
 */
export function getScheduledTaskStatus(scheduleId: number): {
  exists: boolean;
  isRunning: boolean;
} {
  const scheduled = scheduledTasks.get(scheduleId);
  return {
    exists: !!scheduled,
    isRunning: !!scheduled?.task,
  };
}

/**
 * Lấy danh sách tất cả scheduled tasks
 */
export function getAllScheduledTasks(): Array<{
  id: number;
  isRunning: boolean;
}> {
  const tasks: Array<{ id: number; isRunning: boolean }> = [];
  scheduledTasks.forEach((scheduled) => {
    tasks.push({
      id: scheduled.id,
      isRunning: !!scheduled.task,
    });
  });
  return tasks;
}

/**
 * Dừng tất cả scheduled tasks
 */
export function stopAllScheduledTasks(): void {
  console.log("[Scheduler] Stopping all scheduled tasks...");
  scheduledTasks.forEach((scheduled) => {
    if (scheduled.task) {
      scheduled.task.stop();
      scheduled.task.destroy();
    }
  });
  scheduledTasks.clear();
  console.log("[Scheduler] All scheduled tasks stopped");
}
