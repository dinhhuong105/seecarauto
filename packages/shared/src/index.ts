// @seecarauto/shared — types, constants and helpers shared by
// frontend, admin and backend. No framework dependency here.

export const SITE_NAME = "SeeCar Auto";
export const SITE_TAGLINE = "Phụ tùng ô tô Chính Hãng - Giá Tốt";
export const CONTACT_PHONE = "0886706338";
export const CONTACT_ZALO = "0886706338";
export const FANPAGE_URL =
  "https://www.facebook.com/profile.php?id=61597072672914";

/** Fixed public URLs must be 100% English, lowercase, hyphenated, no diacritics. */
export const PUBLIC_ROUTES = {
  home: "/",
  parts: "/parts",
  brands: "/brands",
  vehicles: "/vehicles",
  blog: "/blog",
  cart: "/cart",
  checkout: "/checkout",
  account: "/account",
  contact: "/contact",
} as const;

/** Build a product URL from an English slug. Never build URLs from Vietnamese names. */
export function productUrl(slug: string): string {
  return `/products/${slug}`;
}

export function brandUrl(slug: string): string {
  return `/brands/${slug}`;
}

export function vehicleUrl(makeSlug: string, modelSlug: string): string {
  return `/vehicles/${makeSlug}/${modelSlug}`;
}

export function blogPostUrl(slug: string): string {
  return `/blog/${slug}`;
}

/** Dynamic RBAC permission codes: <module>.<action> */
export const PERMISSION_ACTIONS = [
  "view",
  "create",
  "update",
  "delete",
  "export",
  "cancel",
  "manage",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const PERMISSION_MODULES = [
  "products",
  "categories",
  "brands",
  "vehicles",
  "fitments",
  "orders",
  "customers",
  "inventory",
  "promotions",
  "articles",
  "seo",
  "users",
  "roles",
  "settings",
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];

export type PermissionCode = `${PermissionModule}.${PermissionAction}`;

export function permissionCode(
  module: PermissionModule,
  action: PermissionAction,
): PermissionCode {
  return `${module}.${action}`;
}

/** Redis cache TTLs in seconds (approved defaults, see ARCHITECTURE_DECISIONS.md). */
export const CACHE_TTL_SECONDS = {
  categories: 3600, // 1h
  brands: 21600, // 6h
  productDetail: 900, // 15m
  productListMin: 300, // 5m
  productListMax: 900, // 15m
  vehicles: 86400, // 24h
  searchMin: 60, // 1m
  searchMax: 300, // 5m
  seoMetadata: 3600, // 1h
  siteConfig: 3600, // 1h
  userPermissions: 300, // 5m
  inventoryMin: 30, // 30s
  inventoryMax: 60, // 60s
} as const;

export function cacheKey(namespace: string, ...parts: (string | number)[]): string {
  return ["seecarauto", namespace, ...parts].join(":");
}

/** Task lifecycle used by TASK_BOARD.md and the Project Handbook. */
export const TASK_STATUSES = [
  "BACKLOG",
  "READY",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "BLOCKED",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
