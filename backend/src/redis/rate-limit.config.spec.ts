import { RATE_LIMIT_LUA_SCRIPT, RATE_LIMIT_RULES } from "./rate-limit.service";

// Limits must match API_SPEC §16 exactly — any drift is a contract change.
describe("Rate limit rules (API_SPEC §16)", () => {
  it("matches every limit and window in the spec", () => {
    expect(RATE_LIMIT_RULES.publicGet).toEqual({
      limit: 100,
      windowSeconds: 60,
      policy: "fail-open",
    });
    expect(RATE_LIMIT_RULES.publicWrite).toEqual({
      limit: 30,
      windowSeconds: 60,
      policy: "fail-open",
    });
    expect(RATE_LIMIT_RULES.adminLoginIp).toEqual({
      limit: 5,
      windowSeconds: 60,
      policy: "fail-closed",
    });
    expect(RATE_LIMIT_RULES.adminLoginAccount).toEqual({
      limit: 10,
      windowSeconds: 60,
      policy: "fail-closed",
    });
    expect(RATE_LIMIT_RULES.orderLookupIp).toEqual({
      limit: 10,
      windowSeconds: 60,
      policy: "fail-closed",
    });
    expect(RATE_LIMIT_RULES.orderLookupCode).toEqual({
      limit: 5,
      windowSeconds: 60,
      policy: "fail-closed",
    });
    expect(RATE_LIMIT_RULES.search).toEqual({
      limit: 60,
      windowSeconds: 60,
      policy: "fail-open",
    });
    expect(RATE_LIMIT_RULES.contact).toEqual({
      limit: 5,
      windowSeconds: 3600,
      policy: "fail-closed",
    });
    expect(RATE_LIMIT_RULES.createOrder).toEqual({
      limit: 10,
      windowSeconds: 60,
      policy: "fail-closed",
    });
    expect(RATE_LIMIT_RULES.adminAuthed).toEqual({
      limit: 300,
      windowSeconds: 60,
      policy: "fail-open",
    });
  });

  it("counts atomically in one Lua script (INCR + EXPIRE + TTL)", () => {
    expect(RATE_LIMIT_LUA_SCRIPT).toContain("INCR");
    expect(RATE_LIMIT_LUA_SCRIPT).toContain("EXPIRE");
    expect(RATE_LIMIT_LUA_SCRIPT).toContain("TTL");
    // No separate INCR/EXPIRE round trips — the script is the atomic unit.
    expect(RATE_LIMIT_LUA_SCRIPT).not.toContain("SET");
  });
});
