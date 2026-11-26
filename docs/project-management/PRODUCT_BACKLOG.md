# PRODUCT BACKLOG — SEECARAUTO (M00–M09)

Backlog toàn bộ task theo mã task, mục tiêu, phạm vi, priority,
dependency và trạng thái hiện tại. Nguồn: `MASTER_ROADMAP.md` +
tài liệu đã nghiệm thu (PRD/SRS, ERD, API Specification, Sitemap/
Wireframe, Admin Dashboard, UI/UX Research).

## 1. Tổng quan và vấn đề mở

| Chỉ số | Giá trị |
| --- | --- |
| Tổng số mã task trong backlog này | **89** |
| M00 | 7 — DONE 7/7 |
| M01 | 7 — DONE 7/7 |
| M02 | 8 — IN_PROGRESS 1/8, BACKLOG 7/8 |
| M03 | 10 — BACKLOG 10/10 |
| M04 | 9 — BACKLOG 9/9 |
| M05 | 10 — BACKLOG 10/10 |
| M06 | 9 — BACKLOG 9/9 |
| M07 | 10 — BACKLOG 9/10, BLOCKED 1/10 (M07-05) |
| M08 | 9 — BACKLOG 9/9 |
| M09 | 10 — BACKLOG 10/10 |
| DONE | 14 (M00 7 + M01 7) |
| IN_PROGRESS | 1 (M02-01) |
| BACKLOG | 73 |
| BLOCKED | 1 (M07-05) |

### ISSUE-01 — Mâu thuẫn tổng số task: 87 hay 89? — ĐÃ QUYẾT ĐỊNH (89)

- `MASTER_ROADMAP.md` tiêu đề ghi "Tổng: **87 task**" và cuối
  `TASK_BOARD.md` ghi "Tổng: 87 task (M00: 7, M01: 7, M02: 8, M03: 10,
  M04: 9, M05: 10, M06: 9, M07: 10, M08: 9, M09: 10)" — nhưng cộng các
  số trong ngoặc: 7+7+8+10+9+10+9+10+9+10 = **89**, không phải 87.
- **Quyết định của ChatGPT ngày 26/11/2026 (review M01-07 bản đầu):
  tổng là 89 — phương án (a): sửa tổng thành 89, không gộp hoặc loại
  bỏ task.** Lý do: số lượng task từng milestone đã liệt kê cụ thể;
  không có căn cứ nghiệp vụ để gộp/bỏ 2 task.
- MASTER_ROADMAP.md và TASK_BOARD.md đã sửa 87 → 89 trong Revision
  02 của M01-07 (xem `tasks/M01-07.md` §10 v0.2). Backlog này liệt kê
  **89 mã task** theo đúng số task từng milestone trong roadmap.

### Phân rã task M02–M09 là đề xuất của M01-07

MASTER_ROADMAP chỉ cho tên milestone + số task, không liệt kê từng
task con M02–M09. Mỗi task con dưới đây được suy ra từ đúng cụm từ
trong mô tả milestone của roadmap + tài liệu đã nghiệm thu. ChatGPT
review có thể yêu cầu gộp/tách/đổi tên.

### Định nghĩa priority

- **Critical** — Nằm trên đường doanh thu (tìm món → fitment → đặt
  hàng → thanh toán) hoặc chặn nhiều task khác; không có thì không bán
  được hàng.
- **High** — Cần cho vận hành (admin/RBAC/CMS/auth) hoặc quyết định
  trải nghiệm và độ tin cậy; trì hoãn được nhưng không bỏ được.
- **Medium** — Tối ưu/polish (SEO kỹ thuật, performance, QA, tính
  năng P1); làm sau khi luồng chính chạy.

### Định nghĩa trạng thái

`DONE` / `IN_PROGRESS` / `IN_REVIEW` / `BACKLOG` / `BLOCKED`.
BLOCKED = không thể bắt đầu cho tới khi quyết định chặn được chốt
(kèm mã quyết định). BACKLOG kèm dependency = làm được sau khi
dependency xong (hoặc song song nếu dependency chỉ là quyết định
chưa chốt nhưng không chặn thiết kế).

### Các gap đã biết từ tài liệu nghiệm thu (không tự lấp)

