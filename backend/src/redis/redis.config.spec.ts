import {
  buildRedisConfig,
  DEFAULT_CART_TTL_DAYS,
  DEFAULT_COMMAND_TIMEOUT_MS,
  DEFAULT_QUEUE_CONCURRENCY,
  DEFAULT_REDIS_URL,
  validateRedisEnv,
} from "./redis.config";

describe("Redis configuration validation (AC-02)", () => {
  it("applies documented defaults when nothing is set", () => {
    const config = buildRedisConfig({});
    expect(config.url).toBe(DEFAULT_REDIS_URL);
    expect(config.cartTtlSeconds).toBe(DEFAULT_CART_TTL_DAYS * 24 * 3600);
    expect(config.commandTimeoutMs).toBe(DEFAULT_COMMAND_TIMEOUT_MS);
    expect(config.queueConcurrency).toBe(DEFAULT_QUEUE_CONCURRENCY);
  });

  it("accepts explicit values", () => {
    const config = buildRedisConfig({
      REDIS_URL: "redis://redis:6379",
      REDIS_CART_TTL_DAYS: "7",
      REDIS_COMMAND_TIMEOUT_MS: "500",
      QUEUE_CONCURRENCY: "2",
    });
    expect(config.url).toBe("redis://redis:6379");
    expect(config.cartTtlSeconds).toBe(7 * 24 * 3600);
    expect(config.commandTimeoutMs).toBe(500);
    expect(config.queueConcurrency).toBe(2);
  });

  it("accepts rediss:// (TLS) URLs", () => {
    expect(
      buildRedisConfig({ REDIS_URL: "rediss://cache.example.com:6380" }).url,
    ).toBe("rediss://cache.example.com:6380");
  });

  it("rejects a URL without a redis:// scheme", () => {
    expect(() =>
      buildRedisConfig({ REDIS_URL: "http://localhost:6379" }),
    ).toThrow(/REDIS_URL/);
  });

  it("rejects non-positive integer settings", () => {
    expect(() => buildRedisConfig({ REDIS_CART_TTL_DAYS: "0" })).toThrow(
      /REDIS_CART_TTL_DAYS/,
    );
    expect(() => buildRedisConfig({ REDIS_CART_TTL_DAYS: "-30" })).toThrow(
      /REDIS_CART_TTL_DAYS/,
    );
    expect(() => buildRedisConfig({ REDIS_CART_TTL_DAYS: "thirty" })).toThrow(
      /REDIS_CART_TTL_DAYS/,
    );
    expect(() => buildRedisConfig({ QUEUE_CONCURRENCY: "0" })).toThrow(
      /QUEUE_CONCURRENCY/,
    );
  });

  it("validateRedisEnv returns the config unchanged when valid", () => {
    const input = { REDIS_URL: "redis://localhost:6379", OTHER: "kept" };
    expect(validateRedisEnv(input)).toBe(input);
  });

  it("validateRedisEnv throws on malformed values", () => {
    expect(() => validateRedisEnv({ REDIS_URL: "localhost:6379" })).toThrow(
      /REDIS_URL/,
    );
  });
});
