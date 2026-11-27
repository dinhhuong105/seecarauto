import { Test, type TestingModule } from "@nestjs/testing";

// AC-13: missing/short/duplicate JWT secrets or a bad idempotency
// encryption key -> the app fails fast at boot with a clear message.
//
// Why this spec works the way it does:
//  - `ConfigModule.forRoot()` snapshots `process.env` at IMPORT time of
//    AppModule, and `ConfigService.get()` prefers that validated env — so
//    mutating `process.env` after the import cannot change the config, and
//    the backend `.env` file would also supply the secrets. Each test
//    therefore scrubs `process.env`, stubs `fs.readFileSync` for the `.env`
//    file so it contributes nothing, and re-requires `AppModule` fresh via
//    `jest.resetModules()`.
//  - `ConfigModule.forRoot` is ASYNC: a validate throw becomes a REJECTED
//    PROMISE, not a synchronous throw. Requiring AppModule alone never
//    throws — the rejection stays unhandled and Node crashes. Nest's
//    compiler awaits the dynamic-module promise, so the test must
//    `await Test.createTestingModule(...).compile()` and assert the
//    rejection with `rejects.toThrow(...)` (verified 2026-11-27: a bare
//    require + toThrow crashes the worker with an unhandled rejection).
//  - The control test compiles the module but does NOT call `app.init()`:
//    `onModuleInit` starts the BullMQ `queue-test` worker, and closing a
//    just-started app races the worker's `RedisConnection.init()` —
//    BullMQ then emits an unhandled "Connection is closed" error and the
//    worker exits 1 (deterministic, verified 2026-11-27). A full boot with
//    a valid env is already proven by `auth.e2e-spec.ts` (app boots in
//    beforeAll and serves 37 tests); this control only needs to prove the
//    valid config passes validation and the module graph wires up.
// Separate file: it mutates process.env and the module registry, so it
// must not share a worker with the auth suite (jest runs each spec file
// in its own worker).
describe("Auth configuration fail-fast at boot (AC-13)", () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeAll(() => {
    for (const key of [
      "JWT_SECRET",
      "JWT_REFRESH_SECRET",
      "JWT_EXPIRES_IN",
      "JWT_REFRESH_EXPIRES_IN",
      "REFRESH_IDEMPOTENCY_ENCRYPTION_KEY",
    ]) {
      savedEnv[key] = process.env[key];
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  function freshAppModule(): unknown {
    // The .env file must not contribute values: stub its read to empty.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs") as typeof import("node:fs");
    const originalRead = fs.readFileSync;
    jest.spyOn(fs, "readFileSync").mockImplementation(((
      path: unknown,
      ...args: unknown[]
    ) => {
      if (typeof path === "string" && path.endsWith(".env")) {
        return "";
      }
      return (originalRead as (...a: unknown[]) => unknown)(path, ...args);
    }) as typeof fs.readFileSync);
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AppModule } = require("../src/app.module") as {
      AppModule: unknown;
    };
    return AppModule;
  }

  async function compileFresh(): Promise<TestingModule> {
    const AppModule = freshAppModule();
    return Test.createTestingModule({
      imports: [AppModule as never],
    }).compile();
  }

  it("boots with a valid env (control)", async () => {
    const moduleFixture = await compileFresh();
    await moduleFixture.close();
  });

  it("missing JWT_SECRET -> boot fails with a clear message", async () => {
    delete process.env.JWT_SECRET;
    await expect(compileFresh()).rejects.toThrow(/JWT_SECRET is required/);
  });

  it("missing JWT_REFRESH_SECRET -> boot fails", async () => {
    delete process.env.JWT_REFRESH_SECRET;
    await expect(compileFresh()).rejects.toThrow(
      /JWT_REFRESH_SECRET is required/,
    );
  });

  it("secret shorter than 32 characters -> boot fails", async () => {
    process.env.JWT_SECRET = "too-short";
    await expect(compileFresh()).rejects.toThrow(/at least 32 characters/);
  });

  it("identical access and refresh secrets -> boot fails", async () => {
    process.env.JWT_REFRESH_SECRET = process.env.JWT_SECRET;
    await expect(compileFresh()).rejects.toThrow(/must differ/);
  });

  it("missing idempotency encryption key -> boot fails", async () => {
    delete process.env.REFRESH_IDEMPOTENCY_ENCRYPTION_KEY;
    await expect(compileFresh()).rejects.toThrow(
      /REFRESH_IDEMPOTENCY_ENCRYPTION_KEY is required/,
    );
  });

  it("encryption key that is not 32 bytes -> boot fails", async () => {
    process.env.REFRESH_IDEMPOTENCY_ENCRYPTION_KEY = Buffer.alloc(
      16,
      1,
    ).toString("base64");
    await expect(compileFresh()).rejects.toThrow(/exactly 32 bytes/);
  });
});