- **G-01:** ERD (M01-02) CÓ bảng `vehicle_variants` cho biến thể xe
  (§4.11), nhưng CHƯA CÓ bảng `product_variants` cho biến thể sản
  phẩm dù roadmap M03 liệt kê "variants" — đường mở rộng là bảng
  `product_variants` FK tới `products.id`, mỗi variant có SKU riêng
  (ERD §3.1, dòng "SKU mở rộng nhiều biến thể?"), và đây là quyết
  định nghiệp vụ PD-02 (1 SKU/sản phẩm hay nhiều SKU). M03-06 cần
  quyết định schema ở M02.
- **G-02:** ERD không có bảng `articles` dù M07 cần CMS — M07-01 cần
  quyết định schema ở M02.
- **G-03:** ERD không có bảng cart — M05-01 cần quyết định nơi lưu
  cart ở M02 (API_SPEC §10 đã ghi PROVISIONAL).
- **G-04:** ERD không có bảng admin (users/roles/permissions) —
  M02-01/M06-01 cần tạo ở M02 (M01-05 đã ghi rõ).
- **G-05 (ĐÃ CÓ QUYẾT ĐỊNH — ChatGPT, review Revision 04, ngày
  26/11/2026):** UI_PROPOSAL §7.3 giao M02 cài Tailwind config +
  tokens (màu/chữ/spacing) vào `@seecarauto/ui` + font theo D-07,
  nhưng phân rã M02 trong backlog (theo đúng wording roadmap M02 —
  chỉ infra/auth: schema, Redis, Meilisearch, S3/R2, Auth, RBAC,
  CI/CD, môi trường) không có task nào bao việc này. ChatGPT quyết
  định: KHÔNG thêm task mới (giữ tổng 89); giao nền tảng UI dùng
  chung cho **M03-01** (task CRUD admin đầu tiên nhóm Catalog).
  M03-01 cài Tailwind config + tokens M01-06 vào `@seecarauto/ui`
  (package đã có từ M00 — Button/Modal/Toast/Tooltip, chưa có
  Input), dựng các primitive Button/Input/Modal/Toast/Tooltip, dùng
  system font fallback cho tới khi D-07 được Henry quyết (không tự
  quyết font, không đổi màu/typography/tokens M01-06). Thứ tự:
  M03-01 dựng nền tảng TRƯỚC, sau đó mới triển khai UI CRUD; M03-02
  chỉ dùng tokens/components sau khi nền tảng sẵn sàng (phần
  backend/API không phụ thuộc nền tảng vẫn chuẩn bị được); M03-09
  cũng dùng nền tảng này (ngoài G-05 vẫn chờ M03-08 + D-07).

## 2. M00 — Project Foundation & Engineering Standards (tuần 1) — DONE 7/7

| Task | Tên | Mục tiêu / Phạm vi | Priority | Phụ thuộc | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| M00-01 | Initialize monorepo | Khởi tạo `seecarauto/` (frontend, admin, backend, packages, infrastructure, docs) | Critical | — | DONE |
| M00-02 | Setup pnpm workspace, Turborepo và package.json | `pnpm-workspace.yaml`, `turbo.json`; workspace chạy được | Critical | M00-01 | DONE |
| M00-03 | Setup TypeScript và code conventions | `tsconfig.base.json`, ESLint + Prettier | High | M00-01 | DONE |
| M00-04 | Setup Git và branch conventions | `.gitignore`, branch rules (main/develop/feature) | High | M00-01 | DONE |
| M00-05 | Tạo tài liệu README và project documentation | `docs/`, `README.md` | Medium | M00-01 | DONE |
| M00-06 | Setup Docker và docker-compose | Dockerfile ×3, `docker-compose.yml` (6 services); runtime UNVERIFIED trên máy Muse — chỉ validate config | Critical | M00-01 | DONE |
| M00-07 | Tạo Project Handbook | `docs/project-management/` + `TASK_BOARD.md` | High | M00-01 | DONE |

## 3. M01 — Architecture & UI/UX (tuần 2–3) — DONE 7/7

