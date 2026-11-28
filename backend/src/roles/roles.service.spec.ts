import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import type { PermissionService } from "../permissions/permission.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { RbacAuditService } from "../rbac/audit.service";
import { RbacException } from "../rbac/rbac.errors";
import type { RbacService } from "../rbac/rbac.service";
import { computeRoleMatrixEtag, RolesService } from "./roles.service";

// RolesService unit tests (M06-02, Pha 1).
// Prisma is faked at the service boundary (the pattern from
// permission.service.spec.ts): $transaction invokes its callback with a
// fake tx object, so the transaction + audit + error-mapping logic under
// test is real while no database is touched. Real-DB behaviour is proven
// by backend/test/roles.e2e-spec.ts.

const ACTOR = randomUUID();
const ROLE_ID = randomUUID();

function p2002() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "6.19.3",
  });
}

function p2025() {
  return new Prisma.PrismaClientKnownRequestError("Record not found", {
    code: "P2025",
    clientVersion: "6.19.3",
  });
}

function makeTx(overrides: Record<string, unknown> = {}) {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: ROLE_ID }]),
    role: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    rolePermission: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    userRole: {
      count: jest.fn().mockResolvedValue(0),
    },
    ...overrides,
  } as unknown as Record<string, unknown>;
  return tx;
}

function makePrisma(tx: unknown) {
  return {
    role: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      findUniqueOrThrow: jest.fn(),
    },
    userRole: {
      groupBy: jest.fn().mockResolvedValue([]),
    },
    rolePermission: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb(tx)),
  };
}

function makeService(deps: {
  prisma: unknown;
  permissions?: unknown;
  rbac?: unknown;
  audit?: unknown;
}) {
  const permissions = (deps.permissions ?? {
    getCatalogCodes: jest
      .fn()
      .mockResolvedValue(["products.view", "products.create", "roles.view"]),
  }) as unknown as PermissionService;
  const rbac = (deps.rbac ?? {
    replaceRolePermissions: jest.fn(),
  }) as unknown as RbacService;
  const audit = (deps.audit ?? {
    record: jest.fn().mockResolvedValue(undefined),
  }) as unknown as RbacAuditService;
  const service = new RolesService(
    deps.prisma as unknown as PrismaService,
    permissions,
    rbac,
    audit,
  );
  return { service, permissions, rbac, audit };
}

