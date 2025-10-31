/**
 * Retry utilities for scraping
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number; // ms
  maxDelay?: number; // ms
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
}

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const maxRetries = options.maxRetries || 3;
  const initialDelay = options.initialDelay || 1000; // 1 second
  const maxDelay = options.maxDelay || 10000; // 10 seconds

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Retry] Attempt ${attempt}/${maxRetries}`);
      const data = await fn();
      return {
        success: true,
        data,
        attempts: attempt,
      };
    } catch (error) {
      lastError = error as Error;
      console.error(`[Retry] Attempt ${attempt} failed:`, lastError.message);

      // Check if error is retryable
      if (!isRetryableError(error)) {
        console.log("[Retry] Error is not retryable, giving up");
        return {
          success: false,
          error: lastError,
          attempts: attempt,
        };
      }

      // Calculate delay with exponential backoff
      if (attempt < maxRetries) {
        const delay = Math.min(
          initialDelay * Math.pow(2, attempt - 1),
          maxDelay
        );
        console.log(`[Retry] Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  return {
    success: false,
    error: lastError || new Error("Unknown error"),
    attempts: maxRetries,
  };
}

/**
 * Check if error is retryable (timeout, network errors, etc.)
 */
function isRetryableError(error: any): boolean {
  const message = error?.message?.toLowerCase() || "";
  const code = error?.code?.toLowerCase() || "";

  // Retryable errors
  const retryablePatterns = [
    "timeout",
    "econnrefused",
    "econnreset",
    "etimedout",
    "enotfound",
    "enetunreach",
    "ehostunreach",
    "callFunctionOn timed out",
    "Protocol error",
  ];

  return retryablePatterns.some(
    (pattern) => message.includes(pattern) || code.includes(pattern)
  );
}
