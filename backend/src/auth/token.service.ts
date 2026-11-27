import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthException } from "./auth.errors";
import { authConfigFromService, type AuthConfig } from "./auth.config";
import { ConfigService } from "@nestjs/config";
import { RedisService, RedisUnavailableError } from "../redis/redis.service";

// TokenService (M02-05) — signs/verifies JWTs, blacklists access tokens,
// and encrypts/decrypts the refresh idempotency envelope.
//
// - Access and refresh tokens use SEPARATE secrets (D-11) and carry a
//   `type` claim ("access" | "refresh"); a token of the wrong type is
//   never accepted even if its signature is valid (FIX-07).
// - Access tokens also carry `sid` (the AdminRefreshSession id that issued
//   them) so the guard can invalidate every access token of a revoked
//   session (FIX-10).
// - Blacklist: SHA-256 of the access token in Redis, TTL = time left until
//   `exp` (D-06). A Redis error while checking the blacklist is fail-closed:
//   the caller must answer 503, never accept a logged-out token (FIX-03).
// - Refresh response envelope (FIX-13/FIX-16): AES-256-GCM, IV 12 random
//   bytes, AAD binds sid + token hash + idempotency key; `sid` is stored
//   OUTSIDE the ciphertext as metadata so a follower can build the AAD
//   before decrypting. The envelope is write-once via Lua (FIX-20/FIX-27).

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  type: "access";
  roles: string[];
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  type: "refresh";
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshEnvelope {
  state: "COMPLETED";
  ownerId: string;
  sid: string;
  ciphertext: string;
  createdAt: number;
}

export const REFRESH_ENVELOPE_TTL_SECONDS = 10;
export const REFRESH_ENVELOPE_KEY_PREFIX = "auth:refresh:op:";
const BLACKLIST_KEY_PREFIX = "auth:blacklist:";

/**
 * Lua script for the write-once COMPLETED envelope (FIX-20/FIX-27).
 * Returns 1 when the write succeeded or was already present for the SAME
 * owner (idempotent no-op); 0 when refused (another owner's COMPLETED, or
 * a malformed existing value). Ownership was already verified by the DB
 * transaction — Lua only guarantees first-write-wins.
 * ARGV[1] = ownerId, ARGV[2] = envelope JSON, ARGV[3] = TTL seconds.
 */
