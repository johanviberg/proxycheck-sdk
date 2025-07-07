import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { ProxyCheckValidationError } from "../errors";
import type { ClientConfig, ProxyCheckOptions } from "../types";
import {
  buildPostData,
  buildQueryParams,
  ConfigManager,
  createConfig,
  mergeCountryOptions,
  processAddresses,
  shouldUsePostMethod,
  validateOptions,
} from "./index";

describe("Configuration Management", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("ConfigManager", () => {
    it("should create config with defaults", () => {
      const config = new ConfigManager({ apiKey: "test-key" });
      const result = config.getConfig();

      expect(result.apiKey).toBe("test-key");
      expect(result.baseUrl).toBe("proxycheck.io");
      expect(result.timeout).toBe(30000);
      expect(result.retries).toBe(3);
      expect(result.tlsSecurity).toBe(true);
    });

    it("should merge user config with defaults", () => {
      const userConfig: Partial<ClientConfig> = {
        apiKey: "user-key",
        timeout: 10000,
        retries: 5,
      };

      const config = new ConfigManager(userConfig);
      const result = config.getConfig();

      expect(result.apiKey).toBe("user-key");
      expect(result.timeout).toBe(10000);
      expect(result.retries).toBe(5);
      expect(result.baseUrl).toBe("proxycheck.io"); // Default
    });

    it("should read from environment variables", () => {
      process.env.PROXYCHECK_API_KEY = "env-key";
      process.env.PROXYCHECK_TIMEOUT = "15000";
      process.env.PROXYCHECK_TLS_SECURITY = "false";

      const config = new ConfigManager();
      const result = config.getConfig();

      expect(result.apiKey).toBe("env-key");
      expect(result.timeout).toBe(15000);
      expect(result.tlsSecurity).toBe(false);
    });

    it("should prioritize user config over environment", () => {
      process.env.PROXYCHECK_API_KEY = "env-key";
      process.env.PROXYCHECK_TIMEOUT = "15000";

      const config = new ConfigManager({
        apiKey: "user-key",
        timeout: 10000,
      });
      const result = config.getConfig();

      expect(result.apiKey).toBe("user-key");
      expect(result.timeout).toBe(10000);
    });

    it("should throw validation error for invalid config", () => {
      expect(() => {
        new ConfigManager({ apiKey: "", timeout: -1 });
      }).toThrow(ProxyCheckValidationError);
    });

    it("should update configuration", () => {
      const config = new ConfigManager({ apiKey: "initial-key" });

      config.updateConfig({ apiKey: "updated-key", timeout: 5000 });
      const result = config.getConfig();

      expect(result.apiKey).toBe("updated-key");
      expect(result.timeout).toBe(5000);
    });

    it("should get specific config values", () => {
      const config = new ConfigManager({
        apiKey: "test-key",
        baseUrl: "api.example.com",
        tlsSecurity: true,
        timeout: 10000,
        retries: 2,
        retryDelay: 500,
      });

      expect(config.getApiKey()).toBe("test-key");
      expect(config.getBaseUrl()).toBe("https://api.example.com");
      expect(config.isTlsEnabled()).toBe(true);
      expect(config.getTimeout()).toBe(10000);
      expect(config.getRetryConfig()).toEqual({ retries: 2, retryDelay: 500 });
      expect(config.getUserAgent()).toBe("proxycheck-sdk/0.9.0");
    });

    it("should set API key", () => {
      const config = new ConfigManager({ apiKey: "old-key" });
      config.setApiKey("new-key");

      expect(config.getApiKey()).toBe("new-key");
    });
  });

  describe("validateOptions", () => {
    describe("validateOptions", () => {
      it("should validate valid options", () => {
        const options: ProxyCheckOptions = {
          apiKey: "test-key",
          vpnDetection: 1,
          riskData: 2,
          asnData: true,
        };

        const result = validateOptions(options);
        expect(result).toEqual(options);
      });

      it("should throw validation error for invalid options", () => {
        const options = {
          vpnDetection: 5, // Invalid value
          riskData: "invalid", // Invalid type
        } as unknown as ProxyCheckOptions;

        expect(() => {
          validateOptions(options);
        }).toThrow(ProxyCheckValidationError);
      });
    });

    describe("buildQueryParams", () => {
      it("should build query parameters from options", () => {
        const options: ProxyCheckOptions = {
          vpnDetection: 2,
          riskData: 1,
          asnData: true,
          infEngine: true,
          dayRestrictor: 30,
        };

        const params = buildQueryParams(options, "api-key");

        expect(params).toEqual({
          key: "api-key",
          vpn: 2,
          risk: 1,
          asn: 1,
          inf: 1,
          days: 30,
          node: 1,
          port: 1,
          seen: 1,
        });
      });

      it("should use option apiKey over provided apiKey", () => {
        const options: ProxyCheckOptions = {
          apiKey: "option-key",
        };

        const params = buildQueryParams(options, "provided-key");
        expect(params.key).toBe("option-key");
      });

      it("should handle undefined values", () => {
        const options: ProxyCheckOptions = {};
        const params = buildQueryParams(options);

        expect(params).toEqual({
          node: 1,
          port: 1,
          seen: 1,
        });
      });
    });

    describe("buildPostData", () => {
      it("should not build POST data for single address", () => {
        const options: ProxyCheckOptions = {
          queryTagging: true,
          customTag: "test-tag",
        };

        const data = buildPostData(options, "1.2.3.4");

        expect(data).toEqual({
          tag: "test-tag",
        });
      });

      it("should build POST data for multiple addresses", () => {
        const options: ProxyCheckOptions = {};
        const addresses = ["1.2.3.4", "5.6.7.8"];

        const data = buildPostData(options, addresses);

        expect(data).toEqual({
          ips: "1.2.3.4,5.6.7.8",
        });
      });

      it("should not include tag if queryTagging is false", () => {
        const options: ProxyCheckOptions = {
          queryTagging: false,
          customTag: "test-tag",
        };

        const data = buildPostData(options, "1.2.3.4");

        expect(data.tag).toBeUndefined();
      });
    });

    describe("shouldUsePostMethod", () => {
      it("should return false for single address string", () => {
        const result = shouldUsePostMethod("1.2.3.4");
        expect(result).toBe(false);
      });

      it("should return false for single address array", () => {
        const result = shouldUsePostMethod(["1.2.3.4"]);
        expect(result).toBe(false);
      });

      it("should return true for multiple addresses", () => {
        const result = shouldUsePostMethod(["1.2.3.4", "5.6.7.8"]);
        expect(result).toBe(true);
      });

      it("should return false for undefined addresses", () => {
        const result = shouldUsePostMethod(undefined);
        expect(result).toBe(false);
      });
    });

    describe("processAddresses", () => {
      it("should return addresses unchanged when masking disabled", () => {
        const addresses = ["1.2.3.4", "test@example.com"];
        const result = processAddresses(addresses, false);

        expect(result).toEqual(addresses);
      });

      it("should mask email addresses when enabled", () => {
        const addresses = ["1.2.3.4", "test@example.com", "user@domain.org"];
        const result = processAddresses(addresses, true);

        expect(result).toEqual(["1.2.3.4", "anonymous@example.com", "anonymous@domain.org"]);
      });

      it("should mask single email address", () => {
        const address = "test@example.com";
        const result = processAddresses(address, true);

        expect(result).toBe("anonymous@example.com");
      });
    });

    describe("mergeCountryOptions", () => {
      it("should enable ASN data when country restrictions are set", () => {
        const options: ProxyCheckOptions = {
          allowedCountries: ["US", "CA"],
          asnData: false,
        };

        const result = mergeCountryOptions(options);
        expect(result.asnData).toBe(true);
      });

      it("should enable ASN data for blocked countries", () => {
        const options: ProxyCheckOptions = {
          blockedCountries: ["CN", "RU"],
        };

        const result = mergeCountryOptions(options);
        expect(result.asnData).toBe(true);
      });

      it("should not modify options without country restrictions", () => {
        const options: ProxyCheckOptions = {
          vpnDetection: 1,
        };

        const result = mergeCountryOptions(options);
        expect(result.asnData).toBeUndefined();
      });
    });
  });

  describe("Factory Functions", () => {
    it("should create config manager", () => {
      const config = createConfig({ apiKey: "test-key" });
      expect(config).toBeInstanceOf(ConfigManager);
      expect(config.getApiKey()).toBe("test-key");
    });

    it("should validate options", () => {
      const options: ProxyCheckOptions = {
        vpnDetection: 1,
        riskData: 2,
      };

      const result = validateOptions(options);
      expect(result).toEqual(options);
    });
  });
});
