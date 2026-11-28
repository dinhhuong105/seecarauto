import { ConfigService } from "@nestjs/config";

// Auth configuration for SeeCar Auto (M02-05).
// Values come from the environment only — never hard-code secrets.
// Validation happens at startup via `validateAuthEnv` (registered in
// ConfigModule.forRoot); a missing or malformed value fails fast instead
// of silently misbehaving at runtime.
//
// Decided values (Task Brief M02-05 §12, Henry approved 27/11/2026):
// - D-01: lockout after 5 consecutive failures, locked 15 minutes
//   (AUTH_LOCKOUT_THRESHOLD / AUTH_LOCKOUT_SECONDS — overridable for tests).
// - D-02: refresh TTL 7 days (JWT_REFRESH_EXPIRES_IN=7d — the brief treats
//   7d as the config value; it is NOT recorded here as a Henry decision
//   beyond what the brief states).
// - D-07: Argon2id OWASP parameters live in password.service.ts.
// - D-11: access and refresh secrets are separate and must differ.
// - D-14/FIX-13: the idempotency encryption key is base64 of exactly
//   32 random bytes (44 base64 chars with padding).

export interface AuthConfig {
  /** Secret that signs access tokens only (never refresh tokens). */
  jwtSecret: string;
  /** Secret that signs refresh tokens only (never access tokens). */
  jwtRefreshSecret: string;
  /** Access token lifetime in seconds (JWT_EXPIRES_IN, default 15m). */
  accessExpiresInSeconds: number;
  /** Refresh token lifetime in seconds (JWT_REFRESH_EXPIRES_IN, default 7d). */
  refreshExpiresInSeconds: number;
  /** AES-256-GCM key for the refresh idempotency envelope (exactly 32 bytes). */
  idempotencyEncryptionKey: Buffer;
  /** Consecutive failed logins that lock an account (D-01, default 5). */
  lockoutThreshold: number;
  /** Lock duration in seconds (D-01, default 900 = 15 minutes). */
  lockoutSeconds: number;
}

export const DEFAULT_ACCESS_EXPIRES_IN = "15m";
export const DEFAULT_REFRESH_EXPIRES_IN = "7d";
export const DEFAULT_LOCKOUT_THRESHOLD = 5;
export const DEFAULT_LOCKOUT_SECONDS = 900;
/** Minimum secret length (API_SECURITY §1). */
export const MIN_SECRET_LENGTH = 32;

function parseDurationSeconds(raw: string, name: string): number {
  const match = /^(\d+)([smhd])?$/.exec(raw.trim());
  if (!match) {
    throw new Error(
      `${name} must be a duration like "15m", "7d" or seconds ("900"), got: ${raw}`,
    );
  }
  const value = Number(match[1]);
  const unit = match[2] ?? "s";
  const multiplier =
    unit === "s" ? 1 : unit === "m" ? 60 : unit === "h" ? 3600 : 86400;
  const seconds = value * multiplier;
  if (!Number.isSafeInteger(seconds) || seconds <= 0) {
    throw new Error(`${name} must be a positive duration, got: ${raw}`);
  }
  return seconds;
}

