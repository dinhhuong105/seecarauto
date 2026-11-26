import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

// Global so any future module can inject PrismaService without re-importing.
// (M02-01: minimal integration — no business endpoints yet.)
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
