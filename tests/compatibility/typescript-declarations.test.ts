/**
 * TypeScript Declaration File Compatibility Test
 * Verifies that the SDK's TypeScript declarations work correctly
 */

import { describe, expect, test } from "@jest/globals";
import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

describe("TypeScript Declaration Compatibility", () => {
  const declarationFile = path.resolve(__dirname, "../../dist/index.d.ts");

  test("should have TypeScript declaration file", () => {
    expect(fs.existsSync(declarationFile)).toBe(true);
  });

  test("should export main types", () => {
    const content = fs.readFileSync(declarationFile, "utf-8");
    
    // Check for main class exports (rollup generates different format)
    expect(content).toContain("declare class ProxyCheck");
    expect(content).toMatch(/export\s*{[^}]*ProxyCheck[^}]*}/);
    expect(content).toMatch(/export\s*{[^}]*ProxyCheckClient[^}]*}/);
    
    // Check for version export
    expect(content).toContain("VERSION");
    
    // Check for error exports
    expect(content).toContain("ProxyCheckError");
    expect(content).toContain("ProxyCheckConfigurationError");
    expect(content).toContain("ProxyCheckAuthError");
    expect(content).toContain("ProxyCheckRateLimitError");
  });

  test("should have proper interface definitions", () => {
    const content = fs.readFileSync(declarationFile, "utf-8");
    
    // Check for main interfaces (defined and exported separately in rollup output)
    expect(content).toContain("interface CheckResult");
    expect(content).toMatch(/export\s*type\s*{[^}]*CheckResult[^}]*}/);
    expect(content).toContain("interface ProxyCheckOptions");
    expect(content).toMatch(/export\s*type\s*{[^}]*ProxyCheckOptions[^}]*}/);
    expect(content).toContain("interface SemanticCheckOptions");
    expect(content).toMatch(/export\s*type\s*{[^}]*SemanticCheckOptions[^}]*}/);
  });

  test("should compile without errors", () => {
    const testFile = `
      import { ProxyCheck, CheckResult, ProxyCheckError } from '${declarationFile.replace(/\.d\.ts$/, "")}';
      
      const client = new ProxyCheck({ apiKey: 'test' });
      const checkPromise: Promise<CheckResult> = client.check('1.2.3.4');
      const batchPromise: Promise<Map<string, CheckResult>> = client.checkBatch(['1.2.3.4']);
      const isProxyPromise: Promise<boolean> = client.isProxy('1.2.3.4');
      
      const error = new ProxyCheckError('test', 'TEST_ERROR');
    `;

    const result = ts.transpileModule(testFile, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
      },
    });

    // Should transpile without errors
    expect(result.diagnostics).toHaveLength(0);
  });

  test("should have complete method signatures", () => {
    const content = fs.readFileSync(declarationFile, "utf-8");
    
    // Check convenience methods (more flexible matching)
    expect(content).toContain("isProxy(address: string");
    expect(content).toContain("Promise<boolean>");
    expect(content).toContain("isVPN(address: string");
    expect(content).toContain("isSuspicious(address: string");
    expect(content).toContain("isDisposableEmail(email: string");
    expect(content).toContain("getRiskLevel(address: string");
  });

  test("should have dashboard and lists properties", () => {
    const content = fs.readFileSync(declarationFile, "utf-8");
    
    // Check for dashboard property (as getter)
    expect(content).toContain("get dashboard():");
    expect(content).toContain("DashboardAPI");
    
    // Check for lists property (as getter)
    expect(content).toContain("get lists():");
    expect(content).toContain("whitelist");
    expect(content).toContain("blacklist");
  });
});