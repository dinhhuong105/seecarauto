import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import type { PermissionService } from "../permissions/permission.service";
import { PermissionsGuard } from "./permissions.guard";
import { RBAC_REQUIRED_PERMISSION_KEY } from "./require-permission.decorator";
import { RbacException } from "./rbac.errors";

// PermissionsGuard unit tests (M02-06, AC-02). Reflector and
// PermissionService are mocked; the guard's decision logic is real.

describe("PermissionsGuard", () => {
  let permissions: { resolvePermissions: jest.Mock };
  let guard: PermissionsGuard;

  function makeContext(
    required: string | undefined,
    admin?: { userId: string },
  ): ExecutionContext {
    permissions = { resolvePermissions: jest.fn() };
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(required),
    } as unknown as Reflector;
    const request = { admin };
    guard = new PermissionsGuard(
      reflector,
      permissions as unknown as PermissionService,
    );
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  }

  it("returns true when the account holds the required code", async () => {
    const context = makeContext("products.create", { userId: "user-1" });
    permissions.resolvePermissions.mockResolvedValue([
      "products.view",
      "products.create",
    ]);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(permissions.resolvePermissions).toHaveBeenCalledWith("user-1");
  });

  it("throws 403 FORBIDDEN when the account lacks the required code", async () => {
    const context = makeContext("products.create", { userId: "user-1" });
    permissions.resolvePermissions.mockResolvedValue(["products.view"]);
    const error = await guard.canActivate(context).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RbacException);
    expect(error as RbacException).toMatchObject({
      status: 403,
      response: {
        error: "FORBIDDEN",
        message: "Tài khoản của bạn không có quyền thực hiện thao tác này.",
      },
    });
  });

  it("code '*' passes for any authenticated admin without resolving permissions", async () => {
    const context = makeContext("*", { userId: "user-1" });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(permissions.resolvePermissions).not.toHaveBeenCalled();
  });

  it("throws 401 UNAUTHENTICATED when JwtAuthGuard has not attached an admin", async () => {
    const context = makeContext("products.create", undefined);
    const error = await guard.canActivate(context).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RbacException);
    expect(error as RbacException).toMatchObject({
      status: 401,
      response: { error: "UNAUTHENTICATED" },
    });
    expect(permissions.resolvePermissions).not.toHaveBeenCalled();
  });

  it("fail-closed: no @RequirePermission metadata -> 403 FORBIDDEN", async () => {
    const context = makeContext(undefined, { userId: "user-1" });
    const error = await guard.canActivate(context).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RbacException);
    expect(error as RbacException).toMatchObject({
      status: 403,
      response: { error: "FORBIDDEN" },
    });
    expect(permissions.resolvePermissions).not.toHaveBeenCalled();
  });

  it("propagates a 503 from the resolve layer (DB unverifiable)", async () => {
    const context = makeContext("products.create", { userId: "user-1" });
    permissions.resolvePermissions.mockRejectedValue(
      RbacException.serviceUnavailable(5),
    );
    const error = await guard.canActivate(context).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RbacException);
    expect(error as RbacException).toMatchObject({
      status: 503,
      response: { error: "SERVICE_UNAVAILABLE" },
    });
  });

  it("reads the metadata key the decorator writes", () => {
    expect(RBAC_REQUIRED_PERMISSION_KEY).toBe("rbac:requiredPermission");
  });
});