| Task | Tên | Mục tiêu / Phạm vi | Priority | Phụ thuộc | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| M01-01 | PRD / SRS | PRD + SRS (94 FR, 20 NFR, 16 BR, 7 INT, AC-01 → AC-19); D-01 → D-09 giữ Pending | Critical | — | DONE |
| M01-02 | ERD chi tiết | ERD 17 bảng / 131 cột (Product, SKU, OEM, Vehicle Fitment); PD-01 → PD-09 giữ Pending | Critical | M01-01 | DONE |
| M01-03 | API Specification | OpenAPI 3.1.0: 68 paths, 96 operations, 37 schemas; Error Catalog 11 nhóm/44 mã; 66 P0 + 30 P0-PROVISIONAL | Critical | M01-01, M01-02 | DONE |
| M01-04 | Sitemap và Wireframe | Sitemap 19 mục; 13 mẫu wireframe (Desktop + Mobile); 15 luồng F-01 → F-15; D-08/D-09 chỉ đề xuất | High | M01-01, M01-03 | DONE |
| M01-05 | Cấu trúc Admin Dashboard | Admin sitemap 30 mục; navigation 7 nhóm/14 mục; RBAC Matrix 13 module × 7 hành động; 12 mẫu wireframe | High | M01-01, M01-02, M01-03 | DONE |
| M01-06 | Nghiên cứu mẫu UI/UX và đề xuất phương án | Nghiên cứu 5 website thật; Design System (màu/chữ/spacing/component); đề xuất Tailwind + shadcn/ui; D-07 chỉ là đề xuất | High | M01-01, M01-04, M01-05 | DONE |
| M01-07 | Backlog và chia Sprint | Backlog 89 mã task + Sprint plan 10 Sprint × 2 tuần (tuần 1–20) | High | M01-01 → M01-06 | DONE |

## 4. M02 — Infrastructure & Authentication (tuần 3–5) — BACKLOG 8/8

| Task | Tên | Mục tiêu / Phạm vi | Priority | Phụ thuộc | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| M02-01 | PostgreSQL + Prisma schema | Schema Prisma từ ERD (17 bảng); migration; G-02 Articles/ArticleSEO + G-04 Admin/RBAC; G-01 đóng theo PD-02; G-03 Redis cart decision | Critical | M01-02 | IN_PROGRESS |
| M02-02 | Redis cache + BullMQ | Redis cache (theo API_SPEC §41) + BullMQ cho job nền | High | M02-01 | BACKLOG |
| M02-03 | Meilisearch | Cài Meilisearch; index products (SKU/OEM/tên/thương hiệu); cấu hình tìm kiếm theo ADR-010 | Critical | M02-01 | BACKLOG |
| M02-04 | S3 / R2 object storage | Lưu ảnh sản phẩm/bài viết; URL tuyệt đối (theo quy tắc đã chốt ở M01-06) | High | D-06 | BACKLOG |
| M02-05 | Auth JWT + Refresh Token | Đăng nhập admin (FR-090/FR-091 lockout); JWT + refresh; HttpOnly cookie | Critical | M02-01 | BACKLOG |
| M02-06 | RBAC nền tảng | Bảng roles/permissions/role_permissions/user_roles/user_permissions; middleware kiểm tra permission; audit log nền | Critical | M02-01, M02-05; M01-05 | BACKLOG |
| M02-07 | CI/CD | GitHub Actions: typecheck/lint/test/build trên mỗi push; nối tiếp CI đã có từ M00 | High | M00-06; D-05 | BACKLOG |
| M02-08 | Môi trường Dev → Staging → Production + backup | Môi trường 3 tầng; backup tự động + quy trình restore (NFR-015) | High | M02-07; D-05 | BACKLOG |

## 5. M03 — Product Catalog & Search (tuần 5–8) — BACKLOG 10/10

