import { Queue, Worker } from "bullmq";
import { ConfigService } from "@nestjs/config";
import {
  DEFAULT_JOB_OPTIONS,
  QUEUE_NAMES,
  type QueueTestJobData,
} from "../src/queue/queue-definitions";
import { QueueRegistryService } from "../src/queue/queue.service";
import { RedisService } from "../src/redis/redis.service";

// BullMQ integration tests against a REAL Redis (M02-02, Task Brief §7).
// Same test Redis as redis.e2e-spec.ts (port 6399) but on DB 1 — the two
// suites run in parallel workers and each FLUSHDBs in beforeEach, so they
// must not share a database. Fails loudly when the test Redis is
// unreachable — a mock is not a substitute.

jest.setTimeout(30000);

const TEST_REDIS_URL = process.env.REDIS_TEST_URL ?? "redis://127.0.0.1:6399/1";

async function waitForJobState(
  job: { getState: () => Promise<string> },
  state: string,
  timeoutMs = 10000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await job.getState()) === state) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`job did not reach state ${state} within ${timeoutMs}ms`);
}

describe("BullMQ integration (real Redis 7)", () => {
  let redis: RedisService;
  let registry: QueueRegistryService;

  beforeAll(async () => {
    redis = new RedisService(new ConfigService({ REDIS_URL: TEST_REDIS_URL }));
    await redis.onModuleInit();
    if (!(await redis.ping(2000))) {
      throw new Error(
        `Test Redis is not reachable at ${TEST_REDIS_URL} — start it first ` +
          `(redis-server --port 6399 --daemonize yes --save '' --appendonly no).`,
      );
    }
  });

  afterAll(async () => {
    await redis.onModuleDestroy();
  });

  // A fresh registry per test: workers are one-per-queue, so a worker
  // started in one test must not leak into the next.
  beforeEach(async () => {
    await redis.getClient().flushdb();
    registry = new QueueRegistryService(redis);
  });

  afterEach(async () => {
    await registry.onModuleDestroy();
  });

  it("registers the three queues and reports job counts", async () => {
    registry.getQueue(QUEUE_NAMES.catalogSync);
    registry.getQueue(QUEUE_NAMES.seoJobs);
    registry.getQueue(QUEUE_NAMES.queueTest);
    expect(registry.registeredQueueCount()).toBe(3);
    expect(registry.registeredWorkerCount()).toBe(0);
    const counts = await registry.getJobCounts(QUEUE_NAMES.catalogSync);
    expect(counts.waiting).toBe(0);
    expect(counts.completed).toBe(0);
  });

  it("queue-test: enqueue → process → complete with the right payload", async () => {
    registry.getQueue<QueueTestJobData>(QUEUE_NAMES.queueTest);
    registry.startQueueTestWorker();
    const queue = registry.getQueue<QueueTestJobData>(QUEUE_NAMES.queueTest);
    const job = await queue.add("test", { message: "ping-m02-02" });
    await waitForJobState(job, "completed");
    expect(job.id).toBeDefined();
    const finished = await queue.getJob(job.id as string);
    expect(finished).not.toBeNull();
    const result = finished?.returnvalue as {
      received: string;
      attemptsMade: number;
    };
    expect(result.received).toBe("ping-m02-02");
    expect(result.attemptsMade).toBe(0);
    const counts = await registry.getJobCounts(QUEUE_NAMES.queueTest);
    expect(counts.completed).toBeGreaterThanOrEqual(1);
  });

  it("rejects a second worker for the same queue", () => {
    registry.getQueue(QUEUE_NAMES.queueTest);
    registry.startQueueTestWorker();
    expect(() => registry.startQueueTestWorker()).toThrow(/already registered/);
  });

  it("retries with exponential backoff and completes on the 3rd attempt", async () => {
    let attempts = 0;
    const queueConnection = redis.createQueueConnection();
    const workerConnection = redis.createQueueConnection();
    const queue = new Queue<{ n: number }>("queue-test-retry", {
      connection: queueConnection,
      defaultJobOptions: { ...DEFAULT_JOB_OPTIONS },
    });
    const worker = new Worker<{ n: number }>(
      "queue-test-retry",
      async () => {
        attempts += 1;
        if (attempts < 3) throw new Error(`transient failure ${attempts}`);
        return "ok";
      },
      { connection: workerConnection },
    );
    try {
      const job = await queue.add("retry-me", { n: 1 });
      await waitForJobState(job, "completed", 20000);
      expect(job.id).toBeDefined();
      const finished = await queue.getJob(job.id as string);
      expect(finished?.returnvalue).toBe("ok");
      // attemptsMade counts attempts performed: 2 failures + 1 success = 3.
      expect(finished?.attemptsMade).toBe(3);
      expect(attempts).toBe(3);
    } finally {
      await worker.close();
      await queue.close();
      await redis.disconnectClient(queueConnection);
      await redis.disconnectClient(workerConnection);
    }
  });

  it("a job that always fails ends in the failed state", async () => {
    const queueConnection = redis.createQueueConnection();
    const workerConnection = redis.createQueueConnection();
    const queue = new Queue("queue-test-fail", {
      connection: queueConnection,
      defaultJobOptions: { attempts: 1 },
    });
    const worker = new Worker(
      "queue-test-fail",
      async () => {
        throw new Error("permanent failure");
      },
      { connection: workerConnection },
    );
    try {
      const job = await queue.add("fail-me", {});
      await waitForJobState(job, "failed");
      const counts = await queue.getJobCounts();
      expect(counts.failed).toBe(1);
    } finally {
      await worker.close();
      await queue.close();
      await redis.disconnectClient(queueConnection);
      await redis.disconnectClient(workerConnection);
    }
  });

  it("graceful shutdown closes workers and queues without hanging", async () => {
    registry.getQueue(QUEUE_NAMES.catalogSync);
    registry.startQueueTestWorker();
    expect(registry.registeredQueueCount()).toBeGreaterThanOrEqual(1);
    expect(registry.registeredWorkerCount()).toBe(1);
    await registry.onModuleDestroy();
    expect(registry.registeredQueueCount()).toBe(0);
    expect(registry.registeredWorkerCount()).toBe(0);
  });
});
