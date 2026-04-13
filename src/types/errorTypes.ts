// ============================================================================
// ERROR TYPES - Simple & Type-Safe
// ============================================================================
// Industry standard: Simple interfaces, no unnecessary abstraction
// ============================================================================

/**
 * Structured error from API
 */
export interface ApiError {
  message: string;
  statusCode?: number;
  errorCode?: string;
}

/**
 * User-friendly error messages by status code
 * Industry standard: Simple object mapping
 */
export const ERROR_MESSAGES: Record<number, string> = {
  // Client errors
  400: "Please check your input and try again.",
  401: "Please log in to continue.",
  403: "You don't have permission to do this.",
  404: "We couldn't find what you're looking for.",
  408: "Request timed out. Please try again.",
  429: "Too many requests. Please wait a moment.",

  // Server errors
  500: "Something went wrong on our end. Please try again.",
  502: "Service temporarily unavailable.",
  503: "Service temporarily unavailable.",
  504: "Request took too long. Please try again.",
};

/**
 * Get user-friendly error message
 * Simple function - no class needed
 */
export function getErrorMessage(error: ApiError): string {
  // Network errors
  if (!error.statusCode) {
    return "Unable to connect. Please check your internet connection.";
  }

  // Mapped status codes
  if (ERROR_MESSAGES[error.statusCode]) {
    return ERROR_MESSAGES[error.statusCode];
  }

  // Fallback
  return error.message || "An error occurred. Please try again.";
}

/**
 * Get alert severity for MUI
 */
export function getErrorSeverity(statusCode?: number): "error" | "warning" | "info" {
  if (!statusCode || statusCode >= 500) return "error";
  if (statusCode === 404) return "info";
  return "warning";
}

/**
 * Throwable wrapper around ApiError.
 * ESLint only-throw-error requires throwing Error instances — plain objects
 * (like ApiError) are not allowed. This class bridges the two.
 */
export class ApiServiceError extends Error {
  readonly statusCode?: number;
  readonly errorCode?: string;

  constructor(apiError: ApiError) {
    super(apiError.message);
    this.name = "ApiServiceError";
    this.statusCode = apiError.statusCode;
    this.errorCode = apiError.errorCode;
  }
}
