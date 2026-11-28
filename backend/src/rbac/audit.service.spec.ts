import type { Prisma } from "@prisma/client";
import {
  RBAC_AUDIT_ACTIONS,
  recordRbacAudit,
  type RbacAuditInput,
} from "./audit.service";
import { RbacException } from "./rbac.errors";

// RbacAuditService unit tests (M02-06, AC-11/AC-14). The Prisma
// transaction client is mocked; the helper's validation is real.

const ACTOR_ID = "11111111-1111-4111-8111-111111111111";
const ROLE_ID = "22222222-2222-4222-8222-222222222222";

function makeTx() {
  return {
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  } as unknown as Prisma.TransactionClient;
}

function baseInput(overrides: Partial<RbacAuditInput> = {}): RbacAuditInput {
  return {
    actorId: ACTOR_ID,
    action: "role.permissions_updated",
    entityType: "ROLE",
    entityId: ROLE_ID,
    before: { permissions: [] },
    after: {
      permissions: [{ module: "products", action: "view", granted: true }],
    },
    ...overrides,
  };
}

describe("recordRbacAudit", () => {
  it("writes the row with the caller's transaction client", async () => {
    const tx = makeTx();
    await recordRbacAudit(tx, baseInput());
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: ACTOR_ID,
        action: "role.permissions_updated",
        entityType: "ROLE",
        entityId: ROLE_ID,
      }),
    });
  });

  it("accepts all 7 catalog actions with the matching entityType", async () => {
    const tx = makeTx();
    for (const action of RBAC_AUDIT_ACTIONS) {
      const entityType = action.startsWith("role.") ? "ROLE" : "USER";
      await recordRbacAudit(tx, baseInput({ action, entityType }));
    }
    expect(tx.auditLog.create).toHaveBeenCalledTimes(7);
  });

  it("rejects an unknown action with 400 VALIDATION_ERROR", async () => {
    const tx = makeTx();
    const error = await recordRbacAudit(
      tx,
      baseInput({
        action: "role.exploded" as RbacAuditInput["action"],
      }),
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RbacException);
    expect(error as RbacException).toMatchObject({
      status: 400,
      response: { error: "VALIDATION_ERROR" },
    });
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejects a role.* action with entityType USER", async () => {
    const tx = makeTx();
    const error = await recordRbacAudit(
      tx,
      baseInput({ entityType: "USER" }),
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RbacException);
    expect(error as RbacException).toMatchObject({
      status: 400,
      response: { error: "VALIDATION_ERROR" },
    });
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejects a non-UUID actorId", async () => {
    const tx = makeTx();
    const error = await recordRbacAudit(
      tx,
      baseInput({ actorId: "not-a-uuid" }),
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RbacException);
    expect(error as RbacException).toMatchObject({
      status: 400,
      response: { error: "VALIDATION_ERROR" },
    });
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejects a non-UUID entityId but allows null entityId", async () => {
    const tx = makeTx();
    const bad = await recordRbacAudit(
      tx,
      baseInput({ entityId: "not-a-uuid" }),
    ).catch((e: unknown) => e);
    expect(bad).toBeInstanceOf(RbacException);
    expect(bad as RbacException).toMatchObject({ status: 400 });
    expect(tx.auditLog.create).not.toHaveBeenCalled();
    await recordRbacAudit(tx, baseInput({ entityId: null }));
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it("refuses credential-like keys in before/after (AC-14)", async () => {
    const tx = makeTx();
    for (const forbidden of [
      { passwordHash: "x" },
      { token: "x" },
      { refreshToken: "x" },
      { secret: "x" },
      { nested: { accessToken: "x" } },
    ]) {
      const error = await recordRbacAudit(
        tx,
        baseInput({ after: forbidden }),
      ).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(RbacException);
      expect(error as RbacException).toMatchObject({ status: 400 });
    }
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("allows permission data in before/after", async () => {
    const tx = makeTx();
    await recordRbacAudit(
      tx,
      baseInput({
        after: {
          roles: [ROLE_ID],
          permissions: [{ module: "orders", action: "view", granted: false }],
        },
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
  });
});
