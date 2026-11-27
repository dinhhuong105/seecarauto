import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Queue, Worker, type Job, type Processor } from "bullmq";
import type Redis from "ioredis";
import { RedisService } from "../redis/redis.service";
import {
  DEFAULT_JOB_OPTIONS,
  QUEUE_NAMES,
  type QueueName,
} from "./queue-definitions";
import { processQueueTestJob } from "./queue-test.processor";

// QueueRegistryService (M02-02) — one registry for every BullMQ queue and
// worker in the backend. Queues and workers are created lazily and kept in
// maps so later tasks (M02-03, M07) reuse the same infrastructure instead
// of building their own.
//
// - Each Queue/Worker gets its OWN ioredis connection (BullMQ requirement —
//   a shared connection must never be reused, and BullMQ connections need
//   maxRetriesPerRequest: null, see RedisService.createQueueConnection).
//   The registry owns those connections and disconnects them on shutdown
//   (BullMQ's close() does not reliably close a caller-provided client).
// - The `queue-test` worker starts automatically: it is the lifecycle
//   proof queue and is harmless (it only processes `queue-test` jobs).
// - catalog-sync and seo-jobs are registered as queues only — their
//   business processors belong to M02-03 / M07.
// - onModuleDestroy closes workers first (waiting for active jobs), then
//   queues, then every connection, so no job is abandoned mid-flight and
//   no handle keeps the process alive on shutdown.

@Injectable()
export class QueueRegistryService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueRegistryService.name);
  private readonly queues = new Map<string, Queue>();
  private readonly workers = new Map<string, Worker>();
  private readonly connections: Redis[] = [];

  constructor(private readonly redis: RedisService) {}

  /** Returns the queue, creating (and registering) it on first use. */
  getQueue<T = unknown>(name: QueueName): Queue<T> {
    const existing = this.queues.get(name) as Queue<T> | undefined;
    if (existing !== undefined) return existing;
    const queue = new Queue<T>(name, {
      connection: this.trackConnection(),
      defaultJobOptions: { ...DEFAULT_JOB_OPTIONS },
    });
    this.queues.set(name, queue);
    return queue;
  }

  /**
   * Registers a worker for a queue. Each queue has at most one worker in
   * this registry — a second registration for the same queue is an error.
   */
  registerWorker<T = unknown, R = unknown>(
    name: QueueName,
    processor: Processor<T, R>,
    concurrency?: number,
  ): Worker<T, R> {
    if (this.workers.has(name)) {
      throw new Error(`Worker already registered for queue: ${name}`);
    }
    const worker = new Worker<T, R>(name, processor, {
      connection: this.trackConnection(),
      concurrency: concurrency ?? this.redis.getConfig().queueConcurrency,
    });
    worker.on("failed", (job: Job<T> | undefined, error: Error) => {
      this.logger.warn(
        `Queue ${name} job ${job?.id ?? "?"} failed: ${error.message}`,
      );
    });
    this.workers.set(name, worker);
    return worker;
  }

  /** Starts the built-in `queue-test` worker (lifecycle proof queue). */
  startQueueTestWorker(): Worker {
    return this.registerWorker(QUEUE_NAMES.queueTest, processQueueTestJob);
  }

  /** Job counts for a queue (waiting/active/completed/failed/...). */
  async getJobCounts(name: QueueName): Promise<Record<string, number>> {
    const queue = this.queues.get(name);
    if (queue === undefined) return {};
    const counts = await queue.getJobCounts();
    return counts as unknown as Record<string, number>;
  }

  /** Number of registered queues (for health reporting / tests). */
  registeredQueueCount(): number {
    return this.queues.size;
  }

  /** Number of registered workers (for health reporting / tests). */
  registeredWorkerCount(): number {
    return this.workers.size;
  }

  async onModuleDestroy(): Promise<void> {
    // Workers first (each close waits for its active jobs), then queues,
    // then every connection the registry created.
    for (const worker of this.workers.values()) {
      await worker.close().catch(() => undefined);
    }
    this.workers.clear();
    for (const queue of this.queues.values()) {
      await queue.close().catch(() => undefined);
    }
    this.queues.clear();
    for (const connection of this.connections) {
      await this.redis.disconnectClient(connection).catch(() => undefined);
    }
    this.connections.length = 0;
  }

  private trackConnection(): Redis {
    const connection = this.redis.createQueueConnection();
    this.connections.push(connection);
    return connection;
  }
}
