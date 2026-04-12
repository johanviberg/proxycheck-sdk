/**
 * Helper to remove undefined values from an object for exactOptionalPropertyTypes
 */
export function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const result = {} as T;
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key as keyof T] = value as T[keyof T];
    }
  }
  return result;
}

/**
 * Redact the API key query parameter from a URL string before logging
 */
export function redactUrl(url: string | undefined): string {
  if (!url) {
    return "";
  }
  return url.replace(/([?&])key=[^&]*/g, "$1key=[REDACTED]");
}

/**
 * Redact sensitive fields from a config object for error reporting
 */
export function redactConfig<T extends Record<string, unknown>>(config: T): T {
  const redacted = { ...config };
  // biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket notation
  if ("apiKey" in redacted && typeof redacted["apiKey"] === "string") {
    redacted["apiKey" as keyof T] = "[REDACTED]" as T[keyof T];
  }
  return redacted;
}
