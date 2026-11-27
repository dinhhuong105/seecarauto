import { createHash } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "./redis.service";

// RateLimitService (M02-02) — Redis-backed atomic counters (API_SPEC §16).
//
// - Counting is atomic: one Lua script does INCR + EXPIRE-on-first-hit +
//   TTL in a single Redis round trip, so concurrent requests cannot race
//   past the limit.
// - Each limit type has its own key namespace:
//   `seecarauto:v1:ratelimit:<kind>:<sha256(subject)>`. Subjects (IP,
//   account id, order code, cart token) are hashed so no raw identifier
//   leaks into the keyspace.
// - Redis down: policy per limit kind (API_SPEC §16). fail-open kinds
//   allow the request (rate limiting temporarily off). fail-closed kinds
//   fall back to an in-memory counter — temporary, single-instance only,
//   and documented as such; it exists so a Redis outage cannot open the
//   door to login/order-code brute force.
// - Which kinds are fail-closed: adminLoginIp, adminLoginAccount,
//   orderLookupIp, orderLookupCode (explicit in §16), plus contact and
//   createOrder (money/spam-adjacent; conservative assignment by M02-02 —
//   the spec does not name them explicitly; see Task Brief §11).

export type RateLimitKind =
  | "publicGet"
  | "publicWrite"
  | "adminLoginIp"
  | "adminLoginAccount"
  | "orderLookupIp"
  | "orderLookupCode"
  | "search"
  | "contact"
  | "createOrder"
  | "adminAuthed";

export interface RateLimitRule {
  limit: number;
  windowSeconds: number;
  policy: "fail-open" | "fail-closed";
}

/** Limits exactly as specified in API_SPEC §16. */
export const RATE_LIMIT_RULES: Record<RateLimitKind, RateLimitRule> = {
  publicGet: { limit: 100, windowSeconds: 60, policy: "fail-open" },
  publicWrite: { limit: 30, windowSeconds: 60, policy: "fail-open" },
  adminLoginIp: { limit: 5, windowSeconds: 60, policy: "fail-closed" },
  adminLoginAccount: { limit: 10, windowSeconds: 60, policy: "fail-closed" },
  orderLookupIp: { limit: 10, windowSeconds: 60, policy: "fail-closed" },
  orderLookupCode: { limit: 5, windowSeconds: 60, policy: "fail-closed" },
  search: { limit: 60, windowSeconds: 60, policy: "fail-open" },
  contact: { limit: 5, windowSeconds: 3600, policy: "fail-closed" },
  createOrder: { limit: 10, windowSeconds: 60, policy: "fail-closed" },
  adminAuthed: { limit: 300, windowSeconds: 60, policy: "fail-open" },
};

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Unix epoch seconds when the current window resets. */
  resetAt: number;
  /** Where the decision came from. */
  fallback: "redis" | "memory" | "none";
}

/** Atomic increment + expiry + TTL in one Lua script. */
export const RATE_LIMIT_LUA_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
return {current, ttl}
`;

const RATE_LIMIT_KEY_PREFIX = "seecarauto:v1:ratelimit";

interface MemoryEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  /** Temporary in-memory counters, used only when Redis is down. */
  private readonly memoryCounters = new Map<string, MemoryEntry>();

  constructor(private readonly redis: RedisService) {}

  /** Checks one request against a limit kind. Never throws. */
  async check(kind: RateLimitKind, subject: string): Promise<RateLimitResult> {
    const rule = RATE_LIMIT_RULES[kind];
    const key = this.keyFor(kind, subject);
    try {
      const result = (await this.redis.withTimeout(
        this.redis
          .getClient()
          .eval(RATE_LIMIT_LUA_SCRIPT, 1, key, rule.windowSeconds),
        this.redis.getConfig().commandTimeoutMs,
        `rate limit ${kind}`,
      )) as [unknown, unknown];
      const [count, ttl] = result;
      const current = Number(count);
      const windowTtl = Number(ttl);
      const resetAt =
        Math.floor(Date.now() / 1000) +
        (windowTtl > 0 ? windowTtl : rule.windowSeconds);
      return {
        allowed: current <= rule.limit,
        limit: rule.limit,
        remaining: Math.max(0, rule.limit - current),
        resetAt,
        fallback: "redis",
      };
    } catch {
      return this.fallbackCheck(kind, rule, key);
    }
  }

  /** Redis key for a limit kind + subject (subject is SHA-256 hashed). */
  keyFor(kind: RateLimitKind, subject: string): string {
    const hash = createHash("sha256").update(subject).digest("hex");
    return `${RATE_LIMIT_KEY_PREFIX}:${kind}:${hash}`;
  }

  private fallbackCheck(
    kind: RateLimitKind,
    rule: RateLimitRule,
    key: string,
  ): RateLimitResult {
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (rule.policy === "fail-open") {
      this.logger.warn(
        `Rate limit ${kind} — Redis down, fail-open (limit temporarily off)`,
      );
      return {
        allowed: true,
        limit: rule.limit,
        remaining: rule.limit,
        resetAt: nowSeconds + rule.windowSeconds,
        fallback: "none",
      };
    }
    // fail-closed: enforce the same limit in process memory. Temporary and
    // single-instance — it does NOT share state across backend instances.
    this.pruneMemoryCounters(nowSeconds);
    const entry = this.memoryCounters.get(key);
    if (entry === undefined || entry.resetAt <= nowSeconds) {
      const resetAt = nowSeconds + rule.windowSeconds;
      this.memoryCounters.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        limit: rule.limit,
        remaining: rule.limit - 1,
        resetAt,
        fallback: "memory",
      };
    }
    entry.count += 1;
    return {
      allowed: entry.count <= rule.limit,
      limit: rule.limit,
      remaining: Math.max(0, rule.limit - entry.count),
      resetAt: entry.resetAt,
      fallback: "memory",
    };
  }

  private pruneMemoryCounters(nowSeconds: number): void {
    for (const [key, entry] of this.memoryCounters) {
      if (entry.resetAt <= nowSeconds) {
        this.memoryCounters.delete(key);
      }
    }
  }
}
