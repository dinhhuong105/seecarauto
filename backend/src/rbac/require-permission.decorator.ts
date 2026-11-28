import { SetMetadata } from "@nestjs/common";

// Decorator metadata key for the permission code a handler requires.
// Read by PermissionsGuard (RB-09). One code per operation — no
// @RequireAnyPermission (every operation carries exactly one code, or
// `*` for "any authenticated admin").
export const RBAC_REQUIRED_PERMISSION_KEY = "rbac:requiredPermission";

/** Declares the single permission code a handler requires. */
export const RequirePermission = (code: string) =>
  SetMetadata(RBAC_REQUIRED_PERMISSION_KEY, code);
