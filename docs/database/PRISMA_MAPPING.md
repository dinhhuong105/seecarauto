# ERD → Prisma Mapping — SeeCar Auto (M02-01)

| Trường | Nội dung |
| --- | --- |
| Task | M02-01 — PostgreSQL + Prisma Schema |
| Milestone | M02 — Database, Infrastructure |
| Trạng thái tài liệu | IN_REVIEW (đã báo cáo ChatGPT review ngày 26/11/2026) |
| Ngày | 26/11/2026 |
| Nguồn | `docs/database/ERD.md` (M01-02 ACCEPT), `docs/database/DATA_DICTIONARY.md`, `docs/api/API_SPEC.md` + `openapi.yaml` (M01-03 ACCEPT), `docs/api/API_SECURITY.md`, `docs/ui-ux/RBAC_MATRIX.md` (M01-05 ACCEPT), `docs/project-management/M02_IMPLEMENTATION_DECISIONS.md` (PD-01 → PD-06 decided, G-02/G-03/G-04) |
| Schema | `backend/prisma/schema.prisma` |
| Migration | `backend/prisma/migrations/20261126152122_init/migration.sql` (638 dòng) |
| Prisma | **6.19.3** — `prisma` và `@prisma/client` đều pin exact `6.19.3` trong `backend/package.json` (không dùng `latest`, không dùng caret cho 2 package này) |
| PostgreSQL | 16 (local baseline; hệ thống kiểm chứng: PostgreSQL 16.15) |

## Quy ước

- Tài liệu này là bản ánh xạ ERD → Prisma của M02-01 — các quy tắc ở đây là thực tế đã triển khai, không phải gợi ý.
- Mọi ví dụ là **ví dụ minh họa, không phải dữ liệu thật**.

## 1. Quy ước ánh xạ

| ERD / PostgreSQL | Prisma |
| --- | --- |
| Bảng `snake_case` số nhiều (vd: `product_identifiers`) | Model PascalCase số ít (`ProductIdentifier`) + `@@map("product_identifiers")` |
| Cột `snake_case` (vd: `brand_id`) | Field camelCase (`brandId`) + `@map("brand_id")` |
| PK `UUID DEFAULT gen_random_uuid()` | `String @id @default(uuid()) @db.Uuid` (Prisma sinh `DEFAULT gen_random_uuid()` trong migration) |
| `TIMESTAMPTZ` | `DateTime @db.Timestamptz` |
| `DECIMAL(12,2)` | `Decimal @db.Decimal(12, 2)` |
| `SMALLINT` (năm) | `Int @db.SmallInt` |
| `VARCHAR(n)` | `String @db.VarChar(n)` |
| `TEXT` | `String @db.Text` |
| Enum DB (vd: `product_status`) | Enum Prisma PascalCase (`ProductStatus`) + `@@map("product_status")` — tên type trong DB giữ đúng ERD |
| FK `ON DELETE RESTRICT / CASCADE`, `ON UPDATE CASCADE` | `onDelete: Restrict / Cascade`, `onUpdate: Cascade` trên mọi relation (ERD §2.3) |
| `updated_at` | `@updatedAt` — Prisma Client tự cập nhật khi update qua Client (xem §6) |
| `created_at` | `@default(now())` |
| `TEXT[]` (SEO keywords) | `String[]` (PostgreSQL `text[]`) |
| `JSONB` (audit before/after) | `Json @db.JsonB` |

## 2. Bảng ánh xạ — 27 bảng

17 bảng ERD (AC-01) + 2 bảng G-02 + 8 bảng G-04 = **27 bảng**. Migration tạo đúng 27 bảng (`CREATE TABLE` đếm được 27).