| Task | Tên | Mục tiêu / Phạm vi | Priority | Phụ thuộc | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| M03-01 | Products CRUD (admin) | CRUD sản phẩm (FR-042; status DRAFT/PUBLISHED/HIDDEN; soft delete) + NỀN TẢNG UI DÙNG CHUNG (G-05, quyết định ChatGPT 26/11/2026): cài Tailwind config + tokens M01-06 vào @seecarauto/ui (package đã có từ M00), dựng primitive Button/Input/Modal/Toast/Tooltip (system font fallback, chưa chốt D-07) — dựng nền tảng TRƯỚC, sau đó mới triển khai UI CRUD | Critical | M02-01, M02-05, M02-06; M01-06 (tokens/design system cho nền tảng UI) | BACKLOG |
| M03-02 | Categories + brands | CRUD danh mục (FR-015) + thương hiệu (FR-016); slug/redirect/delete (FR-017 → FR-020); phần UI dùng nền tảng M03-01 (G-05 — chỉ dùng tokens/components sau khi nền tảng sẵn sàng; phần backend/API không phụ thuộc nền tảng vẫn chuẩn bị được) | Critical | M02-01; M03-01 (nền tảng UI — phần UI) | BACKLOG |
| M03-03 | SKU + product_identifiers (OEM codes) | 1 SKU nội bộ/sản phẩm (PD-02) + 4 loại mã khác (PART/OEM/Manufacturer/Alternate); chuẩn hóa + tìm chính xác, không fuzzy mạnh trên OEM (FR-035/FR-036) | Critical | M02-01; PD-02, PD-03, PD-04 | BACKLOG |
| M03-04 | Product images | Upload/sắp xếp/xóa ảnh sản phẩm (qua M02-04); ảnh chính + thứ tự hiển thị | High | M02-04, M03-01 | BACKLOG |
| M03-05 | Product specifications | Trường spec key/value (P1, PD-07); bộ lọc theo spec (FR-013 P1) | Medium | M02-01; PD-07 | BACKLOG |
| M03-06 | Variants | Biến thể sản phẩm theo roadmap M03 ("variants") — G-01: ERD có vehicle_variants nhưng chưa có product_variants, cần quyết định schema ở M02 (liên quan PD-02) | Medium | M02-01; G-01; PD-02 | BACKLOG |
| M03-07 | Import/Export Excel (products) | Import Excel sản phẩm + xuất Excel; validate mã trùng | High | M03-01; D-02 | BACKLOG |
| M03-08 | Search API (Meilisearch, ADR-010) | Tìm theo SKU/OEM/tên/thương hiệu (FR-034 → FR-041); thứ tự ưu tiên ADR-010; cache Redis | Critical | M02-03, M03-01, M03-03 | BACKLOG |
| M03-09 | Search UI | Ô tìm kiếm header + autocomplete (FR-037) + bộ lọc (FR-038) + không có kết quả (FR-040); kết hợp xe đã chọn (FR-039); dùng nền tảng UI M03-01 (G-05) | Critical | M03-08; M01-06; D-07; M03-01 (nền tảng UI, G-05) | BACKLOG |
| M03-10 | Reverse lookup (part → vehicles) | Tra cứu ngược: từ phụ tùng ra danh sách xe tương thích (FR-030) | High | M03-01, M04-05 | BACKLOG |

## 6. M04 — Vehicle & Fitment (tuần 7–10) — BACKLOG 9/9

| Task | Tên | Mục tiêu / Phạm vi | Priority | Phụ thuộc | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| M04-01 | Vehicle makes | CRUD hãng xe (FR-021) | Critical | M02-01 | BACKLOG |
| M04-02 | Vehicle models + generations | CRUD dòng xe + đời xe (FR-022) | Critical | M04-01 | BACKLOG |
| M04-03 | Vehicle variants + engines | Biến thể + động cơ (FR-022) | High | M04-02 | BACKLOG |
| M04-04 | vehicle_applications | Bảng đích fitment thống nhất (make/model bắt buộc; generation/variant/year nullable; UNIQUE NULLS NOT DISTINCT) | Critical | M02-01, M04-01; PD-01 | BACKLOG |
| M04-05 | product_vehicle_fitments + change log | Gắn/gỡ fitment (FR-027); log thay đổi (FR-033); không cột source/verification ở P0 (PD-09) | Critical | M03-01, M04-04; PD-09 | BACKLOG |
| M04-06 | Import Fitment Excel | Import Excel fitment (FR-032) | High | M04-05; D-03 | BACKLOG |
| M04-07 | Vehicle selector UI | Bộ chọn hãng → dòng → đời (FR-024); xe được nhớ trong session (FR-025); trang xe (FR-023) | Critical | M04-01, M04-02; M01-04 | BACKLOG |
| M04-08 | Fitment display + warnings (detail page) | Danh sách xe tương thích (FR-028); cảnh báo không tương thích (FR-029); thông báo khi chưa có dữ liệu fitment (FR-031) | Critical | M04-05, M03-01 | BACKLOG |
| M04-09 | Vehicle pages + fitment search | Trang hãng/dòng xe; tìm phụ tùng theo xe đã chọn (FR-008, FR-039) | High | M04-01, M04-05; M01-04 | BACKLOG |

