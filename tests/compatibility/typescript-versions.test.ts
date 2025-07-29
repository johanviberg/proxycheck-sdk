/**
 * TypeScript version compatibility test
 * Tests that the package works with different TypeScript versions
 */

import { describe, expect, test } from "@jest/globals";
import { ProxyCheck, ProxyCheckError } from "../../src/index";
import type { ClientConfig, SemanticCheckOptions } from "../../src/types";

describe("TypeScript Version Compatibility", () => {
  test("should provide correct type definitions", () => {
    // Test that TypeScript can infer types correctly
    const config: ClientConfig = {
      apiKey: "test-key",
      tlsSecurity: true,
      timeout: 5000,
      retries: 3,
    };

    expect(config).toBeDefined();
    expect(typeof config.apiKey).toBe("string");
    expect(typeof config.tlsSecurity).toBe("boolean");
  });

  test("should support strict TypeScript mode", () => {
    // Test strict mode compatibility with new API
    const client = new ProxyCheck({
      apiKey: "test-key",
    });

    // TypeScript should enforce proper typing
    expect(client).toBeInstanceOf(ProxyCheck);
    expect(typeof client.check).toBe("function");
    expect(typeof client.checkBatch).toBe("function");
  });

  test("should properly type new API methods", () => {
    const client = new ProxyCheck({ apiKey: "test" });

    // Test that new API methods have correct signatures
    expect(typeof client.check).toBe("function");
    expect(typeof client.checkBatch).toBe("function");
    expect(typeof client.isProxy).toBe("function");
    expect(typeof client.isVPN).toBe("function");
    expect(typeof client.dashboard.getUsage).toBe("function");
    expect(typeof client.lists.whitelist.add).toBe("function");
  });

  test("should support union types for API responses", () => {
    // Test that union types work correctly with new API
    const riskLevel: "low" | "medium" | "high" | "critical" = "medium";
    const detectionMode: "proxy" | "vpn" | "both" = "both";

    expect(["low", "medium", "high", "critical"].includes(riskLevel)).toBe(true);
    expect(["proxy", "vpn", "both"].includes(detectionMode)).toBe(true);
  });

  test("should support generic types", () => {
    // Test generic type parameters with semantic options
    const options: SemanticCheckOptions = {
      detection: {
        mode: "both",
        level: "enhanced"
      },
      enrich: {
        location: true,
        network: true,
        risk: "detailed"
      }
    };

    expect(options).toBeDefined();
    expect(options.detection?.mode).toBe("both");
    expect(options.enrich?.location).toBe(true);
  });

  test("should properly extend Error classes", () => {
    // Test that error classes extend Error correctly
    const error = new ProxyCheckError("Test error", "TEST_ERROR");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ProxyCheckError);
    expect(error.name).toBe("ProxyCheckError");
    expect(error.message).toBe("Test error");
  });

  test("should support utility types", () => {
    // Test that utility types work correctly
    type PartialConfig = Partial<ClientConfig>;

    const partialConfig: PartialConfig = {
      apiKey: "test",
    };

    expect(partialConfig).toBeDefined();
    expect(typeof partialConfig.apiKey).toBe("string");
  });

  test("should support conditional types", () => {
    // Test conditional type support
    type ApiKeyType<T extends ClientConfig> = T["apiKey"];

    const config: ClientConfig = { apiKey: "test" };
    const apiKey: ApiKeyType<typeof config> = config.apiKey;

    expect(typeof apiKey).toBe("string");
  });

  test("should support mapped types", () => {
    // Test mapped type support
    type OptionalConfig = {
      [K in keyof ClientConfig]?: ClientConfig[K];
    };

    const optionalConfig: OptionalConfig = {
      apiKey: "test",
      tlsSecurity: true,
    };

    expect(optionalConfig).toBeDefined();
  });

  test("should support template literal types", () => {
    // Test template literal type support
    type CountryCode = "US" | "CA" | "GB";
    type CountryMessage = `Country: ${CountryCode}`;

    const message: CountryMessage = "Country: US";

    expect(message).toBe("Country: US");
  });
});
