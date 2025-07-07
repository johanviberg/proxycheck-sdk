import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ConfigManager } from "../config";
import { HttpClient } from "../http";
import { CheckService } from "../services/check";
import type { ClientConfig, RateLimitInfo } from "../types";
import { ProxyCheckClient } from "./index";

// Mock dependencies
jest.mock("../http");
jest.mock("../config");
jest.mock("../services/check");

// Define mock types to avoid using 'any'
type MockConfigManager = {
  getConfig: jest.Mock;
  updateConfig: jest.Mock;
  getApiKey: jest.Mock;
  setApiKey: jest.Mock;
  getBaseUrl: jest.Mock;
  isTlsEnabled: jest.Mock;
  getTimeout: jest.Mock;
  getRetryConfig: jest.Mock;
  getUserAgent: jest.Mock;
  getLogger: jest.Mock;
};

type MockHttpClient = {
  getRateLimitInfo: jest.Mock;
  getConfig: jest.Mock;
  request: jest.Mock;
  get: jest.Mock;
  post: jest.Mock;
  postForm: jest.Mock;
  buildUrl: jest.Mock;
  buildUrlWithAddress: jest.Mock;
};

type MockCheckService = {
  checkAddress: jest.Mock;
  checkAddresses: jest.Mock;
  isProxy: jest.Mock;
  isVPN: jest.Mock;
  isDisposableEmail: jest.Mock;
  getRiskScore: jest.Mock;
  getDetailedInfo: jest.Mock;
  getServiceName: jest.Mock;
  getApiKey: jest.Mock;
  getHttpClient: jest.Mock;
  getConfigManager: jest.Mock;
  validateConfiguration: jest.Mock;
  validateAddresses: jest.Mock;
  processResponse: jest.Mock;
};

