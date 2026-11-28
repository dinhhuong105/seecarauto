# API Specification — SeeCar Auto

| Trường | Nội dung |
| --- | --- |
| Task | M01-03 — API Specification |
| Milestone | M01 — Architecture & UI/UX |
| Trạng thái tài liệu | IN_REVIEW (đã báo cáo ChatGPT review ngày 26/11/2026) |
| Ngày | 26/11/2026 |
| Product Owner | Henry |
| Project Manager | ChatGPT |
| Developer | Muse (Pi Em) |
| Nguồn sự thật | `docs/product/PRD.md`, `docs/product/SRS.md` (M01-01 DONE), `docs/database/ERD.md`, `docs/database/DATA_DICTIONARY.md`, `docs/database/diagrams/product-fitment-erd.mmd` (M01-02 DONE, ChatGPT ACCEPT Revision 02) |
| Tài liệu đi kèm | `docs/api/openapi.yaml` (OpenAPI 3.1.x — contract máy đọc được, phải khớp tài liệu này), `docs/api/API_ERROR_CATALOG.md`, `docs/api/API_SCENARIOS.md`, `docs/api/API_SECURITY.md`, `docs/project-management/tasks/M01-03.md` |

## Quy ước đọc tài liệu này

- **Đã duyệt (Approved):** chỉ những nội dung đã được Henry duyệt trong Charter/ADR/PRD/SRS/ERD, hoặc ChatGPT ACCEPT ở M01-01/M01-02. Mọi nội dung khác là đề xuất thiết kế hoặc đang chờ quyết định, được ghi rõ như vậy.
- **PROVISIONAL:** thiết kế dự kiến cho một endpoint/quy tắc phụ thuộc vào một Pending Decision (PD-01 → PD-09 của ERD hoặc D-01 → D-09 của PRD) — mô tả hướng thiết kế, nêu rõ giả định và hệ quả, **không phải implementation contract chính thức**. Không dùng phương án giả định để kiểm thử như nghiệp vụ đã chốt.
- **BLOCKED_BY_PD-XX / BLOCKED_BY_D-XX:** endpoint/quy tắc không thể chốt contract cho tới khi quyết định đó được Henry duyệt — chỉ mô tả khung, không đưa schema/request/response cuối cùng.
- **P0 / P1 / P2:** theo PRD mục 5 (Charter mục 2). Tài liệu này đặc tả đầy đủ contract cho **P0**; các endpoint P1 được liệt kê ở mục 20 với mức chi tiết catalogue (path + mục đích + FR mapping), full schema thuộc milestone của module đó; P2 chỉ ghi điểm mở rộng, không đặc tả endpoint.
- **Không bịa dữ liệu:** mọi ví dụ request/response trong tài liệu này đều là **ví dụ minh họa, không phải dữ liệu thật** (tên sản phẩm, mã, giá, tên khách, địa chỉ đều là ví dụ). Không có sản phẩm, giá, số liệu bán hàng, chính sách hay thông tin liên hệ thật nào ngoài những gì đã duyệt (hotline/Zalo 0886706338, fanpage đã công bố).
- **Ngôn ngữ:** URL, slug, endpoint, field JSON, error code, permission code 100% tiếng Anh (ADR-004, BR-015). Nội dung hiển thị (tên sản phẩm, mô tả, message lỗi thân thiện) bằng tiếng Việt.
- **Trạng thái trước nghiệm thu là IN_REVIEW.** Tài liệu này chỉ chuyển DONE khi ChatGPT ACCEPT M01-03 (15 tiêu chí AC-01 → AC-15, xem `docs/project-management/tasks/M01-03.md`).

## 1. Mục đích và phạm vi

### 1.1 Mục đích

Tài liệu này đặc tả toàn bộ API REST của website SeeCar Auto (backend NestJS, prefix `/api/v1`) làm cơ sở duy nhất cho M02 triển khai backend mà không phải tự suy đoán contract: frontend (Next.js, port 3000) và admin (Next.js, port 3001) chỉ gọi backend qua API này (INT-001, INT-002); mọi dữ liệu public và admin đều đi qua cùng một backend với phân quyền theo token.

### 1.2 Phạm vi P0 (đặc tả đầy đủ)

- Catalogue public: sản phẩm, danh mục, thương hiệu, xe (Make → Model → Generation → Variant), fitment hai chiều, tra cứu mã định danh (SKU/OEM/MPN/Part Number/Alternate), tìm kiếm (Meilisearch), trang chi tiết, sản phẩm liên quan.
- Giỏ hàng và đặt hàng: giỏ hàng (cơ chế lưu xem mục 11.1), tạo đơn hàng COD/chuyển khoản kèm snapshot (BR-003), tra cứu đơn công khai an toàn (FR-058, D-09).
- Liên hệ: form liên hệ (FR-089; đích nhận do M01-04/M05 chốt — xem mục 11.4).
- Bài viết/SEO public: danh sách và chi tiết bài viết đã xuất bản (FR-004, FR-067).
- Admin: quản lý sản phẩm (kèm identifiers, hình ảnh, trạng thái còn hàng), danh mục, thương hiệu, xe, fitment (kèm import Excel và change log), đơn hàng (kèm vòng đời trạng thái, xác nhận chuyển khoản, hủy, sửa thông tin giao hàng), bài viết + SEO (Rule Engine + AI Generate + manual override), phân quyền động RBAC (vai trò, ma trận quyền, ngoại lệ theo tài khoản, audit log), dashboard tổng quan, redirect 301.
- Chuẩn chung: versioning, response/error thống nhất (INT-007), phân trang/lọc/sắp xếp, validation, xác thực JWT + Refresh Token, RBAC, rate limiting, security headers, input sanitization, idempotency, logging/audit, cache (theo ADR-006, chỉ ghi chú mức API — TTL cụ thể xem SRS NFR-004/NFR-005).

### 1.3 Ngoài phạm vi (không đặc tả contract ở đây)

- **Không triển khai backend/frontend thật** (task này chỉ là tài liệu đặc tả; M02 mới triển khai).
- **Không Prisma schema/migration, không thay đổi PostgreSQL, không seed data** (tuyệt đối cấm theo brief M01-03).
- **Không sửa PRD/SRS/ERD đã nghiệm thu** để dễ triển khai — mâu thuẫn giữa các tài liệu được ghi nhận thành issue ở mục 22 và đề xuất hướng xử lý, không tự sửa.
- P1 (Customer, Wholesale, Promotion, Inventory, Analytics, VNPay/MoMo, GHN/GHTK/Viettel Post, Zalo OA, GA4/GTM/Search Console): chỉ liệt kê catalogue ở mục 20, không phải contract P0.
- P2 (Warranty, ERP): chỉ ghi điểm mở rộng ở mục 20.
- Ứng dụng di động riêng, bán hàng trên sàn/mạng xã hội: không thuộc website này (PRD mục 8).

## 2. Tài liệu tham chiếu

| # | Tài liệu | Dùng cho M01-03 như thế nào |
| --- | --- | --- |
| 1 | `docs/product/PRD.md` (M01-01 DONE) | Quyết định chức năng: module, hành trình, P0/P1/P2, D-01 → D-09 |
| 2 | `docs/product/SRS.md` (M01-01 DONE) | Yêu cầu chi tiết: FR-001 → FR-094, NFR-001 → NFR-020, BR-001 → BR-016, INT-001 → INT-007, AC-01 → AC-19 |
| 3 | `docs/database/ERD.md` (M01-02 DONE) | Quyết định dữ liệu/quan hệ: 17 bảng, PK/FK/index, 12 ràng buộc, snapshot, PD-01 → PD-09 |
| 4 | `docs/database/DATA_DICTIONARY.md` (M01-02 DONE) | Ý nghĩa/kiểu/ràng buộc từng trường — nguồn duy nhất cho schema field |
| 5 | `docs/database/diagrams/product-fitment-erd.mmd` (M01-02 DONE) | Sơ đồ quan hệ (đã render kiểm chứng trên mermaid.live 26/11/2026) |
| 6 | `docs/project-management/ARCHITECTURE_DECISIONS.md` (ADR-001 → ADR-011) | Stack, URL, RBAC, cache, SEO, Docker, UI/UX |
| 7 | `docs/project-management/PROJECT_CHARTER.md` | Phạm vi, nguyên tắc không bịa dữ liệu |
| 8 | `docs/api/openapi.yaml` | Contract máy đọc được — phải khớp tài liệu này (kiểm tra bằng script, xem mục 23) |
| 9 | `docs/api/API_ERROR_CATALOG.md`, `API_SCENARIOS.md`, `API_SECURITY.md` | Chi tiết lỗi, kịch bản, bảo mật (tách file để tài liệu chính đọc được) |

**Thứ tự ưu tiên khi các tài liệu mâu thuẫn:** PRD/SRS quyết định chức năng → ERD quyết định dữ liệu/quan hệ → Data Dictionary quyết định ý nghĩa/kiểu/ràng buộc trường → tài liệu này quyết định contract API. Pending Decisions (PD-01 → PD-09, D-01 → D-09) **không được xem là quyết định đã duyệt** — endpoint phụ thuộc PD được đánh dấu PROVISIONAL hoặc BLOCKED_BY_PD-XX (mục 21).

## 3. Kiến trúc API

- **Kiến trúc:** Modular Monolith, API-first (ADR-002). Frontend và admin là 2 client khác nhau của cùng một backend; không có endpoint riêng cho từng client ngoài phân quyền (INT-001, INT-002).
- **Phong cách:** RESTful JSON, thiết kế theo **resource, không theo từng màn hình** — một màn hình frontend có thể gọi nhiều endpoint; không tạo endpoint aggregate theo màn hình, trừ 2 ngoại lệ có lý do ghi rõ: `GET /admin/dashboard/summary` (tổng quan admin, xem mục 11.5) và `GET /search/suggest` (gợi ý khi gõ, xem mục 10.6).
- **Backend:** NestJS + TypeScript, port 3002 (ADR-003). Swagger/OpenAPI tại `/api/docs` (INT-003) — phục vụ từ `docs/api/openapi.yaml` ở M02.
- **Dữ liệu:** PostgreSQL + Prisma (M02); cache Redis theo ADR-006 (TTL xem SRS NFR-005); tìm kiếm Meilisearch đồng bộ qua BullMQ (INT-004); ảnh qua S3/R2, URL tuyệt đối (INT-005, D-06).
- **Đồng bộ tìm kiếm:** khi sản phẩm/danh mục/thương hiệu thay đổi qua API admin, backend đồng bộ sang Meilisearch qua BullMQ (INT-004); API tìm kiếm đọc từ Meilisearch, không truy vấn trực tiếp bảng sản phẩm cho full-text (xem mục 10.6).
- **Idempotency và concurrency:** xem mục 15.
- **Lỗi và phân trang thống nhất:** xem mục 12 và mục 13 (INT-007).

## 4. Base URL, versioning và content type

- **Base URL (môi trường dev):** `http://localhost:3002/api/v1`. Production: domain theo D-01 (chưa chốt) + `/api/v1` — không hard-code domain trong code, cấu hình qua biến môi trường (SRS mục 8, rủi ro 5).
- **Versioning:** URL versioning — mọi endpoint bắt đầu bằng `/api/v1`. Khi có breaking change, tạo `/api/v2` và giữ `/api/v1` song song tối thiểu một phiên bản; không đổi hành vi của `/api/v1` đã công bố. Header `Accept: application/json` bắt buộc; server luôn trả `Content-Type: application/json; charset=utf-8`.
- **Định dạng thời gian:** ISO 8601 UTC, ví dụ minh họa `2026-11-26T05:30:00.000Z`. Múi giờ hiển thị do frontend chuyển đổi; API không nhận giờ địa phương không kèm múi giờ.
- **Định dạng tiền:** số nguyên VND (đơn vị đồng), không dùng số thập phân cho tiền; trường tiền trong response là `amount` (integer, VND) kèm `currency: "VND"`. Giá trong ERD là `DECIMAL(12,2)` ở database; API trả về số nguyên đồng (làm tròn xuống đơn vị đồng khi đọc — ghi chú cho M02: không để lẻ đồng trong API).
- **Ngôn ngữ nội dung:** trường hiển thị tiếng Việt (`name`, `description`, `message` thân thiện); field kỹ thuật, enum, error code tiếng Anh.
- **Trailing slash:** không dùng trailing slash (`/api/v1/products`, không phải `/api/v1/products/`); request có trailing slash được chuẩn hóa về không slash (301 hoặc xử lý tương đương — M02 chốt cơ chế, không đổi semantics).
- **Case:** path chữ thường, kebab-case cho resource (`/vehicle-applications`); query param camelCase (`vehicleApplicationId`); JSON field camelCase (`productId`); enum UPPER_SNAKE_CASE (`IN_STOCK`).

## 5. Xác thực (Authentication)

- **Cơ chế (ADR-003):** JWT access token (ngắn hạn) + Refresh Token (dài hạn, xoay vòng khi dùng — refresh token cũ bị thu hồi sau khi đổi mới). Mật khẩu admin hash Argon2id (NFR-006). Không trả mật khẩu, hash, token hay secret trong bất kỳ response nào.
- **Truyền token:** header `Authorization: Bearer <access_token>`. Không nhận token qua query string (trừ trường hợp ngoại lệ duy nhất: không có — mọi endpoint yêu cầu auth đều dùng header).
- **Endpoint xác thực admin (FR-090, FR-091):**

| Method + Path | Mục đích | Ghi chú |
| --- | --- | --- |
| `POST /api/v1/auth/admin/login` | Admin đăng nhập bằng tài khoản + mật khẩu → access token + refresh token | Sai mật khẩu → lỗi chung, không lộ tài khoản có tồn tại hay không (FR-090). Sai liên tiếp tới ngưỡng (ngưỡng do M02 chốt, FR-091) → khóa tạm tài khoản |
| `POST /api/v1/auth/admin/refresh` | Đổi refresh token lấy access token mới (xoay vòng refresh token) | Refresh token đã dùng rồi → thu hồi toàn bộ session của tài khoản (nghi ngờ đánh cắp token) |
| `POST /api/v1/auth/admin/logout` | Đăng xuất → thu hồi access token + refresh token hiện tại | Sau logout, token cũ không dùng được nữa (FR-090) |
| `GET /api/v1/auth/admin/me` | Lấy thông tin tài khoản admin hiện tại + danh sách quyền của mình | Dùng để frontend/admin hiển thị đúng nút theo quyền (FR-081, FR-086) |

- **Khách (guest):** không có tài khoản ở P0, không đăng nhập để mua hàng (FR-092). Khách không có token; các endpoint public không yêu cầu auth. Tài khoản khách hàng đầy đủ là P1 (FR-093/FR-094) — endpoint auth khách ở mục 20, không phải contract P0.
- **Token hết hạn:** access token hết hạn → `401 UNAUTHENTICATED` (xem Error Catalog); client dùng refresh token để đổi mới; refresh token hết hạn → client phải đăng nhập lại.
- **Bảo mật token:** access token chỉ chứa `sub` (admin id), `roles` (danh sách role id), `type: "access"`, `sid` (id của row `admin_refresh_sessions` đã cấp token), `iat`, `exp` (15 phút); refresh token chỉ chứa `sub`, `sid`, `type: "refresh"`, `iat`, `exp` (7 ngày) — không chứa hash, permission list hay PII khác. Access token gắn với đúng session đã cấp nó (`sid`): sau khi refresh thành công, access token cũ hết hiệu lực ngay (session cũ đã `ROTATED`), không chờ tới hết hạn 15 phút. Refresh token lưu hash SHA-256 ở database (không lưu plaintext), có thể thu hồi từng session; mọi endpoint auth đều rate limit riêng (xem mục 16).

## 6. Phân quyền (Authorization — Dynamic RBAC, ADR-005)

- **Nguyên tắc bắt buộc (BR-006, FR-086):** frontend chỉ ẩn nút theo quyền; **backend kiểm tra quyền trên mọi request**. Gọi trực tiếp API bằng tài khoản không có quyền → `403 FORBIDDEN` dù frontend đã ẩn nút.
- **Permission code:** dạng `<module>.<action>`, ví dụ minh họa `products.view`, `products.create` (ADR-005). Module = resource nhóm (xem bảng dưới); action = `view`, `create`, `update`, `delete`, `export`, `cancel`, `manage`, `confirm` (danh sách action cụ thể theo module — M02/M01-05 chốt danh sách cuối, ma trận checkbox hiển thị đúng các action của từng module).
- **Ma trận quyền (FR-080):** vai trò × module × hành động, cấu hình bằng checkbox trong admin; thay đổi có hiệu lực qua cache invalidation (TTL quyền 300 giây, ADR-006); mọi thay đổi quyền ghi audit log (FR-084, BR-008).
- **Ngoại lệ theo tài khoản (FR-083):** bảng `user_permissions` cho phép gán/bỏ quyền riêng cho một tài khoản, chỉ tài khoản đó đổi quyền — hạn chế dùng giai đoạn đầu.
- **Chặn tự khóa (BR-007, FR-085):** thao tác khiến tài khoản Super Admin cuối cùng mất quyền quản trị hoặc tự khóa mình → hệ thống chặn kèm thông báo rõ.
- **Ma trận module × quyền (P0):** `Public` = không cần auth; `Admin` = cần token admin + permission tương ứng; `*` ở cột Permission nghĩa là mọi tài khoản admin đã đăng nhập (không cần permission riêng) — chỉ dùng cho endpoint lấy thông tin của chính mình.

| Module (resource nhóm) | Quyền | Endpoint nhóm |
| --- | --- | --- |
| Public catalogue | Public | `GET /products`, `GET /categories`, `GET /brands`, `GET /vehicles/**`, `GET /search`, `GET /articles` (đã xuất bản) |
| Cart / Checkout | Public | `GET/POST/PATCH/DELETE /cart`, `POST /orders` (tạo đơn), `GET /orders/lookup` |
| Contact | Public | `POST /contact` |
| products | `products.view/create/update/delete` | `POST/PATCH/DELETE /products`, identifiers, images, availability |
| categories | `categories.view/create/update/delete` | `POST/PATCH/DELETE /categories` |
| brands | `brands.view/create/update/delete` | `POST/PATCH/DELETE /brands` |
| vehicles | `vehicles.view/create/update/delete` | `POST/PATCH/DELETE /vehicles/**`, import Excel |
| fitments | `fitments.view/create/update/delete` | `POST/DELETE /products/{id}/fitments`, import, change log |
| orders | `orders.view/update/cancel/confirm` | `GET /orders`, `PATCH /orders/{id}/status`, confirm-payment, cancel, shipping |
| articles | `articles.view/create/update/delete` | `POST/PATCH/DELETE /articles`, SEO generate/override |
| redirects | `redirects.view/create/delete` | `POST/DELETE /redirects` |
| roles | `roles.view/create/update/delete` | `POST/PATCH/DELETE /roles`, ma trận quyền |
| users | `users.view/update` | Gán vai trò, ngoại lệ `user_permissions` |
| audit | `audit.view` | `GET /audit-logs` |
| dashboard | `dashboard.view` | `GET /admin/dashboard/summary` |
| auth | `*` (đã đăng nhập) | `GET /auth/admin/me`, `POST /auth/admin/logout` |

