import "reflect-metadata";
import { Controller, Get, INestApplication, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { randomUUID } from "node:crypto";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/app-setup";
import { AuthModule } from "../src/auth/auth.module";
import { JwtAuthGuard } from "../src/auth/jwt-auth.guard";
import { PasswordService } from "../src/auth/password.service";
import {
  PermissionService,
  permissionsCacheKey,
} from "../src/permissions/permission.service";
import { PermissionsModule } from "../src/permissions/permissions.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { CacheService } from "../src/redis/cache.service";
import { RateLimitService } from "../src/redis/rate-limit.service";
import { RedisService } from "../src/redis/redis.service";
import { PermissionsGuard } from "../src/rbac/permissions.guard";
import { RbacModule } from "../src/rbac/rbac.module";
import { RbacService } from "../src/rbac/rbac.service";
import { RequirePermission } from "../src/rbac/require-permission.decorator";
import {
  PERMISSION_CATALOG,
  seedPermissions,
} from "../prisma/seed-permissions";

// M02-06 RBAC e2e (AC-01 -> AC-18 in scope for the foundation).
// Real PostgreSQL (seecarauto_test) + real test Redis (127.0.0.1:6399, DB 3).
// The app is created once per file (beforeAll); DB tables + Redis are wiped
// in beforeEach and the permission catalog is re-seeded, so every test
// starts from a clean slate. The guarded test controller below stands in
// for the future M03+ admin controllers (M02-06 has no endpoints of its
// own, RB-15); the public controller proves the guard is not global.
// `trust proxy` is enabled on the TEST app only, mirroring auth.e2e-spec.ts.
jest.setTimeout(60_000);

const PASSWORD = "correct horse battery staple";
const DEAD_REDIS_URL = "redis://127.0.0.1:6398";

let userCounter = 0;
let ipCounter = 0;
const freshUsername = () =>
  `e2e-rbac-${++userCounter}-${randomUUID().slice(0, 8)}`;
const freshIp = () => `10.30.40.${++ipCounter}`;

@Controller("rbac-test")
@UseGuards(JwtAuthGuard, PermissionsGuard)
class RbacTestController {
  @Get("products-view")
  @RequirePermission("products.view")
  productsView() {
    return { ok: true };
  }

  @Get("products-create")
  @RequirePermission("products.create")
  productsCreate() {
    return { ok: true };
  }

  @Get("dashboard")
  @RequirePermission("dashboard.view")
  dashboard() {
    return { ok: true };
  }

  // Extra sample codes (AC-02 evidence: one sample per code family).
  @Get("categories-create")
  @RequirePermission("categories.create")
  categoriesCreate() {
    return { ok: true };
  }

  @Get("orders-cancel")
  @RequirePermission("orders.cancel")
  ordersCancel() {
    return { ok: true };
  }

  @Get("roles-view")
  @RequirePermission("roles.view")
  rolesView() {
    return { ok: true };
  }

  @Get("audit-view")
  @RequirePermission("audit.view")
  auditView() {
    return { ok: true };
  }

  @Get("any-admin")
  @RequirePermission("*")
  anyAdmin() {
    return { ok: true };
  }

  // Guarded by class-level @UseGuards but declares no permission:
  // must fail closed with 403 (AC-02).
  @Get("no-metadata")
  noMetadata() {
    return { ok: true };
  }
}

@Controller("rbac-test-public")
class RbacTestPublicController {
  @Get("open")
  open() {
    return { ok: true };
  }
}

describe("RBAC (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let cache: CacheService;
  let passwords: PasswordService;
  let permissions: PermissionService;
  let rbac: RbacService;

  beforeAll(async () => {
    // The test controllers live in the ROOT test module, so their guards'
    // dependencies must resolve at root scope: importing AuthModule,
    // PermissionsModule and RbacModule directly (in addition to AppModule,
    // which already includes them) makes their exported providers visible
    // to the root controllers. Without this, Nest fails with "can't
    // resolve dependencies of the JwtAuthGuard (TokenService ...)".
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, AuthModule, PermissionsModule, RbacModule],
      controllers: [RbacTestController, RbacTestPublicController],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    app.getHttpAdapter().getInstance().set("trust proxy", true);
    await app.init();
    prisma = app.get(PrismaService);
    redis = app.get(RedisService);
    cache = app.get(CacheService);
    passwords = app.get(PasswordService);
    permissions = app.get(PermissionService);
    rbac = app.get(RbacService);
  });

  afterAll(async () => {
    if (app !== undefined) {
      await app.close();
    }
  });

  beforeEach(async () => {
    await prisma.$executeRaw`
      TRUNCATE "audit_logs", "auth_refresh_operations",
        "admin_refresh_sessions", "user_permissions", "user_roles",
        "users", "roles", "permissions"
      RESTART IDENTITY CASCADE`;
    await redis.getClient().flushdb();
    await seedPermissions(prisma);
  });

  // ------------------------------------------------------------ helpers

  async function createUser(username: string) {
    const passwordHash = await passwords.hash(PASSWORD);
    return prisma.user.create({
      data: { username, passwordHash, isActive: true },
    });
  }

  async function createRole(name: string) {
    return prisma.role.create({ data: { name } });
  }

  async function permissionId(module: string, action: string) {
    const row = await prisma.permission.findFirst({
      where: { module, action },
    });
    if (row === null) {
      throw new Error(`seeded permission missing: ${module}.${action}`);
    }
    return row.id;
  }

  async function grantRolePermission(
    roleId: string,
    code: string,
    granted = true,
  ) {
    const [module, action] = code.split(".");
    return prisma.rolePermission.create({
      data: {
        roleId,
        permissionId: await permissionId(module, action),
        granted,
      },
    });
  }

  async function grantUserPermission(
    userId: string,
    code: string,
    granted: boolean,
  ) {
    const [module, action] = code.split(".");
    return prisma.userPermission.create({
      data: {
        userId,
        permissionId: await permissionId(module, action),
        granted,
      },
    });
  }

  async function loginOk(username: string, ip = freshIp()) {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/admin/login")
      .set("X-Forwarded-For", ip)
      .send({ username, password: PASSWORD });
    expect(res.status).toBe(200);
    return res.body.data.accessToken as string;
  }

  function getRbac(path: string, token?: string, ip?: string) {
    let req = request(app.getHttpServer()).get(`/api/v1/rbac-test/${path}`);
    if (token !== undefined) {
      req = req.set("Authorization", `Bearer ${token}`);
    }
    if (ip !== undefined) {
      req = req.set("X-Forwarded-For", ip);
    }
    return req;
  }

  function getPublic(path: string) {
    return request(app.getHttpServer()).get(`/api/v1/rbac-test-public/${path}`);
  }

  // ------------------------------------------------- guard over HTTP

  describe("guard over HTTP (AC-01/AC-02/AC-05)", () => {
    it("role grant allows, no grant denies with 403 FORBIDDEN", async () => {
      const withGrant = await createUser(freshUsername());
      const role = await createRole("seller");
      await grantRolePermission(role.id, "products.view");
      await prisma.userRole.create({
        data: { userId: withGrant.id, roleId: role.id },
      });
      const withoutGrant = await createUser(freshUsername());
      const tokenWith = await loginOk(withGrant.username);
      const tokenWithout = await loginOk(withoutGrant.username);

      const allowed = await getRbac("products-view", tokenWith);
      expect(allowed.status).toBe(200);
      expect(allowed.body).toEqual({ ok: true });

      const denied = await getRbac("products-view", tokenWithout);
      expect(denied.status).toBe(403);
      expect(denied.body.error).toBe("FORBIDDEN");
      expect(denied.body.message).toBe(
        "Tài khoản của bạn không có quyền thực hiện thao tác này.",
      );
    });

    it("no Bearer token -> 401 UNAUTHENTICATED (JwtAuthGuard first)", async () => {
      const res = await getRbac("products-view");
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("UNAUTHENTICATED");
    });

    it("code '*' passes for any authenticated admin, even with no permissions", async () => {
      const user = await createUser(freshUsername());
      const token = await loginOk(user.username);
      const res = await getRbac("any-admin", token);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });

    it("guarded handler without @RequirePermission fails closed with 403", async () => {
      const user = await createUser(freshUsername());
      const role = await createRole("seller");
      await grantRolePermission(role.id, "products.view");
      await prisma.userRole.create({
        data: { userId: user.id, roleId: role.id },
      });
      const token = await loginOk(user.username);
      const res = await getRbac("no-metadata", token);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("FORBIDDEN");
    });

    it("guard is not global: public controller answers without a token", async () => {
      const res = await getPublic("open");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });

    it("dashboard.view works as a sample permission code", async () => {
      const withGrant = await createUser(freshUsername());
      const role = await createRole("analyst");
      await grantRolePermission(role.id, "dashboard.view");
      await prisma.userRole.create({
        data: { userId: withGrant.id, roleId: role.id },
      });
      const withoutGrant = await createUser(freshUsername());
      const tokenWith = await loginOk(withGrant.username);
      const tokenWithout = await loginOk(withoutGrant.username);
      expect((await getRbac("dashboard", tokenWith)).status).toBe(200);
      expect((await getRbac("dashboard", tokenWithout)).status).toBe(403);
    });

    it("deny wins: role grant + user deny -> 403", async () => {
      const user = await createUser(freshUsername());
      const role = await createRole("seller");
      await grantRolePermission(role.id, "products.create");
      await prisma.userRole.create({
        data: { userId: user.id, roleId: role.id },
      });
      await grantUserPermission(user.id, "products.create", false);
      const token = await loginOk(user.username);
      const res = await getRbac("products-create", token);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("FORBIDDEN");
    });

    it("deny wins: grant role + deny role -> 403", async () => {
      const user = await createUser(freshUsername());
      const grantRole = await createRole("seller");
      const denyRole = await createRole("restricted");
      await grantRolePermission(grantRole.id, "products.create", true);
      await grantRolePermission(denyRole.id, "products.create", false);
      await prisma.userRole.createMany({
        data: [
          { userId: user.id, roleId: grantRole.id },
          { userId: user.id, roleId: denyRole.id },
        ],
      });
      const token = await loginOk(user.username);
      const res = await getRbac("products-create", token);
      expect(res.status).toBe(403);
    });

    it("user grant adds a permission the roles do not have", async () => {
      const user = await createUser(freshUsername());
      await grantUserPermission(user.id, "products.view", true);
      const token = await loginOk(user.username);
      const res = await getRbac("products-view", token);
      expect(res.status).toBe(200);
    });

    it("samples one code per family: grant allows, no grant denies (AC-02)", async () => {
      const withGrants = await createUser(freshUsername());
      const role = await createRole("manager");
      for (const code of [
        "categories.create",
        "orders.cancel",
        "roles.view",
        "audit.view",
      ]) {
        await grantRolePermission(role.id, code);
      }
      await prisma.userRole.create({
        data: { userId: withGrants.id, roleId: role.id },
      });
      const withoutGrants = await createUser(freshUsername());
      const tokenWith = await loginOk(withGrants.username);
      const tokenWithout = await loginOk(withoutGrants.username);
      for (const path of [
        "categories-create",
        "orders-cancel",
        "roles-view",
        "audit-view",
      ]) {
        expect((await getRbac(path, tokenWith)).status).toBe(200);
        expect((await getRbac(path, tokenWithout)).status).toBe(403);
      }
    });
  });

  // ------------------------------------------------- cache (AC-06)

  describe("cache + invalidation (AC-06)", () => {
    it("cache loss (FLUSHDB) resolves from DB, no 403", async () => {
      const user = await createUser(freshUsername());
      const role = await createRole("seller");
      await grantRolePermission(role.id, "products.view");
      await prisma.userRole.create({
        data: { userId: user.id, roleId: role.id },
      });
      const token = await loginOk(user.username);
      expect((await getRbac("products-view", token)).status).toBe(200);
      await redis.getClient().flushdb();
      expect((await getRbac("products-view", token)).status).toBe(200);
    });

    it("revoked grant stays visible until invalidation, then 403", async () => {
      const user = await createUser(freshUsername());
      const role = await createRole("seller");
      const row = await grantRolePermission(role.id, "products.view");
      await prisma.userRole.create({
        data: { userId: user.id, roleId: role.id },
      });
      const token = await loginOk(user.username);
      expect((await getRbac("products-view", token)).status).toBe(200);
      // Bypass the service: delete the grant directly, cache still holds it.
      await prisma.rolePermission.delete({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: row.permissionId,
          },
        },
      });
      expect((await getRbac("products-view", token)).status).toBe(200);
      expect(await permissions.invalidateUserPermissions(user.id)).toBe(true);
      expect((await getRbac("products-view", token)).status).toBe(403);
    });

    it("invalidation failure -> cacheInvalidated=false, stale permissions stay visible", async () => {
      const user = await createUser(freshUsername());
      const role = await createRole("seller");
      await grantRolePermission(role.id, "products.view");
      await prisma.userRole.create({
        data: { userId: user.id, roleId: role.id },
      });
      const token = await loginOk(user.username);
      expect((await getRbac("products-view", token)).status).toBe(200);
      // Fail every cache delete: the mutation commits, but the caller is
      // honestly told the change is not visible yet (RB-04).
      const deleteSpy = jest.spyOn(cache, "delete").mockResolvedValue(false);
      const result = await rbac.replaceRolePermissions(role.id, [], user.id);
      const attempts = deleteSpy.mock.calls.length;
      deleteSpy.mockRestore();
      expect(result.cacheInvalidated).toBe(false);
      expect(attempts).toBe(3);
      // Stale cache: the revoked permission is still visible.
      expect((await getRbac("products-view", token)).status).toBe(200);
      // Manual invalidation makes the committed change visible.
      expect(await cache.delete(permissionsCacheKey(user.id))).toBe(true);
      expect((await getRbac("products-view", token)).status).toBe(403);
    });
  });

  // --------------------------------------- Redis down (AC-06 / AC-15)

  describe("Redis down (dead port 6398)", () => {
    let deadApp: INestApplication;
    let deadRedis: RedisService;

    beforeAll(async () => {
      const deadConfig = {
        get: (key: string) => {
          if (key === "REDIS_URL") return DEAD_REDIS_URL;
          if (key === "REDIS_COMMAND_TIMEOUT_MS") return "200";
          return process.env[key];
        },
      } as unknown as ConfigService;
      deadRedis = new RedisService(deadConfig);
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule, AuthModule, PermissionsModule, RbacModule],
        controllers: [RbacTestController, RbacTestPublicController],
      })
        .overrideProvider(RedisService)
        .useValue(deadRedis)
        .compile();
      deadApp = moduleFixture.createNestApplication();
      configureApp(deadApp);
      deadApp.getHttpAdapter().getInstance().set("trust proxy", true);
      await deadApp.init();
    });

    afterAll(async () => {
      if (deadApp !== undefined) {
        await deadApp.close();
      }
      if (deadRedis !== undefined) {
        await deadRedis.onModuleDestroy();
      }
    });

    it("service-level resolve falls back to DB when Redis is dead (RB-04)", async () => {
      const user = await createUser(freshUsername());
      const role = await createRole("seller");
      await grantRolePermission(role.id, "products.view");
      await prisma.userRole.create({
        data: { userId: user.id, roleId: role.id },
      });
      const deadPermissions = deadApp.get(PermissionService);
      const codes = await deadPermissions.resolvePermissions(user.id);
      expect(codes).toEqual(["products.view"]);
    });

    it("HTTP with dead Redis fails closed with 503 at the auth layer (M02-05 AC-18)", async () => {
      const user = await createUser(freshUsername());
      const role = await createRole("seller");
      await grantRolePermission(role.id, "products.view");
      await prisma.userRole.create({
        data: { userId: user.id, roleId: role.id },
      });
      // Token issued by the main app verifies on the dead app (same
      // secrets); only Redis differs.
      const token = await loginOk(user.username);
      const res = await request(deadApp.getHttpServer())
        .get("/api/v1/rbac-test/products-view")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Forwarded-For", freshIp());
      // JwtAuthGuard's blacklist check fails closed before the permission
      // guard runs — this is the M02-05 behaviour, not an RBAC denial:
      // the request is neither allowed (200) nor denied for lack of
      // permission (403).
      expect(res.status).toBe(503);
      expect(res.body.error).toBe("SERVICE_UNAVAILABLE");
    });

    it("adminAuthed is fail-open at RateLimitService level when Redis is dead (AC-15)", async () => {
      const deadRate = deadApp.get(RateLimitService);
      const user = await createUser(freshUsername());
      const result = await deadRate.check("adminAuthed", user.id);
      expect(result.allowed).toBe(true);
    });
  });

  // ------------------------------------------- mutations + audit

  describe("mutations + audit (AC-07/AC-11/AC-14/AC-17)", () => {
    it("replaceRolePermissions replaces the matrix and audits before/after", async () => {
      const user = await createUser(freshUsername());
      const role = await createRole("seller");
      await grantRolePermission(role.id, "products.view");
      await prisma.userRole.create({
        data: { userId: user.id, roleId: role.id },
      });
      const token = await loginOk(user.username);
      expect((await getRbac("products-view", token)).status).toBe(200);

      const result = await rbac.replaceRolePermissions(
        role.id,
        [
          { module: "products", action: "create", granted: true },
          { module: "products", action: "view", granted: false },
        ],
        user.id,
      );
      expect(result.cacheInvalidated).toBe(true);
      expect(result.permissions).toEqual([
        { module: "products", action: "create", granted: true },
        { module: "products", action: "view", granted: false },
      ]);
      expect((await getRbac("products-view", token)).status).toBe(403);
      expect((await getRbac("products-create", token)).status).toBe(200);

      const audits = await prisma.auditLog.findMany({
        where: { action: "role.permissions_updated" },
      });
      expect(audits).toHaveLength(1);
      expect(audits[0].entityType).toBe("ROLE");
      expect(audits[0].entityId).toBe(role.id);
      expect(audits[0].actorId).toBe(user.id);
      const before = audits[0].before as unknown as {
        permissions: { module: string; action: string; granted: boolean }[];
      };
      const after = audits[0].after as unknown as {
        permissions: { module: string; action: string; granted: boolean }[];
      };
      expect(before.permissions).toEqual([
        { module: "products", action: "view", granted: true },
      ]);
      expect(after.permissions).toEqual(result.permissions);
    });

    it("replaceUserPermissions: deny blocks, granted=null deletes the exception", async () => {
      const user = await createUser(freshUsername());
      const role = await createRole("seller");
      await grantRolePermission(role.id, "products.view");
      await prisma.userRole.create({
        data: { userId: user.id, roleId: role.id },
      });
      const token = await loginOk(user.username);
      expect((await getRbac("products-view", token)).status).toBe(200);

      await rbac.replaceUserPermissions(
        user.id,
        [{ module: "products", action: "view", granted: false }],
        user.id,
      );
      expect((await getRbac("products-view", token)).status).toBe(403);

      const result = await rbac.replaceUserPermissions(
        user.id,
        [{ module: "products", action: "view", granted: null }],
        user.id,
      );
      expect(result.permissions).toEqual([]);
      expect((await getRbac("products-view", token)).status).toBe(200);
      expect(
        await prisma.userPermission.count({ where: { userId: user.id } }),
      ).toBe(0);
      const audits = await prisma.auditLog.findMany({
        where: { action: "user.permissions_updated" },
      });
      expect(audits).toHaveLength(2);
    });

    it("assign/remove role are idempotent and audited once per change", async () => {
      const user = await createUser(freshUsername());
      const role = await createRole("seller");
      await grantRolePermission(role.id, "products.view");
      const token = await loginOk(user.username);
      expect((await getRbac("products-view", token)).status).toBe(403);

      const assigned = await rbac.assignUserRole(user.id, role.id, user.id);
      expect(assigned.changed).toBe(true);
      expect(assigned.cacheInvalidated).toBe(true);
      expect((await getRbac("products-view", token)).status).toBe(200);

      const assignedAgain = await rbac.assignUserRole(
        user.id,
        role.id,
        user.id,
      );
      expect(assignedAgain.changed).toBe(false);
      expect(
        await prisma.auditLog.count({
          where: { action: "user.roles_assigned" },
        }),
      ).toBe(1);

      const removed = await rbac.removeUserRole(user.id, role.id, user.id);
      expect(removed.changed).toBe(true);
      expect((await getRbac("products-view", token)).status).toBe(403);

      const removedAgain = await rbac.removeUserRole(user.id, role.id, user.id);
      expect(removedAgain.changed).toBe(false);
      expect(
        await prisma.auditLog.count({
          where: { action: "user.roles_removed" },
        }),
      ).toBe(1);
    });

    it("removeUserRole checks the role exists first (FIX-M02-06-S2-01, RB-03)", async () => {
      const user = await createUser(freshUsername());
      const role = await createRole("seller");
      await grantRolePermission(role.id, "products.view");
      const token = await loginOk(user.username);

      // (1) User exists but the role does not: 404 ROLE_NOT_FOUND,
      // not an idempotent no-op.
      await expect(
        rbac.removeUserRole(user.id, randomUUID(), user.id),
      ).rejects.toMatchObject({
        status: 404,
        response: { error: "ROLE_NOT_FOUND" },
      });

      // (2) Role exists but was never assigned: idempotent no-op,
      // no AuditLog row.
      const notAssigned = await rbac.removeUserRole(user.id, role.id, user.id);
      expect(notAssigned.changed).toBe(false);
      expect(
        await prisma.auditLog.count({
          where: { action: "user.roles_removed" },
        }),
      ).toBe(0);

      // (3) Role assigned: removal succeeds, audited, cache invalidated.
      await rbac.assignUserRole(user.id, role.id, user.id);
      expect((await getRbac("products-view", token)).status).toBe(200);
      const removed = await rbac.removeUserRole(user.id, role.id, user.id);
      expect(removed.changed).toBe(true);
      expect(removed.cacheInvalidated).toBe(true);
      expect((await getRbac("products-view", token)).status).toBe(403);
      expect(
        await prisma.auditLog.count({
          where: { action: "user.roles_removed" },
        }),
      ).toBe(1);
    });

    it("audit failure rolls back the whole mutation (RB-06)", async () => {
      const user = await createUser(freshUsername());
      const role = await createRole("seller");
      await grantRolePermission(role.id, "products.view");
      await prisma.userRole.create({
        data: { userId: user.id, roleId: role.id },
      });
      // actorId is a well-formed UUID with no user row: the audit insert
      // violates its FK, so the transaction must roll back entirely.
      const ghostActor = randomUUID();
      await expect(
        rbac.replaceRolePermissions(
          role.id,
          [{ module: "products", action: "create", granted: true }],
          ghostActor,
        ),
      ).rejects.toMatchObject({
        status: 503,
        response: { error: "SERVICE_UNAVAILABLE" },
      });
      // The old matrix is untouched (deleteMany rolled back) and no audit
      // row was written.
      const rows = await prisma.rolePermission.findMany({
        where: { roleId: role.id },
        include: { permission: true },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].permission.action).toBe("view");
      expect(rows[0].granted).toBe(true);
      expect(await prisma.auditLog.count()).toBe(0);
      // And the service still resolves the old permission afterwards.
      const codes = await permissions.resolvePermissions(user.id);
      expect(codes).toEqual(["products.view"]);
    });

    it("concurrent replacements: final matrix is exactly one of the two (AC-17)", async () => {
      const user = await createUser(freshUsername());
      const role = await createRole("seller");
      await prisma.userRole.create({
        data: { userId: user.id, roleId: role.id },
      });
      const matrixA = [{ module: "products", action: "view", granted: true }];
      const matrixB = [{ module: "products", action: "create", granted: true }];
      const [resultA, resultB] = await Promise.all([
        rbac.replaceRolePermissions(role.id, matrixA, user.id),
        rbac.replaceRolePermissions(role.id, matrixB, user.id),
      ]);
      expect(resultA.cacheInvalidated).toBe(true);
      expect(resultB.cacheInvalidated).toBe(true);
      const audits = await prisma.auditLog.findMany({
        where: { action: "role.permissions_updated" },
      });
      expect(audits).toHaveLength(2);
      // The two audit rows hold exactly the two matrices (in some order);
      // the resolved permissions match exactly one of them — never a mix.
      // Compare by code sets, not JSON strings: PostgreSQL JSONB returns
      // object keys in alphabetical order, so stringified objects differ.
      const auditedCodeSets = audits.map((a) =>
        (
          a.after as unknown as {
            permissions: {
              module: string;
              action: string;
              granted: boolean;
            }[];
          }
        ).permissions
          .map((p) => `${p.module}.${p.action}`)
          .sort()
          .join(","),
      );
      expect(new Set(auditedCodeSets)).toEqual(
        new Set(["products.view", "products.create"]),
      );
      const codes = await permissions.resolvePermissions(user.id);
      const resolvedCodes = [...codes].sort().join(",");
      expect(["products.view", "products.create"]).toContain(resolvedCodes);
      expect(auditedCodeSets).toContain(resolvedCodes);
    });

    it("validation errors: unknown code 400, unknown role/user 404, duplicates 400", async () => {
      const user = await createUser(freshUsername());
      const role = await createRole("seller");
      const unknownError = (await rbac
        .replaceRolePermissions(
          role.id,
          [{ module: "nope", action: "view", granted: true }],
          user.id,
        )
        .catch((e: unknown) => e)) as unknown as {
        status: number;
        response: { error: string; details: { code: string }[] };
      };
      expect(unknownError.status).toBe(400);
      expect(unknownError.response.error).toBe("VALIDATION_ERROR");
      expect(unknownError.response.details[0].code).toBe("UNKNOWN_PERMISSION");

      await expect(
        rbac.replaceRolePermissions(
          randomUUID(),
          [{ module: "products", action: "view", granted: true }],
          user.id,
        ),
      ).rejects.toMatchObject({
        status: 404,
        response: { error: "ROLE_NOT_FOUND" },
      });
      await expect(
        rbac.replaceUserPermissions(
          randomUUID(),
          [{ module: "products", action: "view", granted: true }],
          user.id,
        ),
      ).rejects.toMatchObject({
        status: 404,
        response: { error: "NOT_FOUND" },
      });
      await expect(
        rbac.replaceRolePermissions(
          role.id,
          [
            { module: "products", action: "view", granted: true },
            { module: "products", action: "view", granted: false },
          ],
          user.id,
        ),
      ).rejects.toMatchObject({
        status: 400,
        response: { error: "VALIDATION_ERROR" },
      });
    });

    it("self-edit is audited (AC-09 mechanism for M06-04)", async () => {
      const user = await createUser(freshUsername());
      await rbac.replaceUserPermissions(
        user.id,
        [{ module: "products", action: "view", granted: true }],
        user.id,
      );
      const audits = await prisma.auditLog.findMany({
        where: { action: "user.permissions_updated" },
      });
      expect(audits).toHaveLength(1);
      expect(audits[0].actorId).toBe(user.id);
      expect(audits[0].entityId).toBe(user.id);
    });

    it("user deny affects only that account; same-role accounts keep access (AC-18)", async () => {
      const userA = await createUser(freshUsername());
      const userB = await createUser(freshUsername());
      const role = await createRole("seller");
      await grantRolePermission(role.id, "products.view");
      await prisma.userRole.createMany({
        data: [
          { userId: userA.id, roleId: role.id },
          { userId: userB.id, roleId: role.id },
        ],
      });
      const tokenA = await loginOk(userA.username);
      const tokenB = await loginOk(userB.username);
      expect((await getRbac("products-view", tokenA)).status).toBe(200);
      expect((await getRbac("products-view", tokenB)).status).toBe(200);
      await rbac.replaceUserPermissions(
        userA.id,
        [{ module: "products", action: "view", granted: false }],
        userA.id,
      );
      expect((await getRbac("products-view", tokenA)).status).toBe(403);
      expect((await getRbac("products-view", tokenB)).status).toBe(200);
    });
  });

  // ------------------------------------------------- seed (AC-04)

  describe("seed (AC-04)", () => {
    it("seeds exactly the 39 catalog codes, idempotent on re-run", async () => {
      const count = await prisma.permission.count();
      expect(count).toBe(39);
      const distinct = await prisma.permission.findMany({
        select: { module: true, action: true },
      });
      const codes = distinct.map((p) => `${p.module}.${p.action}`);
      expect(new Set(codes).size).toBe(39);
      // The 5 codes no endpoint uses yet are still in the catalog (RB-01/RB-02).
      for (const code of [
        "products.view",
        "categories.view",
        "brands.view",
        "articles.view",
        "fitments.update",
      ]) {
        expect(codes).toContain(code);
      }
      expect(PERMISSION_CATALOG).toHaveLength(39);
      const rerun = await seedPermissions(prisma);
      expect(rerun).toEqual({ created: 0, unchanged: 39, unknownInDb: [] });
    });

    it("seed never overwrites an edited description", async () => {
      await prisma.permission.updateMany({
        where: { module: "products", action: "view" },
        data: { description: "edited by test" },
      });
      await seedPermissions(prisma);
      const row = await prisma.permission.findFirst({
        where: { module: "products", action: "view" },
      });
      expect(row?.description).toBe("edited by test");
    });

    it("seed reports DB codes outside the catalog without deleting them (AC-10)", async () => {
      const rogue = await prisma.permission.create({
        data: { module: "rogue", action: "view", description: null },
      });
      const result = await seedPermissions(prisma);
      expect(result).toEqual({
        created: 0,
        unchanged: 39,
        unknownInDb: ["rogue.view"],
      });
      expect(await prisma.permission.count()).toBe(40);
      expect(
        await prisma.permission.findUnique({ where: { id: rogue.id } }),
      ).not.toBeNull();
    });
  });

  // ------------------------------------------------- /me unchanged (AC-13)

  describe("/me unchanged (AC-13)", () => {
    it("getMe returns the same union + deny-wins semantics as M02-05", async () => {
      const user = await createUser(freshUsername());
      const role = await createRole("seller");
      await grantRolePermission(role.id, "products.view");
      await grantRolePermission(role.id, "orders.view");
      await prisma.userRole.create({
        data: { userId: user.id, roleId: role.id },
      });
      await grantUserPermission(user.id, "products.view", false);
      await grantUserPermission(user.id, "articles.create", true);
      const token = await loginOk(user.username);
      const res = await request(app.getHttpServer())
        .get("/api/v1/auth/admin/me")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Forwarded-For", freshIp());
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(user.id);
      expect(res.body.data.username).toBe(user.username);
      expect(res.body.data.roles).toEqual([{ id: role.id, name: "seller" }]);
      expect(res.body.data.permissions).toEqual([
        "articles.create",
        "orders.view",
      ]);
    });
  });

  // ------------------------------------------------- module shape (AC-03)

  describe("module shape (AC-03/RB-13)", () => {
    it("PermissionsModule imports nothing (independent of AuthModule)", () => {
      // The @Module decorator only sets "imports" metadata when the key
      // is given: undefined here means PermissionsModule declares no
      // imports at all (neither AuthModule nor anything else).
      const imports = Reflect.getMetadata("imports", PermissionsModule) as
        unknown[] | undefined;
      expect(imports ?? []).toEqual([]);
    });
  });

  // ------------------------------------------------- rate limit (AC-15)

  describe("rate limit (AC-15)", () => {
    it("adminAuthed 300/min unchanged: 300 requests OK, 301st -> 429 + Retry-After", async () => {
      const user = await createUser(freshUsername());
      const ip = freshIp();
      const token = await loginOk(user.username, ip);
      for (let i = 0; i < 300; i++) {
        const res = await getRbac("any-admin", token, ip);
        expect(res.status).toBe(200);
      }
      const blocked = await getRbac("any-admin", token, ip);
      expect(blocked.status).toBe(429);
      expect(blocked.body.error).toBe("RATE_LIMITED");
      expect(blocked.headers["retry-after"]).toBeDefined();
    });
  });
});
