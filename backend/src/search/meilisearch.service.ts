import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  Meilisearch,
  type EnqueuedTask,
  type Index,
  type SearchParams,
  type SearchResponse,
} from "meilisearch";
import {
  meilisearchConfigFromService,
  type MeilisearchConfig,
} from "./meilisearch.config";
import { PRODUCT_INDEX_SETTINGS } from "./product-index.settings";
import type { ProductDocument } from "./search-document";

// Meilisearch service (M02-03) — the only place that talks to Meilisearch.
// The API key lives in the client only; it is never logged, never returned
// in a response, and never sent to the frontend (AC-03). Startup does NOT
// fail when Meilisearch is down: onModuleInit tries to ensure the index and
// only logs a warning, mirroring RedisService (M02-02) — the first indexing
// call retries instead, so a down search engine never blocks the whole
// backend from booting. Search reads (M03-08) must treat a down engine as
// 503 SERVICE_UNAVAILABLE, never fall back to PostgreSQL LIKE (brief §3).
@Injectable()
export class MeilisearchService implements OnModuleInit {
  private readonly logger = new Logger(MeilisearchService.name);
  private readonly client: Meilisearch;
  private readonly config: MeilisearchConfig;
  private indexReady = false;

  constructor(configService: ConfigService) {
    this.config = meilisearchConfigFromService(configService);
    this.client = new Meilisearch({
      host: this.config.host,
      apiKey: this.config.apiKey === "" ? undefined : this.config.apiKey,
      timeout: this.config.requestTimeoutMs,
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureIndex();
    } catch (error) {
      // Never crash boot on a down search engine; retry on first use.
      this.logger.warn(
        `Meilisearch index not ready at startup (${this.config.host}): ${error instanceof Error ? error.message : String(error)} — indexing will retry on first use.`,
      );
    }
  }

  getConfig(): MeilisearchConfig {
    return this.config;
  }

  getClient(): Meilisearch {
    return this.client;
  }

  /** True when Meilisearch answers /health with status 'available'. Never throws. */
  async health(): Promise<boolean> {
    try {
      const res = await this.client.health();
      return res.status === "available";
    } catch {
      return false;
    }
  }

  /**
   * Creates the products index (primaryKey 'id') if missing and applies
   * PRODUCT_INDEX_SETTINGS. Memoized after the first success; on failure the
   * flag stays false so the next call retries.
   */
  async ensureIndex(): Promise<void> {
    if (this.indexReady) return;
    const uid = this.config.productsIndex;
    try {
      await this.client.getIndex(uid);
    } catch (error) {
      // meilisearch-js 0.44 puts the API error code in `cause.code` and the
      // HTTP status in `response.status` (top-level `code` is undefined).
      const status = (error as { response?: { status?: number } }).response
        ?.status;
      const code = (error as { cause?: { code?: string } }).cause?.code;
      if (status !== 404 && code !== "index_not_found") throw error;
      const task = await this.client.createIndex(uid, { primaryKey: "id" });
      await this.waitTask(task);
    }
    const task = await this.client
      .index(uid)
      .updateSettings(PRODUCT_INDEX_SETTINGS);
    await this.waitTask(task);
    this.indexReady = true;
  }

  getIndex(): Index<ProductDocument> {
    return this.client.index<ProductDocument>(this.config.productsIndex);
  }

  async waitTask(task: EnqueuedTask): Promise<void> {
    await this.client.waitForTask(task.taskUid, {
      timeOutMs: this.config.taskTimeoutMs,
      intervalMs: 50,
    });
  }

  /**
   * Internal query primitive for the Search API (M03-08) and for tests.
   * This is NOT an HTTP endpoint — GET /api/v1/search belongs to M03-08.
   */
  async search(
    query: string,
    options?: SearchParams,
  ): Promise<SearchResponse<ProductDocument>> {
    await this.ensureIndex();
    return this.getIndex().search(query, options);
  }
}