- **Quy tắc kiểm tra quyền ở M02:** middleware/guard kiểm tra permission code trước khi vào handler; mọi endpoint admin đều khai báo permission trong OpenAPI (`x-required-permission` — xem `openapi.yaml`); endpoint public không có `security` requirement; endpoint nào thiếu khai báo permission trong OpenAPI là lỗi kiểm thử Test 2 (xem mục 23).

## 7. Mô hình tài nguyên (Resource model — mapping sang ERD)

Mỗi resource API map tới một bảng (hoặc một nhóm bảng) trong ERD M01-02. Trường API lấy tên/kiểu/ý nghĩa từ Data Dictionary; trường nào không có trong ERD thì ghi rõ nguồn (mục 22 nếu là gap).

| Resource API | Bảng ERD | PK | Trường chính (API) | Ghi chú |
| --- | --- | --- | --- | --- |
| Product | `products` | `id` UUID | `sku`, `name`, `slug`, `brandId`, `categoryId`, `price` (VND, integer), `availabilityStatus` (`IN_STOCK`/`OUT_OF_STOCK`), `status` (`DRAFT`/`PUBLISHED`/`HIDDEN`), `publishedAt`, `deletedAt` | P0 chỉ có trạng thái còn hàng, **không có trường số lượng tồn kho** (BR-012; tồn kho số lượng là P1) |
| ProductIdentifier | `product_identifiers` | `id` UUID | `productId`, `identifierType` (`PART_NUMBER`/`OEM_NUMBER`/`MANUFACTURER_PART_NUMBER`/`ALTERNATE_NUMBER`), `identifierValue`, `normalizedValue`, `issuingMakeId`, `issuingBrandId`, `isPrimary` | Ma trận issuer CHECK theo ERD §3.3/§4.4 (FIX-01 M01-02); OEM không unique toàn hệ thống (PD-03) |
| Category | `categories` | `id` UUID | `name`, `slug` (global UNIQUE), `parentId`, `displayOrder`, `isVisible` | Cây nhiều cấp; không có chu trình (application-level, ERD §7) |
| Brand | `brands` | `id` UUID | `name`, `slug` (global UNIQUE), `logoUrl`, `description`, `isVisible` | Brand sản phẩm (khác Make xe) |
| VehicleMake | `vehicle_makes` | `id` UUID | `name`, `slug` (UNIQUE per make scope — xem ERD), `logoUrl`, `isVisible` | Hãng xe (vd: Toyota — ví dụ minh họa) |
| VehicleModel | `vehicle_models` | `id` UUID | `makeId`, `name`, `slug` (UNIQUE(make_id, slug)), `isVisible` | Dòng xe (vd: Vios — ví dụ minh họa) |
| VehicleGeneration | `vehicle_generations` | `id` UUID | `modelId`, `name`, `slug` (UNIQUE(model_id, slug)), `yearFrom`, `yearTo` (nullable — NULL = còn sản xuất), `isVisible` | Thế hệ; CHECK 1900–2100, `yearTo >= yearFrom` |
| VehicleVariant | `vehicle_variants` | `id` UUID | `generationId`, `name`, `slug` (UNIQUE(generation_id, slug)), `isVisible` | Phiên bản; yêu cầu phải có generation (ERD) |
| VehicleApplication | `vehicle_applications` | `id` UUID | `makeId`, `modelId`, `generationId` (nullable), `variantId` (nullable), `year` (nullable) | **Đích duy nhất của fitment** (Option D, M01-02); UNIQUE NULLS NOT DISTINCT (model_id, generation_id, variant_id, year) |
| ProductVehicleFitment | `product_vehicle_fitments` | `id` UUID | `productId`, `vehicleApplicationId`, `fitmentNote` (nullable) | UNIQUE(product_id, vehicle_application_id); không có `source`/`verification_status` ở P0 (PD-09) |
| FitmentChangeLog | `fitment_change_logs` | `id` UUID | `productVehicleFitmentId`, `action` (`ATTACH`/`DETACH`), `changedByAdminId`, `changedAt` | FR-033; `changedByAdminId` chưa có FK (users là M02) |
| Order | `orders` | `id` UUID | `orderCode` (UNIQUE, không đoán được, không liên tục — FR-058), `customerName`, `customerPhone`, `shippingAddress`, `customerId` (nullable, P1), `paymentMethod` (`COD`/`BANK_TRANSFER`), `status`, `totalAmount` | Vòng đời status: PROPOSED trong ERD — P0 dùng khung mới đặt → xác nhận → đang giao → hoàn tất + hủy/hoàn; tên cuối do M05 chốt (PD-08) — xem mục 11.3 |
| OrderItem | `order_items` | `id` UUID | `orderId`, `productId` (tham chiếu, RESTRICT), `productNameSnapshot`, `skuSnapshot`, `unitPriceSnapshot`, `quantity`, `lineTotal` | Snapshot tại thời điểm đặt (BR-003); hiển thị đơn đã đặt chỉ đọc snapshot, không join products lấy tên/giá |
| UrlRedirect | `url_redirects` | `id` UUID | `entityType` (`CATEGORY`/`BRAND`/`PRODUCT`), `entityId`, `oldSlug`, `newSlug` | UNIQUE(entity_type, old_slug); FR-018 redirect 301 |
| ProductImage | `product_images` | `id` UUID | `productId`, `imageUrl` (tuyệt đối, S3/R2), `displayOrder`, `altText` | URL ảnh tuyệt đối, không hard-code domain (INT-005) |
| ProductSpecification | `product_specifications` | `id` UUID | `productId`, `specKey`, `specValue` | Key/value P1 (PD-07); P0 chỉ đọc qua product detail, lọc theo thông số là P1 (FR-013) |
| Article / ArticleSEO | (M01-05/M02 — chưa có trong ERD M01-02) | UUID | `title`, `slug`, `content`, `categoryId`, `status` (`DRAFT`/`PUBLISHED`), SEO fields (`seoTitle`, `metaDescription`, `focusKeyword`, `secondaryKeywords`, `searchIntent`, `manualOverrideFlags`) | ERD M01-02 ghi connection point ở §4.18; bảng Article/ArticleSEO do M01-05/M02 chốt schema — API này đặc tả contract với trường đã liệt kê, đánh dấu PROVISIONAL ở mức schema DB (không phải mức endpoint public) |
| Role / Permission / UserPermission / AuditLog | (M01-05/M02 — chưa có trong ERD M01-02) | UUID | `role.name`, `permissions[]` (permission code), `userId`, `action`, `changedByAdminId`, `changedAt` | RBAC nền tảng thuộc M01-05/M02; API này đặc tả contract theo ADR-005 + FR-080 → FR-086; schema DB do M02 chốt |

**Gap ghi nhận cho M02 (không phải lỗi của ERD):** ERD M01-02 không có bảng giỏ hàng (cart) và bảng liên hệ (contact message) — xem mục 11.1 và 11.4: API giỏ hàng dùng session cart keyed bằng cookie token, contact form lưu hay gửi email do M01-04/M05 chốt; M02 quyết định có cần bảng lưu trữ cho 2 nhóm này không. API này không tự tạo bảng mới trong ERD.

## 8. Chuẩn response chung (INT-007)

### 8.1 Envelope thành công

Mọi response thành công (2xx) đều có dạng:

```json
{
  "data": { "...": "..." },
  "meta": { "page": 1, "limit": 20, "total": 137, "totalPages": 7 }
}
```

- `data`: object (chi tiết) hoặc array (danh sách). Danh sách luôn kèm `meta` phân trang (xem mục 13); chi tiết một resource không có `meta` (trừ khi resource đó có phân trang lồng nhau — khi đó `meta` nằm trong trường con tương ứng).
- Không trả thêm trường bọc khác (`success`, `status`, `code` ở top-level của response thành công — chỉ dùng HTTP status code).
- `id` luôn là UUID string; `createdAt`/`updatedAt` ISO 8601 UTC khi resource có 2 trường này trong ERD.

### 8.2 Envelope lỗi

Mọi response lỗi đều theo định dạng thống nhất `{ statusCode, message, error }` (INT-007):

```json
{
  "statusCode": 404,
  "message": "Không tìm thấy sản phẩm.",
  "error": "PRODUCT_NOT_FOUND"
}
```

- `statusCode`: HTTP status (số, trùng với status của response).
- `message`: tiếng Việt, thân thiện, không lộ chi tiết nội bộ (không lộ stack trace, câu SQL, tên bảng).
- `error`: error code tiếng Anh UPPER_SNAKE_CASE, ổn định theo Error Catalog (`docs/api/API_ERROR_CATALOG.md`).
- Lỗi validation (400) kèm thêm `details`: array các `{ field, code, message }` cho từng trường sai. Xem mục 12 và Error Catalog.

### 8.3 Response rỗng

- `204 No Content`: chỉ dùng cho DELETE thành công không trả body. Mọi DELETE trong tài liệu này trả `204` (không body), trừ `DELETE /cart/items/{id}` trả `200` kèm giỏ cập nhật (xem mục 11.1 — lý do: frontend cần tổng tiền mới ngay).
- Danh sách rỗng trả `200` với `data: []` và `meta.total = 0`, không trả 404.

## 9. Validation chung

- **Input validation:** mọi request body/query param đều được validate trước khi vào handler; sai validation → `400 VALIDATION_ERROR` kèm `details` từng trường (xem Error Catalog). Không để lỗi validation lọt xuống database rồi mới báo.
- **UUID:** mọi `{id}` trong path phải là UUID hợp lệ, sai định dạng → `400 VALIDATION_ERROR` (không phải 404).
- **Slug:** chỉ cho phép `[a-z0-9-]` (chữ thường, số, gạch ngang), không dấu, không khoảng trắng, không bắt đầu/kết thúc bằng `-`; sai → `400`. Slug không đổi khi đổi tên hiển thị (BR-005, FR-017).
- **Chuỗi:** trim khoảng trắng 2 đầu; chuỗi rỗng sau trim được coi là thiếu (bắt buộc) hoặc `null` (không bắt buộc); chuỗi chỉ gồm ký tự phân cách (`---`, `___`) bị từ chối ở các trường mã (FIX-03 M01-02 — áp dụng cho `sku` và `identifierValue`).
- **Chuẩn hóa mã (ADR-010, ERD §3.1):** mọi mã định danh (SKU, OEM, MPN, Part Number, Alternate) được chuẩn hóa khi lưu và khi tìm: uppercase, bỏ khoảng trắng/gạch ngang/gạch dưới/dấu chấm; bản gốc giữ trong `identifierValue`, bản chuẩn hóa trong `normalizedValue`; tìm kiếm khớp `normalizedValue` chính xác (không fuzzy mạnh với mã OEM — BR-002, FR-036).
- **Số:** `price` (VND) là số nguyên ≥ 0; `quantity` là số nguyên ≥ 1; `page` ≥ 1, `limit` 1–100 (mặc định 20, xem mục 13); `year` 1900–2100 (ERD CHECK).
- **Enum:** giá trị ngoài enum → `400 VALIDATION_ERROR`; không tự động map/suy đoán giá trị enum.
- **XSS/SQLi:** mọi input chuỗi được sanitize/escape ở tầng API (NFR-007); không nối chuỗi thô vào truy vấn; payload chứa script/SQL injection → bị chặn hoặc escape, không thực thi.
- **Kích thước request:** body JSON tối đa 1 MB (trừ upload file — xem mục 11.2); vượt quá → `413 PAYLOAD_TOO_LARGE`.
- **Content-Type:** `POST`/`PATCH` nhận `application/json`, trừ endpoint upload file nhận `multipart/form-data`; sai Content-Type → `415 UNSUPPORTED_MEDIA_TYPE`.

## 10. Endpoint catalogue (tổng quan)

Mỗi endpoint trong catalogue này đều có đặc tả chi tiết ở mục 11 (P0) hoặc mục 20 (P1). Cột **Trạng thái**: `P0` = contract đầy đủ; `P0-PROVISIONAL` = contract dự kiến, phụ thuộc quyết định đang chờ (ghi rõ PD/D); `P1` = chỉ catalogue, full schema thuộc milestone của module đó.

**Quy ước path gộp (áp dụng cho 5 nhóm resource có cả GET public theo slug và PATCH/DELETE admin theo UUID):** một path template duy nhất dùng `{slug}` cho cả hai loại thao tác — `GET /categories/{slug}` nhận slug, `PATCH/DELETE /categories/{slug}` nhận UUID (server phân biệt theo định dạng UUID). Áp dụng cho `/categories/{slug}`, `/brands/{slug}`, `/vehicles/makes/{slug}`, `/vehicles/models/{slug}`, `/articles/{slug}` (kể cả `/articles/{slug}/seo` và `/articles/{slug}/seo/generate`). Lý do: tránh 2 path template giống hệt nhau chỉ khác tên tham số (Redocly `no-identical-paths`); tham số được khai báo rõ trong OpenAPI với mô tả "Slug (public GET) hoặc UUID (admin PATCH/DELETE)".

### 10.1 Public — Catalogue, danh mục, thương hiệu (FR-001 → FR-020, FR-042 → FR-049)

| Method + Path | Mục đích | Access | Permission | FR | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| `GET /api/v1/products` | Danh sách sản phẩm: lọc (danh mục, thương hiệu, khoảng giá, tình trạng, tương thích xe), sắp xếp, phân trang | Public | — | FR-007 → FR-012 | P0 |
| `GET /api/v1/products/{productId}` | Chi tiết sản phẩm (kèm 4 loại mã, hình ảnh, thông số, giá, tình trạng, fitment, sản phẩm liên quan) | Public | — | FR-042 → FR-049 | P0 |
| `GET /api/v1/products/{productId}/fitments` | Danh sách xe tương thích của một sản phẩm (tra cứu 1 chiều) | Public | — | FR-028, FR-030 | P0 |
| `GET /api/v1/products/{productId}/related` | Sản phẩm liên quan / thay thế | Public | — | FR-046 | P0-PROVISIONAL (tiêu chí liên quan do M01-04/M03 chốt, Henry duyệt) |
| `GET /api/v1/categories` | Cây danh mục (nhiều cấp), chỉ danh mục hiển thị | Public | — | FR-002, FR-015 | P0 |
| `GET /api/v1/categories/{slug}` | Chi tiết danh mục theo slug | Public | — | FR-007, FR-017 | P0 |
| `GET /api/v1/categories/{slug}/products` | Danh sách sản phẩm của một danh mục (lọc/sắp xếp/phân trang như `/products`) | Public | — | FR-007 → FR-012 | P0 |
| `GET /api/v1/brands` | Danh sách thương hiệu (chỉ thương hiệu hiển thị) | Public | — | FR-002, FR-016 | P0 |
| `GET /api/v1/brands/{slug}` | Chi tiết thương hiệu theo slug | Public | — | FR-016 | P0 |
| `GET /api/v1/brands/{slug}/products` | Danh sách sản phẩm của một thương hiệu | Public | — | FR-016 | P0 |

### 10.2 Public — Xe và fitment (FR-021 → FR-033)

| Method + Path | Mục đích | Access | Permission | FR | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| `GET /api/v1/vehicles/makes` | Danh sách hãng xe (chỉ hãng hiển thị) | Public | — | FR-021, FR-024 | P0 |
| `GET /api/v1/vehicles/makes/{slug}` | Chi tiết hãng xe theo slug | Public | — | FR-021 | P0 |
| `GET /api/v1/vehicles/makes/{slug}/models` | Danh sách dòng xe của một hãng | Public | — | FR-022, FR-024 | P0 |
| `GET /api/v1/vehicles/models/{slug}` | Chi tiết dòng xe theo slug (kèm hãng) | Public | — | FR-022 | P0 |
| `GET /api/v1/vehicles/models/{slug}/generations` | Danh sách thế hệ của một dòng xe | Public | — | FR-022 | P0 |
| `GET /api/v1/vehicles/generations/{generationId}/variants` | Danh sách phiên bản của một thế hệ | Public | — | FR-022 | P0 |
| `GET /api/v1/vehicles/{makeSlug}/{modelSlug}` | Trang xe: thông tin xe + danh sách phụ tùng tương thích | Public | — | FR-023 | P0 |
| `GET /api/v1/vehicle-applications/{applicationId}/products` | Tra cứu ngược: toàn bộ phụ tùng tương thích với một vehicle application | Public | — | FR-030 | P0 |
| `GET /api/v1/fitment/check` | Kiểm tra một sản phẩm có tương thích với một vehicle application không (kèm ghi chú áp dụng) | Public | — | FR-029 | P0 |
| `GET /api/v1/fitments` | Danh sách fitment (lọc theo `productId` hoặc `vehicleApplicationId`) | Public | — | FR-030 | P0 |

### 10.3 Public — Tìm kiếm và tra cứu mã (FR-034 → FR-041, FR-043)

| Method + Path | Mục đích | Access | Permission | FR | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| `GET /api/v1/search` | Tìm kiếm toàn website (Meilisearch): từ khóa + lọc (danh mục, thương hiệu, tương thích xe) + sắp xếp | Public | — | FR-034, FR-035, FR-038, FR-039 | P0 |
| `GET /api/v1/search/suggest` | Gợi ý khi gõ (autocomplete) theo tên/mã/thương hiệu, < 1s (NFR-003) | Public | — | FR-037 | P0 |
| `GET /api/v1/identifiers/lookup` | Tra cứu chính xác theo mã: `?type=SKU\|OEM_NUMBER\|MANUFACTURER_PART_NUMBER\|PART_NUMBER\|ALTERNATE_NUMBER&code=...` — không fuzzy với mã OEM | Public | — | FR-034, FR-035, FR-036, FR-043 | P0-PROVISIONAL (BLOCKED_BY_PD-02 / PD-03 / PD-04 — xem mục 11.5) |

### 10.4 Public — Giỏ hàng, đơn hàng, liên hệ, bài viết (FR-050 → FR-058, FR-067, FR-087 → FR-089)

