import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { RequestWithAdmin } from "../auth/jwt-auth.guard";
import { PermissionService } from "../permissions/permission.service";
import { RbacException } from "./rbac.errors";
import { RBAC_REQUIRED_PERMISSION_KEY } from "./require-permission.decorator";

// PermissionsGuard (M02-06, RB-09) — NestJS guard, never Express
// middleware. Runs AFTER JwtAuthGuard (authentication first, authorization
// second) and reads the required code from @RequirePermission metadata.
//
// Check order per request:
// 1. No authenticated admin on the request (JwtAuthGuard did not run or
//    rejected) -> 401 UNAUTHENTICATED. Permissions are never checked
//    before the account is known.
// 2. No @RequirePermission metadata on the handler/class -> 403 FORBIDDEN
//    (fail-closed: a guarded handler without a declared permission denies
//    by default instead of silently allowing).
// 3. Code `*` -> any authenticated admin passes (logout/me pattern).
// 4. Otherwise resolve the account's permissions (cached, DB fallback on
//    Redis failure — RB-04) and require the declared code, else 403
//    FORBIDDEN (Error Catalog §3, no extra information leaked).
//
// The guard is attached explicitly to admin controllers/routes, never
// globally — public endpoints must never be blocked by accident.

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAdmin>();
    const admin = request.admin;
    if (admin === undefined) {
      throw RbacException.unauthenticated();
    }
    const required = this.reflector.getAllAndOverride<string>(
      RBAC_REQUIRED_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (required === undefined) {
      throw RbacException.forbidden();
    }
    if (required === "*") {
      return true;
    }
    const permissions = await this.permissions.resolvePermissions(admin.userId);
    if (!permissions.includes(required)) {
      throw RbacException.forbidden();
    }
    return true;
  }
}
