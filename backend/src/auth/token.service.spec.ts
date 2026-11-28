import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuthException } from "./auth.errors";
import {
  COMPLETE_ENVELOPE_LUA_SCRIPT,
  REFRESH_ENVELOPE_TTL_SECONDS,
  TokenService,
} from "./token.service";
import type { RedisService } from "../redis/redis.service";

// In-memory fake of the RedisService surface TokenService uses. The Lua
// semantics are re-implemented here only to test how TokenService
// interprets the script result; the real Lua script runs against real
// Redis in the e2e suite (AC-17/FIX-20/FIX-27).
class FakeRedis {
  readonly store = new Map<string, string>();

  getClient() {
    const store = this.store;
    return {
      async set(key: string, value: string): Promise<string> {
        store.set(key, value);
        return "OK";
      },
      async get(key: string): Promise<string | null> {
        return store.get(key) ?? null;
      },
      async eval(
        script: string,
        _numKeys: number,
        key: string,
        ownerId: string,
        envelopeJson: string,
      ): Promise<number> {
        if (script !== COMPLETE_ENVELOPE_LUA_SCRIPT) {
          throw new Error("unexpected Lua script");
        }
        const existing = store.get(key);
        if (existing === undefined) {
          store.set(key, envelopeJson);
          return 1;
        }
        let decoded: unknown;
        try {
          decoded = JSON.parse(existing) as unknown;
        } catch {
          return 0;
        }
        if (
          decoded === null ||
          typeof decoded !== "object" ||
          (decoded as { state?: unknown }).state !== "COMPLETED" ||
          typeof (decoded as { ownerId?: unknown }).ownerId !== "string"
        ) {
          return 0;
        }
        return (decoded as { ownerId: string }).ownerId === ownerId ? 1 : 0;
      },
    };
  }

  async withTimeout<T>(promise: Promise<T>): Promise<T> {
    return promise;
  }

  getConfig() {
    return { commandTimeoutMs: 1000 };
  }
}

const ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");

function makeService(): { service: TokenService; fake: FakeRedis } {
  const fake = new FakeRedis();
  const config = new ConfigService({
    JWT_SECRET: "access-secret-".padEnd(32, "a"),
    JWT_REFRESH_SECRET: "refresh-secret".padEnd(32, "b"),
    JWT_EXPIRES_IN: "15m",
    JWT_REFRESH_EXPIRES_IN: "7d",
    REFRESH_IDEMPOTENCY_ENCRYPTION_KEY: ENCRYPTION_KEY,
  });
  const service = new TokenService(
    new JwtService({}),
    fake as unknown as RedisService,
    config,
  );
  return { service, fake };
}

