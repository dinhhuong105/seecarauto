import { Injectable, Logger } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PermissionService } from "../permissions/permission.service";
import { PrismaService } from "../prisma/prisma.service";
import { RbacAuditService, isUuid } from "./audit.service";
import { RbacException, type RbacValidationDetail } from "./rbac.errors";

// RbacService (M02-06) — the service-level permission mutations that the
// future M06-02/03/04 endpoints will call. M02-06 implements NO admin
// endpoints (RB-15); these methods are the foundation the endpoints use.
//
// Every mutation follows RB-06: the permission change and its AuditLog
// row commit or roll back in ONE PostgreSQL transaction (audit insert
// failure -> the whole mutation rolls back, proven by the FK test in the
// e2e spec). Cache invalidation runs only AFTER commit (§2.5/RB-04);
// the returned `cacheInvalidated` tells the caller whether the change
// is already visible (true) or may take up to the 300s TTL to propagate
// (false — never claim immediate effect while invalidation failed).
//
// Concurrency (AC-17): replaceRolePermissions locks the role row
// (SELECT ... FOR UPDATE), so two concurrent full-matrix replacements
// serialize — the final state is exactly one of the two matrices, never
// a mix. assign/remove lock the user row for the same reason.
//
// All inputs are validated before any DB write: UUID format, no
// duplicate codes, every code in the catalog (RB-03). Unknown role ->
// 404 ROLE_NOT_FOUND; unknown user -> 404 NOT_FOUND. A DB failure mid-
// transaction is fail-closed 503 (never a raw Prisma error, AC-16).

export interface PermissionGrantInput {
  module: string;
  action: string;
  granted: boolean;
}

export interface UserPermissionInput {
  module: string;
  action: string;
  /** null = delete the exception, fall back to role grants. */
  granted: boolean | null;
}

export interface RolePermissionsResult {
  roleId: string;
  permissions: PermissionGrantInput[];
  cacheInvalidated: boolean;
}

export interface UserPermissionsResult {
  userId: string;
  /** Only the non-null exceptions that remain after the replace. */
  permissions: PermissionGrantInput[];
  cacheInvalidated: boolean;
}

export interface UserRoleResult {
  userId: string;
  roleId: string;
  /** false = idempotent no-op (already assigned / not assigned). */
  changed: boolean;
  cacheInvalidated: boolean;
}

function codeOf(item: { module: string; action: string }): string {
  return `${item.module}.${item.action}`;
}

function sortGrants(items: PermissionGrantInput[]): PermissionGrantInput[] {
  return [...items].sort((a, b) => codeOf(a).localeCompare(codeOf(b)));
}

function assertUuidField(value: string, field: string): void {
  if (!isUuid(value)) {
    const details: RbacValidationDetail[] = [
      { field, code: "INVALID_FORMAT", message: `${field} phải là UUID.` },
    ];
    throw RbacException.validationError(details);
  }
}

function assertNoDuplicateCodes(codes: string[]): void {
  const seen = new Set<string>();
  const details: RbacValidationDetail[] = [];
  codes.forEach((code, i) => {
    if (seen.has(code)) {
      details.push({
        field: `permissions[${i}].action`,
        code: "DUPLICATE_PERMISSION",
        message: `Quyền ${code} bị lặp trong danh sách.`,
      });
    }
    seen.add(code);
  });
  if (details.length > 0) {
    throw RbacException.validationError(details);
  }
}

