import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Prisma, PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/app-setup";
import { AuthService } from "../src/auth/auth.service";
import {
  isAmbiguousDbError,
  isIdleTimeoutError,
  isTransactionTimeoutError,
} from "../src/auth/auth.service";
import { PasswordService } from "../src/auth/password.service";
import { TokenService } from "../src/auth/token.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { RedisService } from "../src/redis/redis.service";

// M02-05 Auth e2e (AC-01 -> AC-18, esp. AC-17 idempotency).
// Real PostgreSQL (seecarauto_test) + real test Redis (127.0.0.1:6399, DB 3).
// The app is created once per file (beforeAll); DB tables + Redis are wiped
// in beforeEach, so every test starts from a clean slate. Rate-limit
// counters live in Redis, so FLUSHDB also resets them between tests.
// `trust proxy` is enabled on the TEST app only so tests can present
// distinct client IPs via X-Forwarded-For (isolating the per-account
// counters from the per-IP ones); production main.ts does not set it.
jest.setTimeout(60_000);

const PASSWORD = "correct horse battery staple";
const DEAD_REDIS_URL = "redis://127.0.0.1:6398";

let userCounter = 0;
let ipCounter = 0;
const freshUsername = () =>
  `e2e-admin-${++userCounter}-${randomUUID().slice(0, 8)}`;