| Method + Path | Mục đích | Access | Permission | FR | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| `GET /api/v1/cart` | Lấy giỏ hàng hiện tại (theo cart token) | Public | — | FR-050, FR-051 | P0-PROVISIONAL (cơ chế lưu do mục 11.1 chốt khung; bảng lưu trữ do M02 quyết — xem mục 7) |
| `POST /api/v1/cart/items` | Thêm món vào giỏ (kèm kiểm tra tương thích với xe đã chọn — cảnh báo, không chặn) | Public | — | FR-045, FR-050 | P0-PROVISIONAL (như trên) |
| `PATCH /api/v1/cart/items/{itemId}` | Sửa số lượng một món trong giỏ | Public | — | FR-050 | P0-PROVISIONAL (như trên) |
| `DELETE /api/v1/cart/items/{itemId}` | Xóa một món khỏi giỏ | Public | — | FR-050 | P0-PROVISIONAL (như trên) |
| `DELETE /api/v1/cart` | Xóa toàn bộ giỏ | Public | — | FR-050 | P0-PROVISIONAL (như trên) |
| `POST /api/v1/orders` | Tạo đơn hàng từ giỏ: COD/chuyển khoản, snapshot (BR-003), mã đơn không đoán được | Public | — | FR-052 → FR-055 | P0-PROVISIONAL (BLOCKED_BY_D-08 ở mức trường bắt buộc checkout chi tiết — xem mục 11.3) |
| `GET /api/v1/orders/lookup` | Tra cứu trạng thái đơn bằng mã đơn công khai (không đăng nhập, rate limit, không lộ thông tin người khác) | Public | — | FR-058 | P0-PROVISIONAL (BLOCKED_BY_D-09 ở mức phương thức xác minh bổ sung — xem mục 11.3) |
| `POST /api/v1/contact` | Gửi form liên hệ | Public | — | FR-088, FR-089 | P0-PROVISIONAL (đích nhận do M01-04/M05 chốt — xem mục 11.4) |
| `GET /api/v1/articles` | Danh sách bài viết đã xuất bản (phân trang) | Public | — | FR-004, FR-067 | P0 |
| `GET /api/v1/articles/{slug}` | Chi tiết bài viết theo slug (kèm SEO metadata) | Public | — | FR-067, FR-068, FR-074 | P0 |

### 10.5 Admin — Xác thực, dashboard, redirect (FR-075 → FR-079, FR-090 → FR-091, FR-018)

| Method + Path | Mục đích | Access | Permission | FR | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| `POST /api/v1/auth/admin/login` | Admin đăng nhập | Public (auth) | — | FR-090, FR-091 | P0 |
| `POST /api/v1/auth/admin/refresh` | Đổi refresh token (xoay vòng; header `Idempotency-Key` bắt buộc) | Public (auth) | — | FR-090 | P0 |
| `POST /api/v1/auth/admin/logout` | Đăng xuất, thu hồi token (có `refreshToken`: một phiên; không có: toàn bộ phiên) | Admin | `*` | FR-090 | P0 |
| `GET /api/v1/auth/admin/me` | Thông tin tài khoản + quyền của mình | Admin | `*` | FR-081 | P0 |
| `GET /api/v1/admin/dashboard/summary` | Tổng quan admin: đơn cần xử lý, sản phẩm, bài viết — chỉ số liệu thật, theo quyền | Admin | `dashboard.view` | FR-075 → FR-077 | P0 |
| `GET /api/v1/redirects` | Danh sách redirect 301 đã cấu hình | Admin | `redirects.view` | FR-018 | P0 |
| `POST /api/v1/redirects` | Tạo redirect 301 (khi slug đã công bố thay đổi) | Admin | `redirects.create` | FR-018 | P0 |
| `DELETE /api/v1/redirects/{redirectId}` | Xóa redirect | Admin | `redirects.delete` | FR-018 | P0 |

### 10.6 Admin — Sản phẩm, danh mục, thương hiệu (FR-013 → FR-020, FR-042 → FR-049)

| Method + Path | Mục đích | Access | Permission | FR | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| `POST /api/v1/products` | Tạo sản phẩm (kèm SKU, identifiers, danh mục, thương hiệu, giá, trạng thái) | Admin | `products.create` | FR-042, FR-043 | P0-PROVISIONAL (BLOCKED_BY_PD-02 — xem mục 11.1) |
| `PATCH /api/v1/products/{productId}` | Sửa sản phẩm (kể cả đổi trạng thái DRAFT/PUBLISHED/HIDDEN, đổi trạng thái còn hàng) | Admin | `products.update` | FR-042, FR-047 | P0 |
| `DELETE /api/v1/products/{productId}` | Xóa sản phẩm (soft delete; chặn khi đã có trong đơn hàng — theo ERD RESTRICT) | Admin | `products.delete` | FR-048, PD-05 | P0-PROVISIONAL (BLOCKED_BY_PD-05 — xem mục 11.1) |
| `POST /api/v1/products/{productId}/images` | Thêm hình ảnh sản phẩm (upload S3/R2) | Admin | `products.update` | FR-042 | P0 |
| `DELETE /api/v1/products/{productId}/images/{imageId}` | Xóa hình ảnh sản phẩm | Admin | `products.update` | FR-042 | P0 |
| `POST /api/v1/products/{productId}/identifiers` | Thêm mã định danh cho sản phẩm (kèm issuer CHECK) | Admin | `products.update` | FR-043, BR-001 | P0-PROVISIONAL (BLOCKED_BY_PD-04 — xem mục 11.1) |
| `DELETE /api/v1/products/{productId}/identifiers/{identifierId}` | Xóa mã định danh | Admin | `products.update` | FR-043 | P0 |
| `POST /api/v1/categories` | Tạo danh mục (cha–con, slug, thứ tự, ẩn/hiện) | Admin | `categories.create` | FR-015 | P0 |
| `PATCH /api/v1/categories/{slug}` | Sửa danh mục | Admin | `categories.update` | FR-015, FR-017 | P0 |
| `DELETE /api/v1/categories/{slug}` | Xóa danh mục (chặn khi còn sản phẩm — FR-020) | Admin | `categories.delete` | FR-020 | P0-PROVISIONAL (BLOCKED_BY_PD-05 — xem mục 11.1) |
| `POST /api/v1/brands` | Tạo thương hiệu | Admin | `brands.create` | FR-016 | P0 |
| `PATCH /api/v1/brands/{slug}` | Sửa thương hiệu | Admin | `brands.update` | FR-016 | P0 |
| `DELETE /api/v1/brands/{slug}` | Xóa thương hiệu (chặn khi còn sản phẩm — FR-020) | Admin | `brands.delete` | FR-020 | P0-PROVISIONAL (BLOCKED_BY_PD-05 — xem mục 11.1) |

### 10.7 Admin — Xe, fitment, đơn hàng (FR-021 → FR-033, FR-060 → FR-066)

| Method + Path | Mục đích | Access | Permission | FR | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| `POST /api/v1/vehicles/makes` | Tạo hãng xe | Admin | `vehicles.create` | FR-021 | P0 |
| `PATCH /api/v1/vehicles/makes/{slug}` | Sửa hãng xe | Admin | `vehicles.update` | FR-021 | P0 |
| `DELETE /api/v1/vehicles/makes/{slug}` | Xóa hãng xe (RESTRICT khi còn model/fitment) | Admin | `vehicles.delete` | FR-021, PD-05 | P0-PROVISIONAL (BLOCKED_BY_PD-05 — xem mục 11.5) |
| `POST /api/v1/vehicles/models` | Tạo dòng xe (thuộc một hãng) | Admin | `vehicles.create` | FR-022 | P0 |
| `PATCH /api/v1/vehicles/models/{slug}` | Sửa dòng xe | Admin | `vehicles.update` | FR-022 | P0 |
| `DELETE /api/v1/vehicles/models/{slug}` | Xóa dòng xe (RESTRICT khi còn generation/fitment) | Admin | `vehicles.delete` | FR-022, PD-05 | P0-PROVISIONAL (BLOCKED_BY_PD-05 — xem mục 11.5) |
| `POST /api/v1/vehicles/generations` | Tạo thế hệ (thuộc một dòng) | Admin | `vehicles.create` | FR-022 | P0-PROVISIONAL (BLOCKED_BY_PD-06 — xem mục 11.5) |
| `PATCH /api/v1/vehicles/generations/{generationId}` | Sửa thế hệ | Admin | `vehicles.update` | FR-022 | P0-PROVISIONAL (BLOCKED_BY_PD-06 — xem mục 11.5) |
| `DELETE /api/v1/vehicles/generations/{generationId}` | Xóa thế hệ (RESTRICT khi còn variant/fitment) | Admin | `vehicles.delete` | FR-022, PD-05 | P0-PROVISIONAL (BLOCKED_BY_PD-05 — xem mục 11.5) |
| `POST /api/v1/vehicles/variants` | Tạo phiên bản (thuộc một thế hệ) | Admin | `vehicles.create` | FR-022 | P0-PROVISIONAL (BLOCKED_BY_PD-06 — xem mục 11.5) |
| `PATCH /api/v1/vehicles/variants/{variantId}` | Sửa phiên bản | Admin | `vehicles.update` | FR-022 | P0-PROVISIONAL (BLOCKED_BY_PD-06 — xem mục 11.5) |
| `DELETE /api/v1/vehicles/variants/{variantId}` | Xóa phiên bản (RESTRICT khi còn fitment) | Admin | `vehicles.delete` | FR-022, PD-05 | P0-PROVISIONAL (BLOCKED_BY_PD-05 — xem mục 11.5) |
| `POST /api/v1/vehicles/import` | Nhập dữ liệu xe hàng loạt bằng Excel (FR-026; định dạng file do M04 chốt) | Admin | `vehicles.create` | FR-026 | P0-PROVISIONAL (định dạng file do M04 chốt) |
| `GET /api/v1/vehicles/import/{importId}` | Theo dõi tiến độ nhập xe (importId từ response 202 của POST import) | Admin | `vehicles.view` | FR-026 | P0-PROVISIONAL (định dạng file do M04 chốt) |
| `POST /api/v1/products/{productId}/fitments` | Gắn fitment cho sản phẩm (1 sản phẩm ↔ 1 vehicle application + ghi chú) | Admin | `fitments.create` | FR-027, FR-033 | P0 |
| `DELETE /api/v1/products/{productId}/fitments/{fitmentId}` | Bỏ gắn fitment | Admin | `fitments.delete` | FR-027, FR-033 | P0 |
| `POST /api/v1/fitments/import` | Nhập fitment hàng loạt bằng Excel (FR-032; định dạng file do M04 chốt) | Admin | `fitments.create` | FR-032 | P0-PROVISIONAL (định dạng file do M04 chốt) |
| `GET /api/v1/fitments/import/{importId}` | Theo dõi tiến độ nhập fitment (importId từ response 202 của POST import) | Admin | `fitments.view` | FR-032 | P0-PROVISIONAL (định dạng file do M04 chốt) |
| `GET /api/v1/fitments/change-logs` | Nhật ký thay đổi fitment (ai, khi nào, sản phẩm, xe) | Admin | `fitments.view` | FR-033 | P0 |
| `GET /api/v1/orders` | Danh sách đơn hàng (lọc trạng thái, tìm mã đơn/tên/SĐT khách) | Admin | `orders.view` | FR-060 | P0 |
| `GET /api/v1/orders/{orderId}` | Chi tiết đơn (snapshot, lịch sử trạng thái) | Admin | `orders.view` | FR-061, FR-066 | P0 |
| `PATCH /api/v1/orders/{orderId}/status` | Cập nhật trạng thái đơn theo vòng đời | Admin | `orders.update` | FR-062 | P0-PROVISIONAL (tên trạng thái cuối do M05 chốt — PD-08) |
| `POST /api/v1/orders/{orderId}/confirm-payment` | Admin xác nhận đã nhận tiền (đơn chuyển khoản) | Admin | `orders.confirm` | FR-063, BR-010 | P0 |
| `POST /api/v1/orders/{orderId}/cancel` | Hủy đơn (xác nhận + lý do) | Admin | `orders.cancel` | FR-064 | P0-PROVISIONAL (danh mục lý do hủy do Henry duyệt ở M05) |
| `PATCH /api/v1/orders/{orderId}/shipping` | Sửa thông tin giao hàng của đơn chưa giao | Admin | `orders.update` | FR-065 | P0 |

### 10.8 Admin — Bài viết/SEO, RBAC, audit (FR-067 → FR-074, FR-080 → FR-086)

| Method + Path | Mục đích | Access | Permission | FR | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| `POST /api/v1/articles` | Tạo bài viết (nháp/xuất bản) | Admin | `articles.create` | FR-067 | P0 |
| `PATCH /api/v1/articles/{slug}` | Sửa bài viết | Admin | `articles.update` | FR-067, FR-068 | P0 |
| `DELETE /api/v1/articles/{slug}` | Xóa bài viết | Admin | `articles.delete` | FR-067 | P0 |
| `POST /api/v1/articles/{slug}/seo/generate` | Generate SEO: Lớp 1 Rule Engine (luôn chạy) + Lớp 2 AI (khi có nhà cung cấp) | Admin | `articles.update` | FR-069, FR-070 | P0-PROVISIONAL (Lớp 2 BLOCKED_BY_D-04 — chưa chốt nhà cung cấp AI) |
| `PATCH /api/v1/articles/{slug}/seo` | Sửa tay SEO (manual override — không bao giờ bị ghi đè) | Admin | `articles.update` | FR-071, FR-072 | P0 |
| `GET /api/v1/roles` | Danh sách vai trò | Admin | `roles.view` | FR-080, FR-082 | P0 |
| `POST /api/v1/roles` | Tạo vai trò | Admin | `roles.create` | FR-082 | P0 |
| `PATCH /api/v1/roles/{roleId}` | Sửa vai trò (tên, mô tả) | Admin | `roles.update` | FR-082 | P0 |
| `DELETE /api/v1/roles/{roleId}` | Xóa vai trò (chặn khi là vai trò của Super Admin cuối cùng — BR-007) | Admin | `roles.delete` | FR-082, FR-085 | P0 |
| `GET /api/v1/roles/{roleId}/permissions` | Ma trận quyền của một vai trò | Admin | `roles.view` | FR-080 | P0 |
| `PUT /api/v1/roles/{roleId}/permissions` | Cập nhật ma trận quyền của một vai trò (checkbox) | Admin | `roles.update` | FR-080, FR-081, FR-084 | P0 |
| `GET /api/v1/permissions` | Danh sách toàn bộ permission code theo module | Admin | `roles.view` | FR-080 | P0 |
| `POST /api/v1/users/{userId}/roles` | Gán vai trò cho tài khoản admin | Admin | `users.update` | FR-082 | P0 |
| `DELETE /api/v1/users/{userId}/roles/{roleId}` | Bỏ gán vai trò | Admin | `users.update` | FR-082 | P0 |
| `GET /api/v1/users/{userId}/permissions` | Ngoại lệ quyền theo tài khoản (`user_permissions`) | Admin | `users.view` | FR-083 | P0 |
| `PUT /api/v1/users/{userId}/permissions` | Cập nhật ngoại lệ quyền theo tài khoản | Admin | `users.update` | FR-083, FR-084 | P0 |
| `GET /api/v1/audit-logs` | Nhật ký audit (thay đổi quyền, trạng thái đơn, fitment — lọc theo actor/entity/thời gian) | Admin | `audit.view` | FR-084, FR-066, FR-033 | P0 |

**Ghi chú đếm endpoint:** số endpoint trong catalogue này được kiểm chứng bằng script đối chiếu ở mục 23 (Test 2) — số endpoint trong `openapi.yaml` là nguồn đếm chính xác, không ghi số tổng cố định vào tài liệu để tránh sai lệch khi catalogue đổi trong quá trình review.

## 11. Đặc tả chi tiết từng endpoint (P0)

Quy ước trong mục này: mỗi endpoint có Method + Path, Purpose, Access, Authentication, Permission, Parameters, Request/Response Schema, Validation, Errors, Database mapping (entity/field trong ERD), PRD/SRS mapping (Requirement ID), Pending dependency (nếu có). Ví dụ request/response là **ví dụ minh họa, không phải dữ liệu thật**.

### 11.1 Giỏ hàng (Cart) — FR-050, FR-051, FR-045, FR-057

**Quyết định khung của M01-03 (FR-051):** giỏ hàng lưu server-side, định danh bằng **cart token** — một UUID ngẫu nhiên do server cấp lần đầu (`GET /cart` khi chưa có token sẽ cấp token mới), lưu ở cookie HttpOnly `seecarauto_cart` (SameSite=Lax, Secure ở production, hết hạn 30 ngày không hoạt động) và client gửi kèm trong header `X-Cart-Token` cho mọi thao tác giỏ. Lý do chọn server-side thay vì localStorage: giỏ phải tồn tại qua phiên (FR-051 — đóng trình duyệt mở lại vẫn thấy giỏ), giá và tình trạng phải được server kiểm tra lại tại checkout (FR-057), và tránh client tự quyết định giá (xem mục 11.3). **Gap cho M02:** ERD M01-02 không có bảng giỏ hàng — M02 quyết định bảng lưu trữ giỏ (cột: cart token, product_id, quantity, giá tại thời điểm thêm, created/updated) hoặc lưu Redis; API này không tự tạo bảng trong ERD. Nếu M02 chọn Redis cho giỏ, TTL 30 ngày. **Quyết định đã chốt (Henry phê duyệt 27/11/2026, theo đề xuất của ChatGPT ở review M02-02 — FIX-04): khi Redis lỗi, giỏ tạm thời không truy cập được và API trả lỗi dependency 503 — KHÔNG trả giỏ rỗng giả** (trả giỏ rỗng sẽ làm khách hiểu nhầm đã mất đồ). Ghi chú fallback cũ 'giỏ rỗng tạm thời, không lỗi 500' đã bị quyết định này thay thế.

