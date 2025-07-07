import { describe, expect, it } from "@jest/globals";
import { ERROR_CODES } from "../types/constants";
import {
  createErrorFromResponse,
  isProxyCheckError,
  isRateLimitError,
  isValidationError,
  ProxyCheckAPIError,
  ProxyCheckAuthenticationError,
  ProxyCheckError,
  ProxyCheckNetworkError,
  ProxyCheckRateLimitError,
  ProxyCheckTimeoutError,
  ProxyCheckValidationError,
} from "./index";

describe("Error Classes", () => {
  describe("ProxyCheckError", () => {
    it("should create base error with correct properties", () => {
      const error = new ProxyCheckError("Test error", "TEST_CODE", 500);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ProxyCheckError);
      expect(error.message).toBe("Test error");
      expect(error.code).toBe("TEST_CODE");
      expect(error.statusCode).toBe(500);
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.name).toBe("ProxyCheckError");
    });

    it("should serialize to JSON correctly", () => {
      const error = new ProxyCheckError("Test error", "TEST_CODE", 500);
      const json = error.toJSON();

      expect(json).toMatchObject({
        name: "ProxyCheckError",
        message: "Test error",
        code: "TEST_CODE",
        statusCode: 500,
      });
      expect(json.timestamp).toBeDefined();
      expect(json.stack).toBeDefined();
    });
  });

  describe("ProxyCheckAPIError", () => {
    it("should create API error from response", () => {
      const response = { status: "error", message: "API Error" };
      const error = ProxyCheckAPIError.fromResponse(400, response, "req-123");

      expect(error).toBeInstanceOf(ProxyCheckAPIError);
      expect(error.message).toBe("API Error");
      expect(error.statusCode).toBe(400);
      expect(error.response).toEqual(response);
      expect(error.requestId).toBe("req-123");
      expect(error.code).toBe(ERROR_CODES.API_ERROR);
    });
  });

  describe("ProxyCheckValidationError", () => {
    it("should create validation error with field details", () => {
      const validationErrors = [{ path: "apiKey", message: "Required" }];
      const error = new ProxyCheckValidationError(
        "Validation failed",
        "apiKey",
        undefined,
        validationErrors,
      );

      expect(error).toBeInstanceOf(ProxyCheckValidationError);
      expect(error.field).toBe("apiKey");
      expect(error.validationErrors).toEqual(validationErrors);
      expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    });
  });

  describe("ProxyCheckRateLimitError", () => {
    it("should create rate limit error with limit info", () => {
      const reset = new Date();
      const error = new ProxyCheckRateLimitError("Rate limit exceeded", 1000, 0, reset, 60);

      expect(error).toBeInstanceOf(ProxyCheckRateLimitError);
      expect(error.limit).toBe(1000);
      expect(error.remaining).toBe(0);
      expect(error.reset).toEqual(reset);
      expect(error.retryAfter).toBe(60);
      expect(error.statusCode).toBe(429);
    });
  });

  describe("Type Guards", () => {
    it("should correctly identify ProxyCheck errors", () => {
      const proxyError = new ProxyCheckError("Test", "TEST");
      const normalError = new Error("Normal error");

      expect(isProxyCheckError(proxyError)).toBe(true);
      expect(isProxyCheckError(normalError)).toBe(false);
    });

    it("should correctly identify rate limit errors", () => {
      const rateLimitError = new ProxyCheckRateLimitError("Rate limited", 100, 0, new Date(), 60);
      const otherError = new ProxyCheckError("Other", "OTHER");

      expect(isRateLimitError(rateLimitError)).toBe(true);
      expect(isRateLimitError(otherError)).toBe(false);
    });

    it("should correctly identify validation errors", () => {
      const validationError = new ProxyCheckValidationError("Invalid");
      const otherError = new ProxyCheckError("Other", "OTHER");

      expect(isValidationError(validationError)).toBe(true);
      expect(isValidationError(otherError)).toBe(false);
    });
  });

  describe("createErrorFromResponse", () => {
    it("should create rate limit error from 429 response", () => {
      const axiosError = {
        response: {
          status: 429,
          data: { message: "Too many requests" },
          headers: {
            "x-ratelimit-limit": "100",
            "x-ratelimit-remaining": "0",
            "x-ratelimit-reset": "1700000000",
            "retry-after": "30",
          },
        },
      };

      const error = createErrorFromResponse(axiosError);
      expect(error).toBeInstanceOf(ProxyCheckRateLimitError);
      expect((error as ProxyCheckRateLimitError).limit).toBe(100);
      expect((error as ProxyCheckRateLimitError).retryAfter).toBe(30);
    });

    it("should create authentication error from 401 response", () => {
      const axiosError = {
        response: {
          status: 401,
          data: { message: "Invalid API key" },
          headers: {},
        },
      };

      const error = createErrorFromResponse(axiosError);
      expect(error).toBeInstanceOf(ProxyCheckAuthenticationError);
      expect(error.message).toBe("Invalid API key");
    });

    it("should create timeout error", () => {
      const axiosError = {
        code: "ECONNABORTED",
        message: "timeout of 5000ms exceeded",
        timeout: 5000,
      };

      const error = createErrorFromResponse(axiosError);
      expect(error).toBeInstanceOf(ProxyCheckTimeoutError);
      expect((error as ProxyCheckTimeoutError).timeout).toBe(5000);
    });

    it("should create network error", () => {
      const axiosError = {
        request: {},
        message: "Network Error",
      };

      const error = createErrorFromResponse(axiosError);
      expect(error).toBeInstanceOf(ProxyCheckNetworkError);
    });
  });
});
