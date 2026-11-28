import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/app-setup";
import { PasswordService } from "../src/auth/password.service";
import { TokenService } from "../src/auth/token.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { RedisService } from "../src/redis/redis.service";

// M02-05 G4 evidence spec — one consolidated, fresh proof run for the
// AC-01 -> AC-18 verification gate. Real PostgreSQL (seecarauto_test) +
// real test Redis (127.0.0.1:6399, DB 3). The app is created once per file
// (beforeAll); DB tables + Redis are wiped in beforeEach, so every test
// starts from a clean slate. This spec does NOT duplicate the AC tests in
// auth.e2e-spec.ts / auth-idempotency.e2e-spec.ts — it records the DB rows
// (sessions, operations, audits) and the D-15/D-16 constraint behavior in
// one place, with a structured, secret-free summary printed per test.
// Nothing secret is ever logged: no token, no password, no token hash.
jest.setTimeout(60_000);

const PASSWORD = "correct horse battery staple";

let userCounter = 0;
const freshUsername = () =>
  `g4-admin-${++userCounter}-${randomUUID().slice(0, 8)}`;
const freshKey = () => randomUUID();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// CHECK violations (PostgreSQL 23514) surface in Prisma 6.19.3 as
// PrismaClientUnknownRequestError with NO code — the message embeds the
// PostgreSQL error inside a Rust Debug rendering, so the quotes around the
// constraint name are backslash-escaped. Match the phrase and the name
// separately. (Same helper as prisma-constraints.e2e-spec.ts.)
async function expectCheckViolation(
  promise: Promise<unknown>,
  constraint: string,
) {
  try {
    await promise;
  } catch (e) {
    expect(e).toBeInstanceOf(Prisma.PrismaClientUnknownRequestError);
    const message = String((e as Error).message);
    expect(message).toContain("violates check constraint");
    expect(message).toContain(constraint);
    return;
  }
  throw new Error(
    `Expected CHECK violation ${constraint}, but the operation succeeded`,
  );
}

async function expectPrismaError(promise: Promise<unknown>, code: string) {
  try {
    await promise;
  } catch (e) {
    expect(e).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect((e as Prisma.PrismaClientKnownRequestError).code).toBe(code);
    return;
  }
  throw new Error(`Expected Prisma error ${code}, but the operation succeeded`);
}

