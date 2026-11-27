import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { QueueRegistryService } from "../src/queue/queue.service";
import {
  DEFAULT_JOB_OPTIONS,
  QUEUE_NAMES,
} from "../src/queue/queue-definitions";
import { MeilisearchService } from "../src/search/meilisearch.service";
import { ProductIndexService } from "../src/search/product-index.service";
import { CatalogSyncProcessor } from "../src/search/catalog-sync.processor";
import { buildMeilisearchConfig } from "../src/search/meilisearch.config";
import type { CatalogSyncJobData } from "../src/queue/queue-definitions";

// Meilisearch E2E (M02-03) — real Meilisearch 1.11.3 (binary on port 7701),
// real PostgreSQL test DB, real Redis on 6399 (BullMQ).
// FAILS LOUDLY when the test Meilisearch or Redis is unreachable: no silent
// skip, no mock substitution (Task Brief §7).
// Seeded data is clearly-labeled fake data (brand Aisin, category Engine,
// Toyota Vios 2020, generic part codes) — never real business data.
// NOTE: the app's RedisService reads REDIS_URL from process.env. It is set
// here (this spec's jest worker only) instead of in .env.test — because
// Nest's ConfigService lets process.env override a passed-in config object,
// a REDIS_URL in .env.test would break the M02-02 fault-injection tests
// that point a service at a dead port (redis.e2e-spec.ts).
jest.setTimeout(30000);

process.env.REDIS_URL = "redis://127.0.0.1:6399";

const MEILISEARCH_TEST_URL = "http://127.0.0.1:7701";

async function waitFor<T>(
  check: () => Promise<T | null>,
  label: string,
  timeoutMs = 10000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const found = await check().catch(() => null);
    if (found !== null && found !== undefined) return found;
    if (Date.now() > deadline)
      throw new Error(`Timed out waiting for: ${label}`);
    await new Promise((r) => setTimeout(r, 200));
  }
}

