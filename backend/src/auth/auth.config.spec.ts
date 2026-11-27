import {
  buildAuthConfig,
  DEFAULT_ACCESS_EXPIRES_IN,
  DEFAULT_LOCKOUT_SECONDS,
  DEFAULT_LOCKOUT_THRESHOLD,
  DEFAULT_REFRESH_EXPIRES_IN,
  validateAuthEnv,
} from "./auth.config";

// 32-byte key, base64-encoded (44 chars with padding) — test-only value.
const ENCRYPTION_KEY_32 = Buffer.alloc(32, 7).toString("base64");
const SECRET_A = "a".repeat(32);
const SECRET_B = "b".repeat(32);

function validEnv(): Record<string, string | undefined> {
  return {
    JWT_SECRET: SECRET_A,
    JWT_REFRESH_SECRET: SECRET_B,
    JWT_EXPIRES_IN: "15m",
    JWT_REFRESH_EXPIRES_IN: "7d",
    REFRESH_IDEMPOTENCY_ENCRYPTION_KEY: ENCRYPTION_KEY_32,
  };
}

describe("Auth configuration validation (AC-13)", () => {
  it("applies documented defaults when optional values are absent", () => {
    const config = buildAuthConfig({
      JWT_SECRET: SECRET_A,
      JWT_REFRESH_SECRET: SECRET_B,
      REFRESH_IDEMPOTENCY_ENCRYPTION_KEY: ENCRYPTION_KEY_32,
    });
    expect(config.accessExpiresInSeconds).toBe(15 * 60);
    expect(config.refreshExpiresInSeconds).toBe(7 * 24 * 3600);
    expect(config.lockoutThreshold).toBe(DEFAULT_LOCKOUT_THRESHOLD);
    expect(config.lockoutSeconds).toBe(DEFAULT_LOCKOUT_SECONDS);
    expect(config.idempotencyEncryptionKey).toHaveLength(32);
    expect(DEFAULT_ACCESS_EXPIRES_IN).toBe("15m");
    expect(DEFAULT_REFRESH_EXPIRES_IN).toBe("7d");
  });

  it("accepts explicit durations and lockout overrides", () => {
    const config = buildAuthConfig({
      ...validEnv(),
      JWT_EXPIRES_IN: "900",
      JWT_REFRESH_EXPIRES_IN: "24h",
      AUTH_LOCKOUT_THRESHOLD: "3",
      AUTH_LOCKOUT_SECONDS: "120",
    });
    expect(config.accessExpiresInSeconds).toBe(900);
    expect(config.refreshExpiresInSeconds).toBe(24 * 3600);
    expect(config.lockoutThreshold).toBe(3);
    expect(config.lockoutSeconds).toBe(120);
  });

  it("rejects a missing JWT_SECRET", () => {
    const env = validEnv();
    delete env.JWT_SECRET;
    expect(() => buildAuthConfig(env)).toThrow(/JWT_SECRET is required/);
  });

  it("rejects a missing JWT_REFRESH_SECRET", () => {
    const env = validEnv();
    delete env.JWT_REFRESH_SECRET;
    expect(() => buildAuthConfig(env)).toThrow(
      /JWT_REFRESH_SECRET is required/,
    );
  });

  it("rejects a secret shorter than 32 characters", () => {
    expect(() =>
      buildAuthConfig({ ...validEnv(), JWT_SECRET: "too-short" }),
    ).toThrow(/at least 32 characters/);
    expect(() =>
      buildAuthConfig({ ...validEnv(), JWT_REFRESH_SECRET: "x".repeat(31) }),
    ).toThrow(/at least 32 characters/);
  });

  it("rejects identical access and refresh secrets (D-11)", () => {
    expect(() =>
      buildAuthConfig({ ...validEnv(), JWT_REFRESH_SECRET: SECRET_A }),
    ).toThrow(/must differ/);
  });

  it("rejects a missing idempotency encryption key", () => {
    const env = validEnv();
    delete env.REFRESH_IDEMPOTENCY_ENCRYPTION_KEY;
    expect(() => buildAuthConfig(env)).toThrow(
      /REFRESH_IDEMPOTENCY_ENCRYPTION_KEY is required/,
    );
  });

  it("rejects an encryption key that is not exactly 32 bytes", () => {
    expect(() =>
      buildAuthConfig({
        ...validEnv(),
        REFRESH_IDEMPOTENCY_ENCRYPTION_KEY: Buffer.alloc(16, 1).toString(
          "base64",
        ),
      }),
    ).toThrow(/exactly 32 bytes/);
    expect(() =>
      buildAuthConfig({
        ...validEnv(),
        REFRESH_IDEMPOTENCY_ENCRYPTION_KEY: "not-base64!!!",
      }),
    ).toThrow(/exactly 32 bytes/);
    // 32 ASCII characters is NOT 32 bytes once base64-decoded.
    expect(() =>
      buildAuthConfig({
        ...validEnv(),
        REFRESH_IDEMPOTENCY_ENCRYPTION_KEY: "x".repeat(32),
      }),
    ).toThrow(/exactly 32 bytes/);
  });

  it("rejects an encryption key with invalid base64 characters even when the valid part decodes to 32 bytes (FIX-35)", () => {
    // Node's Buffer.from(x, "base64") silently drops "!", so the valid
    // part of each string below still decodes to exactly 32 bytes — the
    // old length-only check accepted them. Strict canonical base64 must
    // fail fast instead, without logging the key value.
    const withJunkAppended = `${ENCRYPTION_KEY_32}!`;
    expect(() =>
      buildAuthConfig({
        ...validEnv(),
        REFRESH_IDEMPOTENCY_ENCRYPTION_KEY: withJunkAppended,
      }),
    ).toThrow(/valid canonical base64/);
    const withJunkInside = `${ENCRYPTION_KEY_32.slice(0, 10)}!${ENCRYPTION_KEY_32.slice(11)}`;
    expect(() =>
      buildAuthConfig({
        ...validEnv(),
        REFRESH_IDEMPOTENCY_ENCRYPTION_KEY: withJunkInside,
      }),
    ).toThrow(/valid canonical base64/);
    // Missing padding is not canonical either.
    expect(() =>
      buildAuthConfig({
        ...validEnv(),
        REFRESH_IDEMPOTENCY_ENCRYPTION_KEY: ENCRYPTION_KEY_32.slice(0, -1),
      }),
    ).toThrow(/valid canonical base64/);
  });

  it("rejects a malformed duration", () => {
    expect(() =>
      buildAuthConfig({ ...validEnv(), JWT_EXPIRES_IN: "soon" }),
    ).toThrow(/must be a duration/);
    expect(() =>
      buildAuthConfig({ ...validEnv(), JWT_REFRESH_EXPIRES_IN: "0d" }),
    ).toThrow(/positive duration/);
  });

  it("rejects non-positive lockout settings", () => {
    expect(() =>
      buildAuthConfig({ ...validEnv(), AUTH_LOCKOUT_THRESHOLD: "0" }),
    ).toThrow(/positive integer/);
    expect(() =>
      buildAuthConfig({ ...validEnv(), AUTH_LOCKOUT_SECONDS: "-5" }),
    ).toThrow(/positive integer/);
  });

  it("validateAuthEnv passes a valid config through unchanged", () => {
    const config = { ...validEnv(), OTHER: "kept" };
    expect(validateAuthEnv(config)).toBe(config);
  });

  it("validateAuthEnv throws on an invalid config", () => {
    expect(() => validateAuthEnv({})).toThrow(/JWT_SECRET is required/);
  });
});
