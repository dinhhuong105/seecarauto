import { randomUUID } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { RateLimitService } from "../redis/rate-limit.service";
import { RedisService, RedisUnavailableError } from "../redis/redis.service";
import { AuthException, type ValidationDetail } from "./auth.errors";
import { authConfigFromService, type AuthConfig } from "./auth.config";
import { PasswordService } from "./password.service";
import { TokenService, type TokenPair } from "./token.service";

// AuthService (M02-05) — login / refresh / logout / me for admin accounts.
//
// Design (Task Brief M02-05 Revision 14, ACCEPTED Stage 1):
// - Login: username + Argon2id, dummy-hash verify for unknown users (D-13),
//   lockout state machine (D-01: 5 failures -> lock 15 min, 423 + retryAfter).
// - Refresh: ONE PostgreSQL transaction per (token, Idempotency-Key) does
//   claim + rotation + COMPLETED (D-16/FIX-21); four separate time limits
//   (FIX-25); ambiguous COMMIT resolved by re-claiming the same key
//   (FIX-26/FIX-28); Redis holds only the encrypted COMPLETED envelope
//   (FIX-13/FIX-16); leader/follower token delivery per FIX-19/FIX-22.
// - Logout: one session (refreshToken given) or all sessions (no refreshToken,
//   FIX-06); access token blacklisted (D-06, fail-closed 503).
// - /me: roles + permissions merged from the DB, deny wins (D-10).
// - Audit events (D-09) are written in the same transaction as the
//   lock/revoke they record. No token/password/hash is ever logged.

export interface AdminRoleSummary {
  id: string;
  name: string;
}

export interface AuthResponseData {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  admin: {
    id: string;
    username: string;
    roles: AdminRoleSummary[];
  };
}

export interface MeResponseData {
  id: string;
  username: string;
  roles: AdminRoleSummary[];
  permissions: string[];
}

/**
 * Test-only fault injection for the refresh transaction (AC-17/FIX-31).
 * `onClaimed` runs inside the transaction right after the operation claim
 * INSERT, before the session lock — tests use it to hold the transaction
 * open (with keep-alive statements) or let it go idle. Never set by HTTP.
 */
export interface RefreshHooks {
  onClaimed?: (tx: Prisma.TransactionClient) => Promise<void>;
}

const IDEMPOTENCY_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Thrown inside the rotation transaction to roll it back by design. */
class RefreshTransactionAbort extends Error {
  constructor(
    readonly reason:
      "session-not-active" | "conditional-update-0" | "operation-update-0",
  ) {
    super(`refresh transaction aborted: ${reason}`);
    this.name = "RefreshTransactionAbort";
  }
}

/**
 * Wraps an error thrown by a statement INSIDE the rotation transaction
 * callback. Prisma only sends COMMIT after the callback returns
 * successfully, so a statement error proves the transaction did NOT
 * commit — this is a proven rollback, NOT an ambiguous COMMIT (FIX-28
 * does not apply: no re-claim, answer 503 directly). Verified against
 * Prisma 6.19.3 (2026-11-27): an idle-in-transaction abort surfaces as
 * P1017 "Server has closed the connection" from the next statement, and a
 * Prisma transaction timeout as P2028 from the next statement — both from
 * inside the callback, so both are proven rollbacks.
 */
