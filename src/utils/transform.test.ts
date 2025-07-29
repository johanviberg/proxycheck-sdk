import { describe, expect, it } from "@jest/globals";
import type { CheckResult } from "../types/responses";
import {
  createResultSummary,
  formatLocation,
  getDetectionDescription,
  getRiskDescription,
  getTimeSinceLastSeen,
  isBusinessConnection,
  isDisposableEmailResult,
  isHostingProvider,
  isMobileConnection,
  isSuspiciousResult,
  transformBatchResponse,
  transformSingleResponse,
} from "./transform";

describe("Response Transformation Utilities", () => {
  describe("transformSingleResponse", () => {
    it("should transform basic IP response", () => {
      const apiResponse = {
        status: "ok",
        "8.8.8.8": {
          proxy: "no",
          type: "IPv4",
          risk: 0,
          country: "United States",
          isocode: "US",
          provider: "Google",
          asn: "AS15169",
          query_time: 50,
        },
      };

      const result = transformSingleResponse("8.8.8.8", apiResponse);

      expect(result.result).toEqual(
        expect.objectContaining({
          address: "8.8.8.8",
          isProxy: false,
          isVPN: false,
          risk: { level: "low", score: 0 },
          location: { country: "United States", countryCode: "US" },
        }),
      );
    });

    it("should transform proxy response", () => {
      const apiResponse = {
        status: "ok",
        "192.168.1.1": {
          proxy: "yes",
          type: "VPN",
          risk: 75,
          country: "Unknown",
          isocode: "XX",
          provider: "Unknown",
          query_time: 120,
        },
      };

      const result = transformSingleResponse("192.168.1.1", apiResponse);

      expect(result.result).toEqual(
        expect.objectContaining({
          address: "192.168.1.1",
          isProxy: true,
          isVPN: true,
          risk: { level: "high", score: 75 },
        }),
      );
    });

    it("should handle missing address in response", () => {
      const apiResponse = {
        status: "ok",
        "1.1.1.1": {
          proxy: "no",
          type: "IPv4",
          risk: 0,
        },
      };

      // This should throw an error for missing address
      expect(() => {
        transformSingleResponse("8.8.8.8", apiResponse);
      }).toThrow("No result found for address: 8.8.8.8");
    });
  });

  describe("transformBatchResponse", () => {
    it("should transform multiple IP responses", () => {
      const addresses = ["8.8.8.8", "1.1.1.1"];
      const apiResponse = {
        status: "ok",
        "8.8.8.8": {
          proxy: "no",
          type: "IPv4",
          risk: 0,
          country: "United States",
          isocode: "US",
          provider: "Google",
        },
        "1.1.1.1": {
          proxy: "no",
          type: "IPv4",
          risk: 0,
          country: "Australia",
          isocode: "AU",
          provider: "Cloudflare",
        },
      };

      const result = transformBatchResponse(addresses, apiResponse);

      expect(result.results).toBeInstanceOf(Map);
      expect(result.results.size).toBe(2);
      expect(result.results.get("8.8.8.8")).toEqual(
        expect.objectContaining({
          address: "8.8.8.8",
          isProxy: false,
          location: { country: "United States", countryCode: "US" },
        }),
      );
      expect(result.results.get("1.1.1.1")).toEqual(
        expect.objectContaining({
          address: "1.1.1.1",
          isProxy: false,
          location: { country: "Australia", countryCode: "AU" },
        }),
      );
    });

    it("should handle empty addresses array", () => {
      const result = transformBatchResponse([], { status: "ok" });
      expect(result.results.size).toBe(0);
    });
  });

  describe("isSuspiciousResult", () => {
    it("should return true for proxy addresses", () => {
      const result: CheckResult = {
        address: "192.168.1.1",
        isProxy: true,
        isVPN: false,
        isDisposableEmail: false,
        risk: { level: "medium", score: 50 },
        detection: { type: "HTTP" },
        timing: { queryTime: 100, cacheHit: false },
        metadata: { checkedAt: new Date(), requestId: "test" },
      };

      expect(isSuspiciousResult(result)).toBe(true);
    });

    it("should return true for VPN addresses", () => {
      const result: CheckResult = {
        address: "192.168.1.1",
        isProxy: false,
        isVPN: true,
        isDisposableEmail: false,
        risk: { level: "medium", score: 50 },
        detection: { type: "VPN" },
        timing: { queryTime: 100, cacheHit: false },
        metadata: { checkedAt: new Date(), requestId: "test" },
      };

      expect(isSuspiciousResult(result)).toBe(true);
    });

    it("should return true for high risk addresses", () => {
      const result: CheckResult = {
        address: "192.168.1.1",
        isProxy: false,
        isVPN: false,
        isDisposableEmail: false,
        risk: { level: "high", score: 80 },
        detection: { type: "IPv4" },
        timing: { queryTime: 100, cacheHit: false },
        metadata: { checkedAt: new Date(), requestId: "test" },
      };

      expect(isSuspiciousResult(result)).toBe(true);
    });

    it("should return false for clean addresses", () => {
      const result: CheckResult = {
        address: "8.8.8.8",
        isProxy: false,
        isVPN: false,
        isDisposableEmail: false,
        risk: { level: "low", score: 0 },
        detection: { type: "IPv4" },
        timing: { queryTime: 50, cacheHit: false },
        metadata: { checkedAt: new Date(), requestId: "test" },
      };

      expect(isSuspiciousResult(result)).toBe(false);
    });
  });

  describe("isDisposableEmailResult", () => {
    it("should return true for disposable emails", () => {
      const result: CheckResult = {
        address: "test@tempmail.com",
        isProxy: false,
        isVPN: false,
        isDisposableEmail: true,
        risk: { level: "critical", score: 100 },
        detection: { type: "Disposable" },
        timing: { queryTime: 30, cacheHit: false },
        metadata: { checkedAt: new Date(), requestId: "test" },
      };

      expect(isDisposableEmailResult(result)).toBe(true);
    });

    it("should return false for regular emails", () => {
      const result: CheckResult = {
        address: "test@gmail.com",
        isProxy: false,
        isVPN: false,
        isDisposableEmail: false,
        risk: { level: "low", score: 0 },
        detection: { type: "Email" },
        timing: { queryTime: 25, cacheHit: false },
        metadata: { checkedAt: new Date(), requestId: "test" },
      };

      expect(isDisposableEmailResult(result)).toBe(false);
    });
  });

  describe("getRiskDescription", () => {
    it("should return risk descriptions", () => {
      const lowRisk: CheckResult = {
        address: "8.8.8.8",
        isProxy: false,
        isVPN: false,
        isDisposableEmail: false,
        risk: { level: "low", score: 0 },
        detection: { type: "IPv4" },
        timing: { queryTime: 50, cacheHit: false },
        metadata: { checkedAt: new Date(), requestId: "test" },
      };

      const highRisk: CheckResult = {
        address: "192.168.1.1",
        isProxy: true,
        isVPN: false,
        isDisposableEmail: false,
        risk: { level: "high", score: 80 },
        detection: { type: "HTTP" },
        timing: { queryTime: 100, cacheHit: false },
        metadata: { checkedAt: new Date(), requestId: "test" },
      };

      expect(getRiskDescription(lowRisk)).toContain("Low");
      expect(getRiskDescription(highRisk)).toContain("High");
    });
  });

  describe("getDetectionDescription", () => {
    it("should return detection descriptions", () => {
      const proxyResult: CheckResult = {
        address: "192.168.1.1",
        isProxy: true,
        isVPN: false,
        isDisposableEmail: false,
        risk: { level: "medium", score: 50 },
        detection: { type: "HTTP" },
        timing: { queryTime: 100, cacheHit: false },
        metadata: { checkedAt: new Date(), requestId: "test" },
      };

      const description = getDetectionDescription(proxyResult);
      expect(description).toContain("HTTP");
    });
  });

  describe("formatLocation", () => {
    it("should format location with country", () => {
      const result: CheckResult = {
        address: "8.8.8.8",
        isProxy: false,
        isVPN: false,
        isDisposableEmail: false,
        risk: { level: "low", score: 0 },
        location: { country: "United States", countryCode: "US" },
        detection: { type: "IPv4" },
        timing: { queryTime: 50, cacheHit: false },
        metadata: { checkedAt: new Date(), requestId: "test" },
      };

      const formatted = formatLocation(result);
      expect(formatted).toContain("United States");
    });

    it("should return null for missing location", () => {
      const result: CheckResult = {
        address: "8.8.8.8",
        isProxy: false,
        isVPN: false,
        isDisposableEmail: false,
        risk: { level: "low", score: 0 },
        detection: { type: "IPv4" },
        timing: { queryTime: 50, cacheHit: false },
        metadata: { checkedAt: new Date(), requestId: "test" },
      };

      const formatted = formatLocation(result);
      expect(formatted).toBeNull();
    });
  });

  describe("Connection type checks", () => {
    const baseResult: CheckResult = {
      address: "8.8.8.8",
      isProxy: false,
      isVPN: false,
      isDisposableEmail: false,
      risk: { level: "low", score: 0 },
      detection: { type: "IPv4" },
      timing: { queryTime: 50, cacheHit: false },
      metadata: { checkedAt: new Date(), requestId: "test" },
    };

    it("should detect mobile connections", () => {
      const mobileResult = {
        ...baseResult,
        detection: { type: "Wireless" as const },
      };

      expect(isMobileConnection(mobileResult)).toBe(true);
      expect(isMobileConnection(baseResult)).toBe(false);
    });

    it("should detect business connections", () => {
      const businessResult = {
        ...baseResult,
        detection: { type: "Business" as const },
      };

      expect(isBusinessConnection(businessResult)).toBe(true);
      expect(isBusinessConnection(baseResult)).toBe(false);
    });

    it("should detect hosting providers", () => {
      const hostingResult = {
        ...baseResult,
        detection: { type: "Hosting" as const },
      };

      expect(isHostingProvider(hostingResult)).toBe(true);
      expect(isHostingProvider(baseResult)).toBe(false);
    });
  });

  describe("getTimeSinceLastSeen", () => {
    it("should return null for missing last seen data", () => {
      const result: CheckResult = {
        address: "8.8.8.8",
        isProxy: false,
        isVPN: false,
        isDisposableEmail: false,
        risk: { level: "low", score: 0 },
        detection: { type: "IPv4" },
        timing: { queryTime: 50, cacheHit: false },
        metadata: { checkedAt: new Date(), requestId: "test" },
      };

      expect(getTimeSinceLastSeen(result)).toBeNull();
    });

    it("should format time since last seen", () => {
      const result: CheckResult = {
        address: "8.8.8.8",
        isProxy: false,
        isVPN: false,
        isDisposableEmail: false,
        risk: { level: "low", score: 0 },
        detection: { type: "IPv4", lastSeen: new Date(Date.now() - 86400000) }, // 1 day ago
        timing: { queryTime: 50, cacheHit: false },
        metadata: { checkedAt: new Date(), requestId: "test" },
      };

      const timeSince = getTimeSinceLastSeen(result);
      expect(timeSince).toContain("day");
    });
  });

  describe("createResultSummary", () => {
    it("should create summary of results", () => {
      const results: Array<CheckResult> = [
        {
          address: "8.8.8.8",
          isProxy: false,
          isVPN: false,
          isDisposableEmail: false,
          risk: { level: "low", score: 0 },
          location: { country: "United States", countryCode: "US" },
          detection: { type: "IPv4", provider: "Google" },
          timing: { queryTime: 50, cacheHit: false },
          metadata: { checkedAt: new Date(), requestId: "test" },
        },
        {
          address: "192.168.1.1",
          isProxy: true,
          isVPN: false,
          isDisposableEmail: false,
          risk: { level: "high", score: 80 },
          location: { country: "Unknown", countryCode: "XX" },
          detection: { type: "HTTP", provider: "Unknown" },
          timing: { queryTime: 100, cacheHit: false },
          metadata: { checkedAt: new Date(), requestId: "test" },
        },
      ];

      const summary = createResultSummary(results);

      expect(summary.total).toBe(2);
      expect(summary.suspicious).toBe(1);
      expect(summary.clean).toBe(1);
      expect(summary.proxies).toBe(1);
      expect(summary.vpns).toBe(0);
      expect(summary.countries["United States"]).toBe(1);
      expect(summary.providers.Google).toBe(1);
      expect(summary.averageRisk).toBe(40);
      expect(summary.highestRisk).toBe(80);
    });

    it("should handle empty results array", () => {
      const summary = createResultSummary([]);

      expect(summary.total).toBe(0);
      expect(summary.suspicious).toBe(0);
      expect(summary.clean).toBe(0);
      expect(summary.averageRisk).toBe(0);
      expect(summary.highestRisk).toBe(0);
    });
  });
});