| # | Bảng (ERD / G-02 / G-04) | Prisma model | Ghi chú |
| --- | --- | --- | --- |
| 1 | `brands` | `Brand` | ERD §4.1 |
| 2 | `categories` | `Category` | ERD §4.2; self-relation parent/children (`CategoryChildren`, RESTRICT) |
| 3 | `products` | `Product` | ERD §4.3; P0 chỉ có `availability_status`, KHÔNG có cột quantity (BR-012/AC-19, quantity là P1) |
| 4 | `product_identifiers` | `ProductIdentifier` | ERD §4.4; issuer matrix (FIX-01) |
| 5 | `product_categories` | `ProductCategory` | ERD §4.5; PK kép `(product_id, category_id)`; KHÔNG có timestamp (đúng ERD) |
| 6 | `product_images` | `ProductImage` | ERD §4.6; chỉ có `created_at`, không có `updated_at` (đúng ERD) |
| 7 | `product_specifications` | `ProductSpecification` | ERD §4.7; bảng P1 (FR-013) — có sẵn cấu trúc, P0 không có dữ liệu |
| 8 | `vehicle_makes` | `VehicleMake` | ERD §4.8 |
| 9 | `vehicle_models` | `VehicleModel` | ERD §4.9; `@@unique([makeId, slug])` |
| 10 | `vehicle_generations` | `VehicleGeneration` | ERD §4.10; `@@unique([modelId, slug])` |
| 11 | `vehicle_variants` | `VehicleVariant` | ERD §4.11 — bảng này là biến thể XE (không phải biến thể sản phẩm; PD-02: không có `product_variants`) |
| 12 | `vehicle_applications` | `VehicleApplication` | ERD §4.12; target fitment duy nhất (PD-01); unique NULLS NOT DISTINCT (xem §5) |
| 13 | `product_vehicle_fitments` | `ProductVehicleFitment` | ERD §4.13; `@@unique([productId, vehicleApplicationId])` |
| 14 | `fitment_change_logs` | `FitmentChangeLog` | ERD §4.14; `changed_by_admin_id` đã có FK → `users.id` (bổ sung ở M02 theo ERD §4.18); append-only, không có `updated_at` |
| 15 | `url_redirects` | `UrlRedirect` | ERD §4.15; `entity_id` KHÔNG có FK (polymorphic — kiểm tra ở application level) |
| 16 | `orders` | `Order` | ERD §4.16; boundary M05 — chỉ đủ cho snapshot/lịch sử; `customer_id` KHÔNG có FK (customers là P1) |
| 17 | `order_items` | `OrderItem` | ERD §4.17; snapshot `product_name/sku/unit_price/quantity/line_total`; chỉ có `created_at` |
| 18 | `articles` | `Article` | G-02 — xem §4.1 |
| 19 | `article_seo` | `ArticleSeo` | G-02 — xem §4.1 |
| 20 | `users` | `User` | G-04 — xem §4.2 |
| 21 | `roles` | `Role` | G-04 — xem §4.2 |
| 22 | `permissions` | `Permission` | G-04 — xem §4.2 |
| 23 | `role_permissions` | `RolePermission` | G-04 — xem §4.2 |
| 24 | `user_roles` | `UserRole` | G-04 — xem §4.2 |
| 25 | `user_permissions` | `UserPermission` | G-04 — xem §4.2 |
| 26 | `audit_logs` | `AuditLog` | G-04 — xem §4.2; append-only, không có `updated_at` |
| 27 | `admin_refresh_sessions` | `AdminRefreshSession` | G-04 — xem §4.2 |

## 3. Enum — 8 enum

7 enum ERD (ERD §12 yêu cầu đúng 7, không thêm) + 1 enum G-02 = **8 enum**. Tên type trong DB giữ đúng ERD nhờ `@@map`.

| Enum Prisma | Type DB | Giá trị | Nguồn |
| --- | --- | --- | --- |
| `ProductStatus` | `product_status` | DRAFT, PUBLISHED, HIDDEN | ERD §4.3 |
| `AvailabilityStatus` | `availability_status` | IN_STOCK, OUT_OF_STOCK | ERD §4.3 |
| `IdentifierType` | `identifier_type` | PART_NUMBER, OEM_NUMBER, MANUFACTURER_PART_NUMBER, ALTERNATE_NUMBER | ERD §4.4 |
| `FitmentAction` | `fitment_action` | ATTACH, DETACH | ERD §4.14 |
| `RedirectEntity` | `redirect_entity` | CATEGORY, BRAND, PRODUCT | ERD §4.15 |
| `PaymentMethod` | `payment_method` | COD, BANK_TRANSFER | ERD §4.16 |
| `OrderStatus` | `order_status` | PENDING, CONFIRMED, SHIPPING, COMPLETED, CANCELLED, REFUNDED | ERD §4.16 — giá trị là đề xuất của ERD; **PD-08 (order status lifecycle) vẫn pending — M05 xác nhận** |
| `ArticleStatus` | `article_status` | DRAFT, PUBLISHED | G-02, OpenAPI `Article.status` |

## 4. Trường bổ sung cho G-02 / G-04 (không có trong ERD)

Mọi trường dưới đây đều có căn cứ trong API Spec / API Security / RBAC Matrix / M02_IMPLEMENTATION_DECISIONS.md. Không tự tạo trường nào ngoài danh sách này.

### 4.1 G-02 — Articles / ArticleSEO (`M02_IMPLEMENTATION_DECISIONS.md` §8)