export class RefreshStatementError extends Error {
  constructor(public readonly cause: unknown) {
    super(
      `refresh transaction statement failed: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    this.name = "RefreshStatementError";
  }
}

type RotationOutcome =
  | { outcome: "leader"; pair: TokenPair; newSessionId: string }
  | { outcome: "follower" };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly config: AuthConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
    private readonly tokens: TokenService,
    private readonly rateLimit: RateLimitService,
    private readonly redis: RedisService,
    configService: ConfigService,
  ) {
    this.config = authConfigFromService(configService);
  }

  // ---------------------------------------------------------------- login

  async login(
    username: string,
    password: string,
    clientIp: string,
  ): Promise<AuthResponseData> {
    await this.checkRateLimit("adminLoginIp", clientIp);
    await this.checkRateLimit("adminLoginAccount", username);

    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { userRoles: { include: { role: true } } },
    });
    if (user === null) {
      // Unknown username: still run a real Argon2id verify so the response
      // time does not reveal whether the account exists (D-13).
      await this.password.verifyDummy(password);
      throw AuthException.invalidCredentials();
    }

    const now = new Date();
    if (user.isActive && user.lockedUntil !== null && user.lockedUntil > now) {
      throw AuthException.accountLocked(
        Math.max(
          1,
          Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 1000),
        ),
      );
    }

    const passwordOk = await this.password.verify(user.passwordHash, password);
    if (!passwordOk) {
      if (user.isActive) {
        await this.recordFailedLogin(user.id);
      }
      throw AuthException.invalidCredentials();
    }
    if (!user.isActive) {
      throw AuthException.invalidCredentials();
    }

    const roleIds = user.userRoles.map((ur) => ur.role.id);
    const sessionId = randomUUID();
    const pair = this.tokens.signTokenPair(user.id, sessionId, roleIds);
    const expiresAt = new Date(
      Date.now() + this.config.refreshExpiresInSeconds * 1000,
    );
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
      await tx.adminRefreshSession.create({
        data: {
          id: sessionId,
          userId: user.id,
          tokenHash: this.tokens.hashToken(pair.refreshToken),
          expiresAt,
        },
      });
    });
    return this.buildResponse(pair, user.id);
  }

  /**
   * Records one failed login. The increment is atomic; the lock + audit
   * are written in one transaction (FIX-08). A lock that already expired
   * starts a fresh consecutive-failure window (D-01 "sai liên tiếp").
   * Throws 423 when the account is (now) locked, 401 otherwise.
   */
  private async recordFailedLogin(userId: string): Promise<never> {
    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const fresh = await tx.user.findUnique({ where: { id: userId } });
      if (fresh === null) return { outcome: "user-gone" as const };
      if (fresh.lockedUntil !== null && fresh.lockedUntil > now) {
        return {
          outcome: "already-locked" as const,
          lockedUntil: fresh.lockedUntil,
        };
      }
      if (fresh.lockedUntil !== null && fresh.lockedUntil <= now) {
        await tx.user.update({
          where: { id: userId },
          data: { failedLoginAttempts: 0, lockedUntil: null },
        });
      }
      const updated = await tx.user.update({
        where: { id: userId },
        data: { failedLoginAttempts: { increment: 1 } },
        select: { failedLoginAttempts: true },
      });
      if (updated.failedLoginAttempts < this.config.lockoutThreshold) {
        return { outcome: "counted" as const };
      }
      const lockUntil = new Date(
        Date.now() + this.config.lockoutSeconds * 1000,
      );
      const locked = await tx.user.updateMany({
        where: {
          id: userId,
          OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }],
        },
        data: { lockedUntil: lockUntil },
      });
      if (locked.count === 1) {
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: "admin.locked",
            entityType: "users",
            entityId: userId,
            after: {
              failedLoginAttempts: updated.failedLoginAttempts,
              lockedUntil: lockUntil.toISOString(),
            },
          },
        });
        return { outcome: "locked" as const, lockedUntil: lockUntil };
      }
      return { outcome: "already-locked" as const };
    });
    if (result.outcome === "locked" || result.outcome === "already-locked") {
      const until =
        result.lockedUntil ??
        new Date(Date.now() + this.config.lockoutSeconds * 1000);
      throw AuthException.accountLocked(
        Math.max(1, Math.ceil((until.getTime() - Date.now()) / 1000)),
      );
    }
    throw AuthException.invalidCredentials();
  }

  // -------------------------------------------------------------- refresh

  async refresh(
    refreshToken: string,
    idempotencyKey: string | undefined,
    clientIp: string,
    hooks?: RefreshHooks,
  ): Promise<AuthResponseData> {
    const key = this.requireIdempotencyKey(idempotencyKey);
    await this.checkRateLimit("adminRefreshIp", clientIp);
    const payload = this.tokens.verifyRefreshToken(refreshToken);
    await this.checkRateLimit("adminRefreshAccount", payload.sub);

    const tokenHash = this.tokens.hashToken(refreshToken);
    const session = await this.prisma.adminRefreshSession.findUnique({
      where: { tokenHash },
    });
    if (session === null) {
      throw AuthException.invalidRefreshToken();
    }
    // FIX-33: the refresh JWT's claims must match the session row found by
    // token hash — `sid` is that session's id and `sub` is its owner
    // (Task Brief §2.2: "sid phải khớp row session còn hiệu lực"). A
    // token minted for another session/user is not this session's token:
    // answer 401 INVALID_REFRESH_TOKEN, run no transaction, create no new
    // session, and do NOT revoke-all — this is not a replay of this
    // session (a replayed token's claims still match its own row).
    if (payload.sid !== session.id || payload.sub !== session.userId) {
      throw AuthException.invalidRefreshToken();
    }
    if (session.revokedReason === "REUSE_DETECTED") {
      throw AuthException.tokenReuseDetected();
    }
    if (
      session.revokedReason === "LOGOUT" ||
      session.revokedReason === "LOGOUT_ALL" ||
      session.revokedReason === "ADMIN_REVOKED"
    ) {
      throw AuthException.invalidRefreshToken();
    }
    if (session.expiresAt <= new Date()) {
      throw AuthException.invalidRefreshToken();
    }
    if (session.revokedReason === "ROTATED") {
      // Same (token, key) with a COMPLETED operation is the same operation
      // retried — return the stored response (or 503 when the envelope is
      // gone), NOT a replay. A different key with no COMPLETED operation
      // is a replay: revoke-all + 401 TOKEN_REUSE_DETECTED (FIX-12/AC-05).
      const operation = await this.prisma.authRefreshOperation.findUnique({
        where: {
          tokenHash_idempotencyKey: { tokenHash, idempotencyKey: key },
        },
      });
      if (operation !== null && operation.state === "COMPLETED") {
        return this.followCompletedOperation(tokenHash, key, session.userId);
      }
      await this.revokeAllSessions(session.userId);
      throw AuthException.tokenReuseDetected();
    }

    // Session ACTIVE: run the single-transaction rotation (D-16/FIX-21).
    const ownerId = randomUUID();
    const held: { pair?: TokenPair; newSessionId?: string } = {};
    const roleIds = await this.roleIdsForUser(session.userId);
    let txResult: RotationOutcome;
    try {
      txResult = await this.runRotationTransaction({
        tokenHash,
        idempotencyKey: key,
        ownerId,
        session,
        roleIds,
        held,
        hooks,
      });
    } catch (error) {
      if (error instanceof RefreshTransactionAbort) {
        return this.handleAbortedRotation(tokenHash, key);
      }
      // A statement inside the transaction failed: proven rollback, never
      // an ambiguous COMMIT — answer 503 without re-claiming (FIX-28
      // does not apply; re-claiming here would rotate after a rollback
      // the brief expects to stay rolled back, e.g. FIX-31/FIX-32).
      if (error instanceof RefreshStatementError) {
        throw AuthException.serviceUnavailable(5);
      }
      if (isLockTimeoutError(error)) {
        throw AuthException.serviceUnavailable(5);
      }
      // Idle is checked before the transaction timeout: an
      // idle-in-transaction message also matches the transaction-timeout
      // pattern, and idle is the more specific diagnosis (same 503 either
      // way, but the classification must stay honest).
      if (isIdleTimeoutError(error)) {
        throw AuthException.serviceUnavailable(5);
      }
      if (isTransactionTimeoutError(error)) {
        throw AuthException.serviceUnavailable(5);
      }
      if (isAmbiguousDbError(error)) {
        // COMMIT acknowledgement lost: never conclude rollback from a
        // missing first read — resolve via the same-key claim (FIX-28).
        return this.resolveAmbiguousCommit({
          tokenHash,
          key,
          ownerId,
          heldPair:
            held.pair !== undefined && held.newSessionId !== undefined
              ? { pair: held.pair, newSessionId: held.newSessionId }
              : null,
          userId: session.userId,
          hooks,
        });
      }
      this.logger.error(
        `refresh transaction failed unexpectedly: ${(error as Error).message}`,
      );
      throw AuthException.serviceUnavailable(5);
    }
    if (txResult.outcome === "follower") {
      return this.followCompletedOperation(tokenHash, key, session.userId);
    }
    return this.deliverLeaderResponse(
      txResult.pair,
      ownerId,
      txResult.newSessionId,
      tokenHash,
      key,
      session.userId,
    );
  }

  /**
   * The single-transaction rotation (FIX-21): claim + session lock/check +
   * conditional rotation + new session + operation -> COMPLETED, all or
   * nothing. Four separate time limits (FIX-25): lock_timeout 5s per lock
   * wait, statement_timeout 10s per statement, Prisma `timeout` 10000ms
   * total, idle_in_transaction_session_timeout 5s idle backstop.
   */
  private async runRotationTransaction(input: {
    tokenHash: string;
    idempotencyKey: string;
    ownerId: string;
    session: { id: string; userId: string };
    roleIds: string[];
    held: { pair?: TokenPair; newSessionId?: string };
    hooks?: RefreshHooks;
  }): Promise<RotationOutcome> {
    const { tokenHash, idempotencyKey, ownerId, session, roleIds } = input;
    const operationExpiresAt = new Date(
      Date.now() + this.config.refreshExpiresInSeconds * 1000,
    );
    return this.prisma.$transaction(
      async (tx) => {
        try {
          await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`;
          await tx.$executeRaw`SET LOCAL statement_timeout = '10s'`;
          await tx.$executeRaw`SET LOCAL idle_in_transaction_session_timeout = '5s'`;
          // (a) Claim the operation. 0 rows = another transaction committed
          // first for this (token, key) — this request is a follower.
          const claimed = await tx.$queryRaw<{ id: string }[]>`
          INSERT INTO auth_refresh_operations
            (token_hash, idempotency_key, owner_id, state, expires_at)
          VALUES (${tokenHash}, ${idempotencyKey}, ${ownerId}::uuid, 'PENDING', ${operationExpiresAt})
          ON CONFLICT (token_hash, idempotency_key) DO NOTHING
          RETURNING id`;
          if (claimed.length === 0) {
            return { outcome: "follower" } as RotationOutcome;
          }
          if (input.hooks?.onClaimed !== undefined) {
            await input.hooks.onClaimed(tx);
          }
          // (b) Lock and check the old session. Not ACTIVE -> roll back the
          // whole transaction (the operation row vanishes with it).
          const rows = await tx.$queryRaw<
            {
              id: string;
              user_id: string;
              revoked_at: Date | null;
              expires_at: Date;
            }[]
          >`
          SELECT id, user_id, revoked_at, expires_at
          FROM admin_refresh_sessions
          WHERE token_hash = ${tokenHash}
          FOR UPDATE`;
          const row = rows[0];
          if (
            row === undefined ||
            row.revoked_at !== null ||
            row.expires_at <= new Date()
          ) {
            throw new RefreshTransactionAbort("session-not-active");
          }
          // (c) New session first, then the conditional rotation (same
          // transaction). The self-FK `replaced_by_session_id ->
          // admin_refresh_sessions(id)` (D-15) is enforced per statement, so
          // the old row may only point at a session row that already exists:
          // UPDATE-before-INSERT fails with FK 23503. The conditional
          // UPDATE is unchanged (0 rows -> ROLLBACK, and the just-inserted
          // row vanishes with the rollback — no session leaks).
          const newSessionId = randomUUID();
          const pair = this.tokens.signTokenPair(
            session.userId,
            newSessionId,
            roleIds,
          );
          // Keep the signed pair in case the COMMIT acknowledgement is lost
          // (FIX-28): it is only returned after the DB state is verified.
          input.held.pair = pair;
          input.held.newSessionId = newSessionId;
          await tx.adminRefreshSession.create({
            data: {
              id: newSessionId,
              userId: session.userId,
              tokenHash: this.tokens.hashToken(pair.refreshToken),
              expiresAt: new Date(
                Date.now() + this.config.refreshExpiresInSeconds * 1000,
              ),
            },
          });
          const rotated = await tx.$executeRaw`
          UPDATE admin_refresh_sessions
          SET revoked_at = now(),
              revoked_reason = 'ROTATED',
              replaced_by_session_id = ${newSessionId}::uuid
          WHERE id = ${row.id}::uuid AND revoked_at IS NULL`;
          if (rotated !== 1) {
            throw new RefreshTransactionAbort("conditional-update-0");
          }
          // (d) Operation -> COMPLETED, checking owner + PENDING (DB CAS).
          const completed = await tx.$executeRaw`
          UPDATE auth_refresh_operations
          SET state = 'COMPLETED'
          WHERE token_hash = ${tokenHash}
            AND idempotency_key = ${idempotencyKey}
            AND owner_id = ${ownerId}::uuid
            AND state = 'PENDING'`;
          if (completed !== 1) {
            throw new RefreshTransactionAbort("operation-update-0");
          }
          return {
            outcome: "leader",
            pair,
            newSessionId,
          } as RotationOutcome;
        } catch (error) {
          // A statement inside the callback failed: Prisma never sent
          // COMMIT, so this is a proven rollback (see RefreshStatementError).
          // RefreshTransactionAbort passes through unchanged (by design).
          if (error instanceof RefreshTransactionAbort) throw error;
          throw new RefreshStatementError(error);
        }
      },
      { timeout: 10000 },
    );
  }

  /**
   * Handles a rotation transaction that rolled back by design: re-reads
   * the session to decide replay (revoke-all) vs invalid/expired vs
   * fail-closed 503. Never infers the leader state from a follower result.
   */
  private async handleAbortedRotation(
    tokenHash: string,
    key: string,
  ): Promise<AuthResponseData> {
    let session;
    try {
      session = await this.prisma.adminRefreshSession.findUnique({
        where: { tokenHash },
      });
    } catch {
      // The re-read itself failed: fail closed, never issue a token.
      throw AuthException.serviceUnavailable(5);
    }
    if (session === null) {
      throw AuthException.invalidRefreshToken();
    }
    if (session.revokedReason === "ROTATED") {
      let operation;
      try {
        operation = await this.prisma.authRefreshOperation.findUnique({
          where: {
            tokenHash_idempotencyKey: { tokenHash, idempotencyKey: key },
          },
        });
      } catch {
        throw AuthException.serviceUnavailable(5);
      }
      if (operation !== null && operation.state === "COMPLETED") {
        return this.followCompletedOperation(tokenHash, key, session.userId);
      }
      try {
        await this.revokeAllSessions(session.userId);
      } catch {
        throw AuthException.serviceUnavailable(5);
      }
      throw AuthException.tokenReuseDetected();
    }
    if (session.revokedReason === "REUSE_DETECTED") {
      throw AuthException.tokenReuseDetected();
    }
    if (
      session.revokedReason === "LOGOUT" ||
      session.revokedReason === "LOGOUT_ALL" ||
      session.revokedReason === "ADMIN_REVOKED"
    ) {
      throw AuthException.invalidRefreshToken();
    }
    if (session.expiresAt <= new Date()) {
      throw AuthException.invalidRefreshToken();
    }
    // Still ACTIVE: the rollback had no business cause we can name —
    // fail closed, never issue a token.
    throw AuthException.serviceUnavailable(5);
  }

  /**
   * Follower path: the operation is COMPLETED, so the rotation already
   * happened — return the stored response, never rotate again. Envelope
   * absent (or tampered) -> 503, never AC-05 for the same key (FIX-12).
   */
  private async followCompletedOperation(
    tokenHash: string,
    key: string,
    userId: string,
  ): Promise<AuthResponseData> {
    // FIX-38 (E7d): the operation row must be verified before the stored
    // response may be returned. If the DB read itself fails, the state
    // cannot be verified — fail closed with 503, never infer a DB error
    // as a replay and never return a token unverified.
    let operation;
    try {
      operation = await this.prisma.authRefreshOperation.findUnique({
        where: {
          tokenHash_idempotencyKey: { tokenHash, idempotencyKey: key },
        },
      });
    } catch {
      throw AuthException.serviceUnavailable(5);
    }
    if (operation === null || operation.state !== "COMPLETED") {
      throw AuthException.serviceUnavailable(5);
    }
    const envelopeKey = this.tokens.envelopeKeyFor(tokenHash, key);
    let raw: string | null = null;
    const deadline = Date.now() + 1000;
    while (raw === null && Date.now() < deadline) {
      try {
        raw = await this.tokens.readEnvelope(envelopeKey);
      } catch (error) {
        if (error instanceof RedisUnavailableError) {
          throw AuthException.serviceUnavailable(5);
        }
        throw error;
      }
      if (raw === null) {
        await sleep(50);
      }
    }
    if (raw === null) {
      throw AuthException.serviceUnavailable(5);
    }
    const pair = this.tokens.decryptRefreshResponse(
      raw,
      operation.ownerId,
      tokenHash,
      key,
    );
    if (pair === null) {
      throw AuthException.serviceUnavailable(5);
    }
    return this.buildResponse(pair, userId);
  }

  /**
   * Leader delivery (FIX-19/FIX-22): the DB transaction committed, so
   * ownership is verified — the leader may return its own response even
   * when Redis cannot store the envelope. An ambiguous write is re-read
   * and verified first; a refused write (another owner's envelope) is 503.
   */
  private async deliverLeaderResponse(
    pair: TokenPair,
    ownerId: string,
    newSessionId: string,
    tokenHash: string,
    key: string,
    userId: string,
  ): Promise<AuthResponseData> {
    const envelopeJson = this.tokens.encryptRefreshResponse(
      pair,
      ownerId,
      newSessionId,
      tokenHash,
      key,
    );
    const envelopeKey = this.tokens.envelopeKeyFor(tokenHash, key);
    let written: boolean;
    try {
      written = await this.tokens.completeEnvelope(
        envelopeKey,
        ownerId,
        envelopeJson,
      );
    } catch (error) {
      if (!(error instanceof RedisUnavailableError)) throw error;
      // Ambiguous write: re-read and verify before concluding anything.
      const existing = await this.tryReadEnvelope(envelopeKey);
      if (existing !== null) {
        const verified = this.tokens.decryptRefreshResponse(
          existing,
          ownerId,
          tokenHash,
          key,
        );
        if (verified !== null) {
          return this.buildResponse(verified, userId);
        }
      }
      this.logger.warn(
        "refresh envelope write failed after DB commit; returning response to leader caller",
      );
      return this.buildResponse(pair, userId);
    }
    if (!written) {
      const existing = await this.tryReadEnvelope(envelopeKey);
      if (existing !== null) {
        const verified = this.tokens.decryptRefreshResponse(
          existing,
          ownerId,
          tokenHash,
          key,
        );
        if (verified !== null) {
          return this.buildResponse(verified, userId);
        }
      }
      throw AuthException.serviceUnavailable(5);
    }
    return this.buildResponse(pair, userId);
  }

  /**
   * Ambiguous COMMIT resolution (FIX-26/FIX-28). The COMMIT acknowledgement
   * was lost: NEVER conclude rollback from an absent first read. Read the
   * operation row; COMPLETED + matching owner + verified session relation
   * -> return the held pair; no row -> re-claim the same key (INSERT
   * success = old transaction really rolled back -> leader with a FRESH
   * pair; 0 rows = old transaction committed -> follower; timeout -> 503).
   * Never creates a second rotation just because the first read saw no row.
   */
  private async resolveAmbiguousCommit(input: {
    tokenHash: string;
    key: string;
    ownerId: string;
    heldPair: { pair: TokenPair; newSessionId: string } | null;
    userId: string;
    hooks?: RefreshHooks;
  }): Promise<AuthResponseData> {
    const { tokenHash, key, ownerId, heldPair, userId } = input;
    let operation;
    try {
      operation = await this.prisma.authRefreshOperation.findUnique({
        where: {
          tokenHash_idempotencyKey: { tokenHash, idempotencyKey: key },
        },
      });
    } catch {
      throw AuthException.serviceUnavailable(5);
    }
    if (operation !== null && operation.state === "COMPLETED") {
      if (operation.ownerId === ownerId && heldPair !== null) {
        const oldSession = await this.prisma.adminRefreshSession.findUnique({
          where: { tokenHash },
        });
        const newSession = await this.prisma.adminRefreshSession.findUnique({
          where: { id: heldPair.newSessionId },
        });
        if (
          oldSession?.revokedReason === "ROTATED" &&
          oldSession.replacedBySessionId === heldPair.newSessionId &&
          newSession !== null &&
          newSession.revokedAt === null
        ) {
          return this.buildResponse(heldPair.pair, userId);
        }
        throw AuthException.serviceUnavailable(5);
      }
      // Another owner committed first — follow the stored response.
      return this.followCompletedOperation(tokenHash, key, userId);
    }
    // No row (yet): resolve via the same-key claim. The INSERT waits for
    // the old transaction to end if it is still processing COMMIT.
    const freshOwnerId = randomUUID();
    const freshHeld: { pair?: TokenPair; newSessionId?: string } = {};
    let txResult: RotationOutcome;
    try {
      const session = await this.prisma.adminRefreshSession.findUnique({
        where: { tokenHash },
      });
      if (session === null) {
        throw AuthException.invalidRefreshToken();
      }
      const roleIds = await this.roleIdsForUser(session.userId);
      txResult = await this.runRotationTransaction({
        tokenHash,
        idempotencyKey: key,
        ownerId: freshOwnerId,
        session,
        roleIds,
        held: freshHeld,
        hooks: input.hooks,
      });
    } catch (error) {
      if (error instanceof RefreshTransactionAbort) {
        return this.handleAbortedRotation(tokenHash, key);
      }
      throw AuthException.serviceUnavailable(5);
    }
    if (txResult.outcome === "follower") {
      return this.followCompletedOperation(tokenHash, key, userId);
    }
    return this.deliverLeaderResponse(
      txResult.pair,
      freshOwnerId,
      txResult.newSessionId,
      tokenHash,
      key,
      userId,
    );
  }

  /**
   * Revokes ALL sessions of an account (AC-05 replay). ACTIVE sessions ->
   * REUSE_DETECTED; already-revoked sessions keep their original reason;
   * the replayed row keeps ROTATED (it is already revoked, so the
   * `revoked_at IS NULL` condition excludes it). Audit in the same
   * transaction (FIX-08/FIX-14). Returns the revoked-session count.
   */
  private async revokeAllSessions(userId: string): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const revoked = await tx.$executeRaw`
        UPDATE admin_refresh_sessions
        SET revoked_at = now(), revoked_reason = 'REUSE_DETECTED'
        WHERE user_id = ${userId}::uuid AND revoked_at IS NULL`;
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: "auth.refresh_reuse_detected",
          entityType: "users",
          entityId: userId,
          after: { revokedSessions: revoked },
        },
      });
      return revoked;
    });
  }

  // --------------------------------------------------------------- logout

  async logout(
    userId: string,
    accessToken: string,
    accessTokenExp: number,
    refreshToken?: string,
  ): Promise<void> {
    if (refreshToken !== undefined && refreshToken !== "") {
      const payload = this.tokens.verifyRefreshToken(refreshToken);
      if (payload.sub !== userId) {
        throw AuthException.invalidRefreshToken();
      }
      const targetHash = this.tokens.hashToken(refreshToken);
      const target = await this.prisma.adminRefreshSession.findUnique({
        where: { tokenHash: targetHash },
      });
      if (
        target === null ||
        target.userId !== userId ||
        target.revokedAt !== null ||
        target.expiresAt <= new Date()
      ) {
        throw AuthException.invalidRefreshToken();
      }
      const revoked = await this.prisma.$transaction(async (tx) => {
        const result = await tx.adminRefreshSession.updateMany({
          where: { id: target.id, revokedAt: null },
          data: { revokedAt: new Date(), revokedReason: "LOGOUT" },
        });
        if (result.count === 1) {
          await tx.auditLog.create({
            data: {
              actorId: userId,
              action: "auth.logout_session",
              entityType: "users",
              entityId: userId,
              after: { sessionId: target.id },
            },
          });
        }
        return result.count;
      });
      if (revoked !== 1) {
        // Revoked concurrently (e.g. rotated) after the read.
        throw AuthException.invalidRefreshToken();
      }
    } else {
      // No refresh token: revoke ALL sessions (FIX-06) — revoking only the
      // access token would leave live refresh sessions able to mint a new
      // access token immediately, making the logout useless.
      await this.prisma.$transaction(async (tx) => {
        const result = await tx.adminRefreshSession.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date(), revokedReason: "LOGOUT_ALL" },
        });
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: "auth.logout_all_sessions",
            entityType: "users",
            entityId: userId,
            after: { revokedSessions: result.count },
          },
        });
      });
    }
    // Blacklist the access token (fail-closed: Redis error -> 503).
    try {
      await this.tokens.blacklistAccessToken(accessToken, accessTokenExp);
    } catch (error) {
      if (error instanceof RedisUnavailableError) {
        throw AuthException.serviceUnavailable(5);
      }
      throw error;
    }
  }

  // ------------------------------------------------------------------- /me

  async getMe(userId: string): Promise<MeResponseData> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: { rolePermissions: { include: { permission: true } } },
            },
          },
        },
        userPermissions: { include: { permission: true } },
      },
    });
    if (user === null) {
      throw AuthException.unauthenticated();
    }
    const roles = user.userRoles
      .map((ur) => ({ id: ur.role.id, name: ur.role.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const allows = new Set<string>();
    const denies = new Set<string>();
    for (const ur of user.userRoles) {
      for (const rp of ur.role.rolePermissions) {
        const code = `${rp.permission.module}.${rp.permission.action}`;
        if (rp.granted) {
          allows.add(code);
        } else {
          denies.add(code);
        }
      }
    }
    for (const up of user.userPermissions) {
      const code = `${up.permission.module}.${up.permission.action}`;
      if (up.granted) {
        allows.add(code);
      } else {
        denies.add(code);
      }
    }
    // Deny wins over allow (D-10).
    const permissions = [...allows].filter((code) => !denies.has(code)).sort();
    return { id: user.id, username: user.username, roles, permissions };
  }

  // ------------------------------------------------------- cleanup (FIX-24)

  /**
   * Deletes expired operation rows. Uses FOR UPDATE SKIP LOCKED so a row
   * locked by an in-flight refresh transaction is skipped instead of
   * waited on and re-evaluated (FIX-27). Only rows past their retention
   * deadline are deleted. Returns the deleted-row count.
   */
  async cleanupExpiredOperations(): Promise<number> {
    return this.prisma.$executeRaw`
      DELETE FROM auth_refresh_operations WHERE id IN (
        SELECT id FROM auth_refresh_operations
        WHERE expires_at < now()
        FOR UPDATE SKIP LOCKED
      )`;
  }

  // -------------------------------------------------------------- helpers

  private async checkRateLimit(
    kind:
      | "adminLoginIp"
      | "adminLoginAccount"
      | "adminRefreshIp"
      | "adminRefreshAccount",
    subject: string,
  ): Promise<void> {
    const result = await this.rateLimit.check(kind, subject);
    if (!result.allowed) {
      throw AuthException.rateLimited(
        Math.max(1, result.resetAt - Math.floor(Date.now() / 1000)),
      );
    }
  }

  private requireIdempotencyKey(value: string | undefined): string {
    const details: ValidationDetail[] = [];
    if (value === undefined || value === "") {
      details.push({
        field: "Idempotency-Key",
        code: "REQUIRED",
        message: "Thiếu header Idempotency-Key.",
      });
    } else if (!IDEMPOTENCY_KEY_PATTERN.test(value)) {
      details.push({
        field: "Idempotency-Key",
        code: "INVALID_FORMAT",
        message: "Header Idempotency-Key phải là UUID.",
      });
    }
    if (details.length > 0) {
      throw AuthException.validationError(details);
    }
    return value as string;
  }

  private async roleIdsForUser(userId: string): Promise<string[]> {
    const roles = await this.prisma.userRole.findMany({
      where: { userId },
      select: { roleId: true },
    });
    return roles.map((r) => r.roleId);
  }

  private async buildResponse(
    pair: TokenPair,
    userId: string,
  ): Promise<AuthResponseData> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });
    if (user === null) {
      throw AuthException.unauthenticated();
    }
    const roles = user.userRoles
      .map((ur) => ({ id: ur.role.id, name: ur.role.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return {
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken,
      tokenType: "Bearer",
      expiresIn: this.config.accessExpiresInSeconds,
      admin: { id: user.id, username: user.username, roles },
    };
  }

  /** Best-effort envelope re-read: null when Redis cannot answer. */
  private async tryReadEnvelope(key: string): Promise<string | null> {
    try {
      return await this.tokens.readEnvelope(key);
    } catch {
      return null;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** PostgreSQL lock-timeout error (55P03, "canceling statement due to lock timeout"). */
export function isLockTimeoutError(error: unknown): boolean {
  return /lock timeout/i.test(errorMessage(error));
}

/** Prisma interactive-transaction `timeout` elapsed (transaction rolled back). */
export function isTransactionTimeoutError(error: unknown): boolean {
  // An idle-in-transaction message also contains "transaction timeout" —
  // idle is the more specific diagnosis and is classified separately.
  if (isIdleTimeoutError(error)) return false;
  const message = errorMessage(error);
  return (
    (error as { code?: unknown } | null)?.code === "P2028" ||
    /transaction.*timed? ?out|timed? ?out.*transaction/i.test(message)
  );
}

/** PostgreSQL idle-in-transaction timeout aborted the transaction.
 * NOTE (verified 2026-11-27): Prisma 6.19.3 does NOT surface the literal
 * PostgreSQL message — an idle abort reaches the application as P1017
 * "Server has closed the connection" from the next statement, which the
 * RefreshStatementError wrapper classifies as a proven rollback. This
 * classifier only matches the literal message (other drivers/paths). */
export function isIdleTimeoutError(error: unknown): boolean {
  return /idle[- ]in[- ]transaction/i.test(errorMessage(error));
}

/**
 * Connection-level failure where the COMMIT outcome is unknown
 * (FIX-26/FIX-28). Lock/timeout/idle errors are classified first and are
 * NOT ambiguous — they prove the transaction did not commit.
 */
export function isAmbiguousDbError(error: unknown): boolean {
  const message = errorMessage(error);
  return /connection|ECONN|socket|terminat|closed|reset|broken pipe|EPIPE|ETIMEDOUT/i.test(
    message,
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
