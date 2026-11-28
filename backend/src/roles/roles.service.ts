import { Injectable, Logger } from "@nestjs/common";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { PermissionService } from "../permissions/permission.service";
import { PrismaService } from "../prisma/prisma.service";
import { isUuid, RbacAuditService } from "../rbac/audit.service";
import { RbacException, type RbacValidationDetail } from "../rbac/rbac.errors";
import { RbacService, type PermissionGrantInput } from "../rbac/rbac.service";

// RolesService (M06-02, Pha 1) — the backend for the 6 Roles CRUD
// endpoints. It owns role rows only; the permission matrix is owned by
// RbacService (M02-06) and the catalog by PermissionService — this file
// never calls tx.rolePermission.* to replace a matrix.
//
// Every mutation follows RB-06: the role change and its AuditLog row
// commit or roll back in ONE PostgreSQL transaction (audit insert
// failure -> the whole mutation rolls back, proven by the ghost-actor
// e2e test). Cache invalidation runs only AFTER commit (§2.5/RB-04);
// PUT matrix delegates to RbacService.replaceRolePermissions, which
// already invalidates after commit and reports `cacheInvalidated`.
//
// Delete guard (GAP-03, AC-04/AC-18): a role with >= 1 UserRole row
// (including inactive accounts) is NEVER deleted — 409 ROLE_HAS_USERS
// with the count, and the Role/UserRole/RolePermission rows stay intact.
// The count and the delete run in one transaction with the role row
// locked (SELECT ... FOR UPDATE) first, so a concurrent assignment
// cannot slip in between the count and the delete (AC-10 race test).
//
// ETag (API_SPEC §15): the matrix etag is SHA-256 of the role's
// `updatedAt` + the canonical matrix content (the "version" component —
// there is no version column, so the matrix content itself is the
// version). It is returned as a quoted HTTP `ETag` header on GET/PUT
// matrix; PUT requires `If-Match` to equal it, else 412. A PATCH of the
// role (name/description) also changes the etag (updatedAt moves) —
// conservative: the client re-reads the matrix and retries.

export interface RoleListItem {
  id: string;
  name: string;
  description: string | null;
  userCount: number;
}

export interface RoleListResult {
  data: RoleListItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface RoleMatrixResult {
  roleId: string;
  permissions: PermissionGrantInput[];
  /** Quoted HTTP ETag, e.g. "a1b2...". */
  etag: string;
}

export interface UpdateMatrixResult extends RoleMatrixResult {
  cacheInvalidated: boolean;
}

export interface RoleView {
  id: string;
  name: string;
  description: string | null;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function codeOf(item: { module: string; action: string }): string {
  return `${item.module}.${item.action}`;
}

function sortGrants(items: PermissionGrantInput[]): PermissionGrantInput[] {
  return [...items].sort((a, b) => codeOf(a).localeCompare(codeOf(b)));
}

/**
 * The matrix etag: SHA-256 of `updatedAt` + the canonical matrix
 * (sorted `module.action:granted` triples). Deterministic: the same
 * role state always yields the same etag; any matrix change (or any
 * role update, via updatedAt) yields a different one.
 */
export function computeRoleMatrixEtag(
  updatedAt: Date,
  permissions: PermissionGrantInput[],
): string {
  const canonical = sortGrants(permissions)
    .map((p) => `${codeOf(p)}:${p.granted ? 1 : 0}`)
    .join(",");
  const hash = createHash("sha256")
    .update(`${updatedAt.toISOString()}|${canonical}`)
    .digest("hex");
  return `"${hash}"`;
}

function assertUuidField(value: string, field: string): void {
  if (!isUuid(value)) {
    const details: RbacValidationDetail[] = [
      { field, code: "INVALID_FORMAT", message: `${field} phải là UUID.` },
    ];
    throw RbacException.validationError(details);
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
    private readonly rbac: RbacService,
    private readonly audit: RbacAuditService,
  ) {}

  /**
   * Lists roles with pagination (AC-01/AC-17). Default order is stable:
   * name ASC, id ASC (Stage 2 order — no sort/q params in the contract).
   * `userCount` counts every UserRole row for the role, including
   * inactive accounts (GAP-07). Out-of-range page/limit are clamped,
   * never errors: page >= 1, 1 <= limit <= 100.
   */
  async listRoles(
    pageInput?: number,
    limitInput?: number,
  ): Promise<RoleListResult> {
    const page = Math.max(
      DEFAULT_PAGE,
      Number.isInteger(pageInput) ? (pageInput as number) : DEFAULT_PAGE,
    );
    const rawLimit = Number.isInteger(limitInput)
      ? (limitInput as number)
      : DEFAULT_LIMIT;
    const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit));
    let total: number;
    let rows: RoleView[];
    try {
      total = await this.prisma.role.count();
      rows = await this.prisma.role.findMany({
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, name: true, description: true },
      });
    } catch (error) {
      this.logger.error(
        `listRoles failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw RbacException.serviceUnavailable(5);
    }
    const counts = new Map<string, number>();
    if (rows.length > 0) {
      const grouped = await this.prisma.userRole.groupBy({
        by: ["roleId"],
        where: { roleId: { in: rows.map((r) => r.id) } },
        _count: { roleId: true },
      });
      for (const g of grouped) {
        counts.set(g.roleId, g._count.roleId);
      }
    }
    const data: RoleListItem[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      userCount: counts.get(r.id) ?? 0,
    }));
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Creates a role + its audit row in one transaction (AC-02/AC-07). */
  async createRole(
    input: { name: string; description?: string | null },
    actorId: string,
  ): Promise<RoleView> {
    assertUuidField(actorId, "actorId");
    let created: RoleView;
    try {
      created = await this.prisma.$transaction(async (tx) => {
        const role = await tx.role.create({
          data: {
            name: input.name,
            description: input.description ?? null,
          },
          select: { id: true, name: true, description: true },
        });
        await this.audit.record(tx, {
          actorId,
          action: "role.created",
          entityType: "ROLE",
          entityId: role.id,
          before: null,
          after: {
            id: role.id,
            name: role.name,
            description: role.description,
          },
        });
        return role;
      });
    } catch (error) {
      if (error instanceof RbacException) throw error;
      if (isUniqueViolation(error)) {
        throw RbacException.roleNameDuplicate();
      }
      this.logger.error(
        `createRole failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw RbacException.serviceUnavailable(5);
    }
    return created;
  }

