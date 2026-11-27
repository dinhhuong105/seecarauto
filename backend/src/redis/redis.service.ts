import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis, { type RedisOptions } from "ioredis";
import { redisConfigFromService, type RedisConfig } from "./redis.config";

// RedisService (M02-02) — one shared ioredis client for cache/cart/rate-limit
// plus factory methods for dedicated connections (BullMQ requires its own
// connections with maxRetriesPerRequest: null).
//
// Failure posture (NFR-004): the app must NOT crash or fail to boot when
// Redis is down. ioredis reconnects in the background; every public method
// that needs an answer treats a Redis error as "unavailable" instead of
// throwing (CacheService falls back, RateLimitService applies its policy,
// CartStorageService throws a typed RedisUnavailableError so the HTTP layer
// can answer 503). The Redis URL is never written to logs.

export class RedisUnavailableError extends Error {
  constructor(operation: string) {
    super(`Redis unavailable during ${operation}`);
    this.name = "RedisUnavailableError";
  }
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly config: RedisConfig;
  private readonly client: Redis;
  private lastErrorAt: Date | null = null;

  constructor(configService: ConfigService) {
    this.config = redisConfigFromService(configService);
    this.client = new Redis(this.config.url, this.baseOptions());
    // ioredis emits 'error' on every failed reconnect attempt. Without a
    // listener the process crashes — attach one and only record the time.
    this.client.on("error", (error: Error) => {
      this.lastErrorAt = new Date();
      this.logger.warn(`Redis client error: ${error.message}`);
    });
  }

  async onModuleInit(): Promise<void> {
    // Do NOT await a successful connection here: the backend must boot and
    // serve (degraded) even when Redis is down. Health is exposed via ping().
    if (this.client.status === "wait") {
      this.client.connect().catch(() => {
        // Reconnect happens in the background via retryStrategy.
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnectClient(this.client);
  }

  /** The shared client for cache / cart / rate-limit operations. */
  getClient(): Redis {
    return this.client;
  }

  getConfig(): RedisConfig {
    return this.config;
  }

  /**
   * A dedicated connection for BullMQ (Queue/Worker). BullMQ requires
   * maxRetriesPerRequest: null; a shared connection must never be reused.
   * The caller owns the connection and must disconnect it on shutdown.
   */
  createQueueConnection(): Redis {
    const connection = new Redis(this.config.url, {
      ...this.baseOptions(),
      maxRetriesPerRequest: null,
    });
    connection.on("error", (error: Error) => {
      this.logger.warn(`Redis queue connection error: ${error.message}`);
    });
    return connection;
  }

  /** True when Redis answers PING within `timeoutMs`. Never throws. */
  async ping(timeoutMs = 1000): Promise<boolean> {
    try {
      const result = await this.withTimeout(
        this.client.ping(),
        timeoutMs,
        "ping",
      );
      return result === "PONG";
    } catch {
      return false;
    }
  }

  /** Last time the client reported an error, if any (for health reporting). */
  getLastErrorAt(): Date | null {
    return this.lastErrorAt;
  }

  /**
   * Runs a promise with a timeout. On timeout the promise is abandoned (the
   * underlying Redis command keeps its own retry behaviour) and the caller
   * receives a RedisUnavailableError for `operation`.
   */
  async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operation: string,
  ): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new RedisUnavailableError(operation)),
            timeoutMs,
          );
        }),
      ]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  /** Disconnects a client, preferring QUIT with a 2s fallback to disconnect. */
  async disconnectClient(client: Redis): Promise<void> {
    // The fallback timer must be cleared: an uncleared setTimeout keeps
    // the Node event loop (and Jest) alive for up to 2s after every close.
    let timer: NodeJS.Timeout | undefined;
    try {
      const quit = client.quit().catch(() => undefined);
      await Promise.race([
        quit,
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, 2000);
        }),
      ]);
    } catch {
      // QUIT failed (already disconnected, connection broken) — force close.
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      client.disconnect();
    }
  }

  private baseOptions(): RedisOptions {
    return {
      // Reconnect with capped exponential backoff; keep trying forever —
      // a transient Redis outage must not kill the process.
      retryStrategy: (times: number) => Math.min(times * 100, 3000),
      connectTimeout: 5000,
      keepAlive: 10000,
      enableReadyCheck: true,
    };
  }
}
