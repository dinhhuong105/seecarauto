import { Injectable, Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import type { CatalogSyncJobData } from "../queue/queue-definitions";
import { ProductIndexService } from "./product-index.service";

// catalog-sync consumer (M02-03) — the business side of the queue whose
// infrastructure + payload contract M02-02 provided (INT-004).
// Payload: { entityType: 'product' | 'category' | 'brand',
//            entityId, action: 'upsert' | 'delete', updatedAt }.
// The processor re-reads fresh data from PostgreSQL at process time, so a
// retried or stale job just re-indexes the current state — never resurrects
// deleted data and never creates duplicate documents (upsert is by primary
// key `id`). A product 'delete' removes it from the index; a product that no
// longer exists in PostgreSQL is also removed by the 'upsert' path.
// Payloads carry no credentials, tokens or PII (Task Brief §5, M02-02).
@Injectable()
export class CatalogSyncProcessor {
  private readonly logger = new Logger(CatalogSyncProcessor.name);

  constructor(private readonly products: ProductIndexService) {}

  async process(job: Job<CatalogSyncJobData>): Promise<string> {
    const { entityType, entityId, action } = job.data;
    this.logger.log(
      `catalog-sync job ${job.id}: ${entityType} ${entityId} ${action}`,
    );
    if (entityType === "product") {
      if (action === "delete") {
        return this.products.deleteProduct(entityId);
      }
      return this.products.indexProduct(entityId);
    }
    if (entityType === "category") {
      const count = await this.products.syncCategory(entityId);
      return `category-synced:${count}`;
    }
    const count = await this.products.syncBrand(entityId);
    return `brand-synced:${count}`;
  }
}
