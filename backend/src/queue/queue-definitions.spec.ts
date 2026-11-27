import { DEFAULT_JOB_OPTIONS, QUEUE_NAMES } from "./queue-definitions";

describe("BullMQ queue definitions", () => {
  it("names the three M02-02 queues", () => {
    expect(QUEUE_NAMES.catalogSync).toBe("catalog-sync");
    expect(QUEUE_NAMES.seoJobs).toBe("seo-jobs");
    expect(QUEUE_NAMES.queueTest).toBe("queue-test");
  });

  it("uses the approved default job options (retry 3, exponential 1s)", () => {
    expect(DEFAULT_JOB_OPTIONS.attempts).toBe(3);
    expect(DEFAULT_JOB_OPTIONS.backoff).toEqual({
      type: "exponential",
      delay: 1000,
    });
    expect(DEFAULT_JOB_OPTIONS.removeOnComplete).toEqual({ count: 100 });
    expect(DEFAULT_JOB_OPTIONS.removeOnFail).toEqual({ count: 1000 });
  });
});
