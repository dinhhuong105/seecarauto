# RBAC nền tảng — Hạ tầng backend (M02-06)

Tài liệu kỹ thuật cho lớp phân quyền (authorization) của backend SeeCar Auto.
Nguồn yêu cầu: Task Brief `docs/project-management/tasks/M02-06.md` (Revision 03,
ACCEPTED), API_SPEC §6, RBAC Matrix (M01-05), Error Catalog, Task Brief M02-05
(D-10: `/me` resolve permission từ DB; RB-01→RB-15 đã quyết định).

M02-06 chỉ xây **nền tảng ủy quyền phía backend**: resolve permission dùng chung,
guard + decorator, cache + invalidation, audit helper, mutation service, seed
catalog. M02-06 **không** triển khai endpoint quản trị RBAC nào — 12 endpoint
thuộc M06-02/03/04/07 (RB-15); không có bảo vệ Last-Super-Admin — thuộc M06-08
(RB-07).

## 1. Tổng quan

| Thành phần | File | Vai trò |
|---|---|---|
| PermissionService | `backend/src/permissions/permission.service.ts` | Resolve permission dùng chung (cache + DB fallback), validate code, invalidation |
| PermissionsModule | `backend/src/permissions/permissions.module.ts` | Module độc lập, không phụ thuộc AuthModule (RB-13); AuthModule và RbacModule đều import |
| PermissionsGuard | `backend/src/rbac/permissions.guard.ts` | NestJS guard kiểm tra 1 code trên mỗi handler (RB-09) |
| RequirePermission | `backend/src/rbac/require-permission.decorator.ts` | Decorator khai báo code; metadata key `rbac:requiredPermission` |
| RbacService | `backend/src/rbac/rbac.service.ts` | Mutation service: thay ma trận role, thay ngoại lệ user, gán/bỏ role (RB-06) |
| RbacAuditService | `backend/src/rbac/audit.service.ts` | Audit helper: ghi 1 row AuditLog trong cùng transaction với mutation (RB-06/RB-11) |
| RbacException | `backend/src/rbac/rbac.errors.ts` | Mọi lỗi RBAC đúng Error Catalog (tách riêng khỏi AuthException của M02-05) |
| RbacModule | `backend/src/rbac/rbac.module.ts` | Import PermissionsModule + AuthModule; export PermissionsGuard, RbacAuditService, RbacService |
| Seed | `backend/prisma/seed-permissions.ts` | Seed catalog 39 code, idempotent (RB-08) |

Không migration mới: 7 model RBAC (`Role`, `Permission`, `RolePermission`,
`UserRole`, `UserPermission`, `AuditLog` + `User`) đã có từ M02-01.

## 2. Permission catalog — 39 code (API_SPEC §6)

Code dạng `<module>.<action>`. Bảng đầy đủ nằm trong seed
(`backend/prisma/seed-permissions.ts`, hằng `PERMISSION_CATALOG`):

| Module | Quyền |
|---|---|
| products | view, create, update, delete |
| categories | view, create, update, delete |
| brands | view, create, update, delete |
| vehicles | view, create, update, delete |
| fitments | view, create, update, delete |
| orders | view, update, cancel, confirm |
| articles | view, create, update, delete |
| redirects | view, create, delete |
| roles | view, create, update, delete |
| users | view, update |
| audit | view |
| dashboard | view |

- **5 code chưa endpoint nào dùng** nhưng vẫn nằm trong catalog (seed đầy đủ
  39 code): `products.view`, `categories.view`, `brands.view`,
  `articles.view` — phục vụ hiển thị admin UI + `/me` + catalog, **không**
  dùng để chặn GET public (RB-01); `fitments.update` — catalog khớp §6,
  chưa có endpoint nào dùng (RB-02).
- `Permission.description` nullable; seed để `null` vì §6 không có mô tả
  từng code — không tự bịa mô tả. Seed không ghi đè description đã chỉnh sửa.
- Code `*` không phải permission trong catalog: nghĩa là "mọi tài khoản admin
  đã đăng nhập", chỉ dùng cho endpoint lấy thông tin của chính mình
  (`/me`, logout) — API_SPEC §6.

