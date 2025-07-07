import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  buildPostData,
  buildQueryParams,
  mergeCountryOptions,
  processAddresses,
  shouldUsePostMethod,
  validateOptions,
} from "../config";
import { ProxyCheckValidationError } from "../errors";
import type { AddressCheckResult, CheckResponse } from "../types";
import { CheckService } from "./check";

// Mock dependencies
jest.mock("../http");
jest.mock("../config", () => ({
  validateOptions: jest.fn(),
  buildQueryParams: jest.fn(),
  buildPostData: jest.fn(),
  processAddresses: jest.fn(),
  mergeCountryOptions: jest.fn(),
  shouldUsePostMethod: jest.fn(),
}));

describe("CheckService", () => {
  let service: CheckService;
  // Mock types
  type MockHttpClient = {
    buildUrl: jest.Mock;
    buildUrlWithAddress: jest.Mock;
    get: jest.Mock;
    post: jest.Mock;
    postForm: jest.Mock;
    getRateLimitInfo: jest.Mock;
  };

  type MockConfigManager = {
    getApiKey: jest.Mock;
    getUserAgent: jest.Mock;
    getLogger: jest.Mock;
  };

  let mockHttp: MockHttpClient;
  let mockConfig: MockConfigManager;

  beforeEach(() => {
    mockHttp = {
      buildUrl: jest.fn(),
      buildUrlWithAddress: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      postForm: jest.fn(),
      getRateLimitInfo: jest.fn(),
    };

    mockConfig = {
      getApiKey: jest.fn().mockReturnValue("test-api-key"),
      getUserAgent: jest.fn().mockReturnValue("test-agent"),
      getLogger: jest.fn().mockReturnValue({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      }),
    };

    // Reset and setup OptionsManager mocks
    jest.clearAllMocks();

    // Add validateOptions mock - missing from the original setup
    (validateOptions as jest.Mock).mockImplementation((opts) => opts);

    // Mock OptionsManager methods with proper return values
    (buildQueryParams as jest.Mock).mockImplementation((options) => {
      const params: Record<string, string | number> = {
        key: "test-api-key",
        node: 1,
        port: 1,
        seen: 1,
      };
      // Add ASN if requested
      if (options.asnData) {
        params.asn = 1;
      }
      return params;
    });

    (buildPostData as jest.Mock).mockImplementation((_options, addresses) => {
      if (Array.isArray(addresses)) {
        return { ips: addresses.join(",") };
      }
      return {};
    });

    (processAddresses as jest.Mock).mockImplementation((addr, maskAddress) => {
      if (maskAddress && typeof addr === "string" && addr.includes("@")) {
        const [, domain] = addr.split("@");
        return `anonymous@${domain}`;
      }
      return addr;
    });

    (mergeCountryOptions as jest.Mock).mockImplementation((opts) => {
      // Enable ASN data if country restrictions are set
      if (
        (opts.allowedCountries && opts.allowedCountries.length > 0) ||
        (opts.blockedCountries && opts.blockedCountries.length > 0)
      ) {
        return { ...opts, asnData: true };
      }
      return opts;
    });

    (shouldUsePostMethod as jest.Mock).mockImplementation((addresses) => {
      return Array.isArray(addresses) && addresses.length > 1;
    });

    service = new CheckService(mockHttp, mockConfig);
  });

  describe("checkAddress", () => {
    it("should check a single IP address", async () => {
      const mockResponse: CheckResponse = {
        status: "ok",
        "1.2.3.4": {
          proxy: "yes",
          type: "VPN",
          risk: 75,
          country: "United States",
          isocode: "US",
        } as AddressCheckResult,
        block: "yes",
        block_reason: "vpn",
      };

      mockHttp.buildUrlWithAddress.mockReturnValue("v2/1.2.3.4?key=test-api-key");
      mockHttp.get.mockResolvedValue(mockResponse);

      const result = await service.checkAddress("1.2.3.4");

      expect(result).toEqual(mockResponse);
      expect(mockHttp.buildUrlWithAddress).toHaveBeenCalledWith(
        "v2/",
        "1.2.3.4",
        expect.objectContaining({
          key: "test-api-key",
          node: 1,
          port: 1,
          seen: 1,
        }),
      );
    });

    it("should check an email address", async () => {
      const mockResponse: CheckResponse = {
        status: "ok",
        "test@example.com": {
          proxy: "no",
          disposable: "yes",
        } as AddressCheckResult,
        block: "yes",
        block_reason: "disposable",
      };

      mockHttp.buildUrl.mockReturnValue("v2/?key=test-api-key");
      mockHttp.get.mockResolvedValue(mockResponse);

      const result = await service.checkAddress("test@example.com");

      expect(result).toEqual(mockResponse);
      expect(result.block).toBe("yes");
      expect(result.block_reason).toBe("disposable");
    });

    it("should handle multiple addresses with POST request", async () => {
      const addresses = ["1.2.3.4", "5.6.7.8"];
      const mockResponse: CheckResponse = {
        status: "ok",
        "1.2.3.4": { proxy: "no" } as AddressCheckResult,
        "5.6.7.8": { proxy: "yes", type: "PUB" } as AddressCheckResult,
        block: "na",
        block_reason: "na",
      };

      mockHttp.buildUrl.mockReturnValue("v2/?key=test-api-key");
      mockHttp.postForm.mockResolvedValue(mockResponse);

      const result = await service.checkAddresses(addresses);

      expect(result).toEqual(mockResponse);
      expect(mockHttp.postForm).toHaveBeenCalledWith(
        "v2/?key=test-api-key",
        expect.objectContaining({
          ips: "1.2.3.4,5.6.7.8",
        }),
        expect.objectContaining({
          key: "test-api-key",
          node: 1,
          port: 1,
          seen: 1,
        }),
      );
    });

    it("should mask email addresses when enabled", async () => {
      const mockResponse: CheckResponse = {
        status: "ok",
        "anonymous@example.com": { proxy: "no", disposable: "no" } as AddressCheckResult,
      };

      mockHttp.buildUrlWithAddress.mockReturnValue("v2/anonymous%40example.com?key=test-api-key");
      mockHttp.get.mockResolvedValue(mockResponse);

      const result = await service.checkAddress("user@example.com", { maskAddress: true });

      expect(result).toEqual(mockResponse);
      expect(mockHttp.get).toHaveBeenCalledWith("v2/anonymous%40example.com?key=test-api-key");
    });

    it("should enable ASN data for country restrictions", async () => {
      const mockResponse: CheckResponse = {
        status: "ok",
        "1.2.3.4": { proxy: "no", country: "Canada", isocode: "CA" } as AddressCheckResult,
      };

      mockHttp.buildUrlWithAddress.mockReturnValue("v2/1.2.3.4?key=test-api-key&asn=1");
      mockHttp.get.mockResolvedValue(mockResponse);

      await service.checkAddress("1.2.3.4", {
        allowedCountries: ["US", "CA"],
      });

      expect(mockHttp.buildUrlWithAddress).toHaveBeenCalledWith(
        "v2/",
        "1.2.3.4",
        expect.objectContaining({
          asn: 1,
        }),
      );
    });

    it("should apply country blocking logic", async () => {
      const mockResponse: CheckResponse = {
        status: "ok",
        "1.2.3.4": {
          proxy: "no",
          country: "China",
          isocode: "CN",
        } as AddressCheckResult,
      };

      mockHttp.buildUrl.mockReturnValue("v2/?key=test-api-key&asn=1");
      mockHttp.get.mockResolvedValue(mockResponse);

      const result = await service.checkAddress("1.2.3.4", {
        blockedCountries: ["CN", "RU"],
      });

      expect(result.block).toBe("yes");
      expect(result.block_reason).toBe("country");
    });

    it("should throw validation error for missing API key", async () => {
      mockConfig.getApiKey.mockReturnValue("");

      await expect(service.checkAddress("1.2.3.4")).rejects.toThrow(ProxyCheckValidationError);
    });

    it("should throw validation error for invalid address", async () => {
      await expect(service.checkAddress("")).rejects.toThrow(ProxyCheckValidationError);
    });
  });

  describe("convenience methods", () => {
    beforeEach(() => {
      mockHttp.buildUrl.mockReturnValue("v2/?key=test-api-key");
    });

    it("should check if address is proxy", async () => {
      const mockResponse: CheckResponse = {
        status: "ok",
        "1.2.3.4": { proxy: "yes" } as AddressCheckResult,
      };
      mockHttp.get.mockResolvedValue(mockResponse);

      const result = await service.isProxy("1.2.3.4");
      expect(result).toBe(true);
    });

    it("should check if address is VPN", async () => {
      const mockResponse: CheckResponse = {
        status: "ok",
        "1.2.3.4": { proxy: "yes", type: "VPN" } as AddressCheckResult,
      };
      mockHttp.get.mockResolvedValue(mockResponse);

      const result = await service.isVPN("1.2.3.4");
      expect(result).toBe(true);
    });

    it("should check if email is disposable", async () => {
      const mockResponse: CheckResponse = {
        status: "ok",
        "test@example.com": { proxy: "no", disposable: "yes" } as AddressCheckResult,
      };
      mockHttp.get.mockResolvedValue(mockResponse);

      const result = await service.isDisposableEmail("test@example.com");
      expect(result).toBe(true);
    });

    it("should get risk score", async () => {
      const mockResponse: CheckResponse = {
        status: "ok",
        "1.2.3.4": { proxy: "yes", risk: 85 } as AddressCheckResult,
      };
      mockHttp.get.mockResolvedValue(mockResponse);

      const result = await service.getRiskScore("1.2.3.4");
      expect(result).toBe(85);
    });

    it("should get detailed info", async () => {
      const detailedInfo: AddressCheckResult = {
        proxy: "yes",
        type: "VPN",
        risk: 75,
        country: "United States",
        isocode: "US",
        asn: "AS12345",
        isp: "Example ISP",
      };

      const mockResponse: CheckResponse = {
        status: "ok",
        "1.2.3.4": detailedInfo,
      };
      mockHttp.get.mockResolvedValue(mockResponse);

      const result = await service.getDetailedInfo("1.2.3.4");
      expect(result).toEqual(detailedInfo);
    });
  });

  describe("getServiceName", () => {
    it("should return correct service name", () => {
      expect(service.getServiceName()).toBe("Check");
    });
  });
});