## 7. M05 — E-commerce & Order Management (tuần 9–12) — BACKLOG 10/10

| Task | Tên | Mục tiêu / Phạm vi | Priority | Phụ thuộc | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| M05-01 | Cart (server-side session) | Giỏ hàng theo session (HttpOnly cookie token); G-03: ERD chưa có bảng cart — quyết định nơi lưu ở M02 | Critical | M03-01; M02-01; G-03 | BACKLOG |
| M05-02 | Checkout flow (guest, D-08) | Checkout khách vãng lai (FR-092); trường bắt buộc theo đề xuất M01-04; chỉ COD + chuyển khoản ở P0 | Critical | M05-01; D-08 | BACKLOG |
| M05-03 | Orders + snapshot | Tạo đơn + snapshot tên/SKU/giá/số lượng lúc đặt (FR-054); mã đơn không đoán được (FR-058) | Critical | M05-02, M02-01 | BACKLOG |
| M05-04 | Order management (admin) | Quản lý đơn (FR-060 → FR-066); vòng đời trạng thái đơn — tên trạng thái là PROVISIONAL chờ PD-08 | Critical | M05-03; PD-08 | BACKLOG |
| M05-05 | Public order lookup | Tra cứu đơn công khai (FR-058); chỉ trả 7 trường an toàn; bước xác minh bổ sung chờ D-09 | High | M05-03; D-09 | BACKLOG |
| M05-06 | Payments — COD | Thanh toán COD (FR-053) | Critical | M05-03 | BACKLOG |
| M05-07 | Payments — bank transfer | Chuyển khoản + xác nhận thủ công (FR-063) | Critical | M05-03 | BACKLOG |
| M05-08 | Shipments | Khu vực giao hàng + phí ship (theo địa chỉ tỉnh/huyện) | High | M05-02 | BACKLOG |
| M05-09 | Inventory (stock status; P1 quantity) | Hiển thị trạng thái kho P0 (IN_STOCK/OUT_OF_STOCK, FR-011); số lượng tồn là P1 (BR-012/AC-19) | High | M03-01 | BACKLOG |
| M05-10 | Promotions (P1) | Khuyến mãi (FR-059, P1) | Medium | M05-03 | BACKLOG |

## 8. M06 — Admin & Dynamic RBAC (tuần 10–13) — BACKLOG 9/9

| Task | Tên | Mục tiêu / Phạm vi | Priority | Phụ thuộc | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| M06-01 | Admin users + bootstrap Super Admin | Bảng users (G-04); tạo tài khoản admin đầu tiên (bootstrap Super Admin — API chưa có endpoint tạo users, M01-05 đã ghi) | Critical | M02-01, M02-05; G-04 | BACKLOG |
| M06-02 | Roles CRUD | CRUD vai trò (FR-082) | Critical | M02-06 | BACKLOG |
| M06-03 | Permissions + role_permissions matrix | Ma trận role × module × action, checkbox + Select All/None theo module (FR-080) | Critical | M02-06 | BACKLOG |
| M06-04 | user_roles + user_permissions exceptions | Gán vai trò; ngoại lệ user_permissions (FR-083) | High | M06-02, M06-03 | BACKLOG |
| M06-05 | RBAC middleware (backend enforcement) | Backend kiểm tra mọi request (FR-086 — frontend chỉ ẩn nút); hiệu lực sau khi invalidate cache (FR-081) | Critical | M02-06, M06-03 | BACKLOG |
| M06-06 | Admin dashboard | Dashboard số liệu thật (FR-075); shortcut (FR-076); hiển thị theo quyền, trường không được xem → null (FR-077) | High | M06-05; M01-05 | BACKLOG |
| M06-07 | Audit log | Log thay đổi phân quyền (FR-084) + thao tác quản trị | High | M02-01, M06-05 | BACKLOG |
| M06-08 | Last-Super-Admin guard | Không cho Super Admin cuối cùng tự khóa mình (FR-085) | High | M06-02, M06-05 | BACKLOG |
| M06-09 | Admin UI (navigation/menu by permission) | Sidebar/navigation theo M01-05; menu hiện/ẩn theo permission; trạng thái loading/empty/error/forbidden | High | M01-05, M06-05 | BACKLOG |