## 3. Đánh giá quyền — deny luôn thắng allow (RB-05)

`PermissionService.resolvePermissions(userId)` gộp:

1. Mọi grant của mọi role tài khoản đang giữ (`user_roles` →
   `role_permissions`).
2. Ngoại lệ theo tài khoản (`user_permissions`): grant thêm code, hoặc deny
   (granted = false) một code.

Deny thắng allow trong mọi cặp xung đột (giữ nguyên semantics `/me` của
M02-05, D-10):

| Role grant | Role deny | User grant | User deny | Kết quả |
|---|---|---|---|---|
| ✓ | ✓ | — | — | deny |
| ✓ | — | — | ✓ | deny |
| ✓ | ✓ (role khác) | ✓ | — | deny |
| — | — | ✓ | — | allow |

Một tài khoản không thể vừa grant vừa deny cùng một code (khóa duy nhất
`user_permissions(user_id, permission_id)`).

## 4. PermissionService — resolve, cache, invalidation (RB-04)

- **Resolve:** `resolvePermissions(userId)` — cache-aside qua
  `CacheService.remember`, key `seecarauto:v1:rbac:permissions:<userId>`,
  TTL 300 giây (`CACHE_TTL_SECONDS.userPermissions`, ADR-006; không hard-code
  300 trong code nghiệp vụ). Tài khoản không tồn tại → 401 UNAUTHENTICATED
  (không rò rỉ "user không tồn tại" ra ngoài). Lỗi DB khi resolve → 503
  SERVICE_UNAVAILABLE fail-closed (không trả danh sách rỗng giả).
- **DB fallback (RB-04):** khi Redis lỗi, `CacheService.get` trả `null`
  và resolve đọc thẳng DB — request hợp lệ không bị từ chối chỉ vì cache
  hỏng. Ngược lại, nếu DB cũng không đọc được thì 503 (không đoán quyền).
- **Invalidation:** `invalidateUserPermissions(userId)` xóa đúng 1 key,
  retry tối đa 3 lần, log lỗi nếu thất bại và trả `false` — caller **không
  được** tuyên bố quyền có hiệu lực ngay khi invalidation chưa thành công;
  quyền cũ trong cache tối đa còn sống hết TTL 300 giây.
  `invalidateRolePermissions(roleId)` liệt kê mọi tài khoản giữ role rồi
  invalidate từng tài khoản (lỗi đọc danh sách holder → `false`).
  `invalidateUsersPermissions(userIds)` invalidate hàng loạt.
- **Validate code:** `validatePermissionCodes(codes)` — code lạ → 400
  VALIDATION_ERROR, `details: [{ field: "permissions[i].action", code:
  "UNKNOWN_PERMISSION" }]` (RB-03). `getCatalogCodes()` trả 39 code đã sort.

## 5. PermissionsGuard + @RequirePermission (RB-09)

NestJS guard — không dùng Express middleware; không áp dụng global; gắn
tường minh lên controller/route admin. Guard chạy **sau** JwtAuthGuard
(xác thực trước, ủy quyền sau). Thứ tự kiểm tra trong `canActivate`:

1. `request.admin` chưa có (JwtAuthGuard chưa chạy hoặc đã từ chối) →
   401 UNAUTHENTICATED.
2. Handler/class không có metadata `@RequirePermission` → 403 FORBIDDEN
   (fail-closed: handler đã gắn guard mà quên khai báo quyền thì từ chối,
   không cho qua âm thầm).
3. Code `*` → mọi admin đã đăng nhập đều qua (không resolve permission).
4. Ngược lại resolve permission của tài khoản và yêu cầu chứa code đã khai
   báo; thiếu → 403 FORBIDDEN (Error Catalog §3, không rò rỉ thêm thông tin).

Ví dụ sử dụng (cho module M03+):

```ts
@Controller("products")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
  @Post()
  @RequirePermission("products.create")
  create(@Body() dto: CreateProductDto) { /* ... */ }
}
```