  /**
   * Updates a role's name/description (AC-03/AC-07). Last-write-wins
   * (API_SPEC §15 — no ETag for PATCH role). At least one field must be
   * present; a duplicate name (another role) is 409 ROLE_NAME_DUPLICATE.
   */
  async updateRole(
    roleId: string,
    input: { name?: string; description?: string | null },
    actorId: string,
  ): Promise<RoleView> {
    assertUuidField(roleId, "roleId");
    assertUuidField(actorId, "actorId");
    if (input.name === undefined && input.description === undefined) {
      throw RbacException.validationError([
        {
          field: "body",
          code: "REQUIRED",
          message: "Cần gửi ít nhất một trường (name hoặc description) để sửa.",
        },
      ]);
    }
    let updated: RoleView;
    try {
      updated = await this.prisma.$transaction(async (tx) => {
        const locked = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM roles WHERE id = ${roleId}::uuid FOR UPDATE`;
        if (locked.length === 0) {
          throw RbacException.roleNotFound();
        }
        const before = await tx.role.findUnique({
          where: { id: roleId },
          select: { id: true, name: true, description: true },
        });
        if (before === null) {
          throw RbacException.roleNotFound();
        }
        if (input.name !== undefined && input.name !== before.name) {
          const clash = await tx.role.findFirst({
            where: { name: input.name, id: { not: roleId } },
            select: { id: true },
          });
          if (clash !== null) {
            throw RbacException.roleNameDuplicate();
          }
        }
        const role = await tx.role.update({
          where: { id: roleId },
          data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.description !== undefined
              ? { description: input.description }
              : {}),
          },
          select: { id: true, name: true, description: true },
        });
        await this.audit.record(tx, {
          actorId,
          action: "role.updated",
          entityType: "ROLE",
          entityId: role.id,
          before: {
            id: before.id,
            name: before.name,
            description: before.description,
          },
          after: {
            id: role.id,
            name: role.name,
            description: role.description,
          },
        });
        return role;
      });
    } catch (error) {
      if (error instanceof RbacException) throw error;
      if (isUniqueViolation(error)) {
        throw RbacException.roleNameDuplicate();
      }
      this.logger.error(
        `updateRole failed for role ${roleId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw RbacException.serviceUnavailable(5);
    }
    return updated;
  }

  /**
   * Deletes a role (AC-04/AC-07/AC-18). The role row is locked FIRST
   * (SELECT ... FOR UPDATE), then the UserRole count is read inside the
   * same transaction: a concurrent assignment either commits before the
   * lock (counted -> 409, nothing deleted) or waits for the lock (then
   * the role is already gone -> its insert fails on the missing FK).
   * Either way no assignment is ever silently cascade-deleted.
   */
  async deleteRole(roleId: string, actorId: string): Promise<void> {
    assertUuidField(roleId, "roleId");
    assertUuidField(actorId, "actorId");
    try {
      await this.prisma.$transaction(async (tx) => {
        const locked = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM roles WHERE id = ${roleId}::uuid FOR UPDATE`;
        if (locked.length === 0) {
          throw RbacException.roleNotFound();
        }
        const role = await tx.role.findUnique({
          where: { id: roleId },
          select: { id: true, name: true, description: true },
        });
        if (role === null) {
          throw RbacException.roleNotFound();
        }
        // Permissions that will be lost to the DB cascade — recorded in
        // the audit `before` (GAP-05). All rows, granted and explicit
        // denies alike, as { module, action }.
        const matrixRows = await tx.rolePermission.findMany({
          where: { roleId },
          include: { permission: true },
        });
        const beforePermissions = matrixRows
          .map((r) => ({
            module: r.permission.module,
            action: r.permission.action,
          }))
          .sort((a, b) =>
            `${a.module}.${a.action}`.localeCompare(`${b.module}.${b.action}`),
          );
        const assignedCount = await tx.userRole.count({ where: { roleId } });
        if (assignedCount > 0) {
          throw RbacException.roleHasUsers(assignedCount);
        }
        await tx.role.delete({ where: { id: roleId } });
        await this.audit.record(tx, {
          actorId,
          action: "role.deleted",
          entityType: "ROLE",
          entityId: role.id,
          before: {
            id: role.id,
            name: role.name,
            description: role.description,
            permissions: beforePermissions,
          },
          after: null,
        });
      });
    } catch (error) {
      if (error instanceof RbacException) throw error;
      this.logger.error(
        `deleteRole failed for role ${roleId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw RbacException.serviceUnavailable(5);
    }
  }

  /**
   * Reads a role's full matrix (AC-05/GAP-06): all 39 catalog codes,
   * sorted; a code the role has no row for returns `granted: false`.
   * Also returns the current matrix etag for the If-Match check.
   */
  async getRolePermissions(roleId: string): Promise<RoleMatrixResult> {
    const { roleId: id, permissions, etag } = await this.readRoleMatrix(roleId);
    return { roleId: id, permissions, etag };
  }

  /** Internal read: role + full matrix + etag (+ updatedAt for callers). */
  private async readRoleMatrix(roleId: string): Promise<{
    roleId: string;
    updatedAt: Date;
    permissions: PermissionGrantInput[];
    etag: string;
  }> {
    assertUuidField(roleId, "roleId");
    let role: { id: string; updatedAt: Date };
    let catalog: string[];
    let grantedRows: {
      granted: boolean;
      permission: { module: string; action: string };
    }[];
    try {
      role = await this.prisma.role.findUniqueOrThrow({
        where: { id: roleId },
        select: { id: true, updatedAt: true },
      });
      catalog = await this.permissions.getCatalogCodes();
      grantedRows = await this.prisma.rolePermission.findMany({
        where: { roleId },
        include: { permission: true },
      });
    } catch (error) {
      if (error instanceof RbacException) throw error;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw RbacException.roleNotFound();
      }
      this.logger.error(
        `readRoleMatrix failed for role ${roleId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw RbacException.serviceUnavailable(5);
    }
    const granted = new Map<string, boolean>(
      grantedRows.map((r) => [
        `${r.permission.module}.${r.permission.action}`,
        r.granted,
      ]),
    );
    const permissions: PermissionGrantInput[] = catalog
      .map((code) => {
        const [module, action] = code.split(".");
        return { module, action, granted: granted.get(code) ?? false };
      })
      .sort((a, b) => codeOf(a).localeCompare(codeOf(b)));
    return {
      roleId: role.id,
      updatedAt: role.updatedAt,
      permissions,
      etag: computeRoleMatrixEtag(role.updatedAt, permissions),
    };
  }

  /**
   * Replaces a role's whole matrix (AC-06). The If-Match header is
   * required (API_SPEC §15): missing or stale -> 412. The etag is
   * checked against the CURRENT matrix immediately before delegating
   * to RbacService.replaceRolePermissions — the replace itself serializes
   * concurrent writers via the M02-06 row lock, so the final state is
   * exactly one complete matrix, never a mix (AC-10). No second audit
   * row: replaceRolePermissions already writes `role.permissions_updated`.
   */
  async updateRolePermissions(
    roleId: string,
    items: PermissionGrantInput[],
    ifMatch: string | undefined,
    actorId: string,
  ): Promise<UpdateMatrixResult> {
    assertUuidField(roleId, "roleId");
    assertUuidField(actorId, "actorId");
    if (ifMatch === undefined || ifMatch.trim() === "") {
      throw RbacException.preconditionFailed();
    }
    const current = await this.readRoleMatrix(roleId);
    if (ifMatch !== current.etag) {
      throw RbacException.preconditionFailed();
    }
    const result = await this.rbac.replaceRolePermissions(
      roleId,
      items,
      actorId,
    );
    // replaceRolePermissions never touches the roles row, so updatedAt is
    // unchanged by the replace — reuse the pre-read value; no post-replace
    // re-read (a concurrent delete landing in between must not turn a
    // committed PUT into a 500).
    return {
      roleId: result.roleId,
      permissions: result.permissions,
      etag: computeRoleMatrixEtag(current.updatedAt, result.permissions),
      cacheInvalidated: result.cacheInvalidated,
    };
  }
}