## 9. M07 — CMS & AI SEO (tuần 12–15) — BACKLOG 9/10, BLOCKED 1/10

| Task | Tên | Mục tiêu / Phạm vi | Priority | Phụ thuộc | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| M07-01 | Articles CRUD | CRUD bài viết (FR-067/FR-068); G-02: ERD chưa có bảng articles — quyết định schema ở M02 | High | M02-01; G-02 | BACKLOG |
| M07-02 | Article listing + detail (public) | Trang danh sách + chi tiết bài viết; SEO metadata (FR-049) | High | M07-01 | BACKLOG |
| M07-03 | Slug + redirects (articles) | Slug chuẩn SEO; redirect khi đổi slug (FR-017 → FR-020 áp dụng cho bài viết) | High | M07-01 | BACKLOG |
| M07-04 | AI SEO Assistant — Layer 1 Rule Engine | Rule engine sinh SEO gợi ý (FR-069) | High | M07-01 | BACKLOG |
| M07-05 | AI SEO Assistant — Layer 2 AI Analysis | Phân tích nội dung bằng AI (FR-070) | High | M07-04; D-04 | BLOCKED |
| M07-06 | SEO fields | SEO title, meta description, focus/secondary keywords, search intent (FR-069/FR-070) | High | M07-01 | BACKLOG |
| M07-07 | Manual SEO override | Manual override không bị AI ghi đè (FR-071); gỡ override (FR-072) | High | M07-06 | BACKLOG |
| M07-08 | Google Search Preview | Xem trước kết quả Google (FR-073) | Medium | M07-06 | BACKLOG |
| M07-09 | Article images/media | Ảnh bài viết (qua M02-04) | Medium | M02-04, M07-01 | BACKLOG |
| M07-10 | Blog homepage + latest articles | Khối bài viết mới nhất ở homepage (FR-004) | Medium | M07-02 | BACKLOG |

## 10. M08 — SEO, Performance & Security (tuần 14–17) — BACKLOG 9/9

| Task | Tên | Mục tiêu / Phạm vi | Priority | Phụ thuộc | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| M08-01 | SSR/SSG | Chiến lược render (SSR/SSG) cho trang danh mục/sản phẩm/bài viết | High | M03-09, M04-09 | BACKLOG |
| M08-02 | Technical SEO basics | Meta unique, canonical, robots.txt, sitemap.xml | High | M03-02, M07-02; D-01 | BACKLOG |
| M08-03 | JSON-LD + breadcrumb | Structured data + breadcrumb (theo sitemap M01-04) | Medium | M08-02 | BACKLOG |
| M08-04 | Faceted navigation SEO | Noindex/canonical cho trang lọc; tránh trùng lặp nội dung | Medium | M03-09 | BACKLOG |
| M08-05 | Core Web Vitals | LCP ≤ 2,5s, INP ≤ 200ms, CLS ≤ 0,1 (NFR); font theo D-07 | High | M08-01; D-07 | BACKLOG |
| M08-06 | Argon2id + lockout | Hash mật khẩu Argon2id; khóa tài khoản sau N lần sai (FR-091) | High | M02-05 | BACKLOG |
| M08-07 | Rate limiting + SQLi/XSS/CSRF | Rate limit API + chống SQL Injection/XSS/CSRF | High | M02-05 | BACKLOG |
| M08-08 | Backup tự động + restore | Backup tự động theo NFR-015; quy trình restore đã kiểm thử | High | M02-08 | BACKLOG |
| M08-09 | Security audit + hardening | Rà soát bảo mật cuối + checklist trước launch | High | M08-06, M08-07 | BACKLOG |

