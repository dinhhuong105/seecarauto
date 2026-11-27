import { Module, OnModuleInit } from "@nestjs/common";
import { RedisModule } from "../redis/redis.module";
import { QUEUE_NAMES } from "./queue-definitions";
import { QueueRegistryService } from "./queue.service";

// QueueModule (M02-02) — BullMQ infrastructure for the backend.
// On startup it registers the three queues (catalog-sync, seo-jobs,
// queue-test) and starts the queue-test worker. catalog-sync and seo-jobs
// have no business processor yet — those belong to M02-03 / M07.
@Module({
  imports: [RedisModule],
  providers: [QueueRegistryService],
  exports: [QueueRegistryService],
})
export class QueueModule implements OnModuleInit {
  constructor(private readonly queues: QueueRegistryService) {}

  onModuleInit(): void {
    this.queues.getQueue(QUEUE_NAMES.catalogSync);
    this.queues.getQueue(QUEUE_NAMES.seoJobs);
    this.queues.getQueue(QUEUE_NAMES.queueTest);
    this.queues.startQueueTestWorker();
  }
}
