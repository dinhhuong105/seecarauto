import { Reflector } from "@nestjs/core";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RBAC_REQUIRED_PERMISSION_KEY } from "../rbac/require-permission.decorator";
import { RolesController } from "./roles.controller";
import type { RolesService } from "./roles.service";

// RolesController unit tests (M06-02, Pha 1).
// The guard wiring is asserted via metadata, not HTTP (brief §7):
// every handler must carry JwtAuthGuard + PermissionsGuard and exactly
// the @RequirePermission code OpenAPI declares for its operation.
// HTTP behaviour (401/403/200 per endpoint) is proven by the e2e spec.

const EXPECTED: Record<string, string> = {
  listRoles: "roles.view",
  createRole: "roles.create",
  updateRole: "roles.update",
  deleteRole: "roles.delete",
  getRolePermissions: "roles.view",
  updateRolePermissions: "roles.update",
};

describe("RolesController (unit)", () => {
  const reflector = new Reflector();
  const controller = new RolesController({} as unknown as RolesService);

  it("exists and has exactly the 6 handlers", () => {
    expect(controller).toBeInstanceOf(RolesController);
    for (const method of Object.keys(EXPECTED)) {
      expect(
        typeof (controller as unknown as Record<string, unknown>)[method],
      ).toBe("function");
    }
  });

  it.each(Object.entries(EXPECTED))(
    "%s requires permission %s (and only that code)",
    (method, code) => {
      const handler = (
        controller as unknown as Record<string, (...args: unknown[]) => unknown>
      )[method];
      const required = reflector.get<string>(
        RBAC_REQUIRED_PERMISSION_KEY,
        handler,
      );
      expect(required).toBe(code);
    },
  );

  it.each(Object.keys(EXPECTED))(
    "%s stacks JwtAuthGuard + PermissionsGuard",
    (method) => {
      const handler = (
        controller as unknown as Record<string, (...args: unknown[]) => unknown>
      )[method];
      const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as
        unknown[] | undefined;
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(PermissionsGuard);
    },
  );

  it("uses only the four roles.* codes (no other permission)", () => {
    for (const code of Object.values(EXPECTED)) {
      expect(code).toMatch(/^roles\.(view|create|update|delete)$/);
    }
  });
});
