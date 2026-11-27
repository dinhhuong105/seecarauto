import { PRODUCT_INDEX_SETTINGS } from "./product-index.settings";

describe("PRODUCT_INDEX_SETTINGS", () => {
  it("orders searchable attributes by ADR-010 priority (SKU > OEM > MPN > name/brand)", () => {
    const attrs = PRODUCT_INDEX_SETTINGS.searchableAttributes ?? [];
    const idx = (name: string): number => attrs.indexOf(name);
    expect(idx("sku")).toBeLessThan(idx("oemCodes"));
    expect(idx("oemCodes")).toBeLessThan(idx("mpnCodes"));
    expect(idx("mpnCodes")).toBeLessThan(idx("name"));
    expect(idx("name")).toBeLessThan(idx("brandName"));
  });

  it("disables typo tolerance on every code field (AC-09)", () => {
    const disabled =
      PRODUCT_INDEX_SETTINGS.typoTolerance?.disableOnAttributes ?? [];
    for (const field of [
      "sku",
      "oemCodes",
      "mpnCodes",
      "partCodes",
      "alternateCodes",
    ]) {
      expect(disabled).toContain(field);
    }
  });

  it("allows at most one typo on name/brand, only for words of 5+ characters (API_SPEC §14)", () => {
    const min = PRODUCT_INDEX_SETTINGS.typoTolerance?.minWordSizeForTypos;
    expect(min?.oneTypo).toBe(5);
    // twoTypos = 255 means a second typo is effectively never allowed.
    expect(min?.twoTypos).toBe(255);
  });

  it("exposes the filters and sorts GET /search needs", () => {
    const filterable = PRODUCT_INDEX_SETTINGS.filterableAttributes ?? [];
    for (const field of [
      "categorySlug",
      "brandSlug",
      "availabilityStatus",
      "status",
      "vehicleApplicationIds",
    ]) {
      expect(filterable).toContain(field);
    }
    const sortable = PRODUCT_INDEX_SETTINGS.sortableAttributes ?? [];
    expect(sortable).toContain("price");
    expect(sortable).toContain("publishedAt");
  });

  it("keeps the default ranking rules order", () => {
    expect(PRODUCT_INDEX_SETTINGS.rankingRules).toEqual([
      "words",
      "typo",
      "proximity",
      "attribute",
      "sort",
      "exactness",
    ]);
  });
});
