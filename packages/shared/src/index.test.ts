import { describe, expect, it } from "vitest";
import {
  CACHE_TTL_SECONDS,
  cacheKey,
  permissionCode,
  productUrl,
  vehicleUrl,
} from "./index";

describe("URL helpers (English-only, hyphenated, no diacritics)", () => {
  it("builds product URLs from English slugs", () => {
    expect(productUrl("water-pump-aisin")).toBe(
      "/products/water-pump-aisin",
    );
  });

  it("builds vehicle URLs from make/model slugs", () => {
    expect(vehicleUrl("toyota", "vios")).toBe("/vehicles/toyota/vios");
  });
});

describe("RBAC permission codes", () => {
  it("formats module.action codes", () => {
    expect(permissionCode("products", "create")).toBe("products.create");
    expect(permissionCode("orders", "cancel")).toBe("orders.cancel");
  });
});

describe("Redis cache TTLs (approved defaults)", () => {
  it("uses the approved TTL values", () => {
    expect(CACHE_TTL_SECONDS.categories).toBe(3600);
    expect(CACHE_TTL_SECONDS.brands).toBe(21600);
    expect(CACHE_TTL_SECONDS.productDetail).toBe(900);
    expect(CACHE_TTL_SECONDS.userPermissions).toBe(300);
    expect(CACHE_TTL_SECONDS.inventoryMin).toBe(30);
  });

  it("namespaces cache keys with seecarauto:", () => {
    expect(cacheKey("products", "detail", 42)).toBe(
      "seecarauto:products:detail:42",
    );
  });
});