Căn cứ: OpenAPI schemas `Article`, `ArticleSeo`, `ArticleSummary`; API_SPEC mục 14 (SEO); BR-004 (manual override không bao giờ bị ghi đè).

| Bảng | Trường | Kiểu | Căn cứ |
| --- | --- | --- | --- |
| `articles` | `id` | UUID PK | OpenAPI `Article.id` |
| `articles` | `title` | VARCHAR(255) | OpenAPI `Article.title` |
| `articles` | `slug` | VARCHAR(255) UNIQUE | OpenAPI `Article.slug` |
| `articles` | `content` | TEXT | OpenAPI `Article.content` |
| `articles` | `excerpt` | VARCHAR(500) NULL | OpenAPI `ArticleSummary.excerpt` (bản tóm tắt lấy từ bài viết) |
| `articles` | `cover_image_url` | VARCHAR(1024) NULL | OpenAPI `ArticleSummary.coverImageUrl` |
| `articles` | `status` | `article_status` DEFAULT DRAFT | OpenAPI `Article.status` |
| `articles` | `published_at` | TIMESTAMPTZ NULL | OpenAPI `Article.publishedAt` |
| `articles` | `created_at`, `updated_at` | TIMESTAMPTZ | Quy ước chung |
| `article_seo` | `article_id` | UUID PK + FK → `articles.id` ON DELETE CASCADE | Quan hệ 1:1 với `articles`; xóa bài viết xóa luôn SEO của nó |
| `article_seo` | `seo_title` | VARCHAR(255) NULL | OpenAPI `ArticleSeo.seoTitle` |
| `article_seo` | `meta_description` | VARCHAR(500) NULL | OpenAPI `ArticleSeo.metaDescription` |
| `article_seo` | `focus_keyword` | VARCHAR(255) NULL | OpenAPI `ArticleSeo.focusKeyword` |
| `article_seo` | `secondary_keywords` | TEXT[] | OpenAPI `ArticleSeo.secondaryKeywords` (array) |
| `article_seo` | `search_intent` | VARCHAR(255) NULL | OpenAPI `ArticleSeo.searchIntent` |
| `article_seo` | `manual_override` | TEXT[] | OpenAPI `ArticleSeo.manualOverride` — danh sách trường đã sửa tay; Rule Engine/AI không bao giờ ghi đè (BR-004). Việc tôn trọng danh sách này là trách nhiệm của M07 (Rule Engine/AI); ở tầng model, M02-01 chỉ lưu trữ đúng danh sách. |
| `article_seo` | `created_at`, `updated_at` | TIMESTAMPTZ | Quy ước chung |

### 4.2 G-04 — Admin / RBAC (`M02_IMPLEMENTATION_DECISIONS.md` §10)

Căn cứ: ADR-005, M01-05 RBAC Matrix, API_SPEC §6, API_SECURITY.md §1–§2, OpenAPI schemas `Role`, `PermissionEntry`, `AuditLog`, `AuthTokens`, `AdminMe`.

