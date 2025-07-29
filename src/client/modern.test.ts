import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ConfigManager } from "../config";
import { ErrorHandler } from "../errors";
import { HttpClient } from "../http";
import { ResponseStatusHandler } from "../response";
import { CheckService } from "../services/check";
import { DashboardService } from "../services/dashboard";
import { ListManagementService } from "../services/list-management";
import type { RateLimitInfo } from "../types";
import type { CheckResult } from "../types/responses";
import { VERSION } from "../version";
import { ProxyCheck } from "./modern";

// Mock all dependencies
jest.mock("../config");
jest.mock("../http");
jest.mock("../services/check");
jest.mock("../services/dashboard");
jest.mock("../services/list-management");
jest.mock("../errors");
jest.mock("../response");
jest.mock("../utils/transform", () => ({
  transformSingleResponse: jest.fn(),
  transformBatchResponse: jest.fn(),
  isSuspiciousResult: jest.fn(),
  isDisposableEmailResult: jest.fn(),
}));

describe("ProxyCheck (Modern Client)", () => {
  let client: ProxyCheck;
  let mockConfigManager: jest.Mocked<ConfigManager>;
  let mockHttpClient: jest.Mocked<HttpClient>;
  let mockCheckService: jest.Mocked<CheckService>;
  let mockDashboardService: jest.Mocked<DashboardService>;
  let mockListManagementService: jest.Mocked<ListManagementService>;
  let mockErrorHandler: jest.Mocked<ErrorHandler>;
  let mockResponseHandler: jest.Mocked<ResponseStatusHandler>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock config manager
    mockConfigManager = {
      getConfig: jest.fn().mockReturnValue({
        apiKey: "test-api-key",
        baseUrl: "proxycheck.io",
        timeout: 30000,
        retries: 3,
        retryDelay: 1000,
        tlsSecurity: true,
        userAgent: `proxycheck-sdk/${VERSION}`,
      }),
      getApiKey: jest.fn().mockReturnValue("test-api-key"),
      setApiKey: jest.fn(),
      getBaseUrl: jest.fn().mockReturnValue("https://proxycheck.io"),
      isTlsEnabled: jest.fn().mockReturnValue(true),
      getLogger: jest.fn().mockReturnValue({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      }),
    } as unknown as jest.Mocked<ConfigManager>;

    // Mock HTTP client
    mockHttpClient = {
      getRateLimitInfo: jest.fn(),
      getConfig: jest.fn().mockReturnValue({
        apiKey: "test-api-key",
        baseUrl: "proxycheck.io",
        timeout: 30000,
      }),
    } as unknown as jest.Mocked<HttpClient>;

    // Mock check service
    mockCheckService = {
      checkAddress: jest.fn(),
      checkAddresses: jest.fn(),
    } as unknown as jest.Mocked<CheckService>;

    // Mock dashboard service
    mockDashboardService = {
      getUsage: jest.fn(),
      getDetections: jest.fn(),
      getTags: jest.fn(),
      getQueries: jest.fn(),
      getDetectionSummary: jest.fn(),
      getRecentDetections: jest.fn(),
      getUsageTrends: jest.fn(),
      getDetectionsPaginated: jest.fn(),
    } as unknown as jest.Mocked<DashboardService>;

    // Mock list management service
    mockListManagementService = {
      addEntries: jest.fn(),
      removeEntries: jest.fn(),
      getList: jest.fn(),
      setList: jest.fn(),
      clearList: jest.fn(),
      getListStatistics: jest.fn(),
      findConflicts: jest.fn(),
      resolveConflicts: jest.fn(),
      searchEntries: jest.fn(),
      importEntries: jest.fn(),
      exportEntries: jest.fn(),
      validateEntries: jest.fn(),
      compareLists: jest.fn(),
    } as unknown as jest.Mocked<ListManagementService>;

    // Mock error handler
    mockErrorHandler = {
      getStats: jest.fn(),
      getErrorReport: jest.fn(),
      isHealthy: jest.fn(),
      getHealthStatus: jest.fn(),
      resetStats: jest.fn(),
      executeWithRetry: jest.fn(),
      executeWithTimeoutAndRetry: jest.fn(),
    } as unknown as jest.Mocked<ErrorHandler>;

    // Mock response handler
    mockResponseHandler = {
      handleResponse: jest.fn(),
      handleError: jest.fn(),
    } as unknown as jest.Mocked<ResponseStatusHandler>;

    // Mock constructors
    (ConfigManager as jest.MockedClass<typeof ConfigManager>).mockImplementation(
      () => mockConfigManager,
    );
    (HttpClient as jest.MockedClass<typeof HttpClient>).mockImplementation(() => mockHttpClient);
    (CheckService as jest.MockedClass<typeof CheckService>).mockImplementation(
      () => mockCheckService,
    );
    (DashboardService as jest.MockedClass<typeof DashboardService>).mockImplementation(
      () => mockDashboardService,
    );
    (ListManagementService as jest.MockedClass<typeof ListManagementService>).mockImplementation(
      () => mockListManagementService,
    );
    (ErrorHandler as jest.MockedClass<typeof ErrorHandler>).mockImplementation(
      () => mockErrorHandler,
    );
    (ResponseStatusHandler as jest.MockedClass<typeof ResponseStatusHandler>).mockImplementation(
      () => mockResponseHandler,
    );

    client = new ProxyCheck({ apiKey: "test-api-key" });
  });

  describe("constructor", () => {
    it("should create client with proper configuration", () => {
      expect(ConfigManager).toHaveBeenCalledWith({ apiKey: "test-api-key" });
      expect(HttpClient).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: "test-api-key",
          baseUrl: "proxycheck.io",
          timeout: 30000,
          retries: 3,
          retryDelay: 1000,
          tlsSecurity: true,
          userAgent: `proxycheck-sdk/${VERSION}`,
        }),
        expect.any(Object),
      );
      expect(CheckService).toHaveBeenCalledWith(mockHttpClient, mockConfigManager);
      expect(DashboardService).toHaveBeenCalledWith(mockHttpClient, mockConfigManager);
      expect(ListManagementService).toHaveBeenCalledWith(mockHttpClient, mockConfigManager);
      expect(ErrorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          enableRetry: true,
          enableLogging: false,
          logLevel: "error",
        }),
      );
      expect(ResponseStatusHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          throwOnError: true,
          includeWarnings: true,
        }),
      );
    });

    it("should create client with empty configuration", () => {
      new ProxyCheck();
      expect(ConfigManager).toHaveBeenCalledWith({});
    });
  });

  describe("Core check methods", () => {
    it("should check single address", async () => {
      const mockResult: CheckResult = {
        address: "8.8.8.8",
        isProxy: false,
        isVPN: false,
        isDisposableEmail: false,
        risk: { level: "low", score: 0 },
        location: { country: "US", countryCode: "US" },
        detection: { type: "IPv4" },
        timing: { queryTime: 50, cacheHit: false },
        metadata: { checkedAt: new Date(), requestId: "test-123" },
      };

      const mockApiResponse = {
        status: "ok",
        "8.8.8.8": {
          proxy: "no",
          type: "IPv4",
          risk: 0,
        },
      };

      mockCheckService.checkAddress.mockResolvedValue(mockApiResponse);

      // Mock the transform function
      const { transformSingleResponse } = require("../utils/transform");
      transformSingleResponse.mockReturnValue({
        result: mockResult,
        address: "8.8.8.8",
      });

      const result = await client.check("8.8.8.8");

      expect(mockCheckService.checkAddress).toHaveBeenCalledWith("8.8.8.8", expect.any(Object));
      expect(result).toEqual(mockResult);
    });

    it("should check multiple addresses", async () => {
      const mockApiResponse = {
        status: "ok",
        "8.8.8.8": {
          proxy: "no",
          type: "IPv4",
          risk: 0,
        },
      };

      mockCheckService.checkAddresses.mockResolvedValue(mockApiResponse);

      // Mock the transform function
      const { transformBatchResponse } = require("../utils/transform");
      transformBatchResponse.mockReturnValue({
        results: new Map([["8.8.8.8", { address: "8.8.8.8", isProxy: false }]]),
      });

      const addresses = ["8.8.8.8", "1.1.1.1"];
      const result = await client.checkBatch(addresses);

      expect(mockCheckService.checkAddresses).toHaveBeenCalledWith(addresses, expect.any(Object));
      expect(result).toBeInstanceOf(Map);
    });

    it("should return empty map for empty address list", async () => {
      const result = await client.checkBatch([]);
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });
  });

  describe("Convenience methods", () => {
    beforeEach(() => {
      const mockApiResponse = {
        status: "ok",
        "8.8.8.8": {
          proxy: "no",
          type: "IPv4",
          risk: 0,
        },
      };

      mockCheckService.checkAddress.mockResolvedValue(mockApiResponse);

      // Mock transform functions
      const {
        transformSingleResponse,
        isSuspiciousResult,
        isDisposableEmailResult,
      } = require("../utils/transform");
      transformSingleResponse.mockReturnValue({
        result: {
          address: "8.8.8.8",
          isProxy: false,
          isVPN: false,
          isDisposableEmail: false,
          risk: { level: "low", score: 0 },
        },
        address: "8.8.8.8",
      });
      isSuspiciousResult.mockReturnValue(false);
      isDisposableEmailResult.mockReturnValue(false);
    });

    it("should check if address is suspicious", async () => {
      const result = await client.isSuspicious("8.8.8.8");
      expect(result).toBe(false);
    });

    it("should check if address is proxy", async () => {
      const result = await client.isProxy("8.8.8.8");
      expect(result).toBe(false);
    });

    it("should check if address is VPN", async () => {
      const result = await client.isVPN("8.8.8.8");
      expect(result).toBe(false);
    });

    it("should check if email is disposable", async () => {
      const result = await client.isDisposableEmail("test@example.com");
      expect(result).toBe(false);
    });

    it("should get risk level", async () => {
      const result = await client.getRiskLevel("8.8.8.8");
      expect(result).toBe("low");
    });
  });

  describe("Dashboard API", () => {
    it("should provide dashboard access", () => {
      expect(client.dashboard).toBeDefined();
      expect(typeof client.dashboard.getUsage).toBe("function");
      expect(typeof client.dashboard.getDetections).toBe("function");
      expect(typeof client.dashboard.getQueries).toBe("function");
    });

    it("should get usage statistics", async () => {
      const mockUsage = {
        queriesToday: 100,
        dailyLimit: 1000,
        planTier: "basic",
        burstTokensAvailable: 50,
        burstTokenAllowance: 100,
        queriesTotal: 5000,
      };

      mockDashboardService.getUsage.mockResolvedValue(mockUsage);

      const result = await client.dashboard.getUsage();
      expect(result).toEqual(mockUsage);
      expect(mockDashboardService.getUsage).toHaveBeenCalled();
    });
  });

  describe("List Management API", () => {
    it("should provide lists access", () => {
      expect(client.lists).toBeDefined();
      expect(client.lists.whitelist).toBeDefined();
      expect(client.lists.blacklist).toBeDefined();
      expect(typeof client.lists.whitelist.add).toBe("function");
      expect(typeof client.lists.blacklist.add).toBe("function");
    });

    it("should add entries to whitelist", async () => {
      const mockResult = {
        success: true,
        message: "Added 2 entries",
        affectedCount: 2,
        added: 2,
        skipped: 0,
        errors: [],
      };
      mockListManagementService.addEntries.mockResolvedValue(mockResult);

      const result = await client.lists.whitelist.add(["8.8.8.8", "1.1.1.1"]);

      expect(mockListManagementService.addEntries).toHaveBeenCalledWith(
        "whitelist",
        ["8.8.8.8", "1.1.1.1"],
        undefined,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("Error handling and monitoring", () => {
    it("should provide error statistics", () => {
      const mockStats = {
        totalErrors: 5,
        errorsByCategory: { network: 3, validation: 2 },
        errorsByCode: { NETWORK_ERROR: 3, VALIDATION_ERROR: 2 },
        retriedErrors: 2,
        recoveredErrors: 1,
        errorRate: 2.5,
        uptime: 3600000,
      };

      mockErrorHandler.getStats.mockReturnValue(mockStats);

      const result = client.getErrorStats();
      expect(result).toEqual(mockStats);
    });

    it("should check if client is healthy", () => {
      mockErrorHandler.isHealthy.mockReturnValue(true);

      const result = client.isHealthy();
      expect(result).toBe(true);
    });

    it("should execute operation with retry", async () => {
      const mockOperation = jest.fn().mockResolvedValue("success");
      mockErrorHandler.executeWithRetry.mockResolvedValue("success");

      const result = await client.executeWithRetry(mockOperation);

      expect(mockErrorHandler.executeWithRetry).toHaveBeenCalledWith(mockOperation, "operation");
      expect(result).toBe("success");
    });
  });

  describe("Utility methods", () => {
    it("should get rate limit info", () => {
      const mockRateLimit: RateLimitInfo = {
        limit: 1000,
        remaining: 950,
        reset: new Date(),
        retryAfter: 60,
      };

      mockHttpClient.getRateLimitInfo.mockReturnValue(mockRateLimit);

      const result = client.getRateLimitInfo();
      expect(result).toEqual(mockRateLimit);
    });

    it("should get client status", () => {
      const result = client.getStatus();

      expect(result).toEqual(
        expect.objectContaining({
          version: "0.9.2",
          configured: true,
          baseUrl: "https://proxycheck.io",
          tlsEnabled: true,
        }),
      );
    });

    it("should set and get API key", () => {
      client.setApiKey("new-key");
      expect(mockConfigManager.setApiKey).toHaveBeenCalledWith("new-key");

      client.getApiKey();
      expect(mockConfigManager.getApiKey).toHaveBeenCalled();
    });

    it("should get response handler", () => {
      const result = client.getResponseHandler();
      expect(result).toBe(mockResponseHandler);
    });
  });

  describe("Static factory methods", () => {
    it("should create client with security focus", () => {
      const securityClient = ProxyCheck.withSecurityFocus({ apiKey: "test" });
      expect(securityClient).toBeInstanceOf(ProxyCheck);
    });

    it("should create client with performance focus", () => {
      const performanceClient = ProxyCheck.withPerformanceFocus({ apiKey: "test" });
      expect(performanceClient).toBeInstanceOf(ProxyCheck);
    });

    it("should create client from API key", () => {
      const apiKeyClient = ProxyCheck.fromApiKey("test-key");
      expect(apiKeyClient).toBeInstanceOf(ProxyCheck);
    });
  });
});