describe("TokenService", () => {
  it("signs an access token with sub/sid/type/roles and a 15-minute expiry", () => {
    const { service } = makeService();
    const token = service.signAccessToken("user-1", "session-1", ["r1", "r2"]);
    const payload = service.verifyAccessToken(token);
    expect(payload.sub).toBe("user-1");
    expect(payload.sid).toBe("session-1");
    expect(payload.type).toBe("access");
    expect(payload.roles).toEqual(["r1", "r2"]);
    expect(payload.exp).toBeDefined();
    expect(payload.exp! - Math.floor(Date.now() / 1000)).toBeLessThanOrEqual(
      900,
    );
    expect(payload.exp! - Math.floor(Date.now() / 1000)).toBeGreaterThan(850);
  });

  it("rejects a refresh token presented as an access token", () => {
    const { service } = makeService();
    const refresh = service.signRefreshToken("user-1", "session-1");
    expect(() => service.verifyAccessToken(refresh)).toThrow(AuthException);
    try {
      service.verifyAccessToken(refresh);
      fail("expected AuthException");
    } catch (error) {
      expect((error as AuthException).getResponse()).toMatchObject({
        statusCode: 401,
        error: "UNAUTHENTICATED",
      });
    }
  });

  it("reports TOKEN_EXPIRED for an expired access token", async () => {
    const { service } = makeService();
    const expired = new JwtService({}).sign(
      { sub: "u", sid: "s", type: "access", roles: [] },
      {
        secret: "access-secret-".padEnd(32, "a"),
        expiresIn: 1,
      },
    );
    await new Promise((resolve) => setTimeout(resolve, 1100));
    try {
      service.verifyAccessToken(expired);
      fail("expected AuthException");
    } catch (error) {
      expect((error as AuthException).getResponse()).toMatchObject({
        statusCode: 401,
        error: "TOKEN_EXPIRED",
      });
    }
  });

  it("signs a refresh token with sub/sid/type and a 7-day expiry", () => {
    const { service } = makeService();
    const token = service.signRefreshToken("user-1", "session-1");
    const payload = service.verifyRefreshToken(token);
    expect(payload.sub).toBe("user-1");
    expect(payload.sid).toBe("session-1");
    expect(payload.type).toBe("refresh");
    expect(payload.exp! - Math.floor(Date.now() / 1000)).toBeGreaterThan(
      7 * 24 * 3600 - 60,
    );
  });

  it("rejects an access token presented as a refresh token", () => {
    const { service } = makeService();
    const access = service.signAccessToken("user-1", "session-1", []);
    try {
      service.verifyRefreshToken(access);
      fail("expected AuthException");
    } catch (error) {
      expect((error as AuthException).getResponse()).toMatchObject({
        statusCode: 401,
        error: "INVALID_REFRESH_TOKEN",
      });
    }
  });

  it("rejects a token signed with the wrong secret", () => {
    const { service } = makeService();
    const forged = new JwtService({}).sign(
      { sub: "u", sid: "s", type: "refresh" },
      { secret: "attacker-secret-".padEnd(32, "x"), expiresIn: 60 },
    );
    expect(() => service.verifyRefreshToken(forged)).toThrow(AuthException);
  });

  it("hashes tokens with SHA-256 (hex, deterministic)", () => {
    const { service } = makeService();
    expect(service.hashToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(service.hashToken("abc")).toBe(service.hashToken("abc"));
    expect(service.hashToken("abc")).not.toBe(service.hashToken("abd"));
  });

  it("blacklists an access token until expiry and reports it", async () => {
    const { service } = makeService();
    const token = service.signAccessToken("u", "s", []);
    expect(await service.isAccessTokenBlacklisted(token)).toBe(false);
    await service.blacklistAccessToken(
      token,
      Math.floor(Date.now() / 1000) + 900,
    );
    expect(await service.isAccessTokenBlacklisted(token)).toBe(true);
  });

  it("builds deterministic envelope keys from token hash + key", () => {
    const { service } = makeService();
    const key = service.envelopeKeyFor("aabbcc", "key-1");
    expect(key.startsWith("auth:refresh:op:")).toBe(true);
    expect(service.envelopeKeyFor("aabbcc", "key-1")).toBe(key);
    expect(service.envelopeKeyFor("aabbcc", "key-2")).not.toBe(key);
  });

  it("encrypts and decrypts a refresh envelope (round-trip)", () => {
    const { service } = makeService();
    const pair = { accessToken: "acc", refreshToken: "ref" };
    const json = service.encryptRefreshResponse(
      pair,
      "owner-1",
      "session-new",
      "hashhex",
      "key-1",
    );
    const parsed = JSON.parse(json) as Record<string, unknown>;
    // sid is metadata OUTSIDE the ciphertext (FIX-16).
    expect(parsed.sid).toBe("session-new");
    expect(parsed.state).toBe("COMPLETED");
    expect(parsed.ownerId).toBe("owner-1");
    expect(
      service.decryptRefreshResponse(json, "owner-1", "hashhex", "key-1"),
    ).toEqual(pair);
  });

  it("refuses a tampered sid, wrong owner, wrong key, or malformed envelope", () => {
    const { service } = makeService();
    const pair = { accessToken: "acc", refreshToken: "ref" };
    const json = service.encryptRefreshResponse(
      pair,
      "owner-1",
      "session-new",
      "hashhex",
      "key-1",
    );
    // Tampered sid metadata -> AAD mismatch.
    const tampered = JSON.parse(json) as Record<string, unknown>;
    tampered.sid = "session-other";
    expect(
      service.decryptRefreshResponse(
        JSON.stringify(tampered),
        "owner-1",
        "hashhex",
        "key-1",
      ),
    ).toBeNull();
    // Wrong owner.
    expect(
      service.decryptRefreshResponse(json, "owner-2", "hashhex", "key-1"),
    ).toBeNull();
    // Wrong idempotency key -> AAD mismatch.
    expect(
      service.decryptRefreshResponse(json, "owner-1", "hashhex", "key-2"),
    ).toBeNull();
    // Malformed JSON / truncated ciphertext.
    expect(
      service.decryptRefreshResponse("not-json", "owner-1", "hashhex", "key-1"),
    ).toBeNull();
    expect(
      service.decryptRefreshResponse(
        JSON.stringify({ state: "COMPLETED", ownerId: "owner-1" }),
        "owner-1",
        "hashhex",
        "key-1",
      ),
    ).toBeNull();
  });

  it("writes the envelope once (Lua): absent -> write, same owner -> no-op, other owner -> refuse", async () => {
    const { service } = makeService();
    const key = service.envelopeKeyFor("hashhex", "key-1");
    const json = service.encryptRefreshResponse(
      { accessToken: "a", refreshToken: "r" },
      "owner-1",
      "s1",
      "hashhex",
      "key-1",
    );
    expect(await service.completeEnvelope(key, "owner-1", json)).toBe(true);
    // Same owner again: idempotent no-op, still OK.
    expect(await service.completeEnvelope(key, "owner-1", json)).toBe(true);
    // Another owner: refused, original untouched.
    expect(await service.completeEnvelope(key, "owner-2", json)).toBe(false);
    expect(await service.readEnvelope(key)).toBe(json);
  });

  it("refuses to overwrite a malformed envelope value", async () => {
    const { service, fake } = makeService();
    const key = service.envelopeKeyFor("hashhex", "key-9");
    fake.store.set(key, "not-json{{{");
    const json = service.encryptRefreshResponse(
      { accessToken: "a", refreshToken: "r" },
      "owner-1",
      "s1",
      "hashhex",
      "key-9",
    );
    expect(await service.completeEnvelope(key, "owner-1", json)).toBe(false);
    expect(await service.readEnvelope(key)).toBe("not-json{{{");
  });

  it("exposes the 10-second envelope TTL", () => {
    expect(REFRESH_ENVELOPE_TTL_SECONDS).toBe(10);
  });
});