## 11. M09 — QA, UAT & Production Launch (tuần 17–20) — BACKLOG 10/10

| Task | Tên | Mục tiêu / Phạm vi | Priority | Phụ thuộc | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| M09-01 | Test plan + unit/integration | Kế hoạch kiểm thử + test cases cho toàn hệ thống | High | M02-01 → M08-09 (luồng đã xây) | BACKLOG |
| M09-02 | E2E testing | Kiểm thử end-to-end các luồng chính (tìm → fitment → giỏ → đặt hàng) | High | M05-02, M03-09 | BACKLOG |
| M09-03 | Performance testing | Kiểm thử tải + xác minh Core Web Vitals | High | M08-05 | BACKLOG |
| M09-04 | Security testing | Kiểm thử bảo mật lần cuối (theo M08-09) | High | M08-09 | BACKLOG |
| M09-05 | UAT with Henry | Nghiệm thu với Henry (Product Owner); kịch bản UAT + biên bản | Critical | M09-01, M09-02 | BACKLOG |
| M09-06 | Bug triage + fix | Phân loại + sửa lỗi phát hiện ở UAT | High | M09-05 | BACKLOG |
| M09-07 | Production readiness | Checklist sẵn sàng Production (môi trường, secret, monitoring) | Critical | M02-08, M08-08 | BACKLOG |
| M09-08 | Production launch | Launch Production — KHÔNG tự deploy khi chưa được Henry chấp thuận | Critical | M09-05, M09-07 | BACKLOG |
| M09-09 | Post-launch monitoring | Giám sát sau launch + runbook xử lý sự cố | High | M09-08 | BACKLOG |
| M09-10 | Post-launch optimization | Tối ưu đợt đầu sau launch (dựa trên số liệu thật) | Medium | M09-09 | BACKLOG |


## 13. Dependency gates — điều kiện bắt đầu (FIX-03, BL-01)

Một task có dependency là Pending Decision (D-01 → D-09 / PD-01 →
PD-09) thì **không phải lúc nào cũng BLOCKED** — cần phân biệt 3 mức:

1. **Được chuẩn bị kỹ thuật** — đọc spec, thiết kế, viết code không
   phụ thuộc quyết định (ví dụ: abstraction, interface, UI khung).
2. **Chưa được chốt thiết kế/schema** — phần thiết kế phụ thuộc trực
   tiếp vào quyết định thì dừng ở bản nháp, chưa chốt.
3. **Chưa được triển khai chức năng phụ thuộc quyết định** — code
   chạy của phần đó chỉ làm sau khi quyết định được chốt.

