import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { QueueModule } from "./queue/queue.module";
import { RedisModule } from "./redis/redis.module";
import { validateRedisEnv } from "./redis/redis.config";

@Module({
  imports: [
    // Loads .env (local) — real secrets never enter git; see .env.example.
    // validateRedisEnv fails fast on malformed Redis variables (M02-02).
    ConfigModule.forRoot({ isGlobal: true, validate: validateRedisEnv }),
    PrismaModule,
    RedisModule,
    QueueModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
