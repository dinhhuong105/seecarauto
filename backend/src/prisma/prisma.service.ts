import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

// Minimal NestJS wrapper around Prisma Client (M02-01).
// Lifecycle only: connect on module init, disconnect on destroy.
// DATABASE_URL comes from the environment (.env locally, never committed).
// No business logic, no endpoints — those belong to M02-05/M02-06/M03+.
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