Lưu ý: `JwtAuthGuard` vẫn kiểm tra blacklist + rate limit `adminAuthed`
trước guard (M02-05). Khi Redis chết hẳn, request HTTP 503 ngay ở bước
blacklist của JwtAuthGuard trước khi tới PermissionsGuard — đó là hành vi
fail-closed của M02-05 (AC-18), không phải lỗi của guard; DB fallback của
RB-04 được chứng minh ở tầng service (xem §9).

## 6. Audit helper (RB-06, RB-11)

`RbacAuditService.record(tx, input)` / hàm `recordRbacAudit(tx, input)` —
ghi 1 row `AuditLog` bằng transaction client của caller, nên audit commit
hoặc rollback cùng mutation (lỗi audit → mutation rollback, không có
"đổi quyền nhưng mất audit"). Helper tự nó không commit gì và không
invalidate cache.

7 action duy nhất (RB-11): `role.created`, `role.updated`, `role.deleted`,
`role.permissions_updated`, `user.roles_assigned`, `user.roles_removed`,
`user.permissions_updated`. `entityType` phải khớp action (`role.*` →
`ROLE`, `user.*` → `USER`). `actorId`/`entityId` phải là UUID.

**An toàn dữ liệu (AC-14):** `before`/`after` chỉ được chứa dữ liệu quyền
(code, granted, danh sách role id). Helper quét đệ quy và từ chối mọi key
chứa `password`, `passwordhash`, `token`, `refreshtoken`, `accesstoken`,
`secret`, `hash` → 400 VALIDATION_ERROR trước khi chạm DB.

## 7. RbacService — mutations (RB-06, AC-07/AC-17)

Bốn method, mỗi method = 1 transaction PostgreSQL (đổi quyền + audit) rồi
mới invalidate cache. Method trả `{ ..., cacheInvalidated: boolean }` để
caller biết quyền mới đã thấy ngay (`true`) hay có thể chờ tới hết TTL
(`false` — xem §4).

| Method | Hành vi |
|---|---|
| `replaceRolePermissions(roleId, items, actorId)` | Thay **toàn bộ** ma trận của role (xóa hết + chèn lại + audit `role.permissions_updated`). Khóa row role (`SELECT ... FOR UPDATE`) nên 2 lần thay đồng thời serialize — trạng thái cuối là đúng 1 trong 2 ma trận, không trộn (AC-17). Role không tồn tại → 404 ROLE_NOT_FOUND. |
| `replaceUserPermissions(userId, items, actorId)` | Thay ngoại lệ của tài khoản; item `granted: null` = xóa ngoại lệ đó (rơi về grant của role). Audit `user.permissions_updated`. User không tồn tại → 404 NOT_FOUND. |
| `assignUserRole(userId, roleId, actorId)` | Gán role; đã có role đó rồi là no-op idempotent (không ghi audit lần 2). Audit `user.roles_assigned`. Role không tồn tại → 404 ROLE_NOT_FOUND. |
| `removeUserRole(userId, roleId, actorId)` | Bỏ role; chưa có role đó là no-op idempotent (không ghi audit). Audit `user.roles_removed`. |

Validate trước mọi write: UUID đúng định dạng, không trùng code trong
input, mọi code thuộc catalog (code lạ → 400, role/user không tồn tại →
404). Lỗi DB giữa transaction → 503 fail-closed, không rò rỉ lỗi Prisma
(AC-16). Không method nào tạo role mới (tạo role thuộc M06-02) — nên lỗi
409 ROLE_NAME_DUPLICATE chỉ tồn tại trong Error Catalog, chưa có code nào
gọi tới trong M02-06.

## 8. Seed permission catalog (RB-08)

```bash
pnpm run seed:permissions   # ts-node prisma/seed-permissions.ts
# hoặc: pnpm exec prisma db seed   (prisma.seed trong backend/package.json)
```

- Idempotent: chỉ chèn code còn thiếu; chạy lại không tạo trùng, không
  sửa row đã có (description đã chỉnh tay được giữ nguyên — đã kiểm chứng
  trên dev DB: sửa description rồi seed lại, description giữ nguyên).
