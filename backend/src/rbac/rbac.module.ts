import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { RbacAuditService } from "./audit.service";
import { PermissionsGuard } from "./permissions.guard";
import { RbacService } from "./rbac.service";

// RbacModule (M02-06, RB-13) — the authorization foundation module.
// Imports PermissionsModule (shared resolve) and AuthModule (reuses
// JwtAuthGuard); provides PermissionsGuard, RbacAuditService and
// RbacService so M03–M07 modules can attach the guard and call the
// mutations. No circular dependency: neither PermissionsModule nor
// AuthModule imports RbacModule.
@Module({
  imports: [PermissionsModule, AuthModule],
  providers: [PermissionsGuard, RbacAuditService, RbacService],
  exports: [PermissionsGuard, RbacAuditService, RbacService],
})
export class RbacModule {}
