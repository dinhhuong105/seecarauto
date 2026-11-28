import {
  ARGON2_HASH_LENGTH,
  ARGON2_MEMORY_KIB,
  ARGON2_PARALLELISM,
  ARGON2_TIME_COST,
  DUMMY_PASSWORD_HASH,
  PasswordService,
} from "./password.service";

describe("PasswordService (Argon2id, D-07/D-13)", () => {
  const service = new PasswordService();

  it("uses the OWASP parameters (19 MiB, t=2, p=1, hash length 32)", () => {
    expect(ARGON2_MEMORY_KIB).toBe(19 * 1024);
    expect(ARGON2_TIME_COST).toBe(2);
    expect(ARGON2_PARALLELISM).toBe(1);
    expect(ARGON2_HASH_LENGTH).toBe(32);
  });

  it("hashes and verifies a password (round-trip)", async () => {
    const hash = await service.hash("correct horse battery staple");
    expect(hash).toContain("$argon2id$");
    expect(hash).toContain("m=19456,t=2,p=1");
    expect(await service.verify(hash, "correct horse battery staple")).toBe(
      true,
    );
  });

  it("rejects a wrong password", async () => {
    const hash = await service.hash("correct horse battery staple");
    expect(await service.verify(hash, "wrong password")).toBe(false);
  });

  it("returns false (never throws) for a malformed hash", async () => {
    expect(await service.verify("not-a-hash", "anything")).toBe(false);
    expect(await service.verify("", "anything")).toBe(false);
  });

  it("the dummy hash uses the same OWASP parameters and never verifies", async () => {
    expect(DUMMY_PASSWORD_HASH).toContain("$argon2id$");
    expect(DUMMY_PASSWORD_HASH).toContain("m=19456,t=2,p=1");
    expect(await service.verifyDummy("any-password")).toBe(false);
    expect(await service.verifyDummy("password")).toBe(false);
  });
});
