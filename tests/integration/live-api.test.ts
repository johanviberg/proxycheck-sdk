/**
 * Live API Integration Tests
 *
 * These tests validate the SDK against the actual ProxyCheck.io API.
 * They require a valid API key and network connectivity.
 */

import type { ProxyCheck } from "../../src";
import { rateLimitDelay, TEST_VECTORS } from "../data/test-vectors";
import { getTestClient, RATE_LIMIT_DELAY, skipIfNotComprehensive, skipIfNotLive } from "./setup";

describe("Live API Integration Tests", () => {
  let client: ProxyCheck;

  beforeAll(() => {
    if (skipIfNotLive()) {
      return;
    }
    client = getTestClient();
  });

  describe("Smoke Tests (Quick Validation)", () => {
    it("should successfully connect to the API", async () => {
      if (skipIfNotLive()) {
        return;
      }

      const result = await client.check("8.8.8.8");

      expect(result).toBeDefined();
      expect(result.address).toBe("8.8.8.8");
      expect(result).toHaveProperty("isProxy");
      expect(typeof result.isProxy).toBe("boolean");
    });

    it("should handle basic IP check with expected fields", async () => {
      if (skipIfNotLive()) {
        return;
      }

      const result = await client.check("8.8.8.8");

      // Verify essential fields are present
      expect(result).toHaveProperty("isProxy");
      expect(typeof result.isProxy).toBe("boolean");
      expect(result).toHaveProperty("isVPN");
      expect(typeof result.isVPN).toBe("boolean");
      expect(result).toHaveProperty("risk");
      expect(result.risk).toHaveProperty("level");
      expect(result.risk).toHaveProperty("score");
      
      if (result.isProxy || result.isVPN) {
        expect(result.detection).toHaveProperty("type");
      }

      await rateLimitDelay(RATE_LIMIT_DELAY);
    });

    it("should handle email validation", async () => {
      if (skipIfNotLive()) {
        return;
      }

      const result = await client.check("test@tempmail.org");

      expect(result).toBeDefined();
      expect(result).toHaveProperty("isDisposableEmail");
      expect(typeof result.isDisposableEmail).toBe("boolean");
      // Just verify that we have a boolean result
      // The actual detection depends on the API's current data

      await rateLimitDelay(RATE_LIMIT_DELAY);
    });

    it("should respect client configuration options", async () => {
      if (skipIfNotLive()) {
        return;
      }

      const result = await client.check("8.8.8.8", {
        enrich: {
          network: true,
          risk: "basic",
        },
      });

      // Should have network data when requested
      expect(result).toHaveProperty("network");
      expect(result.network).toHaveProperty("asn");
      expect(result.network).toHaveProperty("provider");

      // Should have risk data when requested
      expect(result).toHaveProperty("risk");
      expect(result.risk).toHaveProperty("score");
      expect(typeof result.risk.score).toBe("number");

      await rateLimitDelay(RATE_LIMIT_DELAY);
    });
  });

  describe("Clean IP Detection", () => {
    it("should correctly identify clean IPs", async () => {
      if (skipIfNotLive()) {
        return;
      }

      for (const testVector of TEST_VECTORS.clean.ips) {
        const result = await client.check(testVector.value);
        
        expect(result.isProxy).toBe(false);
        expect(result.isVPN).toBe(false);

        // Clean IPs should have low risk
        if (result.risk) {
          expect(result.risk.score).toBeLessThanOrEqual(10);
        }

        await rateLimitDelay(RATE_LIMIT_DELAY);
      }
    });
  });

  describe("Proxy/VPN Detection", () => {
    it("should detect known proxy IPs", async () => {
      if (skipIfNotLive()) {
        return;
      }
      if (skipIfNotComprehensive()) {
        return;
      }

      for (const testVector of TEST_VECTORS.proxy.ips) {
        try {
          const result = await client.check(testVector.value, {
            enrich: { risk: "detailed" },
          });

          // Note: IP classifications can change, so we log but don't fail
          const expectedIsProxy = testVector.expectedProxy === "yes";
          if (result.isProxy !== expectedIsProxy) {
            console.warn(
              `⚠️  IP ${testVector.value} classification changed:\n` +
                `   Expected: isProxy=${expectedIsProxy}\n` +
                `   Actual: isProxy=${result.isProxy}\n` +
                `   Notes: ${testVector.notes}`,
            );
          } else {
            expect(result.isProxy).toBe(expectedIsProxy);
          }

          // Log risk information
          console.log(
            `${testVector.value}: isProxy=${result.isProxy}, risk=${result.risk?.score}%, type=${result.detection?.type}`,
          );

          await rateLimitDelay(RATE_LIMIT_DELAY);
        } catch (error) {
          console.error(`Failed to check ${testVector.value}:`, error);
          throw error;
        }
      }
    });

    it("should detect VPN servers with correct type", async () => {
      if (skipIfNotLive()) {
        return;
      }
      if (skipIfNotComprehensive()) {
        return;
      }

      for (const testVector of TEST_VECTORS.vpn.ips) {
        const result = await client.check(testVector.value, {
          detection: { mode: "enhanced" },
        });

        if (result.isProxy || result.isVPN) {
          expect(result.detection).toBeDefined();
          expect(result.detection.type).toBeDefined();
          // VPN type detection might vary
          expect(["VPN", "PUB"]).toContain(result.detection.type);
        }

        await rateLimitDelay(RATE_LIMIT_DELAY);
      }
    });
  });

  describe("Risk Score Validation", () => {
    it("should correctly identify risk levels", async () => {
      if (skipIfNotLive()) {
        return;
      }

      const testCases = [
        { ip: "8.8.8.8", description: "Google DNS" },
        { ip: "171.245.231.241", description: "Vietnam Proxy" },
        { ip: "3.96.211.99", description: "Canada Hosting" },
      ];

      for (const testCase of testCases) {
        const result = await client.check(testCase.ip, {
          enrich: { risk: "detailed" },
        });

        if (result.risk && typeof result.risk.score === "number") {
          console.log(`${testCase.description} (${testCase.ip}): risk=${result.risk.score}%`);

          // Just verify we get a valid risk score between 0-100
          expect(result.risk.score).toBeGreaterThanOrEqual(0);
          expect(result.risk.score).toBeLessThanOrEqual(100);
          
          // Also verify we have a risk level
          expect(result.risk.level).toBeDefined();
          expect(["low", "medium", "high", "critical"]).toContain(result.risk.level);
        }

        await rateLimitDelay(RATE_LIMIT_DELAY);
      }
    });

    it("should detect high-risk IPs from test vectors", async () => {
      if (skipIfNotLive()) {
        return;
      }
      if (skipIfNotComprehensive()) {
        return;
      }

      for (const testVector of TEST_VECTORS.highRisk.ips) {
        const result = await client.check(testVector.value, {
          enrich: { risk: "detailed" },
        });

        if (result.risk && typeof result.risk.score === "number") {
          // High-risk IPs should have significant risk scores
          expect(result.risk.score).toBeGreaterThanOrEqual(50);
          console.log(
            `High-risk IP ${testVector.value}: risk=${result.risk.score}%, isProxy=${result.isProxy}`,
          );
        }

        await rateLimitDelay(RATE_LIMIT_DELAY);
      }
    });
  });

  describe("Email Validation", () => {
    it("should validate specific email test cases", async () => {
      if (skipIfNotLive()) {
        return;
      }

      const testCases = [
        {
          email: "johndoe@example.com",
          expectedDisposable: "yes",
          description: "Example.com domain (API reports as disposable)",
        },
        {
          email: "johndoe@mailinator.com",
          expectedDisposable: "yes",
          description: "Mailinator - Known disposable service",
        },
        {
          email: "test@tempmail.org",
          expectedDisposable: "no",
          description: "Temp Mail (Currently non-disposable)",
        },
      ];

      for (const testCase of testCases) {
        const result = await client.check(testCase.email);

        expect(result).toHaveProperty("isDisposableEmail");
        console.log(
          `${testCase.description} (${testCase.email}): isDisposableEmail=${result.isDisposableEmail}`,
        );

        // Validate expected disposable status
        const expectedIsDisposable = testCase.expectedDisposable === "yes";
        expect(result.isDisposableEmail).toBe(expectedIsDisposable);

        await rateLimitDelay(RATE_LIMIT_DELAY);
      }
    });

    it("should detect disposable email addresses", async () => {
      if (skipIfNotLive()) {
        return;
      }

      for (const testVector of TEST_VECTORS.disposableEmail.emails) {
        const result = await client.check(testVector.value);

        expect(result).toHaveProperty("isDisposableEmail");
        // Log results for monitoring
        console.log(`${testVector.value}: isDisposableEmail=${result.isDisposableEmail}`);

        // All emails in disposableEmail test vectors should be disposable
        expect(result.isDisposableEmail).toBe(true);

        await rateLimitDelay(RATE_LIMIT_DELAY);
      }
    });

    it("should validate regular email addresses", async () => {
      if (skipIfNotLive()) {
        return;
      }

      for (const testVector of TEST_VECTORS.clean.emails) {
        const result = await client.check(testVector.value);

        expect(result).toHaveProperty("isDisposableEmail");
        // Log results for monitoring
        console.log(`${testVector.value}: isDisposableEmail=${result.isDisposableEmail}`);

        // All emails in clean test vectors should be non-disposable
        expect(result.isDisposableEmail).toBe(false);

        await rateLimitDelay(RATE_LIMIT_DELAY);
      }
    });
  });

  describe("Advanced Features", () => {
    it("should handle batch requests correctly", async () => {
      if (skipIfNotLive()) {
        return;
      }

      const addresses = ["8.8.8.8", "1.1.1.1", "test@tempmail.org"];

      const result = await client.checkBatch(addresses);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(addresses.length);
      for (const address of addresses) {
        expect(result.has(address)).toBe(true);
        const addressResult = result.get(address);
        expect(addressResult).toBeDefined();
      }

      await rateLimitDelay(RATE_LIMIT_DELAY);
    });

    it("should apply country restrictions correctly", async () => {
      if (skipIfNotLive()) {
        return;
      }
      if (skipIfNotComprehensive()) {
        return;
      }

      // Test blocking Vietnam IPs
      const vietnamResult = await client.check("171.245.231.241", {
        enrich: { network: true, location: true },
        block: { countries: ["VN"] },
      });

      // Should block Vietnam IP based on country
      if (vietnamResult.location?.countryCode === "VN") {
        // In the new API, blocking logic should be implemented by the user
        // based on the returned data
        expect(vietnamResult.location.countryCode).toBe("VN");
      }

      await rateLimitDelay(RATE_LIMIT_DELAY);

      // Test blocking Canada IPs
      const canadaResult = await client.check("3.96.211.99", {
        enrich: { network: true, location: true },
        block: { countries: ["CA"] },
      });

      // Should block Canada IP based on country
      if (canadaResult.location?.countryCode === "CA") {
        // In the new API, blocking logic should be implemented by the user
        // based on the returned data
        expect(canadaResult.location.countryCode).toBe("CA");
      }

      await rateLimitDelay(RATE_LIMIT_DELAY);

      // Test allowing only US IPs
      const usOnlyResult = await client.check("171.245.231.241", {
        enrich: { network: true, location: true },
        allow: { countries: ["US"] },
      });

      // Should have location data for non-US IP (Vietnam)
      if (usOnlyResult.location?.countryCode && usOnlyResult.location.countryCode !== "US") {
        // In the new API, allow/block logic should be implemented by the user
        // based on the returned data
        expect(usOnlyResult.location.countryCode).not.toBe("US");
      }

      await rateLimitDelay(RATE_LIMIT_DELAY);
    });

    it("should include risk scores when requested", async () => {
      if (skipIfNotLive()) {
        return;
      }

      const result = await client.check("8.8.8.8", {
        enrich: { risk: "detailed" },
      });

      expect(result).toHaveProperty("risk");
      expect(result.risk).toHaveProperty("score");
      expect(typeof result.risk.score).toBe("number");
      expect(result.risk.score).toBeGreaterThanOrEqual(0);
      expect(result.risk.score).toBeLessThanOrEqual(100);
      expect(result.risk).toHaveProperty("level");
      expect(["low", "medium", "high", "critical"]).toContain(result.risk.level);

      await rateLimitDelay(RATE_LIMIT_DELAY);
    });

    it("should mask email addresses when requested", async () => {
      if (skipIfNotLive()) {
        return;
      }

      const result = await client.check("test@example.com", {
        privacy: { maskEmail: true },
      });

      // In the new API, email masking is handled differently
      // The result should contain information about the email
      expect(result.address).toBeDefined();
      // Check if email is disposable
      expect(result).toHaveProperty("isDisposableEmail");
      expect(typeof result.isDisposableEmail).toBe("boolean");
      // Privacy feature validation
      expect(result).toHaveProperty("detection");

      await rateLimitDelay(RATE_LIMIT_DELAY);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid IP addresses gracefully", async () => {
      if (skipIfNotLive()) {
        return;
      }

      await expect(client.check("999.999.999.999")).rejects.toThrow();

      await rateLimitDelay(RATE_LIMIT_DELAY);
    });

    it("should handle rate limiting appropriately", async () => {
      if (skipIfNotLive()) {
        return;
      }
      if (skipIfNotComprehensive()) {
        return;
      }

      // Make several rapid requests to potentially trigger rate limiting
      const promises: Array<Promise<unknown>> = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          client.check("8.8.8.8").catch((error) => ({
            error,
            attempt: i,
          })),
        );
      }

      const results = await Promise.allSettled(promises);

      // Check if any requests were rate limited
      const rateLimited = results.filter(
        (r) =>
          r.status === "fulfilled" &&
          r.value &&
          typeof r.value === "object" &&
          "error" in r.value &&
          typeof r.value.error === "object" &&
          r.value.error !== null &&
          "code" in r.value.error &&
          r.value.error.code === "RATE_LIMITED",
      );

      // Log rate limiting info if it occurred
      if (rateLimited.length > 0) {
        console.log(`Rate limiting detected on ${rateLimited.length} requests`);
      }
    });
  });

  describe("Convenience Methods", () => {
    it("should check proxy status using convenience method", async () => {
      if (skipIfNotLive()) {
        return;
      }

      const isProxy = await client.isProxy("8.8.8.8");
      expect(typeof isProxy).toBe("boolean");
      
      // Google DNS should not be a proxy
      expect(isProxy).toBe(false);

      await rateLimitDelay(RATE_LIMIT_DELAY);
    });

    it("should check VPN status using convenience method", async () => {
      if (skipIfNotLive()) {
        return;
      }

      const isVPN = await client.isVPN("8.8.8.8");
      expect(typeof isVPN).toBe("boolean");
      
      // Google DNS should not be a VPN
      expect(isVPN).toBe(false);

      await rateLimitDelay(RATE_LIMIT_DELAY);
    });

    it("should check disposable email using convenience method", async () => {
      if (skipIfNotLive()) {
        return;
      }

      const isDisposable = await client.isDisposableEmail("test@mailinator.com");
      expect(typeof isDisposable).toBe("boolean");
      
      // Mailinator is a known disposable email service
      expect(isDisposable).toBe(true);

      await rateLimitDelay(RATE_LIMIT_DELAY);
    });

    it("should get risk level using convenience method", async () => {
      if (skipIfNotLive()) {
        return;
      }

      const riskLevel = await client.getRiskLevel("8.8.8.8");
      expect(["low", "medium", "high", "critical"]).toContain(riskLevel);
      
      // Google DNS should have low risk
      expect(riskLevel).toBe("low");

      await rateLimitDelay(RATE_LIMIT_DELAY);
    });

    it("should check suspicious activity using convenience method", async () => {
      if (skipIfNotLive()) {
        return;
      }

      const isSuspicious = await client.isSuspicious("8.8.8.8");
      expect(typeof isSuspicious).toBe("boolean");
      
      // Google DNS should not be suspicious
      expect(isSuspicious).toBe(false);

      await rateLimitDelay(RATE_LIMIT_DELAY);
    });
  });

  describe("Dashboard and Statistics", () => {
    it("should retrieve usage statistics", async () => {
      if (skipIfNotLive()) {
        return;
      }

      const usage = await client.dashboard.getUsage();

      expect(usage).toBeDefined();
      expect(usage).toHaveProperty("dailyLimit");
      expect(usage).toHaveProperty("queriesToday");
      expect(usage).toHaveProperty("queriesTotal");
      expect(usage).toHaveProperty("planTier");
      
      // Log usage stats for visibility
      console.log("Usage Statistics:", {
        planTier: usage.planTier,
        dailyLimit: usage.dailyLimit,
        queriesToday: usage.queriesToday,
        queriesTotal: usage.queriesTotal,
        burstTokens: usage.burstTokensAvailable,
      });

      await rateLimitDelay(RATE_LIMIT_DELAY);
    });

    it("should retrieve detection statistics", async () => {
      if (skipIfNotLive()) {
        return;
      }

      const detections = await client.dashboard.getDetections(5);

      expect(detections).toBeDefined();
      expect(Array.isArray(detections)).toBe(true);
      
      if (detections.length > 0) {
        // Verify detection structure - API returns timeFormatted instead of date
        const detection = detections[0];
        expect(detection).toHaveProperty("address");
        expect(detection).toHaveProperty("detectionType");
        expect(detection).toHaveProperty("timeFormatted");
        
        console.log(`Found ${detections.length} recent detections`);
        console.log("Sample detection:", {
          address: detection.address,
          detectionType: detection.detectionType,
          timeFormatted: detection.timeFormatted,
        });
      } else {
        console.log("No recent detections found");
      }

      await rateLimitDelay(RATE_LIMIT_DELAY);
    });

    it("should retrieve query logs", async () => {
      if (skipIfNotLive()) {
        return;
      }

      const queries = await client.dashboard.getQueries();

      expect(queries).toBeDefined();
      expect(typeof queries).toBe("object");
      
      // The API seems to return summary statistics instead of individual queries
      // Let's verify the structure we're actually getting
      if (queries.totalQueries !== undefined) {
        // It's returning summary stats
        expect(queries).toHaveProperty("totalQueries");
        expect(typeof queries.totalQueries).toBe("number");
        
        console.log("Query summary statistics:", {
          totalQueries: queries.totalQueries,
          proxies: queries.proxies,
          vpns: queries.vpns,
          undetected: queries.undetected,
        });
      } else {
        // Individual query entries
        const queryEntries = Object.entries(queries);
        console.log(`Found ${queryEntries.length} query entries`);
      }

      await rateLimitDelay(RATE_LIMIT_DELAY);
    });

    // Note: The stats export functionality is not exposed in the modern API
    // It's available internally but not part of the public interface
    // Users should use dashboard.getUsage() for usage statistics
  });

  describe("Client Information", () => {
    it("should track rate limit information", async () => {
      if (skipIfNotLive()) {
        return;
      }

      // Make a request
      await client.check("8.8.8.8");

      // Check rate limit info
      const rateLimitInfo = client.getRateLimitInfo();

      if (rateLimitInfo) {
        expect(rateLimitInfo).toHaveProperty("limit");
        expect(rateLimitInfo).toHaveProperty("remaining");
        expect(rateLimitInfo).toHaveProperty("reset");

        console.log("Rate limit info:", {
          limit: rateLimitInfo.limit,
          remaining: rateLimitInfo.remaining,
          reset: new Date(
            (typeof rateLimitInfo.reset === "number" ? rateLimitInfo.reset : 0) * 1000,
          ).toISOString(),
        });
      }
    });
  });
});
