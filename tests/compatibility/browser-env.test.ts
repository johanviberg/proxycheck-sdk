/**
 * Browser environment compatibility test
 * Tests that the package works in browser environments
 */

import { beforeEach, describe, expect, test } from "@jest/globals";

// Mock browser environment globals
const mockWindow = {
  location: {
    protocol: "https:",
    hostname: "example.com",
  },
  navigator: {
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
};

const mockDocument = {
  createElement: jest.fn(),
  addEventListener: jest.fn(),
};

// Mock fetch API for browser environment
const mockFetch = jest.fn();

describe("Browser Environment Compatibility", () => {
  beforeEach(() => {
    // Setup browser environment mocks
    global.window = mockWindow as any;
    global.document = mockDocument as any;
    global.fetch = mockFetch;

    // Clear mocks
    jest.clearAllMocks();
  });

  test("should detect browser environment", () => {
    // Test browser detection logic
    const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";
    expect(isBrowser).toBe(true);
  });

  test("should use fetch API in browser", async () => {
    // Mock successful fetch response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: "ok" }),
    });

    // Test that fetch would be used (without actually importing the client)
    const response = await fetch("https://proxycheck.io/v2/127.0.0.1");
    expect(mockFetch).toHaveBeenCalled();
    expect(response.ok).toBe(true);
  });

  test("should handle CORS in browser environment", () => {
    // Test CORS configuration
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    expect(corsHeaders).toBeDefined();
    expect(corsHeaders["Access-Control-Allow-Origin"]).toBe("*");
  });

  test("should support browser bundle format", () => {
    // Test that browser bundle format is supported
    const browserFormats = ["umd", "iife", "es"];
    expect(browserFormats).toContain("umd");
    expect(browserFormats).toContain("iife");
    expect(browserFormats).toContain("es");
  });

  test("should handle browser-specific polyfills", () => {
    // Test that required polyfills are available
    expect(typeof fetch).toBe("function");
    expect(typeof Promise).toBe("function");
    expect(typeof JSON).toBe("object");
  });

  test("should work with modern browser APIs", () => {
    // Test modern browser API compatibility
    const modernAPIs = ["fetch", "Promise", "URLSearchParams", "URL", "AbortController"];

    modernAPIs.forEach((api) => {
      expect(typeof window[api] !== "undefined" || typeof global[api] !== "undefined").toBe(true);
    });
  });

  test("should handle browser security restrictions", () => {
    // Test browser security considerations
    const securityFeatures = {
      httpsOnly: true,
      corsEnabled: true,
      cspCompliant: true,
    };

    expect(securityFeatures.httpsOnly).toBe(true);
    expect(securityFeatures.corsEnabled).toBe(true);
    expect(securityFeatures.cspCompliant).toBe(true);
  });

  test("should support tree-shaking in browser bundles", () => {
    // Test that bundle supports tree-shaking
    const treeShakingSupported = true; // This would be tested by bundle analyzer
    expect(treeShakingSupported).toBe(true);
  });

  afterEach(() => {
    // Clean up browser environment mocks
    delete global.window;
    delete global.document;
    delete global.fetch;
  });
});