const freshIp = () => `10.20.30.${++ipCounter}`;
const freshKey = () => randomUUID();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("Auth (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let authService: AuthService;
  let tokens: TokenService;
  let jwtService: JwtService;
  let passwords: PasswordService;
  // A second Prisma client (own connection) for holding row locks in the
  // cleanup SKIP LOCKED test.
  let lockClient: PrismaClient;

  beforeAll(async () => {
    // Short lockout for the AC-03 test (threshold 3, 2 seconds).
    process.env.AUTH_LOCKOUT_THRESHOLD = "3";
    process.env.AUTH_LOCKOUT_SECONDS = "2";
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    app.getHttpAdapter().getInstance().set("trust proxy", true);
    await app.init();
    prisma = app.get(PrismaService);
    redis = app.get(RedisService);
    authService = app.get(AuthService);
    tokens = app.get(TokenService);
    jwtService = app.get(JwtService);
    passwords = app.get(PasswordService);
    lockClient = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
  });

  afterAll(async () => {
    await lockClient.$disconnect();
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

  // ------------------------------------------------------------ helpers

  async function createUser(
    username: string,
    password = PASSWORD,
    isActive = true,
  ) {
    const passwordHash = await passwords.hash(password);
    return prisma.user.create({
      data: { username, passwordHash, isActive },
    });
  }

  function loginReq(username: string, password: string, ip?: string) {
    const req = request(app.getHttpServer())
      .post("/api/v1/auth/admin/login")
      .send({ username, password });
    return ip === undefined ? req : req.set("X-Forwarded-For", ip);
  }

  async function loginOk(username: string, password = PASSWORD, ip?: string) {
    const res = await loginReq(username, password, ip);
    expect(res.status).toBe(200);
    return res.body.data as {
      accessToken: string;
      refreshToken: string;
      tokenType: string;
      expiresIn: number;
      admin: { id: string; username: string; roles: unknown[] };
    };
  }

  function refreshReq(refreshToken: string, key: string, ip?: string) {
    const req = request(app.getHttpServer())
      .post("/api/v1/auth/admin/refresh")
      .set("Idempotency-Key", key)
      .send({ refreshToken });
    return ip === undefined ? req : req.set("X-Forwarded-For", ip);
  }

  function meReq(accessToken: string) {
    return request(app.getHttpServer())
      .get("/api/v1/auth/admin/me")
      .set("Authorization", `Bearer ${accessToken}`);
  }

  async function sessionCount(userId: string): Promise<number> {
    return prisma.adminRefreshSession.count({ where: { userId } });
  }

  async function sessionsOf(userId: string) {
    return prisma.adminRefreshSession.findMany({
      where: { userId },
      orderBy: { id: "asc" },
    });
  }

  async function operationCount(
    tokenHash: string,
    key: string,
  ): Promise<number> {
    return prisma.authRefreshOperation.count({
      where: { tokenHash, idempotencyKey: key },
    });
  }

  async function auditRows(action: string) {
    return prisma.auditLog.findMany({ where: { action } });
  }

  /** Asserts a response body carries no stack trace / SQL / table names. */
  function assertNoLeak(body: unknown): void {
    const text = JSON.stringify(body);
    expect(text).not.toContain("admin_refresh_sessions");
    expect(text).not.toContain("auth_refresh_operations");
    expect(text).not.toContain("passwordHash");
    expect(text).not.toContain("stack");
    expect(text).not.toContain("Prisma");
  }

  // -------------------------------------------------------------- AC-01

  it("AC-01: login succeeds, returns tokens + admin, creates one hashed session", async () => {
    const username = freshUsername();
    const user = await createUser(username);
    const before = Date.now();
    const res = await loginReq(username, PASSWORD);
    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.tokenType).toBe("Bearer");
    expect(data.expiresIn).toBe(900);
    expect(data.admin).toEqual({ id: user.id, username, roles: [] });
    expect(data.accessToken).toBeDefined();
    expect(data.refreshToken).toBeDefined();
    expect(data.refreshToken).not.toBe(data.accessToken);
    expect(res.body).not.toHaveProperty("passwordHash");
    assertNoLeak(res.body);

    const access = jwtService.decode(data.accessToken) as Record<
      string,
      unknown
    >;
    expect(access.sub).toBe(user.id);
    expect(access.type).toBe("access");
    expect(access.roles).toEqual([]);
    // Expiry is exactly 15 minutes from the token's own iat (comparing
    // against the pre-request timestamp can be off by one second at a
    // second boundary — 901 — which is not an app bug).
    expect((access.exp as number) - (access.iat as number)).toBe(900);
    const iatDelta = (access.iat as number) - Math.floor(before / 1000);
    expect(iatDelta).toBeGreaterThanOrEqual(0);
    expect(iatDelta).toBeLessThanOrEqual(5);

    const sessions = await sessionsOf(user.id);
    expect(sessions).toHaveLength(1);
    const session = sessions[0];
    expect(session.tokenHash).toBe(tokens.hashToken(data.refreshToken));
    expect(session.tokenHash).toHaveLength(64); // SHA-256 hex, not plaintext
    expect(session.tokenHash).not.toBe(data.refreshToken);
    expect(session.revokedAt).toBeNull();
    const ttlSeconds = (session.expiresAt.getTime() - before) / 1000;
    expect(ttlSeconds).toBeGreaterThan(7 * 24 * 3600 - 60);
    expect(ttlSeconds).toBeLessThanOrEqual(7 * 24 * 3600 + 60);
  });

  // -------------------------------------------------------------- AC-02

  it("AC-02: wrong password and unknown username give the identical 401", async () => {
    const username = freshUsername();
    await createUser(username);
    const wrong = await loginReq(username, "definitely-wrong-password");
    expect(wrong.status).toBe(401);
    expect(wrong.body).toEqual({
      statusCode: 401,
      message: "Tài khoản hoặc mật khẩu không đúng.",
      error: "INVALID_CREDENTIALS",
    });
    assertNoLeak(wrong.body);

    const unknown = await loginReq(
      `ghost-${randomUUID().slice(0, 8)}`,
      "definitely-wrong-password",
    );
    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  it("AC-02: validation errors are 400 VALIDATION_ERROR with field details", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/admin/login")
      .send({ username: "only-username" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
    expect(res.body.message).toBe("Dữ liệu gửi lên không hợp lệ.");
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "password", code: "REQUIRED" }),
      ]),
    );
    assertNoLeak(res.body);
  });

  // -------------------------------------------------------------- AC-03

  it("AC-03: lockout after 3 failures (423 + retryAfter), correct password locked, unlock after 2s, success resets", async () => {
    const username = freshUsername();
    const user = await createUser(username);
    const ip = freshIp();
    const first = await loginReq(username, "wrong-password-1", ip);
    expect(first.status).toBe(401);
    const second = await loginReq(username, "wrong-password-2", ip);
    expect(second.status).toBe(401);
    const third = await loginReq(username, "wrong-password-3", ip);
    expect(third.status).toBe(423);
    expect(third.body.error).toBe("ACCOUNT_LOCKED");
    expect(third.body.message).toBe(
      "Tài khoản tạm thời bị khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau.",
    );
    expect(third.body.retryAfter).toBeGreaterThanOrEqual(1);
    expect(third.body.retryAfter).toBeLessThanOrEqual(2);
    // Error Catalog: 423 carries retryAfter in the BODY only — no
    // Retry-After header (Revision 02 decision on question 6).
    expect(third.headers["retry-after"]).toBeUndefined();
    assertNoLeak(third.body);

    const locked = await loginReq(username, PASSWORD, ip);
    expect(locked.status).toBe(423);

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

    await sleep(2100);
    const ok = await loginReq(username, PASSWORD, ip);
    expect(ok.status).toBe(200);
    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after?.failedLoginAttempts).toBe(0);
    expect(after?.lockedUntil).toBeNull();
  });

  // -------------------------------------------------------------- AC-04

  it("AC-04: refresh rotates the session atomically and completes one operation", async () => {
    const username = freshUsername();
    const user = await createUser(username);
    const pair = await loginOk(username);
    const oldHash = tokens.hashToken(pair.refreshToken);
    const key = freshKey();

    const res = await refreshReq(pair.refreshToken, key);
    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.tokenType).toBe("Bearer");
    expect(data.expiresIn).toBe(900);
    expect(data.accessToken).not.toBe(pair.accessToken);
    expect(data.refreshToken).not.toBe(pair.refreshToken);
    expect(data.admin).toEqual({ id: user.id, username, roles: [] });
    assertNoLeak(res.body);

    const newAccess = jwtService.decode(data.accessToken) as Record<
      string,
      unknown
    >;
    const newRefresh = jwtService.decode(data.refreshToken) as Record<
      string,
      unknown
    >;
    expect(newRefresh.type).toBe("refresh");
    expect(newRefresh.sub).toBe(user.id);

    const sessions = await sessionsOf(user.id);
    expect(sessions).toHaveLength(2);
    const oldSession = sessions.find((s) => s.tokenHash === oldHash);
    const newSession = sessions.find(
      (s) => s.tokenHash === tokens.hashToken(data.refreshToken),
    );
    expect(oldSession).toBeDefined();
    expect(oldSession?.revokedAt).not.toBeNull();
    expect(oldSession?.revokedReason).toBe("ROTATED");
    expect(newSession).toBeDefined();
    expect(oldSession?.replacedBySessionId).toBe(newSession?.id);
    expect(newRefresh.sid).toBe(newSession?.id);
    expect(newAccess.sid).toBe(newSession?.id);

    const operations = await prisma.authRefreshOperation.findMany({
      where: { tokenHash: oldHash, idempotencyKey: key },
    });
    expect(operations).toHaveLength(1);
    expect(operations[0].state).toBe("COMPLETED");
    expect(operations[0].ownerId).toBeDefined();

    // The Redis envelope for the completed operation still exists
    // (FIX-19: COMPLETED is never deleted).
    const envelopeKey = tokens.envelopeKeyFor(oldHash, key);
    expect(await redis.getClient().get(envelopeKey)).not.toBeNull();
  });

  // -------------------------------------------------------------- AC-05

  it("AC-05: replay with a different key revokes ALL sessions and returns 401 TOKEN_REUSE_DETECTED", async () => {
    const username = freshUsername();
    const user = await createUser(username);
    const pair1 = await loginOk(username);
    const pair2 = await loginOk(username); // second ACTIVE session
    const key = freshKey();
    const rotated = await refreshReq(pair1.refreshToken, key);
    expect(rotated.status).toBe(200);
    const newSessionId = (
      jwtService.decode(rotated.body.data.refreshToken) as Record<
        string,
        unknown
      >
    ).sid as string;
    const sessionsBefore = await sessionsOf(user.id);
    expect(sessionsBefore).toHaveLength(3);

    const replay = await refreshReq(
      pair1.refreshToken,
      freshKey(), // different key -> replay, not the same operation
    );
    expect(replay.status).toBe(401);
    expect(replay.body).toEqual({
      statusCode: 401,
      message: "Phát hiện phiên đăng nhập bất thường, vui lòng đăng nhập lại.",
      error: "TOKEN_REUSE_DETECTED",
    });
    assertNoLeak(replay.body);

    const sessions = await sessionsOf(user.id);
    expect(sessions).toHaveLength(3);
    const byId = new Map(sessions.map((s) => [s.id, s]));
    // The replayed row keeps ROTATED (trace evidence); the two sessions
    // that were ACTIVE are now REUSE_DETECTED.
    expect(byId.get(newSessionId)?.revokedReason).toBe("REUSE_DETECTED");
    const second = sessions.find(
      (s) => s.tokenHash === tokens.hashToken(pair2.refreshToken),
    );
    expect(second?.revokedReason).toBe("REUSE_DETECTED");
    const replayed = sessions.find(
      (s) => s.tokenHash === tokens.hashToken(pair1.refreshToken),
    );
    expect(replayed?.revokedReason).toBe("ROTATED");
    expect(replayed?.replacedBySessionId).toBe(newSessionId);
    expect(await sessionCount(user.id)).toBe(3); // no new session created

    const audits = await auditRows("auth.refresh_reuse_detected");
    expect(audits).toHaveLength(1);
    expect(audits[0].actorId).toBe(user.id);
    expect(audits[0].entityId).toBe(user.id);
    expect(audits[0].after).toMatchObject({ revokedSessions: 2 });
    expect(JSON.stringify(audits[0].after)).not.toContain(pair1.refreshToken);
  });

  // -------------------------------------------------------------- FIX-33

  it("FIX-33: refresh with a token whose sub does not match the session's owner is 401, no rotation, no revoke-all", async () => {
    const username = freshUsername();
    const user = await createUser(username);
    const other = await createUser(freshUsername());
    const pair = await loginOk(username);
    const otherPair = await loginOk(username); // second ACTIVE session
    const sessionId = (
      jwtService.decode(pair.refreshToken) as Record<string, unknown>
    ).sid as string;
    // Move the session row to another owner (DB-level tamper): the
    // token's sub (user.id) no longer matches the session's userId.
    await prisma.adminRefreshSession.update({
      where: { id: sessionId },
      data: { userId: other.id },
    });
    const key = freshKey();
    const res = await refreshReq(pair.refreshToken, key);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("INVALID_REFRESH_TOKEN");
    assertNoLeak(res.body);
    // No rotation: no new session, no COMPLETED operation.
    expect(await sessionCount(user.id)).toBe(1); // only otherPair's session
    expect(await sessionCount(other.id)).toBe(1); // the moved row
    const moved = await prisma.adminRefreshSession.findUnique({
      where: { id: sessionId },
    });
    expect(moved?.revokedAt).toBeNull(); // still ACTIVE, untouched
    expect(await operationCount(tokens.hashToken(pair.refreshToken), key)).toBe(
      0,
    );
    // No revoke-all: the other session is untouched, no reuse audit.
    const otherSession = await prisma.adminRefreshSession.findUnique({
      where: { tokenHash: tokens.hashToken(otherPair.refreshToken) },
    });
    expect(otherSession?.revokedAt).toBeNull();
    expect(await auditRows("auth.refresh_reuse_detected")).toHaveLength(0);
  });

  it("FIX-33: refresh with a token whose sid does not match the session row is 401, no rotation, no revoke-all", async () => {
    const username = freshUsername();
    const user = await createUser(username);
    const pair = await loginOk(username);
    const otherPair = await loginOk(username);
    const oldSessionId = (
      jwtService.decode(pair.refreshToken) as Record<string, unknown>
    ).sid as string;
    const tokenHash = tokens.hashToken(pair.refreshToken);
    // Replace the session row with a row carrying the same token hash
    // but a different id: the token's sid no longer matches the row.
    await prisma.adminRefreshSession.delete({ where: { id: oldSessionId } });
    const newSessionId = randomUUID();
    await prisma.adminRefreshSession.create({
      data: {
        id: newSessionId,
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      },
    });
    const key = freshKey();
    const res = await refreshReq(pair.refreshToken, key);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("INVALID_REFRESH_TOKEN");
    assertNoLeak(res.body);
    expect(await sessionCount(user.id)).toBe(2);
    const kept = await prisma.adminRefreshSession.findUnique({
      where: { id: newSessionId },
    });
    expect(kept?.revokedAt).toBeNull();
    expect(await operationCount(tokenHash, key)).toBe(0);
    const otherSession = await prisma.adminRefreshSession.findUnique({
      where: { tokenHash: tokens.hashToken(otherPair.refreshToken) },
    });
    expect(otherSession?.revokedAt).toBeNull();
    expect(await auditRows("auth.refresh_reuse_detected")).toHaveLength(0);
  });

  // -------------------------------------------------------------- AC-06

  it("AC-06: expired / LOGOUT / LOGOUT_ALL / ADMIN_REVOKED -> 401 INVALID_REFRESH_TOKEN; REUSE_DETECTED -> 401 TOKEN_REUSE_DETECTED", async () => {
    const username = freshUsername();
    const user = await createUser(username);

    // Expired session (DB row expired, JWT itself still valid).
    const expiredPair = await loginOk(username);
    const expiredHash = tokens.hashToken(expiredPair.refreshToken);
    await prisma.adminRefreshSession.update({
      where: { tokenHash: expiredHash },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const expired = await refreshReq(expiredPair.refreshToken, freshKey());
    expect(expired.status).toBe(401);
    expect(expired.body.error).toBe("INVALID_REFRESH_TOKEN");
    expect(expired.body.message).toBe(
      "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.",
    );

    // LOGOUT: logout one session, then refresh it.
    const logoutPair = await loginOk(username);
    await request(app.getHttpServer())
      .post("/api/v1/auth/admin/logout")
      .set("Authorization", `Bearer ${logoutPair.accessToken}`)
      .send({ refreshToken: logoutPair.refreshToken })
      .expect(204);
    const afterLogout = await refreshReq(logoutPair.refreshToken, freshKey());
    expect(afterLogout.status).toBe(401);
    expect(afterLogout.body.error).toBe("INVALID_REFRESH_TOKEN");

    // LOGOUT_ALL: logout without a refresh token, then refresh.
    const allPair = await loginOk(username);
    await request(app.getHttpServer())
      .post("/api/v1/auth/admin/logout")
      .set("Authorization", `Bearer ${allPair.accessToken}`)
      .send({})
      .expect(204);
    const afterAll = await refreshReq(allPair.refreshToken, freshKey());
    expect(afterAll.status).toBe(401);
    expect(afterAll.body.error).toBe("INVALID_REFRESH_TOKEN");

    // ADMIN_REVOKED set directly in the DB.
    const adminPair = await loginOk(username);
    await prisma.adminRefreshSession.update({
      where: { tokenHash: tokens.hashToken(adminPair.refreshToken) },
      data: { revokedAt: new Date(), revokedReason: "ADMIN_REVOKED" },
    });
    const afterAdmin = await refreshReq(adminPair.refreshToken, freshKey());
    expect(afterAdmin.status).toBe(401);
    expect(afterAdmin.body.error).toBe("INVALID_REFRESH_TOKEN");

    // REUSE_DETECTED set directly in the DB.
    const reusePair = await loginOk(username);
    await prisma.adminRefreshSession.update({
      where: { tokenHash: tokens.hashToken(reusePair.refreshToken) },
      data: { revokedAt: new Date(), revokedReason: "REUSE_DETECTED" },
    });
    const afterReuse = await refreshReq(reusePair.refreshToken, freshKey());
    expect(afterReuse.status).toBe(401);
    expect(afterReuse.body.error).toBe("TOKEN_REUSE_DETECTED");

    // None of the failures created a session.
    expect(await sessionCount(user.id)).toBe(5);
  });

  // -------------------------------------------------------------- AC-07

  it("AC-07: logout one session (204, LOGOUT + blacklist) and logout-all (204, LOGOUT_ALL)", async () => {
    const username = freshUsername();
    const user = await createUser(username);
    const pair = await loginOk(username);
    const otherPair = await loginOk(username);

    const logoutOne = await request(app.getHttpServer())
      .post("/api/v1/auth/admin/logout")
      .set("Authorization", `Bearer ${pair.accessToken}`)
      .send({ refreshToken: pair.refreshToken });
    expect(logoutOne.status).toBe(204);
    expect(logoutOne.text).toBe("");

    const one = await prisma.adminRefreshSession.findUnique({
      where: { tokenHash: tokens.hashToken(pair.refreshToken) },
    });
    expect(one?.revokedReason).toBe("LOGOUT");
    expect(one?.revokedAt).not.toBeNull();
    const other = await prisma.adminRefreshSession.findUnique({
      where: { tokenHash: tokens.hashToken(otherPair.refreshToken) },
    });
    expect(other?.revokedAt).toBeNull(); // untouched by single logout

    // The logged-out access token is rejected (blacklisted).
    const meAfter = await meReq(pair.accessToken);
    expect(meAfter.status).toBe(401);
    expect(meAfter.body.error).toBe("UNAUTHENTICATED");
    expect(meAfter.body.message).toBe("Bạn chưa đăng nhập.");
    // Its refresh token is rejected too.
    const refreshAfter = await refreshReq(pair.refreshToken, freshKey());
    expect(refreshAfter.status).toBe(401);
    expect(refreshAfter.body.error).toBe("INVALID_REFRESH_TOKEN");

    const auditsOne = await auditRows("auth.logout_session");
    expect(auditsOne).toHaveLength(1);
    expect(auditsOne[0].actorId).toBe(user.id);

    // Logout-all (no refreshToken): every session of the account is revoked.
    const logoutAll = await request(app.getHttpServer())
      .post("/api/v1/auth/admin/logout")
      .set("Authorization", `Bearer ${otherPair.accessToken}`)
      .send({});
    expect(logoutAll.status).toBe(204);
    const sessions = await sessionsOf(user.id);
    expect(
      sessions.every(
        (s) => s.revokedReason === "LOGOUT_ALL" || s.revokedReason === "LOGOUT",
      ),
    ).toBe(true);
    expect(
      sessions.find(
        (s) => s.tokenHash === tokens.hashToken(otherPair.refreshToken),
      )?.revokedReason,
    ).toBe("LOGOUT_ALL");
    const auditsAll = await auditRows("auth.logout_all_sessions");
    expect(auditsAll).toHaveLength(1);
    expect(auditsAll[0].after).toMatchObject({ revokedSessions: 1 });
  });

  it("AC-07: the old access token stops working immediately after a refresh (sid ROTATED)", async () => {
    const username = freshUsername();
    await createUser(username);
    const pair = await loginOk(username);
    const refreshed = await refreshReq(pair.refreshToken, freshKey());
    expect(refreshed.status).toBe(200);
    const meOld = await meReq(pair.accessToken);
    expect(meOld.status).toBe(401);
    expect(meOld.body.error).toBe("UNAUTHENTICATED");
    const meNew = await meReq(refreshed.body.data.accessToken);
    expect(meNew.status).toBe(200);
  });

  it("AC-07: logout with another user's refresh token is rejected", async () => {
    const usernameA = freshUsername();
    const usernameB = freshUsername();
    await createUser(usernameA);
    await createUser(usernameB);
    const pairA = await loginOk(usernameA);
    const pairB = await loginOk(usernameB);
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/admin/logout")
      .set("Authorization", `Bearer ${pairA.accessToken}`)
      .send({ refreshToken: pairB.refreshToken });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("INVALID_REFRESH_TOKEN");
  });

  // -------------------------------------------------------------- FIX-34

  it("FIX-34: logout with NO body at all is logout-all (204, all sessions revoked, access blacklisted)", async () => {
    const username = freshUsername();
    const user = await createUser(username);
    await loginOk(username); // first session — revoked by the logout-all call
    const otherPair = await loginOk(username);

    // No .send() — no JSON body, no Content-Type.
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/admin/logout")
      .set("Authorization", `Bearer ${otherPair.accessToken}`);
    expect(res.status).toBe(204);
    expect(res.text).toBe("");

    const sessions = await sessionsOf(user.id);
    expect(sessions).toHaveLength(2);
    expect(sessions.every((s) => s.revokedReason === "LOGOUT_ALL")).toBe(true);
    const auditsAll = await auditRows("auth.logout_all_sessions");
    expect(auditsAll).toHaveLength(1);
    expect(auditsAll[0].after).toMatchObject({ revokedSessions: 2 });

    // The access token used for the call is blacklisted too.
    const meAfter = await meReq(otherPair.accessToken);
    expect(meAfter.status).toBe(401);
    expect(meAfter.body.error).toBe("UNAUTHENTICATED");
    const refreshAfter = await refreshReq(otherPair.refreshToken, freshKey());
    expect(refreshAfter.status).toBe(401);
    expect(refreshAfter.body.error).toBe("INVALID_REFRESH_TOKEN");
  });

  // -------------------------------------------------------------- AC-08

  it("AC-08: /me merges roles + permissions, deny wins; no token and expired token are 401", async () => {
    const username = freshUsername();
    const user = await createUser(username);
    const role = await prisma.role.create({ data: { name: "Quản lý kho" } });
    const read = await prisma.permission.create({
      data: { module: "orders", action: "read" },
    });
    const del = await prisma.permission.create({
      data: { module: "orders", action: "delete" },
    });
    const create = await prisma.permission.create({
      data: { module: "products", action: "create" },
    });
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: read.id, granted: true },
    });
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: del.id, granted: true },
    });
    await prisma.userRole.create({
      data: { userId: user.id, roleId: role.id },
    });
    // User-level exception: deny orders.delete (overrides the role allow).
    await prisma.userPermission.create({
      data: { userId: user.id, permissionId: del.id, granted: false },
    });
    // User-level exception: allow products.create (no role grants it).
    await prisma.userPermission.create({
      data: { userId: user.id, permissionId: create.id, granted: true },
    });

    const pair = await loginOk(username);
    const me = await meReq(pair.accessToken);
    expect(me.status).toBe(200);
    expect(me.body.data).toEqual({
      id: user.id,
      username,
      roles: [{ id: role.id, name: "Quản lý kho" }],
      permissions: ["orders.read", "products.create"],
    });

    const noToken = await request(app.getHttpServer()).get(
      "/api/v1/auth/admin/me",
    );
    expect(noToken.status).toBe(401);
    expect(noToken.body.error).toBe("UNAUTHENTICATED");

    // Expired access token (signed directly, 1s TTL, same session id).
    const sid = (jwtService.decode(pair.accessToken) as Record<string, unknown>)
      .sid as string;
    const expiredAccess = jwtService.sign(
      { sub: user.id, sid, type: "access", roles: [] },
      { secret: process.env.JWT_SECRET, expiresIn: 1 },
    );
    await sleep(1100);
    const expired = await meReq(expiredAccess);
    expect(expired.status).toBe(401);
    expect(expired.body.error).toBe("TOKEN_EXPIRED");
    expect(expired.body.message).toBe("Phiên đăng nhập đã hết hạn.");
    assertNoLeak(expired.body);
  });

  // -------------------------------------------------------------- AC-11

  it("AC-11: inactive account cannot log in (same generic 401)", async () => {
    const username = freshUsername();
    await createUser(username, PASSWORD, false);
    const res = await loginReq(username, PASSWORD);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("INVALID_CREDENTIALS");
    expect(res.body.message).toBe("Tài khoản hoặc mật khẩu không đúng.");
  });

  // -------------------------------------------------------------- AC-12

  it("AC-12: no token/password/hash/plaintext appears in responses or the DB", async () => {
    const username = freshUsername();
    const user = await createUser(username);
    const pair = await loginOk(username);
    const refreshed = await refreshReq(pair.refreshToken, freshKey());
    expect(refreshed.status).toBe(200);

    const allText = JSON.stringify({
      login: pair,
      refresh: refreshed.body.data,
    });
    expect(allText).not.toContain("passwordHash");
    expect(allText).not.toContain("correct horse");

    // The DB stores only the SHA-256 hash of the refresh token, never the
    // plaintext token itself.
    const hashes = (await sessionsOf(user.id)).map((s) => s.tokenHash);
    expect(hashes).not.toContain(pair.refreshToken);
    expect(hashes).not.toContain(refreshed.body.data.refreshToken);
    for (const hash of hashes) {
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    }
    const audits = await prisma.auditLog.findMany();
    expect(JSON.stringify(audits)).not.toContain(pair.refreshToken);
  });

  // -------------------------------------------------------------- AC-14

  it("AC-14: token claims are minimal (access: sub/sid/type/roles/iat/exp; refresh: sub/sid/type/iat/exp)", async () => {
    const username = freshUsername();
    await createUser(username);
    const pair = await loginOk(username);
    const access = jwtService.decode(pair.accessToken) as Record<
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
    const refresh = jwtService.decode(pair.refreshToken) as Record<
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
    expect(refresh).not.toHaveProperty("roles");
  });

  // -------------------------------------------------------------- AC-09

  it("AC-09: login over 5/min/IP -> 429 RATE_LIMITED + Retry-After header", async () => {
    const ip = freshIp();
    for (let i = 0; i < 5; i++) {
      const res = await loginReq(
        `ghost-${i}-${randomUUID().slice(0, 6)}`,
        "wrong-password",
        ip,
      );
      expect(res.status).toBe(401); // unknown user: counted, then 401
    }
    const sixth = await loginReq(
      `ghost-5-${randomUUID().slice(0, 6)}`,
      "wrong-password",
      ip,
    );
    expect(sixth.status).toBe(429);
    expect(sixth.body.error).toBe("RATE_LIMITED");
    expect(sixth.body.message).toBe(
      "Bạn thao tác quá nhanh, vui lòng thử lại sau.",
    );
    expect(sixth.body.retryAfter).toBeGreaterThanOrEqual(1);
    expect(sixth.headers["retry-after"]).toBeDefined();
    assertNoLeak(sixth.body);
  });

  it("AC-09: login over 10/min/account -> 429 (isolated from the IP limit by distinct IPs)", async () => {
    const username = freshUsername();
    await createUser(username);
    for (let i = 0; i < 10; i++) {
      const res = await loginReq(username, PASSWORD, freshIp());
      expect(res.status).toBe(200);
    }
    const eleventh = await loginReq(username, PASSWORD, freshIp());
    expect(eleventh.status).toBe(429);
    expect(eleventh.body.error).toBe("RATE_LIMITED");
    expect(eleventh.headers["retry-after"]).toBeDefined();
  });

  // -------------------------------------------------------------- AC-10

  it("AC-10: refresh over 30/min/IP -> 429", async () => {
    const ip = freshIp();
    for (let i = 0; i < 30; i++) {
      const res = await refreshReq("not-a-real-token", freshKey(), ip);
      expect(res.status).toBe(401); // counted by the IP limit, then 401
    }
    const thirtyFirst = await refreshReq("not-a-real-token", freshKey(), ip);
    expect(thirtyFirst.status).toBe(429);
    expect(thirtyFirst.body.error).toBe("RATE_LIMITED");
    expect(thirtyFirst.headers["retry-after"]).toBeDefined();
  });

  it("AC-10: refresh over 10/min/account -> 429 (same token + same key, distinct IPs)", async () => {
    const username = freshUsername();
    await createUser(username);
    const pair = await loginOk(username);
    const key = freshKey();
    for (let i = 0; i < 10; i++) {
      const res = await refreshReq(pair.refreshToken, key, freshIp());
      expect(res.status).toBe(200); // same operation: the stored response
    }
    const eleventh = await refreshReq(pair.refreshToken, key, freshIp());
    expect(eleventh.status).toBe(429);
    expect(eleventh.body.error).toBe("RATE_LIMITED");
  });

  // -------------------------------------------------------------- AC-17

  it("AC-17 E1: two concurrent refreshes with the same token + same key -> one rotation, both get the same response", async () => {
    const username = freshUsername();
    const user = await createUser(username);
    const pair = await loginOk(username);
    const key = freshKey();
    const [first, second] = await Promise.all([
      refreshReq(pair.refreshToken, key),
      refreshReq(pair.refreshToken, key),
    ]);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.data.accessToken).toBe(second.body.data.accessToken);
    expect(first.body.data.refreshToken).toBe(second.body.data.refreshToken);
    expect(await sessionCount(user.id)).toBe(2); // exactly 1 new session
    const oldHash = tokens.hashToken(pair.refreshToken);
    expect(await operationCount(oldHash, key)).toBe(1);
    const operation = await prisma.authRefreshOperation.findUnique({
      where: {
        tokenHash_idempotencyKey: { tokenHash: oldHash, idempotencyKey: key },
      },
    });
    expect(operation?.state).toBe("COMPLETED");
  });

  it("AC-17 E3: refresh without Idempotency-Key -> 400; malformed key -> 400", async () => {
    const username = freshUsername();
    await createUser(username);
    const pair = await loginOk(username);
    const missing = await request(app.getHttpServer())
      .post("/api/v1/auth/admin/refresh")
      .send({ refreshToken: pair.refreshToken });
    expect(missing.status).toBe(400);
    expect(missing.body.error).toBe("VALIDATION_ERROR");
    expect(missing.body.details).toEqual([
      {
        field: "Idempotency-Key",
        code: "REQUIRED",
        message: "Thiếu header Idempotency-Key.",
      },
    ]);
    const malformed = await request(app.getHttpServer())
      .post("/api/v1/auth/admin/refresh")
      .set("Idempotency-Key", "not-a-uuid")
      .send({ refreshToken: pair.refreshToken });
    expect(malformed.status).toBe(400);
    expect(malformed.body.error).toBe("VALIDATION_ERROR");
    expect(malformed.body.details[0].field).toBe("Idempotency-Key");
    expect(malformed.body.details[0].code).toBe("INVALID_FORMAT");
  });

  it("AC-17 E4: same token + same key after the envelope TTL expires -> 503, not a replay", async () => {
    const username = freshUsername();
    const user = await createUser(username);
    const pair = await loginOk(username);
    const key = freshKey();
    const first = await refreshReq(pair.refreshToken, key);
    expect(first.status).toBe(200);
    await sleep(11_000); // envelope TTL is 10s
    const retry = await refreshReq(pair.refreshToken, key);
    expect(retry.status).toBe(503);
    expect(retry.body.error).toBe("SERVICE_UNAVAILABLE");
    expect(retry.body.message).toBe(
      "Dịch vụ tạm thời không khả dụng, vui lòng thử lại sau.",
    );
    expect(retry.headers["retry-after"]).toBeDefined();
    // No new session, no revoke-all: the operation is still COMPLETED.
    expect(await sessionCount(user.id)).toBe(2);
    const operation = await prisma.authRefreshOperation.findUnique({
      where: {
        tokenHash_idempotencyKey: {
          tokenHash: tokens.hashToken(pair.refreshToken),
          idempotencyKey: key,
        },
      },
    });
    expect(operation?.state).toBe("COMPLETED");
    const sessions = await sessionsOf(user.id);
    expect(
      sessions.filter((s) => s.revokedReason === "REUSE_DETECTED"),
    ).toHaveLength(0);
  }, 30_000);

  it("AC-17 E5 (FIX-30): leader commits in the (5s, 10s) window after the follower times out -> follower 503, leader 200, exactly 1 new session", async () => {
    const username = freshUsername();
    const user = await createUser(username);
    const pair = await loginOk(username);
    const key = freshKey();
    const hooks = {
      onClaimed: async (tx: Prisma.TransactionClient) => {
        // Keep the leader transaction alive with statements every ~1s
        // (no idle gap > 5s) for ~6.5s, then let it COMMIT (inside 10s).
        const started = Date.now();
        while (Date.now() - started < 6500) {
          await tx.$executeRaw`SELECT 1`;
          await sleep(1000);
        }
      },
    };
    const leaderPromise = authService.refresh(
      pair.refreshToken,
      key,
      "127.0.0.1",
      hooks,
    );
    await sleep(500); // the leader has claimed by now
    const follower = await refreshReq(pair.refreshToken, key);
    expect(follower.status).toBe(503);
    expect(follower.body.error).toBe("SERVICE_UNAVAILABLE");
    expect(follower.headers["retry-after"]).toBeDefined();
    const leader = await leaderPromise;
    expect(leader.accessToken).toBeDefined();
    expect(leader.refreshToken).toBeDefined();
    expect(await sessionCount(user.id)).toBe(2); // exactly 1 new session
    expect(await operationCount(tokens.hashToken(pair.refreshToken), key)).toBe(
      1,
    );
  }, 30_000);

  it("AC-17 E5b (FIX-31): leader idle > 5s with no follower -> idle timeout rolls back, 0 new sessions, old session stays ACTIVE", async () => {
    const username = freshUsername();
    const user = await createUser(username);
    const pair = await loginOk(username);
    const key = freshKey();
    const hooks = {
      onClaimed: async () => {
        await sleep(6000); // no statements: idle-in-transaction timeout
      },
    };
    let caught: unknown;
    try {
      await authService.refresh(pair.refreshToken, key, "127.0.0.1", hooks);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeDefined();
    expect(
      (caught as { getResponse: () => unknown }).getResponse(),
    ).toMatchObject({ statusCode: 503, error: "SERVICE_UNAVAILABLE" });
    expect(await sessionCount(user.id)).toBe(1); // 0 new sessions
    const session = await prisma.adminRefreshSession.findUnique({
      where: { tokenHash: tokens.hashToken(pair.refreshToken) },
    });
    expect(session?.revokedAt).toBeNull(); // still ACTIVE
    expect(await operationCount(tokens.hashToken(pair.refreshToken), key)).toBe(
      0,
    ); // the operation row vanished with the rollback
  }, 30_000);

  it("AC-17 E5c: leader idle > 5s WITH a follower -> the follower becomes the new leader (200), exactly 1 new session", async () => {
    const username = freshUsername();
    const user = await createUser(username);
    const pair = await loginOk(username);
    const key = freshKey();
    const hooks = {
      onClaimed: async () => {
        await sleep(6000); // leader goes idle; its transaction is aborted
      },
    };
    const leaderPromise = authService.refresh(
      pair.refreshToken,
      key,
      "127.0.0.1",
      hooks,
    );
    await sleep(500);
    const follower = await refreshReq(pair.refreshToken, key);
    // The old transaction rolled back, so the follower's claim succeeds
    // and it becomes the leader — NOT a 503 by default (FIX-31).
    expect(follower.status).toBe(200);
    const leaderOutcome = await leaderPromise.then(
      () => "resolved",
      (error: unknown) => error,
    );
    expect(leaderOutcome).not.toBe("resolved");
    expect(
      (leaderOutcome as { getResponse: () => unknown }).getResponse(),
    ).toMatchObject({ statusCode: 503, error: "SERVICE_UNAVAILABLE" });
    expect(await sessionCount(user.id)).toBe(2); // exactly 1 new session
    expect(await operationCount(tokens.hashToken(pair.refreshToken), key)).toBe(
      1,
    );
  }, 30_000);

  it("AC-17 E6 (FIX-32): transaction past the 10s Prisma timeout -> rollback, 0 new sessions", async () => {
    const username = freshUsername();
    const user = await createUser(username);
    const pair = await loginOk(username);
    const key = freshKey();
    const hooks = {
      onClaimed: async (tx: Prisma.TransactionClient) => {
        // Keep-alive statements (no idle gap) for ~11s: the Prisma
        // interactive-transaction timeout (10s) fires instead.
        const started = Date.now();
        while (Date.now() - started < 11_000) {
          await tx.$executeRaw`SELECT 1`;
          await sleep(1000);
        }
      },
    };
    let caught: unknown;
    try {
      await authService.refresh(pair.refreshToken, key, "127.0.0.1", hooks);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeDefined();
    expect(
      (caught as { getResponse: () => unknown }).getResponse(),
    ).toMatchObject({ statusCode: 503, error: "SERVICE_UNAVAILABLE" });
    expect(await sessionCount(user.id)).toBe(1);
    const session = await prisma.adminRefreshSession.findUnique({
      where: { tokenHash: tokens.hashToken(pair.refreshToken) },
    });
    expect(session?.revokedAt).toBeNull();
    expect(await operationCount(tokens.hashToken(pair.refreshToken), key)).toBe(
      0,
    );
  }, 30_000);

  it("AC-17 rollback: session revoked mid-transaction -> whole transaction rolls back, operation row vanishes", async () => {
    const username = freshUsername();
    const user = await createUser(username);
    const pair = await loginOk(username);
    const key = freshKey();
    const oldHash = tokens.hashToken(pair.refreshToken);
    const hooks = {
      onClaimed: async () => {
        // Revoke the session from a separate connection while the leader
        // transaction is still open (before its FOR UPDATE).
        await prisma.adminRefreshSession.update({
          where: { tokenHash: oldHash },
          data: { revokedAt: new Date(), revokedReason: "LOGOUT" },
        });
      },
    };
    let caught: unknown;
    try {
      await authService.refresh(pair.refreshToken, key, "127.0.0.1", hooks);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeDefined();
    expect(
      (caught as { getResponse: () => unknown }).getResponse(),
    ).toMatchObject({ statusCode: 401, error: "INVALID_REFRESH_TOKEN" });
    expect(await sessionCount(user.id)).toBe(1); // no new session
    expect(await operationCount(oldHash, key)).toBe(0); // row vanished
  });

  it("AC-17: envelope with a mismatched ownerId -> follower 503 (owner cross-check)", async () => {
    const username = freshUsername();
    await createUser(username);
    const pair = await loginOk(username);
    const key = freshKey();
    const first = await refreshReq(pair.refreshToken, key);
    expect(first.status).toBe(200);
    const oldHash = tokens.hashToken(pair.refreshToken);
    const envelopeKey = tokens.envelopeKeyFor(oldHash, key);
    // Tamper: same envelope key, but another owner's id in the metadata.
    await redis.getClient().set(
      envelopeKey,
      JSON.stringify({
        state: "COMPLETED",
        ownerId: "00000000-0000-4000-8000-000000000000",
        sid: "tampered",
        ciphertext: "AAAA",
        createdAt: Date.now(),
      }),
    );
    const retry = await refreshReq(pair.refreshToken, key);
    expect(retry.status).toBe(503);
    expect(retry.body.error).toBe("SERVICE_UNAVAILABLE");
  });

  it("AC-17: cleanup deletes only expired operations and skips locked rows (FOR UPDATE SKIP LOCKED)", async () => {
    const expired = await prisma.authRefreshOperation.create({
      data: {
        tokenHash: "a".repeat(64),
        idempotencyKey: freshKey(),
        ownerId: randomUUID(),
        state: "COMPLETED",
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    const live = await prisma.authRefreshOperation.create({
      data: {
        tokenHash: "b".repeat(64),
        idempotencyKey: freshKey(),
        ownerId: randomUUID(),
        state: "COMPLETED",
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });
    expect(await authService.cleanupExpiredOperations()).toBe(1);
    expect(
      await prisma.authRefreshOperation.findUnique({
        where: { id: expired.id },
      }),
    ).toBeNull();
    expect(
      await prisma.authRefreshOperation.findUnique({ where: { id: live.id } }),
    ).not.toBeNull();

    const locked = await prisma.authRefreshOperation.create({
      data: {
        tokenHash: "c".repeat(64),
        idempotencyKey: freshKey(),
        ownerId: randomUUID(),
        state: "COMPLETED",
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    await lockClient.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM auth_refresh_operations WHERE id = ${locked.id}::uuid FOR UPDATE`;
      expect(await authService.cleanupExpiredOperations()).toBe(0);
    });
    expect(await authService.cleanupExpiredOperations()).toBe(1);
    expect(
      await prisma.authRefreshOperation.findUnique({
        where: { id: locked.id },
      }),
    ).toBeNull();
  });

  it("AC-17 FIX-28: ambiguous COMMIT — (a) COMPLETED + owner match returns the held pair; (b) no row re-claims as leader; (c) PENDING row -> 503", async () => {
    const resolve = (
      authService as unknown as {
        resolveAmbiguousCommit: (input: {
          tokenHash: string;
          key: string;
          ownerId: string;
          heldPair: {
            pair: { accessToken: string; refreshToken: string };
            newSessionId: string;
          } | null;
          userId: string;
        }) => Promise<{
          accessToken: string;
          refreshToken: string;
        }>;
      }
    ).resolveAmbiguousCommit.bind(authService);

    // (a) A real committed rotation: the held pair is returned as-is.
    const usernameA = freshUsername();
    const userA = await createUser(usernameA);
    const pairA = await loginOk(usernameA);
    const keyA = freshKey();
    const doneA = await refreshReq(pairA.refreshToken, keyA);
    expect(doneA.status).toBe(200);
    const oldHashA = tokens.hashToken(pairA.refreshToken);
    const operationA = await prisma.authRefreshOperation.findUnique({
      where: {
        tokenHash_idempotencyKey: { tokenHash: oldHashA, idempotencyKey: keyA },
      },
    });
    expect(operationA?.state).toBe("COMPLETED");
    const newSessionIdA = (
      jwtService.decode(doneA.body.data.refreshToken) as Record<string, unknown>
    ).sid as string;
    const heldA = await resolve({
      tokenHash: oldHashA,
      key: keyA,
      ownerId: operationA!.ownerId,
      heldPair: {
        pair: {
          accessToken: doneA.body.data.accessToken,
          refreshToken: doneA.body.data.refreshToken,
        },
        newSessionId: newSessionIdA,
      },
      userId: userA.id,
    });
    expect(heldA.accessToken).toBe(doneA.body.data.accessToken);
    expect(heldA.refreshToken).toBe(doneA.body.data.refreshToken);
    expect(await sessionCount(userA.id)).toBe(2); // no second rotation

    // (a2) Same operation, wrong owner -> follower path, stored response.
    const followerA = await resolve({
      tokenHash: oldHashA,
      key: keyA,
      ownerId: randomUUID(),
      heldPair: null,
      userId: userA.id,
    });
    expect(followerA.accessToken).toBe(doneA.body.data.accessToken);
    expect(await sessionCount(userA.id)).toBe(2);

    // (b) No operation row at all -> re-claim, leader with a FRESH pair.
    const usernameB = freshUsername();
    const userB = await createUser(usernameB);
    const pairB = await loginOk(usernameB);
    const keyB = freshKey();
    const fresh = await resolve({
      tokenHash: tokens.hashToken(pairB.refreshToken),
      key: keyB,
      ownerId: randomUUID(),
      heldPair: null,
      userId: userB.id,
    });
    expect(fresh.refreshToken).not.toBe(pairB.refreshToken);
    expect(await sessionCount(userB.id)).toBe(2);
    expect(
      await operationCount(tokens.hashToken(pairB.refreshToken), keyB),
    ).toBe(1);

    // (c) A PENDING operation row (unverifiable) -> 503, no token.
    const usernameC = freshUsername();
    await createUser(usernameC);
    const pairC = await loginOk(usernameC);
    const keyC = freshKey();
    await prisma.authRefreshOperation.create({
      data: {
        tokenHash: tokens.hashToken(pairC.refreshToken),
        idempotencyKey: keyC,
        ownerId: randomUUID(),
        state: "PENDING",
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });
    let caught: unknown;
    try {
      await resolve({
        tokenHash: tokens.hashToken(pairC.refreshToken),
        key: keyC,
        ownerId: randomUUID(),
        heldPair: null,
        userId: "00000000-0000-4000-8000-000000000000",
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeDefined();
    expect(
      (caught as { getResponse: () => unknown }).getResponse(),
    ).toMatchObject({ statusCode: 503, error: "SERVICE_UNAVAILABLE" });
  });

  it("diagnostic: Prisma error shapes for idle timeout and transaction timeout (verified 2026-11-27, Prisma 6.19.3)", async () => {
    let idleError: unknown;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SET LOCAL idle_in_transaction_session_timeout = '1s'`;
        await sleep(1500);
        await tx.$executeRaw`SELECT 1`;
      });
    } catch (error) {
      idleError = error;
    }
    expect(idleError).toBeDefined();
    // An idle abort surfaces as P1017 "Server has closed the connection"
    // — the literal PostgreSQL message never reaches the application, so
    // the idle classifier (literal match) does NOT match; the error IS an
    // ambiguous-shaped connection error, and the RefreshStatementError
    // wrapper (not the message) is what marks it a proven rollback.
    const idle = idleError as Error & { code?: unknown };
    expect(idle.code).toBe("P1017");
    expect(idle.message).toContain("Server has closed the connection");
    expect(isIdleTimeoutError(idleError)).toBe(false);
    expect(isAmbiguousDbError(idleError)).toBe(true);

    let txError: unknown;
    try {
      await prisma.$transaction(
        async (tx) => {
          await tx.$executeRaw`SET LOCAL idle_in_transaction_session_timeout = '30s'`;
          await sleep(1200);
          await tx.$executeRaw`SELECT 1`;
        },
        { timeout: 1000 },
      );
    } catch (error) {
      txError = error;
    }
    expect(txError).toBeDefined();
    expect((txError as { code?: unknown }).code).toBe("P2028");
    expect(isTransactionTimeoutError(txError)).toBe(true);
    expect(isIdleTimeoutError(txError)).toBe(false);
  });

  // ------------------------------------------------- Redis down (dead port 6398)
  // A second app instance whose REDIS_URL points at a dead port. It shares
  // the test database and JWT secrets, so tokens issued by the main app
  // verify here — only Redis is gone. This is the AC-09/AC-10 memory
  // fallback, FIX-19 leader/follower, and AC-18 fail-closed blacklist.

  describe("Redis down (dead port 6398)", () => {
    let deadApp: INestApplication;
    let deadRedis: RedisService;

    beforeAll(async () => {
      // ConfigModule.forRoot() snapshots process.env at IMPORT time and
      // ConfigService.get() prefers that validated env, so neither
      // mutating process.env nor overriding ConfigService can change
      // REDIS_URL for a second app in this file — override the
      // RedisService provider itself with an instance built for the dead
      // port (its config source only needs `.get()`).
      const deadConfig = {
        get: (key: string) => {
          if (key === "REDIS_URL") return DEAD_REDIS_URL;
          // Fail fast on the dead port: every dead-Redis operation waits
          // the command timeout before RedisUnavailableError — 200ms is
          // plenty to prove the branch, and keeps the suite fast.
          if (key === "REDIS_COMMAND_TIMEOUT_MS") return "200";
          return process.env[key];
        },
      } as unknown as ConfigService;
      deadRedis = new RedisService(deadConfig);
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(RedisService)
        .useValue(deadRedis)
        .compile();
      deadApp = moduleFixture.createNestApplication();
      configureApp(deadApp);
      deadApp.getHttpAdapter().getInstance().set("trust proxy", true);
      await deadApp.init();
    });

    afterAll(async () => {
      await deadApp.close();
      await deadRedis.onModuleDestroy();
    });

    function deadLoginReq(username: string, password: string, ip: string) {
      return request(deadApp.getHttpServer())
        .post("/api/v1/auth/admin/login")
        .set("X-Forwarded-For", ip)
        .send({ username, password });
    }

    function deadRefreshReq(refreshToken: string, key: string, ip: string) {
      return request(deadApp.getHttpServer())
        .post("/api/v1/auth/admin/refresh")
        .set("X-Forwarded-For", ip)
        .set("Idempotency-Key", key)
        .send({ refreshToken });
    }

    it("AC-09 (Redis down): login rate limit still enforced by the in-memory fallback (6th from one IP -> 429)", async () => {
      const ip = freshIp();
      for (let i = 0; i < 5; i++) {
        const res = await deadLoginReq(
          `ghost-${i}-${randomUUID().slice(0, 6)}`,
          "wrong-password",
          ip,
        );
        expect(res.status).toBe(401);
      }
      const sixth = await deadLoginReq(
        `ghost-5-${randomUUID().slice(0, 6)}`,
        "wrong-password",
        ip,
      );
      expect(sixth.status).toBe(429);
      expect(sixth.body.error).toBe("RATE_LIMITED");
    });

    it("AC-09 (Redis down): login account limit still enforced by the in-memory fallback (11th -> 429)", async () => {
      const username = freshUsername();
      await createUser(username);
      for (let i = 0; i < 10; i++) {
        const res = await deadLoginReq(username, PASSWORD, freshIp());
        expect(res.status).toBe(200); // login itself works: sessions are in PostgreSQL
      }
      const eleventh = await deadLoginReq(username, PASSWORD, freshIp());
      expect(eleventh.status).toBe(429);
      expect(eleventh.body.error).toBe("RATE_LIMITED");
    });

    it("AC-10 (Redis down): refresh IP limit still enforced by the in-memory fallback (31st -> 429)", async () => {
      const ip = freshIp();
      for (let i = 0; i < 30; i++) {
        const res = await deadRefreshReq("not-a-real-token", freshKey(), ip);
        expect(res.status).toBe(401);
      }
      const thirtyFirst = await deadRefreshReq(
        "not-a-real-token",
        freshKey(),
        ip,
      );
      expect(thirtyFirst.status).toBe(429);
      expect(thirtyFirst.body.error).toBe("RATE_LIMITED");
    });

    it("FIX-19 (Redis down): the leader still gets its own response (200) after a DB commit", async () => {
      const username = freshUsername();
      const user = await createUser(username);
      const pair = await loginOk(username);
      const key = freshKey();
      const res = await deadRefreshReq(pair.refreshToken, key, freshIp());
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).not.toBe(pair.refreshToken);
      // The rotation really committed in PostgreSQL.
      const oldSession = await prisma.adminRefreshSession.findUnique({
        where: { tokenHash: tokens.hashToken(pair.refreshToken) },
      });
      expect(oldSession?.revokedReason).toBe("ROTATED");
      expect(await sessionCount(user.id)).toBe(2);
      const operation = await prisma.authRefreshOperation.findUnique({
        where: {
          tokenHash_idempotencyKey: {
            tokenHash: tokens.hashToken(pair.refreshToken),
            idempotencyKey: key,
          },
        },
      });
      expect(operation?.state).toBe("COMPLETED");
    });

    it("FIX-19 (Redis down): the follower cannot verify the envelope -> 503, never a token", async () => {
      const username = freshUsername();
      await createUser(username);
      const pair = await loginOk(username);
      const key = freshKey();
      const leader = await deadRefreshReq(pair.refreshToken, key, freshIp());
      expect(leader.status).toBe(200);
      const follower = await deadRefreshReq(pair.refreshToken, key, freshIp());
      expect(follower.status).toBe(503);
      expect(follower.body.error).toBe("SERVICE_UNAVAILABLE");
      expect(follower.body).not.toHaveProperty("data");
    });

    it("AC-10 (Redis down): refresh account limit still enforced by the in-memory fallback (11th -> 429)", async () => {
      const username = freshUsername();
      await createUser(username);
      const pair = await loginOk(username);
      const key = freshKey();
      const first = await deadRefreshReq(pair.refreshToken, key, freshIp());
      expect(first.status).toBe(200);
      for (let i = 0; i < 9; i++) {
        // Same operation, envelope unreadable (Redis down) -> 503, but the
        // account counter still increments before the session lookup.
        const res = await deadRefreshReq(pair.refreshToken, key, freshIp());
        expect(res.status).toBe(503);
      }
      const eleventh = await deadRefreshReq(pair.refreshToken, key, freshIp());
      expect(eleventh.status).toBe(429);
      expect(eleventh.body.error).toBe("RATE_LIMITED");
    });

    it("AC-18: after logout, /me with the logged-out access token is 503 when Redis dies (fail-closed, never 200 or a fake 401)", async () => {
      const username = freshUsername();
      await createUser(username);
      const pair = await loginOk(username);
      await request(app.getHttpServer())
        .post("/api/v1/auth/admin/logout")
        .set("Authorization", `Bearer ${pair.accessToken}`)
        .send({ refreshToken: pair.refreshToken })
        .expect(204);
      // The main app (live Redis) rejects the token with 401 (blacklisted).
      const live = await meReq(pair.accessToken);
      expect(live.status).toBe(401);
      // The dead-Redis app cannot check the blacklist: fail-closed 503.
      const dead = await request(deadApp.getHttpServer())
        .get("/api/v1/auth/admin/me")
        .set("Authorization", `Bearer ${pair.accessToken}`);
      expect(dead.status).toBe(503);
      expect(dead.body.error).toBe("SERVICE_UNAVAILABLE");
      expect(dead.headers["retry-after"]).toBeDefined();
    });
  });
});
