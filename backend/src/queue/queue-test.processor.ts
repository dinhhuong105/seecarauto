import type { Job } from "bullmq";
import type { QueueTestJobData } from "./queue-definitions";

// Processor for the `queue-test` queue (M02-02). It exists only to prove the
// enqueue → process → complete lifecycle with a real Redis + BullMQ —
// no business logic, no side effects.
export async function processQueueTestJob(
  job: Job<QueueTestJobData>,
): Promise<{ received: string; processedAt: string; attemptsMade: number }> {
  return {
    received: job.data.message,
    processedAt: new Date().toISOString(),
    attemptsMade: job.attemptsMade,
  };
}