export const COMPLETE_ENVELOPE_LUA_SCRIPT = `
local existing = redis.call('GET', KEYS[1])
if existing == false then
  redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
  return 1
end
local ok, decoded = pcall(cjson.decode, existing)
if not ok or type(decoded) ~= 'table' or decoded.state ~= 'COMPLETED' or decoded.ownerId == nil then
  return 0
end
if decoded.ownerId == ARGV[1] then
  return 1
end
return 0
`;

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly config: AuthConfig;

  constructor(
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
    configService: ConfigService,
  ) {
    this.config = authConfigFromService(configService);
  }

  /** SHA-256 hex of a token (what is stored in the DB / used as a key). */
  hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  /** Signs an access JWT (15 min, access secret, type + sid claims). */
  signAccessToken(
    userId: string,
    sessionId: string,
    roleIds: string[],
  ): string {
    return this.jwtService.sign(
      {
        sub: userId,
        sid: sessionId,
        type: "access",
        roles: roleIds,
      },
      {
        secret: this.config.jwtSecret,
        expiresIn: this.config.accessExpiresInSeconds,
      },
    );
  }

  /** Signs a refresh JWT (refresh secret, type + sid claims). */
  signRefreshToken(userId: string, sessionId: string): string {
    return this.jwtService.sign(
      { sub: userId, sid: sessionId, type: "refresh" },
      {
        secret: this.config.jwtRefreshSecret,
        expiresIn: this.config.refreshExpiresInSeconds,
      },
    );
  }

  /** Signs a fresh token pair for a session (access + refresh). */
  signTokenPair(
    userId: string,
    sessionId: string,
    roleIds: string[],
  ): TokenPair {
    return {
      accessToken: this.signAccessToken(userId, sessionId, roleIds),
      refreshToken: this.signRefreshToken(userId, sessionId),
    };
  }

  /**
   * Verifies an access JWT. Expired → TOKEN_EXPIRED; bad signature or
   * wrong type → UNAUTHENTICATED.
   */
  verifyAccessToken(token: string): AccessTokenPayload {
    let payload: unknown;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.config.jwtSecret,
      });
    } catch (error) {
      // jsonwebtoken errors are distinguished by name (no @types/jsonwebtoken
      // in the repo — do not add the import just for the error classes).
      if ((error as { name?: string } | null)?.name === "TokenExpiredError") {
        throw AuthException.tokenExpired();
      }
      throw AuthException.unauthenticated();
    }
    if (!isAccessPayload(payload)) {
      throw AuthException.unauthenticated();
    }
    return payload;
  }

  /**
   * Verifies a refresh JWT. Any failure (expired, bad signature, wrong
   * type) → INVALID_REFRESH_TOKEN — the client must log in again.
   */
  verifyRefreshToken(token: string): RefreshTokenPayload {
    let payload: unknown;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.config.jwtRefreshSecret,
      });
    } catch {
      throw AuthException.invalidRefreshToken();
    }
    if (!isRefreshPayload(payload)) {
      throw AuthException.invalidRefreshToken();
    }
    return payload;
  }

  /**
   * Decodes a JWT payload WITHOUT verifying the signature. Only for
   * extracting `exp` (blacklist TTL) after the token was already verified.
   */
  decodeUnverified(token: string): { exp?: number } | null {
    const decoded = this.jwtService.decode(token);
    if (decoded === null || typeof decoded !== "object") return null;
    return decoded as { exp?: number };
  }

  /**
   * Blacklists an access token until its `exp` (D-06). A token that is
   * already expired is not stored.
   */
  async blacklistAccessToken(
    token: string,
    expiresAtEpochSeconds: number,
  ): Promise<void> {
    const ttl = Math.max(
      1,
      expiresAtEpochSeconds - Math.floor(Date.now() / 1000),
    );
    const key = `${BLACKLIST_KEY_PREFIX}${this.hashToken(token)}`;
    try {
      await this.redis.withTimeout(
        this.redis.getClient().set(key, "1", "EX", ttl),
        this.redis.getConfig().commandTimeoutMs,
        "blacklist access token",
      );
    } catch (error) {
      if (error instanceof RedisUnavailableError) throw error;
      throw new RedisUnavailableError("blacklist access token");
    }
  }

  /**
   * True when the access token is blacklisted. Throws RedisUnavailableError
   * when Redis cannot answer — the caller must fail closed (503), never
   * accept a logged-out token (FIX-03).
   */
  async isAccessTokenBlacklisted(token: string): Promise<boolean> {
    const key = `${BLACKLIST_KEY_PREFIX}${this.hashToken(token)}`;
    try {
      const value = await this.redis.withTimeout(
        this.redis.getClient().get(key),
        this.redis.getConfig().commandTimeoutMs,
        "check access token blacklist",
      );
      return value !== null;
    } catch (error) {
      if (error instanceof RedisUnavailableError) throw error;
      throw new RedisUnavailableError("check access token blacklist");
    }
  }

  /** Redis key for a refresh operation's COMPLETED envelope. */
  envelopeKeyFor(tokenHashHex: string, idempotencyKey: string): string {
    const keyHash = createHash("sha256")
      .update(`${tokenHashHex}|${idempotencyKey}`)
      .digest("hex");
    return `${REFRESH_ENVELOPE_KEY_PREFIX}${keyHash}`;
  }

  /** Encrypts a token pair into a COMPLETED envelope (FIX-13/FIX-16). */
  encryptRefreshResponse(
    pair: TokenPair,
    ownerId: string,
    newSessionId: string,
    tokenHashHex: string,
    idempotencyKey: string,
  ): string {
    const iv = randomBytes(12);
    const aad = Buffer.from(
      `${newSessionId}|${tokenHashHex}|${idempotencyKey}`,
      "utf8",
    );
    const cipher = createCipheriv(
      "aes-256-gcm",
      this.config.idempotencyEncryptionKey,
      iv,
    );
    cipher.setAAD(aad);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(pair), "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    const envelope: RefreshEnvelope = {
      state: "COMPLETED",
      ownerId,
      sid: newSessionId,
      ciphertext: Buffer.concat([iv, ciphertext, tag]).toString("base64"),
      createdAt: Date.now(),
    };
    return JSON.stringify(envelope);
  }

  /**
   * Decrypts a COMPLETED envelope. Returns null when the envelope is
   * malformed, has a wrong owner, or fails AAD/tag authentication — the
   * caller answers 503, never treats the refresh as a new request (FIX-16).
   */
  decryptRefreshResponse(
    envelopeJson: string,
    expectedOwnerId: string,
    tokenHashHex: string,
    idempotencyKey: string,
  ): TokenPair | null {
    let envelope: unknown;
    try {
      envelope = JSON.parse(envelopeJson) as unknown;
    } catch {
      return null;
    }
    if (!isEnvelope(envelope)) return null;
    if (envelope.ownerId !== expectedOwnerId) return null;
    let raw: Buffer;
    try {
      raw = Buffer.from(envelope.ciphertext, "base64");
    } catch {
      return null;
    }
    if (raw.length < 12 + 16) return null;
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(raw.length - 16);
    const ciphertext = raw.subarray(12, raw.length - 16);
    const aad = Buffer.from(
      `${envelope.sid}|${tokenHashHex}|${idempotencyKey}`,
      "utf8",
    );
    try {
      const decipher = createDecipheriv(
        "aes-256-gcm",
        this.config.idempotencyEncryptionKey,
        iv,
      );
      decipher.setAAD(aad);
      decipher.setAuthTag(tag);
      const plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]).toString("utf8");
      const pair = JSON.parse(plaintext) as unknown;
      if (!isTokenPair(pair)) return null;
      return pair;
    } catch {
      return null;
    }
  }

  /**
   * Writes a COMPLETED envelope via Lua (first-write-wins, FIX-20/FIX-27).
   * Returns true when the envelope is present for this owner afterwards
   * (written, or an idempotent no-op for the same owner); false when
   * refused. Throws RedisUnavailableError when Redis cannot answer.
   */
  async completeEnvelope(
    key: string,
    ownerId: string,
    envelopeJson: string,
  ): Promise<boolean> {
    let result: unknown;
    try {
      result = await this.redis.withTimeout(
        this.redis
          .getClient()
          .eval(
            COMPLETE_ENVELOPE_LUA_SCRIPT,
            1,
            key,
            ownerId,
            envelopeJson,
            REFRESH_ENVELOPE_TTL_SECONDS,
          ),
        this.redis.getConfig().commandTimeoutMs,
        "write refresh envelope",
      );
    } catch (error) {
      if (error instanceof RedisUnavailableError) throw error;
      throw new RedisUnavailableError("write refresh envelope");
    }
    return Number(result) === 1;
  }

  /**
   * Reads the raw envelope for a key (null when absent). Throws
   * RedisUnavailableError when Redis cannot answer.
   */
  async readEnvelope(key: string): Promise<string | null> {
    try {
      return await this.redis.withTimeout(
        this.redis.getClient().get(key),
        this.redis.getConfig().commandTimeoutMs,
        "read refresh envelope",
      );
    } catch (error) {
      if (error instanceof RedisUnavailableError) throw error;
      throw new RedisUnavailableError("read refresh envelope");
    }
  }
}

function isAccessPayload(payload: unknown): payload is AccessTokenPayload {
  if (payload === null || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.sub === "string" &&
    typeof p.sid === "string" &&
    p.type === "access" &&
    Array.isArray(p.roles) &&
    p.roles.every((r) => typeof r === "string")
  );
}

function isRefreshPayload(payload: unknown): payload is RefreshTokenPayload {
  if (payload === null || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.sub === "string" &&
    typeof p.sid === "string" &&
    p.type === "refresh"
  );
}

function isEnvelope(value: unknown): value is RefreshEnvelope {
  if (value === null || typeof value !== "object") return false;
  const e = value as Record<string, unknown>;
  return (
    e.state === "COMPLETED" &&
    typeof e.ownerId === "string" &&
    typeof e.sid === "string" &&
    typeof e.ciphertext === "string" &&
    typeof e.createdAt === "number"
  );
}

function isTokenPair(value: unknown): value is TokenPair {
  if (value === null || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.accessToken === "string" && typeof p.refreshToken === "string"
  );
}
