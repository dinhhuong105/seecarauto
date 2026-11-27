import { CACHE_TTL_SECONDS } from "@seecarauto/shared";

// Cache TTL configuration (ADR-006, SRS NFR-005).
// Exact values live in @seecarauto/shared (CACHE_TTL_SECONDS) — the single
// source of truth shared by frontend/admin/backend. This module only adds
// the DEFAULT for each ranged TTL: the minimum of the approved range
// (conservative — a shorter TTL is always safe). Defaults are explicit
// constants, never scattered literals in service code.

export type CacheTtlKind =
  | "categories"
  | "brands"
  | "productDetail"
  | "productList"
  | "vehicles"
  | "search"
  | "seoMetadata"
  | "siteConfig"
  | "userPermissions"
  | "inventory";

/** Defaults for ranged TTLs (minimum of the approved NFR-005 range). */
export const CACHE_TTL_DEFAULTS: Record<
  "productList" | "search" | "inventory",
  number
> = {
  productList: CACHE_TTL_SECONDS.productListMin,
  search: CACHE_TTL_SECONDS.searchMin,
  inventory: CACHE_TTL_SECONDS.inventoryMin,
} as const;

/** Resolves the TTL (seconds) for a cache kind. */
export function resolveCacheTtl(kind: CacheTtlKind): number {
  switch (kind) {
    case "categories":
      return CACHE_TTL_SECONDS.categories;
    case "brands":
      return CACHE_TTL_SECONDS.brands;
    case "productDetail":
      return CACHE_TTL_SECONDS.productDetail;
    case "productList":
      return CACHE_TTL_DEFAULTS.productList;
    case "vehicles":
      return CACHE_TTL_SECONDS.vehicles;
    case "search":
      return CACHE_TTL_DEFAULTS.search;
    case "seoMetadata":
      return CACHE_TTL_SECONDS.seoMetadata;
    case "siteConfig":
      return CACHE_TTL_SECONDS.siteConfig;
    case "userPermissions":
      return CACHE_TTL_SECONDS.userPermissions;
    case "inventory":
      return CACHE_TTL_DEFAULTS.inventory;
  }
}
