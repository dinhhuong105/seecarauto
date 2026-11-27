import { randomUUID } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "./redis.service";
import { moduleKeyPrefix } from "./cache-key";

// CacheService (M02-02) — cache-aside over Redis (ADR-006, NFR-004).
//
// - Values are JSON-serialized; only JSON-safe values may be cached.
// - Every Redis failure is a cache MISS / no-op, never an exception:
//   the website keeps working (slower) when Redis is down.
// - Stampede protection: in-process promise dedup (single instance) plus a
//   short Redis lock (SET NX EX) so a second instance does not reload the
//   same source at the same time. A lock holder that crashes leaves a lock
//   that expires on its own (5s). The lock carries a per-owner random
//   token (FIX-03, Revision 02) and is released only by an atomic Lua
//   check-and-delete — a slow loader whose lock already expired can never
//   delete the next owner's lock.
// - Invalidation never uses KEYS — always SCAN with a match pattern.
// - Never cache sensitive data (passwords, JWTs, refresh tokens, PII) —
//   callers are responsible; this service cannot tell a value is sensitive.

const STAMPEDE_LOCK_TTL_SECONDS = 5;
const STAMPEDE_POLL_MS = 200;
const STAMPEDE_POLL_ATTEMPTS = 10;

/**
 * Deletes a stampede lock ONLY when it is still owned by `token`
 * (FIX-03). Without the ownership check, a loader that outlives the 5s
 * lock TTL could DEL the next owner's lock.
 */
const LOCK_RELEASE_LUA_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
else
  return 0
end
`;

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  /** In-flight loaders, keyed by cache key (single-instance dedup). */
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(private readonly redis: RedisService) {}

  /** Returns the cached value, or null on miss / Redis error. Never throws. */
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.withTimeout(
        this.redis.getClient().get(key),
        this.redis.getConfig().commandTimeoutMs,
        `cache get ${key}`,
      );
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (error) {
      this.logFallback("get", key, error);
      return null;
    }
  }

  /** Stores a value with TTL. Returns false when Redis is unavailable. */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<boolean> {
    try {
      const raw = JSON.stringify(value);
      await this.redis.withTimeout(
        this.redis.getClient().set(key, raw, "EX", ttlSeconds),
        this.redis.getConfig().commandTimeoutMs,
        `cache set ${key}`,
      );
      return true;
    } catch (error) {
      this.logFallback("set", key, error);
      return false;
    }
  }

  /** Deletes one key. Returns false when Redis is unavailable. */
  async delete(key: string): Promise<boolean> {
    try {
      await this.redis.withTimeout(
        this.redis.getClient().del(key),
        this.redis.getConfig().commandTimeoutMs,
        `cache delete ${key}`,
      );
      return true;
    } catch (error) {
      this.logFallback("delete", key, error);
      return false;
    }
  }

  /**
   * Deletes every key matching a SCAN pattern (e.g. `seecarauto:v1:products:*`).
   * Returns the number of deleted keys, or -1 when Redis is unavailable.
   * Never uses KEYS (blocking on large datasets).
   */
  async deleteByPattern(pattern: string): Promise<number> {
    const client = this.redis.getClient();
    const timeoutMs = this.redis.getConfig().commandTimeoutMs;
    try {
      let cursor = "0";
      let deleted = 0;
      do {
        const [nextCursor, keys] = await this.redis.withTimeout(
          client.scan(cursor, "MATCH", pattern, "COUNT", 100),
          timeoutMs,
          `cache scan ${pattern}`,
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          deleted += await this.redis.withTimeout(
            client.del(...keys),
            timeoutMs,
            `cache delete pattern ${pattern}`,
          );
        }
      } while (cursor !== "0");
      return deleted;
    } catch (error) {
      this.logFallback("deleteByPattern", pattern, error);
      return -1;
    }
  }

  /** Invalidates every key of a module (`seecarauto:v1:<module>:*`). */
  async invalidateModule(module: string): Promise<number> {
    return this.deleteByPattern(`${moduleKeyPrefix(module)}*`);
  }

  /**
   * Cache-aside with stampede protection: on a miss, loads from `loader`
   * once even under concurrent calls for the same key, stores the result
   * with `ttlSeconds`, and returns it. On Redis failure the loader is
   * called directly and nothing is cached.
   */
  async remember<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const existing = this.inFlight.get(key) as Promise<T> | undefined;
    if (existing !== undefined) return existing;

    const load = this.loadAndStore(key, ttlSeconds, loader);
    this.inFlight.set(key, load);
    try {
      return await load;
    } finally {
      this.inFlight.delete(key);
    }
  }

  private async loadAndStore<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const lockKey = `${key}:lock`;
    const lock = await this.tryAcquireLock(lockKey);
    if (lock === "held") {
      // Another instance is loading — poll the cache briefly, then fall
      // back to loading directly rather than blocking the request.
      for (let i = 0; i < STAMPEDE_POLL_ATTEMPTS; i++) {
        await new Promise((resolve) => setTimeout(resolve, STAMPEDE_POLL_MS));
        const cached = await this.get<T>(key);
        if (cached !== null) return cached;
      }
    }
    // lock is an owner token: we hold the lock; lock === "unavailable":
    // Redis is down, load directly without waiting (nothing is cached
    // either way).
    try {
      const value = await loader();
      await this.set(key, value, ttlSeconds);
      return value;
    } finally {
      if (typeof lock === "string") {
        await this.releaseLock(lockKey, lock);
      }
    }
  }

  /**
   * Tries to take the stampede lock. Returns the owner token when we hold
   * it, "held" when another instance holds it, "unavailable" when Redis
   * is down (caller must load immediately instead of polling).
   */
  private async tryAcquireLock(
    lockKey: string,
  ): Promise<string | "held" | "unavailable"> {
    try {
      const token = randomUUID();
      const result = await this.redis.withTimeout(
        this.redis
          .getClient()
          .set(lockKey, token, "EX", STAMPEDE_LOCK_TTL_SECONDS, "NX"),
        this.redis.getConfig().commandTimeoutMs,
        `cache lock ${lockKey}`,
      );
      return result === "OK" ? token : "held";
    } catch {
      // Redis down — no lock, but the load still proceeds (no caching).
      return "unavailable";
    }
  }

  /**
   * Releases a stampede lock only when we still own it (atomic Lua
   * check-and-delete). Never throws — a lock that fails to release
   * expires on its own (≤5s).
   */
  private async releaseLock(lockKey: string, token: string): Promise<void> {
    try {
      await this.redis.withTimeout(
        this.redis.getClient().eval(LOCK_RELEASE_LUA_SCRIPT, 1, lockKey, token),
        this.redis.getConfig().commandTimeoutMs,
        `cache lock release ${lockKey}`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown Redis error";
      this.logger.warn(
        `Cache lock release failed for ${lockKey} — lock will expire (${message})`,
      );
    }
  }

  private logFallback(operation: string, key: string, error: unknown): void {
    const message =
      error instanceof Error ? error.message : "unknown Redis error";
    this.logger.warn(
      `Cache ${operation} failed for ${key} — falling back (${message})`,
    );
  }
}
