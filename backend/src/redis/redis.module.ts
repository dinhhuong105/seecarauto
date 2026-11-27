import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CacheService } from "./cache.service";
import { CartStorageService } from "./cart-storage.service";
import { RateLimitService } from "./rate-limit.service";
import { RedisService } from "./redis.service";

// RedisModule (M02-02) — @Global: cache, cart and rate-limit services are
// needed by many future modules (M03+). BullMQ lives in QueueModule, which
// injects RedisService from here.
@Global()
@Module({
  imports: [ConfigModule],
  providers: [RedisService, CacheService, CartStorageService, RateLimitService],
  exports: [RedisService, CacheService, CartStorageService, RateLimitService],
})
export class RedisModule {}