**Quy tắc chung giỏ hàng:**
- Thêm/sửa số lượng: server kiểm tra sản phẩm tồn tại, đã xuất bản (PUBLISHED), không bị soft delete; nếu sản phẩm OUT_OF_STOCK thì vẫn cho thêm vào giỏ nhưng đánh dấu `availabilityWarning: "OUT_OF_STOCK"` (khách được cảnh báo, quyết định cuối ở checkout — FR-057); nếu sản phẩm bị ẩn/xóa sau khi đã trong giỏ thì item đó được đánh dấu `unavailable: true` và không tính vào tổng tiền.
- Giá trong giỏ luôn là **giá hiện tại của catalogue** (không phải giá lúc thêm); giá chỉ được chốt thành snapshot khi tạo đơn (BR-003). Tổng tiền giỏ được tính lại server-side mỗi lần đọc giỏ.
- Cảnh báo tương thích (FR-029): khi thêm sản phẩm vào giỏ mà xe đã chọn (client gửi `vehicleApplicationId` trong body hoặc đã lưu trong session) không tương thích, response kèm `fitmentWarning` — cảnh báo, **không chặn** thêm vào giỏ (quyết định chặn hay cảnh báo thuộc về frontend theo FR-029: hệ thống phải cảnh báo rõ trước khi khách thêm vào giỏ — API cung cấp cảnh báo, frontend hiển thị và để khách quyết định).

**GET /api/v1/cart**
- Purpose: lấy giỏ hiện tại (kèm tổng tiền, cảnh báo từng món).
- Access: Public. Auth: không bắt buộc; nhận diện bằng cookie `seecarauto_cart` hoặc header `X-Cart-Token`. Chưa có token → tạo giỏ trống mới + cấp token (response header `Set-Cookie` và field `cartToken` trong body lần đầu).
- Response `200`: `Cart` — `{ cartToken, items: [CartItem], subtotal, itemCount, warnings: [] }`; `CartItem` — `{ itemId, productId, productName, sku, price, quantity, lineTotal, imageUrl, availabilityStatus, unavailable, fitmentWarning }`.
- Errors: không có lỗi 404 cho giỏ trống (trả giỏ rỗng).
- DB mapping: giỏ hàng — M02 quyết bảng (gap, xem trên); `products.id`, `products.price`, `products.availability_status`, `products.status`.
- PRD/SRS: FR-050, FR-051.

**POST /api/v1/cart/items**
- Purpose: thêm một món vào giỏ.
- Access: Public. Request: `{ productId (UUID, bắt buộc), quantity (integer ≥ 1, bắt buộc), vehicleApplicationId (UUID, không bắt buộc — xe đã chọn để kiểm tra tương thích) }`.
- Response `201`: `Cart` đầy đủ sau khi thêm (kèm `fitmentWarning` trong item nếu không tương thích).
- Validation: `productId` sai định dạng UUID → `400 VALIDATION_ERROR`; `quantity` < 1 → `400`; sản phẩm không tồn tại / chưa xuất bản / đã soft delete → `404 PRODUCT_NOT_FOUND`; sản phẩm OUT_OF_STOCK → vẫn thêm, kèm `availabilityWarning`.
- Idempotency: gửi lại cùng `Idempotency-Key` trong 24h → trả lại kết quả lần đầu, không thêm trùng (xem mục 15).
- DB mapping: giỏ hàng (M02); `products.id`, `products.status`, `products.availability_status`, `product_vehicle_fitments` (kiểm tra tương thích).
- PRD/SRS: FR-045, FR-050.

**PATCH /api/v1/cart/items/{itemId}** — sửa số lượng một món. Request: `{ quantity (integer ≥ 1, bắt buộc) }`; `quantity = 0` không hợp lệ (muốn xóa dùng DELETE). Response `200`: `Cart` đầy đủ. Errors: item không có trong giỏ → `404 CART_ITEM_NOT_FOUND`; sản phẩm đã bị ẩn/xóa → `422 PRODUCT_UNAVAILABLE` (item giữ trong giỏ với cờ `unavailable`, frontend hiển thị và cho khách xóa).
**DELETE /api/v1/cart/items/{itemId}** — xóa một món. Response `200`: `Cart` đầy đủ (lý do trả 200 thay vì 204: frontend cần tổng tiền mới ngay — xem mục 8.3). Item không có → `404 CART_ITEM_NOT_FOUND`.
**DELETE /api/v1/cart** — xóa toàn bộ giỏ. Response `204` (không body).

### 11.2 Sản phẩm public và admin (FR-007 → FR-020, FR-042 → FR-049, FR-013/FR-014 P1)

**GET /api/v1/products** — danh sách sản phẩm.
- Purpose: catalogue có lọc/sắp xếp/phân trang, dùng được ở 2.000–10.000 SKU (FR-011 — phân trang server-side, không trả toàn bộ catalogue).
- Access: Public. Query params: `categorySlug`, `brandSlug`, `minPrice`, `maxPrice` (VND, integer ≥ 0), `availabilityStatus` (`IN_STOCK`/`OUT_OF_STOCK`), `vehicleApplicationId` (chỉ sản phẩm tương thích với xe đã chọn — FR-008, FR-012), `q` (tìm theo tên — tìm nâng cao dùng `/search`, xem mục 11.6), `sort` (`newest` | `price_asc` | `price_desc` | `name_asc` — danh sách cuối do M01-04 chốt, FR-009), `page` (mặc định 1), `limit` (mặc định 20, tối đa 100).
- Response `200`: `{ data: [ProductSummary], meta: { page, limit, total, totalPages, notice? } }`; `ProductSummary` — `{ id, sku, name, slug, brand: { id, name, slug }, category: { id, name, slug }, price, availabilityStatus, imageUrl (ảnh chính), }`.
- Quy tắc: chỉ trả sản phẩm `status = PUBLISHED` và chưa soft delete (FR-048 — sản phẩm ẩn/xóa không xuất hiện ở public); xe đã chọn không có sản phẩm tương thích → trả `data: []` kèm `meta.notice: "NO_FITMENT_FOR_VEHICLE"` để frontend hiển thị thông báo + hotline/Zalo (FR-012) — không trả 404.
- Validation: `minPrice > maxPrice` → `400`; `limit > 100` → clamp về 100 (không lỗi); `sort` ngoài enum → `400`.
- DB mapping: `products` (+ join `brands`, `categories`, `product_images` ảnh chính, `product_vehicle_fitments` khi lọc theo xe).
- PRD/SRS: FR-007 → FR-012. NFR: NFR-002 (hiệu năng API danh sách — ngưỡng do M02/M03 đo), NFR-004/NFR-005 (cache danh sách 300–900s).

**GET /api/v1/products/{productId}** — chi tiết sản phẩm.
- Purpose: trang quyết định mua (FR-042).
- Access: Public. `{productId}` có thể là UUID hoặc slug (server thử UUID trước, nếu không khớp định dạng UUID thì tra theo slug — ghi chú M02: 2 lookup path, ưu tiên slug khi chuỗi không phải UUID).
- Response `200`: `ProductDetail` — `{ id, sku, name, slug, brand, category, price, availabilityStatus, status, images: [{ imageUrl, altText, displayOrder }], specifications: [{ specKey, specValue }] (P1 — xem PD-07), identifiers: [{ type, value, issuer }], description, fitments: [VehicleApplicationSummary], seo: { title, description, canonical } }`.
- Quy tắc: sản phẩm `HIDDEN`/soft delete → `404 PRODUCT_NOT_FOUND` kèm gợi ý (frontend hiển thị 404 thân thiện + gợi ý sản phẩm/danh mục khác — FR-048); sản phẩm chưa có fitment → `fitments: []` kèm `fitmentNotice: "NO_FITMENT_INFO"` (FR-031 — hiển thị "chưa có thông tin tương thích — liên hệ để được tư vấn", không đoán xe).
- DB mapping: `products`, `product_identifiers`, `product_images`, `product_specifications`, `product_vehicle_fitments` + `vehicle_applications`, `brands`, `categories`.
- PRD/SRS: FR-042 → FR-049, BR-001, BR-012.

**GET /api/v1/products/{productId}/fitments** — danh sách xe tương thích. Response `200`: `{ data: [VehicleApplicationSummary + fitmentNote] }`. Sản phẩm chưa có fitment → `data: []` + `fitmentNotice`. FR-028, FR-030.
**GET /api/v1/products/{productId}/related** — sản phẩm liên quan/thay thế. **P0-PROVISIONAL:** tiêu chí liên quan do M01-04/M03 chốt, Henry duyệt (FR-046) — contract: `GET` trả danh sách `ProductSummary` (tối đa 8), chỉ sản phẩm PUBLISHED thật; chưa có tiêu chí → trả `data: []` (không bịa quan hệ). DB mapping: chưa có bảng quan hệ sản phẩm liên quan trong ERD — M03 quyết định (bảng mới hoặc rule-based theo cùng danh mục/thương hiệu/fitment chung); API này không tự tạo bảng.
**GET /api/v1/categories** — cây danh mục: response `200` `{ data: [CategoryTree] }` (đệ quy `children`), chỉ danh mục `isVisible = true`; danh mục ẩn không xuất hiện nhưng sản phẩm trong đó không bị xóa (FR-015). **GET /api/v1/categories/{slug}** — chi tiết danh mục (404 nếu slug không tồn tại hoặc danh mục ẩn — ẩn thì coi như không tồn tại ở public). **GET /api/v1/categories/{slug}/products** — như `GET /products` với `categorySlug` cố định. Tương tự cho `GET /api/v1/brands`, `GET /api/v1/brands/{slug}`, `GET /api/v1/brands/{slug}/products`.

**POST /api/v1/products** (Admin, `products.create`) **P0-PROVISIONAL (BLOCKED_BY_PD-02)** — tạo sản phẩm.
- Request: `{ name (bắt buộc), sku (bắt buộc, UNIQUE — trùng → 409), categoryId (UUID, bắt buộc), brandId (UUID, bắt buộc), price (integer ≥ 0, bắt buộc), availabilityStatus (bắt buộc), status (DRAFT mặc định), description, identifiers: [{ type, value, issuingMakeId?, issuingBrandId? }] (không bắt buộc — có thể thêm sau qua endpoint identifiers) }`.
- Validation: SKU chuẩn hóa trùng → `409 SKU_DUPLICATE`; issuer sai ma trận CHECK (vd: OEM_NUMBER kèm `issuingBrandId`) → `400 VALIDATION_ERROR` (FIX-01 M01-02); `categoryId`/`brandId` không tồn tại → `400 VALIDATION_ERROR` (không phải 404 — vì đây là tham chiếu trong body, không phải resource trong path).
- Response `201`: `ProductDetail` đầy đủ (kèm identifiers đã tạo).
- Sau tạo: đồng bộ Meilisearch qua BullMQ (INT-004); invalidate cache danh sách sản phẩm (ADR-006).
- DB mapping: `products`, `product_identifiers`. PRD/SRS: FR-042, FR-043, BR-001.

**PATCH /api/v1/products/{productId}** (Admin, `products.update`) — sửa sản phẩm: body là tập con các field (partial update); đổi `status` DRAFT ↔ PUBLISHED ↔ HIDDEN; đổi `availabilityStatus` (BR-012 — admin quản lý trạng thái còn hàng); đổi giá → trang chi tiết cập nhật sau cache invalidate (TTL 900s, FR-047); đơn đã đặt không đổi giá (BR-003). Không cho sửa `sku` qua PATCH thường — đổi SKU là thao tác nhạy cảm, chỉ cho qua endpoint riêng ở M03 (ghi chú: SKU là định danh nội bộ ổn định; đổi SKU phải kiểm tra đơn hàng đã dùng SKU đó — M03 chốt quy trình). Response `200`: `ProductDetail`.
**DELETE /api/v1/products/{productId}** (Admin, `products.delete`) **P0-PROVISIONAL (BLOCKED_BY_PD-05)** — soft delete (`deleted_at` = now, không xóa vật lý); chặn khi sản phẩm đã có trong đơn hàng (ERD RESTRICT — `order_items.product_id` tham chiếu; chỉ cho ẩn HIDDEN thay vì xóa — FR-048, PD-05). Response `204`. Đã soft delete → `404 PRODUCT_NOT_FOUND` ở public, admin xem được qua `GET /orders/{id}` snapshot (không join products).
**POST /api/v1/products/{productId}/images** (Admin, `products.update`) — upload 1 ảnh: `multipart/form-data`, field `file` (jpg/png/webp, tối đa 5 MB), `altText`, `displayOrder`; server upload lên S3/R2 (D-06), trả `imageUrl` tuyệt đối (INT-005). Response `201`: `ProductImage`. **DELETE /api/v1/products/{productId}/images/{imageId}** — `204`.
**POST /api/v1/products/{productId}/identifiers** (Admin, `products.update`) **P0-PROVISIONAL (BLOCKED_BY_PD-04)** — thêm mã: body `{ type, value, issuingMakeId?, issuingBrandId?, isPrimary? }`; validation theo ma trận issuer CHECK (FIX-01); `isPrimary = true` thì các identifier cùng type khác của sản phẩm đó tự bỏ primary (partial unique — ERD). Response `201`: `ProductIdentifier`. **DELETE /api/v1/products/{productId}/identifiers/{identifierId}** — `204`; chặn xóa identifier đang là `isPrimary` duy nhất của type đó khi type đó bắt buộc phải có primary? Không — không có type nào bắt buộc phải có primary ở P0 (ERD không bắt buộc); xóa primary thì không tự chọn primary mới (admin chọn lại thủ công).
**POST /api/v1/categories** / **PATCH /api/v1/categories/{slug}** / **DELETE /api/v1/categories/{slug}** (Admin, `categories.*`) — tạo/sửa/xóa danh mục: `name`, `slug` (tự sinh từ tên nếu không gửi, trùng → gợi ý slug khác, không tự ghi đè — FR-019), `parentId` (null = gốc; chặn chu trình — application-level, ERD §7), `displayOrder`, `isVisible`. Xóa: chặn khi còn sản phẩm (FR-020 — trả `409 CATEGORY_HAS_PRODUCTS` kèm số lượng sản phẩm; admin phải chuyển sản phẩm trước). Đổi slug đã công bố → tự tạo `url_redirects` 301 từ slug cũ (FR-018, BR-005). Tương tự cho brands (`POST/PATCH/DELETE /api/v1/brands`, `brands.*`; xóa brand chặn khi còn sản phẩm — FR-020). (DELETE danh mục/thương hiệu: P0-PROVISIONAL — BLOCKED_BY_PD-05; POST/PATCH: P0.)
- P1 ghi chú: lọc theo thông số kỹ thuật (FR-013) và quản lý thứ tự hiển thị trong danh mục (FR-014) là P1 — không có endpoint P0 cho 2 chức năng này; xem mục 20.

### 11.3 Đơn hàng (FR-052 → FR-066, FR-058, BR-003, BR-009, BR-010)

**POST /api/v1/orders** — tạo đơn hàng.
- Purpose: khách đặt hàng không cần tài khoản (FR-092), COD hoặc chuyển khoản (BR-009 — chỉ 2 phương thức ở P0; phương thức khác → `400 VALIDATION_ERROR`).
- Access: Public. Request: `{ cartToken (bắt buộc — lấy giỏ), customerName (bắt buộc), customerPhone (bắt buộc, định dạng SĐT Việt Nam), shippingAddress (bắt buộc), paymentMethod (COD | BANK_TRANSFER, bắt buộc), note (không bắt buộc), Idempotency-Key (header, bắt buộc — xem mục 15) }`.
- **BLOCKED_BY_D-08 (một phần):** các trường bắt buộc của checkout chi tiết (khách vãng lai/tài khoản, trường bắt buộc ngoài 3 trường trên, định dạng mã đơn, bước đối soát chuyển khoản, chính sách đổi/trả) do M01-04 trình Henry duyệt — 3 trường `customerName`/`customerPhone`/`shippingAddress` là khung tối thiểu theo PRD 4.8 ("nhập thông tin người nhận và địa chỉ giao hàng"); các trường bổ sung (vd: email, quận/huyện tách riêng, ghi chú giao hàng) được thêm vào contract sau khi D-08 chốt, không tự thêm trường bắt buộc mới ở đây.
- **Quy tắc giá (quan trọng — brief M01-03):** client KHÔNG được gửi giá hay tổng tiền trong request — server tính lại toàn bộ từ catalogue tại thời điểm đặt: mỗi item lấy `products.price` hiện tại; item nào bị ẩn/xóa hoặc đổi giá sau khi thêm vào giỏ → đơn KHÔNG được tạo, trả `409 CART_CHANGED` kèm danh sách item đổi giá/tình trạng để khách xác nhận lại với giá/tình trạng mới (FR-057); khách xác nhận lại (gửi lại request với `confirmPriceChange: true`) thì đơn mới được tạo với giá mới — request gửi lại phải dùng `Idempotency-Key` mới (xem mục 15). Tổng tiền đơn = tổng line total server tính.
- **Snapshot (BR-003):** tại thời điểm tạo đơn, mỗi `order_items` lưu `productNameSnapshot`, `skuSnapshot`, `unitPriceSnapshot`, `quantity`, `lineTotal`; sau này giá catalogue đổi không đổi đơn đã đặt.
- **Mã đơn (FR-058):** `orderCode` sinh ngẫu nhiên không đoán được, không liên tục (vd: 10 ký tự chữ+số ngẫu nhiên có checksum — thuật toán cụ thể do M02 chốt; yêu cầu: không phải số thứ tự, không suy ra được mã đơn khác từ một mã đơn). Mã đơn trả về trong response tạo đơn và dùng để tra cứu.
- Response `201`: `{ orderId, orderCode, status, paymentMethod, totalAmount, items: [OrderItemSnapshot], customerName, customerPhone, shippingAddress, bankTransferInfo? (chỉ khi BANK_TRANSFER — thông tin chuyển khoản + nội dung chứa mã đơn; thông tin tài khoản ngân hàng thật do Henry cung cấp khi triển khai — không có trong tài liệu này), createdAt }`.
- Sau tạo đơn: giỏ hàng được xóa (cart token hết hiệu lực cho giỏ đó); đồng bộ/không đồng bộ gì thêm ở P0 (đối soát chuyển khoản thủ công — BR-010).
- Errors: giỏ trống → `400 EMPTY_CART` (FR-056 — checkout không cho vào khi giỏ trống; ở mức API: tạo đơn với giỏ trống → lỗi, không tạo đơn); `paymentMethod` ngoài COD/BANK_TRANSFER → `400`; SĐT sai định dạng → `400`; trùng `Idempotency-Key` trong 24h → trả lại đơn đã tạo (không tạo đơn thứ hai — xem mục 15).
- DB mapping: `orders`, `order_items`; đọc `products` (giá), `product_vehicle_fitments` không dùng ở bước tạo đơn.
- PRD/SRS: FR-052 → FR-055, FR-056, FR-057, BR-003, BR-009.

