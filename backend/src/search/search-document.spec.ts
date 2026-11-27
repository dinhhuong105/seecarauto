import { Prisma } from "@prisma/client";
import {
  isIndexable,
  normalizeSearchCode,
  toProductDocument,
  type ProductWithRelations,
} from "./search-document";

function fakeProduct(
  overrides: Partial<ProductWithRelations> = {},
): ProductWithRelations {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    sku: "AISINWPT001",
    name: "Water Pump Aisin",
    slug: "water-pump-aisin",
    shortDescription: null,
    description: null,
    brandId: "22222222-2222-2222-2222-222222222222",
    brand: {
      id: "22222222-2222-2222-2222-222222222222",
      name: "Aisin",
      slug: "aisin",
      description: null,
      logoUrl: null,
      isVisible: true,
      createdAt: new Date("2026-11-01T00:00:00Z"),
      updatedAt: new Date("2026-11-01T00:00:00Z"),
    },
    categoryId: "33333333-3333-3333-3333-333333333333",
    category: {
      id: "33333333-3333-3333-3333-333333333333",
      parentId: null,
      name: "Engine",
      slug: "engine",
      displayOrder: 0,
      isVisible: true,
      createdAt: new Date("2026-11-01T00:00:00Z"),
      updatedAt: new Date("2026-11-01T00:00:00Z"),
    },
    status: "PUBLISHED",
    availabilityStatus: "IN_STOCK",
    price: new Prisma.Decimal("1250000"),
    publishedAt: new Date("2026-11-20T00:00:00Z"),
    createdAt: new Date("2026-11-20T00:00:00Z"),
    updatedAt: new Date("2026-11-20T00:00:00Z"),
    deletedAt: null,
    identifiers: [
      {
        id: "44444444-4444-4444-4444-444444444444",
        productId: "11111111-1111-1111-1111-111111111111",
        identifierType: "OEM_NUMBER",
        identifierValue: "16100-0Y010",
        normalizedValue: "161000Y010",
        issuingMakeId: "55555555-5555-5555-5555-555555555555",
        issuingBrandId: null,
        isPrimary: true,
        createdAt: new Date("2026-11-20T00:00:00Z"),
        updatedAt: new Date("2026-11-20T00:00:00Z"),
      },
      {
        id: "66666666-6666-6666-6666-666666666666",
        productId: "11111111-1111-1111-1111-111111111111",
        identifierType: "MANUFACTURER_PART_NUMBER",
        identifierValue: "WPT-001",
        normalizedValue: "WPT001",
        issuingMakeId: null,
        issuingBrandId: "22222222-2222-2222-2222-222222222222",
        isPrimary: true,
        createdAt: new Date("2026-11-20T00:00:00Z"),
        updatedAt: new Date("2026-11-20T00:00:00Z"),
      },
    ],
    productCategories: [],
    images: [],
    specifications: [],
    fitments: [
      { vehicleApplicationId: "77777777-7777-7777-7777-777777777777" },
    ],
    fitmentChangeLogs: [],
    orderItems: [],
    ...overrides,
  } as unknown as ProductWithRelations;
}

describe("normalizeSearchCode", () => {
  it("uppercases and strips spaces, hyphens, underscores, dots", () => {
    expect(normalizeSearchCode("16100-0y010")).toBe("161000Y010");
    expect(normalizeSearchCode(" wpt_001 ")).toBe("WPT001");
    expect(normalizeSearchCode("a.b-c_d e")).toBe("ABCDE");
    expect(normalizeSearchCode("AISINWPT001")).toBe("AISINWPT001");
  });
});

describe("isIndexable", () => {
  it("indexes PUBLISHED, non-deleted products only", () => {
    expect(isIndexable({ status: "PUBLISHED", deletedAt: null })).toBe(true);
    expect(isIndexable({ status: "DRAFT", deletedAt: null })).toBe(false);
    expect(isIndexable({ status: "HIDDEN", deletedAt: null })).toBe(false);
    expect(isIndexable({ status: "PUBLISHED", deletedAt: new Date() })).toBe(
      false,
    );
  });
});

describe("toProductDocument", () => {
  it("maps every field from the Prisma product", () => {
    const doc = toProductDocument(fakeProduct());
    expect(doc.id).toBe("11111111-1111-1111-1111-111111111111");
    expect(doc.sku).toBe("AISINWPT001");
    expect(doc.oemCodes).toEqual(["161000Y010"]);
    expect(doc.mpnCodes).toEqual(["WPT001"]);
    expect(doc.partCodes).toEqual([]);
    expect(doc.alternateCodes).toEqual([]);
    expect(doc.name).toBe("Water Pump Aisin");
    expect(doc.slug).toBe("water-pump-aisin");
    expect(doc.brandName).toBe("Aisin");
    expect(doc.brandSlug).toBe("aisin");
    expect(doc.categoryName).toBe("Engine");
    expect(doc.categorySlug).toBe("engine");
    expect(doc.categorySlugs).toEqual(["engine"]);
    expect(doc.price).toBe(1250000);
    expect(doc.availabilityStatus).toBe("IN_STOCK");
    expect(doc.status).toBe("PUBLISHED");
    expect(doc.publishedAt).toBe(
      Math.floor(new Date("2026-11-20T00:00:00Z").getTime() / 1000),
    );
    expect(doc.vehicleApplicationIds).toEqual([
      "77777777-7777-7777-7777-777777777777",
    ]);
  });

  it("keeps the original code value out of the document (normalized only)", () => {
    const doc = toProductDocument(fakeProduct());
    expect(JSON.stringify(doc)).not.toContain("16100-0Y010");
    expect(JSON.stringify(doc)).not.toContain("WPT-001");
  });

  it("merges extra categories into categorySlugs without duplicates", () => {
    const extra = {
      id: "88888888-8888-8888-8888-888888888888",
      parentId: null,
      name: "Cooling",
      slug: "cooling",
      displayOrder: 0,
      isVisible: true,
      createdAt: new Date("2026-11-01T00:00:00Z"),
      updatedAt: new Date("2026-11-01T00:00:00Z"),
    };
    const doc = toProductDocument(
      fakeProduct({
        productCategories: [
          {
            productId: "11111111-1111-1111-1111-111111111111",
            categoryId: "88888888-8888-8888-8888-888888888888",
            displayOrder: 0,
            category: extra,
          },
        ],
      }),
    );
    expect(doc.categorySlugs).toEqual(["engine", "cooling"]);
  });

  it("maps null publishedAt to null", () => {
    const doc = toProductDocument(fakeProduct({ publishedAt: null }));
    expect(doc.publishedAt).toBeNull();
  });
});
