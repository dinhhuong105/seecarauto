import { Logger } from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service";
import type { CacheService } from "../redis/cache.service";
import { resolveCacheTtl } from "../redis/cache-ttl.config";
import {
  MAX_INVALIDATION_ATTEMPTS,
  PermissionService,
  permissionsCacheKey,
} from "./permission.service";
import { RbacException } from "../rbac/rbac.errors";

// PermissionService unit tests (M02-06, AC-03/AC-05/AC-06/AC-11).
// Prisma + CacheService are faked at the service boundary — the merge,
// cache and retry logic under test is real. The fake cache mimics the
// CacheService contract (get -> null on miss, set/delete -> boolean,
// remember -> get, then loader, then set); stampede protection itself is
// CacheService's (M02-02, already tested) and is not re-tested here.

type PermissionRow = { module: string; action: string };

function permissionRow(module: string, action: string): PermissionRow {
  return { module, action };
}

function rolePermissions(
  grants: [string, string, boolean][],
): { granted: boolean; permission: PermissionRow }[] {
  return grants.map(([module, action, granted]) => ({
    granted,
    permission: permissionRow(module, action),
  }));
}

function fakeUser(
  overrides: {
    userRoles?: {
      role: { id: string; rolePermissions: ReturnType<typeof rolePermissions> };
    }[];
    userPermissions?: { granted: boolean; permission: PermissionRow }[];
  } = {},
) {
  return {
    id: "user-1",
    userRoles: overrides.userRoles ?? [],
    userPermissions: overrides.userPermissions ?? [],
  };
}

function fakeCache() {
  const store = new Map<string, unknown>();
  const calls = { get: 0, set: 0, delete: 0 };
  let deleteImpl: (key: string) => Promise<boolean> = async (key) => {
    return store.delete(key);
  };
  const cache = {
    calls,
    store,
    setDeleteImpl(impl: (key: string) => Promise<boolean>) {
      deleteImpl = impl;
    },
    async get<T>(key: string): Promise<T | null> {
      calls.get++;
      const value = store.get(key);
      return (value ?? null) as T | null;
    },
    async set<T>(key: string, value: T): Promise<boolean> {
      calls.set++;
      store.set(key, value);
      return true;
    },
    async delete(key: string): Promise<boolean> {
      calls.delete++;
      return deleteImpl(key);
    },
    async remember<T>(
      key: string,
      _ttl: number,
      loader: () => Promise<T>,
    ): Promise<T> {
      const cached = await this.get<T>(key);
      if (cached !== null) return cached;
      const value = await loader();
      await this.set(key, value);
      return value;
    },
  };
  return cache;
}

