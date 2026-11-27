import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { validateAuthEnv } from "./auth/auth.config";
import { PrismaModule } from "./prisma/prisma.module";
import { QueueModule } from "./queue/queue.module";
import { RedisModule } from "./redis/redis.module";
import { validateRedisEnv } from "./redis/redis.config";
import { SearchModule } from "./search/search.module";
import { validateMeilisearchEnv } from "./search/meilisearch.config";

@Module({
  imports: [
    // Loads .env (local) — real secrets never enter git; see .env.example.
    // validateRedisEnv + validateMeilisearchEnv + validateAuthEnv fail fast
    // on malformed variables (M02-02, M02-03, M02-05 AC-13).
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) =>
        validateAuthEnv(validateMeilisearchEnv(validateRedisEnv(config))),
    }),
    PrismaModule,
    RedisModule,
    QueueModule,
    SearchModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
