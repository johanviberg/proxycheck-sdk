import { describe, expect, it } from "@jest/globals";
import { VERSION } from "./index";

describe("ProxyCheck SDK", () => {
  it("should export VERSION", () => {
    expect(VERSION).toBeDefined();
    expect(typeof VERSION).toBe("string");
    expect(VERSION).toBe("0.9.0");
  });
});
