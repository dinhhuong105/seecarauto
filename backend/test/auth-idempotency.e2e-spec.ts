import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import * as net from "node:net";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/app-setup";
import { AuthService } from "../src/auth/auth.service";
import { PasswordService } from "../src/auth/password.service";
import { TokenService } from "../src/auth/token.service";
import { PrismaService } from "../src/prisma/prisma.service";
import {
  RedisService,
  RedisUnavailableError,
} from "../src/redis/redis.service";

// M02-05 Stage 2 Phase 3 — AC-17 idempotency evidence (E1–E7).
// Real PostgreSQL (seecarauto_test) + real test Redis (127.0.0.1:6399, DB 3).
// This spec holds the evidence the Phase 2 suite does NOT already prove:
// controlled-ordering contention with recorded wait times (E2), the DB
// operation CAS (E1), the Prisma total-transaction timeout with elapsed
// time + same-key retry (E3), the strengthened leader-COMMIT-after-
// follower-503 case (E4), the real lost-COMMIT-ack fault injection via a
// PostgreSQL wire proxy (E6), and the Redis error/ownership matrix
// (E7: malformed envelope, Redis loss, lost write ACK, cleanup).
// Tests already proven by backend/test/auth.e2e-spec.ts are NOT duplicated
// here (concurrent same-key Promise.all, TTL expiry -> 503, leader idle
// with/without follower, FIX-28 resolveAmbiguousCommit direct cases,
// FIX-19 leader/follower with Redis down, Lua CAS unit matrix).
// The app is created once per file (beforeAll); DB tables + Redis are wiped
// in beforeEach, so every test starts from a clean slate.
jest.setTimeout(60_000);

const PASSWORD = "correct horse battery staple";
const PROXY_LISTEN_PORT = 55432;

let userCounter = 0;
const freshUsername = () =>
  `e2e-idem-${++userCounter}-${randomUUID().slice(0, 8)}`;
const freshKey = () => randomUUID();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Minimal PostgreSQL wire proxy (test-only fault injection for E6).
 * Forwards bytes between one client and PostgreSQL; when armed, the first
 * client->server message containing the ASCII word COMMIT is forwarded to
 * the server and then the client socket is destroyed WITHOUT forwarding
 * the server's response — so the server commits but the client never
 * receives the COMMIT acknowledgement (lost COMMIT ack, FIX-26/FIX-28).
 * Only the client->server direction is parsed (framed messages); the
 * server->client direction is a raw pipe.
 */
export class PgCommitDropProxy {
  private server: net.Server | null = null;
  private readonly sockets = new Set<net.Socket>();
  private armed = false;
  private dropped = false;

  constructor(
    private readonly targetPort: number,
    private readonly listenPort: number,
  ) {}

  async start(): Promise<void> {
    this.server = net.createServer((client) => this.handleClient(client));
    await new Promise<void>((resolve, reject) => {
      this.server!.once("error", reject);
      this.server!.listen(this.listenPort, "127.0.0.1", () => resolve());
    });
  }

  async stop(): Promise<void> {
    for (const socket of this.sockets) socket.destroy();
    this.sockets.clear();
    if (this.server !== null) {
      await new Promise<void>((resolve) => this.server!.close(() => resolve()));
      this.server = null;
    }
  }

  arm(): void {
    this.armed = true;
    this.dropped = false;
  }

  disarm(): void {
    this.armed = false;
  }

  get wasDropped(): boolean {
    return this.dropped;
  }