- Không seed role/user. Không chạy trong request hay khi boot app — chạy
  tường minh trong deployment flow, sau migration, trước khi tính năng phụ
  thuộc go-live. Chạy lại có kiểm soát trong production được phép.
- Code trong DB mà không có trong catalog chỉ được **báo cáo**
  (`unknownInDb`), không tự xóa.

## 9. Tích hợp với Auth M02-05

- `AuthService.getMe()` giờ ủy quyền resolve cho
  `PermissionService.resolvePermissions()` (RB-13). Response `/me` và
  semantics giữ nguyên hoàn toàn: `{ id, username, roles: [{ id, name }],
  permissions: [...] }` — gộp role + ngoại lệ, deny thắng allow. Chỉ khác
  ở tầng triển khai: 2 query thay vì 1 (roles + resolve; resolve được cache
  sau lần đầu). Trường hợp biên: DB sập thì `/me` trả 503 thay vì 500 thô
  như trước (cải thiện, không đổi hành vi bình thường).
- `AuthModule` import `PermissionsModule`; `RbacModule` import cả
  `PermissionsModule` và `AuthModule` (tái dùng `JwtAuthGuard`).
  Không circular dependency: không module nào trong hai module kia import
  `RbacModule`.
- Login / refresh / logout / lockout của M02-05 không đổi (D-01→D-16).

## 10. Lỗi (Error Catalog)

| Lỗi | HTTP | Khi nào |
|---|---|---|
| FORBIDDEN | 403 | Thiếu code yêu cầu; hoặc handler gắn guard mà không khai báo `@RequirePermission` |
| UNAUTHENTICATED | 401 | Guard chạy mà `request.admin` chưa có; hoặc resolve cho tài khoản không tồn tại |
| NOT_FOUND | 404 | User không tồn tại (mutation) |
| ROLE_NOT_FOUND | 404 | Role không tồn tại (mutation) |
| VALIDATION_ERROR | 400 | Code lạ (`UNKNOWN_PERMISSION`), code trùng (`DUPLICATE_PERMISSION`), UUID sai định dạng, action audit lạ, entityType sai, key cấm trong audit payload |
| ROLE_NAME_DUPLICATE | 409 | Đã có trong Error Catalog; chưa có code M02-06 nào dùng (tạo role thuộc M06-02) |
| SERVICE_UNAVAILABLE | 503 | DB không đọc/ghi được trong resolve hoặc mutation (fail-closed) |

## 11. Kiểm thử

- Unit: `backend/src/permissions/permission.service.spec.ts` (16 test:
  deny-wins mọi cặp xung đột, cache hit/TTL 300/key scheme, invalidation
  retry 3 lần, validate code), `backend/src/rbac/permissions.guard.spec.ts`
  (7 test: allow/deny/`*`/401/no-metadata/503), `backend/src/rbac/audit.service.spec.ts`
  (8 test: 7 action, entityType, UUID, key cấm AC-14).
- E2E: `backend/test/rbac.e2e-spec.ts` — test controller gắn
  `JwtAuthGuard` + `PermissionsGuard` qua HTTP thật: allow/deny 403,
  `*`, role grant + user deny, invalidation + stale cache, DB fallback
  khi Redis chết (tầng service), mutation + audit cùng transaction,
  rollback khi audit lỗi (FK actorId), thay ma trận đồng thời (AC-17),
  seed idempotent, `/me` không đổi (AC-13).

## 12. Không thuộc M02-06

- 12 endpoint quản trị RBAC (Roles CRUD, permissions catalog/matrix, gán
  role + ngoại lệ user, xem audit log) → M06-02/03/04/07 (RB-15). M02-06
  không có DTO (`backend/src/rbac/dto/` không tồn tại) vì không có endpoint.
- Last-Super-Admin protection → M06-08, chờ Henry xác nhận định nghĩa
  business của tài khoản Super Admin được bảo vệ (RB-07). Không tự định
  nghĩa Super Admin bằng 2 permission `roles.update` + `users.update`.
- Không sửa ERD M01-02 / RBAC Matrix M01-05 (RB-14) — các gap tài liệu đã
  ghi trong brief §9, chờ housekeeping riêng.
