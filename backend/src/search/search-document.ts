import type { Prisma } from "@prisma/client";

// Meilisearch Product document (M02-03).
// The document is a READ model built from PostgreSQL/Prisma — PostgreSQL
// stays the source of truth; Meilisearch is only a search index. No prices,
// products or commercial data are invented here: every field comes from the
// Product row, its identifiers, its brand/categories, or its fitments.
//
// Identifier codes are split by type (oemCodes / mpnCodes / partCodes /
// alternateCodes) so the index `searchableAttributes` order can enforce the
// ADR-010 priority (SKU > OEM > MPN > name/brand) via Meilisearch attribute
// ranking, and so typo tolerance can be disabled per code field (AC-09).

export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    identifiers: true;
    brand: true;
    category: true;
    productCategories: { include: { category: true } };
    fitments: { select: { vehicleApplicationId: true } };
  };
}>;

export interface ProductDocument {
  /** Prisma Product id — the Meilisearch primary key. */
  id: string;
  /** Internal SKU (stored normalized in PostgreSQL). */
  sku: string;
  /** Normalized OEM numbers (from product_identifiers, type OEM_NUMBER). */
  oemCodes: string[];
  /** Normalized manufacturer part numbers. */
  mpnCodes: string[];
  /** Normalized part numbers. */
  partCodes: string[];
  /** Normalized alternate numbers. */
  alternateCodes: string[];
  name: string;
  slug: string;
  brandId: string;
  brandName: string;
  brandSlug: string;
  /** Primary category (products.category_id — always present). */
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  /** Primary category slug + extra category slugs (product_categories). */
  categorySlugs: string[];
  /** VND price as a plain number (Prisma Decimal → Number). */
  price: number;
  availabilityStatus: string;
  status: string;
  /** Unix timestamp (seconds) or null when never published — for `newest` sort. */
  publishedAt: number | null;
  /** Unix timestamp (seconds). */
  createdAt: number;
  /** Vehicle application ids this product fits — for the FR-039 vehicle filter. */
  vehicleApplicationIds: string[];
}

/**
 * Code normalization (API_SPEC §9, ADR-010, ERD §3.1): uppercase, strip
 * spaces, hyphens, underscores and dots. The database already stores the
 * normalized form in `normalizedValue`; this helper is for normalizing a
 * search query the same way (used by M03-08) and is unit-tested here.
 */
export function normalizeSearchCode(raw: string): string {
  return raw.toUpperCase().replace(/[\s\-_.]/g, "");
}

/** Only PUBLISHED, non-soft-deleted products belong in the public index (AC-14). */
export function isIndexable(product: {
  status: string;
  deletedAt: Date | null;
}): boolean {
  return product.status === "PUBLISHED" && product.deletedAt === null;
}

function codesOf(product: ProductWithRelations, type: string): string[] {
  return product.identifiers
    .filter((i) => i.identifierType === type)
    .map((i) => i.normalizedValue);
}

export function toProductDocument(
  product: ProductWithRelations,
): ProductDocument {
  const categorySlugs = [
    product.category.slug,
    ...product.productCategories.map((pc) => pc.category.slug),
  ];
  return {
    id: product.id,
    sku: product.sku,
    oemCodes: codesOf(product, "OEM_NUMBER"),
    mpnCodes: codesOf(product, "MANUFACTURER_PART_NUMBER"),
    partCodes: codesOf(product, "PART_NUMBER"),
    alternateCodes: codesOf(product, "ALTERNATE_NUMBER"),
    name: product.name,
    slug: product.slug,
    brandId: product.brandId,
    brandName: product.brand.name,
    brandSlug: product.brand.slug,
    categoryId: product.categoryId,
    categoryName: product.category.name,
    categorySlug: product.category.slug,
    categorySlugs: [...new Set(categorySlugs)],
    price: Number(product.price.toString()),
    availabilityStatus: product.availabilityStatus,
    status: product.status,
    publishedAt: product.publishedAt
      ? Math.floor(product.publishedAt.getTime() / 1000)
      : null,
    createdAt: Math.floor(product.createdAt.getTime() / 1000),
    vehicleApplicationIds: product.fitments.map((f) => f.vehicleApplicationId),
  };
}
