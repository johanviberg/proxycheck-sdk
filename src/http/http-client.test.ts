import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import axios from "axios";
import { ProxyCheckAPIError, ProxyCheckNetworkError, ProxyCheckRateLimitError } from "../errors";
import type { ClientConfig } from "../types";
import { HttpClient } from "./index";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockAxiosInstance = {
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
  request: jest.fn(),
} as unknown as import("axios").AxiosInstance;

describe("HttpClient", () => {
  let client: HttpClient;
  let config: ClientConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    config = {
      apiKey: "test-api-key",
      timeout: 5000,
      retries: 3,
      retryDelay: 1000,
    };

    client = new HttpClient(config);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create axios instance with correct config", () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        timeout: 5000,
        headers: {
          "User-Agent": "proxycheck-sdk/0.9.0",
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
    });

    it("should use default values for missing config", () => {
      const minimalConfig = { apiKey: "test" };
      new HttpClient(minimalConfig);

      expect(mockedAxios.create).toHaveBeenCalledWith({
        timeout: 30000, // Default timeout
        headers: expect.any(Object),
      });
    });

    it("should setup interceptors", () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe("request", () => {
    it("should make successful request", async () => {
      const responseData = { status: "ok", data: "test" };
      mockAxiosInstance.request.mockResolvedValueOnce({ data: responseData });

      const result = await client.request({
        method: "GET",
        url: "/test",
        params: { key: "value" },
      });

      expect(result).toEqual(responseData);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: "GET",
        url: "/test",
        params: { key: "value" },
        data: undefined,
        headers: {},
      });
    });

    it("should retry on retryable errors", async () => {
      const error = new ProxyCheckNetworkError("Network error");
      mockAxiosInstance.request
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ data: { status: "ok" } });

      // Mock sleep to resolve immediately
      // Access private method for testing
      const privateMethods = client as unknown as { sleep: (ms: number) => Promise<void> };
      jest.spyOn(privateMethods, "sleep").mockResolvedValue(undefined);

      const result = await client.request({
        method: "GET",
        url: "/test",
      });

      expect(result).toEqual({ status: "ok" });
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);
    });

    it("should not retry on non-retryable errors", async () => {
      const error = new ProxyCheckAPIError("Bad request", 400);
      mockAxiosInstance.request.mockRejectedValueOnce(error);

      await expect(
        client.request({
          method: "GET",
          url: "/test",
        }),
      ).rejects.toThrow(error);

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
    });

    it("should respect retry-after header for rate limit errors", async () => {
      const rateLimitError = new ProxyCheckRateLimitError("Rate limited", 100, 0, new Date(), 30);

      mockAxiosInstance.request
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({ data: { status: "ok" } });

      const privateMethods = client as unknown as { sleep: (ms: number) => Promise<void> };
      const sleepSpy = jest.spyOn(privateMethods, "sleep").mockResolvedValue(undefined);

      await client.request({
        method: "GET",
        url: "/test",
      });

      expect(sleepSpy).toHaveBeenCalledWith(30000); // 30 seconds in ms
    });

    it("should throw error after max retries", async () => {
      const error = new ProxyCheckNetworkError("Network error");
      mockAxiosInstance.request.mockRejectedValue(error);
      const privateMethods = client as unknown as { sleep: (ms: number) => Promise<void> };
      jest.spyOn(privateMethods, "sleep").mockResolvedValue(undefined);

      await expect(
        client.request({
          method: "GET",
          url: "/test",
        }),
      ).rejects.toThrow(error);

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
  });

  describe("get", () => {
    it("should make GET request", async () => {
      const responseData = { status: "ok" };
      mockAxiosInstance.request.mockResolvedValueOnce({ data: responseData });

      const result = await client.get("/test", { param: "value" }, { custom: "header" });

      expect(result).toEqual(responseData);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: "GET",
        url: "/test",
        params: { param: "value" },
        data: undefined,
        headers: { custom: "header" },
      });
    });
  });

  describe("post", () => {
    it("should make POST request", async () => {
      const responseData = { status: "ok" };
      const postData = { test: "data" };
      mockAxiosInstance.request.mockResolvedValueOnce({ data: responseData });

      const result = await client.post("/test", postData, { param: "value" }, { custom: "header" });

      expect(result).toEqual(responseData);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: "POST",
        url: "/test",
        data: postData,
        params: { param: "value" },
        headers: { custom: "header" },
      });
    });
  });

  describe("buildUrl", () => {
    it("should build URL with query parameters", () => {
      const url = client.buildUrl("v2/", {
        key: "test-key",
        vpn: 1,
        undefinedParam: undefined,
        nullParam: null,
      });

      expect(url).toBe("v2/?key=test-key&vpn=1");
    });

    it("should handle empty parameters", () => {
      const url = client.buildUrl("v2/", {});
      expect(url).toBe("v2/");
    });
  });

  describe("calculateDelay", () => {
    it("should calculate exponential backoff with jitter", () => {
      const privateMethods = client as unknown as {
        calculateDelay: (attempt: number, baseDelay: number) => number;
      };
      const delay1 = privateMethods.calculateDelay(0, 1000);
      const delay2 = privateMethods.calculateDelay(1, 1000);
      const delay3 = privateMethods.calculateDelay(2, 1000);

      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeLessThan(2000);

      expect(delay2).toBeGreaterThanOrEqual(2000);
      expect(delay2).toBeLessThan(3000);

      expect(delay3).toBeGreaterThanOrEqual(4000);
      expect(delay3).toBeLessThan(5000);
    });
  });

  describe("isRetryableError", () => {
    it("should identify retryable errors", () => {
      const networkError = new ProxyCheckNetworkError("Network error");
      const serverError = new ProxyCheckAPIError("Server error", 500);
      const rateLimitError = new ProxyCheckRateLimitError("Rate limited", 100, 0, new Date(), 60);

      const privateMethods = client as unknown as { isRetryableError: (error: Error) => boolean };
      expect(privateMethods.isRetryableError(networkError)).toBe(true);
      expect(privateMethods.isRetryableError(serverError)).toBe(true);
      expect(privateMethods.isRetryableError(rateLimitError)).toBe(true);
    });

    it("should identify non-retryable errors", () => {
      const clientError = new ProxyCheckAPIError("Bad request", 400);
      const authError = new ProxyCheckAPIError("Unauthorized", 401);

      const privateMethods = client as unknown as { isRetryableError: (error: Error) => boolean };
      expect(privateMethods.isRetryableError(clientError)).toBe(false);
      expect(privateMethods.isRetryableError(authError)).toBe(false);
    });
  });

  describe("postForm", () => {
    it("should make POST request with form data", async () => {
      const responseData = { status: "ok" };
      (mockAxiosInstance.request as jest.Mock).mockResolvedValue({ data: responseData });

      const formData = { ips: "1.2.3.4,5.6.7.8" };
      const result = await client.postForm("test-url", formData);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: "POST",
        url: "test-url",
        data: "ips=1.2.3.4%2C5.6.7.8",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      expect(result).toEqual(responseData);
    });

    it("should handle empty form data", async () => {
      const responseData = { status: "ok" };
      (mockAxiosInstance.request as jest.Mock).mockResolvedValue({ data: responseData });

      const result = await client.postForm("test-url");

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: "POST",
        url: "test-url",
        data: "",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      expect(result).toEqual(responseData);
    });
  });

  describe("buildUrlWithAddress", () => {
    it("should build URL with address in path", () => {
      const url = client.buildUrlWithAddress("v2/", "8.8.8.8", { key: "test-key" });
      expect(url).toBe("v2/8.8.8.8?key=test-key");
    });

    it("should encode special characters in address", () => {
      const url = client.buildUrlWithAddress("v2/", "test@example.com", { key: "test-key" });
      expect(url).toBe("v2/test%40example.com?key=test-key");
    });

    it("should handle endpoint without trailing slash", () => {
      const url = client.buildUrlWithAddress("v2", "8.8.8.8", { key: "test-key" });
      expect(url).toBe("v2/8.8.8.8?key=test-key");
    });
  });

  describe("getConfig", () => {
    it("should return readonly config", () => {
      const returnedConfig = client.getConfig();

      expect(returnedConfig.apiKey).toBe("test-api-key");
      expect(returnedConfig.timeout).toBe(5000);

      // Should be readonly (TypeScript compile-time check)
      expect(Object.isFrozen(returnedConfig)).toBe(false); // Copy, not frozen
    });
  });
});
