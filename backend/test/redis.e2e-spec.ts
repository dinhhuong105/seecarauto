import { ConfigService } from "@nestjs/config";
import { CacheService } from "../src/redis/cache.service";
import { buildCacheKey } from "../src/redis/cache-key";
import {
  CartStorageService,
  CartValidationError,
} from "../src/redis/cart-storage.service";
import { RateLimitService } from "../src/redis/rate-limit.service";
import {
  RedisService,
  RedisUnavailableError,
} from "../src/redis/redis.service";

// Integration tests against a REAL Redis (M02-02, Task Brief §7).
// A test Redis must be running locally before this suite:
//   redis-server --port 6399 --daemonize yes --save '' --appendonly no
//   (see docs/infrastructure/REDIS_BULLMQ.md)
// The suite FAILS LOUDLY when Redis is unreachable — a mock is not a
// substitute for the real runtime (brief §7, last paragraph).

jest.setTimeout(20000);

const TEST_REDIS_URL = process.env.REDIS_TEST_URL ?? "redis://127.0.0.1:6399";
const DEAD_REDIS_URL = "redis://127.0.0.1:6398";

function testRedisService(url: string): RedisService {
  // ConfigService.get() prefers process.env over the internal config, and
  // setup.ts loads .env.test (REDIS_URL=...:6399/3) into process.env — so
  // passing the URL only via the internal config is silently ignored and
  // the "dead" service would connect to the live test Redis instead
  // (regression 27/11/2026: all 5 dead-port tests failed after REDIS_URL
  // was added to .env.test for the auth suite). RedisService reads its
  // config synchronously in the constructor, so swap process.env for the
  // construction call only, then restore it.
  const prev = process.env.REDIS_URL;
  process.env.REDIS_URL = url;
  try {
    return new RedisService(new ConfigService({ REDIS_URL: url }));
  } finally {
    if (prev === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = prev;
  }
}

describe("Redis integration (real Redis 7)", () => {
  let redis: RedisService;
  let cache: CacheService;
  let cart: CartStorageService;
  let rateLimit: RateLimitService;

  beforeAll(async () => {
    redis = testRedisService(TEST_REDIS_URL);
    await redis.onModuleInit();
    const alive = await redis.ping(2000);
    if (!alive) {
      throw new Error(
        `Test Redis is not reachable at ${TEST_REDIS_URL} — start it first ` +
          `(redis-server --port 6399 --daemonize yes --save '' --appendonly no). ` +
          `Mock Redis is NOT an acceptable substitute (M02-02 brief §7).`,
      );
    }
    cache = new CacheService(redis);
    cart = new CartStorageService(redis);
    rateLimit = new RateLimitService(redis);
  });

  afterAll(async () => {
    await redis.onModuleDestroy();
  });

  beforeEach(async () => {
    await redis.getClient().flushdb();
  });

  describe("RedisService lifecycle", () => {
    it("pings a live Redis and reports availability", async () => {
      expect(await redis.ping()).toBe(true);
      expect(redis.getLastErrorAt()).toBeNull();
    });

    it("creates a dedicated queue connection (maxRetriesPerRequest null)", async () => {
      const connection = redis.createQueueConnection();
      try {
        expect(await connection.ping()).toBe("PONG");
      } finally {
        await redis.disconnectClient(connection);
      }
    });
  });

  describe("CacheService (cache-aside)", () => {
    it("set/get round-trips objects; miss returns null", async () => {
      const key = buildCacheKey("products", "detail", "p-1");
      expect(await cache.get(key)).toBeNull();
      expect(await cache.set(key, { id: "p-1", price: 12345 }, 60)).toBe(true);
      expect(await cache.get<{ id: string; price: number }>(key)).toEqual({
        id: "p-1",
        price: 12345,
      });
    });

    it("delete removes a key; deleteByPattern scans (never KEYS)", async () => {
      const a = buildCacheKey("products", "detail", "p-1");
      const b = buildCacheKey("products", "list", "page-1");
      const c = buildCacheKey("categories", "detail", "c-1");
      await cache.set(a, 1, 60);
      await cache.set(b, 2, 60);
      await cache.set(c, 3, 60);
      expect(await cache.delete(a)).toBe(true);
      expect(await cache.get(a)).toBeNull();
      expect(await cache.deleteByPattern("seecarauto:v1:products:*")).toBe(1);
      expect(await cache.get(b)).toBeNull();
      expect(await cache.get(c)).toBe(3);
      expect(await cache.invalidateModule("categories")).toBe(1);
      expect(await cache.get(c)).toBeNull();
    });

    it("values expire after their TTL", async () => {
      const key = buildCacheKey("search", "results", "q1");
      await cache.set(key, "hit", 1);
      expect(await cache.get(key)).toBe("hit");
      await new Promise((resolve) => setTimeout(resolve, 1200));
      expect(await cache.get(key)).toBeNull();
    });

    it("remember() calls the loader once under 10 concurrent calls", async () => {
      const key = buildCacheKey("products", "detail", "p-9");
      let loads = 0;
      const loader = async () => {
        loads += 1;
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { id: "p-9" };
      };
      const results = await Promise.all(
        Array.from({ length: 10 }, () => cache.remember(key, 60, loader)),
      );
      expect(loads).toBe(1);
      for (const result of results) {
        expect(result).toEqual({ id: "p-9" });
      }
      // Second call is a plain cache hit — no loader run.
      expect(await cache.remember(key, 60, loader)).toEqual({ id: "p-9" });
      expect(loads).toBe(1);
    });

    it("remember() across two service instances uses the Redis lock", async () => {
      const secondRedis = testRedisService(TEST_REDIS_URL);
      const secondCache = new CacheService(secondRedis);
      try {
        const key = buildCacheKey("products", "detail", "p-10");
        let loads = 0;
        const loader = async () => {
          loads += 1;
          await new Promise((resolve) => setTimeout(resolve, 300));
          return { id: "p-10" };
        };
        const [a, b] = await Promise.all([
          cache.remember(key, 60, loader),
          secondCache.remember(key, 60, loader),
        ]);
        expect(a).toEqual({ id: "p-10" });
        expect(b).toEqual({ id: "p-10" });
        expect(loads).toBe(1);
      } finally {
        await secondRedis.onModuleDestroy();
      }
    });

    it("a slow loader never releases another instance's lock (FIX-03)", async () => {
      const secondRedis = testRedisService(TEST_REDIS_URL);
      const secondCache = new CacheService(secondRedis);
      try {
        const key = buildCacheKey("products", "detail", "p-lock");
        const lockKey = `${key}:lock`;
        const slowLoader = async () => {
          await new Promise((resolve) => setTimeout(resolve, 6000));
          return { id: "p-lock" };
        };
        // Instance A takes the lock (5s TTL) and loads slowly. Instance B
        // starts 5.5s later — after A's lock expired — and takes the lock.
        const aPromise = cache.remember(key, 60, slowLoader);
        await new Promise((resolve) => setTimeout(resolve, 5500));
        const bPromise = secondCache.remember(key, 60, slowLoader);
        // At t≈7s A has finished (and attempted its release) while B is
        // still loading: B's lock must still exist — A must not have
        // deleted it. With the old fixed-value lock + DEL, A's release
        // would have removed B's lock and this assertion would fail.
        await new Promise((resolve) => setTimeout(resolve, 1500));
        expect(await redis.getClient().exists(lockKey)).toBe(1);
        const [a, b] = await Promise.all([aPromise, bPromise]);
        expect(a).toEqual({ id: "p-lock" });
        expect(b).toEqual({ id: "p-lock" });
        // After B finishes, its own (ownership-checked) release removes
        // the lock.
        expect(await redis.getClient().exists(lockKey)).toBe(0);
        expect(await cache.get(key)).toEqual({ id: "p-lock" });
      } finally {
        await secondRedis.onModuleDestroy();
      }
    });
  });

  describe("CartStorageService (G-03)", () => {
    it("creates an empty cart, adds/updates/removes/clears items", async () => {
      const token = cart.createToken();
      const created = await cart.createCart(token);
      expect(created.items).toEqual([]);
      const afterAdd = await cart.addItem(token, {
        productId: "prod-1",
        quantity: 2,
        priceAtAdd: 50000,
      });
      expect(afterAdd.items).toHaveLength(1);
      expect(afterAdd.items[0].quantity).toBe(2);
      expect(afterAdd.items[0].priceAtAdd).toBe(50000);
      // Adding the same product increases quantity instead of duplicating.
      const afterSecondAdd = await cart.addItem(token, {
        productId: "prod-1",
        quantity: 1,
      });
      expect(afterSecondAdd.items).toHaveLength(1);
      expect(afterSecondAdd.items[0].quantity).toBe(3);
      const itemId = afterSecondAdd.items[0].itemId;
      const afterUpdate = await cart.updateItem(token, itemId, 5);
      expect(afterUpdate.items[0].quantity).toBe(5);
      await expect(cart.updateItem(token, itemId, 0)).rejects.toThrow(
        CartValidationError,
      );
      const afterRemove = await cart.removeItem(token, itemId);
      expect(afterRemove.items).toHaveLength(0);
      await cart.clearCart(token);
      expect(await cart.getCart(token)).toBeNull();
    });

    it("keeps carts of different tokens isolated", async () => {
      const tokenA = cart.createToken();
      const tokenB = cart.createToken();
      await cart.addItem(tokenA, { productId: "prod-1", quantity: 1 });
      expect(await cart.getCart(tokenB)).toBeNull();
      expect((await cart.getCart(tokenA))?.items).toHaveLength(1);
    });

    it("cart TTL defaults to 30 days", async () => {
      const token = cart.createToken();
      await cart.createCart(token);
      const ttl = await cart.getTtlSeconds(token);
      expect(ttl).toBeGreaterThan(29 * 24 * 3600);
      expect(ttl).toBeLessThanOrEqual(30 * 24 * 3600);
    });

    it("never exposes the raw token in the Redis key", async () => {
      const token = cart.createToken();
      const key = cart.keyForToken(token);
      expect(key).not.toContain(token);
      expect(key).toMatch(/^seecarauto:v1:cart:[0-9a-f]{64}$/);
      await cart.createCart(token);
      const keys = await redis.getClient().keys("seecarauto:v1:cart:*");
      expect(keys).toEqual([key]);
    });

    it("addItem is atomic under 10 concurrent adds of the same product (FIX-02)", async () => {
      const token = cart.createToken();
      await cart.createCart(token);
      await Promise.all(
        Array.from({ length: 10 }, () =>
          cart.addItem(token, { productId: "prod-race", quantity: 1 }),
        ),
      );
      const final = await cart.getCart(token);
      expect(final?.items).toHaveLength(1);
      expect(final?.items[0].quantity).toBe(10);
    });

    it("addItem is atomic under concurrent adds of different products (FIX-02)", async () => {
      const token = cart.createToken();
      await cart.createCart(token);
      await Promise.all(
        ["p-a", "p-b", "p-c", "p-d", "p-e"].map((productId) =>
          cart.addItem(token, { productId, quantity: 2 }),
        ),
      );
      const final = await cart.getCart(token);
      expect(final?.items).toHaveLength(5);
      expect(final?.items.reduce((sum, i) => sum + i.quantity, 0)).toBe(10);
    });

    it("removeItem is atomic under concurrent removes (FIX-02)", async () => {
      const token = cart.createToken();
      await cart.createCart(token);
      const ids: string[] = [];
      for (const p of ["p-1", "p-2", "p-3", "p-4", "p-5"]) {
        const afterAdd = await cart.addItem(token, {
          productId: p,
          quantity: 1,
        });
        ids.push(afterAdd.items.find((i) => i.productId === p)!.itemId);
      }
      await Promise.all(ids.map((itemId) => cart.removeItem(token, itemId)));
      expect((await cart.getCart(token))?.items).toHaveLength(0);
    });

    it("removeItem throws CartValidationError for a missing item or missing cart (FIX-05)", async () => {
      const token = cart.createToken();
      await cart.createCart(token);
      const afterAdd = await cart.addItem(token, {
        productId: "prod-1",
        quantity: 1,
      });
      const itemId = afterAdd.items[0].itemId;
      // Missing item in an existing cart — API_SPEC §11.1: 404
      // CART_ITEM_NOT_FOUND (mapped in M05 from CartValidationError).
      await expect(cart.removeItem(token, "no-such-item")).rejects.toThrow(
        CartValidationError,
      );
      // The failed remove leaves the cart unchanged.
      expect((await cart.getCart(token))?.items).toHaveLength(1);
      // Removing the real item still works.
      const afterRemove = await cart.removeItem(token, itemId);
      expect(afterRemove.items).toHaveLength(0);
      // Missing cart.
      await expect(
        cart.removeItem(cart.createToken(), "no-such-item"),
      ).rejects.toThrow(CartValidationError);
    });
  });

  describe("RateLimitService (API_SPEC §16)", () => {
    it("counts, reports remaining/reset, and enforces the limit", async () => {
      const subject = "203.0.113.10";
      for (let i = 0; i < 5; i++) {
        const result = await rateLimit.check("adminLoginIp", subject);
        expect(result.allowed).toBe(true);
        expect(result.limit).toBe(5);
        expect(result.remaining).toBe(5 - i - 1);
        expect(result.fallback).toBe("redis");
        expect(result.resetAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
        expect(result.resetAt).toBeLessThanOrEqual(
          Math.floor(Date.now() / 1000) + 60,
        );
      }
      const blocked = await rateLimit.check("adminLoginIp", subject);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it("isolates counters per subject and restarts after window expiry", async () => {
      const a = await rateLimit.check("adminLoginIp", "203.0.113.11");
      const b = await rateLimit.check("adminLoginIp", "203.0.113.12");
      expect(a.remaining).toBe(4);
      expect(b.remaining).toBe(4);
      // Simulate window expiry by deleting the key directly.
      await redis
        .getClient()
        .del(rateLimit.keyFor("adminLoginIp", "203.0.113.11"));
      const restarted = await rateLimit.check("adminLoginIp", "203.0.113.11");
      expect(restarted.allowed).toBe(true);
      expect(restarted.remaining).toBe(4);
    });

    it("is atomic under 20 concurrent requests (exactly 5 allowed)", async () => {
      const subject = "203.0.113.13";
      const results = await Promise.all(
        Array.from({ length: 20 }, () =>
          rateLimit.check("adminLoginIp", subject),
        ),
      );
      expect(results.filter((r) => r.allowed)).toHaveLength(5);
      expect(results.filter((r) => !r.allowed)).toHaveLength(15);
    });
  });

  describe("Redis down — fault injection (dead port 6398)", () => {
    let deadRedis: RedisService;

    beforeEach(() => {
      deadRedis = testRedisService(DEAD_REDIS_URL);
      // Regression guard: the service must really point at the dead port —
      // if process.env.REDIS_URL shadows the URL again, every test below
      // silently runs against the live test Redis.
      expect(deadRedis.getConfig().url).toBe(DEAD_REDIS_URL);
    });

    afterEach(async () => {
      await deadRedis.onModuleDestroy();
    });

    it("cache falls back (miss/false) instead of throwing", async () => {
      const deadCache = new CacheService(deadRedis);
      expect(await deadRedis.ping()).toBe(false);
      expect(
        await deadCache.get(buildCacheKey("products", "detail", "x")),
      ).toBeNull();
      expect(
        await deadCache.set(buildCacheKey("products", "detail", "x"), 1, 60),
      ).toBe(false);
      // remember() loads directly without hanging on the stampede lock.
      expect(
        await deadCache.remember(
          buildCacheKey("products", "detail", "x"),
          60,
          async () => "from-source",
        ),
      ).toBe("from-source");
    });

    it("cart throws RedisUnavailableError (never a fake empty cart) — ISSUE-M02-02-01, decided: 503", async () => {
      const deadCart = new CartStorageService(deadRedis);
      const token = deadCart.createToken();
      await expect(deadCart.getCart(token)).rejects.toThrow(
        RedisUnavailableError,
      );
      await expect(deadCart.createCart(token)).rejects.toThrow(
        RedisUnavailableError,
      );
      // Mutations take the same path — a dead Redis must never silently
      // pretend the cart is empty or accept an add.
      await expect(
        deadCart.addItem(token, { productId: "p-1", quantity: 1 }),
      ).rejects.toThrow(RedisUnavailableError);
      await expect(deadCart.removeItem(token, "no-such-item")).rejects.toThrow(
        RedisUnavailableError,
      );
    });

    it("rate limit fail-open allows, fail-closed enforces in memory", async () => {
      const deadRateLimit = new RateLimitService(deadRedis);
      const open = await deadRateLimit.check("publicGet", "203.0.113.20");
      expect(open.allowed).toBe(true);
      expect(open.fallback).toBe("none");
      const subject = "203.0.113.21";
      for (let i = 0; i < 5; i++) {
        const result = await deadRateLimit.check("adminLoginIp", subject);
        expect(result.allowed).toBe(true);
        expect(result.fallback).toBe("memory");
      }
      const blocked = await deadRateLimit.check("adminLoginIp", subject);
      expect(blocked.allowed).toBe(false);
      expect(blocked.fallback).toBe("memory");
    });

    it("rate limit contact fail-closed in memory when Redis is down (ISSUE-M02-02-02, decided)", async () => {
      const deadRateLimit = new RateLimitService(deadRedis);
      const subject = "203.0.113.22";
      for (let i = 0; i < 5; i++) {
        const result = await deadRateLimit.check("contact", subject);
        expect(result.allowed).toBe(true);
        expect(result.fallback).toBe("memory");
      }
      const blocked = await deadRateLimit.check("contact", subject);
      expect(blocked.allowed).toBe(false);
      expect(blocked.fallback).toBe("memory");
    });

    it("rate limit createOrder fail-closed in memory when Redis is down (ISSUE-M02-02-02, decided)", async () => {
      const deadRateLimit = new RateLimitService(deadRedis);
      const subject = "cart-token-1";
      for (let i = 0; i < 10; i++) {
        const result = await deadRateLimit.check("createOrder", subject);
        expect(result.allowed).toBe(true);
        expect(result.fallback).toBe("memory");
      }
      const blocked = await deadRateLimit.check("createOrder", subject);
      expect(blocked.allowed).toBe(false);
      expect(blocked.fallback).toBe("memory");
    });
  });
});