**GET /api/v1/orders/lookup** — tra cứu đơn công khai.
- Purpose: khách tra cứu trạng thái đơn bằng mã đơn, không cần đăng nhập (FR-058).
- Access: Public. Query: `?code=<orderCode>` (bắt buộc).
- Response `200` (mã đúng): `{ orderCode, status, paymentMethod, totalAmount, createdAt, items: [{ productNameSnapshot, skuSnapshot, quantity, lineTotal }] (snapshot — không join catalogue), shippingAddress (đã che một phần — chỉ hiện quận/huyện + tỉnh/thành, không hiện số nhà chi tiết và không hiện SĐT đầy đủ ở P0) }` — **không lộ thông tin cá nhân đầy đủ hay chi tiết đơn của người khác**: response này chỉ chứa thông tin của chính đơn được tra cứu; không có endpoint liệt kê đơn theo SĐT/tên.
- **BLOCKED_BY_D-09:** phương thức xác minh bổ sung khi tra cứu (SĐT, OTP hay khác) do Henry quyết định — ở P0, tra cứu bằng mã đơn + rate limit; nếu D-09 chốt thêm xác minh (vd: nhập SĐT), endpoint này sẽ yêu cầu thêm param `phone` và chỉ trả chi tiết khi khớp — contract chi tiết đó thuộc M05 sau khi D-09 chốt. Hiện tại endpoint trả trạng thái + tóm tắt như trên, không trả SĐT đầy đủ hay địa chỉ chi tiết.
- Errors: mã sai/không tồn tại → `404 ORDER_NOT_FOUND` (message chung, không phân biệt "mã sai" hay "đơn không tồn tại" để tránh dò mã); tra cứu liên tiếp bất thường → `429 RATE_LIMITED` (xem mục 16); mã đơn đoán được (số thứ tự liên tục) không bao giờ khớp vì mã đơn sinh ngẫu nhiên.
- DB mapping: `orders`, `order_items` (chỉ snapshot).
- PRD/SRS: FR-058, D-09.

**GET /api/v1/orders** (Admin, `orders.view`) — danh sách đơn: query `status`, `q` (tìm theo mã đơn/tên/SĐT khách — FR-060), `from`, `to` (khoảng ngày tạo), `page`, `limit`, `sort` (`created_desc` mặc định). Response `200` danh sách `OrderSummary` (kèm `totalAmount`, `status`, `paymentMethod`, `customerName`, `customerPhone` đầy đủ — admin được xem vì có quyền `orders.view`).
**GET /api/v1/orders/{orderId}** (Admin, `orders.view`) — chi tiết đơn: đầy đủ thông tin khách, địa chỉ, từng món snapshot, phương thức thanh toán, trạng thái, lịch sử thay đổi trạng thái (FR-061, FR-066).
**PATCH /api/v1/orders/{orderId}/status** (Admin, `orders.update`) — cập nhật trạng thái: body `{ status (bắt buộc), note? }`. **P0-PROVISIONAL (PD-08):** vòng đời trạng thái chi tiết do M05 chốt theo nghiệp vụ Henry duyệt — khung P0: `PENDING` (mới đặt) → `CONFIRMED` (xác nhận) → `SHIPPING` (đang giao) → `COMPLETED` (hoàn tất), cộng `CANCELLED` (hủy) / `REFUNDED` (hoàn); chuyển sai thứ tự (vd: PENDING → COMPLETED) → `409 INVALID_STATUS_TRANSITION` (hoặc cảnh báo theo quy tắc M05 chốt — hiện tại: chặn). Mọi chuyển trạng thái ghi log (FR-066).
**POST /api/v1/orders/{orderId}/confirm-payment** (Admin, `orders.confirm`) — xác nhận đã nhận tiền (đơn BANK_TRANSFER): body `{ confirmedAt?, note? }`; đơn COD gọi endpoint này → `409 INVALID_STATUS_TRANSITION`; đơn BANK_TRANSFER chưa xác nhận tiền → không chuyển sang SHIPPING được (BR-010 — kiểm tra ở `PATCH /status`: chuyển sang SHIPPING khi chưa confirm-payment → `422 PAYMENT_NOT_CONFIRMED`).
**POST /api/v1/orders/{orderId}/cancel** (Admin, `orders.cancel`) — hủy đơn: body `{ reason (bắt buộc — text; danh mục lý do do Henry duyệt ở M05 — P0-PROVISIONAL), note? }`; đơn đã hủy không sửa được nữa (FR-064 — mọi thao tác sửa trạng thái sau hủy → `409 ORDER_CANCELLED`); đơn đã giao (SHIPPING/COMPLETED) → hủy bị chặn `409 CANNOT_CANCEL_SHIPPED_ORDER` (quy tắc cụ thể do M05 chốt — hiện tại: chặn).
**PATCH /api/v1/orders/{orderId}/shipping** (Admin, `orders.update`) — sửa thông tin giao hàng: body `{ customerName?, customerPhone?, shippingAddress?, note? }`; chỉ cho đơn chưa giao (PENDING/CONFIRMED); đơn SHIPPING/COMPLETED → `409 ORDER_ALREADY_SHIPPED` (FR-065); thay đổi ghi log (FR-066).

### 11.4 Liên hệ và bài viết public (FR-004, FR-067 → FR-074, FR-087 → FR-089)

**POST /api/v1/contact** — gửi form liên hệ.
- Purpose: khách gửi liên hệ (tên, SĐT/email, nội dung).
- Access: Public. Request: `{ name (bắt buộc), phone (bắt buộc, SĐT Việt Nam), email (không bắt buộc, đúng định dạng), subject (không bắt buộc), message (bắt buộc, 10–2000 ký tự), orderCode (không bắt buộc — liên hệ theo mã đơn) }`.
- **P0-PROVISIONAL (đích nhận):** form gửi về đâu (email hay lưu vào hệ thống) do M01-04/M05 chốt theo Henry duyệt (FR-089) — contract: endpoint nhận và validate form, trả `201` + `contactId`; việc lưu trữ/chuyển tiếp (gửi email tới địa chỉ nào, hay lưu bảng contact_messages) thuộc M05. Response `201`: `{ contactId, message: "Đã nhận liên hệ của bạn." }`. Gửi form trống → `400` từng trường; gửi thành công/thất bại → toast/popup ở frontend (không dùng `alert()` — FR-089).
- Rate limit: 5 lần/giờ/IP (chống spam form — xem mục 16).
- DB mapping: chưa có bảng contact trong ERD M01-02 (gap — xem mục 7); M02/M05 quyết định lưu trữ.

**GET /api/v1/articles** — danh sách bài viết đã xuất bản: query `categoryId?`, `page`, `limit`, `sort` (`newest` mặc định). Chỉ bài `status = PUBLISHED`; bài nháp không xuất hiện (FR-067). Response `200` danh sách `ArticleSummary` (`{ id, title, slug, excerpt, coverImageUrl, publishedAt }`).
**GET /api/v1/articles/{slug}** — chi tiết bài: `{ id, title, slug, content, category, publishedAt, seo: { title, description, canonical } }`; bài nháp → `404` ở public. FR-067, FR-068, FR-074.

### 11.5 Xe, fitment, tìm kiếm — đặc tả chi tiết (FR-021 → FR-041)

**GET /api/v1/vehicles/makes** — danh sách hãng xe: chỉ hãng `isVisible = true`; response `200` `{ data: [VehicleMake] }` (không phân trang — số hãng xe nhỏ; nếu vượt 100 hãng thì thêm phân trang ở M04). **GET /api/v1/vehicles/makes/{slug}** — chi tiết hãng (404 nếu ẩn/không tồn tại). **GET /api/v1/vehicles/makes/{slug}/models** — dòng xe của hãng (chỉ model `isVisible`). **GET /api/v1/vehicles/models/{slug}** — chi tiết dòng (kèm `make`). **GET /api/v1/vehicles/models/{slug}/generations** — thế hệ của dòng (kèm `yearFrom`/`yearTo`; `yearTo = null` nghĩa là còn sản xuất). **GET /api/v1/vehicles/generations/{generationId}/variants** — phiên bản của thế hệ.
**GET /api/v1/vehicles/{makeSlug}/{modelSlug}** — trang xe: `{ make, model, generations: [...], products: [ProductSummary] (phân trang, chỉ sản phẩm tương thích với model này — mọi generation/variant của model) }`; FR-023. Query thêm `generationId`/`variantId`/`year` để lọc sâu hơn theo generation/variant/năm (nullable theo ERD — Generation/Variant có thể null, PD-01: mức chi tiết tối thiểu khi nhập dữ liệu thật là Model+Year).
**GET /api/v1/vehicle-applications/{applicationId}/products** — tra cứu ngược (FR-030): toàn bộ phụ tùng tương thích với một vehicle application; phân trang; chỉ PUBLISHED.
**GET /api/v1/fitment/check** — kiểm tra tương thích: query `productId` (UUID, bắt buộc) + `vehicleApplicationId` (UUID, bắt buộc); response `200`: `{ compatible: true|false, fitmentNote: "..." | null, vehicleApplication: {...} }`; sản phẩm chưa có fitment nào → `compatible: false` kèm `fitmentNotice: "NO_FITMENT_INFO"` (FR-031). FR-029.
**GET /api/v1/fitments** — danh sách fitment: query `productId?` hoặc `vehicleApplicationId?` (ít nhất một trong hai, không có → `400`); phân trang; response `200` danh sách `{ id, productId, vehicleApplicationId, fitmentNote }`. FR-030.

**POST /api/v1/products/{productId}/fitments** (Admin, `fitments.create`) — gắn fitment: body `{ vehicleApplicationId (UUID, bắt buộc), fitmentNote? }`; trùng (product + application đã có) → `409 FITMENT_DUPLICATE` (ERD UNIQUE); vehicle application không tồn tại → `400`; ghi `fitment_change_logs` (ATTACH, FR-033). Response `201`: fitment đã tạo. **DELETE /api/v1/products/{productId}/fitments/{fitmentId}** (Admin, `fitments.delete`) — bỏ gắn: ghi log DETACH; `204`.
**POST /api/v1/vehicles/import** (Admin, `vehicles.create`) — nhập xe bằng Excel: `multipart/form-data`, field `file` (.xlsx, tối đa 10 MB); **P0-PROVISIONAL:** định dạng file do M04 chốt (FR-026) — contract khung: response `202` (xử lý bất đồng bộ qua BullMQ) `{ importId, status: "PROCESSING" }` + endpoint theo dõi `GET /api/v1/vehicles/import/{importId}` (trả `{ status, totalRows, successRows, errors: [{ row, message }] }`); lỗi từng dòng báo rõ, không nhập nửa chừng (quy tắc thống nhất do M04 chốt — FR-026/FR-032).

**GET /api/v1/vehicles/import/{importId}** (Admin, `vehicles.view`) — theo dõi tiến độ nhập xe: path `importId` (UUID, bắt buộc); response `200`: `{ data: ImportStatus }` (`status`: PROCESSING | COMPLETED | FAILED; `totalRows`, `successRows`, `errors: [{ row, message }]`); import không tồn tại → `404 IMPORT_NOT_FOUND`. **GET /api/v1/fitments/import/{importId}** (Admin, `fitments.view`) — tương tự cho fitment (FR-032), cùng schema `ImportStatus`. **POST /api/v1/fitments/import** (Admin, `fitments.create`) — tương tự cho fitment (FR-032): response `202` `{ importId, status: "PROCESSING" }` + endpoint theo dõi `GET /api/v1/fitments/import/{importId}` (cùng schema `ImportStatus`).
**GET /api/v1/fitments/change-logs** (Admin, `fitments.view`) — nhật ký fitment: query `productId?`, `changedByAdminId?`, `from?`, `to?`, phân trang; response danh sách `{ id, productId, vehicleApplicationId, action, changedByAdminId, changedAt }`. FR-033.

**GET /api/v1/search** — tìm kiếm (FR-034 → FR-041).
- Purpose: tìm theo tên/SKU/OEM/MPN/thương hiệu, thứ tự ưu tiên ADR-010.
- Access: Public. Query: `q` (bắt buộc, tối thiểu 2 ký tự sau trim), `categorySlug?`, `brandSlug?`, `vehicleApplicationId?` (ưu tiên sản phẩm tương thích xe đã chọn — FR-039), `sort` (`relevance` mặc định | `price_asc` | `price_desc` | `newest`), `page`, `limit`.
- **Thứ tự ưu tiên kết quả (BR-002, FR-035):** SKU chính xác → OEM chính xác → mã nhà sản xuất → tên/thương hiệu → gần đúng; **không fuzzy mạnh với mã OEM** (FR-036 — mã OEM sai một ký tự không được trả như kết quả chính xác; có thể trả gợi ý "kiểm tra lại mã" trong `suggestions`). Meilisearch cấu hình: trường mã (`sku`, `normalizedValue` các loại) dùng exact match có trọng số cao nhất, không typo tolerance cho trường mã; trường tên/thương hiệu cho phép typo tolerance giới hạn.
- Response `200`: `{ data: [ProductSummary + matchType ("SKU_EXACT" | "OEM_EXACT" | "MPN_EXACT" | "NAME" | "BRAND" | "FUZZY")], meta: { page, limit, total, totalPages }, suggestions: ["..."] }`; không có kết quả → `data: []` kèm `suggestions` (thử mã khác, tìm theo tên, liên hệ Zalo/hotline kèm mã — FR-040), không trả 404.
- Cache: kết quả tìm kiếm cache Redis TTL 60–300s (FR-041, ADR-006); cập nhật sản phẩm → invalidate cache tìm kiếm.
- DB mapping: Meilisearch index (đồng bộ từ `products` + `product_identifiers` qua BullMQ — INT-004); không truy vấn trực tiếp PostgreSQL cho full-text.
- PRD/SRS: FR-034 → FR-041, BR-002, NFR-003 (gợi ý < 1s — cho `/search/suggest`).

**GET /api/v1/search/suggest** — gợi ý khi gõ (FR-037): query `q` (tối thiểu 2 ký tự, tối đa 50); response `200`: `{ data: [{ type: "PRODUCT" | "BRAND" | "CATEGORY", id, name, slug }] }` (tối đa 8 gợi ý, không phân trang); < 1s (NFR-003); chọn bằng chuột/bàn phím là việc của frontend.
**GET /api/v1/identifiers/lookup** **P0-PROVISIONAL (BLOCKED_BY_PD-02 / PD-03 / PD-04)** — tra cứu chính xác theo mã (FR-034 → FR-036, FR-043): query `type` (bắt buộc: `SKU` | `OEM_NUMBER` | `MANUFACTURER_PART_NUMBER` | `PART_NUMBER` | `ALTERNATE_NUMBER`) + `code` (bắt buộc); server chuẩn hóa `code` (uppercase, bỏ phân cách — mục 9) rồi khớp `normalizedValue` chính xác; **không fuzzy** với mọi loại mã ở endpoint này (khác với `/search` cho phép gần đúng ở tên); response `200`: `{ data: [ProductSummary] }` (nhiều sản phẩm khi một OEM map nhiều sản phẩm — PD-03: một OEM có thể map nhiều sản phẩm — thiết kế dự kiến, chưa được Henry duyệt; không có kết quả → `data: []`); `type=SKU` thì tối đa 1 sản phẩm (SKU unique). Lưu ý: `type=SKU` tra `products.sku`; các type còn lại tra `product_identifiers` (BR-001 — không gộp chung thành một trường "mã").

### 11.6 Admin — Bài viết/SEO, RBAC, audit, dashboard, redirect

**POST /api/v1/articles** (Admin, `articles.create`) — tạo bài: `{ title, slug?, content, categoryId?, status: DRAFT mặc định }`; slug tự sinh từ title nếu không gửi, trùng → gợi ý khác (FR-068 — slug không đổi khi đổi tiêu đề). **PATCH /api/v1/articles/{slug}** (Admin, `articles.update`) — sửa bài; đổi `title` không đổi `slug` (FR-068). **DELETE /api/v1/articles/{slug}** (Admin, `articles.delete`) — xóa bài (soft delete hoặc hard delete — M02 chốt; bài đã xuất bản bị xóa → URL cũ trả 404 + redirect nếu có — FR-018).
**POST /api/v1/articles/{slug}/seo/generate** (Admin, `articles.update`) — Generate SEO (FR-069, FR-070):
- Lớp 1 Rule Engine (luôn chạy, không cần AI): kiểm tra độ dài title/description, tần suất từ khóa, slug chuẩn SEO → trả `warnings: [{ field, code, message }]` + đề xuất sửa.
- Lớp 2 AI Content Analysis: đề xuất SEO Title, Meta Description, Focus Keyword, Secondary Keywords, slug, Search Intent, Content Topic, FAQ, internal links — **BLOCKED_BY_D-04** (chưa chốt nhà cung cấp AI + ngân sách): khi chưa cấu hình AI, endpoint trả Lớp 1 + `aiStatus: "NOT_CONFIGURED"` và message rõ "chưa cấu hình AI" (FR-070); không gọi AI khi gõ (BR-014 — chỉ generate theo yêu cầu).
- Response `200`: `{ seo: {...}, warnings: [...], aiStatus: "OK" | "NOT_CONFIGURED", overriddenFields: [...] }`.
- **Manual override (BR-004, FR-071):** trường nào editor đã sửa tay thì Generate không bao giờ ghi đè — server lưu `manualOverrideFlags` theo từng trường; `PATCH /api/v1/articles/{slug}/seo` (Admin, `articles.update`) — sửa tay SEO: body `{ seoTitle?, metaDescription?, focusKeyword?, secondaryKeywords?, searchIntent?, clearOverride?: ["seoTitle"] }`; `clearOverride` bỏ manual override của một trường để hệ thống đề xuất lại (FR-072). Response `200`: SEO hiện tại kèm cờ override.