  private handleClient(client: net.Socket): void {
    const upstream = net.connect(this.targetPort, "127.0.0.1");
    this.sockets.add(client);
    this.sockets.add(upstream);
    client.on("close", () => this.sockets.delete(client));
    upstream.on("close", () => this.sockets.delete(upstream));
    client.on("error", () => undefined);
    upstream.on("error", () => undefined);
    // Server -> client: raw pipe. After a drop, the client is destroyed,
    // so the (already committed) response is simply not forwarded.
    // `connectionDropped` is per-connection: other pool connections must
    // keep working after one connection is dropped.
    // TLS: this PostgreSQL has ssl=on, so the engine negotiates TLS
    // (SSLRequest -> 'S' -> TLS handshake). Once the server answers 'S',
    // the connection is an opaque TLS tunnel — frame parsing must stop
    // and both directions forward raw bytes.
    let connectionDropped = false;
    let tls = false;
    let awaitingSslResponse = false;
    upstream.on("data", (chunk: Buffer) => {
      if (awaitingSslResponse) {
        awaitingSslResponse = false;
        if (chunk[0] === 0x53) tls = true; // 'S': TLS follows
      }
      if (!client.destroyed) client.write(chunk);
      // Once the server has answered the dropped COMMIT, the upstream
      // socket is no longer needed — close it so the proxy is tidy.
      if (connectionDropped) upstream.destroy();
    });
    // Client -> server: framed parse so the COMMIT message can be found.
    let buffer = Buffer.alloc(0);
    let firstMessage = true;
    let dead = false;
    client.on("data", (chunk: Buffer) => {
      if (dead) return;
      // Inside a TLS tunnel the bytes are opaque — forward raw.
      if (tls) {
        upstream.write(chunk);
        return;
      }
      buffer = Buffer.concat([buffer, chunk]);
      for (;;) {
        if (firstMessage) {
          // StartupMessage (or SSLRequest): 4-byte length, no type byte.
          if (buffer.length < 4) return;
          const len = buffer.readInt32BE(0);
          if (buffer.length < len) return;
          const message = buffer.subarray(0, len);
          buffer = buffer.subarray(len);
          // An SSLRequest (length 8, code 80877103) — or GSSENCRequest
          // (80877104) — is not the startup message; the real
          // StartupMessage still follows, and the server's one-byte
          // answer decides whether TLS follows.
          const requestCode = len === 8 ? message.readInt32BE(4) : 0;
          const isNegotiationRequest =
            requestCode === 80877103 || requestCode === 80877104;
          if (isNegotiationRequest) awaitingSslResponse = true;
          if (!isNegotiationRequest) firstMessage = false;
          upstream.write(message);
        } else {
          if (buffer.length < 5) return;
          const len = buffer.readInt32BE(1);
          const total = 1 + len;
          if (buffer.length < total) return;
          const message = buffer.subarray(0, total);
          buffer = buffer.subarray(total);
          if (this.shouldDrop(message)) {
            dead = true;
            connectionDropped = true;
            this.dropAfterForward(upstream, message, client);
            return;
          }
          upstream.write(message);
        }
      }
    });
  }

  private shouldDrop(message: Buffer): boolean {
    return this.armed && message.includes(Buffer.from("COMMIT", "ascii"));
  }

  private dropAfterForward(
    upstream: net.Socket,
    message: Buffer,
    client: net.Socket,
  ): void {
    this.dropped = true;
    this.armed = false;
    upstream.write(message);
    // The COMMIT bytes are already queued to the server — it will process
    // and commit them. Destroying the client socket only loses the ack.
    client.destroy();
  }
}

