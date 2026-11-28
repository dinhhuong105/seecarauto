import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { RbacModule } from "../rbac/rbac.module";
import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";

// RolesModule (M06-02, Pha 1) — the Roles CRUD endpoints. Imports
// RbacModule (PermissionsGuard, RbacService, RbacAuditService — reused,
// never re-implemented), AuthModule (JwtAuthGuard) and PermissionsModule
// (PermissionService — RbacModule imports it but does not re-export it,
// so RolesModule imports it directly for DI). No guard, audit helper or
// matrix service of its own. Exports RolesService so M06-03/04 can reuse
// it if needed.
@Module({
  imports: [RbacModule, AuthModule, PermissionsModule],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
