/**
 * Package.json Exports Configuration Test
 * Verifies that the package.json exports field is configured correctly
 */

import { describe, expect, test } from "@jest/globals";
import * as fs from "fs";
import * as path from "path";

describe("Package.json Exports Configuration", () => {
  const packageJsonPath = path.resolve(__dirname, "../../package.json");
  let packageJson: any;

  beforeAll(() => {
    const content = fs.readFileSync(packageJsonPath, "utf-8");
    packageJson = JSON.parse(content);
  });

  test("should have correct main entry points", () => {
    expect(packageJson.main).toBe("./dist/index.js");
    expect(packageJson.module).toBe("./dist/index.mjs");
    expect(packageJson.types).toBe("./dist/index.d.ts");
  });

  test("should have correct exports configuration", () => {
    expect(packageJson.exports).toBeDefined();
    expect(packageJson.exports["."]).toBeDefined();
    
    const mainExport = packageJson.exports["."];
    expect(mainExport.types).toBe("./dist/index.d.ts");
    expect(mainExport.import).toBe("./dist/index.mjs");
    expect(mainExport.require).toBe("./dist/index.js");
  });

  test("should specify Node.js engine requirement", () => {
    expect(packageJson.engines).toBeDefined();
    expect(packageJson.engines.node).toBe(">=18.12.0");
  });

  test("should have correct module type", () => {
    expect(packageJson.type).toBe("commonjs");
  });

  test("should include only necessary files in package", () => {
    expect(packageJson.files).toBeDefined();
    expect(packageJson.files).toContain("dist");
    expect(packageJson.files).toContain("README.md");
    expect(packageJson.files).toContain("LICENSE");
    expect(packageJson.files).not.toContain("src");
    expect(packageJson.files).not.toContain("tests");
  });

  test("should have all required dependencies", () => {
    expect(packageJson.dependencies).toBeDefined();
    expect(packageJson.dependencies.axios).toBeDefined();
    expect(packageJson.dependencies.zod).toBeDefined();
  });

  test("should have Node.js-specific keywords", () => {
    expect(packageJson.keywords).toContain("node");
    expect(packageJson.keywords).toContain("nodejs");
    expect(packageJson.keywords).toContain("esm");
    expect(packageJson.keywords).toContain("commonjs");
    expect(packageJson.keywords).not.toContain("browser");
  });

  test("should verify built files exist", () => {
    const distPath = path.resolve(__dirname, "../../dist");
    
    if (fs.existsSync(distPath)) {
      expect(fs.existsSync(path.join(distPath, "index.js"))).toBe(true);
      expect(fs.existsSync(path.join(distPath, "index.mjs"))).toBe(true);
      expect(fs.existsSync(path.join(distPath, "index.d.ts"))).toBe(true);
    } else {
      console.warn("Distribution files not found. Run 'pnpm build' to test built file existence.");
    }
  });
});