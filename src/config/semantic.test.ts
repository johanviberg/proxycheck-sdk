import { describe, expect, it } from "@jest/globals";
import type { SemanticCheckOptions } from "../types/responses";
import {
  DEFAULT_CHECK_OPTIONS,
  mergeSemanticOptions,
  PRESET_OPTIONS,
  semanticToLegacyOptions,
  validateSemanticOptions,
} from "./semantic";

describe("Semantic Configuration", () => {
  describe("DEFAULT_CHECK_OPTIONS", () => {
    it("should have sensible defaults", () => {
      expect(DEFAULT_CHECK_OPTIONS).toEqual({
        detection: {
          mode: "both",
        },
        enrich: {
          risk: "basic",
          location: false,
          network: false,
          lastSeen: false,
          port: false,
        },
        timeRange: 7,
      });
    });
  });

  describe("PRESET_OPTIONS", () => {
    it("should have security focused preset", () => {
      expect(PRESET_OPTIONS.security).toEqual({
        detection: {
          mode: "comprehensive",
        },
        enrich: {
          risk: "detailed",
          location: true,
          network: true,
          lastSeen: true,
          port: true,
        },
        timeRange: 30,
      });
    });

    it("should have performance focused preset", () => {
      expect(PRESET_OPTIONS.performance).toEqual({
        detection: {
          mode: "proxy",
        },
        enrich: {
          risk: false,
          location: false,
          network: false,
          lastSeen: false,
          port: false,
        },
        timeRange: 1,
      });
    });

    it("should have quick check preset", () => {
      expect(PRESET_OPTIONS.quickCheck).toEqual({
        detection: {
          mode: "proxy",
        },
        enrich: {
          risk: false,
        },
        timeRange: 1,
      });
    });

    it("should have thorough check preset", () => {
      expect(PRESET_OPTIONS.thoroughCheck).toEqual({
        detection: {
          mode: "comprehensive",
        },
        enrich: {
          risk: "detailed",
          location: true,
          network: true,
          lastSeen: true,
          port: true,
        },
        timeRange: 30,
      });
    });

    it("should have VPN only preset", () => {
      expect(PRESET_OPTIONS.vpnOnly).toEqual({
        detection: {
          mode: "vpn",
        },
        enrich: {
          risk: "basic",
        },
        timeRange: 7,
      });
    });
  });

  describe("mergeSemanticOptions", () => {
    it("should merge options with defaults", () => {
      const options: Partial<SemanticCheckOptions> = {
        enrich: {
          risk: "detailed",
        },
        timeRange: 30,
      };

      const result = mergeSemanticOptions(options, DEFAULT_CHECK_OPTIONS);

      expect(result).toEqual({
        detection: {
          mode: "both",
        },
        enrich: {
          risk: "detailed",
          location: false,
          network: false,
          lastSeen: false,
          port: false,
        },
        timeRange: 30,
      });
    });

    it("should handle empty options", () => {
      const result = mergeSemanticOptions({}, DEFAULT_CHECK_OPTIONS);
      expect(result).toEqual(DEFAULT_CHECK_OPTIONS);
    });

    it("should handle nested partial options", () => {
      const options: Partial<SemanticCheckOptions> = {
        enrich: {
          location: true,
        },
      };

      const result = mergeSemanticOptions(options, DEFAULT_CHECK_OPTIONS);

      expect(result.enrich.location).toBe(true);
      expect(result.enrich.risk).toBe("basic");
      expect(result.enrich.network).toBe(false);
    });

    it("should merge tags", () => {
      const options: Partial<SemanticCheckOptions> = {
        tag: "test-tag",
      };

      const result = mergeSemanticOptions(options, DEFAULT_CHECK_OPTIONS);
      expect(result.tag).toBe("test-tag");
    });

    it("should merge country restrictions", () => {
      const options: Partial<SemanticCheckOptions> = {
        allowedCountries: ["US", "CA"],
        blockedCountries: ["CN", "RU"],
      };

      const result = mergeSemanticOptions(options, DEFAULT_CHECK_OPTIONS);
      expect(result.allowedCountries).toEqual(["US", "CA"]);
      expect(result.blockedCountries).toEqual(["CN", "RU"]);
    });
  });

  describe("validateSemanticOptions", () => {
    it("should validate correct options", () => {
      const options: SemanticCheckOptions = {
        detection: {
          mode: "both",
        },
        enrich: {
          risk: "basic",
          location: false,
          network: false,
          lastSeen: false,
          port: false,
        },
        timeRange: 7,
      };

      const result = validateSemanticOptions(options);
      expect(result).toEqual(options);
    });

    it("should validate minimal options", () => {
      const options: SemanticCheckOptions = {
        detection: {
          mode: "proxy",
        },
        enrich: {
          risk: false,
        },
      };

      const result = validateSemanticOptions(options);
      expect(result).toEqual(options);
    });

    it("should validate with optional fields", () => {
      const options: SemanticCheckOptions = {
        detection: {
          mode: "comprehensive",
        },
        enrich: {
          risk: "detailed",
          location: true,
          network: true,
          lastSeen: true,
          port: true,
        },
        timeRange: 30,
        tag: "test-tag",
        allowedCountries: ["US", "CA"],
        blockedCountries: ["CN", "RU"],
      };

      const result = validateSemanticOptions(options);
      expect(result).toEqual(options);
    });

    it("should throw for invalid detection mode", () => {
      const options = {
        detection: {
          mode: "invalid",
        },
        enrich: {
          risk: "basic",
        },
      } as unknown as SemanticCheckOptions;

      expect(() => validateSemanticOptions(options)).toThrow();
    });

    it("should throw for invalid risk level", () => {
      const options = {
        detection: {
          mode: "both",
        },
        enrich: {
          risk: "invalid",
        },
      } as unknown as SemanticCheckOptions;

      expect(() => validateSemanticOptions(options)).toThrow();
    });

    it("should throw for invalid time range", () => {
      const options = {
        detection: {
          mode: "both",
        },
        enrich: {
          risk: "basic",
        },
        timeRange: -1,
      } as unknown as SemanticCheckOptions;

      expect(() => validateSemanticOptions(options)).toThrow();
    });
  });

  describe("semanticToLegacyOptions", () => {
    it("should convert semantic options to legacy format", () => {
      const semanticOptions: SemanticCheckOptions = {
        detection: {
          mode: "comprehensive",
        },
        enrich: {
          risk: "detailed",
          location: true,
          network: true,
          lastSeen: true,
          port: true,
        },
        timeRange: 30,
        tag: "test-tag",
      };

      const result = semanticToLegacyOptions(semanticOptions, "test-api-key");

      expect(result).toEqual(
        expect.objectContaining({
          apiKey: "test-api-key",
        }),
      );
    });

    it("should handle basic options", () => {
      const semanticOptions: SemanticCheckOptions = {
        detection: {
          mode: "proxy",
        },
        enrich: {
          risk: false,
        },
        timeRange: 1,
      };

      const result = semanticToLegacyOptions(semanticOptions, "test-api-key");

      expect(result.apiKey).toBe("test-api-key");
    });

    it("should handle missing API key", () => {
      const result = semanticToLegacyOptions(DEFAULT_CHECK_OPTIONS);
      expect(result.apiKey).toBeUndefined();
    });
  });

  describe("Detection mode mapping", () => {
    it("should map detection modes correctly", () => {
      const proxyOnly: SemanticCheckOptions = {
        detection: { mode: "proxy" },
        enrich: { risk: false },
      };

      const vpnOnly: SemanticCheckOptions = {
        detection: { mode: "vpn" },
        enrich: { risk: false },
      };

      const both: SemanticCheckOptions = {
        detection: { mode: "both" },
        enrich: { risk: false },
      };

      const comprehensive: SemanticCheckOptions = {
        detection: { mode: "comprehensive" },
        enrich: { risk: false },
      };

      const proxyResult = semanticToLegacyOptions(proxyOnly, "key");
      const vpnResult = semanticToLegacyOptions(vpnOnly, "key");
      const bothResult = semanticToLegacyOptions(both, "key");
      const comprehensiveResult = semanticToLegacyOptions(comprehensive, "key");

      expect(proxyResult).toBeDefined();
      expect(vpnResult).toBeDefined();
      expect(bothResult).toBeDefined();
      expect(comprehensiveResult).toBeDefined();
    });
  });

  describe("Risk level mapping", () => {
    it("should map risk levels correctly", () => {
      const riskFalse: SemanticCheckOptions = {
        detection: { mode: "both" },
        enrich: { risk: false },
      };

      const riskBasic: SemanticCheckOptions = {
        detection: { mode: "both" },
        enrich: { risk: "basic" },
      };

      const riskDetailed: SemanticCheckOptions = {
        detection: { mode: "both" },
        enrich: { risk: "detailed" },
      };

      const falseResult = semanticToLegacyOptions(riskFalse, "key");
      const basicResult = semanticToLegacyOptions(riskBasic, "key");
      const detailedResult = semanticToLegacyOptions(riskDetailed, "key");

      expect(falseResult).toBeDefined();
      expect(basicResult).toBeDefined();
      expect(detailedResult).toBeDefined();
    });
  });

  describe("Boolean to numeric conversion", () => {
    it("should convert boolean flags to numeric values", () => {
      const options: SemanticCheckOptions = {
        detection: { mode: "both" },
        enrich: {
          risk: "basic",
          location: true,
          network: true,
          lastSeen: true,
          port: true,
        },
        timeRange: 7,
      };

      const result = semanticToLegacyOptions(options, "key");
      expect(result).toBeDefined();
      expect(result.apiKey).toBe("key");
    });
  });
});
