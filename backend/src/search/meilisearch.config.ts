import { ConfigService } from "@nestjs/config";

// Meilisearch configuration for SeeCar Auto (M02-03).
// Values come from the environment only — never hard-code secrets.
// The API key is the Meilisearch master key in local dev (see .env.example
// — the dev default there is a placeholder, not a real secret). On a
// non-local host an API key is REQUIRED: an empty key against a remote
// server would mean the index is unsecured, so startup fails fast instead.
// Validation happens at startup via `validateMeilisearchEnv` (registered in
// ConfigModule.forRoot together with validateRedisEnv).

export interface MeilisearchConfig {
  /** Meilisearch base URL, e.g. http://localhost:7700. */
  host: string;
  /** API key (master key) sent with every request. Empty = unsecured local server only. */
  apiKey: string;
  /** Product index name. Default 'products'. */
  productsIndex: string;
  /** Per-request timeout (ms). */
  requestTimeoutMs: number;
  /** How long to wait for an index task (add/delete/settings) to finish (ms). */
  taskTimeoutMs: number;
}

export const DEFAULT_MEILISEARCH_HOST = "http://localhost:7700";
export const DEFAULT_PRODUCTS_INDEX = "products";
export const DEFAULT_REQUEST_TIMEOUT_MS = 5000;
export const DEFAULT_TASK_TIMEOUT_MS = 10000;

function asPositiveInt(raw: unknown, fallback: number, name: string): number {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer, got: ${String(raw)}`);
  }
  return value;
}

export function buildMeilisearchConfig(
  env: Record<string, string | undefined>,
): MeilisearchConfig {
  const host = env.MEILISEARCH_HOST?.trim() || DEFAULT_MEILISEARCH_HOST;
  if (!/^https?:\/\//.test(host)) {
    throw new Error(
      `MEILISEARCH_HOST must start with http:// or https://, got: ${host}`,
    );
  }
  const apiKey = env.MEILISEARCH_API_KEY?.trim() ?? "";
  if (
    apiKey === "" &&
    !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(host)
  ) {
    throw new Error(
      "MEILISEARCH_API_KEY is required for a non-local Meilisearch host",
    );
  }
  const productsIndex =
    env.MEILISEARCH_PRODUCTS_INDEX?.trim() || DEFAULT_PRODUCTS_INDEX;
  if (!/^[A-Za-z0-9_-]+$/.test(productsIndex)) {
    throw new Error(
      `MEILISEARCH_PRODUCTS_INDEX must be letters, digits, - or _, got: ${productsIndex}`,
    );
  }
  return {
    host,
    apiKey,
    productsIndex,
    requestTimeoutMs: asPositiveInt(
      env.MEILISEARCH_REQUEST_TIMEOUT_MS,
      DEFAULT_REQUEST_TIMEOUT_MS,
      "MEILISEARCH_REQUEST_TIMEOUT_MS",
    ),
    taskTimeoutMs: asPositiveInt(
      env.MEILISEARCH_TASK_TIMEOUT_MS,
      DEFAULT_TASK_TIMEOUT_MS,
      "MEILISEARCH_TASK_TIMEOUT_MS",
    ),
  };
}

/**
 * ConfigModule `validate` hook: validates Meilisearch-related variables and
 * returns the config object unchanged. Throws on malformed values so the app
 * fails fast at startup.
 */
export function validateMeilisearchEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const env: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(config)) {
    env[key] = value === undefined ? undefined : String(value);
  }
  buildMeilisearchConfig(env);
  return config;
}

export function meilisearchConfigFromService(
  configService: ConfigService,
): MeilisearchConfig {
  return buildMeilisearchConfig({
    MEILISEARCH_HOST: configService.get<string>("MEILISEARCH_HOST"),
    MEILISEARCH_API_KEY: configService.get<string>("MEILISEARCH_API_KEY"),
    MEILISEARCH_PRODUCTS_INDEX: configService.get<string>(
      "MEILISEARCH_PRODUCTS_INDEX",
    ),
    MEILISEARCH_REQUEST_TIMEOUT_MS: configService.get<string>(
      "MEILISEARCH_REQUEST_TIMEOUT_MS",
    ),
    MEILISEARCH_TASK_TIMEOUT_MS: configService.get<string>(
      "MEILISEARCH_TASK_TIMEOUT_MS",
    ),
  });
}
