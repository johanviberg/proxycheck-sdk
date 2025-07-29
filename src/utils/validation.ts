/**
 * Validation utility functions
 */

import type { Logger } from "../logging";
import { getErrorDetails } from "./error";

/**
 * Type for Zod error structure
 */
interface ZodErrorItem {
  path?: Array<string | number>;
  message?: string;
}

/**
 * Type for objects with Zod error structure
 */
interface ZodLikeError {
  errors: Array<ZodErrorItem>;
}

/**
 * Extract Zod validation errors and log them
 * @param error - The error object (possibly a ZodError)
 * @param logger - Optional logger for debugging
 * @returns Array of validation errors or undefined
 */
export function extractZodErrors(
  error: unknown,
  logger?: Logger,
): Array<{ path: string; message: string }> | undefined {
  if (error && typeof error === "object" && "errors" in error && Array.isArray(error.errors)) {
    const zodError = error as ZodLikeError;
    const validationErrors = zodError.errors.map((e) => ({
      path: e.path?.join(".") || "unknown",
      message: e.message || "Validation error",
    }));

    // Log validation details for debugging
    if (logger) {
      logger.debug("Validation failed", {
        errorType: "ZodError",
        errors: validationErrors,
        details: getErrorDetails(error),
      });
    }

    return validationErrors;
  }

  // Log non-Zod errors
  if (logger) {
    logger.debug("Validation failed with non-Zod error", getErrorDetails(error));
  }

  return undefined;
}
