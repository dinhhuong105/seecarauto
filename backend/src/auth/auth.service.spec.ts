import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuthException } from "./auth.errors";
import { AuthService } from "./auth.service";
import {
  isAmbiguousDbError,
  isIdleTimeoutError,
  isLockTimeoutError,
  isTransactionTimeoutError,
} from "./auth.service";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { RateLimitService } from "../redis/rate-limit.service";
import type { RedisService } from "../redis/redis.service";

// Unit tests for AuthService login/lockout/replay branching (M02-05 §7).
// Prisma/Redis are mocked at the service boundary; the business logic
// (lockout counting, audit-in-transaction, replay vs retry) is real.
// The same paths are covered against real PostgreSQL/Redis in the e2e suite.

const ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");

class FakeRedis {
  readonly store = new Map<string, string>();
  getClient() {
    const store = this.store;
    return {
      async set(key: string, value: string): Promise<string> {
        store.set(key, value);
        return "OK";
      },
      async get(key: string): Promise<string | null> {
        return store.get(key) ?? null;
      },
      async eval(): Promise<number> {
        return 1;
      },
    };
  }
  async withTimeout<T>(promise: Promise<T>): Promise<T> {
    return promise;
  }
  getConfig() {
    return { commandTimeoutMs: 1000 };
  }
}

interface FakeUser {
  id: string;
  username: string;
  passwordHash: string;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  userRoles: { role: { id: string; name: string } }[];
}

interface FakeSession {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedReason: string | null;
  replacedBySessionId: string | null;
}

function makePrisma(users: FakeUser[], sessions: FakeSession[]) {
  const auditRows: Record<string, unknown>[] = [];
  const createdSessions: Record<string, unknown>[] = [];
  const byId = new Map(users.map((u) => [u.id, u]));
  const byUsername = new Map(users.map((u) => [u.username, u]));
  const byHash = new Map(sessions.map((s) => [s.tokenHash, s]));

  const tx = {
    user: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        byId.get(where.id) ?? null,
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const user = byId.get(where.id);
        if (!user) throw new Error("user not found");
        const inc = (
          data.failedLoginAttempts as { increment?: number } | undefined
        )?.increment;
        if (typeof inc === "number") {
          user.failedLoginAttempts += inc;
        } else if (typeof data.failedLoginAttempts === "number") {
          user.failedLoginAttempts = data.failedLoginAttempts;
        }
        if ("lockedUntil" in data) {
          user.lockedUntil = (data.lockedUntil as Date | null) ?? null;
        }
        return user;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const user = byId.get(where.id);
        if (!user) return { count: 0 };
        const lockIsNull = user.lockedUntil === null;
        const lockExpired =
          user.lockedUntil !== null && user.lockedUntil <= new Date();
        if (!lockIsNull && !lockExpired) return { count: 0 };
        if ("lockedUntil" in data) {
          user.lockedUntil = data.lockedUntil as Date;
        }
        return { count: 1 };
      },
    },
    auditLog: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        auditRows.push(data);
        return data;
      },
    },
    adminRefreshSession: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createdSessions.push(data);
        return data;
      },
    },
    $executeRaw: async () => 2,
  };

  const prisma = {
    user: {
      findUnique: async ({
        where,
      }: {
        where: { username?: string; id?: string };
      }) =>
        (where.username !== undefined
          ? byUsername.get(where.username)
          : byId.get(where.id ?? "")) ?? null,
    },
    adminRefreshSession: {
      findUnique: async ({ where }: { where: { tokenHash: string } }) =>
        byHash.get(where.tokenHash) ?? null,
    },
    authRefreshOperation: {
      findUnique: async () => null,
    },
    userRole: {
      findMany: async () => [],
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(tx),
    __auditRows: auditRows,
    __createdSessions: createdSessions,
  };
  return prisma;
}

function makeService(prisma: unknown) {
  const config = new ConfigService({
    JWT_SECRET: "access-secret-".padEnd(32, "a"),
    JWT_REFRESH_SECRET: "refresh-secret".padEnd(32, "b"),
    JWT_EXPIRES_IN: "15m",
    JWT_REFRESH_EXPIRES_IN: "7d",
    REFRESH_IDEMPOTENCY_ENCRYPTION_KEY: ENCRYPTION_KEY,
    AUTH_LOCKOUT_THRESHOLD: "3",
    AUTH_LOCKOUT_SECONDS: "2",
  });
  const password = new PasswordService();
  const tokens = new TokenService(
    new JwtService({}),
    new FakeRedis() as unknown as RedisService,
    config,
  );
  const rateLimit = {
    check: async () => ({
      allowed: true,
      limit: 5,
      remaining: 4,
      resetAt: Math.floor(Date.now() / 1000) + 60,
      fallback: "redis" as const,
    }),
  } as unknown as RateLimitService;
  const redis = new FakeRedis() as unknown as RedisService;
  const service = new AuthService(
    prisma as unknown as PrismaService,
    password,
    tokens,
    rateLimit,
    redis,
    config,
  );
  return { service, password, tokens };
}

