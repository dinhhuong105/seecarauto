import "reflect-metadata";
import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { randomUUID } from "node:crypto";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/app-setup";
import { PasswordService } from "../src/auth/password.service";
import {
  PermissionService,
  permissionsCacheKey,
} from "../src/permissions/permission.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { CacheService } from "../src/redis/cache.service";
import { RedisService } from "../src/redis/redis.service";
import { RbacService } from "../src/rbac/rbac.service";
import { RolesService } from "../src/roles/roles.service";
import {
  PERMISSION_CATALOG,
  seedPermissions,
} from "../prisma/seed-permissions";

// M06-02 Roles CRUD e2e (Pha 1: AC-01 -> AC-12 + AC-16 -> AC-19).
// Real PostgreSQL (seecarauto_test) + real test Redis (127.0.0.1:6399,
// DB 3). The app is created once per file (beforeAll); DB tables +
// Redis are wiped in beforeEach and the permission catalog is re-seeded,
// so every test starts from a clean slate. Users/roles/permissions for
// setup are created directly with Prisma + the M02-05 login endpoint
// (GAP-04 fixtures — M06-01 bootstrap is not needed to test M06-02).
// `trust proxy` is enabled on the TEST app only, mirroring
// auth.e2e-spec.ts / rbac.e2e-spec.ts.
jest.setTimeout(60_000);

const PASSWORD = "correct horse battery staple";

let userCounter = 0;
let roleCounter = 0;
let ipCounter = 0;
const freshUsername = () =>
  `e2e-roles-${++userCounter}-${randomUUID().slice(0, 8)}`;
const freshRoleName = () => `role-${++roleCounter}-${randomUUID().slice(0, 8)}`;
const freshIp = () => `10.40.50.${++ipCounter}`;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const MATRIX_A = [{ module: "products", action: "view", granted: true }];
const MATRIX_B = [{ module: "products", action: "create", granted: true }];

