import { Module, OnModuleInit } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import {
  QUEUE_NAMES,
  type CatalogSyncJobData,
} from "../queue/queue-definitions";
import { QueueModule } from "../queue/queue.module";
import { QueueRegistryService } from "../queue/queue.service";
import { CatalogSyncProcessor } from "./catalog-sync.processor";
import { MeilisearchService } from "./meilisearch.service";
import { ProductIndexService } from "./product-index.service";

// SearchModule (M02-03) — Meilisearch infrastructure + Product Index.
// Registers the catalog-sync BullMQ worker here (the queue itself is created
// by QueueModule.onModuleInit, which runs before this module's onModuleInit
// because QueueModule is imported earlier in AppModule).
// No HTTP endpoints in this module: GET /api/v1/search belongs to M03-08.
@Module({
  imports: [PrismaModule, QueueModule],
  providers: [MeilisearchService, ProductIndexService, CatalogSyncProcessor],
  exports: [MeilisearchService, ProductIndexService],
})
export class SearchModule implements OnModuleInit {
  constructor(
    private readonly queues: QueueRegistryService,
    private readonly processor: CatalogSyncProcessor,
  ) {}

  onModuleInit(): void {
    this.queues.registerWorker<CatalogSyncJobData>(
      QUEUE_NAMES.catalogSync,
      (job) => this.processor.process(job),
    );
  }
}