describe("G4 DB evidence (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let tokens: TokenService;
  let jwtService: JwtService;
  let passwords: PasswordService;

  beforeAll(async () => {
    // Short lockout for the audit test (threshold 3, 2 seconds).
    process.env.AUTH_LOCKOUT_THRESHOLD = "3";
    process.env.AUTH_LOCKOUT_SECONDS = "2";
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    redis = app.get(RedisService);
    tokens = app.get(TokenService);
    jwtService = app.get(JwtService);
    passwords = app.get(PasswordService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.$executeRaw`
      TRUNCATE "audit_logs", "auth_refresh_operations",
        "admin_refresh_sessions", "user_permissions", "user_roles",
        "users", "roles", "permissions"
      RESTART IDENTITY CASCADE`;
    await redis.getClient().flushdb();
  });

  async function createUser(username: string, password = PASSWORD) {
    const passwordHash = await passwords.hash(password);
    return prisma.user.create({ data: { username, passwordHash } });
  }

  function loginReq(username: string, password: string) {
    return request(app.getHttpServer())
      .post("/api/v1/auth/admin/login")
      .send({ username, password });
  }

  async function loginOk(username: string) {
    const res = await loginReq(username, PASSWORD);
    expect(res.status).toBe(200);
    return res.body.data as {
      accessToken: string;
      refreshToken: string;
      tokenType: string;
      expiresIn: number;
      admin: { id: string; username: string; roles: unknown[] };
    };
  }

  function refreshReq(refreshToken: string, key: string) {
    return request(app.getHttpServer())
      .post("/api/v1/auth/admin/refresh")
      .set("Idempotency-Key", key)
      .send({ refreshToken });
  }

  async function sessionsOf(userId: string) {
    return prisma.adminRefreshSession.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
  }

  async function auditRows(action: string) {
    return prisma.auditLog.findMany({ where: { action } });
  }

  // ------------------------------------------------ G4-04(1)(2)(3) + G4-05
  it("G4-04: login -> refresh -> logout-one -> logout-all leaves the exact DB rows (states, reasons, replaced-by, operation, audits)", async () => {
    const username = freshUsername();
    const user = await createUser(username);

    // Login: one ACTIVE session, expiresAt ~7d out.
    const pair = await loginOk(username);
    let sessions = await sessionsOf(user.id);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].revokedAt).toBeNull();
    expect(sessions[0].revokedReason).toBeNull();
    expect(sessions[0].replacedBySessionId).toBeNull();
    expect(sessions[0].expiresAt.getTime()).toBeGreaterThan(Date.now());

    // Refresh: old ROTATED + replaced_by -> new; operation COMPLETED.
    const key = freshKey();
    const oldHash = tokens.hashToken(pair.refreshToken);
    const refreshed = await refreshReq(pair.refreshToken, key);
    expect(refreshed.status).toBe(200);
    const data = refreshed.body.data;
    sessions = await sessionsOf(user.id);
    expect(sessions).toHaveLength(2);
    const oldSession = sessions.find((s) => s.tokenHash === oldHash)!;
    const newSession = sessions.find((s) => s.id !== oldSession.id)!;
    expect(oldSession.revokedReason).toBe("ROTATED");
    expect(oldSession.replacedBySessionId).toBe(newSession.id);
    expect(newSession.revokedAt).toBeNull();

    const operations = await prisma.authRefreshOperation.findMany({
      where: { tokenHash: oldHash, idempotencyKey: key },
    });
    expect(operations).toHaveLength(1);
    expect(operations[0].state).toBe("COMPLETED");
    expect(operations[0].ownerId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(operations[0].idempotencyKey).toBe(key);
    expect(operations[0].expiresAt.getTime()).toBeGreaterThan(Date.now());

    // JWT claims (G4-05): exact key sets + expiry windows, decoded only.
    const access = jwtService.decode(data.accessToken) as Record<
      string,
      unknown
    >;
    expect(Object.keys(access).sort()).toEqual([
      "exp",
      "iat",
      "roles",
      "sid",
      "sub",
      "type",
    ]);
    expect(access.type).toBe("access");
    expect(access.sub).toBe(user.id);
    expect(access.sid).toBe(newSession.id);
    expect((access.exp as number) - (access.iat as number)).toBe(900);
    const refresh = jwtService.decode(data.refreshToken) as Record<
      string,
      unknown
    >;
    expect(Object.keys(refresh).sort()).toEqual([
      "exp",
      "iat",
      "sid",
      "sub",
      "type",
    ]);
    expect(refresh.type).toBe("refresh");
    expect(refresh.sid).toBe(newSession.id);
    expect((refresh.exp as number) - (refresh.iat as number)).toBe(604800);

    // Logout one session: LOGOUT + access blacklisted.
    await request(app.getHttpServer())
      .post("/api/v1/auth/admin/logout")
      .set("Authorization", `Bearer ${data.accessToken}`)
      .send({ refreshToken: data.refreshToken })
      .expect(204);
    const meAfterOne = await request(app.getHttpServer())
      .get("/api/v1/auth/admin/me")
      .set("Authorization", `Bearer ${data.accessToken}`);
    expect(meAfterOne.status).toBe(401);

    // Login again, then logout-all (no refresh token sent).
    const pair2 = await loginOk(username);
    await request(app.getHttpServer())
      .post("/api/v1/auth/admin/logout")
      .set("Authorization", `Bearer ${pair2.accessToken}`)
      .send({})
      .expect(204);

    sessions = await sessionsOf(user.id);
    expect(sessions).toHaveLength(3);
    const reasons = sessions.map((s) => s.revokedReason);
    expect(reasons).toEqual(["ROTATED", "LOGOUT", "LOGOUT_ALL"]);
    expect(sessions[2].replacedBySessionId).toBeNull();
    expect(sessions.every((s) => s.revokedAt !== null)).toBe(true);

    const logoutOne = await auditRows("auth.logout_session");
    expect(logoutOne).toHaveLength(1);
    expect(logoutOne[0].actorId).toBe(user.id);
    expect(logoutOne[0].entityId).toBe(user.id);
    const logoutAll = await auditRows("auth.logout_all_sessions");
    expect(logoutAll).toHaveLength(1);
    expect(logoutAll[0].actorId).toBe(user.id);
    expect(logoutAll[0].entityId).toBe(user.id);

    // Secret-free evidence summary (ids, states, reasons, counts only).
    console.log(
      "[G4-04] lifecycle rows: sessions=" +
        sessions.map((s) => `${s.revokedReason ?? "ACTIVE"}`).join(",") +
        " operations=COMPLETEDx1 audits=logout_sessionx1,logout_all_sessionsx1",
    );
  });

  it("G4-04: replay with a different key revokes all sessions and writes the reuse audit", async () => {
    const username = freshUsername();
    const user = await createUser(username);
    const pairA = await loginOk(username);
    await loginOk(username);
    const hashA = tokens.hashToken(pairA.refreshToken);

    // Rotate A once, then replay A's old token with a different key.
    const rotated = await refreshReq(pairA.refreshToken, freshKey());
    expect(rotated.status).toBe(200);
    const replay = await refreshReq(pairA.refreshToken, freshKey());
    expect(replay.status).toBe(401);
    expect(replay.body.error).toBe("TOKEN_REUSE_DETECTED");

    const sessions = await sessionsOf(user.id);
    expect(sessions).toHaveLength(3);
    const byHash = new Map(sessions.map((s) => [s.tokenHash, s]));
    // The replayed row keeps ROTATED; every other session is REUSE_DETECTED.
    expect(byHash.get(hashA)!.revokedReason).toBe("ROTATED");
    const others = sessions.filter((s) => s.tokenHash !== hashA);
    expect(others.map((s) => s.revokedReason)).toEqual([
      "REUSE_DETECTED",
      "REUSE_DETECTED",
    ]);

    const reuseAudits = await auditRows("auth.refresh_reuse_detected");
    expect(reuseAudits).toHaveLength(1);
    expect(reuseAudits[0].actorId).toBe(user.id);
    expect(reuseAudits[0].entityId).toBe(user.id);
    expect(
      (reuseAudits[0].after as { revokedSessions: number }).revokedSessions,
    ).toBe(2);
    console.log(
      "[G4-04] replay rows: sessions=ROTATED,REUSE_DETECTED,REUSE_DETECTED audits=auth.refresh_reuse_detected x1",
    );
  });

  it("G4-04: lockout writes the admin.locked audit with actor/entity/after", async () => {
    const username = freshUsername();
    const user = await createUser(username);
    for (let i = 1; i <= 3; i++) {
      const res = await loginReq(username, `wrong-password-${i}`);
      expect(res.status).toBe(i < 3 ? 401 : 423);
    }
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(dbUser?.failedLoginAttempts).toBe(3);
    expect(dbUser?.lockedUntil).not.toBeNull();
    const audits = await auditRows("admin.locked");
    expect(audits).toHaveLength(1);
    expect(audits[0].actorId).toBe(user.id);
    expect(audits[0].entityId).toBe(user.id);
    expect(audits[0].after).toMatchObject({ failedLoginAttempts: 3 });
    expect(
      (audits[0].after as { lockedUntil: string }).lockedUntil,
    ).toBeDefined();
    console.log(
      "[G4-04] lockout rows: failedLoginAttempts=3 audits=admin.locked x1",
    );
    await sleep(2100);
    const ok = await loginReq(username, PASSWORD);
    expect(ok.status).toBe(200);
  });

  // ------------------------------------------------------- G4-04(5) CHECKs
  it("G4-04(5): CHECK (revoked_at IS NULL) = (revoked_reason IS NULL) rejects both one-sided revokes", async () => {
    const user = await createUser(freshUsername());
    const hash = "a".repeat(64);
    const session = await prisma.adminRefreshSession.create({
      data: {
        userId: user.id,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });
    // revoked_at without a reason -> rejected by the DB.
    await expectCheckViolation(
      prisma.adminRefreshSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      }),
      "admin_refresh_sessions_revoked_reason_check",
    );
    // A reason without revoked_at -> rejected by the DB.
    await expectCheckViolation(
      prisma.adminRefreshSession.update({
        where: { id: session.id },
        data: { revokedReason: "LOGOUT" },
      }),
      "admin_refresh_sessions_revoked_reason_check",
    );
    // Both together -> accepted.
    const revoked = await prisma.adminRefreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date(), revokedReason: "LOGOUT" },
    });
    expect(revoked.revokedReason).toBe("LOGOUT");
  });

  it("G4-04(5): CHECK replaced_by_session_id is only allowed when reason is ROTATED", async () => {
    const user = await createUser(freshUsername());
    const mk = async (token: string) =>
      prisma.adminRefreshSession.create({
        data: {
          userId: user.id,
          tokenHash: token,
          expiresAt: new Date(Date.now() + 3600_000),
        },
      });
    const oldSession = await mk("b".repeat(64));
    const newSession = await mk("c".repeat(64));
    // replaced_by + LOGOUT -> rejected by the DB.
    await expectCheckViolation(
      prisma.adminRefreshSession.update({
        where: { id: oldSession.id },
        data: {
          revokedAt: new Date(),
          revokedReason: "LOGOUT",
          replacedBySessionId: newSession.id,
        },
      }),
      "admin_refresh_sessions_replaced_by_session_check",
    );
    // replaced_by + ROTATED -> accepted.
    const rotated = await prisma.adminRefreshSession.update({
      where: { id: oldSession.id },
      data: {
        revokedAt: new Date(),
        revokedReason: "ROTATED",
        replacedBySessionId: newSession.id,
      },
    });
    expect(rotated.replacedBySessionId).toBe(newSession.id);
  });

  it("G4-04(5): self-FK ON DELETE SET NULL clears replaced_by_session_id when the new session is deleted", async () => {
    const user = await createUser(freshUsername());
    const mk = async (token: string) =>
      prisma.adminRefreshSession.create({
        data: {
          userId: user.id,
          tokenHash: token,
          expiresAt: new Date(Date.now() + 3600_000),
        },
      });
    const oldSession = await mk("d".repeat(64));
    const newSession = await mk("e".repeat(64));
    await prisma.adminRefreshSession.update({
      where: { id: oldSession.id },
      data: {
        revokedAt: new Date(),
        revokedReason: "ROTATED",
        replacedBySessionId: newSession.id,
      },
    });
    await prisma.adminRefreshSession.delete({ where: { id: newSession.id } });
    const oldRow = await prisma.adminRefreshSession.findUnique({
      where: { id: oldSession.id },
    });
    expect(oldRow).not.toBeNull();
    expect(oldRow!.replacedBySessionId).toBeNull();
    expect(oldRow!.revokedReason).toBe("ROTATED");
  });

  it("G4-04(5): operation unique (token_hash, idempotency_key) + native enum reject duplicates and bad states", async () => {
    await createUser(freshUsername());
    const tokenHash = "f".repeat(64);
    const key = freshKey();
    const row = await prisma.authRefreshOperation.create({
      data: {
        tokenHash,
        idempotencyKey: key,
        ownerId: randomUUID(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    expect(row.state).toBe("PENDING");
    expect(row.createdAt).toBeDefined();
    // Same (token_hash, idempotency_key) again -> unique violation.
    await expectPrismaError(
      prisma.authRefreshOperation.create({
        data: {
          tokenHash,
          idempotencyKey: key,
          ownerId: randomUUID(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
      "P2002",
    );
    // A state outside the native enum -> rejected by the DB.
    let rejected = false;
    try {
      await prisma.$executeRaw`
        INSERT INTO "auth_refresh_operations"
          ("token_hash", "idempotency_key", "owner_id", "state", "expires_at")
        VALUES (${"0".repeat(64)}, ${freshKey()}, ${randomUUID()}::uuid,
          ${"BOGUS"}, ${new Date(Date.now() + 3600_000)})`;
    } catch (e) {
      rejected = true;
      expect(String((e as Error).message)).toContain("RefreshOperationState");
    }
    expect(rejected).toBe(true);
    // Structural evidence: both CHECKs, the self-FK, both enums, the
    // unique index — read from the live test DB, not from doc text.
    const checks = await prisma.$queryRaw<{ conname: string }[]>`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'admin_refresh_sessions'::regclass
        AND conname IN (
          'admin_refresh_sessions_revoked_reason_check',
          'admin_refresh_sessions_replaced_by_session_check')
      ORDER BY conname`;
    expect(checks.map((c) => c.conname)).toEqual([
      "admin_refresh_sessions_replaced_by_session_check",
      "admin_refresh_sessions_revoked_reason_check",
    ]);
    const fk = await prisma.$queryRaw<{ pg_get_constraintdef: string }[]>`
      SELECT pg_get_constraintdef(oid) FROM pg_constraint
      WHERE conname = 'admin_refresh_sessions_replaced_by_session_id_fkey'`;
    expect(fk).toHaveLength(1);
    expect(fk[0].pg_get_constraintdef).toContain("ON DELETE SET NULL");
    const enumLabels = await prisma.$queryRaw<{ enumlabel: string }[]>`
      SELECT enumlabel FROM pg_enum
      WHERE enumtypid = '"RefreshSessionRevocationReason"'::regtype
      ORDER BY enumsortorder`;
    expect(enumLabels.map((e) => e.enumlabel)).toEqual([
      "ROTATED",
      "LOGOUT",
      "LOGOUT_ALL",
      "ADMIN_REVOKED",
      "REUSE_DETECTED",
    ]);
    const uniqueIndex = await prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'auth_refresh_operations'
        AND indexname = 'auth_refresh_operations_token_hash_idempotency_key_key'`;
    expect(uniqueIndex).toHaveLength(1);
  });
});