| Bảng | Trường | Kiểu | Căn cứ |
| --- | --- | --- | --- |
| `users` | `id` | UUID PK | OpenAPI `AdminMe.id`, `AuthTokens.admin.id` |
| `users` | `username` | VARCHAR(255) UNIQUE | OpenAPI `AdminMe.username` |
| `users` | `password_hash` | VARCHAR(255) | Chỉ lưu hash Argon2id (NFR-006, API_SECURITY §1). Không bao giờ lưu plaintext. Hash Argon2id với tham số mặc định dài ~100 ký tự — VARCHAR(255) đủ. |
| `users` | `is_active` | BOOLEAN DEFAULT true | Cần để vô hiệu hóa tài khoản mà không xóa (không có endpoint xóa tài khoản ở P0); dùng qua `users.update` (M06). |
| `users` | `failed_login_attempts` | INT DEFAULT 0, CHECK >= 0 | FR-091 khóa tài khoản (API_SECURITY §1: sai liên tiếp tới ngưỡng → khóa tạm). Ngưỡng và thời gian khóa do M02-05 chốt khi triển khai Auth; schema chỉ chuẩn bị cột. |
| `users` | `locked_until` | TIMESTAMPTZ NULL | FR-091 (API_SECURITY §1). |
| `users` | `created_at`, `updated_at` | TIMESTAMPTZ | Quy ước chung |
| `roles` | `id` | UUID PK | OpenAPI `Role.id` |
| `roles` | `name` | VARCHAR(255) UNIQUE | OpenAPI `Role.name` — vai trò là dữ liệu, không hard-code (RBAC Matrix §1: 5 vai trò ví dụ chỉ là minh họa) |
| `roles` | `description` | TEXT NULL | OpenAPI `Role.description` |
| `roles` | `created_at`, `updated_at` | TIMESTAMPTZ | Quy ước chung |
| `permissions` | `id` | UUID PK | Khóa nội bộ cho các bảng join |
| `permissions` | `module` | VARCHAR(128) | OpenAPI `PermissionEntry.module` (vd: `products`) |
| `permissions` | `action` | VARCHAR(128) | OpenAPI `PermissionEntry.action` (vd: `create`) |
| `permissions` | `description` | TEXT NULL | Ghi chú nội bộ |
| `permissions` | `created_at` | TIMESTAMPTZ | Quy ước chung |
| `permissions` | `@@unique([module, action])` | | Một (module, action) chỉ có một dòng. Permission code (`products.create`) = `module || '.' || action` — suy ra từ 2 cột, không lưu trùng. |
| `role_permissions` | `role_id`, `permission_id` | PK kép | Ma trận vai trò × permission (FR-080) |
| `role_permissions` | `granted` | BOOLEAN DEFAULT true | OpenAPI `PermissionEntry.granted` |
| `user_roles` | `user_id`, `role_id` | PK kép | Gán vai trò cho tài khoản (FR-082) |
| `user_permissions` | `user_id`, `permission_id` | PK kép | Ngoại lệ theo tài khoản (FR-083) |
| `user_permissions` | `granted` | BOOLEAN DEFAULT true | `granted=false` (deny) lấn át allow của vai trò khi kiểm tra quyền (API_SECURITY §2). Semantics kiểm tra thuộc về M02-06; schema chỉ lưu trữ. |
| `audit_logs` | `id` | UUID PK | OpenAPI `AuditLog.id` |
| `audit_logs` | `actor_id` | UUID FK → `users.id` RESTRICT | OpenAPI `AuditLog.actorId` — tài khoản còn lịch sử audit không bị xóa cứng. |
| `audit_logs` | `action` | VARCHAR(255) | OpenAPI `AuditLog.action` (vd: `UPDATE_ROLE_PERMISSIONS`) |
| `audit_logs` | `entity_type` | VARCHAR(128) | OpenAPI `AuditLog.entityType` (vd: `ROLE`) |
| `audit_logs` | `entity_id` | UUID NULL | OpenAPI `AuditLog.entityId` |
| `audit_logs` | `before`, `after` | JSONB NULL | OpenAPI `AuditLog.before/after` (object). Đây là snapshot trạng thái thực thể — dữ liệu thực sự phi cấu trúc, thuộc trường hợp ngoại lệ JSON của ERD §2.2. Không bao giờ lưu PII/token/secret vào đây. |
| `audit_logs` | `created_at` | TIMESTAMPTZ | Quy ước chung; append-only, không `updated_at` |
| `audit_logs` | Indexes | `actor_id`, `(entity_type, entity_id)`, `created_at` | Phục vụ `GET /audit-logs` (lọc theo actor/entity, sắp theo thời gian) |
| `admin_refresh_sessions` | `id` | UUID PK | Phiên làm mới token (API_SECURITY §1) |
| `admin_refresh_sessions` | `user_id` | UUID FK → `users.id` CASCADE | Xóa tài khoản thì các phiên của nó cũng mất. |
| `admin_refresh_sessions` | `token_hash` | VARCHAR(255) UNIQUE | Chỉ lưu HASH SHA-256 của refresh token (API_SECURITY §1, brief §5). Không bao giờ lưu plaintext. UNIQUE để tra cứu chính xác một token khi kiểm tra reuse. |
| `admin_refresh_sessions` | `expires_at` | TIMESTAMPTZ | Hết hạn token (API_SECURITY §1: refresh token dài hạn có xoay vòng). |
| `admin_refresh_sessions` | `revoked_at` | TIMESTAMPTZ NULL | Thu hồi từng session (logout / xoay vòng). |
| `admin_refresh_sessions` | `created_at` | TIMESTAMPTZ | Quy ước chung |
| `admin_refresh_sessions` | Indexes | `user_id`, `expires_at` | Tra cứu phiên theo tài khoản; dọn phiên hết hạn. |

**Không tạo tài khoản admin mặc định.** Không có Super Admin mẫu, không có mật khẩu tĩnh, không có hash mẫu trong schema/migration/README/Git (brief §3.3, §5). Bootstrap Super Admin an toàn thuộc về M06-01; M02-01 chỉ chuẩn bị schema.