describe("RolesService (unit)", () => {
  describe("listRoles", () => {
    it("clamps page/limit, orders name ASC + id ASC, maps userCount", async () => {
      const tx = makeTx();
      const prisma = makePrisma(tx);
      prisma.role.count.mockResolvedValue(25);
      prisma.role.findMany.mockResolvedValue([
        { id: "r1", name: "alpha", description: null },
        { id: "r2", name: "beta", description: "d" },
      ]);
      prisma.userRole.groupBy.mockResolvedValue([
        { roleId: "r1", _count: { roleId: 3 } },
      ]);
      const { service } = makeService({ prisma });
      const result = await service.listRoles(0, 101);
      expect(prisma.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ name: "asc" }, { id: "asc" }],
          skip: 0,
          take: 100,
        }),
      );
      expect(result.meta).toEqual({
        page: 1,
        limit: 100,
        total: 25,
        totalPages: 1,
      });
      expect(result.data).toEqual([
        { id: "r1", name: "alpha", description: null, userCount: 3 },
        { id: "r2", name: "beta", description: "d", userCount: 0 },
      ]);
    });

    it("page beyond totalPages returns an empty page with correct meta", async () => {
      const tx = makeTx();
      const prisma = makePrisma(tx);
      prisma.role.count.mockResolvedValue(5);
      prisma.role.findMany.mockResolvedValue([]);
      const { service } = makeService({ prisma });
      const result = await service.listRoles(3, 20);
      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({
        page: 3,
        limit: 20,
        total: 5,
        totalPages: 1,
      });
    });
  });

  describe("createRole", () => {
    it("creates the role and audits role.created (before null)", async () => {
      const tx = makeTx();
      const created = { id: ROLE_ID, name: "seller", description: null };
      (tx.role as { create: jest.Mock }).create.mockResolvedValue(created);
      const prisma = makePrisma(tx);
      const auditRecord = jest.fn().mockResolvedValue(undefined);
      const { service } = makeService({
        prisma,
        audit: { record: auditRecord },
      });
      const result = await service.createRole({ name: "seller" }, ACTOR);
      expect(result).toEqual(created);
      expect(auditRecord).toHaveBeenCalledTimes(1);
      expect(auditRecord).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({
          actorId: ACTOR,
          action: "role.created",
          entityType: "ROLE",
          entityId: ROLE_ID,
          before: null,
          after: { id: ROLE_ID, name: "seller", description: null },
        }),
      );
    });

    it("duplicate name -> 409 ROLE_NAME_DUPLICATE (P2002 mapped)", async () => {
      const tx = makeTx();
      (tx.role as { create: jest.Mock }).create.mockRejectedValue(p2002());
      const prisma = makePrisma(tx);
      const { service } = makeService({ prisma });
      await expect(
        service.createRole({ name: "seller" }, ACTOR),
      ).rejects.toMatchObject({
        status: 409,
        response: { error: "ROLE_NAME_DUPLICATE" },
      });
    });
  });

  describe("updateRole", () => {
    it("empty body -> 400 VALIDATION_ERROR (at least one field)", async () => {
      const tx = makeTx();
      const prisma = makePrisma(tx);
      const { service } = makeService({ prisma });
      await expect(
        service.updateRole(ROLE_ID, {}, ACTOR),
      ).rejects.toMatchObject({
        status: 400,
        response: { error: "VALIDATION_ERROR" },
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("missing role -> 404 ROLE_NOT_FOUND", async () => {
      const tx = makeTx();
      (tx.$queryRaw as jest.Mock).mockResolvedValue([]);
      const prisma = makePrisma(tx);
      const { service } = makeService({ prisma });
      await expect(
        service.updateRole(ROLE_ID, { name: "x" }, ACTOR),
      ).rejects.toMatchObject({
        status: 404,
        response: { error: "ROLE_NOT_FOUND" },
      });
    });

    it("renaming to another role's name -> 409 ROLE_NAME_DUPLICATE", async () => {
      const tx = makeTx();
      const before = { id: ROLE_ID, name: "old", description: null };
      (tx.role as { findUnique: jest.Mock }).findUnique.mockResolvedValue(
        before,
      );
      (tx.role as { findFirst: jest.Mock }).findFirst.mockResolvedValue({
        id: randomUUID(),
      });
      const prisma = makePrisma(tx);
      const { service } = makeService({ prisma });
      await expect(
        service.updateRole(ROLE_ID, { name: "taken" }, ACTOR),
      ).rejects.toMatchObject({
        status: 409,
        response: { error: "ROLE_NAME_DUPLICATE" },
      });
    });

    it("updates only the sent fields and audits before/after (GAP-05)", async () => {
      const tx = makeTx();
      const before = { id: ROLE_ID, name: "old", description: "d1" };
      const after = { id: ROLE_ID, name: "old", description: "d2" };
      (tx.role as { findUnique: jest.Mock }).findUnique.mockResolvedValue(
        before,
      );
      (tx.role as { update: jest.Mock }).update.mockResolvedValue(after);
      const prisma = makePrisma(tx);
      const auditRecord = jest.fn().mockResolvedValue(undefined);
      const { service } = makeService({
        prisma,
        audit: { record: auditRecord },
      });
      const result = await service.updateRole(
        ROLE_ID,
        { description: "d2" },
        ACTOR,
      );
      expect(result).toEqual(after);
      expect(auditRecord).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({
          action: "role.updated",
          entityType: "ROLE",
          entityId: ROLE_ID,
          before: { id: ROLE_ID, name: "old", description: "d1" },
          after: { id: ROLE_ID, name: "old", description: "d2" },
        }),
      );
    });
  });

  describe("deleteRole", () => {
    it("assigned role -> 409 ROLE_HAS_USERS with the count, nothing deleted", async () => {
      const tx = makeTx();
      const role = { id: ROLE_ID, name: "seller", description: null };
      (tx.role as { findUnique: jest.Mock }).findUnique.mockResolvedValue(role);
      (tx.userRole as { count: jest.Mock }).count.mockResolvedValue(3);
      const prisma = makePrisma(tx);
      const { service } = makeService({ prisma });
      const error = await service
        .deleteRole(ROLE_ID, ACTOR)
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(RbacException);
      expect((error as RbacException).getStatus()).toBe(409);
      expect(
        (error as RbacException).getResponse() as { error: string },
      ).toMatchObject({ error: "ROLE_HAS_USERS" });
      expect(
        ((error as RbacException).getResponse() as { details: unknown[] })
          .details,
      ).toEqual([
        {
          field: "count",
          code: "ROLE_HAS_USERS",
          message: "Vai trò đang được gán cho 3 tài khoản.",
        },
      ]);
      expect((tx.role as { delete: jest.Mock }).delete).not.toHaveBeenCalled();
    });

    it("unassigned role -> deletes + audits before with the lost matrix", async () => {
      const tx = makeTx();
      const role = { id: ROLE_ID, name: "seller", description: null };
      (tx.role as { findUnique: jest.Mock }).findUnique.mockResolvedValue(role);
      (tx.rolePermission as { findMany: jest.Mock }).findMany.mockResolvedValue(
        [
          {
            permission: { module: "roles", action: "view" },
            granted: true,
          },
          {
            permission: { module: "products", action: "create" },
            granted: false,
          },
        ],
      );
      (tx.userRole as { count: jest.Mock }).count.mockResolvedValue(0);
      const prisma = makePrisma(tx);
      const auditRecord = jest.fn().mockResolvedValue(undefined);
      const { service } = makeService({
        prisma,
        audit: { record: auditRecord },
      });
      await service.deleteRole(ROLE_ID, ACTOR);
      expect((tx.role as { delete: jest.Mock }).delete).toHaveBeenCalledWith({
        where: { id: ROLE_ID },
      });
      expect(auditRecord).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({
          action: "role.deleted",
          entityType: "ROLE",
          entityId: ROLE_ID,
          before: {
            id: ROLE_ID,
            name: "seller",
            description: null,
            permissions: [
              { module: "products", action: "create" },
              { module: "roles", action: "view" },
            ],
          },
          after: null,
        }),
      );
    });
  });

  describe("getRolePermissions", () => {
    it("returns all catalog codes; ungranted codes are granted:false", async () => {
      const updatedAt = new Date("2026-11-28T10:00:00.000Z");
      const tx = makeTx();
      const prisma = makePrisma(tx);
      prisma.role.findUniqueOrThrow.mockResolvedValue({
        id: ROLE_ID,
        updatedAt,
      });
      prisma.rolePermission.findMany.mockResolvedValue([
        {
          granted: true,
          permission: { module: "roles", action: "view" },
        },
      ]);
      const { service } = makeService({ prisma });
      const result = await service.getRolePermissions(ROLE_ID);
      expect(result.roleId).toBe(ROLE_ID);
      expect(result.permissions).toEqual([
        { module: "products", action: "create", granted: false },
        { module: "products", action: "view", granted: false },
        { module: "roles", action: "view", granted: true },
      ]);
      expect(result.etag).toBe(
        computeRoleMatrixEtag(updatedAt, result.permissions),
      );
    });

    it("missing role -> 404 ROLE_NOT_FOUND (P2025 mapped)", async () => {
      const tx = makeTx();
      const prisma = makePrisma(tx);
      prisma.role.findUniqueOrThrow.mockRejectedValue(p2025());
      const { service } = makeService({ prisma });
      await expect(service.getRolePermissions(ROLE_ID)).rejects.toMatchObject({
        status: 404,
        response: { error: "ROLE_NOT_FOUND" },
      });
    });
  });

  describe("updateRolePermissions", () => {
    const updatedAt = new Date("2026-11-28T10:00:00.000Z");
    const matrix = [
      { module: "products", action: "create", granted: false },
      { module: "products", action: "view", granted: false },
      { module: "roles", action: "view", granted: true },
    ];
    const etag = computeRoleMatrixEtag(updatedAt, matrix);

    function matrixPrisma() {
      const tx = makeTx();
      const prisma = makePrisma(tx);
      prisma.role.findUniqueOrThrow.mockResolvedValue({
        id: ROLE_ID,
        updatedAt,
      });
      prisma.rolePermission.findMany.mockResolvedValue([
        {
          granted: true,
          permission: { module: "roles", action: "view" },
        },
      ]);
      return prisma;
    }

    it("missing If-Match -> 412 PRECONDITION_FAILED", async () => {
      const prisma = matrixPrisma();
      const { service } = makeService({ prisma });
      await expect(
        service.updateRolePermissions(ROLE_ID, [], undefined, ACTOR),
      ).rejects.toMatchObject({
        status: 412,
        response: { error: "PRECONDITION_FAILED" },
      });
    });

    it("stale etag -> 412 PRECONDITION_FAILED, replace never called", async () => {
      const prisma = matrixPrisma();
      const replace = jest.fn();
      const { service } = makeService({
        prisma,
        rbac: { replaceRolePermissions: replace },
      });
      await expect(
        service.updateRolePermissions(ROLE_ID, [], '"stale"', ACTOR),
      ).rejects.toMatchObject({
        status: 412,
        response: { error: "PRECONDITION_FAILED" },
      });
      expect(replace).not.toHaveBeenCalled();
    });

    it("matching etag -> delegates to RbacService, returns the new etag", async () => {
      const prisma = matrixPrisma();
      const newMatrix = [
        { module: "products", action: "create", granted: true },
        { module: "products", action: "view", granted: false },
        { module: "roles", action: "view", granted: true },
      ];
      const replace = jest.fn().mockResolvedValue({
        roleId: ROLE_ID,
        permissions: newMatrix,
        cacheInvalidated: true,
      });
      const { service } = makeService({
        prisma,
        rbac: { replaceRolePermissions: replace },
      });
      const result = await service.updateRolePermissions(
        ROLE_ID,
        newMatrix,
        etag,
        ACTOR,
      );
      expect(replace).toHaveBeenCalledWith(ROLE_ID, newMatrix, ACTOR);
      expect(result.permissions).toEqual(newMatrix);
      expect(result.cacheInvalidated).toBe(true);
      expect(result.etag).toBe(computeRoleMatrixEtag(updatedAt, newMatrix));
      expect(result.etag).not.toBe(etag);
    });
  });

  describe("computeRoleMatrixEtag", () => {
    it("is deterministic, quoted, and changes with the matrix or updatedAt", () => {
      const t1 = new Date("2026-11-28T10:00:00.000Z");
      const t2 = new Date("2026-11-28T10:00:01.000Z");
      const m1 = [{ module: "roles", action: "view", granted: true }];
      const m2 = [{ module: "roles", action: "view", granted: false }];
      const e1 = computeRoleMatrixEtag(t1, m1);
      expect(e1).toMatch(/^"[0-9a-f]{64}"$/);
      expect(computeRoleMatrixEtag(t1, m1)).toBe(e1);
      expect(computeRoleMatrixEtag(t1, m2)).not.toBe(e1);
      expect(computeRoleMatrixEtag(t2, m1)).not.toBe(e1);
      // Order-independent: the same matrix in a different order hashes equal.
      expect(
        computeRoleMatrixEtag(t1, [
          { module: "roles", action: "view", granted: true },
          { module: "products", action: "view", granted: false },
        ]),
      ).toBe(
        computeRoleMatrixEtag(t1, [
          { module: "products", action: "view", granted: false },
          { module: "roles", action: "view", granted: true },
        ]),
      );
    });
  });
});
