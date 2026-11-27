import {
  buildMeilisearchConfig,
  validateMeilisearchEnv,
} from "./meilisearch.config";

describe("buildMeilisearchConfig", () => {
  it("defaults to localhost:7700, products index, 5s/10s timeouts", () => {
    const cfg = buildMeilisearchConfig({});
    expect(cfg.host).toBe("http://localhost:7700");
    expect(cfg.apiKey).toBe("");
    expect(cfg.productsIndex).toBe("products");
    expect(cfg.requestTimeoutMs).toBe(5000);
    expect(cfg.taskTimeoutMs).toBe(10000);
  });

  it("accepts explicit values", () => {
    const cfg = buildMeilisearchConfig({
      MEILISEARCH_HOST: "https://ms.example.com",
      MEILISEARCH_API_KEY: "secret-key",
      MEILISEARCH_PRODUCTS_INDEX: "products_v2",
      MEILISEARCH_REQUEST_TIMEOUT_MS: "2000",
      MEILISEARCH_TASK_TIMEOUT_MS: "30000",
    });
    expect(cfg.host).toBe("https://ms.example.com");
    expect(cfg.apiKey).toBe("secret-key");
    expect(cfg.productsIndex).toBe("products_v2");
    expect(cfg.requestTimeoutMs).toBe(2000);
    expect(cfg.taskTimeoutMs).toBe(30000);
  });

  it("rejects a host without http(s) scheme", () => {
    expect(() =>
      buildMeilisearchConfig({ MEILISEARCH_HOST: "localhost:7700" }),
    ).toThrow("MEILISEARCH_HOST must start with http:// or https://");
  });

  it("allows an empty API key on a local host", () => {
    expect(
      buildMeilisearchConfig({ MEILISEARCH_HOST: "http://127.0.0.1:7701" })
        .apiKey,
    ).toBe("");
  });

  it("requires an API key on a non-local host", () => {
    expect(() =>
      buildMeilisearchConfig({ MEILISEARCH_HOST: "https://ms.example.com" }),
    ).toThrow("MEILISEARCH_API_KEY is required for a non-local");
  });

  it("rejects an index name with illegal characters", () => {
    expect(() =>
      buildMeilisearchConfig({ MEILISEARCH_PRODUCTS_INDEX: "products v2" }),
    ).toThrow("MEILISEARCH_PRODUCTS_INDEX must be letters, digits, - or _");
  });

  it("rejects non-positive timeouts", () => {
    expect(() =>
      buildMeilisearchConfig({ MEILISEARCH_REQUEST_TIMEOUT_MS: "0" }),
    ).toThrow("must be a positive integer");
    expect(() =>
      buildMeilisearchConfig({ MEILISEARCH_TASK_TIMEOUT_MS: "-5" }),
    ).toThrow("must be a positive integer");
  });
});

describe("validateMeilisearchEnv", () => {
  it("passes valid config through unchanged", () => {
    const input = { MEILISEARCH_HOST: "http://localhost:7700" };
    expect(validateMeilisearchEnv(input)).toBe(input);
  });

  it("throws on malformed config", () => {
    expect(() =>
      validateMeilisearchEnv({ MEILISEARCH_HOST: "ftp://x" }),
    ).toThrow("MEILISEARCH_HOST must start with http:// or https://");
  });
});
