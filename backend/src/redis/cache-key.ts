import { cacheKey } from "@seecarauto/shared";

// Cache key scheme (ADR-006, NFR-004): `seecarauto:v1:<module>:<entity>:<id>`.
// The `v1` segment is the key version — bumping it invalidates every key
// written under the previous version without a scan. Key parts must not
// contain `:` or whitespace, otherwise two different logical keys could
// collide or a part could inject an extra segment.

export const CACHE_KEY_VERSION = "v1";

/** Builds a versioned namespaced cache key. Throws on illegal key parts. */
export function buildCacheKey(
  module: string,
  entity: string,
  id: string | number,
): string {
  for (const part of [module, entity, String(id)]) {
    if (part.length === 0 || /[:\s]/.test(part)) {
      throw new Error(
        `Invalid cache key part (must be non-empty, no ':' or whitespace): ${JSON.stringify(part)}`,
      );
    }
  }
  return cacheKey(`${CACHE_KEY_VERSION}:${module}`, entity, id);
}

/** Prefix for every key of a module — used for SCAN-based invalidation. */
export function moduleKeyPrefix(module: string): string {
  if (module.length === 0 || /[:\s]/.test(module)) {
    throw new Error(`Invalid cache module name: ${JSON.stringify(module)}`);
  }
  return `seecarauto:${CACHE_KEY_VERSION}:${module}:`;
}
