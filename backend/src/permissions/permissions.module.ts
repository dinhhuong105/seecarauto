import { Module } from "@nestjs/common";
import { PermissionService } from "./permission.service";

// PermissionsModule (M02-06, RB-13) — independent module, no AuthModule
// dependency. PrismaModule and RedisModule are @Global, so no imports are
// needed for PrismaService/CacheService. AuthModule and RbacModule both
// import this module; PermissionService is the single shared resolve
// function for /me (D-10) and PermissionsGuard.
@Module({
  providers: [PermissionService],
  exports: [PermissionService],
})
export class PermissionsModule {}