describe("ProxyCheckClient", () => {
  let client: ProxyCheckClient;
  let mockConfigManager: MockConfigManager;
  let mockHttpClient: MockHttpClient;
  let mockCheckService: MockCheckService;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock ConfigManager
    mockConfigManager = {
      getConfig: jest.fn().mockReturnValue({
        apiKey: "test-api-key",
        baseUrl: "proxycheck.io",
        timeout: 30000,
        retries: 3,
        retryDelay: 1000,
        tlsSecurity: true,
        userAgent: "proxycheck-sdk/0.1.0",
      }),
      updateConfig: jest.fn(),
      getApiKey: jest.fn().mockReturnValue("test-api-key"),
      setApiKey: jest.fn(),
      getBaseUrl: jest.fn().mockReturnValue("https://proxycheck.io"),
      isTlsEnabled: jest.fn().mockReturnValue(true),
      getTimeout: jest.fn().mockReturnValue(30000),
      getRetryConfig: jest.fn().mockReturnValue({ retries: 3, retryDelay: 1000 }),
      getUserAgent: jest.fn().mockReturnValue("proxycheck-sdk/0.1.0"),
      getLogger: jest.fn().mockReturnValue({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      }),
    };

    // Mock HttpClient
    mockHttpClient = {
      getRateLimitInfo: jest.fn(),
      getConfig: jest.fn().mockReturnValue({
        apiKey: "test-api-key",
        baseUrl: "proxycheck.io",
        timeout: 30000,
        retries: 3,
        retryDelay: 1000,
        tlsSecurity: true,
        userAgent: "proxycheck-sdk/0.1.0",
      }),
      request: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      postForm: jest.fn(),
      buildUrl: jest.fn(),
      buildUrlWithAddress: jest.fn(),
    };

    // Mock CheckService
    mockCheckService = {
      checkAddress: jest.fn(),
      checkAddresses: jest.fn(),
      isProxy: jest.fn(),
      isVPN: jest.fn(),
      isDisposableEmail: jest.fn(),
      getRiskScore: jest.fn(),
      getDetailedInfo: jest.fn(),
      getServiceName: jest.fn().mockReturnValue("Check"),
      getApiKey: jest.fn().mockReturnValue("test-api-key"),
      getHttpClient: jest.fn().mockReturnValue(mockHttpClient),
      getConfigManager: jest.fn().mockReturnValue(mockConfigManager),
      validateConfiguration: jest.fn(),
      validateAddresses: jest.fn(),
      processResponse: jest.fn(),
    };

    // Mock constructors
    (ConfigManager as jest.MockedClass<typeof ConfigManager>).mockImplementation(
      () => mockConfigManager,
    );
    (HttpClient as jest.MockedClass<typeof HttpClient>).mockImplementation(() => mockHttpClient);
    (CheckService as jest.MockedClass<typeof CheckService>).mockImplementation(
      () => mockCheckService,
    );

    client = new ProxyCheckClient({ apiKey: "test-api-key" });
  });

  describe("constructor", () => {
    it("should create client with configuration", () => {
      expect(ConfigManager).toHaveBeenCalledWith({ apiKey: "test-api-key" });
      expect(HttpClient).toHaveBeenCalledWith(
        {
          apiKey: "test-api-key",
          baseUrl: "proxycheck.io",
          timeout: 30000,
          retries: 3,
          retryDelay: 1000,
          tlsSecurity: true,
          userAgent: "proxycheck-sdk/0.1.0",
        },
        expect.any(Object),
      );
      expect(CheckService).toHaveBeenCalledWith(mockHttpClient, mockConfigManager);
    });

    it("should create client with empty configuration", () => {
      new ProxyCheckClient();
      expect(ConfigManager).toHaveBeenCalledWith({});
    });
  });

  describe("getConfig", () => {
    it("should return configuration from config manager", () => {
      const result = client.getConfig();
      expect(result).toEqual({
        apiKey: "test-api-key",
        baseUrl: "proxycheck.io",
        timeout: 30000,
        retries: 3,
        retryDelay: 1000,
        tlsSecurity: true,
        userAgent: "proxycheck-sdk/0.1.0",
        logging: expect.any(Object),
      });
      expect(mockConfigManager.getConfig).toHaveBeenCalled();
    });
  });

  describe("updateConfig", () => {
    it("should update configuration", () => {
      const updates: Partial<ClientConfig> = {
        timeout: 10000,
        retries: 5,
      };

      client.updateConfig(updates);
      expect(mockConfigManager.updateConfig).toHaveBeenCalledWith(updates);
    });
  });

  describe("API key management", () => {
    it("should get API key", () => {
      const result = client.getApiKey();
      expect(result).toBe("test-api-key");
      expect(mockConfigManager.getApiKey).toHaveBeenCalled();
    });

    it("should set API key", () => {
      client.setApiKey("new-api-key");
      expect(mockConfigManager.setApiKey).toHaveBeenCalledWith("new-api-key");
    });
  });

  describe("getRateLimitInfo", () => {
    it("should return rate limit info from HTTP client", () => {
      const rateLimitInfo: RateLimitInfo = {
        limit: 1000,
        remaining: 950,
        reset: new Date(),
        retryAfter: 60,
      };

      mockHttpClient.getRateLimitInfo.mockReturnValue(rateLimitInfo);

      const result = client.getRateLimitInfo();
      expect(result).toEqual(rateLimitInfo);
      expect(mockHttpClient.getRateLimitInfo).toHaveBeenCalled();
    });

    it("should return undefined when no rate limit info available", () => {
      mockHttpClient.getRateLimitInfo.mockReturnValue(undefined);

      const result = client.getRateLimitInfo();
      expect(result).toBeUndefined();
    });
  });

  describe("service access", () => {
    it("should provide access to check service", () => {
      expect(client.check).toBe(mockCheckService);
    });
  });

  describe("internal access methods", () => {
    it("should provide access to HTTP client", () => {
      const result = client.getHttpClient();
      expect(result).toBe(mockHttpClient);
    });

    it("should provide access to config manager", () => {
      const result = client.getConfigManager();
      expect(result).toBe(mockConfigManager);
    });
  });

  describe("isConfigured", () => {
    it("should return true when API key is configured", () => {
      mockConfigManager.getConfig.mockReturnValue({
        apiKey: "valid-key",
        baseUrl: "proxycheck.io",
        timeout: 30000,
        retries: 3,
        retryDelay: 1000,
        tlsSecurity: true,
        userAgent: "proxycheck-sdk/0.1.0",
      });

      const result = client.isConfigured();
      expect(result).toBe(true);
    });

    it("should return false when API key is empty", () => {
      mockConfigManager.getConfig.mockReturnValue({
        apiKey: "",
        baseUrl: "proxycheck.io",
        timeout: 30000,
        retries: 3,
        retryDelay: 1000,
        tlsSecurity: true,
        userAgent: "proxycheck-sdk/0.1.0",
      });

      const result = client.isConfigured();
      expect(result).toBe(false);
    });

    it("should return false when config manager throws error", () => {
      mockConfigManager.getConfig.mockImplementation(() => {
        throw new Error("Configuration error");
      });

      const result = client.isConfigured();
      expect(result).toBe(false);
    });
  });

  describe("getClientInfo", () => {
    it("should return comprehensive client information", () => {
      const rateLimitInfo: RateLimitInfo = {
        limit: 1000,
        remaining: 950,
        reset: new Date(),
      };

      mockConfigManager.getConfig.mockReturnValue({
        apiKey: "test-key",
        baseUrl: "proxycheck.io",
        timeout: 30000,
        retries: 3,
        retryDelay: 1000,
        tlsSecurity: true,
        userAgent: "proxycheck-sdk/0.1.0",
      });
      mockConfigManager.getBaseUrl.mockReturnValue("https://proxycheck.io");
      mockConfigManager.isTlsEnabled.mockReturnValue(true);
      mockHttpClient.getRateLimitInfo.mockReturnValue(rateLimitInfo);

      const result = client.getClientInfo();

      expect(result).toEqual({
        version: "0.9.0",
        baseUrl: "https://proxycheck.io",
        tlsEnabled: true,
        configured: true,
        rateLimitInfo,
      });
    });

    it("should return client info without rate limit info", () => {
      mockConfigManager.getConfig.mockReturnValue({
        apiKey: "test-key",
        baseUrl: "proxycheck.io",
        timeout: 30000,
        retries: 3,
        retryDelay: 1000,
        tlsSecurity: true,
        userAgent: "proxycheck-sdk/0.1.0",
      });
      mockHttpClient.getRateLimitInfo.mockReturnValue(undefined);

      const result = client.getClientInfo();

      expect(result.rateLimitInfo).toBeUndefined();
      expect(result.configured).toBe(true);
    });
  });
});