**GET /api/v1/roles** (Admin, `roles.view`) — danh sách vai trò (phân trang). **POST /api/v1/roles** (Admin, `roles.create`) — tạo vai trò `{ name, description }`. **PATCH /api/v1/roles/{roleId}** (Admin, `roles.update`) — sửa vai trò. **DELETE /api/v1/roles/{roleId}** (Admin, `roles.delete`) — xóa vai trò; chặn khi xóa vai trò của Super Admin cuối cùng (BR-007 — kiểm tra: còn tài khoản Super Admin nào khác không; nếu là vai trò cuối → `403 LAST_SUPER_ADMIN_ROLE`).
**GET /api/v1/roles/{roleId}/permissions** (Admin, `roles.view`) — ma trận quyền của vai trò: `{ roleId, permissions: [{ module, action, granted }] }`. **PUT /api/v1/roles/{roleId}/permissions** (Admin, `roles.update`) — cập nhật toàn bộ ma trận: body `{ permissions: [{ module, action, granted }] }`; thay đổi có hiệu lực qua cache invalidation (TTL quyền 300s — BR-008); ghi audit log (FR-084); thao tác khiến Super Admin cuối cùng mất quyền quản trị → chặn `403 LAST_SUPER_ADMIN` (FR-085).
**GET /api/v1/permissions** (Admin, `roles.view`) — danh sách toàn bộ permission code theo module (dùng để render ma trận checkbox — FR-080).
**POST /api/v1/users/{userId}/roles** (Admin, `users.update`) — gán vai trò: body `{ roleId }`; **DELETE /api/v1/users/{userId}/roles/{roleId}** — bỏ gán. **GET /api/v1/users/{userId}/permissions** (Admin, `users.view`) / **PUT /api/v1/users/{userId}/permissions** (Admin, `users.update`) — ngoại lệ theo tài khoản (FR-083): body `{ permissions: [{ module, action, granted | null }] }` (`null` = xóa ngoại lệ, dùng quyền của vai trò).
**GET /api/v1/audit-logs** (Admin, `audit.view`) — nhật ký audit: query `actorId?`, `entityType?` (`ROLE` | `ORDER` | `FITMENT` | `PRODUCT` ...), `entityId?`, `from?`, `to?`, phân trang; response `{ id, actorId, action, entityType, entityId, before, after, createdAt }` (FR-084, FR-066, FR-033).
**GET /api/v1/admin/dashboard/summary** (Admin, `dashboard.view`) — tổng quan: response `{ pendingOrders, todayOrders, publishedProducts, draftProducts, publishedArticles, ordersByStatus: { PENDING: n, ... } }` — **chỉ số liệu thật** từ hệ thống (BR-013, FR-075); chưa có dữ liệu → số 0 thật kèm `empty: true` (không hiển thị số mẫu); hiển thị theo quyền: tài khoản không có `orders.view` thì `pendingOrders` bị ẩn (trả `null` + `hiddenByPermission: true`) — FR-077. Đây là 1 trong 2 ngoại lệ aggregate được phép (xem mục 3).
**GET /api/v1/redirects** (Admin, `redirects.view`) / **POST /api/v1/redirects** (Admin, `redirects.create`) / **DELETE /api/v1/redirects/{redirectId}** (Admin, `redirects.delete`) — quản lý redirect 301: `{ entityType, entityId?, oldSlug, newSlug }`; UNIQUE(entity_type, old_slug) → trùng `409 REDIRECT_DUPLICATE`. FR-018.

### 11.7 Xác thực admin — đặc tả chi tiết (FR-090, FR-091)

**POST /api/v1/auth/admin/login** — Request: `{ username (bắt buộc — chỉ username, không có cột email), password (bắt buộc, 8–128 ký tự) }`. Response `200` (envelope `{ data: ... }` theo INT-007): `{ accessToken, refreshToken, tokenType: "Bearer", expiresIn: 900 (giây — access token 15 phút), admin: { id, username, roles: [...] } }`. Sai tài khoản/mật khẩu → `401 INVALID_CREDENTIALS` (message chung, không lộ tài khoản có tồn tại — FR-090; username không tồn tại vẫn chạy verify Argon2id với dummy hash để thời gian phản hồi không lộ tài khoản có tồn tại). Sai liên tiếp 5 lần → `423 ACCOUNT_LOCKED` + `retryAfter` (900 giây — khóa 15 phút; đăng nhập đúng khi đang khóa vẫn `423`; hết thời gian khóa → đăng nhập lại được; đăng nhập đúng reset `failedLoginAttempts` về 0). Rate limit riêng: 5 lần/phút/IP + 10 lần/phút/tài khoản (xem mục 16).
**POST /api/v1/auth/admin/refresh** — Header bắt buộc `Idempotency-Key: <uuid>` (một key cho mỗi thao tác refresh; retry cùng thao tác dùng cùng key; thiếu header hoặc key không phải UUID → `400 VALIDATION_ERROR`, details field `Idempotency-Key`). Request: `{ refreshToken (bắt buộc) }`. Response `200` (envelope `{ data: ... }`): access token mới + refresh token mới (xoay vòng); refresh token cũ bị thu hồi (`revoked_reason = ROTATED`, `replaced_by_session_id` = id session mới). Cùng token + cùng key → trả lại response đã lưu của thao tác đó (không rotation thêm, không revoke-all); nếu envelope response đã hết TTL (10 giây) → `503 SERVICE_UNAVAILABLE` (response đã phát hành nhưng không khôi phục được — không phải replay). Cùng token + key khác → replay: thu hồi toàn bộ session của tài khoản + `401 TOKEN_REUSE_DETECTED`. Refresh token hết hạn, hoặc đã thu hồi vì `LOGOUT`/`LOGOUT_ALL`/`ADMIN_REVOKED` → `401 INVALID_REFRESH_TOKEN`; đã thu hồi vì `REUSE_DETECTED` → `401 TOKEN_REUSE_DETECTED`. Rate limit riêng: 30 lần/phút/IP + 10 lần/phút/tài khoản (xem mục 16).
**POST /api/v1/auth/admin/logout** — Header `Authorization: Bearer <access_token>` + body `{ refreshToken? }`; response `204`. Có `refreshToken` → chỉ thu hồi đúng session đó (`revoked_reason = LOGOUT`) + blacklist access token hiện tại; không có `refreshToken` → thu hồi toàn bộ session của tài khoản (`revoked_reason = LOGOUT_ALL`) + blacklist access token hiện tại. Access token bị blacklist tới khi hết hạn; mọi access token thuộc session đã logout đều hết hiệu lực (guard kiểm tra `sid` trỏ tới session đã thu hồi → `401 UNAUTHENTICATED`). Sau logout, refresh token cũ → `401 INVALID_REFRESH_TOKEN`. Redis lỗi khi kiểm tra blacklist → fail-closed `503 SERVICE_UNAVAILABLE` (token đã thu hồi không "sống lại" khi Redis lỗi).
**GET /api/v1/auth/admin/me** — Header `Authorization`; response `200`: `{ id, username, roles: [{ id, name }], permissions: ["products.view", ...] }` (danh sách permission đã gộp vai trò + ngoại lệ — dùng để frontend ẩn/hiện nút, FR-081).

## 12. Xử lý lỗi (Error handling)

- **Định dạng thống nhất (INT-007):** mọi lỗi trả `{ statusCode, message, error }`; lỗi validation thêm `details: [{ field, code, message }]`. Chi tiết từng lỗi (HTTP status, error code, ý nghĩa, ví dụ) xem `docs/api/API_ERROR_CATALOG.md` — tài liệu này chỉ ghi quy tắc chung.
- **Nhóm lỗi và HTTP status:**

| Nhóm | HTTP status | Ví dụ error code | Khi nào dùng |
| --- | --- | --- | --- |
| Validation | 400 | `VALIDATION_ERROR` | Input sai định dạng, thiếu trường bắt buộc, vi phạm ràng buộc nghiệp vụ kiểm tra được ngay |
| Authentication | 401 | `UNAUTHENTICATED`, `INVALID_CREDENTIALS`, `TOKEN_EXPIRED`, `INVALID_REFRESH_TOKEN` | Thiếu/sai/hết hạn token; sai tài khoản/mật khẩu |
| Authorization | 403 | `FORBIDDEN`, `LAST_SUPER_ADMIN` | Đã đăng nhập nhưng không có permission; thao tác bị chặn theo BR-007 |
| Not found | 404 | `PRODUCT_NOT_FOUND`, `ORDER_NOT_FOUND`, `CATEGORY_NOT_FOUND` | Resource không tồn tại (hoặc bị ẩn ở public — coi như không tồn tại) |
| Conflict / duplicate | 409 | `SKU_DUPLICATE`, `FITMENT_DUPLICATE`, `INVALID_STATUS_TRANSITION`, `ORDER_CANCELLED`, `CATEGORY_HAS_PRODUCTS`, `CART_CHANGED` | Trùng unique, chuyển trạng thái sai thứ tự, thao tác trên đơn đã hủy/giao |
| Precondition failed | 412 | `PRECONDITION_FAILED` | Header `If-Match` (etag) không khớp — dữ liệu đã bị sửa bởi người khác (mục 15) |
| Business rule violation | 422 | `PAYMENT_NOT_CONFIRMED`, `PRODUCT_UNAVAILABLE` | Vi phạm quy tắc nghiệp vụ không thuộc 4 nhóm trên (dùng 422, không dùng 400, để phân biệt lỗi validation input với lỗi quy tắc nghiệp vụ) |
| Locked | 423 | `ACCOUNT_LOCKED` | Tài khoản admin bị khóa tạm sau nhiều lần đăng nhập sai (kèm `retryAfter`) |
| Rate limit | 429 | `RATE_LIMITED` | Vượt giới hạn tần suất (kèm header `Retry-After`) |
| Payload / media | 413 / 415 | `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE` | Body quá 1 MB; sai Content-Type |
| Internal server error | 500 | `INTERNAL_ERROR` | Lỗi server không lường trước — message chung, không lộ chi tiết nội bộ; ghi log đầy đủ server-side |
| Service unavailable | 503 | `SERVICE_UNAVAILABLE` | Dependency (DB/Redis/Meilisearch) lỗi tạm thời — kèm `Retry-After` khi biết thời gian khôi phục |

- **Quy tắc message:** tiếng Việt thân thiện; không lộ stack trace, câu SQL, tên bảng/cột, secret; không phân biệt "tài khoản không tồn tại" với "sai mật khẩu" (FR-090); không phân biệt "mã đơn sai" với "đơn không tồn tại" (FR-058).
- **404 vs 400 cho `{id}` sai định dạng:** UUID sai định dạng → `400 VALIDATION_ERROR`; UUID đúng định dạng nhưng không tồn tại → `404` (xem mục 9).
- **Lỗi từ dependency:** Meilisearch lỗi → `/search` trả `503 SERVICE_UNAVAILABLE` (không fallback sang LIKE query trên PostgreSQL — tránh trả kết quả sai thứ tự ưu tiên ADR-010); Redis lỗi → website vẫn chạy, cache miss (NFR-004 — fallback, không lỗi 500); S3/R2 lỗi khi upload ảnh → `503` kèm message rõ.
- **Error code ổn định:** error code không đổi giữa các phiên bản minor; thêm error code mới thì ghi vào Error Catalog và CHANGELOG của API (xem mục 24).

## 13. Phân trang, lọc, sắp xếp

- **Phân trang (INT-007):** query `?page=<số trang, bắt đầu từ 1>&limit=<số item/trang>`; mặc định `page=1`, `limit=20`; `limit` tối đa 100 (vượt quá → clamp về 100, không lỗi); `page` vượt `totalPages` → trả `data: []` + `meta` đúng (không lỗi 404). Response danh sách luôn có `meta: { page, limit, total, totalPages }`.
- **Sắp xếp (INT-007):** query `?sort=<field>&order=asc|desc` hoặc `sort` dạng enum gộp (`newest`, `price_asc`, `price_desc`, `name_asc` — theo từng endpoint, xem mục 11); giá trị ngoài danh sách cho phép → `400 VALIDATION_ERROR`. Sắp xếp mặc định: danh sách sản phẩm `newest` (mới nhất trước); danh sách đơn `created_desc`; danh sách bài viết `newest`.
- **Lọc:** query param theo từng endpoint (xem mục 11); lọc kết hợp được nhiều điều kiện cùng lúc (AND — FR-008); giá trị lọc không hợp lệ (enum sai, khoảng giá ngược) → `400`.
- **Tìm kiếm trong danh sách:** param `q` ở `GET /products` chỉ tìm theo tên (đơn giản); tìm kiếm đầy đủ (mã + tên + thương hiệu, thứ tự ưu tiên ADR-010) dùng `GET /search` (xem mục 14).
- **Ổn định phân trang:** sắp xếp phải có tie-breaker ổn định (thêm `id` làm khóa phụ) để 2 trang liên tiếp không trùng/lặp item (FR-009).

## 14. Tìm kiếm (Search — Meilisearch, ADR-003/ADR-010)

- **Engine:** Meilisearch (INT-004); backend đồng bộ dữ liệu sang Meilisearch qua BullMQ khi sản phẩm/danh mục/thương hiệu thay đổi; API tìm kiếm đọc từ Meilisearch.
- **Thứ tự ưu tiên (BR-002):** SKU chính xác → OEM chính xác → mã nhà sản xuất → tên/thương hiệu → gần đúng. Cấu hình Meilisearch: trường mã có trọng số cao nhất và **typo tolerance = 0** cho trường mã; trường tên/thương hiệu cho phép typo tolerance giới hạn (1 ký tự cho từ dài). Xem chi tiết ở mục 11.5 (`GET /search`, `GET /search/suggest`, `GET /identifiers/lookup`).
- **Cache:** kết quả tìm kiếm cache Redis TTL 60–300s (FR-041); cập nhật sản phẩm → invalidate cache tìm kiếm (ADR-006).
- **Không có kết quả:** trả `data: []` + `suggestions` (FR-040), không trả 404.
- **Giới hạn:** `q` tối thiểu 2 ký tự, tối đa 100 ký tự; quá dài → `400`. Tìm kiếm không trả sản phẩm HIDDEN/soft delete.
- **Tìm kiếm theo xe:** khi có `vehicleApplicationId`, kết quả ưu tiên sản phẩm tương thích với xe đó (FR-039) — Meilisearch filter theo danh sách product id có fitment với xe (đồng bộ fitment vào index khi fitment đổi).

## 15. Idempotency và concurrency

- **Idempotency-Key (bắt buộc cho thao tác tạo đơn và thao tác tiền):** client gửi header `Idempotency-Key: <uuid>` khi gọi `POST /orders`, `POST /cart/items`, `POST /articles/{id}/seo/generate` (generate lại không tạo dữ liệu mới nhưng tránh gọi AI 2 lần — BR-014). Server lưu kết quả theo key trong 24h; gửi lại cùng key → trả lại đúng response lần đầu (cùng status code và body), không thực hiện lại thao tác. Key khác nhau → thao tác mới. Thiếu key ở `POST /orders` → `400 VALIDATION_ERROR` (bắt buộc vì tạo đơn là thao tác quan trọng nhất); thiếu key ở các endpoint khác → server tự sinh và xử lý như lần gọi đầu (không lỗi).
- **Retry sau `CART_CHANGED`:** giỏ đã đổi nội dung nên request gửi lại (kèm `confirmPriceChange: true`) PHẢI dùng `Idempotency-Key` mới — dùng lại key cũ sẽ trả lại đúng response lỗi 409 đã lưu theo quy tắc idempotency ở trên, không tạo đơn mới.
- **Trùng request tạo đơn:** 2 request tạo đơn từ cùng một giỏ (cùng `cartToken`, key khác nhau) → request thứ hai trả `409 DUPLICATE_ORDER` kèm `orderCode` của đơn đã tạo (không tạo đơn thứ hai, không trừ giỏ 2 lần).
- **Optimistic concurrency (cập nhật đồng thời):** `PATCH` các resource chính (products, orders status, roles permissions) hỗ trợ header `If-Match: <etag>` (etag = hash của `updatedAt` + version); etag không khớp → `412 PRECONDITION_FAILED` (client tải lại rồi sửa tiếp). Không bắt buộc ở P0 cho mọi PATCH — bắt buộc cho `PATCH /orders/{id}/status` và `PUT /roles/{id}/permissions` (2 thao tác dễ xung đột nhất); các PATCH khác: last-write-wins và ghi audit log (ghi rõ ai sửa sau).
- **Race khi đổi giá:** giá chốt tại thời điểm tạo đơn (BR-003); 2 admin đổi giá cùng lúc → last-write-wins + audit log; đơn đã tạo không bị ảnh hưởng.

## 16. Rate limiting

- **Giới hạn chung:** 100 request/phút/IP cho endpoint public (GET); 30 request/phút/IP cho endpoint public ghi (POST/PATCH/DELETE không auth). Vượt quá → `429 RATE_LIMITED` + header `Retry-After` (giây) + `X-RateLimit-Limit`/`X-RateLimit-Remaining`/`X-RateLimit-Reset`.
- **Giới hạn riêng (nghiêm ngặt hơn):**
  - `POST /auth/admin/login`: 5 lần/phút/IP + 10 lần/phút/tài khoản (FR-091).
  - `POST /auth/admin/refresh`: 30 lần/phút/IP + 10 lần/phút/tài khoản (M02-05, D-05 — refresh token là credential nên fail-closed như login).
  - `GET /orders/lookup`: 10 lần/phút/IP + 5 lần/phút/mã đơn (FR-058 — chống dò mã đơn).
  - `GET /search` và `GET /search/suggest`: 60 lần/phút/IP.
  - `POST /contact`: 5 lần/giờ/IP (chống spam form).
  - `POST /orders`: 10 lần/phút/cartToken (chống tạo đơn ồ ạt).
- **Admin đã đăng nhập:** 300 request/phút/tài khoản (cao hơn vì admin thao tác nhiều); vượt quá → `429` như trên.
- **Lưu trữ counter:** Redis (theo ADR-006); Redis lỗi → fail-open cho public GET (rate limit tạm thời tắt); fail-closed cho login/lookup — login và lookup vẫn giới hạn bằng bộ nhớ tạm của backend khi Redis lỗi, để không mở cửa dò mã/tài khoản — **và fail-closed cho contact (`POST /contact`, 5 lần/giờ/IP) + createOrder (`POST /orders`, 10 lần/phút/cartToken): quyết định đã chốt (Henry phê duyệt 27/11/2026, theo đề xuất của ChatGPT ở review M02-02 — FIX-04); hai nhóm này vẫn giới hạn bằng bộ nhớ tạm trong tiến trình khi Redis lỗi để chống spam form và tạo đơn ồ ạt; fallback bộ nhớ chỉ đúng trên một instance, không phải bảo đảm toàn hệ thống**. Fail-closed cho refresh (`POST /auth/admin/refresh`, 30 lần/phút/IP + 10 lần/phút/tài khoản — M02-05, D-05): cùng cơ chế fallback bộ nhớ trong tiến trình.
- **Kiểm tra blacklist access token (M02-05, D-06):** guard xác minh chữ ký + thời hạn JWT trước, sau đó kiểm tra blacklist Redis (SHA-256 của access token) trước khi chấp nhận request; token trong blacklist → `401 UNAUTHENTICATED`; Redis lỗi khi kiểm tra blacklist → fail-closed `503 SERVICE_UNAVAILABLE` + `Retry-After` (không bỏ qua blacklist rồi chấp nhận token đã logout).

