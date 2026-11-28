import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { RbacException, type RbacValidationDetail } from "./rbac.errors";

// RBAC audit helper (M02-06, RB-06/RB-11) — the shared audit writer for
// every permission change. M02-06 provides it; M06-02/03/04 endpoints
// call it (via RbacAuditService) inside their own transactions.
//
// Rules enforced here, in one place:
// - Action must be one of the 7 RBAC actions (RB-11); entityType must
//   match the action's entity (role.* -> ROLE, user.* -> USER).
// - actorId/entityId must be UUIDs (the AuditLog columns are UUID).
// - before/after may only contain permission data (codes, granted flags,
//   role names/ids) — any key that smells like a credential or secret
//   (password, token, secret, hash) is refused (AC-14).
// - The row is written with the caller's transaction client, so the audit
//   insert commits or rolls back together with the mutation (RB-06).
//   This helper never commits anything itself and never invalidates
//   cache (invalidation runs after commit, §2.5).

export const RBAC_AUDIT_ACTIONS = [
  "role.created",
  "role.updated",
  "role.deleted",
  "role.permissions_updated",
  "user.roles_assigned",
  "user.roles_removed",
  "user.permissions_updated",
] as const;

export type RbacAuditAction = (typeof RBAC_AUDIT_ACTIONS)[number];

export type RbacAuditEntityType = "ROLE" | "USER";

export interface RbacAuditInput {
  actorId: string;
  action: RbacAuditAction;
  entityType: RbacAuditEntityType;
  entityId: string | null;
  before?: unknown;
  after?: unknown;
}

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/** Keys that must never appear in audit before/after (AC-14). */
const FORBIDDEN_AUDIT_KEYS = [
  "password",
  "passwordhash",
  "token",
  "refreshtoken",
  "accesstoken",
  "secret",
  "hash",
];

function assertNoForbiddenKeys(value: unknown, path: string): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertNoForbiddenKeys(item, `${path}[${i}]`));
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const lower = key.toLowerCase();
    if (FORBIDDEN_AUDIT_KEYS.some((bad) => lower.includes(bad))) {
      throw RbacException.validationError([
        {
          field: `${path}.${key}`,
          code: "FORBIDDEN_FIELD",
          message: `Trường ${path}.${key} không được ghi vào audit log.`,
        },
      ]);
    }
    assertNoForbiddenKeys(child, `${path}.${key}`);
  }
}

function assertUuidField(value: string, field: string): void {
  if (!isUuid(value)) {
    const details: RbacValidationDetail[] = [
      {
        field,
        code: "INVALID_FORMAT",
        message: `${field} phải là UUID.`,
      },
    ];
    throw RbacException.validationError(details);
  }
}

/**
 * Writes one RBAC audit row with the caller's transaction client.
 * Validates action/entityType/ids/payload first; any validation failure
 * throws before touching the DB (the caller's transaction rolls back).
 */
export async function recordRbacAudit(
  tx: Prisma.TransactionClient,
  input: RbacAuditInput,
): Promise<void> {
  if (!RBAC_AUDIT_ACTIONS.includes(input.action as RbacAuditAction)) {
    throw RbacException.validationError([
      {
        field: "action",
        code: "UNKNOWN_ACTION",
        message: `Action ${input.action} không thuộc catalog audit RBAC.`,
      },
    ]);
  }
  const expectedEntityType: RbacAuditEntityType = input.action.startsWith(
    "role.",
  )
    ? "ROLE"
    : "USER";
  if (input.entityType !== expectedEntityType) {
    throw RbacException.validationError([
      {
        field: "entityType",
        code: "INVALID_VALUE",
        message: `Action ${input.action} yêu cầu entityType ${expectedEntityType}.`,
      },
    ]);
  }
  assertUuidField(input.actorId, "actorId");
  if (input.entityId !== null) {
    assertUuidField(input.entityId, "entityId");
  }
  assertNoForbiddenKeys(input.before, "before");
  assertNoForbiddenKeys(input.after, "after");
  await tx.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before:
        input.before === undefined
          ? undefined
          : (input.before as Prisma.InputJsonValue),
      after:
        input.after === undefined
          ? undefined
          : (input.after as Prisma.InputJsonValue),
    },
  });
}

/**
 * Injectable wrapper around recordRbacAudit for modules that prefer DI.
 * The transaction client is always passed in by the caller — this service
 * never starts a transaction itself.
 */
@Injectable()
export class RbacAuditService {
  async record(
    tx: Prisma.TransactionClient,
    input: RbacAuditInput,
  ): Promise<void> {
    await recordRbacAudit(tx, input);
  }
}