describe("Meilisearch (e2e, real server)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let search: MeilisearchService;
  let products: ProductIndexService;
  let queues: QueueRegistryService;

  let brandId: string;
  let categoryId: string;
  let makeId: string;
  let applicationId: string;

  async function seedProduct(data: {
    sku: string;
    name: string;
    slug: string;
    price: number;
    status?: "DRAFT" | "PUBLISHED" | "HIDDEN";
    identifiers?: { type: string; value: string; normalized: string }[];
    withFitment?: boolean;
    // Override the suite's default category, or add secondary categories
    // (productCategories) — used by the AC-11 category filter tests.
    categoryId?: string;
    extraCategoryIds?: string[];
  }): Promise<string> {
    const product = await prisma.product.create({
      data: {
        sku: data.sku,
        name: data.name,
        slug: data.slug,
        brandId,
        categoryId: data.categoryId ?? categoryId,
        status: data.status ?? "PUBLISHED",
        availabilityStatus: "IN_STOCK",
        price: data.price,
        publishedAt: new Date("2026-11-20T00:00:00Z"),
        productCategories: data.extraCategoryIds?.length
          ? {
              create: data.extraCategoryIds.map((extraCategoryId) => ({
                categoryId: extraCategoryId,
              })),
            }
          : undefined,
        identifiers: {
          create: (data.identifiers ?? []).map((i) => ({
            identifierType: i.type as never,
            identifierValue: i.value,
            normalizedValue: i.normalized,
            // PD-04 issuer matrix: OEM_NUMBER requires a make issuer,
            // MANUFACTURER_PART_NUMBER requires a brand issuer.
            issuingMakeId: i.type === "OEM_NUMBER" ? makeId : null,
            issuingBrandId:
              i.type === "MANUFACTURER_PART_NUMBER" ? brandId : null,
            isPrimary: true,
          })),
        },
        fitments: data.withFitment
          ? { create: [{ vehicleApplicationId: applicationId }] }
          : undefined,
      },
    });
    return product.id;
  }

  beforeAll(async () => {
    // Fail loudly when the test Meilisearch is down.
    const res = await fetch(`${MEILISEARCH_TEST_URL}/health`).catch(() => null);
    if (!res || !res.ok) {
      throw new Error(
        `Test Meilisearch is not reachable at ${MEILISEARCH_TEST_URL} — start it first (see docs/infrastructure/MEILISEARCH.md).`,
      );
    }
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    search = app.get(MeilisearchService);
    products = app.get(ProductIndexService);
    queues = app.get(QueueRegistryService);
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    // Clean slate: empty the index + truncate all app tables.
    await search.ensureIndex();
    const clearTask = await search.getIndex().deleteAllDocuments();
    await search.waitTask(clearTask);
    const tables = [
      "order_items",
      "orders",
      "product_vehicle_fitments",
      "fitment_change_logs",
      "product_identifiers",
      "product_categories",
      "product_images",
      "product_specifications",
      "products",
      "vehicle_applications",
      "vehicle_variants",
      "vehicle_generations",
      "vehicle_models",
      "vehicle_makes",
      "categories",
      "brands",
      "url_redirects",
      "articles",
      "article_seo",
      "audit_logs",
      "admin_refresh_sessions",
      "user_permissions",
      "user_roles",
      "role_permissions",
      "permissions",
      "roles",
      "users",
    ];
    await prisma.$executeRawUnsafe(
      `TRUNCATE ${tables.map((t) => `"${t}"`).join(", ")} CASCADE`,
    );
    const brand = await prisma.brand.create({
      data: { name: "Aisin", slug: "aisin" },
    });
    brandId = brand.id;
    const category = await prisma.category.create({
      data: { name: "Engine", slug: "engine" },
    });
    categoryId = category.id;
    const make = await prisma.vehicleMake.create({
      data: { name: "Toyota", slug: "toyota" },
    });
    makeId = make.id;
    const model = await prisma.vehicleModel.create({
      data: { name: "Vios", slug: "vios", makeId: make.id },
    });
    const generation = await prisma.vehicleGeneration.create({
      data: {
        name: "Vios 2018",
        slug: "vios-2018",
        modelId: model.id,
        yearFrom: 2018,
        yearTo: 2023,
      },
    });
    const application = await prisma.vehicleApplication.create({
      data: {
        makeId: make.id,
        modelId: model.id,
        generationId: generation.id,
        year: 2020,
      },
    });
    applicationId = application.id;
  });

  it("health() is true when Meilisearch is up, false on a dead host", async () => {
    expect(await search.health()).toBe(true);
    const dead = new MeilisearchService({
      get: (key: string) =>
        key === "MEILISEARCH_HOST" ? "http://127.0.0.1:7799" : undefined,
    } as unknown as ConfigService);
    expect(await dead.health()).toBe(false);
  });

  it("ensureIndex creates the products index with ADR-010 settings (AC-05)", async () => {
    await search.ensureIndex();
    const settings = await search.getIndex().getSettings();
    expect(settings.searchableAttributes).toEqual([
      "sku",
      "oemCodes",
      "mpnCodes",
      "partCodes",
      "alternateCodes",
      "name",
      "brandName",
      "categoryName",
    ]);
    expect(settings.typoTolerance?.disableOnAttributes).toEqual(
      expect.arrayContaining(["sku", "oemCodes", "mpnCodes"]),
    );
    expect(settings.typoTolerance?.minWordSizeForTypos).toEqual({
      oneTypo: 5,
      twoTypos: 255,
    });
    expect(settings.filterableAttributes).toEqual(
      expect.arrayContaining([
        "categorySlug",
        "brandSlug",
        "vehicleApplicationIds",
      ]),
    );
    expect(settings.sortableAttributes).toEqual(
      expect.arrayContaining(["price", "publishedAt"]),
    );
  });

  it("SKU exact match ranks above a name match for the same code (AC-07)", async () => {
    const skuId = await seedProduct({
      sku: "PUMP001",
      name: "Water Pump Standard",
      slug: "water-pump-standard",
      price: 1000000,
    });
    await seedProduct({
      sku: "OTHER999",
      name: "PUMP001 Special",
      slug: "pump001-special",
      price: 2000000,
    });
    await products.indexProduct(skuId);
    const otherId = await prisma.product.findUniqueOrThrow({
      where: { sku: "OTHER999" },
      select: { id: true },
    });
    await products.indexProduct(otherId.id);

    const res = await search.search("PUMP001");
    expect(res.hits.length).toBe(2);
    expect(res.hits[0].id).toBe(skuId);
  });

  it("OEM/MPN exact match works; a 1-char-off OEM is NOT an exact match (AC-08, AC-09)", async () => {
    const id = await seedProduct({
      sku: "AISINWPT001",
      name: "Water Pump Aisin",
      slug: "water-pump-aisin",
      price: 1250000,
      identifiers: [
        { type: "OEM_NUMBER", value: "16100-0Y010", normalized: "161000Y010" },
        {
          type: "MANUFACTURER_PART_NUMBER",
          value: "WPT-001",
          normalized: "WPT001",
        },
      ],
      withFitment: true,
    });
    await products.indexProduct(id);

    const byOem = await search.search("161000Y010");
    expect(byOem.hits.map((h) => h.id)).toContain(id);
    const byMpn = await search.search("WPT001");
    expect(byMpn.hits.map((h) => h.id)).toContain(id);
    // One wrong character in the OEM code: typo tolerance is 0 on code
    // fields, so this must NOT match the product.
    const offByOne = await search.search("161000Y011");
    expect(offByOne.hits.map((h) => h.id)).not.toContain(id);
    expect(offByOne.hits.length).toBe(0);
  });

  it("name/brand allow one typo for long words (AC-10)", async () => {
    const id = await seedProduct({
      sku: "AISINWPT001",
      name: "Water Pump Aisin",
      slug: "water-pump-aisin",
      price: 1250000,
    });
    await products.indexProduct(id);
    // 'Watre' is 'Water' with one transposed letter (5 letters, 1 typo).
    const res = await search.search("Watre Pump");
    expect(res.hits.map((h) => h.id)).toContain(id);
  });

  it("filters by brand, category and fitment; sorts by price (AC-11)", async () => {
    const brakes = await prisma.category.create({
      data: { name: "Brakes", slug: "brakes" },
    });
    const cooling = await prisma.category.create({
      data: { name: "Cooling", slug: "cooling" },
    });
    const cheapId = await seedProduct({
      sku: "CHEAP001",
      name: "Cheap Gasket",
      slug: "cheap-gasket",
      price: 50000,
      withFitment: true,
    });
    const expensiveId = await seedProduct({
      sku: "EXP001",
      name: "Expensive Turbo",
      slug: "expensive-turbo",
      price: 9000000,
    });
    const brakeId = await seedProduct({
      sku: "BRK001",
      name: "Brake Pad",
      slug: "brake-pad",
      price: 300000,
      categoryId: brakes.id,
    });
    // Primary category stays Engine; Cooling is a secondary category.
    const cooledId = await seedProduct({
      sku: "COOL001",
      name: "Coolant Hose",
      slug: "coolant-hose",
      price: 120000,
      extraCategoryIds: [cooling.id],
    });
    await products.indexProduct(cheapId);
    await products.indexProduct(expensiveId);
    await products.indexProduct(brakeId);
    await products.indexProduct(cooledId);

    const byBrand = await search.search("", {
      filter: "brandSlug = aisin",
    });
    expect(byBrand.hits.map((h) => h.id)).toEqual(
      expect.arrayContaining([cheapId, expensiveId, brakeId, cooledId]),
    );
    // categorySlug (primary category): Engine products only — the Brakes
    // product must NOT appear.
    const byCategory = await search.search("", {
      filter: "categorySlug = engine",
    });
    expect(byCategory.hits.map((h) => h.id)).toEqual(
      expect.arrayContaining([cheapId, expensiveId, cooledId]),
    );
    expect(byCategory.hits.map((h) => h.id)).not.toContain(brakeId);
    const byBrakes = await search.search("", {
      filter: "categorySlug = brakes",
    });
    expect(byBrakes.hits.map((h) => h.id)).toEqual([brakeId]);
    // categorySlugs (primary + secondary): only the product with Cooling
    // as a secondary category matches.
    const bySecondary = await search.search("", {
      filter: "categorySlugs = cooling",
    });
    expect(bySecondary.hits.map((h) => h.id)).toEqual([cooledId]);
    const byFitment = await search.search("", {
      filter: `vehicleApplicationIds = ${applicationId}`,
    });
    expect(byFitment.hits.map((h) => h.id)).toEqual([cheapId]);
    const sorted = await search.search("", { sort: ["price:asc"] });
    expect(sorted.hits.map((h) => h.id)).toEqual([
      cheapId,
      cooledId,
      brakeId,
      expensiveId,
    ]);
  });

  it("upsert, delete and rebuild work (AC-12)", async () => {
    const id = await seedProduct({
      sku: "UPD001",
      name: "Updatable Part",
      slug: "updatable-part",
      price: 100000,
    });
    expect(await products.indexProduct(id)).toBe("upserted");
    let res = await search.search("UPD001");
    expect(res.hits.map((h) => h.id)).toContain(id);

    // Price change → re-index updates the document.
    await prisma.product.update({
      where: { id },
      data: { price: 150000 },
    });
    await products.indexProduct(id);
    res = await search.search("UPD001");
    expect(res.hits.find((h) => h.id === id)?.price).toBe(150000);

    expect(await products.deleteProduct(id)).toBe("deleted");
    res = await search.search("UPD001");
    expect(res.hits.map((h) => h.id)).not.toContain(id);

    // Rebuild brings the (still PUBLISHED) product back.
    const rebuilt = await products.rebuildIndex();
    expect(rebuilt.total).toBe(1);
    expect(rebuilt.upserted).toBe(1);
    res = await search.search("UPD001");
    expect(res.hits.map((h) => h.id)).toContain(id);
  });

  it("hidden, draft and soft-deleted products never enter the public index (AC-14)", async () => {
    const draftId = await seedProduct({
      sku: "DRAFT001",
      name: "Draft Part",
      slug: "draft-part",
      price: 1000,
      status: "DRAFT",
    });
    const hiddenId = await seedProduct({
      sku: "HID001",
      name: "Hidden Part",
      slug: "hidden-part",
      price: 1000,
      status: "HIDDEN",
    });
    const liveId = await seedProduct({
      sku: "LIVE001",
      name: "Live Part",
      slug: "live-part",
      price: 1000,
    });
    await products.indexProduct(liveId);
    expect(await products.indexProduct(draftId)).toBe("deleted");
    expect(await products.indexProduct(hiddenId)).toBe("deleted");
    // Soft-delete the live product → indexing removes it.
    await prisma.product.update({
      where: { id: liveId },
      data: { deletedAt: new Date() },
    });
    expect(await products.indexProduct(liveId)).toBe("deleted");

    const docs = await search.getIndex().getDocuments({ limit: 100 });
    expect(docs.results.map((d) => d.id)).toEqual([]);
    const res = await search.search("");
    expect(res.hits.length).toBe(0);
  });

  it("catalog-sync BullMQ job indexes a product end-to-end and is idempotent (AC-13)", async () => {
    const id = await seedProduct({
      sku: "QUEUE001",
      name: "Queued Part",
      slug: "queued-part",
      price: 70000,
      identifiers: [
        { type: "OEM_NUMBER", value: "99999-ABC", normalized: "99999ABC" },
      ],
    });
    const queue = queues.getQueue(QUEUE_NAMES.catalogSync);
    const job = await queue.add("catalog-sync", {
      entityType: "product",
      entityId: id,
      action: "upsert",
      updatedAt: new Date().toISOString(),
    } satisfies CatalogSyncJobData);
    // BullMQ default job options: 3 attempts, exponential backoff from 1s.
    expect(job.opts.attempts).toBe(3);

    await waitFor(async () => {
      const res = await search.search("QUEUE001");
      return res.hits.some((h) => h.id === id) ? true : null;
    }, "catalog-sync job to index QUEUE001");

    // Replaying the same upsert must not create a duplicate document.
    await queue.add("catalog-sync", {
      entityType: "product",
      entityId: id,
      action: "upsert",
      updatedAt: new Date().toISOString(),
    } satisfies CatalogSyncJobData);
    await new Promise((r) => setTimeout(r, 1500));
    const docs = await search.getIndex().getDocuments({ limit: 100 });
    expect(docs.results.filter((d) => d.id === id).length).toBe(1);
    expect(docs.total).toBe(1);
  });

  it("catalog-sync job really retries after a transient failure and completes with one document (AC-13, Revision 01)", async () => {
    const id = await seedProduct({
      sku: "RETRY001",
      name: "Retry Part",
      slug: "retry-part",
      price: 80000,
    });
    // Real BullMQ queue + worker on the REAL test Redis, and the REAL
    // CatalogSyncProcessor doing the work — the queue is not mocked. Only
    // the failure itself is simulated: the first processor call throws a
    // controlled transient error, then BullMQ must retry it.
    // DB 2 on purpose: redis.e2e-spec.ts FLUSHDBs DB 0 and
    // queue.e2e-spec.ts FLUSHDBs DB 1 in parallel jest workers, so neither
    // is safe for a job that must survive across its retry window.
    // maxRetriesPerRequest: null is REQUIRED by BullMQ for worker
    // (blocking) connections — a plain `new IORedis(url)` (default 20)
    // makes `new Worker` throw "maxRetriesPerRequest must be null".
    // (Same option RedisService.createQueueConnection() applies.)
    // Construction lives INSIDE the try/finally below: if `new Worker`
    // throws, the queue + connections must still be closed, or their
    // timers keep jest's event loop alive and the run never finishes.
    let queueConnection: IORedis | undefined;
    let workerConnection: IORedis | undefined;
    let queue: Queue<CatalogSyncJobData> | undefined;
    let worker: Worker<CatalogSyncJobData> | undefined;
    try {
      queueConnection = new IORedis("redis://127.0.0.1:6399/2", {
        maxRetriesPerRequest: null,
      });
      workerConnection = new IORedis("redis://127.0.0.1:6399/2", {
        maxRetriesPerRequest: null,
      });
      queue = new Queue<CatalogSyncJobData>("catalog-sync-retry-test", {
        connection: queueConnection,
        defaultJobOptions: { ...DEFAULT_JOB_OPTIONS },
      });
      let processorCalls = 0;
      const processor = app.get(CatalogSyncProcessor);
      worker = new Worker<CatalogSyncJobData>(
        "catalog-sync-retry-test",
        async (job) => {
          processorCalls += 1;
          if (processorCalls === 1) {
            throw new Error("transient failure (controlled test)");
          }
          return processor.process(job);
        },
        { connection: workerConnection },
      );
      const job = await queue.add("catalog-sync", {
        entityType: "product",
        entityId: id,
        action: "upsert",
        updatedAt: new Date().toISOString(),
      } satisfies CatalogSyncJobData);
      await waitFor(async () => {
        const current = await queue!.getJob(job.id as string);
        return (await current?.getState()) === "completed" ? true : null;
      }, "retry test job to complete");
      const finished = await queue!.getJob(job.id as string);
      // attemptsMade counts attempts performed: 1 failure + 1 success = 2.
      // This proves BullMQ actually retried — it is not just the configured
      // attempts: 3 on the job options.
      expect(finished?.attemptsMade).toBe(2);
      expect(processorCalls).toBe(2);
      expect(finished?.returnvalue).toBe("upserted");
      const docs = await search.getIndex().getDocuments({ limit: 100 });
      expect(docs.results.filter((d) => d.id === id).length).toBe(1);
      expect(docs.total).toBe(1);
    } finally {
      await worker?.close().catch(() => undefined);
      await queue?.close().catch(() => undefined);
      await queueConnection?.quit().catch(() => undefined);
      await workerConnection?.quit().catch(() => undefined);
    }
  });

  it("Meilisearch config validates the test environment (AC-02)", () => {
    const cfg = buildMeilisearchConfig({
      MEILISEARCH_HOST: process.env.MEILISEARCH_HOST,
      MEILISEARCH_API_KEY: process.env.MEILISEARCH_API_KEY,
    });
    expect(cfg.host).toBe(MEILISEARCH_TEST_URL);
    expect(cfg.productsIndex).toBe("products");
    expect(search.getConfig().host).toBe(MEILISEARCH_TEST_URL);
  });
});