| Task | Gate (quyết định chặn) | Được làm trước khi quyết | Chưa được làm cho tới khi quyết |
| --- | --- | --- | --- |
| M02-01 | PD-01 → PD-06 | Thiết kế schema theo ERD; migration cho bảng không phụ thuộc PD | Chốt migration cho bảng phụ thuộc PD (fitment/SKU/OEM) |
| M02-04 | D-06 | Abstraction storage + interface upload; code dùng interface | Triển khai provider cụ thể (S3 hay R2) |
| M02-07, M02-08 | D-05 | Pipeline CI + cấu hình môi trường mẫu | Chốt hosting + deploy thật lên provider |
| M03-02 | G-05 (nền tảng UI dùng chung do M03-01 xây — quyết định ChatGPT 26/11/2026) | Chuẩn bị backend/API (không phụ thuộc nền tảng UI) | Dùng tokens/components trước khi nền tảng M03-01 sẵn sàng |
| M03-03 | PD-02/PD-03/PD-04 | CRUD identifiers theo ERD; chuẩn hóa mã | Chốt quy tắc issuer (make/brand) cho từng loại mã |
| M03-05 | PD-07 | Khung spec key/value; UI lọc spec | Chốt danh sách trường spec có cấu trúc (nếu PD-07 đổi) |
| M03-06 | G-01 + PD-02 (ERD có vehicle_variants cho biến thể xe, nhưng chưa có product_variants cho biến thể sản phẩm; đường mở rộng liên quan PD-02 — 1 SKU/sản phẩm hay nhiều SKU; quyết định schema ở M02-01) | Nghiên cứu yêu cầu variants; thiết kế interface nháp; UI khung | Chốt schema product_variants; triển khai CRUD variants |
| M03-07 | D-02 | Khung import/export Excel; validate mã | Triển khai import dữ liệu thật (chưa có nguồn) |
| M03-09 | D-07 + G-05 (font tự host Inter vs system font — M01-06 đề xuất, chưa chốt; nền tảng UI do M03-01 xây) | Xây khung UI tìm kiếm với system font fallback, SAU KHI M03-08 xong, trên nền tảng UI M03-01; dùng tokens màu/spacing đã chốt | Chốt typography tokens (font family); áp dụng font tự host |
| M04-04 | PD-01 | CRUD vehicle_applications theo ERD | Chốt độ chi tiết fitment tối thiểu |
| M04-05 | PD-09 | Gắn/gỡ fitment; change log | Thêm cột source/verification (nếu PD-09 đổi) |
| M04-06 | D-03 | Khung import fitment Excel | Triển khai import dữ liệu fitment thật (chưa có nguồn) |
| M05-01 | G-03 (ERD chưa có bảng cart; quyết định nơi lưu ở M02-01) | Thiết kế API giỏ theo API_SPEC; UI giỏ khung | Chốt nơi lưu giỏ (DB/session); triển khai lưu trữ |
| M05-02 | D-08 | Checkout theo đề xuất M01-04; UI + validation | Chốt luồng checkout (trường bắt buộc, bước xác nhận) |
| M05-04 | PD-08 | Quản lý đơn với tên trạng thái PROVISIONAL | Chốt tên vòng đời trạng thái đơn |
| M05-05 | D-09 | Tra cứu theo mã đơn (7 trường an toàn) | Thêm bước xác minh bổ sung |
| M06-01 | G-04 (ERD chưa có bảng admin; quyết định schema ở M02-01) | Thiết kế luồng bootstrap Super Admin theo M01-05 | Chốt schema bảng users; tạo tài khoản admin thật |
| M07-01 | G-02 (ERD chưa có bảng articles; quyết định schema ở M02-01) | Thiết kế API/UI bài viết theo API_SPEC | Chốt schema bảng articles; triển khai CRUD bài viết |
| M07-05 | D-04 | Không — BLOCKED hoàn toàn (cần AI provider + ngân sách) | Mọi phần của task |
| M08-02 | D-01 | Meta/canonical/robots; khung sitemap | Sinh sitemap chính thức (cần domain thật) |
| M08-05 | D-07 | Tối ưu vitals theo system font | Chốt font tự host (ảnh hưởng LCP) |

- M07-05 là task duy nhất BLOCKED hoàn toàn (API_SPEC ghi
  BLOCKED_BY_D-04). Các task còn lại trong bảng ở trạng thái BACKLOG
  với gate tương ứng — được chuẩn bị kỹ thuật, chưa triển khai phần
  phụ thuộc quyết định.
- Sprint nào chứa task có gate thì Sprint Plan ghi rõ gate đó trong
  hàng "Trạng thái task" của Sprint (xem `SPRINT_PLAN.md`).

## 12. Dependency liên milestone (tóm tắt)

```
M00 (nền tảng)
 └─ M01 (PRD/ERD/API/Sitemap/Admin/UI) — DONE
     └─ M02 (schema/auth/RBAC/CI/CD) — BLOCKED nhẹ bởi D-05/D-06, PD-01 → PD-06
         ├─ M03 (catalog + search) ──┐
         ├─ M04 (vehicle + fitment) ─┤ song song sau M02
         ├─ M05 (cart/checkout/orders) — cần M03 + M04; D-08/D-09/PD-08
         ├─ M06 (admin/RBAC) — cần M02-06 + M01-05
         ├─ M07 (CMS/AI SEO) — M07-05 BLOCKED bởi D-04
         └─ M08 (SEO/perf/security) — cần trang public (M03/M07) + auth (M02)
             └─ M09 (QA/UAT/launch) — cần toàn bộ M03 → M08; launch cần Henry duyệt
```

Không có dependency vòng lặp: mọi dependency đều đi theo chiều
M00 → M01 → M02 → M03/M04 → M05 → M06/M07 → M08 → M09.