## 5. Ràng buộc Prisma không biểu diễn được — raw SQL trong migration

### 5.1 `@@check` không tồn tại trong Prisma 6.19.3 (đã kiểm chứng)

ERD §12 ghi chú 4 viết "`@@check` (Prisma 6 hỗ trợ)". **Điều này sai với Prisma 6.19.3**: đã kiểm chứng ngày 26/11/2026 bằng schema thử nghiệm — `prisma validate` trả về `Attribute not known: "@check"` (P1012). `@@check` chỉ có từ Prisma 7.x. Vì M02-01 pin Prisma 6.19.3 (theo brief: ưu tiên 6.x), **mọi CHECK constraint đều nằm trong migration SQL dưới dạng raw SQL** (quy trình `migrate dev --create-only` → sửa migration → apply — đã kiểm chứng trên schema thử nghiệm trước khi áp dụng cho thật).

### 5.2 CHECK constraints (15 CHECK — đếm được trong DB)

Tất cả nằm ở cuối `20261126152122_init/migration.sql`, sau phần SQL do Prisma sinh.

| Bảng | CHECK | Ý nghĩa (ERD) |
| --- | --- | --- |
| `products` | `products_price_nonnegative` | `price >= 0` |
| `products` | `products_sku_nonempty` | `length(trim(sku)) > 0` — từ chối giá trị rỗng/chỉ khoảng trắng. Lưu ý ranh giới: input chỉ gồm dấu phân tách (`" - "`) được chuẩn hóa thành `""` ở tầng ứng dụng (M03-03) rồi mới bị CHECK này từ chối; CHECK ở DB không tự strip dấu `-_ .`. |
| `product_identifiers` | `product_identifiers_value_nonempty` | `length(trim(identifier_value)) > 0` |
| `product_identifiers` | `product_identifiers_normalized_nonempty` | `length(trim(normalized_value)) > 0` |
| `product_identifiers` | `product_identifiers_issuer_matrix` | Ma trận issuer FIX-01 (ERD §4.4): OEM_NUMBER → make NOT NULL + brand NULL; MANUFACTURER_PART_NUMBER → brand NOT NULL + make NULL; PART_NUMBER → make NULL (brand tùy chọn); ALTERNATE_NUMBER → cả hai NULL. Một CHECK duy nhất bao 4 trường hợp. |
| `vehicle_generations` | `vehicle_generations_year_from_range` | `year_from` 1900–2100 (PD-06) |
| `vehicle_generations` | `vehicle_generations_year_to_range` | `year_to` 1900–2100 (NULL được phép — CHECK chỉ chặn FALSE) |
| `vehicle_generations` | `vehicle_generations_year_to_after_from` | `year_to >= year_from` (NULL được phép) |
| `vehicle_applications` | `vehicle_applications_year_range` | `year` 1900–2100 (NULL được phép; PD-06: P0 chỉ lưu năm, không lưu tháng sản xuất) |
| `vehicle_applications` | `vehicle_applications_variant_requires_generation` | `variant_id IS NULL OR generation_id IS NOT NULL` (PD-01: Variant chỉ khi có Generation) |
| `orders` | `orders_total_nonnegative` | `total_amount >= 0` |
| `order_items` | `order_items_unit_price_nonnegative` | `unit_price_snapshot >= 0` |
| `order_items` | `order_items_quantity_positive` | `quantity > 0` |
| `order_items` | `order_items_line_total_nonnegative` | `line_total >= 0` |
| `users` | `users_failed_attempts_nonnegative` | `failed_login_attempts >= 0` (G-04) |

### 5.3 Partial unique indexes (3) + UNIQUE NULLS NOT DISTINCT (1) + partial index (1)

`@@unique` của Prisma không biểu diễn được partial index và `NULLS NOT DISTINCT`. Tất cả nằm trong migration SQL (raw SQL).

| Index | Định nghĩa | Nguồn |
| --- | --- | --- |
| `product_identifiers_mpn_unique` | `UNIQUE (identifier_type, normalized_value, issuing_brand_id) WHERE identifier_type = 'MANUFACTURER_PART_NUMBER'` | ERD §6 I-09 — MPN unique theo từng issuer |
| `product_identifiers_one_primary` | `UNIQUE (product_id, identifier_type) WHERE is_primary` | ERD §4.4 — một primary identifier cho mỗi product + type |
| `product_images_one_primary` | `UNIQUE (product_id) WHERE is_primary` | ERD §4.6 — một ảnh chính cho mỗi product |
| `vehicle_applications_unique_config` | `UNIQUE (model_id, generation_id, variant_id, year) NULLS NOT DISTINCT` | ERD §4.12, §6 I-18 — PostgreSQL 15+. Hai application `(model, NULL, NULL, NULL)` giống nhau bị coi là trùng (NULL được coi là bằng nhau). |
| `products_active_idx` | `INDEX (id) WHERE deleted_at IS NULL` | ERD §6 I-06 — partial index cho sản phẩm chưa bị soft-delete |