function asPositiveInt(
  raw: string | undefined,
  fallback: number,
  name: string,
): number {
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer, got: ${raw}`);
  }
  return value;
}

function requireSecret(raw: string | undefined, name: string): string {
  if (raw === undefined || raw === "") {
    throw new Error(`${name} is required — set it in the environment`);
  }
  if (raw.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `${name} must be at least ${MIN_SECRET_LENGTH} characters, got ${raw.length}`,
    );
  }
  return raw;
}

export function buildAuthConfig(
  env: Record<string, string | undefined>,
): AuthConfig {
  const jwtSecret = requireSecret(env.JWT_SECRET, "JWT_SECRET");
  const jwtRefreshSecret = requireSecret(
    env.JWT_REFRESH_SECRET,
    "JWT_REFRESH_SECRET",
  );
  if (jwtSecret === jwtRefreshSecret) {
    throw new Error(
      "JWT_SECRET and JWT_REFRESH_SECRET must differ (D-11: separate secrets)",
    );
  }
  const encryptionKeyRaw = env.REFRESH_IDEMPOTENCY_ENCRYPTION_KEY;
  if (encryptionKeyRaw === undefined || encryptionKeyRaw === "") {
    throw new Error(
      "REFRESH_IDEMPOTENCY_ENCRYPTION_KEY is required — base64 of exactly 32 random bytes",
    );
  }
  // FIX-35: Node's Buffer.from(x, "base64") is lenient — it silently drops
  // characters outside the base64 alphabet, so a key with junk characters
  // can still decode to exactly 32 bytes (e.g. a valid 44-char key with
  // one character replaced by "!" still yields 32 bytes). Length alone
  // therefore does not prove the input is valid base64. Require strict
  // canonical base64 (alphabet + correct padding, re-encode equality)
  // and exactly 32 decoded bytes. The key value is never logged.
  const BASE64_CANONICAL_PATTERN =
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  if (!BASE64_CANONICAL_PATTERN.test(encryptionKeyRaw)) {
    throw new Error(
      "REFRESH_IDEMPOTENCY_ENCRYPTION_KEY must be valid canonical base64 of exactly 32 bytes",
    );
  }
  const idempotencyEncryptionKey = Buffer.from(encryptionKeyRaw, "base64");
  if (
    idempotencyEncryptionKey.length !== 32 ||
    idempotencyEncryptionKey.toString("base64") !== encryptionKeyRaw
  ) {
    throw new Error(
      "REFRESH_IDEMPOTENCY_ENCRYPTION_KEY must decode to exactly 32 bytes",
    );
  }
  return {
    jwtSecret,
    jwtRefreshSecret,
    accessExpiresInSeconds: parseDurationSeconds(
      env.JWT_EXPIRES_IN ?? DEFAULT_ACCESS_EXPIRES_IN,
      "JWT_EXPIRES_IN",
    ),
    refreshExpiresInSeconds: parseDurationSeconds(
      env.JWT_REFRESH_EXPIRES_IN ?? DEFAULT_REFRESH_EXPIRES_IN,
      "JWT_REFRESH_EXPIRES_IN",
    ),
    idempotencyEncryptionKey,
    lockoutThreshold: asPositiveInt(
      env.AUTH_LOCKOUT_THRESHOLD,
      DEFAULT_LOCKOUT_THRESHOLD,
      "AUTH_LOCKOUT_THRESHOLD",
    ),
    lockoutSeconds: asPositiveInt(
      env.AUTH_LOCKOUT_SECONDS,
      DEFAULT_LOCKOUT_SECONDS,
      "AUTH_LOCKOUT_SECONDS",
    ),
  };
}

/**
 * ConfigModule `validate` hook: validates auth-related variables and returns
 * the config object unchanged. Throws on missing/short/duplicate secrets or
 * a malformed idempotency key so the app fails fast at startup (AC-13).
 */
export function validateAuthEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const env: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(config)) {
    env[key] = value === undefined ? undefined : String(value);
  }
  buildAuthConfig(env);
  return config;
}

/** Reads the validated auth config from NestJS ConfigService. */
export function authConfigFromService(
  configService: ConfigService,
): AuthConfig {
  return buildAuthConfig({
    JWT_SECRET: configService.get<string>("JWT_SECRET"),
    JWT_REFRESH_SECRET: configService.get<string>("JWT_REFRESH_SECRET"),
    JWT_EXPIRES_IN: configService.get<string>("JWT_EXPIRES_IN"),
    JWT_REFRESH_EXPIRES_IN: configService.get<string>("JWT_REFRESH_EXPIRES_IN"),
    REFRESH_IDEMPOTENCY_ENCRYPTION_KEY: configService.get<string>(
      "REFRESH_IDEMPOTENCY_ENCRYPTION_KEY",
    ),
    AUTH_LOCKOUT_THRESHOLD: configService.get<string>("AUTH_LOCKOUT_THRESHOLD"),
    AUTH_LOCKOUT_SECONDS: configService.get<string>("AUTH_LOCKOUT_SECONDS"),
  });
}
