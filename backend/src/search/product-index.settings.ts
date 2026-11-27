import type { Settings } from "meilisearch";

// Product Index settings (M02-03) — implements API_SPEC §14 + ADR-010.
//
// Priority (BR-002): SKU exact → OEM exact → manufacturer code →
// name/brand → fuzzy. Meilisearch enforces this with two mechanisms:
//   1. `searchableAttributes` order — the `attribute` ranking rule prefers
//      matches in earlier attributes, so a SKU match outranks an OEM match,
//      which outranks a name match.
//   2. `typoTolerance.disableOnAttributes` — code fields never match with a
//      typo, so a 1-char-off OEM is NOT an exact match (AC-09, FR-036).
// Name/brand allow at most ONE typo, and only for words of 5+ characters
// ("1 ký tự cho từ dài", API_SPEC §14): `twoTypos` is set to 255 so a
// second typo is effectively never allowed.
//
// Filters (FR-038/FR-039, GET /search): categorySlug (+ categorySlugs for
// extra categories), brandSlug, availabilityStatus, status,
// vehicleApplicationIds. Sorts (GET /search): price_asc/price_desc/newest
// (publishedAt desc) — hence sortableAttributes ['price', 'publishedAt'].
// `status` is filterable so M03-08 can guarantee only PUBLISHED documents
// are ever returned even if a stale document lingers in the index.
export const PRODUCT_INDEX_SETTINGS: Settings = {
  searchableAttributes: [
    "sku",
    "oemCodes",
    "mpnCodes",
    "partCodes",
    "alternateCodes",
    "name",
    "brandName",
    "categoryName",
  ],
  filterableAttributes: [
    "categorySlug",
    "categorySlugs",
    "brandSlug",
    "availabilityStatus",
    "status",
    "vehicleApplicationIds",
    "price",
  ],
  sortableAttributes: ["price", "publishedAt"],
  rankingRules: [
    "words",
    "typo",
    "proximity",
    "attribute",
    "sort",
    "exactness",
  ],
  typoTolerance: {
    enabled: true,
    minWordSizeForTypos: { oneTypo: 5, twoTypos: 255 },
    disableOnAttributes: [
      "sku",
      "oemCodes",
      "mpnCodes",
      "partCodes",
      "alternateCodes",
    ],
  },
  stopWords: [],
};