## 17. Bảo mật (Security — tóm tắt; chi tiết xem API_SECURITY.md)

- **Security headers:** mọi response kèm `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy` (cho `/api/docs`), `Referrer-Policy: no-referrer`. Chi tiết xem `docs/api/API_SECURITY.md`.
- **Input sanitization:** mọi input chuỗi được sanitize/escape (NFR-007); chống SQL Injection (parameterized query qua Prisma — M02), XSS (escape output, không trả HTML thô từ input người dùng), CSRF (SameSite cookie + CSRF token cho thao tác admin qua cookie — M02 chốt cơ chế).
- **Không lộ thông tin nhạy cảm:** response không chứa mật khẩu/hash/token/secret (NFR-006); tra cứu đơn công khai không lộ SĐT đầy đủ, địa chỉ chi tiết, đơn của người khác (FR-058); lỗi không lộ stack trace/SQL (mục 12).
- **Không lưu thông tin thẻ thanh toán** (NFR-019 — P0 chỉ COD/chuyển khoản, không có trường thẻ nào trong API).
- **Secret:** không commit secret/API key (NFR-008 — chỉ commit `.env.example`); API key Meilisearch/S3 chỉ ở biến môi trường server-side, không bao giờ trả cho client.
- **Audit:** mọi thay đổi quyền, trạng thái đơn, fitment đều ghi audit log (mục 18).
- **CORS:** chỉ cho phép origin của frontend/admin (cấu hình theo môi trường, D-01); không dùng `*` cho endpoint có auth.

## 18. Logging và audit

- **Audit log (ghi vào database, xem được qua `GET /audit-logs`):** mọi thay đổi quyền (FR-084), thay đổi trạng thái đơn (FR-066), thay đổi fitment (FR-033), thay đổi thông tin giao hàng (FR-065), tạo/sửa/xóa sản phẩm/danh mục/thương hiệu/xe (M02 mở rộng audit cho các thao tác này — ghi chú: ERD M01-02 chỉ có `fitment_change_logs` riêng; audit log chung do M02 thiết kế bảng). Mỗi bản ghi: `actorId` (admin), `action`, `entityType`, `entityId`, `before`, `after` (JSON), `createdAt`, `ipAddress?`.
- **Application log (server-side, không qua API):** mọi request lỗi 5xx ghi log đầy đủ (request id, path, admin/user id nếu có, lỗi); request thành công ghi log ở mức info tóm tắt (không ghi body chứa thông tin cá nhân — SĐT, địa chỉ — vào log thường; khi cần debug thì log đã che).
- **Request id:** mọi response kèm header `X-Request-Id` (UUID) để truy vết log; client gửi lại `X-Request-Id` khi báo lỗi.
**Quy tắc chung:** không endpoint nào trong tài liệu này đưa phương án giả định (PROVISIONAL) vào OpenAPI như contract đã chốt — các endpoint PROVISIONAL trong `openapi.yaml` được đánh dấu `x-status: provisional` và `x-blocked-by: PD-XX/D-XX`; Test 2 kiểm tra không có PD Pending nào bị đánh dấu Approved (mục 23).

- **Không log:** mật khẩu, token, refresh token, SĐT đầy đủ, địa chỉ đầy đủ, nội dung chuyển khoản — các trường này bị che (`***`) nếu xuất hiện trong log.

## 19. Ma trận kịch bản (Scenario matrix — tóm tắt; chi tiết xem API_SCENARIOS.md)

`docs/api/API_SCENARIOS.md` đặc tả đầy đủ tối thiểu 15 kịch bản (Test 3, mục 23). Bảng dưới là ma trận tóm tắt — mỗi kịch bản map tới endpoint, kết quả kỳ vọng và FR liên quan:

| # | Kịch bản | Endpoint | Kết quả kỳ vọng | FR |
| --- | --- | --- | --- | --- |
| S-01 | Tìm phụ tùng theo hãng xe (chọn hãng → dòng → đời → danh sách) | `GET /vehicles/makes`, `/models`, `/generations`, `GET /vehicles/{make}/{model}` | Mỗi cấp chỉ hiện con của cấp cha; danh sách đúng xe | FR-021 → FR-025 |
| S-02 | Tìm phụ tùng theo loại (danh mục) + lọc kết hợp | `GET /categories/{slug}/products` | Kết quả thỏa tất cả điều kiện lọc | FR-007, FR-008 |
| S-03 | Tra cứu OEM chính xác | `GET /identifiers/lookup?type=OEM_NUMBER` | Trả đúng sản phẩm; OEM sai 1 ký tự → không trả như kết quả chính xác | FR-035, FR-036 |
| S-04 | Xem chi tiết + fitment | `GET /products/{id}`, `GET /products/{id}/fitments` | Đủ 4 loại mã có nhãn riêng; đủ danh sách xe | FR-042 → FR-044, FR-028 |
| S-05 | Fitment không tìm thấy (sản phẩm chưa có fitment) | `GET /products/{id}/fitments`, `GET /fitment/check` | `fitmentNotice: NO_FITMENT_INFO`, không đoán xe | FR-031 |
| S-06 | Sản phẩm không còn khả dụng (ẩn/xóa, hết hàng) | `GET /products/{id}`, `POST /cart/items` | Public: 404 thân thiện; giỏ: cảnh báo, checkout chặn | FR-048, FR-057 |
| S-07 | Đặt hàng hợp lệ (COD) | `POST /orders` | `201`, snapshot đúng, mã đơn không đoán được, giỏ xóa | FR-052 → FR-055 |
| S-08 | Đặt hàng không hợp lệ (giỏ trống, thiếu trường, sai phương thức) | `POST /orders` | `400` từng trường; giỏ trống → `400 EMPTY_CART` | FR-052, FR-053, FR-056 |
| S-09 | Đặt hàng trùng (gửi lại cùng Idempotency-Key / cùng giỏ) | `POST /orders` | Trả lại đơn đã tạo, không tạo đơn thứ hai | Mục 15 |
| S-10 | Admin cập nhật sản phẩm (đổi giá) | `PATCH /products/{id}` | Giá mới sau TTL; đơn đã đặt giữ giá cũ | FR-047, BR-003 |
| S-11 | Admin không đủ quyền | `POST /products` bằng tài khoản thiếu `products.create` | `403 FORBIDDEN` dù frontend đã ẩn nút | FR-086, BR-006 |
| S-12 | Thao tác đơn hàng (xác nhận, chuyển trạng thái, hủy) | `PATCH /orders/{id}/status`, `confirm-payment`, `cancel` | Đúng vòng đời; sai thứ tự → `409`; hủy ghi lý do + log | FR-062 → FR-066 |
| S-13 | Tra cứu đơn công khai (mã đúng / mã sai / dò mã) | `GET /orders/lookup` | Mã đúng → trạng thái; mã sai → 404 chung; dò liên tiếp → 429 | FR-058 |
| S-14 | Trường hợp biên từ Pending Decisions (OEM map nhiều sản phẩm; fitment ở mức Model+Year khi chưa có Generation) | `GET /identifiers/lookup`, `GET /vehicle-applications/{id}/products` | Trả đúng nhiều sản phẩm cho 1 OEM (PD-03); fitment Model+Year hoạt động khi Generation null (PD-01) | PD-01, PD-03 |
| S-15 | Phân trang biên (page vượt totalPages; limit > 100) | `GET /products?page=999&limit=500` | `data: []` + meta đúng; limit clamp 100, không lỗi | Mục 13, FR-009 |
| S-16 | Tra cứu chéo khách hàng (khách A tra đơn khách B) | `GET /orders/lookup` | Không có cách nào liệt kê đơn theo SĐT/tên; chỉ tra được khi biết đúng mã đơn | FR-058 |
| S-17 | Ranh giới quyền admin (đổi quyền xong mất quyền ngay) | `PUT /roles/{id}/permissions` rồi gọi API bị bỏ quyền | Mất quyền sau cache invalidate (TTL 300s) + audit log | FR-081, FR-084 |

## 20. Bảng truy vết (Traceability) — API ↔ PRD/SRS ↔ ERD

Mỗi endpoint P0 map tới FR (SRS), BR/INT/NFR liên quan và bảng ERD. P1 chỉ liệt kê catalogue, không map chi tiết.

| Nhóm API | Endpoint (đại diện) | FR (SRS) | BR / INT / NFR | Bảng ERD |
| --- | --- | --- | --- | --- |
| Homepage (ghép từ API có sẵn, không có endpoint riêng) | `GET /categories`, `GET /brands`, `GET /products?sort=newest`, `GET /articles` | FR-001 → FR-006 | NFR-001, NFR-011, NFR-012 | `categories`, `brands`, `products`, articles (M02) |
| Catalogue | `GET /products`, `GET /categories/{slug}/products`, `GET /brands/{slug}/products` | FR-007 → FR-012 | NFR-002, NFR-004, NFR-005 | `products`, `categories`, `brands`, `product_images`, `product_vehicle_fitments` |
| Category & Brand (admin) | `POST/PATCH/DELETE /categories`, `/brands` | FR-015 → FR-020 | BR-005 | `categories`, `brands`, `url_redirects` |
| Vehicle (admin + public) | `GET /vehicles/**`, `POST/PATCH/DELETE /vehicles/**`, `POST /vehicles/import`, `GET /vehicles/import/{importId}` | FR-021 → FR-026 | — | `vehicle_makes`, `vehicle_models`, `vehicle_generations`, `vehicle_variants`, `vehicle_applications` |
| Fitment | `GET /products/{id}/fitments`, `GET /fitment/check`, `POST/DELETE /products/{id}/fitments`, `GET /fitments/change-logs`, `POST /fitments/import`, `GET /fitments/import/{importId}` | FR-027 → FR-033 | BR-011 | `product_vehicle_fitments`, `vehicle_applications`, `fitment_change_logs` |
| Search | `GET /search`, `GET /search/suggest`, `GET /identifiers/lookup` | FR-034 → FR-041 | BR-002, NFR-003, INT-004 | `products`, `product_identifiers` (qua Meilisearch) |
| Product Detail | `GET /products/{productId}` | FR-042 → FR-049 | BR-001, BR-012, NFR-009, NFR-010 | `products`, `product_identifiers`, `product_images`, `product_specifications`, `product_vehicle_fitments` |
| Cart / Checkout | `GET/POST/PATCH/DELETE /cart`, `POST /orders` | FR-050 → FR-057 | BR-003, BR-009, D-08 | `orders`, `order_items`, `products` (giỏ: M02) |
| Order lookup (public) | `GET /orders/lookup` | FR-058 | D-09 | `orders`, `order_items` |
| Order Management (admin) | `GET /orders`, `PATCH /orders/{id}/status`, `confirm-payment`, `cancel`, `shipping` | FR-060 → FR-066 | BR-010, PD-08 | `orders`, `order_items` |
| CMS / SEO | `GET /articles`, `POST/PATCH/DELETE /articles`, `seo/generate`, `seo` (PATCH) | FR-067 → FR-074 | BR-004, BR-014, D-04 | articles (M01-05/M02) |
| Admin Dashboard | `GET /admin/dashboard/summary` | FR-075 → FR-078 | BR-013 | `orders`, `products`, articles |
| Dynamic RBAC | `GET/POST/PATCH/DELETE /roles`, `PUT /roles/{id}/permissions`, `/users/{id}/roles`, `/users/{id}/permissions`, `GET /audit-logs` | FR-080 → FR-086 | BR-006, BR-007, BR-008, NFR-007 | roles/permissions/users/audit (M01-05/M02) |
| Liên hệ | `POST /contact` | FR-088, FR-089 | — | contact (M01-04/M05) |
| Auth admin | `POST /auth/admin/login`, `refresh`, `logout`, `GET /auth/admin/me` | FR-090, FR-091 | NFR-006 | users (M02) |
| Redirect | `GET/POST/DELETE /redirects` | FR-018 | BR-005 | `url_redirects` |
| P1 — Customer | `POST /auth/customer/register`, `POST /auth/customer/login`, `GET /account/orders` (catalogue — xem mục 22) | FR-093, FR-094 | — | customers (P1) |
| P1 — Inventory | `PATCH /products/{id}/inventory` (catalogue — xem mục 22) | (AC-19 — chưa có FR riêng) | BR-012 | inventory (P1, M05) |
| P1 — Promotion/Wholesale/Analytics | xem mục 22 | FR-059, FR-079 | — | promotion/wholesale/analytics (P1) |

**Bao phủ FR P0:** mọi FR P0 (FR-001 → FR-092, trừ FR-013/FR-014 là P1) đều có ít nhất một endpoint map tới — kiểm chứng bằng script Test 2 (mục 23): script đối chiếu danh sách FR trong SRS với bảng truy vết này và báo FR P0 nào chưa được map.

## 21. Pending Decisions — ảnh hưởng tới API

### 21.1 Quyết định nghiệp vụ PRD (D-01 → D-09) — chủ sở hữu Henry

| # | Quyết định | Ảnh hưởng tới API |
| --- | --- | --- |
| D-01 | Tên miền chính thức | Base URL production; không hard-code domain (mục 4); không ảnh hưởng contract |
| D-02 | Nguồn dữ liệu phụ tùng | Không ảnh hưởng contract API (chỉ ảnh hưởng dữ liệu thật ở M03) |
| D-03 | Nguồn dữ liệu fitment | Không ảnh hưởng contract API (chỉ ảnh hưởng dữ liệu thật ở M04) |
| D-04 | Nhà cung cấp AI cho AI SEO + ngân sách | `POST /articles/{id}/seo/generate` — Lớp 2 BLOCKED_BY_D-04 (mục 11.6); Lớp 1 vẫn chạy |
| D-05 | Backend hosting (Railway/Render/VPS) | Không ảnh hưởng contract; ảnh hưởng deploy M02 |
| D-06 | Nhà cung cấp S3/R2 | URL ảnh tuyệt đối theo cấu hình (INT-005); không ảnh hưởng contract |
| D-07 | Font (Inter tự host hay font hệ thống) | Không ảnh hưởng API |
| D-08 | Quy trình checkout chi tiết | `POST /orders` — BLOCKED_BY_D-08 ở mức trường bắt buộc chi tiết (mục 11.3); khung tối thiểu đã chốt |
| D-09 | Phương thức xác minh bổ sung khi tra cứu đơn công khai | `GET /orders/lookup` — BLOCKED_BY_D-09 ở mức xác minh bổ sung (mục 11.3); hiện tại chỉ mã đơn + rate limit |

### 21.2 Quyết định thiết kế ERD (PD-01 → PD-09) — chủ sở hữu Henry

| # | Quyết định | Ảnh hưởng tới API | Thiết kế dự kiến trong tài liệu này (PROVISIONAL) |
| --- | --- | --- | --- |
| PD-01 | Mức chi tiết fitment tối thiểu khi nhập dữ liệu thật | `GET /vehicles/{make}/{model}`, `GET /vehicle-applications/{id}/products`, `GET /fitment/check` | Khuyến nghị: tối thiểu Model+Year; API chấp nhận Generation/Variant null (đã thiết kế như vậy); nếu Henry chốt mức cao hơn, endpoint lọc theo generation/variant đã có sẵn |
| PD-02 | Một hay nhiều SKU nội bộ cho một sản phẩm | `POST /products`, `GET /identifiers/lookup?type=SKU` | Khuyến nghị: một SKU (hiện tại: `products.sku` UNIQUE); nếu chốt nhiều SKU, `type=SKU` sẽ tra `product_identifiers` như các type khác — migration path đã ghi trong ERD |
| PD-03 | Một OEM number map nhiều sản phẩm | `GET /identifiers/lookup?type=OEM_NUMBER` | Khuyến nghị: cho phép (hiện tại: trả array nhiều sản phẩm); nếu chốt OEM unique toàn hệ thống, endpoint trả tối đa 1 sản phẩm — contract response dạng array không đổi |
| PD-04 | Manufacturer vs Brand là issuer riêng biệt | `POST /products/{id}/identifiers`, `GET /identifiers/lookup` | Khuyến nghị: hai FK riêng (hiện tại: `issuingMakeId` + `issuingBrandId` theo ma trận FIX-01); nếu chốt gộp, field issuer trong response đổi thành một field duy nhất — contract sẽ sửa ở Revision sau |
| PD-05 | Quy tắc xóa Product/Vehicle/Category có dữ liệu liên quan | `DELETE /products/{id}`, `/categories/{id}`, `/brands/{id}`, `/vehicles/**` | Khuyến nghị: RESTRICT + soft delete/hide (hiện tại: chặn xóa khi còn liên quan, trả `409`); nếu chốt khác (vd: cho xóa kèm cascade có xác nhận), endpoint DELETE sẽ thêm body `{ force: true }` — chưa đặc tả vì chưa chốt |
| PD-06 | Độ chi tiết năm (1900–2100, chỉ năm không tháng) | `POST /vehicles/generations`, `GET /vehicles/**` | Khuyến nghị: giữ (hiện tại: `yearFrom`/`yearTo` SMALLINT, CHECK 1900–2100) |
| PD-07 | Trường thông số kỹ thuật có cấu trúc hay key/value | `GET /products/{id}` (specifications), lọc theo thông số (P1) | Khuyến nghị: key/value đủ cho P1 (hiện tại: `specifications: [{ specKey, specValue }]`); nếu chốt trường có cấu trúc, response specifications đổi dạng — contract sẽ sửa ở milestone P1 |
| PD-08 | Vòng đời trạng thái đơn (tên trạng thái cuối) | `PATCH /orders/{id}/status`, `GET /orders`, `GET /admin/dashboard/summary` | Khung P0 đã chốt (PENDING → CONFIRMED → SHIPPING → COMPLETED + CANCELLED/REFUNDED); tên cuối do M05 chốt — endpoint đã thiết kế để đổi enum mà không đổi path |
| PD-09 | Trường nguồn/xác minh fitment (`source`, `verification_status`) | `POST /products/{id}/fitments`, `GET /products/{id}/fitments` | Khuyến nghị: không có ở P0 (hiện tại: không có 2 field này trong request/response); nếu chốt thêm, thêm field không bắt buộc vào 2 endpoint trên |

**Quy tắc chung:** không endpoint nào trong tài liệu này đưa phương án giả định (PROVISIONAL) vào OpenAPI như contract đã chốt — các endpoint PROVISIONAL trong `openapi.yaml` được đánh dấu `x-status: provisional` và `x-blocked-by: PD-XX/D-XX`; Test 2 kiểm tra không có PD Pending nào bị đánh dấu Approved (mục 23).

## 22. Mở rộng P1/P2 (không phải contract P0)

