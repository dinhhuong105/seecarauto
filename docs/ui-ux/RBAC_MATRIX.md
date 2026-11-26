# Ma trận RBAC — SeeCar Auto

## 1. Nguyên tắc

- **Phân quyền động (ADR-005):** ma trận vai trò × module × hành động với checkbox; tạo/sửa/xóa vai trò; gán vai trò cho tài khoản; thay đổi quyền có hiệu lực qua cache invalidation (TTL quyền 300 giây — ADR-006); audit log mọi thay đổi quyền.
- **Vai trò chỉ là ví dụ minh họa, không phải danh sách cố định** (PRD mục 3): vai trò thật do Super Admin tạo/sửa trong hệ thống. Ma trận này trình bày cấu trúc quyền và 5 vai trò ví dụ suy ra từ mô tả PRD — không tự chốt danh sách vai trò.
- **Permission code chỉ lấy từ API spec:** mọi code trong ma trận đều xuất hiện trong API_SPEC §6 hoặc `x-required-permission` trong OpenAPI. Không tự tạo permission code, không suy diễn quyền khi chưa có căn cứ.
- **Frontend chỉ ẩn, backend luôn kiểm tra** (ADR-005, FR-086): gọi trực tiếp API không có quyền → 403 dù giao diện đã ẩn nút.

## 2. Ma trận module × hành động

Hành động theo FR-080: View / Create / Update / Delete / Export / Cancel / Manage. Mỗi ô ghi permission code (hoặc "—" khi API không có permission cho hành động đó) và endpoint dùng quyền đó.

| Module | View | Create | Update | Delete | Export | Cancel | Manage | Endpoint chính |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | `dashboard.view` | — | — | — | — | — | — | `GET /admin/dashboard/summary` |
| Sản phẩm (products) | `products.view`¹ | `products.create` | `products.update` | `products.delete` | —² | — | — | `GET/POST /products`, `PATCH/DELETE /products/{productId}` |
| Danh mục (categories) | `categories.view`¹ | `categories.create` | `categories.update` | `categories.delete` | —² | — | — | `GET/POST /categories`, `PATCH/DELETE /categories/{slug}` |
| Thương hiệu (brands) | `brands.view`¹ | `brands.create` | `brands.update` | `brands.delete` | —² | — | — | `GET/POST /brands`, `PATCH/DELETE /brands/{slug}` |
| Hãng xe (vehicles) | `vehicles.view`¹ | `vehicles.create` | `vehicles.update` | `vehicles.delete` | —² | — | — | `GET/POST /vehicles/makes`, `POST /vehicles/models|generations|variants`, `PATCH/DELETE …/{slug\|id}` |
| Fitment (fitments) | `fitments.view` | `fitments.create` | —³ | `fitments.delete` | —² | — | — | `GET /fitments` (public), `POST /products/{productId}/fitments`, `DELETE /products/{productId}/fitments/{fitmentId}`, `GET /fitments/change-logs` |
| Đơn hàng (orders) | `orders.view` | —⁴ | `orders.update` | —⁴ | —² | `orders.cancel` | `orders.confirm`⁵ | `GET /orders`, `GET /orders/{orderId}`, `PATCH /orders/{orderId}/status|shipping`, `POST /orders/{orderId}/confirm-payment`, `POST /orders/{orderId}/cancel` |
| Bài viết (articles) | `articles.view`¹ | `articles.create` | `articles.update` | `articles.delete` | —² | — | — | `GET/POST /articles`, `PATCH/DELETE /articles/{slug}`, `PATCH /articles/{slug}/seo`, `POST /articles/{slug}/seo/generate` |
| Redirects | `redirects.view` | `redirects.create` | —³ | `redirects.delete` | —² | — | — | `GET/POST /redirects`, `DELETE /redirects/{redirectId}` |
| Vai trò (roles) | `roles.view` | `roles.create` | `roles.update` | `roles.delete` | —² | — | — | `GET/POST /roles`, `PATCH/DELETE /roles/{roleId}`, `GET/PUT /roles/{roleId}/permissions`, `GET /permissions` |
| Tài khoản (users) | `users.view` | —⁶ | `users.update` | —⁶ | —² | — | — | `GET/PUT /users/{userId}/permissions`, `POST /users/{userId}/roles`, `DELETE /users/{userId}/roles/{roleId}` |
| Audit log (audit) | `audit.view` | — | — | — | —² | — | — | `GET /audit-logs` |
| Auth (admin) | `*` (đã đăng nhập) | — | — | — | — | — | — | `GET /auth/admin/me`, `POST /auth/admin/logout` |