describe("Roles CRUD (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let cache: CacheService;
  let passwords: PasswordService;
  let permissions: PermissionService;
  let rbac: RbacService;
  let roles: RolesService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
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
    roles = app.get(RolesService);
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

  async function createUser(username: string, isActive = true) {
    const passwordHash = await passwords.hash(PASSWORD);
    return prisma.user.create({
      data: { username, passwordHash, isActive },
    });
  }

  async function createRolePrisma(name: string) {
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

  async function loginOk(username: string, ip = freshIp()) {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/admin/login")
      .set("X-Forwarded-For", ip)
      .send({ username, password: PASSWORD });
    expect(res.status).toBe(200);
    return res.body.data.accessToken as string;
  }

  /** Creates a user whose role grants exactly `codes`, returns its token. */
  async function adminWith(codes: string[]) {
    const user = await createUser(freshUsername());
    const role = await createRolePrisma(freshRoleName());
    for (const code of codes) {
      await grantRolePermission(role.id, code);
    }
    await prisma.userRole.create({
      data: { userId: user.id, roleId: role.id },
    });
    const token = await loginOk(user.username);
    return { user, role, token };
  }

  async function fullAdmin() {
    return adminWith([
      "roles.view",
      "roles.create",
      "roles.update",
      "roles.delete",
    ]);
  }

  function req(
    method: "get" | "post" | "patch" | "put" | "delete",
    path: string,
    token?: string,
  ) {
    let r = request(app.getHttpServer())[method](`/api/v1${path}`);
    if (token !== undefined) {
      r = r.set("Authorization", `Bearer ${token}`);
    }
    return r.set("X-Forwarded-For", freshIp());
  }

  async function getMatrixEtag(roleId: string, token: string) {
    const res = await req("get", `/roles/${roleId}/permissions`, token);
    expect(res.status).toBe(200);
    const etag = res.headers["etag"] as string | undefined;
    expect(etag).toMatch(/^"[0-9a-f]{64}"$/);
    return etag as string;
  }

  // ------------------------------------------------- AC-01 list + paging

  describe("AC-01 list + pagination", () => {
    it("paginates with meta, clamps limit, empty page beyond totalPages", async () => {
      const { token } = await fullAdmin();
      // Names use the "pg-" prefix so they sort before the admin's own
      // "role-*" role; total is 26 (25 created here + the admin's role).
      for (let i = 0; i < 25; i++) {
        const name = `pg-${String(i).padStart(2, "0")}`;
        const res = await req("post", "/roles", token).send({ name });
        expect(res.status).toBe(201);
      }
      const page1 = await req("get", "/roles", token);
      expect(page1.status).toBe(200);
      expect(page1.body.data).toHaveLength(20);
      expect(page1.body.meta).toEqual({
        page: 1,
        limit: 20,
        total: 26,
        totalPages: 2,
      });
      expect(page1.body.data[0].name).toBe("pg-00");
      expect(page1.body.data[19].name).toBe("pg-19");
      expect(page1.body.data[0]).toEqual(
        expect.objectContaining({ userCount: 0 }),
      );
      const page2 = await req("get", "/roles?page=2&limit=20", token);
      expect(page2.body.data).toHaveLength(6);
      expect(page2.body.data[0].name).toBe("pg-20");
      // limit over 100 clamps to 100, no error.
      const clamped = await req("get", "/roles?limit=101", token);
      expect(clamped.status).toBe(200);
      expect(clamped.body.meta.limit).toBe(100);
      expect(clamped.body.data).toHaveLength(26);
      // page beyond totalPages -> empty data + correct meta, not 404.
      const beyond = await req("get", "/roles?page=99", token);
      expect(beyond.status).toBe(200);
      expect(beyond.body.data).toEqual([]);
      expect(beyond.body.meta).toEqual({
        page: 99,
        limit: 20,
        total: 26,
        totalPages: 2,
      });
    });

    it("no token -> 401; without roles.view -> 403", async () => {
      const { token } = await fullAdmin();
      await createRolePrisma(freshRoleName());
      expect((await req("get", "/roles")).status).toBe(401);
      const creator = await adminWith(["roles.create"]);
      const denied = await req("get", "/roles", creator.token);
      expect(denied.status).toBe(403);
      expect(denied.body.error).toBe("FORBIDDEN");
      expect((await req("get", "/roles", token)).status).toBe(200);
    });
  });

  // ------------------------------------------------- AC-02 create

  describe("AC-02 create", () => {
    it("creates a role (201, envelope, description null by default)", async () => {
      const { token } = await fullAdmin();
      const res = await req("post", "/roles", token).send({
        name: "seller",
        description: "Bán hàng",
      });
      expect(res.status).toBe(201);
      expect(res.body.data).toEqual(
        expect.objectContaining({ name: "seller", description: "Bán hàng" }),
      );
      expect(res.body.data.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      const row = await prisma.role.findUnique({
        where: { id: res.body.data.id },
      });
      expect(row).not.toBeNull();

      const noDesc = await req("post", "/roles", token).send({
        name: "viewer-only",
      });
      expect(noDesc.status).toBe(201);
      expect(noDesc.body.data.description).toBeNull();
    });

    it("missing/empty name -> 400; duplicate name -> 409; wrong code -> 403", async () => {
      const { token } = await fullAdmin();
      await req("post", "/roles", token).send({ name: "seller" });
      expect((await req("post", "/roles", token).send({})).status).toBe(400);
      const empty = await req("post", "/roles", token).send({ name: "" });
      expect(empty.status).toBe(400);
      expect(empty.body.error).toBe("VALIDATION_ERROR");
      const dup = await req("post", "/roles", token).send({ name: "seller" });
      expect(dup.status).toBe(409);
      expect(dup.body.error).toBe("ROLE_NAME_DUPLICATE");
      expect(dup.body.message).toBe("Tên vai trò này đã tồn tại.");
      const viewer = await adminWith(["roles.view"]);
      expect(
        (await req("post", "/roles", viewer.token).send({ name: "x" })).status,
      ).toBe(403);
      expect((await req("post", "/roles").send({ name: "x" })).status).toBe(
        401,
      );
    });
  });

  // ------------------------------------------------- AC-03 update

  describe("AC-03 update", () => {
    it("patches only the sent fields; 404/400/409/403 as specified", async () => {
      const { token } = await fullAdmin();
      const created = await req("post", "/roles", token).send({
        name: "seller",
        description: "old",
      });
      const id = created.body.data.id as string;
      const other = await req("post", "/roles", token).send({ name: "other" });

      const patched = await req("patch", `/roles/${id}`, token).send({
        name: "seller-2",
      });
      expect(patched.status).toBe(200);
      expect(patched.body.data).toEqual(
        expect.objectContaining({ id, name: "seller-2", description: "old" }),
      );
      const cleared = await req("patch", `/roles/${id}`, token).send({
        description: null,
      });
      expect(cleared.status).toBe(200);
      expect(cleared.body.data.description).toBeNull();

      const missing = await req("patch", `/roles/${randomUUID()}`, token).send({
        name: "x",
      });
      expect(missing.status).toBe(404);
      expect(missing.body.error).toBe("ROLE_NOT_FOUND");
      const badUuid = await req("patch", "/roles/not-a-uuid", token).send({
        name: "x",
      });
      expect(badUuid.status).toBe(400);
      expect(badUuid.body.error).toBe("VALIDATION_ERROR");
      expect(badUuid.body.details[0].code).toBe("INVALID_FORMAT");
      const clash = await req("patch", `/roles/${id}`, token).send({
        name: "other",
      });
      expect(clash.status).toBe(409);
      expect(clash.body.error).toBe("ROLE_NAME_DUPLICATE");
      expect(other.status).toBe(201);
      const emptyBody = await req("patch", `/roles/${id}`, token).send({});
      expect(emptyBody.status).toBe(400);
      const viewer = await adminWith(["roles.view"]);
      expect(
        (await req("patch", `/roles/${id}`, viewer.token).send({ name: "y" }))
          .status,
      ).toBe(403);
    });
  });

  // --------------------------------------- AC-04 delete + AC-18 integrity

  describe("AC-04 delete + AC-18 integrity", () => {
    it("deletes an unassigned role (204) and its matrix rows cascade", async () => {
      const { token } = await fullAdmin();
      const role = await createRolePrisma(freshRoleName());
      await grantRolePermission(role.id, "products.view");
      const res = await req("delete", `/roles/${role.id}`, token);
      expect(res.status).toBe(204);
      expect(res.text).toBe("");
      expect(
        await prisma.role.findUnique({ where: { id: role.id } }),
      ).toBeNull();
      expect(
        await prisma.rolePermission.count({ where: { roleId: role.id } }),
      ).toBe(0);
    });

    it("assigned role -> 409 ROLE_HAS_USERS with the count; nothing deleted", async () => {
      const { token } = await fullAdmin();
      const role = await createRolePrisma(freshRoleName());
      await grantRolePermission(role.id, "products.view");
      const active = await createUser(freshUsername());
      const inactive = await createUser(freshUsername(), false);
      await prisma.userRole.createMany({
        data: [
          { userId: active.id, roleId: role.id },
          { userId: inactive.id, roleId: role.id },
        ],
      });
      // Count includes the inactive account (GAP-03/GAP-07).
      const res = await req("delete", `/roles/${role.id}`, token);
      expect(res.status).toBe(409);
      expect(res.body.error).toBe("ROLE_HAS_USERS");
      expect(res.body.message).toBe(
        "Vai trò đang được gán cho 2 tài khoản. Vui lòng chuyển các tài khoản sang vai trò khác trước khi xóa.",
      );
      expect(res.body.details).toEqual([
        {
          field: "count",
          code: "ROLE_HAS_USERS",
          message: "Vai trò đang được gán cho 2 tài khoản.",
        },
      ]);
      // AC-18: role + user_roles + role_permissions all intact.
      expect(
        await prisma.role.findUnique({ where: { id: role.id } }),
      ).not.toBeNull();
      expect(await prisma.userRole.count({ where: { roleId: role.id } })).toBe(
        2,
      );
      expect(
        await prisma.rolePermission.count({ where: { roleId: role.id } }),
      ).toBe(1);
      // Assign one more account: the reported count grows by exactly 1.
      const third = await createUser(freshUsername());
      await prisma.userRole.create({
        data: { userId: third.id, roleId: role.id },
      });
      const again = await req("delete", `/roles/${role.id}`, token);
      expect(again.status).toBe(409);
      expect(again.body.details[0].message).toBe(
        "Vai trò đang được gán cho 3 tài khoản.",
      );
    });

    it("404 / 403 for delete", async () => {
      const { token } = await fullAdmin();
      const missing = await req("delete", `/roles/${randomUUID()}`, token);
      expect(missing.status).toBe(404);
      expect(missing.body.error).toBe("ROLE_NOT_FOUND");
      const viewer = await adminWith(["roles.view"]);
      const role = await createRolePrisma(freshRoleName());
      expect(
        (await req("delete", `/roles/${role.id}`, viewer.token)).status,
      ).toBe(403);
      expect((await req("delete", `/roles/${role.id}`)).status).toBe(401);
    });
  });

  // ------------------------------------------------- AC-05 matrix GET

  describe("AC-05 matrix GET", () => {
    it("returns all 39 catalog codes; ungranted codes are granted:false", async () => {
      const { token } = await fullAdmin();
      const role = await createRolePrisma(freshRoleName());
      await grantRolePermission(role.id, "products.view");
      await grantRolePermission(role.id, "roles.delete", false);
      const res = await req("get", `/roles/${role.id}/permissions`, token);
      expect(res.status).toBe(200);
      expect(res.body.data.roleId).toBe(role.id);
      expect(res.body.data.permissions).toHaveLength(39);
      const codes = res.body.data.permissions.map(
        (p: { module: string; action: string }) => `${p.module}.${p.action}`,
      );
      expect(codes).toEqual(
        [...PERMISSION_CATALOG.map((c) => `${c.module}.${c.action}`)].sort(),
      );
      const byCode = new Map(
        res.body.data.permissions.map(
          (p: { module: string; action: string; granted: boolean }) => [
            `${p.module}.${p.action}`,
            p.granted,
          ],
        ),
      );
      expect(byCode.get("products.view")).toBe(true);
      expect(byCode.get("roles.delete")).toBe(false);
      expect(byCode.get("products.create")).toBe(false);
      expect(res.headers["etag"]).toMatch(/^"[0-9a-f]{64}"$/);
    });

    it("404 / 403 for matrix GET", async () => {
      const { token } = await fullAdmin();
      const missing = await req(
        "get",
        `/roles/${randomUUID()}/permissions`,
        token,
      );
      expect(missing.status).toBe(404);
      expect(missing.body.error).toBe("ROLE_NOT_FOUND");
      const creator = await adminWith(["roles.create"]);
      const role = await createRolePrisma(freshRoleName());
      expect(
        (await req("get", `/roles/${role.id}/permissions`, creator.token))
          .status,
      ).toBe(403);
    });
  });

  // ------------------------------------------------- AC-06 matrix PUT

  describe("AC-06 matrix PUT", () => {
    it("missing/stale If-Match -> 412; matching etag -> 200 + new etag + audit + immediate effect", async () => {
      const { token, user } = await fullAdmin();
      const role = await createRolePrisma(freshRoleName());
      await grantRolePermission(role.id, "products.view");
      // A second admin whose permission changes with the matrix.
      const target = await createUser(freshUsername());
      await prisma.userRole.create({
        data: { userId: target.id, roleId: role.id },
      });
      const targetToken = await loginOk(target.username);
      expect((await req("get", "/roles", targetToken)).status).toBe(403);

      const etag = await getMatrixEtag(role.id, token);
      const noHeader = await req(
        "put",
        `/roles/${role.id}/permissions`,
        token,
      ).send({
        permissions: MATRIX_A,
      });
      expect(noHeader.status).toBe(412);
      expect(noHeader.body.error).toBe("PRECONDITION_FAILED");
      expect(noHeader.body.message).toBe(
        "Dữ liệu đã thay đổi, vui lòng tải lại rồi thử lại.",
      );
      const stale = await req("put", `/roles/${role.id}/permissions`, token)
        .set("If-Match", '"deadbeef"')
        .send({ permissions: MATRIX_A });
      expect(stale.status).toBe(412);

      const ok = await req("put", `/roles/${role.id}/permissions`, token)
        .set("If-Match", etag)
        .send({
          permissions: [{ module: "roles", action: "view", granted: true }],
        });
      expect(ok.status).toBe(200);
      expect(ok.body.data.roleId).toBe(role.id);
      expect(ok.body.data.permissions).toEqual([
        { module: "roles", action: "view", granted: true },
      ]);
      expect(ok.headers["etag"]).toMatch(/^"[0-9a-f]{64}"$/);
      expect(ok.headers["etag"]).not.toBe(etag);

      const audits = await prisma.auditLog.findMany({
        where: { action: "role.permissions_updated" },
      });
      expect(audits).toHaveLength(1);
      expect(audits[0].actorId).toBe(user.id);
      expect(audits[0].entityId).toBe(role.id);
      // The new permission is effective immediately (cache invalidated).
      expect((await req("get", "/roles", targetToken)).status).toBe(200);
    });

    it("unknown code -> 400 UNKNOWN_PERMISSION; duplicate -> 400 DUPLICATE_PERMISSION; 404/403", async () => {
      const { token } = await fullAdmin();
      const role = await createRolePrisma(freshRoleName());
      const etag = await getMatrixEtag(role.id, token);
      const unknown = await req("put", `/roles/${role.id}/permissions`, token)
        .set("If-Match", etag)
        .send({
          permissions: [{ module: "nope", action: "view", granted: true }],
        });
      expect(unknown.status).toBe(400);
      expect(unknown.body.details[0]).toEqual(
        expect.objectContaining({
          field: "permissions[0].action",
          code: "UNKNOWN_PERMISSION",
        }),
      );
      const dup = await req("put", `/roles/${role.id}/permissions`, token)
        .set("If-Match", etag)
        .send({
          permissions: [
            { module: "products", action: "view", granted: true },
            { module: "products", action: "view", granted: false },
          ],
        });
      expect(dup.status).toBe(400);
      expect(dup.body.details[0].code).toBe("DUPLICATE_PERMISSION");
      const missing = await req(
        "put",
        `/roles/${randomUUID()}/permissions`,
        token,
      )
        .set("If-Match", etag)
        .send({ permissions: [] });
      expect(missing.status).toBe(404);
      expect(missing.body.error).toBe("ROLE_NOT_FOUND");
      const viewer = await adminWith(["roles.view"]);
      expect(
        (
          await req("put", `/roles/${role.id}/permissions`, viewer.token)
            .set("If-Match", etag)
            .send({ permissions: [] })
        ).status,
      ).toBe(403);
    });
  });

  // ------------------------------------------------- AC-07 audit

  describe("AC-07 audit", () => {
    it("created/updated/deleted payloads match GAP-05 exactly; no audit for reads", async () => {
      const { token, user } = await fullAdmin();
      const created = await req("post", "/roles", token).send({
        name: "seller",
        description: "Bán hàng",
      });
      const id = created.body.data.id as string;
      await req("get", "/roles", token);
      await req("get", `/roles/${id}/permissions`, token);
      await req("patch", `/roles/${id}`, token).send({ name: "seller-2" });
      // Give the role a matrix so the delete `before` carries it.
      const etag = await getMatrixEtag(id, token);
      await req("put", `/roles/${id}/permissions`, token)
        .set("If-Match", etag)
        .send({
          permissions: [
            { module: "products", action: "view", granted: true },
            { module: "roles", action: "view", granted: true },
          ],
        });
      await req("delete", `/roles/${id}`, token);

      const audits = await prisma.auditLog.findMany({
        orderBy: { createdAt: "asc" },
      });
      const byAction = new Map(audits.map((a) => [a.action, a]));
      // Reads wrote no audit rows: only the 4 mutations are present.
      expect(audits.map((a) => a.action)).toEqual([
        "role.created",
        "role.updated",
        "role.permissions_updated",
        "role.deleted",
      ]);
      for (const a of audits) {
        expect(a.actorId).toBe(user.id);
        expect(a.entityType).toBe("ROLE");
        expect(a.entityId).toBe(id);
      }
      expect(byAction.get("role.created")?.before).toBeNull();
      expect(byAction.get("role.created")?.after).toEqual({
        id,
        name: "seller",
        description: "Bán hàng",
      });
      expect(byAction.get("role.updated")?.before).toEqual({
        id,
        name: "seller",
        description: "Bán hàng",
      });
      expect(byAction.get("role.updated")?.after).toEqual({
        id,
        name: "seller-2",
        description: "Bán hàng",
      });
      expect(byAction.get("role.deleted")?.before).toEqual({
        id,
        name: "seller-2",
        description: "Bán hàng",
        permissions: [
          { module: "products", action: "view" },
          { module: "roles", action: "view" },
        ],
      });
      expect(byAction.get("role.deleted")?.after).toBeNull();
      // No userIds / PII anywhere in the delete payload.
      expect(JSON.stringify(byAction.get("role.deleted")?.before)).not.toMatch(
        /userId|email|phone/i,
      );
    });

    it("audit failure rolls back the whole mutation (ghost actor)", async () => {
      await fullAdmin();
      const ghostActor = randomUUID();
      // Create with an actorId that has no user row: the audit insert
      // violates its FK, so the transaction must roll back entirely.
      await expect(
        roles.createRole({ name: "ghosted" }, ghostActor),
      ).rejects.toMatchObject({
        status: 503,
        response: { error: "SERVICE_UNAVAILABLE" },
      });
      expect(await prisma.role.count()).toBe(1); // only the admin's role
      expect(await prisma.auditLog.count()).toBe(0);

      // Same for delete: a ghost actor must not delete the role.
      const role = await createRolePrisma(freshRoleName());
      await expect(roles.deleteRole(role.id, ghostActor)).rejects.toMatchObject(
        { status: 503 },
      );
      expect(
        await prisma.role.findUnique({ where: { id: role.id } }),
      ).not.toBeNull();
      expect(await prisma.auditLog.count()).toBe(0);
    });
  });

  // ------------------------------------------------- AC-08 authorization

  describe("AC-08 per-endpoint authorization", () => {
    it("each endpoint checks exactly its own code (not a 6x4 matrix)", async () => {
      const viewer = await adminWith(["roles.view"]);
      const creator = await adminWith(["roles.create"]);
      const updater = await adminWith(["roles.update"]);
      const deleter = await adminWith(["roles.delete"]);
      const target = await createRolePrisma(freshRoleName());
      const etag = await getMatrixEtag(target.id, (await fullAdmin()).token);

      // GET /roles needs roles.view: creator (other code) -> 403.
      expect((await req("get", "/roles", creator.token)).status).toBe(403);
      expect((await req("get", "/roles", viewer.token)).status).toBe(200);
      // POST needs roles.create: viewer -> 403, creator -> 201.
      expect(
        (await req("post", "/roles", viewer.token).send({ name: "a1" })).status,
      ).toBe(403);
      expect(
        (await req("post", "/roles", creator.token).send({ name: "a1" }))
          .status,
      ).toBe(201);
      // PATCH needs roles.update: viewer -> 403, updater -> 200.
      expect(
        (
          await req("patch", `/roles/${target.id}`, viewer.token).send({
            name: "b1",
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await req("patch", `/roles/${target.id}`, updater.token).send({
            name: "b1",
          })
        ).status,
      ).toBe(200);
      // DELETE needs roles.delete: viewer -> 403, deleter -> 204.
      const victim = await createRolePrisma(freshRoleName());
      expect(
        (await req("delete", `/roles/${victim.id}`, viewer.token)).status,
      ).toBe(403);
      expect(
        (await req("delete", `/roles/${victim.id}`, deleter.token)).status,
      ).toBe(204);
      // GET matrix needs roles.view: creator -> 403, viewer -> 200.
      expect(
        (await req("get", `/roles/${target.id}/permissions`, creator.token))
          .status,
      ).toBe(403);
      expect(
        (await req("get", `/roles/${target.id}/permissions`, viewer.token))
          .status,
      ).toBe(200);
      // PUT matrix needs roles.update: viewer -> 403, updater -> 200.
      expect(
        (
          await req("put", `/roles/${target.id}/permissions`, viewer.token)
            .set("If-Match", etag)
            .send({ permissions: [] })
        ).status,
      ).toBe(403);
      const etag2 = await getMatrixEtag(target.id, (await fullAdmin()).token);
      expect(
        (
          await req("put", `/roles/${target.id}/permissions`, updater.token)
            .set("If-Match", etag2)
            .send({ permissions: [] })
        ).status,
      ).toBe(200);
    });

    it("no token -> 401 on all 6 endpoints", async () => {
      const role = await createRolePrisma(freshRoleName());
      expect((await req("get", "/roles")).status).toBe(401);
      expect((await req("post", "/roles").send({ name: "x" })).status).toBe(
        401,
      );
      expect(
        (await req("patch", `/roles/${role.id}`).send({ name: "x" })).status,
      ).toBe(401);
      expect((await req("delete", `/roles/${role.id}`)).status).toBe(401);
      expect((await req("get", `/roles/${role.id}/permissions`)).status).toBe(
        401,
      );
      expect(
        (
          await req("put", `/roles/${role.id}/permissions`).send({
            permissions: [],
          })
        ).status,
      ).toBe(401);
    });
  });

  // ------------------------------------------------- AC-09 error matrix

  describe("AC-09 error matrix", () => {
    it("error bodies carry status + code + Vietnamese message, no internals leak", async () => {
      const { token } = await fullAdmin();
      const bodies: unknown[] = [];
      bodies.push((await req("get", "/roles")).body);
      bodies.push((await req("post", "/roles", token).send({})).body);
      bodies.push(
        (await req("patch", "/roles/not-a-uuid", token).send({ name: "x" }))
          .body,
      );
      bodies.push((await req("delete", `/roles/${randomUUID()}`, token)).body);
      const viewer = await adminWith(["roles.view"]);
      bodies.push(
        (await req("post", "/roles", viewer.token).send({ name: "x" })).body,
      );
      for (const body of bodies) {
        const b = body as Record<string, unknown>;
        expect(typeof b.statusCode).toBe("number");
        expect(typeof b.error).toBe("string");
        expect(typeof b.message).toBe("string");
        expect(b).not.toHaveProperty("stack");
        expect(JSON.stringify(body)).not.toMatch(
          /PrismaClient|QueryError|at Object\.|node_modules|SELECT .* FROM/i,
        );
      }
      expect((bodies[0] as { error: string }).error).toBe("UNAUTHENTICATED");
      expect((bodies[1] as { error: string }).error).toBe("VALIDATION_ERROR");
      expect((bodies[3] as { error: string }).error).toBe("ROLE_NOT_FOUND");
      expect((bodies[4] as { error: string }).error).toBe("FORBIDDEN");
    });
  });

  // ------------------------------------------------- AC-10 concurrency

  describe("AC-10 concurrency", () => {
    it("two concurrent PUTs (same etag): final matrix is exactly one of the two, never a mix", async () => {
      const { token } = await fullAdmin();
      const role = await createRolePrisma(freshRoleName());
      const etag = await getMatrixEtag(role.id, token);
      const put = (
        matrix: { module: string; action: string; granted: boolean }[],
      ) =>
        req("put", `/roles/${role.id}/permissions`, token)
          .set("If-Match", etag)
          .send({ permissions: matrix });
      const [a, b] = await Promise.all([put(MATRIX_A), put(MATRIX_B)]);
      // Both read the same etag before either wrote: each is 200 or 412
      // (the second writer loses the optimistic race); at least one wins.
      expect([a.status, b.status].every((s) => s === 200 || s === 412)).toBe(
        true,
      );
      expect([a.status, b.status]).toContain(200);
      const after = await req("get", `/roles/${role.id}/permissions`, token);
      const granted = after.body.data.permissions.filter(
        (p: { granted: boolean }) => p.granted,
      );
      expect(granted).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ module: "products" }),
        ]),
      );
      expect(granted).toHaveLength(1);
      expect(["view", "create"]).toContain(granted[0].action);
      const audits = await prisma.auditLog.findMany({
        where: { action: "role.permissions_updated" },
      });
      expect(audits.length).toBeGreaterThanOrEqual(1);
    });

    it("two concurrent PATCHes: last-write-wins, both audited", async () => {
      const { token } = await fullAdmin();
      const role = await createRolePrisma(freshRoleName());
      const [a, b] = await Promise.all([
        req("patch", `/roles/${role.id}`, token).send({ name: "first" }),
        req("patch", `/roles/${role.id}`, token).send({ name: "second" }),
      ]);
      expect(a.status).toBe(200);
      expect(b.status).toBe(200);
      const row = await prisma.role.findUnique({ where: { id: role.id } });
      expect(["first", "second"]).toContain(row?.name);
      expect(
        await prisma.auditLog.count({
          where: { action: "role.updated" },
        }),
      ).toBe(2);
    });

    it("two concurrent POSTs with the same name: 1x 201 + 1x 409", async () => {
      const { token } = await fullAdmin();
      const [a, b] = await Promise.all([
        req("post", "/roles", token).send({ name: "dupe" }),
        req("post", "/roles", token).send({ name: "dupe" }),
      ]);
      expect([a.status, b.status].sort()).toEqual([201, 409]);
      expect(await prisma.role.count({ where: { name: "dupe" } })).toBe(1);
    });

    it("concurrent assign + delete can never cascade-delete a fresh assignment", async () => {
      const { user } = await fullAdmin();
      const role = await createRolePrisma(freshRoleName());
      const target = await createUser(freshUsername());
      // Hold the role-row lock in a manual transaction, then fire the
      // assign and the delete: both must BLOCK (not settle) while the
      // lock is held — the FK check on the assignment takes FOR KEY
      // SHARE on the roles row, which conflicts with FOR UPDATE.
      let release!: () => void;
      let lockedResolve!: () => void;
      const lockedPromise = new Promise<void>((r) => {
        lockedResolve = r;
      });
      const releasePromise = new Promise<void>((r) => {
        release = r;
      });
      const holder = prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM roles WHERE id = ${role.id}::uuid FOR UPDATE`;
        lockedResolve();
        await releasePromise;
      });
      await lockedPromise;
      const assignP = rbac.assignUserRole(target.id, role.id, user.id);
      const deleteP = roles.deleteRole(role.id, user.id);
      let assignSettled = false;
      let deleteSettled = false;
      assignP.then(
        () => {
          assignSettled = true;
        },
        () => {
          assignSettled = true;
        },
      );
      deleteP.then(
        () => {
          deleteSettled = true;
        },
        () => {
          deleteSettled = true;
        },
      );
      await sleep(300);
      expect(assignSettled).toBe(false);
      expect(deleteSettled).toBe(false);
      release();
      const [assignR, deleteR] = await Promise.allSettled([
        assignP,
        deleteP,
        holder,
      ]);
      expect(holder).toBeDefined();
      const roleRow = await prisma.role.findUnique({
        where: { id: role.id },
      });
      const assignments = await prisma.userRole.count({
        where: { roleId: role.id },
      });
      if (assignR.status === "fulfilled" && assignR.value.changed) {
        // The assignment won: it must still exist (never cascade-deleted).
        expect(roleRow).not.toBeNull();
        expect(assignments).toBe(1);
        expect(deleteR.status).toBe("rejected");
        if (deleteR.status === "rejected") {
          expect(deleteR.reason).toMatchObject({
            status: 409,
            response: { error: "ROLE_HAS_USERS" },
          });
        }
      } else {
        // The delete won: the assignment was never created.
        expect(deleteR.status).toBe("fulfilled");
        expect(roleRow).toBeNull();
        expect(assignments).toBe(0);
        expect(assignR.status).toBe("rejected");
        if (assignR.status === "rejected") {
          // 404 (role already gone when the assign read it) or 503 (the
          // FK check failed after the delete committed) — both mean the
          // assignment was not created, never silently deleted.
          expect([404, 503]).toContain(
            (assignR.reason as { status: number }).status,
          );
        }
      }
    });

    it("racy assign/delete loop: final state is always consistent", async () => {
      const { user } = await fullAdmin();
      for (let i = 0; i < 5; i++) {
        const role = await createRolePrisma(freshRoleName());
        const target = await createUser(freshUsername());
        const [assignR, deleteR] = await Promise.allSettled([
          rbac.assignUserRole(target.id, role.id, user.id),
          roles.deleteRole(role.id, user.id),
        ]);
        const roleRow = await prisma.role.findUnique({
          where: { id: role.id },
        });
        const assignments = await prisma.userRole.count({
          where: { roleId: role.id },
        });
        if (assignR.status === "fulfilled" && assignR.value.changed) {
          expect(roleRow).not.toBeNull();
          expect(assignments).toBe(1);
        } else {
          expect(roleRow).toBeNull();
          expect(assignments).toBe(0);
          expect(deleteR.status).toBe("fulfilled");
        }
      }
    });
  });

  // ------------------------------------------------- AC-11 cache

  describe("AC-11 cache / invalidation", () => {
    it("PUT matrix invalidates every holder: new permission effective immediately", async () => {
      const { token } = await fullAdmin();
      const role = await createRolePrisma(freshRoleName());
      const target = await createUser(freshUsername());
      await prisma.userRole.create({
        data: { userId: target.id, roleId: role.id },
      });
      const targetToken = await loginOk(target.username);
      expect((await req("get", "/roles", targetToken)).status).toBe(403);
      const etag = await getMatrixEtag(role.id, token);
      const put = await req("put", `/roles/${role.id}/permissions`, token)
        .set("If-Match", etag)
        .send({
          permissions: [{ module: "roles", action: "view", granted: true }],
        });
      expect(put.status).toBe(200);
      expect((await req("get", "/roles", targetToken)).status).toBe(200);
    });

    it("invalidation failure -> change NOT visible yet (stale until manual clear)", async () => {
      const { token, user } = await fullAdmin();
      const role = await createRolePrisma(freshRoleName());
      const target = await createUser(freshUsername());
      await prisma.userRole.create({
        data: { userId: target.id, roleId: role.id },
      });
      const targetToken = await loginOk(target.username);
      expect((await req("get", "/roles", targetToken)).status).toBe(403);
      const etag = await getMatrixEtag(role.id, token);
      // Fail every cache delete (snapshot the call count BEFORE restoring
      // the spy — mockRestore() clears the history, FIX-39 lesson).
      const deleteSpy = jest.spyOn(cache, "delete").mockResolvedValue(false);
      let result: Awaited<ReturnType<RolesService["updateRolePermissions"]>>;
      let attempts = 0;
      try {
        result = await roles.updateRolePermissions(
          role.id,
          [{ module: "roles", action: "view", granted: true }],
          etag,
          user.id,
        );
        attempts = deleteSpy.mock.calls.length;
      } finally {
        deleteSpy.mockRestore();
      }
      expect(result.cacheInvalidated).toBe(false);
      expect(attempts).toBe(3);
      // The committed change is NOT visible yet: stale 403 stands.
      expect((await req("get", "/roles", targetToken)).status).toBe(403);
      // Manual invalidation makes it visible.
      expect(await cache.delete(permissionsCacheKey(target.id))).toBe(true);
      expect((await req("get", "/roles", targetToken)).status).toBe(200);
    });

    it("PATCH name/description does not change permissions", async () => {
      const { token } = await fullAdmin();
      const role = await createRolePrisma(freshRoleName());
      await grantRolePermission(role.id, "roles.view");
      const target = await createUser(freshUsername());
      await prisma.userRole.create({
        data: { userId: target.id, roleId: role.id },
      });
      const targetToken = await loginOk(target.username);
      expect((await req("get", "/roles", targetToken)).status).toBe(200);
      await req("patch", `/roles/${role.id}`, token).send({
        name: "renamed",
      });
      expect((await req("get", "/roles", targetToken)).status).toBe(200);
    });
  });

  // ------------------------------------------------- AC-12 rate limit

  describe("AC-12 rate limit", () => {
    it("adminAuthed 300/min: 300 requests OK, 301st -> 429 + Retry-After", async () => {
      const { token } = await fullAdmin();
      for (let i = 0; i < 300; i++) {
        const res = await req("get", "/roles", token);
        // The rate-limit counter is per account, not per IP: reuse the
        // same token; the IP header only matters for login limits.
        expect(res.status).toBe(200);
      }
      const blocked = await req("get", "/roles", token);
      expect(blocked.status).toBe(429);
      expect(blocked.body.error).toBe("RATE_LIMITED");
      expect(blocked.headers["retry-after"]).toBeDefined();
    });
  });

  // ------------------------------------------------- AC-17 userCount

  describe("AC-17 userCount", () => {
    it("counts assigned accounts including inactive ones, on every page", async () => {
      const { token } = await fullAdmin();
      const role = await createRolePrisma(freshRoleName());
      const active1 = await createUser(freshUsername());
      const active2 = await createUser(freshUsername());
      const inactive = await createUser(freshUsername(), false);
      await prisma.userRole.createMany({
        data: [
          { userId: active1.id, roleId: role.id },
          { userId: active2.id, roleId: role.id },
          { userId: inactive.id, roleId: role.id },
        ],
      });
      const res = await req("get", "/roles", token);
      const item = res.body.data.find((r: { id: string }) => r.id === role.id);
      expect(item.userCount).toBe(3);
      // A role with no accounts reports 0, on every page.
      const emptyRole = await createRolePrisma(freshRoleName());
      const page2 = await req("get", "/roles?limit=1&page=2", token);
      expect(page2.body.data[0]).toEqual(
        expect.objectContaining({ userCount: expect.any(Number) }),
      );
      const all = await req("get", "/roles?limit=100", token);
      const found = all.body.data.find(
        (r: { id: string }) => r.id === emptyRole.id,
      );
      expect(found.userCount).toBe(0);
    });
  });

  // ------------------------------------------------- AC-19 release gate

  describe("AC-19 release gate M06-08", () => {
    it("DELETE + PUT matrix work on this branch with NO Last-Super-Admin blocking", async () => {
      const { token } = await fullAdmin();
      const role = await createRolePrisma(freshRoleName());
      const etag = await getMatrixEtag(role.id, token);
      const put = await req("put", `/roles/${role.id}/permissions`, token)
        .set("If-Match", etag)
        .send({ permissions: MATRIX_A });
      expect(put.status).toBe(200);
      expect(put.body.error).toBeUndefined();
      const victim = await createRolePrisma(freshRoleName());
      const del = await req("delete", `/roles/${victim.id}`, token);
      expect(del.status).toBe(204);
      // Neither endpoint ever returns a LAST_SUPER_ADMIN* code in M06-02:
      // the gate is a release gate (no go-live until M06-08 DONE), not a
      // runtime check — see brief §2.7 and the Stage 2 report.
    });
  });
});
