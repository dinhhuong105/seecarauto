import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { PermissionsGuard } from "./permissions.guard";

// RbacModule (M02-06, RB-13) — the authorization foundation module.
// Imports PermissionsModule (shared resolve) and AuthModule (reuses
// JwtAuthGuard); exports PermissionsGuard so M03–M07 modules can attach
// it to their admin controllers. No circular dependency: neither
// PermissionsModule nor AuthModule imports RbacModule.
@Module({
  imports: [PermissionsModule, AuthModule],
  providers: [PermissionsGuard],
  exports: [PermissionsGuard],
})
export class RbacModule {}