describe("AuthService error classification (FIX-25/FIX-26/FIX-28)", () => {
  it("detects PostgreSQL lock timeouts", () => {
    expect(
      isLockTimeoutError(new Error("canceling statement due to lock timeout")),
    ).toBe(true);
    expect(isLockTimeoutError(new Error("connection reset"))).toBe(false);
  });

  it("detects Prisma transaction timeouts", () => {
    expect(
      isTransactionTimeoutError(
        Object.assign(new Error("Transaction timed out"), {
          code: "P2028",
        }),
      ),
    ).toBe(true);
    expect(
      isTransactionTimeoutError(
        new Error("Transaction already closed: timeout"),
      ),
    ).toBe(true);
    expect(isTransactionTimeoutError(new Error("lock timeout"))).toBe(false);
  });

  it("detects idle-in-transaction timeouts (and does not misclassify them as transaction timeouts)", () => {
    const idle = new Error(
      "terminating connection due to idle-in-transaction timeout",
    );
    expect(isIdleTimeoutError(idle)).toBe(true);
    expect(isTransactionTimeoutError(idle)).toBe(false);
    expect(isIdleTimeoutError(new Error("lock timeout"))).toBe(false);
  });

  it("detects ambiguous (connection-level) DB errors", () => {
    expect(isAmbiguousDbError(new Error("Connection terminated"))).toBe(true);
    expect(isAmbiguousDbError(new Error("ECONNRESET"))).toBe(true);
    expect(isAmbiguousDbError(new Error("socket hang up"))).toBe(true);
    // Lock/timeout errors are classified first and are NOT ambiguous.
    expect(isAmbiguousDbError(new Error("lock timeout"))).toBe(false);
  });
});