@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
    private readonly audit: RbacAuditService,
  ) {}

  /**
   * Replaces a role's whole permission matrix (FR-080/FR-084).
   * Atomic: old rows deleted + new rows inserted + audit, one
   * transaction. The role row is locked, so concurrent replacements of
   * the same role serialize (AC-17).
   */
  async replaceRolePermissions(
    roleId: string,
    items: PermissionGrantInput[],
    actorId: string,
  ): Promise<RolePermissionsResult> {
    assertUuidField(roleId, "roleId");
    assertUuidField(actorId, "actorId");
    assertNoDuplicateCodes(items.map(codeOf));
    await this.permissions.validatePermissionCodes(items.map(codeOf));
    const newMatrix = sortGrants(items);
    let committed: PermissionGrantInput[];
    try {
      committed = await this.prisma.$transaction(async (tx) => {
        const locked = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM roles WHERE id = ${roleId}::uuid FOR UPDATE`;
        if (locked.length === 0) {
          throw RbacException.roleNotFound();
        }
        const oldRows = await tx.rolePermission.findMany({
          where: { roleId },
          include: { permission: true },
        });
        const before = sortGrants(
          oldRows.map((r) => ({
            module: r.permission.module,
            action: r.permission.action,
            granted: r.granted,
          })),
        );
        const permissionIds = await this.permissionIdsInTx(tx, items);
        await tx.rolePermission.deleteMany({ where: { roleId } });
        if (items.length > 0) {
          await tx.rolePermission.createMany({
            data: items.map((item) => ({
              roleId,
              permissionId: permissionIds.get(codeOf(item)) as string,
              granted: item.granted,
            })),
          });
        }
        await this.audit.record(tx, {
          actorId,
          action: "role.permissions_updated",
          entityType: "ROLE",
          entityId: roleId,
          before: { permissions: before },
          after: { permissions: newMatrix },
        });
        return newMatrix;
      });
    } catch (error) {
      if (error instanceof RbacException) throw error;
      this.logger.error(
        `replaceRolePermissions failed for role ${roleId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw RbacException.serviceUnavailable(5);
    }
    const cacheInvalidated =
      await this.permissions.invalidateRolePermissions(roleId);
    return { roleId, permissions: committed, cacheInvalidated };
  }

  /**
   * Replaces an account's permission exceptions (FR-083). Items with
   * granted = null delete that exception (the account falls back to its
   * roles' grants for the code).
   */
  async replaceUserPermissions(
    userId: string,
    items: UserPermissionInput[],
    actorId: string,
  ): Promise<UserPermissionsResult> {
    assertUuidField(userId, "userId");
    assertUuidField(actorId, "actorId");
    assertNoDuplicateCodes(items.map(codeOf));
    await this.permissions.validatePermissionCodes(items.map(codeOf));
    const kept = items.filter(
      (i): i is PermissionGrantInput => i.granted !== null,
    );
    const newExceptions = sortGrants(kept);
    let committed: PermissionGrantInput[];
    try {
      committed = await this.prisma.$transaction(async (tx) => {
        const locked = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
        if (locked.length === 0) {
          throw RbacException.notFound();
        }
        const oldRows = await tx.userPermission.findMany({
          where: { userId },
          include: { permission: true },
        });
        const before = sortGrants(
          oldRows.map((r) => ({
            module: r.permission.module,
            action: r.permission.action,
            granted: r.granted,
          })),
        );
        const permissionIds = await this.permissionIdsInTx(tx, kept);
        await tx.userPermission.deleteMany({ where: { userId } });
        if (kept.length > 0) {
          await tx.userPermission.createMany({
            data: kept.map((item) => ({
              userId,
              permissionId: permissionIds.get(codeOf(item)) as string,
              granted: item.granted,
            })),
          });
        }
        await this.audit.record(tx, {
          actorId,
          action: "user.permissions_updated",
          entityType: "USER",
          entityId: userId,
          before: { permissions: before },
          after: { permissions: newExceptions },
        });
        return newExceptions;
      });
    } catch (error) {
      if (error instanceof RbacException) throw error;
      this.logger.error(
        `replaceUserPermissions failed for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw RbacException.serviceUnavailable(5);
    }
    const cacheInvalidated =
      await this.permissions.invalidateUserPermissions(userId);
    return { userId, permissions: committed, cacheInvalidated };
  }

  /**
   * Assigns a role to an account (FR-082). Idempotent: assigning a role
   * the account already has is a no-op (no second audit row).
   */
  async assignUserRole(
    userId: string,
    roleId: string,
    actorId: string,
  ): Promise<UserRoleResult> {
    assertUuidField(userId, "userId");
    assertUuidField(roleId, "roleId");
    assertUuidField(actorId, "actorId");
    let changed: boolean;
    try {
      changed = await this.prisma.$transaction(async (tx) => {
        const locked = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
        if (locked.length === 0) {
          throw RbacException.notFound();
        }
        const role = await tx.role.findUnique({
          where: { id: roleId },
          select: { id: true },
        });
        if (role === null) {
          throw RbacException.roleNotFound();
        }
        const existing = await tx.userRole.findUnique({
          where: { userId_roleId: { userId, roleId } },
        });
        if (existing !== null) {
          return false;
        }
        const beforeRows = await tx.userRole.findMany({
          where: { userId },
          select: { roleId: true },
        });
        const before = beforeRows.map((r) => r.roleId).sort();
        await tx.userRole.create({ data: { userId, roleId } });
        await this.audit.record(tx, {
          actorId,
          action: "user.roles_assigned",
          entityType: "USER",
          entityId: userId,
          before: { roles: before },
          after: { roles: [...before, roleId].sort() },
        });
        return true;
      });
    } catch (error) {
      if (error instanceof RbacException) throw error;
      this.logger.error(
        `assignUserRole failed for user ${userId} role ${roleId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw RbacException.serviceUnavailable(5);
    }
    // A no-op changed nothing, so the cache is still valid.
    const cacheInvalidated = changed
      ? await this.permissions.invalidateUserPermissions(userId)
      : true;
    return { userId, roleId, changed, cacheInvalidated };
  }

  /**
   * Removes a role from an account (FR-082). Idempotent: removing a role
   * the account does not have is a no-op (no audit row).
   */
  async removeUserRole(
    userId: string,
    roleId: string,
    actorId: string,
  ): Promise<UserRoleResult> {
    assertUuidField(userId, "userId");
    assertUuidField(roleId, "roleId");
    assertUuidField(actorId, "actorId");
    let changed: boolean;
    try {
      changed = await this.prisma.$transaction(async (tx) => {
        const locked = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
        if (locked.length === 0) {
          throw RbacException.notFound();
        }
        const existing = await tx.userRole.findUnique({
          where: { userId_roleId: { userId, roleId } },
        });
        if (existing === null) {
          return false;
        }
        const beforeRows = await tx.userRole.findMany({
          where: { userId },
          select: { roleId: true },
        });
        const before = beforeRows.map((r) => r.roleId).sort();
        await tx.userRole.delete({
          where: { userId_roleId: { userId, roleId } },
        });
        await this.audit.record(tx, {
          actorId,
          action: "user.roles_removed",
          entityType: "USER",
          entityId: userId,
          before: { roles: before },
          after: { roles: before.filter((id) => id !== roleId) },
        });
        return true;
      });
    } catch (error) {
      if (error instanceof RbacException) throw error;
      this.logger.error(
        `removeUserRole failed for user ${userId} role ${roleId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw RbacException.serviceUnavailable(5);
    }
    const cacheInvalidated = changed
      ? await this.permissions.invalidateUserPermissions(userId)
      : true;
    return { userId, roleId, changed, cacheInvalidated };
  }

  /**
   * Maps codes to permission ids inside the transaction. Codes were
   * already validated against the catalog, so a miss here is defensive
   * only (the seed never deletes codes).
   */
  private async permissionIdsInTx(
    tx: Prisma.TransactionClient,
    items: PermissionGrantInput[],
  ): Promise<Map<string, string>> {
    if (items.length === 0) return new Map();
    const rows = await tx.permission.findMany({
      where: {
        OR: items.map((i) => ({ module: i.module, action: i.action })),
      },
      select: { id: true, module: true, action: true },
    });
    const map = new Map<string, string>(
      rows.map((r) => [`${r.module}.${r.action}`, r.id] as [string, string]),
    );
    for (const item of items) {
      if (!map.has(codeOf(item))) {
        throw RbacException.validationError([
          {
            field: "permissions",
            code: "UNKNOWN_PERMISSION",
            message: `Quyền ${codeOf(item)} không có trong catalog.`,
          },
        ]);
      }
    }
    return map;
  }
}