describe("Auth idempotency (e2e) — Phase 3 E1–E7", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let authService: AuthService;
  let tokens: TokenService;
  let jwtService: JwtService;
  let passwords: PasswordService;

  beforeAll(async () => {
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

  // ------------------------------------------------------------ helpers

  async function createUser(username: string, password = PASSWORD) {
    const passwordHash = await passwords.hash(password);
    return prisma.user.create({ data: { username, passwordHash } });
  }

  function loginReq(username: string, password: string) {
    return request(app.getHttpServer())
      .post("/api/v1/auth/admin/login")
      .send({ username, password });
  }

  async function loginOk(username: string, password = PASSWORD) {
    const res = await loginReq(username, password);
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

  async function sessionCount(userId: string): Promise<number> {
    return prisma.adminRefreshSession.count({ where: { userId } });
  }

  async function operationCount(
    tokenHash: string,
    key: string,
  ): Promise<number> {
    return prisma.authRefreshOperation.count({
      where: { tokenHash, idempotencyKey: key },
    });
  }

  /** The old session row, after a rotation: must be ROTATED exactly once. */
  async function assertOldRotatedOnce(
    oldHash: string,
    newRefreshToken: string,
  ): Promise<void> {
    const newSid = (jwtService.decode(newRefreshToken) as { sid: string }).sid;
    const oldSession = await prisma.adminRefreshSession.findUnique({
      where: { tokenHash: oldHash },
    });
    expect(oldSession?.revokedReason).toBe("ROTATED");
    expect(oldSession?.replacedBySessionId).toBe(newSid);
    const newSession = await prisma.adminRefreshSession.findUnique({
      where: { id: newSid },
    });
    expect(newSession).not.toBeNull();
    expect(newSession?.revokedAt).toBeNull();
    expect(newSession?.tokenHash).toBe(tokens.hashToken(newRefreshToken));
  }

  // ------------------------------------------------------------ E2 (FIX-21)

  it("E2: controlled contention — leader held open ~3s, follower waits, then reads the same stored response (one rotation)", async () => {
    const username = freshUsername();
    const user = await createUser(username);
    const pair = await loginOk(username);
    const key = freshKey();
    const oldHash = tokens.hashToken(pair.refreshToken);
    const hooks = {
      onClaimed: async (tx: Prisma.TransactionClient) => {
        // Hold the leader transaction open with keep-alive statements
        // (~3s, no idle gap > 5s) so the follower's INSERT must wait.
        const started = Date.now();
        while (Date.now() - started < 3000) {
          await tx.$executeRaw`SELECT 1`;
          await sleep(500);
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
    const followerStarted = Date.now();
    const follower = await refreshReq(pair.refreshToken, key);
    const followerWaitMs = Date.now() - followerStarted;
    const leader = await leaderPromise;
    expect(follower.status).toBe(200);
    expect(follower.body.data.accessToken).toBe(leader.accessToken);
    expect(follower.body.data.refreshToken).toBe(leader.refreshToken);
    // The follower really waited for the leader (not a post-commit race):
    // the leader held the transaction ~3s and the follower started 0.5s
    // in, so it must have waited >= 1s and well under lock_timeout (5s).
    expect(followerWaitMs).toBeGreaterThanOrEqual(1000);
    expect(followerWaitMs).toBeLessThan(5000);
    expect(await sessionCount(user.id)).toBe(2); // exactly 1 new session
    await assertOldRotatedOnce(oldHash, leader.refreshToken);
    expect(await operationCount(oldHash, key)).toBe(1);
    const operation = await prisma.authRefreshOperation.findUnique({
      where: {
        tokenHash_idempotencyKey: { tokenHash: oldHash, idempotencyKey: key },
      },
    });
    expect(operation?.state).toBe("COMPLETED");
    console.log(
      `[E2] follower waited ${followerWaitMs}ms for the leader; ` +
        `1 new session, 1 COMPLETED operation, same response for both`,
    );
  }, 30_000);

  it("E2: leader rolls back by design while a follower waits — the follower becomes the new leader (200), exactly 1 new session", async () => {
    const username = freshUsername();
    const user = await createUser(username);
    const pair = await loginOk(username);
    const key = freshKey();
    const oldHash = tokens.hashToken(pair.refreshToken);
    const hooks = {
      onClaimed: async (tx: Prisma.TransactionClient) => {
        // Revoke the old session INSIDE the leader transaction, then hold
        // it open ~3s so the follower's INSERT waits on the unique index.
        // The revoke vanishes with the rollback — the follower then sees
        // an ACTIVE session and rotates it in its own transaction.
        await tx.$executeRaw`
          UPDATE admin_refresh_sessions
          SET revoked_at = now(), revoked_reason = 'LOGOUT'
          WHERE token_hash = ${oldHash}`;
        const started = Date.now();
        while (Date.now() - started < 3000) {
          await tx.$executeRaw`SELECT 1`;
          await sleep(500);
        }
      },
    };
    const leaderPromise = authService.refresh(
      pair.refreshToken,
      key,
      "127.0.0.1",
      hooks,
    );
    // Attach the outcome handler NOW: the leader rejects while the
    // follower request is still in flight, and a rejection with no
    // handler attached yet is an unhandled rejection (fails the test).
    const leaderSettled = leaderPromise.then(
      () => ({ ok: true as const }),
      (error: unknown) => ({ ok: false as const, error }),
    );
    await sleep(500); // the leader has claimed by now
    const followerStarted = Date.now();
    const follower = await refreshReq(pair.refreshToken, key);
    const followerWaitMs = Date.now() - followerStarted;
    // The leader's rollback had no business cause the re-read can name
    // (the revoke vanished with it), so it fails closed — no token.
    const leaderResult = await leaderSettled;
    expect(leaderResult.ok).toBe(false);
    if (!leaderResult.ok) {
      expect(
        (leaderResult.error as { getResponse: () => unknown }).getResponse(),
      ).toMatchObject({ statusCode: 503, error: "SERVICE_UNAVAILABLE" });
    }
    expect(follower.status).toBe(200);
    expect(follower.body.data.refreshToken).not.toBe(pair.refreshToken);
    expect(followerWaitMs).toBeGreaterThanOrEqual(1000);
    expect(followerWaitMs).toBeLessThan(5000);
    expect(await sessionCount(user.id)).toBe(2); // exactly 1 new session
    await assertOldRotatedOnce(oldHash, follower.body.data.refreshToken);
    expect(await operationCount(oldHash, key)).toBe(1);
    console.log(
      `[E2-rollback] follower waited ${followerWaitMs}ms, became leader ` +
        `(200); leader 503; 1 new session, 1 COMPLETED operation`,
    );
  }, 30_000);

  // ------------------------------------------------------------ E1 (FIX-21)

  it("E1: the operation UPDATE is a real DB CAS — wrong owner -> 0 rows, right owner + PENDING -> 1 row, repeat -> 0 rows", async () => {
    const tokenHash = "d".repeat(64);
    const key = freshKey();
    const ownerId = randomUUID();
    await prisma.authRefreshOperation.create({
      data: {
        tokenHash,
        idempotencyKey: key,
        ownerId,
        state: "PENDING",
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });
    const update = (owner: string) =>
      prisma.$executeRaw`
        UPDATE auth_refresh_operations
        SET state = 'COMPLETED'
        WHERE token_hash = ${tokenHash}
          AND idempotency_key = ${key}
          AND owner_id = ${owner}::uuid
          AND state = 'PENDING'`;
    expect(await update(randomUUID())).toBe(0); // wrong owner
    expect(await update(ownerId)).toBe(1); // right owner + PENDING
    expect(await update(ownerId)).toBe(0); // now COMPLETED, not PENDING
    const operation = await prisma.authRefreshOperation.findUnique({
      where: { tokenHash_idempotencyKey: { tokenHash, idempotencyKey: key } },
    });
    expect(operation?.state).toBe("COMPLETED");
  });

  it("E1: retrying the same key after a business abort claims fresh and rotates normally (no second rotation from the aborted attempt)", async () => {
    const username = freshUsername();
    const user = await createUser(username);
    const pair = await loginOk(username);
    const key = freshKey();
    const oldHash = tokens.hashToken(pair.refreshToken);
    // The abort cause must vanish WITH the rollback, or the session stays
    // revoked and no retry can ever succeed: revoke INSIDE the leader
    // transaction (not from a separate connection — that revoke would
    // commit and the retry would correctly answer 401 INVALID_REFRESH_TOKEN).
    const hooks = {
      onClaimed: async (tx: Prisma.TransactionClient) => {
        await tx.$executeRaw`
          UPDATE admin_refresh_sessions
          SET revoked_at = now(), revoked_reason = 'LOGOUT'
          WHERE token_hash = ${oldHash}`;
      },
    };
    let caught: unknown;
    try {
      await authService.refresh(pair.refreshToken, key, "127.0.0.1", hooks);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeDefined();
    // The revoke vanished with the rollback, so the re-read sees an ACTIVE
    // session with no business cause to name — fail closed (503).
    expect(
      (caught as { getResponse: () => unknown }).getResponse(),
    ).toMatchObject({ statusCode: 503, error: "SERVICE_UNAVAILABLE" });
    expect(await sessionCount(user.id)).toBe(1); // no new session
    expect(await operationCount(oldHash, key)).toBe(0); // row vanished
    // Same key retries as a fresh claim and rotates normally.
    const retry = await refreshReq(pair.refreshToken, key);
    expect(retry.status).toBe(200);
    expect(retry.body.data.refreshToken).not.toBe(pair.refreshToken);
    expect(await sessionCount(user.id)).toBe(2); // exactly 1 new session
    await assertOldRotatedOnce(oldHash, retry.body.data.refreshToken);
    expect(await operationCount(oldHash, key)).toBe(1);
  });

  // ------------------------------------------------------------ E3 (FIX-25)

  it("E3: the Prisma total-transaction timeout (10s) rolls back the WHOLE transaction — elapsed ~10s, 0 new sessions, same-key retry succeeds", async () => {
    const username = freshUsername();
    const user = await createUser(username);
    const pair = await loginOk(username);
    const key = freshKey();
    const oldHash = tokens.hashToken(pair.refreshToken);
    const hooks = {
      onClaimed: async (tx: Prisma.TransactionClient) => {
        // Keep-alive statements (no idle gap) for ~11s. Every single
        // statement runs in milliseconds — far under statement_timeout
        // (10s per statement) — so only the Prisma total timeout (10s)
        // can fire. This proves statement_timeout is NOT a total bound.
        const started = Date.now();
        while (Date.now() - started < 11_000) {
          await tx.$executeRaw`SELECT 1`;
          await sleep(1000);
        }
      },
    };
    const started = Date.now();
    let caught: unknown;
    try {
      await authService.refresh(pair.refreshToken, key, "127.0.0.1", hooks);
    } catch (error) {
      caught = error;
    }
    const elapsedMs = Date.now() - started;
    expect(caught).toBeDefined();
    expect(
      (caught as { getResponse: () => unknown }).getResponse(),
    ).toMatchObject({ statusCode: 503, error: "SERVICE_UNAVAILABLE" });
    // The failure happened at the 10s total bound, not earlier.
    expect(elapsedMs).toBeGreaterThanOrEqual(9500);
    expect(elapsedMs).toBeLessThan(15000);
    expect(await sessionCount(user.id)).toBe(1); // 0 new sessions
    const session = await prisma.adminRefreshSession.findUnique({
      where: { tokenHash: oldHash },
    });
    expect(session?.revokedAt).toBeNull(); // still ACTIVE
    expect(await operationCount(oldHash, key)).toBe(0); // row gone
    // Same-key retry claims fresh and rotates normally.
    const retry = await refreshReq(pair.refreshToken, key);
    expect(retry.status).toBe(200);
    expect(await sessionCount(user.id)).toBe(2);
    expect(await operationCount(oldHash, key)).toBe(1);
    console.log(
      `[E3] Prisma timeout fired after ${elapsedMs}ms; whole transaction ` +
        `rolled back (0 new sessions, operation row gone); same-key retry 200`,
    );
  }, 30_000);

  // ------------------------------------------------------------ E4 (FIX-30/31)

  it("E4: leader COMMITs in the (5s, 10s) window after the follower times out — follower 503 unchanged, exactly 1 new session, old ROTATED once", async () => {
    const username = freshUsername();
    const user = await createUser(username);
    const pair = await loginOk(username);
    const key = freshKey();
    const oldHash = tokens.hashToken(pair.refreshToken);
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
    const leaderStarted = Date.now();
    const leaderPromise = authService.refresh(
      pair.refreshToken,
      key,
      "127.0.0.1",
      hooks,
    );
    await sleep(500); // the leader has claimed by now
    const followerStarted = Date.now();
    const follower = await refreshReq(pair.refreshToken, key);
    const followerWaitMs = Date.now() - followerStarted;
    expect(follower.status).toBe(503);
    expect(follower.body.error).toBe("SERVICE_UNAVAILABLE");
    expect(follower.headers["retry-after"]).toBeDefined();
    expect(follower.body).not.toHaveProperty("data"); // no token
    // lock_timeout (5s) fired first: the follower waited ~5s, not ~6.5s.
    expect(followerWaitMs).toBeGreaterThanOrEqual(4500);
    expect(followerWaitMs).toBeLessThan(6500);
    const leader = await leaderPromise;
    const leaderElapsedMs = Date.now() - leaderStarted;
    expect(leader.accessToken).toBeDefined();
    expect(leader.refreshToken).toBeDefined();
    // The leader committed in the (5s, 10s) window.
    expect(leaderElapsedMs).toBeGreaterThan(5000);
    expect(leaderElapsedMs).toBeLessThan(10000);
    // The leader's COMMIT does not change the follower's 503 (already
    // recorded above) — never infer the leader state from the follower.
    expect(await sessionCount(user.id)).toBe(2); // exactly 1 new session
    await assertOldRotatedOnce(oldHash, leader.refreshToken);
    expect(await operationCount(oldHash, key)).toBe(1);
    // The leader's new access token works.
    const me = await request(app.getHttpServer())
      .get("/api/v1/auth/admin/me")
      .set("Authorization", `Bearer ${leader.accessToken}`);
    expect(me.status).toBe(200);
    console.log(
      `[E4] follower 503 after ${followerWaitMs}ms; leader committed at ` +
        `${leaderElapsedMs}ms; 1 new session, old ROTATED once`,
    );
  }, 30_000);

  // ------------------------------------------------------------ E6 (FIX-26/28)

  it("E6: lost COMMIT acknowledgement — the server commits, the client never sees the ack, and the held pair is still returned (200)", async () => {
    // A second app instance whose PostgreSQL traffic goes through the
    // wire proxy below. It shares the test database and JWT secrets, so
    // the tokens it issues verify against the same DB rows.
    const proxy = new PgCommitDropProxy(5432, PROXY_LISTEN_PORT);
    let proxyPrisma: PrismaService | null = null;
    let proxyApp: INestApplication | null = null;
    try {
      // Everything that can throw lives inside the try, so the proxy is
      // always stopped — a failed $connect must not leave a listener
      // holding the port for the next run.
      await proxy.start();
      // The proxy binds 127.0.0.1 only, so the host must be 127.0.0.1 too:
      // `localhost` may resolve to ::1 first and never reach the proxy.
      const proxyUrl = process.env.DATABASE_URL!.replace(
        /@(localhost|127\.0\.0\.1):5432\//,
        `@127.0.0.1:${PROXY_LISTEN_PORT}/`,
      );
      // Fail loud if the port was not actually rewritten (a silent no-op
      // would route the proxy app straight to PostgreSQL, bypassing the
      // fault injection entirely).
      expect(proxyUrl).toContain(`:${PROXY_LISTEN_PORT}/`);
      expect(proxyUrl).not.toBe(process.env.DATABASE_URL);
      // This PostgreSQL has ssl=on, so the engine would negotiate TLS and
      // the COMMIT would travel inside the encrypted tunnel, invisible
      // to the proxy. Plaintext is allowed (verified), so force it: the
      // proxy can only drop a COMMIT it can see.
      const plainUrl = proxyUrl.includes("?")
        ? `${proxyUrl}&sslmode=disable`
        : `${proxyUrl}?sslmode=disable`;
      proxyPrisma = new PrismaService({
        datasources: { db: { url: plainUrl } },
      });
      await proxyPrisma.$connect();
      const proxyPasswords = new PasswordService();
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(PrismaService)
        .useValue(proxyPrisma)
        .compile();
      proxyApp = moduleFixture.createNestApplication();
      configureApp(proxyApp);
      proxyApp.getHttpAdapter().getInstance().set("trust proxy", true);
      await proxyApp.init();

      const username = freshUsername();
      const passwordHash = await proxyPasswords.hash(PASSWORD);
      const user = await proxyPrisma.user.create({
        data: { username, passwordHash },
      });
      const login = await request(proxyApp.getHttpServer())
        .post("/api/v1/auth/admin/login")
        .send({ username, password: PASSWORD });
      expect(login.status).toBe(200);
      const pair = login.body.data as {
        accessToken: string;
        refreshToken: string;
      };
      const key = freshKey();
      const oldHash = tokens.hashToken(pair.refreshToken);

      // Arm the fault: drop the client connection right after the next
      // COMMIT is forwarded, so the COMMIT ack is lost (FIX-26). The
      // refresh request must still answer 200 with the held pair.
      proxy.arm();
      const res = await request(proxyApp.getHttpServer())
        .post("/api/v1/auth/admin/refresh")
        .set("Idempotency-Key", key)
        .send({ refreshToken: pair.refreshToken });
      expect(proxy.wasDropped).toBe(true); // the fault really fired
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).not.toBe(pair.refreshToken);
      // The returned pair is the HELD pair: its sid is the new session
      // the (committed) transaction created — no second rotation.
      await assertOldRotatedOnce(oldHash, res.body.data.refreshToken);
      expect(await sessionCount(user.id)).toBe(2); // exactly 1 new session
      expect(await operationCount(oldHash, key)).toBe(1);
      const operation = await prisma.authRefreshOperation.findUnique({
        where: {
          tokenHash_idempotencyKey: { tokenHash: oldHash, idempotencyKey: key },
        },
      });
      expect(operation?.state).toBe("COMPLETED");
      // A same-key retry now hits the follower path — but the envelope was
      // never written: resolveAmbiguousCommit returns the held pair
      // WITHOUT going through deliverLeaderResponse, so there is no
      // stored response to recover. Per FIX-12 that is 503 (response
      // issued but unrecoverable), NOT a replay and NOT a new rotation.
      const retry = await request(proxyApp.getHttpServer())
        .post("/api/v1/auth/admin/refresh")
        .set("Idempotency-Key", key)
        .send({ refreshToken: pair.refreshToken });
      expect(retry.status).toBe(503);
      expect(retry.body.error).toBe("SERVICE_UNAVAILABLE");
      expect(retry.body).not.toHaveProperty("data");
      expect(await sessionCount(user.id)).toBe(2); // still 1 new session
      const sessions = await prisma.adminRefreshSession.findMany({
        where: { userId: user.id },
      });
      expect(
        sessions.filter((s) => s.revokedReason === "REUSE_DETECTED"),
      ).toHaveLength(0); // not AC-05
    } finally {
      proxy.disarm();
      if (proxyApp !== null) await proxyApp.close();
      if (proxyPrisma !== null) {
        await proxyPrisma.$disconnect().catch(() => undefined);
      }
      await proxy.stop();
    }
  }, 60_000);

  // ------------------------------------------------------------ E7 (FIX-16/17/19/22)

  it("E7: malformed envelope — tampered sid, malformed JSON, corrupted ciphertext all -> 503, never a new request", async () => {
    const variants: Array<{
      name: string;
      tamper: (envelopeJson: string) => string;
    }> = [
      {
        name: "tampered sid (AAD mismatch)",
        tamper: (envelopeJson) => {
          const envelope = JSON.parse(envelopeJson) as Record<string, unknown>;
          envelope.sid = randomUUID();
          return JSON.stringify(envelope);
        },
      },
      {
        name: "malformed JSON",
        tamper: () => "not-json{{{",
      },
      {
        name: "corrupted ciphertext (auth tag mismatch)",
        tamper: (envelopeJson) => {
          const envelope = JSON.parse(envelopeJson) as Record<string, unknown>;
          const chars = String(envelope.ciphertext).split("");
          chars[10] = chars[10] === "A" ? "B" : "A";
          envelope.ciphertext = chars.join("");
          return JSON.stringify(envelope);
        },
      },
    ];
    for (const variant of variants) {
      const username = freshUsername();
      const user = await createUser(username);
      const pair = await loginOk(username);
      const key = freshKey();
      const first = await refreshReq(pair.refreshToken, key);
      expect(first.status).toBe(200);
      const oldHash = tokens.hashToken(pair.refreshToken);
      const envelopeKey = tokens.envelopeKeyFor(oldHash, key);
      const stored = await redis.getClient().get(envelopeKey);
      expect(stored).not.toBeNull();
      await redis.getClient().set(envelopeKey, variant.tamper(stored!));
      const retry = await refreshReq(pair.refreshToken, key);
      expect(retry.status).toBe(503);
      expect(retry.body.error).toBe("SERVICE_UNAVAILABLE");
      expect(retry.body).not.toHaveProperty("data");
      expect(await sessionCount(user.id)).toBe(2); // no new session
      const operation = await prisma.authRefreshOperation.findUnique({
        where: {
          tokenHash_idempotencyKey: { tokenHash: oldHash, idempotencyKey: key },
        },
      });
      expect(operation?.state).toBe("COMPLETED"); // still the same operation
      const sessions = await prisma.adminRefreshSession.findMany({
        where: { userId: user.id },
      });
      expect(
        sessions.filter((s) => s.revokedReason === "REUSE_DETECTED"),
      ).toHaveLength(0); // not a replay
    }
  });

  it("E7: Redis lost (FLUSHDB) while the operation is COMPLETED -> same key 503, not a replay", async () => {
    const username = freshUsername();
    const user = await createUser(username);
    const pair = await loginOk(username);
    const key = freshKey();
    const first = await refreshReq(pair.refreshToken, key);
    expect(first.status).toBe(200);
    const oldHash = tokens.hashToken(pair.refreshToken);
    await redis.getClient().flushdb(); // the envelope is gone, DB is not
    const retry = await refreshReq(pair.refreshToken, key);
    expect(retry.status).toBe(503);
    expect(retry.body.error).toBe("SERVICE_UNAVAILABLE");
    expect(retry.body).not.toHaveProperty("data");
    expect(await sessionCount(user.id)).toBe(2); // no new session
    const operation = await prisma.authRefreshOperation.findUnique({
      where: {
        tokenHash_idempotencyKey: { tokenHash: oldHash, idempotencyKey: key },
      },
    });
    expect(operation?.state).toBe("COMPLETED");
    const sessions = await prisma.adminRefreshSession.findMany({
      where: { userId: user.id },
    });
    expect(
      sessions.filter((s) => s.revokedReason === "REUSE_DETECTED"),
    ).toHaveLength(0); // not AC-05
  });

  it("E7: lost Redis write ACK — the leader re-reads, verifies its own envelope, and returns the stored response (200)", async () => {
    const username = freshUsername();
    const user = await createUser(username);
    const pair = await loginOk(username);
    const key = freshKey();
    const oldHash = tokens.hashToken(pair.refreshToken);
    // Fault injection at the service boundary (the DB transaction and the
    // Redis write underneath are real): the first envelope write really
    // happens, then its acknowledgement is lost. The leader must re-read
    // and verify before deciding — never claim success unverified.
    const original = tokens.completeEnvelope.bind(tokens);
    let calls = 0;
    tokens.completeEnvelope = (async (
      envelopeKey: string,
      ownerId: string,
      envelopeJson: string,
    ) => {
      calls += 1;
      if (calls === 1) {
        const written = await original(envelopeKey, ownerId, envelopeJson);
        expect(written).toBe(true); // the write really succeeded
        throw new RedisUnavailableError("simulated lost ACK after write");
      }
      return original(envelopeKey, ownerId, envelopeJson);
    }) as TokenService["completeEnvelope"];
    try {
      const res = await refreshReq(pair.refreshToken, key);
      expect(calls).toBe(1); // no blind retry of the write
      expect(res.status).toBe(200);
      expect(res.body.data.refreshToken).not.toBe(pair.refreshToken);
      await assertOldRotatedOnce(oldHash, res.body.data.refreshToken);
      expect(await sessionCount(user.id)).toBe(2);
      expect(await operationCount(oldHash, key)).toBe(1);
      const envelopeKey = tokens.envelopeKeyFor(oldHash, key);
      expect(await redis.getClient().get(envelopeKey)).not.toBeNull();
    } finally {
      tokens.completeEnvelope = original as TokenService["completeEnvelope"];
    }
  });

  it("E7: cleanup never deletes the Redis COMPLETED envelope", async () => {
    const username = freshUsername();
    const user = await createUser(username);
    const pair = await loginOk(username);
    const key = freshKey();
    const first = await refreshReq(pair.refreshToken, key);
    expect(first.status).toBe(200);
    const oldHash = tokens.hashToken(pair.refreshToken);
    const envelopeKey = tokens.envelopeKeyFor(oldHash, key);
    expect(await redis.getClient().get(envelopeKey)).not.toBeNull();
    expect(await authService.cleanupExpiredOperations()).toBe(0);
    // The envelope and the operation row both survive cleanup.
    expect(await redis.getClient().get(envelopeKey)).not.toBeNull();
    const operation = await prisma.authRefreshOperation.findUnique({
      where: {
        tokenHash_idempotencyKey: { tokenHash: oldHash, idempotencyKey: key },
      },
    });
    expect(operation?.state).toBe("COMPLETED");
    expect(await sessionCount(user.id)).toBe(2);
  });

  // ------------------------------------------------------------ FIX-38 (E7d)

  it("FIX-38: follower cannot read the operation row (Prisma read rejects) -> 503 fail-closed, no new session, no rotation, no replay conclusion", async () => {
    const username = freshUsername();
    const user = await createUser(username);
    const pair = await loginOk(username);
    const key = freshKey();
    const oldHash = tokens.hashToken(pair.refreshToken);
    const hooks = {
      onClaimed: async (tx: Prisma.TransactionClient) => {
        // Hold the leader transaction open (~3s, no idle gap > 5s) so the
        // follower's INSERT must wait on the unique index and only then
        // take the follower path into followCompletedOperation.
        const started = Date.now();
        while (Date.now() - started < 3000) {
          await tx.$executeRaw`SELECT 1`;
          await sleep(500);
        }
      },
    };
    // Fail the operation-row read inside followCompletedOperation only.
    // The leader's rotation uses raw SQL, so the first
    // authRefreshOperation.findUnique call in this test is the follower's
    // read inside followCompletedOperation.
    const spy = jest
      .spyOn(prisma.authRefreshOperation, "findUnique")
      .mockRejectedValueOnce(new Error("simulated DB read failure"));
    const leaderPromise = authService.refresh(
      pair.refreshToken,
      key,
      "127.0.0.1",
      hooks,
    );
    // Attach the outcome handler NOW so a leader rejection cannot become
    // an unhandled rejection while the follower request is in flight.
    const leaderSettled = leaderPromise.then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ ok: false as const, error }),
    );
    await sleep(500); // the leader has claimed by now
    let follower: request.Response;
    try {
      follower = await refreshReq(pair.refreshToken, key);
    } finally {
      spy.mockRestore();
    }
    const leaderResult = await leaderSettled;
    expect(leaderResult.ok).toBe(true);
    if (!leaderResult.ok) {
      throw leaderResult.error;
    }
    const leader = leaderResult.value;
    expect(follower.status).toBe(503);
    expect(follower.body.error).toBe("SERVICE_UNAVAILABLE");
    expect(follower.body.retryAfter).toBe(5);
    expect(follower.headers["retry-after"]).toBe("5");
    expect(follower.body).not.toHaveProperty("data");
    // The leader rotated exactly once; the follower created nothing and
    // rotated nothing more.
    expect(await sessionCount(user.id)).toBe(2);
    await assertOldRotatedOnce(oldHash, leader.refreshToken);
    expect(await operationCount(oldHash, key)).toBe(1);
    const operation = await prisma.authRefreshOperation.findUnique({
      where: {
        tokenHash_idempotencyKey: { tokenHash: oldHash, idempotencyKey: key },
      },
    });
    expect(operation?.state).toBe("COMPLETED");
    // No replay conclusion: no session revoked as REUSE_DETECTED, no
    // reuse audit event, no revoke-all side effect on the leader's session.
    const sessions = await prisma.adminRefreshSession.findMany({
      where: { userId: user.id },
    });
    expect(
      sessions.filter((s) => s.revokedReason === "REUSE_DETECTED"),
    ).toHaveLength(0);
    const newSession = sessions.find((s) => s.revokedAt === null);
    expect(newSession).toBeDefined();
    expect(newSession?.tokenHash).toBe(tokens.hashToken(leader.refreshToken));
    const audits = await prisma.auditLog.findMany({
      where: { action: "auth.refresh_reuse_detected" },
    });
    expect(audits).toHaveLength(0);
    console.log(
      "[FIX-38] follower DB-read failure -> 503 fail-closed; 1 new " +
        "session (leader only), old ROTATED once, no replay conclusion",
    );
  }, 30_000);
});