### 5.4 Indexes I-01 → I-26 (ERD §6)

Tất cả 26 index đã có trong migration do Prisma sinh (`@@unique` / `@@index` trong schema), trừ I-06, I-09 và I-18 (xem §5.3). Đối chiếu: I-01 `products_sku_key`, I-02 `products_slug_key`, I-03 `products_brand_id_status_idx`, I-04 `products_category_id_status_idx`, I-05 `products_status_published_at_idx`, I-07 `product_identifiers_normalized_value_identifier_type_idx`, I-08 `product_identifiers_product_id_idx`, I-10 `brands_slug_key`, I-11 `categories_slug_key`, I-12 `categories_parent_id_idx`, I-13 `product_categories_category_id_idx`, I-14 `product_images_product_id_sort_order_idx`, I-15 `vehicle_models_make_id_slug_key`, I-16 `vehicle_generations_model_id_idx`, I-17 `vehicle_variants_generation_id_idx`, I-19 `vehicle_applications_make_id_model_id_idx`, I-20 `product_vehicle_fitments_product_id_idx`, I-21 `product_vehicle_fitments_vehicle_application_id_idx`, I-22 `product_vehicle_fitments_product_id_vehicle_application_id_key`, I-23 `orders_order_code_key`, I-24 `order_items_order_id_idx`, I-25 `url_redirects_entity_type_old_slug_key`, I-26 `fitment_change_logs_product_id_created_at_idx`. (Các unique mặc định của PK không liệt kê lại, đúng ERD §6.)

## 6. Ghi chú ERD §12 cho M02 — đã xử lý

| Ghi chú ERD §12 | Cách xử lý ở M02-01 |
| --- | --- |
| 1. Mapping kiểu (UUID/TIMESTAMPTZ/DECIMAL/SMALLINT/enum) | Xem §1 — đúng như ghi chú. |
| 2. PostgreSQL 16 local baseline | Hệ thống kiểm chứng: PostgreSQL 16.15, cluster local port 5432. |
| 3. Partial unique index + CHECK không biểu diễn được bằng `@@unique` — viết raw SQL trong migration | Đã làm (xem §5). |
| 4. "`@@check` (Prisma 6 hỗ trợ)" | **Đã đính chính bằng kiểm chứng**: Prisma 6.19.3 KHÔNG hỗ trợ `@@check` (P1012). Mọi CHECK đều là raw SQL trong migration (§5.1). |
| 5. `updated_at` tự động cập nhật qua Prisma middleware HOẶC PostgreSQL trigger — chọn MỘT cách và ghi vào M02 | **Đã chọn: Prisma Client `@updatedAt`.** Không dùng trigger. Lưu ý: `@updatedAt` chỉ có hiệu lực khi update qua Prisma Client — update bằng SQL thô sẽ không tự cập nhật `updated_at`. |

Các ghi chú khác của ERD §12: `fitment_change_logs.changed_by_admin_id` đã có FK → `users.id` (§2, bảng 14); `orders.customer_id` không có FK (P1, §2 bảng 16); đúng 7 enum ERD + 1 enum G-02 (§3).

## 7. Truy vết quyết định (AC-07)