describe("AuthService login (unit)", () => {
  it("unknown username -> 401 INVALID_CREDENTIALS (dummy verify runs)", async () => {
    const { service } = makeService(makePrisma([], []));
    await expect(
      service.login("ghost", "whatever-password", "127.0.0.1"),
    ).rejects.toMatchObject({
      response: { statusCode: 401, error: "INVALID_CREDENTIALS" },
    });
  });

  it("locked account -> 423 ACCOUNT_LOCKED with retryAfter", async () => {
    const password = new PasswordService();
    const hash = await password.hash("secret-password");
    const user: FakeUser = {
      id: "user-1",
      username: "admin",
      passwordHash: hash,
      isActive: true,
      failedLoginAttempts: 3,
      lockedUntil: new Date(Date.now() + 120_000),
      userRoles: [],
    };
    const { service } = makeService(makePrisma([user], []));
    try {
      await service.login("admin", "secret-password", "127.0.0.1");
      fail("expected 423");
    } catch (error) {
      expect(error).toBeInstanceOf(AuthException);
      expect((error as AuthException).getResponse()).toMatchObject({
        statusCode: 423,
        error: "ACCOUNT_LOCKED",
      });
      expect((error as AuthException).getResponse()).toHaveProperty(
        "retryAfter",
      );
    }
  });

  it("wrong password counts failures and locks at the threshold with an audit row", async () => {
    const password = new PasswordService();
    const hash = await password.hash("secret-password");
    const user: FakeUser = {
      id: "user-1",
      username: "admin",
      passwordHash: hash,
      isActive: true,
      failedLoginAttempts: 2,
      lockedUntil: null,
      userRoles: [],
    };
    const prisma = makePrisma([user], []);
    const { service } = makeService(prisma);
    try {
      await service.login("admin", "wrong-password", "127.0.0.1");
      fail("expected 423");
    } catch (error) {
      expect((error as AuthException).getResponse()).toMatchObject({
        statusCode: 423,
        error: "ACCOUNT_LOCKED",
      });
    }
    expect(user.failedLoginAttempts).toBe(3);
    expect(user.lockedUntil).not.toBeNull();
    expect(prisma.__auditRows).toHaveLength(1);
    expect(prisma.__auditRows[0]).toMatchObject({
      actorId: "user-1",
      action: "admin.locked",
      entityId: "user-1",
    });
  });

  it("successful login resets counters and creates one session", async () => {
    const password = new PasswordService();
    const hash = await password.hash("secret-password");
    const user: FakeUser = {
      id: "user-1",
      username: "admin",
      passwordHash: hash,
      isActive: true,
      failedLoginAttempts: 2,
      lockedUntil: null,
      userRoles: [{ role: { id: "role-1", name: "Admin" } }],
    };
    const prisma = makePrisma([user], []);
    const { service, tokens } = makeService(prisma);
    const result = await service.login("admin", "secret-password", "127.0.0.1");
    expect(result.tokenType).toBe("Bearer");
    expect(result.expiresIn).toBe(900);
    expect(result.admin).toEqual({
      id: "user-1",
      username: "admin",
      roles: [{ id: "role-1", name: "Admin" }],
    });
    expect(user.failedLoginAttempts).toBe(0);
    expect(prisma.__createdSessions).toHaveLength(1);
    const created = prisma.__createdSessions[0] as {
      tokenHash: string;
      userId: string;
    };
    expect(created.userId).toBe("user-1");
    expect(created.tokenHash).toBe(tokens.hashToken(result.refreshToken));
    const access = tokens.verifyAccessToken(result.accessToken);
    expect(access.sub).toBe("user-1");
    expect(access.type).toBe("access");
  });

  it("inactive account -> 401 INVALID_CREDENTIALS even with the right password", async () => {
    const password = new PasswordService();
    const hash = await password.hash("secret-password");
    const user: FakeUser = {
      id: "user-1",
      username: "admin",
      passwordHash: hash,
      isActive: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
      userRoles: [],
    };
    const { service } = makeService(makePrisma([user], []));
    await expect(
      service.login("admin", "secret-password", "127.0.0.1"),
    ).rejects.toMatchObject({
      response: { statusCode: 401, error: "INVALID_CREDENTIALS" },
    });
  });
});

describe("AuthService refresh (unit)", () => {
  it("missing Idempotency-Key -> 400 VALIDATION_ERROR with field detail", async () => {
    const { service, tokens } = makeService(makePrisma([], []));
    const refresh = tokens.signRefreshToken("user-1", "session-1");
    await expect(
      service.refresh(refresh, undefined, "127.0.0.1"),
    ).rejects.toMatchObject({
      response: {
        statusCode: 400,
        error: "VALIDATION_ERROR",
        details: [
          {
            field: "Idempotency-Key",
            code: "REQUIRED",
            message: "Thiếu header Idempotency-Key.",
          },
        ],
      },
    });
  });

  it("malformed Idempotency-Key -> 400 VALIDATION_ERROR", async () => {
    const { service, tokens } = makeService(makePrisma([], []));
    const refresh = tokens.signRefreshToken("user-1", "session-1");
    await expect(
      service.refresh(refresh, "not-a-uuid", "127.0.0.1"),
    ).rejects.toMatchObject({
      response: { statusCode: 400, error: "VALIDATION_ERROR" },
    });
  });

  it("replay with a different key (ROTATED, no COMPLETED operation) -> revoke-all + 401 TOKEN_REUSE_DETECTED", async () => {
    const { service, tokens } = makeService(makePrisma([], []));
    const refresh = tokens.signRefreshToken("user-1", "session-old");
    const tokenHash = tokens.hashToken(refresh);
    const prisma = makePrisma(
      [],
      [
        {
          id: "session-old",
          userId: "user-1",
          tokenHash,
          expiresAt: new Date(Date.now() + 3600_000),
          revokedAt: new Date(),
          revokedReason: "ROTATED",
          replacedBySessionId: "session-new",
        },
      ],
    );
    const { service: service2 } = makeService(prisma);
    void service;
    await expect(
      service2.refresh(
        refresh,
        "11111111-1111-4111-8111-111111111111",
        "127.0.0.1",
      ),
    ).rejects.toMatchObject({
      response: { statusCode: 401, error: "TOKEN_REUSE_DETECTED" },
    });
    expect(prisma.__auditRows).toHaveLength(1);
    expect(prisma.__auditRows[0]).toMatchObject({
      action: "auth.refresh_reuse_detected",
      entityId: "user-1",
    });
  });
});