Chú thích:

1. **View là quyền hiển thị màn hình, không phải quyền gọi `GET`:** API dùng merged-path — các `GET` danh sách/chi tiết (sản phẩm, danh mục, thương hiệu, hãng xe, bài viết) là public (`x-required-permission: null`) để website khách hàng đọc. Quyền `*.view` của module dùng để quyết định hiển thị màn hình/sidebar trong admin (FR-077) và để gọi các endpoint admin-only của module (ví dụ: `GET /fitments/change-logs`, `GET /orders`).
2. **Export chưa có endpoint:** FR-080 liệt kê hành động Export trong ma trận, nhưng không endpoint P0 nào dùng permission export. Ô Export để "—" trong toàn bộ ma trận — M02/M03 chốt khi có tính năng xuất dữ liệu (không tự tạo `*.export`).
3. **Không có permission Update:** module Fitment và Redirects không có `*.update` trong API — sửa fitment = xóa + gắn lại; sửa redirect = xóa + tạo mới. Ma trận ghi đúng thực tế API, không tự thêm.
4. **Đơn hàng không có Create/Delete:** đơn hàng do khách tạo qua website (`POST /orders` public); admin không tạo đơn, không xóa đơn — chỉ xem/cập nhật trạng thái/xác nhận chuyển khoản/hủy (FR-060 → FR-066).
5. **Manage của đơn hàng = `orders.confirm`:** xác nhận đã nhận chuyển khoản (`POST /orders/{orderId}/confirm-payment`) là hành động Manage riêng của module đơn hàng (FR-063).
6. **Tài khoản không có Create/Delete:** API không có endpoint tạo/xóa tài khoản admin (xem §5). Tạo tài khoản ngoài bootstrap Super Admin do M02 chốt endpoint.

## 3. Vai trò ví dụ (suy ra từ mô tả PRD — KHÔNG phải danh sách cố định)

| Vai trò ví dụ | Mô tả (PRD) | Permission có (suy ra từ mô tả) |
| --- | --- | --- |
| Super Admin | Toàn quyền; quản lý vai trò và phân quyền, quản lý tài khoản admin | Tất cả permission trong ma trận (mục 2) |
| Product Manager | Quản lý sản phẩm/danh mục/thương hiệu/xe/fitment | `dashboard.view`, `products.*`, `categories.*`, `brands.*`, `vehicles.*`, `fitments.*` (trừ Export — chưa có) |
| Order Staff | Xử lý đơn hàng, xem khách hàng | `dashboard.view`, `orders.view`, `orders.update`, `orders.confirm`, `orders.cancel` |
| Content Editor | Bài viết, SEO | `dashboard.view`, `articles.view`, `articles.create`, `articles.update`, `articles.delete`, `redirects.view`, `redirects.create`, `redirects.delete` |
| Viewer | Chỉ xem báo cáo/dashboard, không sửa | `dashboard.view` + các `*.view` mà Super Admin gán thêm (mặc định: chỉ `dashboard.view`) |

- Bảng trên là ví dụ minh họa cách đọc mô tả PRD thành tập quyền — Super Admin tạo/sửa/gán vai trò thật trong hệ thống (`/roles`, `/users/<id>`); không có vai trò nào bị hard-code.
- Tài khoản mới (ngoài bootstrap Super Admin) chưa có cách tạo qua API (xem §5) — gán vai trò chỉ áp dụng cho tài khoản đã tồn tại.

## 4. Ngoại lệ theo tài khoản (`user_permissions`)

- FR-083: Super Admin gán ngoại lệ cho 1 tài khoản — chỉ tài khoản đó đổi quyền, các tài khoản cùng vai trò không đổi. Hạn chế dùng giai đoạn đầu (ADR-005).
- Endpoint: `GET /users/{userId}/permissions` (`users.view`), `PUT /users/{userId}/permissions` (`users.update`).
- Hiển thị trong màn hình `/users/<id>`: danh sách permission override của tài khoản (thêm/bớt so với vai trò), ghi rõ nguồn (vai trò hay ngoại lệ) khi kiểm tra quyền.