| Quyết định | Trạng thái | Áp dụng ở M02-01 |
| --- | --- | --- |
| PD-01 (fitment tối thiểu Model + Year) | DECIDED (ChatGPT, 26/11/2026) | `vehicle_applications`: `make_id`/`model_id` NOT NULL; `generation_id`/`variant_id`/`year` NULL được; CHECK variant-requires-generation; CHECK year 1900–2100. Schema giữ nguyên các trường nullable của ERD (không ép `year` NOT NULL). |
| PD-02 (một Product = một SKU; không `product_variants`) | DECIDED | Không tạo bảng `product_variants`. `products.sku` UNIQUE. G-01 đóng. |
| PD-03 (OEM được map nhiều Product; không unique toàn cục) | DECIDED | Không có unique index toàn cục trên OEM. Dedupe chỉ trong `(product_id, identifier_type, normalized_value)`. |
| PD-04 (hai FK issuer riêng biệt) | DECIDED | CHECK `product_identifiers_issuer_matrix` (§5.2). |
| PD-05 (Product có đơn không hard delete; RESTRICT/CASCADE theo ERD) | DECIDED | `order_items.product_id` RESTRICT; `order_items.order_id` RESTRICT; product-owned children CASCADE; Category/Brand/Make/Model/Generation/Variant còn dữ liệu con → RESTRICT. Đã kiểm chứng bằng test (AC-10). |
| PD-06 (năm 1900–2100; P0 chỉ lưu năm) | DECIDED | CHECK year 1900–2100 ở generations + applications; không có cột tháng sản xuất. |
| G-01 (thiếu `product_variants`) | ĐÓNG (theo PD-02) | Không tạo bảng. |
| G-02 (thiếu bảng articles) | ĐÃ LÀM | `articles` + `article_seo` (§4.1). |
| G-03 (thiếu bảng cart) | ĐÃ QUYẾT: Redis (M02-02) | **Không tạo bảng cart trong PostgreSQL.** Cart token ở HttpOnly cookie + Redis (M02-02/M05-01). |
| G-04 (thiếu bảng admin/RBAC) | ĐÃ LÀM | `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `user_permissions`, `audit_logs`, `admin_refresh_sessions` (§4.2). |
| PD-07 (cấu trúc trường spec) | PENDING | Không tự quyết. Bảng `product_specifications` giữ dạng key/value của ERD (P1). |
| PD-08 (order_status lifecycle) | PENDING | Enum `order_status` giữ đúng giá trị đề xuất của ERD; M05 xác nhận vòng đời cuối. |
| PD-09 (fitment source/verification) | PENDING | Không thêm cột `source`/`verification_status` vào `product_vehicle_fitments`. |
| D-01 → D-09 | PENDING | Không tự quyết. Không có giá trị nào trong schema phụ thuộc vào các quyết định này. |

## 8. Ngoài phạm vi (không có trong schema này)

- Không có bảng `carts` / `cart_items` (G-03 — Redis, M02-02).
- Không có bảng `contact_messages` (đích đến form liên hệ chưa được quyết — M01-04/M05).
- Không có bảng `product_variants` (PD-02).
- Không có cột quantity tồn kho (P1 — BR-012/AC-19).
- Không có seed dữ liệu kinh doanh (sản phẩm/SKU/OEM/xe/fitment/giá/đơn/khách hàng) — không có dữ liệu thật nào trong repo.
- Không có tài khoản admin mặc định, không có mật khẩu tĩnh, không có hash mẫu (§4.2).
- Không có endpoint/API, không có logic nghiệp vụ — chỉ schema + Prisma module tối thiểu (§9).

## 9. Tích hợp NestJS + kiểm chứng

### 9.1 Prisma module tối thiểu

- `backend/src/prisma/prisma.service.ts` — `PrismaService extends PrismaClient` (`OnModuleInit` → `$connect`, `OnModuleDestroy` → `$disconnect`).
- `backend/src/prisma/prisma.module.ts` — `@Global()` module, export `PrismaService`.
- `backend/src/app.module.ts` — import `PrismaModule` (đã có `ConfigModule` global load `.env`).
- `DATABASE_URL` chỉ lấy từ biến môi trường (`.env` local, gitignored — đã kiểm chứng `git check-ignore`).

### 9.2 Lệnh đã chạy (kết quả thật, 26/11/2026)

| Lệnh | Kết quả |
| --- | --- |
| `pnpm --filter backend add -D prisma@6.19.3` + `add @prisma/client@6.19.3` | Thành công; cả hai pin exact `6.19.3` (xem `backend/package.json`) |
| `pnpm --filter backend add -D dotenv` | Thành công (`^18.0.10`) — chỉ để test setup load `.env.test` |
| `prisma validate` | Schema hợp lệ |
| `prisma migrate dev --create-only --name init` | Tạo migration `20261126152122_init` (588 dòng do Prisma sinh) |
| Thêm raw SQL (§5) vào migration | Migration thành 638 dòng |
| `prisma migrate dev` (apply, dev DB `seecarauto_dev`) | Áp dụng thành công; `_prisma_migrations` ghi `20261126152122_init` finished |
| `prisma migrate deploy` (test DB `seecarauto_test`) | "All migrations have been successfully applied." |
| `prisma migrate status` | "Database schema is up to date!" (cả dev + test) |
| `prisma generate` | Generated Prisma Client v6.19.3 (396ms) |
| `pnpm typecheck` (workspace) | 9/9 thành công |
| `pnpm lint` (workspace) | 9/9 thành công |
| `pnpm test` (workspace) | 9/9 thành công (backend unit 2/2) |
| `pnpm build` (workspace) | 5/5 thành công |
| `pnpm --filter backend test:e2e` | 2 suites PASS, **26/26 tests** — `test/prisma-constraints.e2e-spec.ts` (25 tests) + `test/app.e2e-spec.ts` (1 test) |
| `git diff --check` | Sạch (chạy trước commit — xem Task Brief) |
| Secret scan | Sạch (chạy trước commit — xem Task Brief; không có `.env`/secret/credential/hash mẫu trong diff) |

### 9.3 Kiểm chứng trực tiếp trong DB (dev)

- 28 bảng (`27` model + `_prisma_migrations`).
- 15 CHECK constraints (đúng §5.2).
- 5 index đặc biệt (§5.3) đều tồn tại.
- 8 enum types với đúng tên ERD (§3).
- FK `fitment_change_logs.changed_by_admin_id` → `users.id` tồn tại.
- Test CHECK bằng tay (trước khi viết test tự động): `INSERT` giá âm vào `widgets` thử nghiệm bị từ chối bởi CHECK; cùng cách kiểm chứng đã áp dụng cho migration thật qua test tự động.

### 9.4 Test tự động (`backend/test/prisma-constraints.e2e-spec.ts`)

Chạy bằng `pnpm --filter backend test:e2e`. Dùng TEST DB (`seecarauto_test`, load từ `backend/.env.test` qua `backend/test/setup.ts`). Mỗi test truncate toàn bộ bảng trước khi chạy. 25 tests bao phủ: SKU unique + blank + giá âm; toàn bộ ma trận issuer (4 loại × các trường hợp issuer); OEM không unique toàn cục / MPN unique theo issuer / trùng (product, type, normalized); một primary identifier cho mỗi product+type; NULLS NOT DISTINCT (trùng NULL); variant-requires-generation; year 1900–2100 (application + generation); year_to >= year_from; RESTRICT (brand/category/product có đơn/make/model) / CASCADE (product children, fitment logs) / soft delete; primary image; article slug unique + `manualOverride` round-trip; RBAC joins (user → roles → permissions + user deny exception) + `failed_login_attempts >= 0`; refresh session (chỉ lưu hash, hash unique, revoked row tìm được để phát hiện reuse); fitment log FK + RESTRICT xóa admin; audit log JSONB before/after + RESTRICT xóa actor.

## 10. Ghi chú môi trường local (máy Muse) — không phải quyết định sản phẩm

- **Docker runtime UNVERIFIED** (giới hạn đã biết của máy Muse: không chạy được container; chỉ `docker compose config` được kiểm chứng ở M00). Migration được kiểm chứng trên PostgreSQL 16 cluster local (port 5432), không qua Docker. Cần kiểm chứng lại trên Windows/VPS/CI của Henry.
- **`prisma migrate dev` (kèm generate) bị treo trên máy này**: lệnh apply migration xong nhưng không thoát sau 5 phút (schema-engine idle, không lỗi). Cách làm đã kiểm chứng: chạy `migrate dev --skip-generate` (hoặc `migrate deploy` cho test DB) rồi chạy `prisma generate` riêng (396ms, thành công). Nguyên nhân treo chưa xác định — ghi lại để lần sau không mất thời gian.
- **Prisma engines trên máy này**: postinstall của `@prisma/engines` không tải được engine (proxy chặn fetch của Node). Engine đã có sẵn trong cache từ công việc trước (`~/.cache/prisma/master/c2990dca.../debian-openssl-3.0.x/`); đã copy từ cache đó vào thư mục package của pnpm store (`@prisma+engines@6.19.3` và `prisma@6.19.3`) để `prisma --version` / `generate` / `migrate` chạy được. Sau `pnpm install` mới (hoặc VM replacement), cần copy lại từ cache — xem `~/AGENTS.md` (mục Prisma engines). Trên máy Henry/CI, Prisma tự tải engine bình thường, không cần bước này.
- **CHECK violation qua Prisma Client 6.19.3**: lỗi PostgreSQL 23514 hiện ra dưới dạng `PrismaClientUnknownRequestError` KHÔNG có code (không phải P2004 như tài liệu Prisma mô tả chung) — message chứa tên constraint trong dạng Debug của Rust (dấu ngoặc kép bị escape). Test tự động assert theo tên constraint (§9.4).
- **Test DB tách biệt**: dev dùng `seecarauto_dev`, test dùng `seecarauto_test` (cùng cluster local, role `seecarauto`, mật khẩu dev-only mặc định theo `.env.example` — chỉ dùng local, không commit). `backend/.env` và `backend/.env.test` đều gitignored.
