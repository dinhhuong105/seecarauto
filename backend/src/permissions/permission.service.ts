import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { buildCacheKey } from "../redis/cache-key";
import { resolveCacheTtl } from "../redis/cache-ttl.config";
import { CacheService } from "../redis/cache.service";
import { RbacException } from "../rbac/rbac.errors";

// PermissionService (M02-06, RB-13) — the SINGLE shared permission-resolve
// function for /me (M02-05 D-10) and PermissionsGuard. AuthService.getMe()
// delegates here; the guard calls resolvePermissions() per request.
//
// Semantics (RB-05, unchanged from getMe/G4): union of role grants +
// user-level exceptions; ANY granted = false (role or user level) denies
// the code. Access tokens never carry the permission list (API_SPEC §5) —
// resolve reads DB/cache on every request.
//
// Cache (ADR-006, §2.5): CacheService cache-aside, kind `userPermissions`
// (TTL 300s, resolved via resolveCacheTtl — never a literal 300 in
// business code), key `seecarauto:v1:rbac:permissions:<userId>`.
// CacheService never throws on Redis failure (get -> null, set/delete ->
// false), so a Redis outage degrades to a direct DB read — the guard
// never rejects a valid request just because the cache is down (RB-04).
// A DB failure is different: permissions cannot be verified at all, so
// resolve fails closed with 503 SERVICE_UNAVAILABLE (never a 500 with a
// stack trace, AC-16).
//
// Invalidation (RB-04): delete with up to 3 attempts; failure is logged
// (error level) and reported as `false` — the caller must NOT claim the
// change took effect immediately while invalidation has not succeeded.
// Stale permissions live at most until the 300s TTL expires.

export const RBAC_PERMISSIONS_CACHE_MODULE = "rbac";
export const RBAC_PERMISSIONS_CACHE_ENTITY = "permissions";
export const MAX_INVALIDATION_ATTEMPTS = 3;

export function permissionsCacheKey(userId: string): string {
  return buildCacheKey(
    RBAC_PERMISSIONS_CACHE_MODULE,
    RBAC_PERMISSIONS_CACHE_ENTITY,
    userId,
  );
}

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Resolves the effective permission codes of an account (cached).
   * Sorted, deny-wins, exactly what /me returns and what the guard
   * enforces (AC-03). Unknown account -> 401 UNAUTHENTICATED; DB
   * failure -> 503 SERVICE_UNAVAILABLE (fail-closed).
   */
  async resolvePermissions(userId: string): Promise<string[]> {
    const ttlSeconds = resolveCacheTtl("userPermissions");
    return this.cache.remember(permissionsCacheKey(userId), ttlSeconds, () =>
      this.resolvePermissionsFromDb(userId),
    );
  }

  /**
   * The raw DB resolve (no cache): role grants + user exceptions merged
   * into allows/denies, deny wins. Split out so tests can assert the
   * cache layer separately from the merge logic.
   */
  async resolvePermissionsFromDb(userId: string): Promise<string[]> {
    let user;
    try {
      user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: { include: { permission: true } },
                },
              },
            },
          },
          userPermissions: { include: { permission: true } },
        },
      });
    } catch {
      // The DB state cannot be verified — fail closed, never 500.
      throw RbacException.serviceUnavailable(5);
    }
    if (user === null) {
      throw RbacException.unauthenticated();
    }
    const allows = new Set<string>();
    const denies = new Set<string>();
    for (const ur of user.userRoles) {
      for (const rp of ur.role.rolePermissions) {
        const code = `${rp.permission.module}.${rp.permission.action}`;
        if (rp.granted) {
          allows.add(code);
        } else {
          denies.add(code);
        }
      }
    }
    for (const up of user.userPermissions) {
      const code = `${up.permission.module}.${up.permission.action}`;
      if (up.granted) {
        allows.add(code);
      } else {
        denies.add(code);
      }
    }
    // Deny wins over allow (RB-05 / D-10).
    return [...allows].filter((code) => !denies.has(code)).sort();
  }

  /** All catalog codes (`module.action`), sorted — the seed source (§6). */
  async getCatalogCodes(): Promise<string[]> {
    let rows;
    try {
      rows = await this.prisma.permission.findMany({
        select: { module: true, action: true },
      });
    } catch {
      throw RbacException.serviceUnavailable(5);
    }
    return rows.map((r) => `${r.module}.${r.action}`).sort();
  }

  /**
   * Validates permission codes against the catalog (RB-03): every unknown
   * code -> 400 VALIDATION_ERROR with details
   * [{ field: "permissions[i].action", code: "UNKNOWN_PERMISSION" }].
   * The index `i` is the position in the input array.
   */
  async validatePermissionCodes(codes: string[]): Promise<void> {
    const known = new Set(await this.getCatalogCodes());
    const details: { field: string; code: string; message: string }[] = [];
    codes.forEach((code, i) => {
      if (!known.has(code)) {
        details.push({
          field: `permissions[${i}].action`,
          code: "UNKNOWN_PERMISSION",
          message: `Quyền ${code} không có trong catalog.`,
        });
      }
    });
    if (details.length > 0) {
      throw RbacException.validationError(details);
    }
  }

  /**
   * Invalidates one account's cached permissions, retrying up to 3 times
   * (RB-04). Returns true when the key is gone; false after 3 failed
   * attempts (logged at error level — the caller must not claim the
   * change took effect immediately).
   */
  async invalidateUserPermissions(userId: string): Promise<boolean> {
    const key = permissionsCacheKey(userId);
    for (let attempt = 1; attempt <= MAX_INVALIDATION_ATTEMPTS; attempt++) {
      let deleted = false;
      try {
        deleted = await this.cache.delete(key);
      } catch (error) {
        this.logger.error(
          `Permission cache invalidation failed for user ${userId} (attempt ${attempt}/${MAX_INVALIDATION_ATTEMPTS}): ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      if (deleted) return true;
      if (attempt < MAX_INVALIDATION_ATTEMPTS) {
        this.logger.warn(
          `Permission cache invalidation failed for user ${userId} (attempt ${attempt}/${MAX_INVALIDATION_ATTEMPTS}) — retrying`,
        );
      }
    }
    this.logger.error(
      `Permission cache invalidation FAILED for user ${userId} after ${MAX_INVALIDATION_ATTEMPTS} attempts — stale permissions may live until the 300s TTL expires`,
    );
    return false;
  }

  /**
   * Invalidates the cached permissions of several accounts (still tries
   * every account even when one fails). Returns false when ANY account
   * could not be invalidated.
   */
  async invalidateUsersPermissions(userIds: string[]): Promise<boolean> {
    let allOk = true;
    for (const userId of userIds) {
      const ok = await this.invalidateUserPermissions(userId);
      if (!ok) allOk = false;
    }
    return allOk;
  }

  /**
   * Invalidates the cached permissions of every account holding a role
   * (used after a role matrix change). Returns false when the affected
   * accounts could not be determined (DB read failed) or any of their
   * keys could not be invalidated.
   */
  async invalidateRolePermissions(roleId: string): Promise<boolean> {
    let userIds: string[];
    try {
      const rows = await this.prisma.userRole.findMany({
        where: { roleId },
        select: { userId: true },
      });
      userIds = rows.map((r) => r.userId);
    } catch (error) {
      this.logger.error(
        `Could not list accounts holding role ${roleId} for cache invalidation: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
    return this.invalidateUsersPermissions(userIds);
  }
}