Các endpoint dưới đây chỉ ở mức catalogue (path + mục đích + FR mapping) để thiết kế P0 không chặn đường mở rộng (NFR-020). Full schema (request/response/validation/errors) thuộc milestone của module đó; không triển khai ở bản đầu.

### 22.1 P1 — Customer (FR-093, FR-094)

| Method + Path | Mục đích | FR |
| --- | --- | --- |
| `POST /api/v1/auth/customer/register` | Khách đăng ký tài khoản | FR-093 |
| `POST /api/v1/auth/customer/login` | Khách đăng nhập (JWT riêng, phân biệt với admin) | FR-093 |
| `POST /api/v1/auth/customer/logout` | Khách đăng xuất | FR-093 |
| `GET /api/v1/account` | Thông tin tài khoản khách + địa chỉ đã lưu | FR-093 |
| `GET /api/v1/account/addresses` | Danh sách địa chỉ giao hàng đã lưu | FR-093 |
| `POST /api/v1/account/addresses` | Thêm địa chỉ giao hàng | FR-093 |
| `GET /api/v1/account/orders` | Danh sách đơn của tài khoản đó (chỉ đơn của mình) | FR-094 |
| `GET /api/v1/account/orders/{orderId}` | Chi tiết một đơn của tài khoản đó | FR-094 |

### 22.2 P1 — Inventory, Promotion, Wholesale, Analytics, tích hợp (FR-059, FR-079, FR-013/FR-014, AC-19)

| Method + Path | Mục đích | FR |
| --- | --- | --- |
| `PATCH /api/v1/products/{productId}/inventory` | Cập nhật số lượng tồn kho (P1 — không có trường số lượng ở P0, BR-012) | AC-19 |
| `GET /api/v1/products?spec_<key>=<value>` | Lọc theo thông số kỹ thuật (P1) | FR-013 |
| `PUT /api/v1/categories/{slug}/products/order` | Admin đổi thứ tự hiển thị sản phẩm trong danh mục (P1) | FR-014 |
| `POST /api/v1/orders` (mở rộng) | Thêm phương thức VNPay/MoMo, mã giảm giá (P1 — không đổi path, thêm `paymentMethod` enum + `promoCode`) | FR-059 |
| `GET /api/v1/admin/analytics/revenue` | Biểu đồ doanh thu theo khoảng thời gian (P1) | FR-079 |
| `GET /api/v1/admin/analytics/best-sellers` | Sản phẩm bán chạy (P1) | FR-079 |
| `POST /api/v1/webhooks/payment/{provider}` | Webhook thanh toán VNPay/MoMo (P1 — INT-006) | FR-059, INT-006 |
| `POST /api/v1/webhooks/shipping/{provider}` | Webhook vận chuyển GHN/GHTK/Viettel Post (P1 — INT-006) | INT-006 |

### 22.3 P2 — Warranty, ERP (tương lai)

- Warranty: `GET /api/v1/products/{id}/warranty`, `POST /api/v1/warranty-claims` — chỉ ghi hướng mở rộng, không đặc tả.
- ERP: đồng bộ sản phẩm/đơn/tồn kho qua API riêng (`/api/v1/erp/...`) — chỉ ghi hướng mở rộng, không đặc tả.
- Không biến tính năng P2 thành yêu cầu bắt buộc P1 (cảnh báo brief M01-03).

## 23. Kiểm thử và xác minh (Test plan — thực hiện trước khi báo cáo)

Tài liệu này là tài liệu thiết kế — kiểm thử ở đây là kiểm thử **thiết kế/hợp đồng API**, không phải backend thật (chưa có backend). 5 test theo brief M01-03:

| Test | Cách làm | Pass khi |
| --- | --- | --- |
| Test 1 — OpenAPI validation | `npx @redocly/cli lint docs/api/openapi.yaml` (ghi rõ phiên bản) + parse bằng Python `yaml.safe_load` (kiểm tra OpenAPI 3.1.x, `$ref` hợp lệ, operationId duy nhất, schema đầy đủ, security schemes, HTTP status code hợp lệ) | Lint exit 0, không lỗi parse, không `$ref` gãy, operationId duy nhất |
| Test 2 — Cross-document consistency | Script Python `/tmp/m0103_check.py`: (a) mọi endpoint trong API_SPEC §10 có trong `openapi.yaml` và ngược lại; (b) mọi schema trong OpenAPI có field khớp Data Dictionary (tên bảng/cột tồn tại trong ERD); (c) mọi Requirement ID (FR/BR/INT/NFR) trong bảng truy vết mục 20 tồn tại trong PRD/SRS; (d) không endpoint nào tham chiếu entity không tồn tại trong ERD; (e) không PD Pending nào bị đánh dấu Approved (kiểm tra chuỗi `BLOCKED_BY_PD`/`PROVISIONAL` còn nguyên); (f) không có dữ liệu thật bị tự tạo (quét ví dụ: mọi ví dụ đều ghi "ví dụ minh họa" hoặc dùng giá trị rõ ràng là giả); (g) mọi FR P0 đều được map ít nhất một endpoint | Script báo ALL CHECKS PASS + số endpoint/schema/mapping đếm được |
| Test 3 — Scenario walkthrough | Đối chiếu từng kịch bản S-01 → S-17 trong `docs/api/API_SCENARIOS.md` với endpoint + error tương ứng trong API_SPEC và OpenAPI (kiểm tra bằng tay theo checklist trong file Scenarios, ghi kết quả từng kịch bản PASS/FAIL) | ≥ 15 kịch bản PASS, không kịch bản nào thiếu endpoint/error tương ứng |
| Test 4 — Repository integrity | `git diff --check`, `git status` (chỉ file được phép), `git diff --stat`, secret scan (grep `ghp_`, `github_pat_`, `sk-` trên file đã đổi) | diff --check sạch, secret scan không match, không có file Prisma schema/migration, không sửa tài liệu nguồn đã nghiệm thu (PRD/SRS/ERD/Data Dictionary/.mmd) |
| Test 5 — OpenAPI preview | Render bằng Redocly `build-docs` (ghi công cụ/phiên bản/kết quả thực tế): `npx @redocly/cli build-docs docs/api/openapi.yaml -o /tmp/m0103-openapi-preview.html`, mở HTML kiểm tra không lỗi parse, không thiếu endpoint, schema và authentication hiển thị đúng, examples đọc được | Preview render thành công, đủ endpoint, không lỗi; không báo PASS nếu chỉ nhìn file YAML |

**Kết quả thực tế (26/11/2026, bản đầu — IN_REVIEW):**
- **Test 1:** Redocly CLI 2.83.0 `lint` exit 0, 0 errors, 4 warnings — tất cả đã disposition: (1) `servers/0/url` trỏ localhost — chấp nhận, đây là dev server thật (ADR-003, backend port 3002); (2–4) `operation-4xx-response` cho `GET /categories`, `GET /brands`, `GET /vehicles/makes` — chấp nhận, 3 endpoint không tham số nên không thể trả 4xx (2 GET khác có thể 400 — `GET /cart`, `GET /articles` — đã bổ sung response 400). Strict parse Python (loader từ chối duplicate key — `yaml.safe_load` thường lặng lẽ ghi đè key trùng, đã từng che một lỗi) PASS: OpenAPI 3.1.0, 68 paths, 96 operations, 37 schemas, 96 operationId duy nhất, 16 mã HTTP (200, 201, 202, 204, 400, 401, 403, 404, 409, 412, 413, 415, 422, 423, 429, 503).
- **Test 2:** script `/tmp/m0103_check.py` — ALL CHECKS PASS (96 endpoint §10 khớp 96 operation OpenAPI; 61 admin + 35 public; 41 $ref đều resolve; 121 requirement ID trong §20 đều tồn tại trong PRD/SRS; 9/9 PD được tham chiếu, không PD nào bị tự quyết; 176 field schema đối chiếu Data Dictionary — 29 field API-only đã review: nested object, tên hiển thị join, aggregate, bảng M02; 88/88 FR P0 đều được map). Không có dữ liệu thật bị tự tạo: không xuất hiện domain `seecarauto.com` (D-01 chưa chốt) trong tài liệu API; ví dụ dùng giá trị dạng thật minh họa (Aisin, Toyota, mã OEM dạng 16100-0Y010) theo quy ước "ví dụ minh họa" ở đầu tài liệu — không phải catalogue/giá/tồn kho thật của SeeCar Auto.
- **Test 3:** 17/17 kịch bản S-01 → S-17 PASS (23 endpoint tham chiếu đều có trong OpenAPI; mã lỗi đều có trong Error Catalog). Hai lỗi thiết kế phát hiện qua walkthrough đã sửa ngay trong bản đầu: bổ sung `GET /vehicles/import/{importId}` + `GET /fitments/import/{importId}` (theo dõi import bất đồng bộ) và sửa `x-required-permission` của logout/me từ null thành `*`.
- **Test 4:** `git diff --check` sạch; chỉ thêm file mới (`docs/api/`, `tasks/M01-03.md`) + cập nhật Handbook; không Prisma schema/migration; không sửa PRD/SRS/ERD/Data Dictionary/.mmd; secret scan (grep `ghp_`, `github_pat_`, `sk-`) không match.
- **Test 5:** Redocly `build-docs` (2.83.0) render thành công `/tmp/m0103-openapi-preview.html` (428 KiB, 882ms); kiểm tra HTML: 96/96 operationId hiển thị, title "SeeCar Auto API", AdminAuth scheme hiển thị.

**Lưu ý honest về Test 5:** Redocly `build-docs` render tĩnh không cần trình duyệt — nếu môi trường không chạy được (mạng/proxy), fallback là kiểm tra bằng `redocly lint` + đọc YAML trực tiếp và ghi rõ phương pháp thực tế đã dùng; không báo cáo preview PASS khi chưa render thật.

**Kết quả thực tế (26/11/2026, Revision 02 — IN_REVIEW):**
- **Test 1:** Redocly CLI 2.83.0 `lint` exit 0, 0 errors, 4 warnings — cùng 4 warnings như bản đầu (1 `no-server-example.com` cho URL localhost + 3 `operation-4xx-response` cho GET /categories, GET /brands, GET /vehicles/makes), đã disposition như trước. Strict parse Python (loader từ chối duplicate key) PASS: OpenAPI 3.1.0, 68 paths, 96 operations, 37 schemas, 96 operationId duy nhất, 30 operation P0-PROVISIONAL (66 P0), 16 mã HTTP như cũ (200, 201, 202, 204, 400, 401, 403, 404, 409, 412, 413, 415, 422, 423, 429, 503).
- **Test 2:** script `/tmp/m0103_check2.py` (viết lại vì file kiểm tra cũ ở /tmp đã mất; thêm 2 nhóm kiểm tra mới theo yêu cầu review: nhất quán HTTP status của error code và đánh dấu provisional cho PD) — ALL CHECKS PASS: 96 endpoint §10 khớp 96 operation OpenAPI (66 P0 + 30 P0-PROVISIONAL, trạng thái §10 khớp x-status OpenAPI); 14 endpoint phụ thuộc PD-02/03/04/05/06 đã đánh dấu provisional ở cả §10 và OpenAPI (kèm x-blocked-by); If-Match required: true ở cả 2 operation; Error Catalog 44 mã lỗi duy nhất, 11 nhóm, mọi `NNN CODE` trong API_SPEC/Scenarios khớp status trong Catalog; 37 $ref schema đều resolve; 97 requirement ID §20 tồn tại trong PRD/SRS; 9/9 PD tham chiếu, không PD nào bị tự quyết; 135 field schema đối chiếu Data Dictionary — 84 field API-only đã review (envelope, phân trang, auth, SEO, aggregate dashboard, tên hiển thị join, cart state, bank transfer, audit, tree); 88/88 FR P0 map, 6/6 FR P1 liệt kê ở §22. Script phát hiện thêm 1 lỗi thật ngoài danh sách ChatGPT giao: API_SPEC mục 11.6 ghi `409 LAST_SUPER_ADMIN` / `409 LAST_SUPER_ADMIN_ROLE`, trong khi Error Catalog và mục 12 ghi 403 — đã sửa về 403.
- **Test 3:** 17/17 kịch bản S-01 → S-17 PASS (23 endpoint tham chiếu đều có trong OpenAPI; mã lỗi đều có trong Error Catalog). Kịch bản đã sửa ở Revision 02: S-03, S-14 (ghi rõ OEM nhiều-sản-phẩm là thiết kế dự kiến, chưa được Henry duyệt), S-12 (PAYMENT_NOT_CONFIRMED 409 → 422).
- **Test 4:** `git diff --check` sạch; chỉ sửa 8 file cho phép (4 file docs/api + 4 file Handbook); không Prisma schema/migration; không sửa PRD/SRS/ERD/Data Dictionary/.mmd; secret scan (grep `ghp_`, `github_pat_`, `sk-`) không match.
- **Test 5:** Redocly `build-docs` (2.83.0) render thành công `/tmp/m0103-openapi-preview.html` (430 KiB, 428ms); kiểm tra HTML: 96/96 operationId hiển thị, title "SeeCar Auto API", AdminAuth scheme hiển thị.

## 24. Ghi chú triển khai, ngoài phạm vi và lịch sử sửa đổi

### 24.1 Ghi chú cho M02 (triển khai)

1. **Thứ tự triển khai gợi ý (không bắt buộc):** auth admin → catalogue public (products/categories/brands/vehicles) → search + identifiers lookup → fitment → cart → orders → admin CRUD → articles/SEO → RBAC → dashboard/redirects. Lý do: catalogue là nền cho mọi luồng khác.
2. **Swagger `/api/docs` (INT-003):** phục vụ từ `docs/api/openapi.yaml` — M02 giữ file này đồng bộ với code thật (code-first hay spec-first do M02 chốt; nếu code-first thì regenerate YAML từ code và đối chiếu lại với tài liệu này trước khi coi là xong).
3. **Cache (ADR-006, NFR-004/NFR-005):** key namespace `seecarauto:<module>:<entity>:<id>`; TTL theo SRS NFR-005 (danh mục 3600, thương hiệu 21600, thông tin sản phẩm 900, danh sách sản phẩm 300–900, hãng xe/dòng xe 86400, kết quả tìm kiếm 60–300, SEO metadata 3600, cấu hình website 3600, quyền người dùng 300, tồn kho 30–60); invalidate khi admin cập nhật; chống cache stampede; fallback khi Redis lỗi; không cache thông tin nhạy cảm.
4. **Meilisearch index:** đồng bộ qua BullMQ khi sản phẩm/danh mục/thương hiệu/fitment thay đổi (INT-004); index chứa: tên, slug, SKU, normalizedValue các loại mã, brand, category, danh sách vehicleApplicationId (để lọc theo xe).
5. **Mã đơn:** thuật toán sinh `orderCode` do M02 chốt (yêu cầu: không đoán được, không liên tục, có checksum để phát hiện gõ sai — xem mục 11.3).
6. **Giỏ hàng:** M02 quyết định bảng lưu trữ (xem mục 11.1); nếu chọn Redis thì TTL 30 ngày; Redis lỗi → 503, không trả giỏ rỗng giả (quyết định Henry phê duyệt 27/11/2026 — FIX-04).
7. **Ngưỡng chưa chốt (do M02/M03/M05 đo và chốt, không bịa số ở đây):** ngưỡng khóa tài khoản admin sau đăng nhập sai (FR-091); ngưỡng mili-giây API danh sách/tìm kiếm (NFR-002); số lượng cụ thể cho rate limit có thể điều chỉnh theo đo thực tế (mục 16 là giá trị khởi điểm).
8. **Docker/CI:** N/A cho task chỉ tài liệu — không claim runtime verification (brief M01-03, mục 9 báo cáo). `docker compose up` vẫn UNVERIFIED trên máy dev của Muse (xem DOCKER_STANDARDS mục 5).

### 24.2 Ngoài phạm vi (nhắc lại từ mục 1.3)

Không triển khai backend/frontend thật; không Prisma schema/migration; không thay đổi PostgreSQL; không seed data; không sửa PRD/SRS/ERD đã nghiệm thu; không tự chốt D-01 → D-09 / PD-01 → PD-09.

### 24.3 Lịch sử sửa đổi (Revision history)

| Ngày | Phiên bản | Thay đổi |
| --- | --- | --- |
| 26/11/2026 | 0.1 (IN_REVIEW) | Bản đầu M01-03: API_SPEC.md 24 mục (96 endpoint: 80 P0 + 16 P0-PROVISIONAL), openapi.yaml (OpenAPI 3.1.0, 68 paths, 96 operations), Error Catalog, Scenarios S-01 → S-17, Security, Task Brief M01-03 — đã báo cáo ChatGPT review ngày 26/11/2026 (chat mới của project) |
| 26/11/2026 | 0.2 (IN_REVIEW) | Revision 02 theo review ChatGPT 26/11/2026 ~14:38 (11/15 PASS; FAIL AC-10, AC-13, AC-14, AC-15): đồng bộ HTTP status — PAYMENT_NOT_CONFIRMED 409 → 422, PRODUCT_UNAVAILABLE 409 → 422, PRECONDITION_FAILED chuyển sang nhóm 412, ACCOUNT_LOCKED chuyển sang nhóm 423, bỏ dòng mập mờ 400/409 của INVALID_STATUS_TRANSITION, SKU_DUPLICATE/CART_CHANGED chuyển sang nhóm Conflict 409 (Error Catalog nay 11 nhóm, 44 mã lỗi); If-Match bắt buộc ở PATCH /orders/{id}/status và PUT /roles/{id}/permissions; đánh dấu P0-PROVISIONAL cho 14 endpoint phụ thuộc PD-02/03/04/05/06 (tổng 30 P0-PROVISIONAL, 66 P0); S-03/S-14 ghi rõ OEM nhiều-sản-phẩm là thiết kế dự kiến; CURRENT_STATE cập nhật (M01-03 IN_REVIEW, M01-04 chưa bắt đầu). |
| 28/11/2026 | 0.3 (IN_REVIEW) | Bổ sung mã lỗi `409 ROLE_NAME_DUPLICATE` (Error Catalog §5) theo quyết định RB-03 của M02-06 Revision 02 (ChatGPT 28/11/2026): tên role trùng khi `POST /roles` / `PATCH /roles/{roleId}` → 409. Cùng quyết định: userId không tồn tại → `404 NOT_FOUND` (đã có trong Catalog, không thêm mã mới); permission code không hợp lệ → `400 VALIDATION_ERROR`, chi tiết `UNKNOWN_PERMISSION`. Error Catalog nay 11 nhóm, 45 mã lỗi. |
