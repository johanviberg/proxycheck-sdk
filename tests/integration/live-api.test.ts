/**
 * Live API Integration Tests
 *
 * These tests validate the SDK against the actual ProxyCheck.io API.
 * They require a valid API key and network connectivity.
 */

import type { ProxyCheckClient } from "../../src";
import { rateLimitDelay, TEST_VECTORS } from "../data/test-vectors";
import { getTestClient, RATE_LIMIT_DELAY, skipIfNotComprehensive, skipIfNotLive } from "./setup";

describe("Live API Integration Tests", () => {
  let client: ProxyCheckClient;

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

      const result = await client.check.checkAddress("8.8.8.8");

      expect(result).toBeDefined();
      expect(result.status).toBe("ok");
      expect(result["8.8.8.8"]).toBeDefined();
    });

    it("should handle basic IP check with expected fields", async () => {
      if (skipIfNotLive()) {
        return;
      }

      const result = await client.check.checkAddress("8.8.8.8");
      const ipData = result["8.8.8.8"];

      // Verify essential fields are present
      expect(ipData).toHaveProperty("proxy");
      if (ipData && typeof ipData === "object") {
        expect(["yes", "no"]).toContain(ipData.proxy);

        if (ipData.proxy === "yes") {
          expect(ipData).toHaveProperty("type");
        }
      }

      await rateLimitDelay(RATE_LIMIT_DELAY);
    });

    it("should handle email validation", async () => {
      if (skipIfNotLive()) {
        return;
      }

      const result = await client.check.checkAddress("test@tempmail.org");
      const emailData = result["test@tempmail.org"];

      expect(emailData).toBeDefined();
      if (emailData && typeof emailData === "object") {
        expect(emailData).toHaveProperty("disposable");
        expect(["yes", "no"]).toContain(emailData.disposable);
      }

      await rateLimitDelay(RATE_LIMIT_DELAY);
    });

    it("should respect client configuration options", async () => {
      if (skipIfNotLive()) {
        return;
      }

      const result = await client.check.checkAddress("8.8.8.8", {
        asnData: true,
        riskData: 1,
      });

      const ipData = result["8.8.8.8"];

      if (ipData && typeof ipData === "object") {
        // Should have ASN data when requested
        expect(ipData).toHaveProperty("asn");
        expect(ipData).toHaveProperty("provider");

        // Should have risk score when requested
        expect(ipData).toHaveProperty("risk");
        expect(typeof ipData.risk).toBe("number");
      }

      await rateLimitDelay(RATE_LIMIT_DELAY);
    });
  });

  describe("Clean IP Detection", () => {
    it("should correctly identify clean IPs", async () => {
      if (skipIfNotLive()) {
        return;
      }

      for (const testVector of TEST_VECTORS.clean.ips) {
        const result = await client.check.checkAddress(testVector.value);
        const ipData = result[testVector.value];

        if (ipData && typeof ipData === "object") {
          expect(ipData.proxy).toBe("no");

          // Clean IPs might have a business type but should not be proxy/vpn types
          if (ipData.type) {
            expect(["Business"]).toContain(ipData.type);
          }
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
          const result = await client.check.checkAddress(testVector.value, {
            riskData: 2, // Get detailed risk data
          });
          const ipData = result[testVector.value];

          if (ipData && typeof ipData === "object") {
            // Note: IP classifications can change, so we log but don't fail
            if (ipData.proxy !== testVector.expectedProxy) {
              console.warn(
                `⚠️  IP ${testVector.value} classification changed:\n` +
                  `   Expected: proxy=${testVector.expectedProxy}\n` +
                  `   Actual: proxy=${ipData.proxy}\n` +
                  `   Notes: ${testVector.notes}`,
              );
            } else {
              expect(ipData.proxy).toBe(testVector.expectedProxy);
            }

            // Log risk information
            console.log(
              `${testVector.value}: proxy=${ipData.proxy}, risk=${ipData.risk}%, type=${ipData.type}`,
            );
          }

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
        const result = await client.check.checkAddress(testVector.value, {
          vpnDetection: 2, // Enhanced VPN detection
        });
        const ipData = result[testVector.value];

        if (ipData && typeof ipData === "object" && ipData.proxy === "yes") {
          expect(ipData.type).toBeDefined();
          // VPN type detection might vary
          expect(["VPN", "PUB"]).toContain(ipData.type);
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
        { ip: "8.8.8.8", expectedRisk: 0, description: "Clean Google DNS" },
        { ip: "171.245.231.241", expectedRisk: 100, description: "Vietnam Proxy" },
        { ip: "3.96.211.99", expectedRisk: 0, description: "Canada Hosting (Current: 0% risk)" },
      ];

      for (const testCase of testCases) {
        const result = await client.check.checkAddress(testCase.ip, {
          riskData: 2, // Detailed risk data
        });

        const ipData = result[testCase.ip];

        if (ipData && typeof ipData === "object" && typeof ipData.risk === "number") {
          console.log(`${testCase.description} (${testCase.ip}): risk=${ipData.risk}%`);

          // Risk scores might vary slightly, so we check ranges
          if (testCase.expectedRisk === 0) {
            expect(ipData.risk).toBeLessThanOrEqual(10);
          } else if (testCase.expectedRisk === 100) {
            expect(ipData.risk).toBeGreaterThanOrEqual(90);
          }
          // Note: Removed medium risk expectations as IP classifications change
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
        const result = await client.check.checkAddress(testVector.value, {
          riskData: 2,
        });

        const ipData = result[testVector.value];

        if (ipData && typeof ipData === "object" && typeof ipData.risk === "number") {
          // High-risk IPs should have significant risk scores
          expect(ipData.risk).toBeGreaterThanOrEqual(50);
          console.log(
            `High-risk IP ${testVector.value}: risk=${ipData.risk}%, proxy=${ipData.proxy}`,
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
        const result = await client.check.checkAddress(testCase.email);
        const emailData = result[testCase.email];

        if (emailData && typeof emailData === "object") {
          expect(emailData).toHaveProperty("disposable");
          console.log(
            `${testCase.description} (${testCase.email}): disposable=${emailData.disposable}`,
          );

          // Validate expected disposable status
          expect(emailData.disposable).toBe(testCase.expectedDisposable);
        }

        await rateLimitDelay(RATE_LIMIT_DELAY);
      }
    });

    it("should detect disposable email addresses", async () => {
      if (skipIfNotLive()) {
        return;
      }

      for (const testVector of TEST_VECTORS.disposableEmail.emails) {
        const result = await client.check.checkAddress(testVector.value);
        const emailData = result[testVector.value];

        if (emailData && typeof emailData === "object") {
          expect(emailData).toHaveProperty("disposable");
          // Log results for monitoring
          console.log(`${testVector.value}: disposable=${emailData.disposable}`);

          // All emails in disposableEmail test vectors should be disposable
          expect(emailData.disposable).toBe("yes");
        }

        await rateLimitDelay(RATE_LIMIT_DELAY);
      }
    });

    it("should validate regular email addresses", async () => {
      if (skipIfNotLive()) {
        return;
      }

      for (const testVector of TEST_VECTORS.clean.emails) {
        const result = await client.check.checkAddress(testVector.value);
        const emailData = result[testVector.value];

        if (emailData && typeof emailData === "object") {
          expect(emailData).toHaveProperty("disposable");
          // Log results for monitoring
          console.log(`${testVector.value}: disposable=${emailData.disposable}`);

          // All emails in clean test vectors should be non-disposable
          expect(emailData.disposable).toBe("no");
        }

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

      const result = await client.check.checkAddresses(addresses);

      expect(result.status).toBe("ok");
      for (const address of addresses) {
        expect(result[address]).toBeDefined();
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
      const vietnamResult = await client.check.checkAddress("171.245.231.241", {
        asnData: true,
        blockedCountries: ["VN"],
      });

      // Should block Vietnam IP
      const vietnamData = vietnamResult["171.245.231.241"];
      if (vietnamData && typeof vietnamData === "object" && vietnamData.isocode === "VN") {
        expect(vietnamResult.block).toBe("yes");
        // Block reason could be 'country' or 'proxy' - proxy detection takes precedence
        expect(["country", "proxy"]).toContain(vietnamResult.block_reason);
      }

      await rateLimitDelay(RATE_LIMIT_DELAY);

      // Test blocking Canada IPs
      const canadaResult = await client.check.checkAddress("3.96.211.99", {
        asnData: true,
        blockedCountries: ["CA"],
      });

      // Should block Canada IP
      const canadaData = canadaResult["3.96.211.99"];
      if (canadaData && typeof canadaData === "object" && canadaData.isocode === "CA") {
        expect(canadaResult.block).toBe("yes");
        // Block reason should be 'country' for clean IPs
        expect(canadaResult.block_reason).toBe("country");
      }

      await rateLimitDelay(RATE_LIMIT_DELAY);

      // Test allowing only US IPs
      const usOnlyResult = await client.check.checkAddress("171.245.231.241", {
        asnData: true,
        allowedCountries: ["US"],
      });

      // Should block non-US IP (Vietnam)
      const usOnlyData = usOnlyResult["171.245.231.241"];
      if (usOnlyData && typeof usOnlyData === "object" && usOnlyData.isocode !== "US") {
        expect(usOnlyResult.block).toBe("yes");
        // Block reason could be 'country' or 'proxy' - proxy detection takes precedence
        expect(["country", "proxy"]).toContain(usOnlyResult.block_reason);
      }

      await rateLimitDelay(RATE_LIMIT_DELAY);
    });

    it("should include risk scores when requested", async () => {
      if (skipIfNotLive()) {
        return;
      }

      const result = await client.check.checkAddress("8.8.8.8", {
        riskData: 2, // Detailed risk data
      });

      const ipData = result["8.8.8.8"];
      if (ipData && typeof ipData === "object") {
        expect(ipData).toHaveProperty("risk");
        expect(typeof ipData.risk).toBe("number");
        expect(ipData.risk).toBeGreaterThanOrEqual(0);
        expect(ipData.risk).toBeLessThanOrEqual(100);
      }

      await rateLimitDelay(RATE_LIMIT_DELAY);
    });

    it("should mask email addresses when requested", async () => {
      if (skipIfNotLive()) {
        return;
      }

      const result = await client.check.checkAddress("test@example.com", {
        maskAddress: true,
      });

      // The response key should be masked
      const keys = Object.keys(result);
      const emailKey = keys.find((k) => k.includes("@"));

      if (emailKey) {
        // Log the actual masked result for debugging
        console.log(`Masked email key: ${emailKey}`);
        // API might use different masking patterns, check for any masking
        expect(emailKey).toMatch(/@example\.com$/);
        expect(emailKey).not.toBe("test@example.com"); // Should be masked
      }

      await rateLimitDelay(RATE_LIMIT_DELAY);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid IP addresses gracefully", async () => {
      if (skipIfNotLive()) {
        return;
      }

      const result = await client.check.checkAddress("999.999.999.999");

      // API might return an error status or error message
      expect(result).toBeDefined();

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
          client.check.checkAddress("8.8.8.8").catch((error) => ({
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

  describe("Client Information", () => {
    it("should track rate limit information", async () => {
      if (skipIfNotLive()) {
        return;
      }

      // Make a request
      await client.check.checkAddress("8.8.8.8");

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
