import { CACHE_TTL_SECONDS } from "@seecarauto/shared";
import { CACHE_TTL_DEFAULTS, resolveCacheTtl } from "./cache-ttl.config";

// TTLs must match SRS NFR-005 / ADR-006 exactly. If a value here drifts,
// the AC-05 automated assertion must fail — that is the point of this test.
describe("Cache TTL configuration (NFR-005 / ADR-006)", () => {
  it("shared TTL constants equal the approved NFR-005 values", () => {
    expect(CACHE_TTL_SECONDS.categories).toBe(3600);
    expect(CACHE_TTL_SECONDS.brands).toBe(21600);
    expect(CACHE_TTL_SECONDS.productDetail).toBe(900);
    expect(CACHE_TTL_SECONDS.productListMin).toBe(300);
    expect(CACHE_TTL_SECONDS.productListMax).toBe(900);
    expect(CACHE_TTL_SECONDS.vehicles).toBe(86400);
    expect(CACHE_TTL_SECONDS.searchMin).toBe(60);
    expect(CACHE_TTL_SECONDS.searchMax).toBe(300);
    expect(CACHE_TTL_SECONDS.seoMetadata).toBe(3600);
    expect(CACHE_TTL_SECONDS.siteConfig).toBe(3600);
    expect(CACHE_TTL_SECONDS.userPermissions).toBe(300);
    expect(CACHE_TTL_SECONDS.inventoryMin).toBe(30);
    expect(CACHE_TTL_SECONDS.inventoryMax).toBe(60);
  });

  it("defaults for ranged TTLs lie inside the approved ranges", () => {
    expect(CACHE_TTL_DEFAULTS.productList).toBeGreaterThanOrEqual(
      CACHE_TTL_SECONDS.productListMin,
    );
    expect(CACHE_TTL_DEFAULTS.productList).toBeLessThanOrEqual(
      CACHE_TTL_SECONDS.productListMax,
    );
    expect(CACHE_TTL_DEFAULTS.search).toBeGreaterThanOrEqual(
      CACHE_TTL_SECONDS.searchMin,
    );
    expect(CACHE_TTL_DEFAULTS.search).toBeLessThanOrEqual(
      CACHE_TTL_SECONDS.searchMax,
    );
    expect(CACHE_TTL_DEFAULTS.inventory).toBeGreaterThanOrEqual(
      CACHE_TTL_SECONDS.inventoryMin,
    );
    expect(CACHE_TTL_DEFAULTS.inventory).toBeLessThanOrEqual(
      CACHE_TTL_SECONDS.inventoryMax,
    );
  });

  it("resolveCacheTtl returns the approved value for every kind", () => {
    expect(resolveCacheTtl("categories")).toBe(3600);
    expect(resolveCacheTtl("brands")).toBe(21600);
    expect(resolveCacheTtl("productDetail")).toBe(900);
    expect(resolveCacheTtl("productList")).toBe(CACHE_TTL_DEFAULTS.productList);
    expect(resolveCacheTtl("vehicles")).toBe(86400);
    expect(resolveCacheTtl("search")).toBe(CACHE_TTL_DEFAULTS.search);
    expect(resolveCacheTtl("seoMetadata")).toBe(3600);
    expect(resolveCacheTtl("siteConfig")).toBe(3600);
    expect(resolveCacheTtl("userPermissions")).toBe(300);
    expect(resolveCacheTtl("inventory")).toBe(CACHE_TTL_DEFAULTS.inventory);
  });
});
