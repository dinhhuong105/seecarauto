import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MeilisearchService } from "./meilisearch.service";
import {
  isIndexable,
  toProductDocument,
  type ProductWithRelations,
} from "./search-document";

// Product indexing (M02-03) — PostgreSQL/Prisma → Meilisearch.
// Every operation re-reads the product fresh from the database at call time,
// so a job is idempotent by construction: replaying it re-indexes the
// current state, and a stale job cannot resurrect deleted data.
//   - upsert: only PUBLISHED, non-soft-deleted products (AC-14). Anything
//     else is REMOVED from the index instead of being added.
//   - delete: removing a document that is not in the index is a no-op
//     success in Meilisearch — also idempotent.
//   - rebuild: clears the whole index, then re-adds every indexable product
//     in batches. There is a short window where the index is empty; that is
//     expected for a maintenance operation (documented in MEILISEARCH.md).
// Errors from Meilisearch are NOT swallowed: the BullMQ consumer retries
// them (attempts 3, exponential backoff — DEFAULT_JOB_OPTIONS, M02-02).

const PRODUCT_INCLUDE = {
  identifiers: true,
  brand: true,
  category: true,
  productCategories: { include: { category: true } },
  fitments: { select: { vehicleApplicationId: true } },
} as const;

const REBUILD_BATCH_SIZE = 500;
const UPSERT_BATCH_SIZE = 100;

@Injectable()
export class ProductIndexService {
  private readonly logger = new Logger(ProductIndexService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly search: MeilisearchService,
  ) {}

  private async findProduct(
    productId: string,
  ): Promise<ProductWithRelations | null> {
    return this.prisma.product.findUnique({
      where: { id: productId },
      include: PRODUCT_INCLUDE,
    });
  }

  /** Index one product, or remove it when it must not be public. */
  async indexProduct(productId: string): Promise<"upserted" | "deleted"> {
    const product = await this.findProduct(productId);
    if (product === null) {
      return this.deleteProduct(productId);
    }
    if (!isIndexable(product)) {
      return this.deleteProduct(productId);
    }
    await this.search.ensureIndex();
    const task = await this.search
      .getIndex()
      .addDocuments([toProductDocument(product)]);
    await this.search.waitTask(task);
    return "upserted";
  }

  async deleteProduct(productId: string): Promise<"deleted"> {
    await this.search.ensureIndex();
    const task = await this.search.getIndex().deleteDocuments([productId]);
    await this.search.waitTask(task);
    return "deleted";
  }

  /** Re-index every product that references a category (primary or extra). */
  async syncCategory(categoryId: string): Promise<number> {
    const products = await this.prisma.product.findMany({
      where: {
        OR: [{ categoryId }, { productCategories: { some: { categoryId } } }],
      },
      select: { id: true },
    });
    for (const { id } of products) {
      await this.indexProduct(id);
    }
    return products.length;
  }

  /** Re-index every product of a brand (name/slug change). */
  async syncBrand(brandId: string): Promise<number> {
    const products = await this.prisma.product.findMany({
      where: { brandId },
      select: { id: true },
    });
    for (const { id } of products) {
      await this.indexProduct(id);
    }
    return products.length;
  }

  /**
   * Full rebuild: clear the index, then re-add every indexable product.
   * Returns how many products were scanned and how many were indexed.
   */
  async rebuildIndex(): Promise<{ total: number; upserted: number }> {
    await this.search.ensureIndex();
    const index = this.search.getIndex();
    const clearTask = await index.deleteAllDocuments();
    await this.search.waitTask(clearTask);

    let total = 0;
    let upserted = 0;
    let skip = 0;
    for (;;) {
      const batch = await this.prisma.product.findMany({
        skip,
        take: REBUILD_BATCH_SIZE,
        include: PRODUCT_INCLUDE,
        orderBy: { createdAt: "asc" },
      });
      if (batch.length === 0) break;
      total += batch.length;
      skip += batch.length;
      const docs = batch
        .filter((p) => isIndexable(p))
        .map((p) => toProductDocument(p));
      for (let i = 0; i < docs.length; i += UPSERT_BATCH_SIZE) {
        const task = await index.addDocuments(
          docs.slice(i, i + UPSERT_BATCH_SIZE),
        );
        await this.search.waitTask(task);
      }
      upserted += docs.length;
    }
    this.logger.log(`Rebuild finished: ${upserted}/${total} products indexed.`);
    return { total, upserted };
  }
}
