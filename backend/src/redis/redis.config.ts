import { ConfigService } from "@nestjs/config";

// Redis configuration for SeeCar Auto (M02-02).
// Values come from the environment only — never hard-code secrets.
// Defaults match docker-compose.yml (Redis 7, port 6379) and API_SPEC §11.1
// (cart TTL 30 days). Validation happens at startup via `validateRedisEnv`
// (registered in ConfigModule.forRoot); a malformed value fails fast instead
// of silently misbehaving at runtime.

export interface RedisConfig {
  /** Full Redis URL, e.g. redis://localhost:6379 (rediss:// for TLS). */
  url: string;
  /** Guest cart TTL in seconds. Default 30 days (API_SPEC §11.1). */
  cartTtlSeconds: number;
  /** Per-command timeout (ms) before a Redis call is treated as failed. */
  commandTimeoutMs: number;
  /** Default BullMQ worker concurrency. */
  queueConcurrency: number;
}

export const DEFAULT_REDIS_URL = "redis://localhost:6379";
export const DEFAULT_CART_TTL_DAYS = 30;
export const DEFAULT_COMMAND_TIMEOUT_MS = 1000;
export const DEFAULT_QUEUE_CONCURRENCY = 5;

function asPositiveInt(raw: unknown, fallback: number, name: string): number {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer, got: ${String(raw)}`);
  }
  return value;
}

export function buildRedisConfig(
  env: Record<string, string | undefined>,
): RedisConfig {
  const url = env.REDIS_URL?.trim() || DEFAULT_REDIS_URL;
  if (!/^rediss?:\/\//.test(url)) {
    throw new Error(
      `REDIS_URL must start with redis:// or rediss://, got: ${url}`,
    );
  }
  return {
    url,
    cartTtlSeconds:
      asPositiveInt(
        env.REDIS_CART_TTL_DAYS,
        DEFAULT_CART_TTL_DAYS,
        "REDIS_CART_TTL_DAYS",
      ) *
      24 *
      3600,
    commandTimeoutMs: asPositiveInt(
      env.REDIS_COMMAND_TIMEOUT_MS,
      DEFAULT_COMMAND_TIMEOUT_MS,
      "REDIS_COMMAND_TIMEOUT_MS",
    ),
    queueConcurrency: asPositiveInt(
      env.QUEUE_CONCURRENCY,
      DEFAULT_QUEUE_CONCURRENCY,
      "QUEUE_CONCURRENCY",
    ),
  };
}

/**
 * ConfigModule `validate` hook: validates Redis-related variables and returns
 * the config object unchanged. Throws on malformed values (bad URL scheme,
 * non-positive integers) so the app fails fast at startup.
 */
export function validateRedisEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const env: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(config)) {
    env[key] = value === undefined ? undefined : String(value);
  }
  buildRedisConfig(env);
  return config;
}

/** Reads the validated Redis config from NestJS ConfigService. */
export function redisConfigFromService(
  configService: ConfigService,
): RedisConfig {
  return buildRedisConfig({
    REDIS_URL: configService.get<string>("REDIS_URL"),
    REDIS_CART_TTL_DAYS: configService.get<string>("REDIS_CART_TTL_DAYS"),
    REDIS_COMMAND_TIMEOUT_MS: configService.get<string>(
      "REDIS_COMMAND_TIMEOUT_MS",
    ),
    QUEUE_CONCURRENCY: configService.get<string>("QUEUE_CONCURRENCY"),
  });
}
