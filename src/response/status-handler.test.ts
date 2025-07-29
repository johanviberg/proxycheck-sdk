import { describe, expect, it } from "@jest/globals";
import { ProxyCheckAPIError, ProxyCheckError, ProxyCheckRateLimitError } from "../errors";
import {
  createErrorResponse,
  createResponseWithWarnings,
  createSuccessResponse,
  DEFAULT_STATUS_OPTIONS,
  ResponseStatusHandler,
  unwrapResponse,
  unwrapResponseWithStatus,
  validateApiKeyResponse,
  validateResponse,
} from "./status-handler";

describe("Response Status Handler", () => {
  describe("ResponseStatusHandler", () => {
    let handler: ResponseStatusHandler;

    beforeEach(() => {
      handler = new ResponseStatusHandler();
    });

    describe("constructor", () => {
      it("should use default options", () => {
        const defaultHandler = new ResponseStatusHandler();
        expect(defaultHandler).toBeDefined();
      });

      it("should accept custom options", () => {
        const customHandler = new ResponseStatusHandler({
          throwOnError: false,
          includeWarnings: false,
        });
        expect(customHandler).toBeDefined();
      });
    });

    describe("handleResponse", () => {
      it("should handle successful response", () => {
        const response = {
          "8.8.8.8": {
            proxy: "no",
            type: "IPv4",
            risk: 0,
          },
        };

        const result = handler.handleResponse(response, "req-123");

        expect(result.data).toEqual(response);
        expect(result.status.success).toBe(true);
        expect(result.status.requestId).toBe("req-123");
        expect(result.raw).toEqual(response);
      });

      it("should handle error response", () => {
        const response = {
          status: "error",
          message: "Invalid API key",
          code: 401,
        };

        expect(() => {
          handler.handleResponse(response, "req-123");
        }).toThrow(ProxyCheckAPIError);
      });

      it("should handle warning response", () => {
        const response = {
          status: "warning",
          message: "Approaching rate limit",
          "8.8.8.8": {
            proxy: "no",
            type: "IPv4",
            risk: 0,
          },
        };

        const result = handler.handleResponse(response, "req-123");

        expect(result.status.success).toBe(true);
        expect(result.status.warnings).toContain("Approaching rate limit");
      });

      it("should handle response with error field", () => {
        const response = {
          error: "Invalid request format",
          code: 400,
        };

        expect(() => {
          handler.handleResponse(response, "req-123");
        }).toThrow(ProxyCheckAPIError);
      });

      it("should handle response with rate limit headers", () => {
        const response = {
          "8.8.8.8": {
            proxy: "no",
            type: "IPv4",
            risk: 0,
          },
          "x-ratelimit-limit": "1000",
          "x-ratelimit-remaining": "950",
          "x-ratelimit-reset": "1640995200",
          "retry-after": "60",
        };

        const result = handler.handleResponse(response, "req-123");

        expect(result.status.rateLimitInfo).toEqual({
          limit: 1000,
          remaining: 950,
          reset: new Date(1640995200 * 1000),
          retryAfter: 60,
        });
      });

      it("should not throw when throwOnError is false", () => {
        const nonThrowingHandler = new ResponseStatusHandler({
          throwOnError: false,
        });

        const response = {
          status: "error",
          message: "Test error",
        };

        const result = nonThrowingHandler.handleResponse(response, "req-123");

        expect(result.status.success).toBe(false);
        expect(result.status.error).toBeInstanceOf(ProxyCheckAPIError);
      });
    });

    describe("handleError", () => {
      it("should handle generic error", () => {
        const error = new Error("Network error");

        expect(() => {
          handler.handleError(error, "req-123");
        }).toThrow();
      });

      it("should handle rate limit error", () => {
        const rateLimitError = new ProxyCheckRateLimitError(
          "Rate limit exceeded",
          1000,
          0,
          new Date(Date.now() + 3600000),
          60,
        );

        expect(() => {
          handler.handleError(rateLimitError, "req-123");
        }).toThrow(ProxyCheckError);
      });

      it("should not throw when throwOnError is false", () => {
        const nonThrowingHandler = new ResponseStatusHandler({
          throwOnError: false,
        });

        const error = new Error("Test error");
        const result = nonThrowingHandler.handleError(error, "req-123");

        expect(result.status.success).toBe(false);
        expect(result.status.error).toBeDefined();
      });
    });
  });

  // Note: Utility functions like isSuccess, extractWarnings, extractRequestId are not exported
  // They are internal implementation details of the ResponseStatusHandler class

  describe("Response creators", () => {
    describe("createSuccessResponse", () => {
      it("should create successful response", () => {
        const data = { test: "data" };
        const response = createSuccessResponse(data, "req-123");

        expect(response.data).toEqual(data);
        expect(response.status.success).toBe(true);
        expect(response.status.requestId).toBe("req-123");
        expect(response.raw).toEqual(data);
      });

      it("should create response without request ID", () => {
        const data = { test: "data" };
        const response = createSuccessResponse(data);

        expect(response.data).toEqual(data);
        expect(response.status.success).toBe(true);
        expect(response.status.requestId).toBeUndefined();
      });
    });

    describe("createErrorResponse", () => {
      it("should create error response", () => {
        const error = new ProxyCheckError("Test error", "TEST_ERROR", 400);
        const response = createErrorResponse(error, "req-123");

        expect(response.status.success).toBe(false);
        expect(response.status.error).toBe(error);
        expect(response.status.requestId).toBe("req-123");
        expect(response.status.statusCode).toBe(400);
        expect(response.raw).toBe(error);
      });
    });

    describe("createResponseWithWarnings", () => {
      it("should create response with warnings", () => {
        const data = { test: "data" };
        const warnings = ["Warning 1", "Warning 2"];
        const response = createResponseWithWarnings(data, warnings, "req-123");

        expect(response.data).toEqual(data);
        expect(response.status.success).toBe(true);
        expect(response.status.warnings).toEqual(warnings);
        expect(response.status.requestId).toBe("req-123");
      });
    });
  });

  describe("Response unwrappers", () => {
    describe("unwrapResponse", () => {
      it("should unwrap successful response", () => {
        const data = { test: "data" };
        const envelope = createSuccessResponse(data);

        const result = unwrapResponse(envelope);
        expect(result).toEqual(data);
      });

      it("should throw for error response", () => {
        const error = new ProxyCheckError("Test error", "TEST_ERROR");
        const envelope = createErrorResponse(error);

        expect(() => {
          unwrapResponse(envelope);
        }).toThrow(ProxyCheckError);
      });

      it("should throw for undefined data", () => {
        const envelope = {
          status: { success: true },
          raw: null,
        };

        expect(() => {
          unwrapResponse(envelope);
        }).toThrow("Response data is undefined");
      });
    });

    describe("unwrapResponseWithStatus", () => {
      it("should unwrap response with warnings", () => {
        const data = { test: "data" };
        const warnings = ["Warning 1"];
        const envelope = createResponseWithWarnings(data, warnings);

        const result = unwrapResponseWithStatus(envelope);
        expect(result.data).toEqual(data);
        expect(result.warnings).toEqual(warnings);
      });

      it("should unwrap response without warnings", () => {
        const data = { test: "data" };
        const envelope = createSuccessResponse(data);

        const result = unwrapResponseWithStatus(envelope);
        expect(result.data).toEqual(data);
        expect(result.warnings).toBeUndefined();
      });
    });
  });

  describe("Validators", () => {
    describe("validateResponse", () => {
      it("should validate correct response", () => {
        const response = {
          "8.8.8.8": {
            proxy: "no",
            type: "IPv4",
          },
        };

        const result = validateResponse(response);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it("should reject null response", () => {
        const result = validateResponse(null);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Response is null or undefined");
      });

      it("should reject non-object response", () => {
        const result = validateResponse("string");
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Response must be an object");
      });

      it("should reject error response without message", () => {
        const response = {
          status: "error",
        };

        const result = validateResponse(response);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Error response must have a message or error field");
      });
    });

    describe("validateApiKeyResponse", () => {
      it("should validate correct API key response", () => {
        const response = {
          "8.8.8.8": {
            proxy: "no",
          },
        };

        expect(validateApiKeyResponse(response)).toBe(true);
      });

      it("should reject authentication error", () => {
        const response = {
          status: "error",
          message: "Invalid API key",
        };

        expect(validateApiKeyResponse(response)).toBe(false);
      });

      it("should reject API key error message", () => {
        const response = {
          error: "Invalid API key provided",
        };

        expect(validateApiKeyResponse(response)).toBe(false);
      });

      it("should reject authentication error message", () => {
        const response = {
          error: "Authentication failed",
        };

        expect(validateApiKeyResponse(response)).toBe(false);
      });

      it("should accept other error messages", () => {
        const response = {
          error: "Rate limit exceeded",
        };

        expect(validateApiKeyResponse(response)).toBe(true);
      });

      it("should reject non-object response", () => {
        expect(validateApiKeyResponse(null)).toBe(false);
        expect(validateApiKeyResponse("string")).toBe(false);
      });
    });
  });

  describe("DEFAULT_STATUS_OPTIONS", () => {
    it("should have correct default values", () => {
      expect(DEFAULT_STATUS_OPTIONS).toEqual({
        throwOnError: true,
        includeWarnings: true,
        retryOnRateLimit: false,
        maxRetries: 3,
      });
    });
  });
});
