// ============================================================================
// ERROR UTILITIES - KISS Principle
// ============================================================================

import type { ApiError } from "../types/errorTypes";
import { ApiServiceError } from "../types/errorTypes";

/**
 * Type guard for a parsed JSON body we care about
 */
function isApiBody(
  val: unknown
): val is { message?: string; error?: string; errorCode?: string; code?: string } {
  return typeof val === "object" && val !== null;
}

/**
 * Extract error from fetch Response
 */
export async function extractError(response: Response): Promise<ApiError> {
  const statusCode = response.status;
  let message = response.statusText;
  let errorCode: string | undefined;

  try {
    const data: unknown = await response.json(); // ✅ was implicitly any
    if (isApiBody(data)) {
      // ✅ narrow before access
      message = data.message ?? data.error ?? message;
      errorCode = data.errorCode ?? data.code;
    }
  } catch {
    // Response not JSON, use statusText
  }

  return { message, statusCode, errorCode };
}

/**
 * Handle any error and convert to ApiError
 */
export function handleError(error: unknown): ApiServiceError {
  // ✅ return type was ApiError
  if (error instanceof ApiServiceError) return error; // ✅ idempotent — don't double-wrap

  if (error && typeof error === "object" && "statusCode" in error) {
    return new ApiServiceError(error as ApiError);
  }

  if (error instanceof Error) {
    return new ApiServiceError({
      message: error.message,
      statusCode: error.name === "AbortError" ? 408 : undefined,
    });
  }

  return new ApiServiceError({ message: "An unexpected error occurred" });
}
