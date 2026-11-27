// BullMQ queue definitions (M02-02).
// - catalog-sync: catalogue changes → Meilisearch sync. M02-02 provides the
//   infrastructure + payload contract only; the business consumer belongs
//   to M02-03 (INT-004).
// - seo-jobs: background SEO jobs. M02-02 only prepares registration; it
//   never calls an AI provider (D-04 pending).
// - queue-test: the only queue with a real processor in M02-02 — proves the
//   enqueue → process → complete lifecycle in integration tests.
// Job payloads must never contain credentials, tokens or unnecessary PII
// (Task Brief §5).

export const QUEUE_NAMES = {
  catalogSync: "catalog-sync",
  seoJobs: "seo-jobs",
  queueTest: "queue-test",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export interface CatalogSyncJobData {
  entityType: "product" | "category" | "brand";
  entityId: string;
  action: "upsert" | "delete";
  updatedAt: string;
}

export interface SeoJobData {
  articleId: string;
  action: "generate" | "regenerate";
}

export interface QueueTestJobData {
  message: string;
}

/** Default job options — technical infrastructure defaults, not an SLA. */
export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 1000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 1000 },
} as const;