describe("PermissionService", () => {
  let prisma: {
    user: { findUnique: jest.Mock };
    permission: { findMany: jest.Mock };
    userRole: { findMany: jest.Mock };
  };
  let cache: ReturnType<typeof fakeCache>;
  let service: PermissionService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
      permission: { findMany: jest.fn() },
      userRole: { findMany: jest.fn() },
    };
    cache = fakeCache();
    service = new PermissionService(
      prisma as unknown as PrismaService,
      cache as unknown as CacheService,
    );
    prisma.permission.findMany.mockResolvedValue([
      permissionRow("products", "view"),
      permissionRow("products", "create"),
      permissionRow("roles", "view"),
      permissionRow("roles", "update"),
    ]);
  });

  // ---------------------------------------------------------- resolve (AC-03)

  it("merges role grants + user exceptions, sorted, deny wins (role grant + role deny)", async () => {
    prisma.user.findUnique.mockResolvedValue(
      fakeUser({
        userRoles: [
          {
            role: {
              id: "role-a",
              rolePermissions: rolePermissions([
                ["products", "view", true],
                ["products", "create", true],
              ]),
            },
          },
          {
            role: {
              id: "role-b",
              rolePermissions: rolePermissions([["products", "create", false]]),
            },
          },
        ],
      }),
    );
    await expect(service.resolvePermissions("user-1")).resolves.toEqual([
      "products.view",
    ]);
  });

  it("deny wins: role grant + user deny -> deny", async () => {
    prisma.user.findUnique.mockResolvedValue(
      fakeUser({
        userRoles: [
          {
            role: {
              id: "role-a",
              rolePermissions: rolePermissions([["roles", "view", true]]),
            },
          },
        ],
        userPermissions: [
          { granted: false, permission: permissionRow("roles", "view") },
        ],
      }),
    );
    await expect(service.resolvePermissions("user-1")).resolves.toEqual([]);
  });

  it("deny wins: user grant + role deny -> deny", async () => {
    prisma.user.findUnique.mockResolvedValue(
      fakeUser({
        userRoles: [
          {
            role: {
              id: "role-a",
              rolePermissions: rolePermissions([["roles", "view", false]]),
            },
          },
        ],
        userPermissions: [
          { granted: true, permission: permissionRow("roles", "view") },
        ],
      }),
    );
    await expect(service.resolvePermissions("user-1")).resolves.toEqual([]);
  });

  it("user grant adds a code no role grants", async () => {
    prisma.user.findUnique.mockResolvedValue(
      fakeUser({
        userPermissions: [
          { granted: true, permission: permissionRow("roles", "update") },
        ],
      }),
    );
    await expect(service.resolvePermissions("user-1")).resolves.toEqual([
      "roles.update",
    ]);
  });

  it("account with no roles and no exceptions -> empty set", async () => {
    prisma.user.findUnique.mockResolvedValue(fakeUser());
    await expect(service.resolvePermissions("user-1")).resolves.toEqual([]);
  });

  it("unknown account -> 401 UNAUTHENTICATED", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.resolvePermissions("ghost")).rejects.toMatchObject({
      status: 401,
      response: { error: "UNAUTHENTICATED" },
    });
  });

  it("DB failure -> 503 SERVICE_UNAVAILABLE, never a raw Prisma error", async () => {
    prisma.user.findUnique.mockRejectedValue(new Error("connection refused"));
    const error = await service
      .resolvePermissions("user-1")
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RbacException);
    expect(error as RbacException).toMatchObject({
      status: 503,
      response: { error: "SERVICE_UNAVAILABLE" },
    });
  });

  // ------------------------------------------------------------ cache (AC-05)

  it("TTL kind userPermissions resolves to 300 and the key follows the M02-02 scheme", () => {
    expect(resolveCacheTtl("userPermissions")).toBe(300);
    expect(permissionsCacheKey("user-1")).toBe(
      "seecarauto:v1:rbac:permissions:user-1",
    );
  });

  it("second resolve is a cache hit — no second DB read", async () => {
    prisma.user.findUnique.mockResolvedValue(
      fakeUser({
        userPermissions: [
          { granted: true, permission: permissionRow("products", "view") },
        ],
      }),
    );
    await service.resolvePermissions("user-1");
    await service.resolvePermissions("user-1");
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
  });

  it("after invalidation the next resolve reads the DB again", async () => {
    prisma.user.findUnique.mockResolvedValue(fakeUser());
    await service.resolvePermissions("user-1");
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
    await expect(service.invalidateUserPermissions("user-1")).resolves.toBe(
      true,
    );
    await service.resolvePermissions("user-1");
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(2);
  });

  // ------------------------------------------------------ invalidation (AC-06)

  it("invalidation retries a failing delete up to 3 times, then succeeds", async () => {
    let attempts = 0;
    cache.setDeleteImpl(async () => {
      attempts++;
      return attempts >= 3;
    });
    await expect(service.invalidateUserPermissions("user-1")).resolves.toBe(
      true,
    );
    expect(attempts).toBe(3);
    expect(attempts).toBe(MAX_INVALIDATION_ATTEMPTS);
  });

  it("invalidation failing 3 times returns false and logs an error", async () => {
    cache.setDeleteImpl(async () => false);
    const errorSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
    const result = await service.invalidateUserPermissions("user-1");
    // Snapshot the call history BEFORE restoring (mockRestore clears it).
    const errorCalls = errorSpy.mock.calls.length;
    const loggedFailure = errorSpy.mock.calls.some((args) =>
      String(args[0]).includes("invalidation FAILED"),
    );
    errorSpy.mockRestore();
    expect(result).toBe(false);
    expect(cache.calls.delete).toBe(MAX_INVALIDATION_ATTEMPTS);
    expect(errorCalls).toBeGreaterThan(0);
    expect(loggedFailure).toBe(true);
  });

  it("invalidateRolePermissions deletes every holder's key", async () => {
    prisma.user.findUnique.mockResolvedValue(fakeUser());
    prisma.userRole.findMany.mockResolvedValue([
      { userId: "user-a" },
      { userId: "user-b" },
    ]);
    await service.resolvePermissions("user-a");
    await service.resolvePermissions("user-b");
    expect(cache.store.has(permissionsCacheKey("user-a"))).toBe(true);
    expect(cache.store.has(permissionsCacheKey("user-b"))).toBe(true);
    await expect(service.invalidateRolePermissions("role-1")).resolves.toBe(
      true,
    );
    expect(cache.store.has(permissionsCacheKey("user-a"))).toBe(false);
    expect(cache.store.has(permissionsCacheKey("user-b"))).toBe(false);
  });

  it("invalidateRolePermissions returns false when the holder list cannot be read", async () => {
    prisma.userRole.findMany.mockRejectedValue(new Error("db down"));
    await expect(service.invalidateRolePermissions("role-1")).resolves.toBe(
      false,
    );
  });

  // ------------------------------------------------------- validation (AC-11)

  it("validatePermissionCodes passes known codes, rejects unknown ones with UNKNOWN_PERMISSION", async () => {
    await expect(
      service.validatePermissionCodes(["products.view", "roles.view"]),
    ).resolves.toBeUndefined();
    const error = await service
      .validatePermissionCodes(["products.view", "nope.unknown"])
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RbacException);
    expect(error as RbacException).toMatchObject({
      status: 400,
      response: {
        error: "VALIDATION_ERROR",
        details: [
          {
            field: "permissions[1].action",
            code: "UNKNOWN_PERMISSION",
          },
        ],
      },
    });
  });

  it("getCatalogCodes returns the sorted catalog", async () => {
    await expect(service.getCatalogCodes()).resolves.toEqual([
      "products.create",
      "products.view",
      "roles.update",
      "roles.view",
    ]);
  });
});
