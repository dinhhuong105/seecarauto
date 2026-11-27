import { buildCacheKey, moduleKeyPrefix } from "./cache-key";

describe("Cache key scheme (ADR-006)", () => {
  it("builds versioned namespaced keys", () => {
    expect(buildCacheKey("products", "detail", "abc-123")).toBe(
      "seecarauto:v1:products:detail:abc-123",
    );
    expect(buildCacheKey("categories", "detail", 42)).toBe(
      "seecarauto:v1:categories:detail:42",
    );
    expect(buildCacheKey("search", "results", "deadbeef")).toBe(
      "seecarauto:v1:search:results:deadbeef",
    );
  });

  it("rejects key parts that could collide or inject segments", () => {
    expect(() => buildCacheKey("prod:ucts", "detail", "1")).toThrow();
    expect(() => buildCacheKey("products", "det ail", "1")).toThrow();
    expect(() => buildCacheKey("products", "detail", "a:b")).toThrow();
    expect(() => buildCacheKey("", "detail", "1")).toThrow();
  });

  it("module prefix covers exactly that module's keys", () => {
    expect(moduleKeyPrefix("products")).toBe("seecarauto:v1:products:");
    expect(() => moduleKeyPrefix("pro ducts")).toThrow();
  });
});