## 5. Quy tắc chặn và audit

| Quy tắc | Nguồn | Hành vi |
| --- | --- | --- |
| Không cho tài khoản Super Admin cuối cùng tự khóa mình / mất quyền quản trị | FR-085, BR-007 | Hệ thống chặn thao tác + thông báo rõ; không có ngoại lệ |
| Thay đổi quyền của chính mình | PRD §6.7 | Yêu cầu xác nhận + ghi audit log |
| Mọi thay đổi quyền được ghi audit log | FR-084 | Ghi đủ: ai, khi nào, vai trò nào, quyền nào đổi (trước–sau) |
| Quyền có hiệu lực sau cache invalidate | FR-081 | TTL quyền 300 giây (ADR-006); bỏ quyền → tài khoản mất nút ngay sau invalidate + API trả lỗi quyền |
| Frontend chỉ ẩn nút, backend kiểm tra mọi request | FR-086, NFR-007 | Gọi trực tiếp API không quyền → 403 |

## 6. Gap (ghi rõ, không tự lấp)

| Gap | Ảnh hưởng | Quyết định bởi |
| --- | --- | --- |
| Không có bảng `users` / `roles` / `permissions` / `user_permissions` / audit trong ERD M01-02 | Ma trận thiết kế theo API spec; bảng dữ liệu do M02 chốt (ERD §11 đã ghi rõ) | M02 (RBAC nền tảng) |
| Không có endpoint `GET /users`, `POST /users`, `GET /users/{userId}` | Màn hình `/users` + `/users/<id>` là PROVISIONAL (thiết kế cấu trúc, chờ endpoint); chưa có cách tạo tài khoản admin ngoài bootstrap | M02 |
| Không có endpoint tạo `vehicle_applications` | Màn hình `/vehicles/applications` chỉ xem (PROVISIONAL) | M02 |
| Không có endpoint đổi mật khẩu admin | Menu header "Đổi mật khẩu" chỉ là vị trí đề xuất | M02 |
| Export chưa có permission/endpoint tương ứng | Ô Export = "—" toàn ma trận; không tự tạo `*.export` | M02/M03 |
| Manage không phải permission code độc lập trong API hiện tại | Cột Manage ánh xạ theo từng module: đơn hàng → `orders.confirm` (`POST /orders/{orderId}/confirm-payment`); các module khác không có hành động Manage | Đã chốt trong API hiện tại (M01-03) |
| API_SPEC §6 liệt kê `fitments.update` trong bảng module nhưng không endpoint nào trong OpenAPI dùng code này | Ma trận ghi theo OpenAPI (Fitment không có Update — sửa = xóa + gắn lại), không tự thêm `fitments.update` | M02 (xác nhận khi triển khai RBAC) |
| 4 code `*.view` (products/categories/brands/articles) chỉ có trong bảng module API_SPEC §6, không xuất hiện trong `x-required-permission` của OpenAPI (các `GET` tương ứng là public) | Các code này là quyền hiển thị màn hình theo §6, không phải quyền gọi endpoint — ma trận và sitemap ghi rõ nguồn | Đã chốt trong API_SPEC §6 (M01-03) |
| Không có endpoint admin xem liên hệ | Không có module quản lý liên hệ trong admin | M01-04/M05 (đích đến form liên hệ) |

## 7. Truy vết ma trận → API

- Mọi permission code trong ma trận mục 2 xuất hiện trong `docs/api/openapi.yaml` (`x-required-permission`) — kiểm tra bằng script đối chiếu (Task Brief M01-05 §9.6).
- Mọi endpoint trong cột cuối tồn tại trong API_SPEC §10 — kiểm tra bằng script đối chiếu.
- Module trong ma trận = module trong API_SPEC §6 (bảng permission module) — khớp 1:1 (dashboard, products, categories, brands, vehicles, fitments, orders, articles, redirects, roles, users, audit, auth).

## 8. Lịch sử revision

| Phiên bản | Ngày | Nội dung |
| --- | --- | --- |
| v0.1 (bản đầu) | 26/11/2026 | Bản đầu M01-05: ma trận 13 module × 7 hành động, 5 vai trò ví dụ, quy tắc chặn/audit, gap. Trạng thái IN_REVIEW, chờ ChatGPT review. |
