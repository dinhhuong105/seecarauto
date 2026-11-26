# Sitemap Admin — SeeCar Auto

## 1. Tổng quan

- **Phạm vi:** khu vực quản trị (Admin Dashboard) của website SeeCar Auto — ứng dụng Next.js riêng (port 3001), gọi cùng backend `/api/v1` (INT-002). Sitemap này KHÔNG thuộc website khách hàng (M01-04).
- **URL admin:** đường dẫn trong ứng dụng admin (`/dashboard`, `/products`, …), KHÔNG có tiền tố `/admin`. Tiền tố `/admin` chỉ xuất hiện trong đường dẫn API backend (`GET /api/v1/admin/dashboard/summary`), không phải URL giao diện — không nhầm lẫn hai thứ này.
- **Quyền là trung tâm:** mọi màn hình ghi rõ permission code yêu cầu (theo API_SPEC §6 + `x-required-permission` trong OpenAPI). Sidebar chỉ hiển thị module tài khoản có quyền xem; frontend chỉ ẩn nút, backend luôn kiểm tra quyền (ADR-005).
- **Số mục:** 30 mục (28 trang + 2 trạng thái lỗi chung). Mọi ví dụ trong tài liệu này đều là "ví dụ minh họa, không phải dữ liệu thật" (tên hãng xe, thương hiệu, mã SKU/OEM lấy từ ADR-004/PRD).

## 2. Bảng sitemap

| # | URL (ứng dụng admin) | URL cha | Mục đích / người dùng | Phân loại | SEO | FR | API endpoint (permission) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `/login` | — | Đăng nhập admin bằng tài khoản + mật khẩu (JWT + Refresh Token) | P0 | noindex | FR-090, FR-091 | `POST /auth/admin/login` (public), `POST /auth/admin/refresh`, `GET /auth/admin/me` (`*`) |
| 2 | `/dashboard` | — | Tổng quan: đơn cần xử lý, sản phẩm, bài viết — chỉ số liệu thật, theo quyền | P0 | noindex | FR-075 → FR-078 | `GET /admin/dashboard/summary` (`dashboard.view`) |
| 3 | `/products` | — | Danh sách sản phẩm: tìm theo tên/SKU/OEM, lọc theo danh mục/thương hiệu/trạng thái, phân trang (2.000–10.000 SKU) | P0 | noindex | FR-047, FR-057; PRD §6.5 | `GET /products` (public — merged path; màn hình yêu cầu `products.view` để hiển thị) |
| 4 | `/products/new` | `/products` | Tạo sản phẩm mới: tên, SKU, identifiers (Part Number/OEM/Manufacturer/Alternate), thương hiệu, danh mục, giá, hình ảnh, mô tả, trạng thái còn hàng | P0 | noindex | FR-027, FR-047; PRD §6.5 | `POST /products` (`products.create`), `POST /products/{productId}/identifiers` (`products.create`), `POST /products/{productId}/images` (`products.create`) |
| 5 | `/products/<id>` | `/products` | Sửa sản phẩm (tab: Thông tin / Identifiers / Hình ảnh / Fitment); xuất bản/ẩn/xóa (xóa có xác nhận) | P0 | noindex | FR-027, FR-047, FR-057; PRD §6.5 | `GET /products/{productId}` (public), `PATCH` (`products.update`), `DELETE` (`products.delete`), `GET /products/{productId}/fitments` (public), `POST /products/{productId}/fitments` (`fitments.create`), `DELETE /products/{productId}/fitments/{fitmentId}` (`fitments.delete`) |
| 6 | `/categories` | — | Quản lý danh mục nhiều cấp (cây cha–con): tạo/sửa/xóa, slug tiếng Anh, số thứ tự hiển thị (trường số — FR-015, P0; kéo-thả sắp xếp là P1, FR-014), ẩn/hiện | P0 | noindex | FR-015, FR-017 → FR-020 | `GET /categories` (public), `POST /categories` (`categories.create`), `PATCH/DELETE /categories/{slug}` (`categories.update/delete`) |
| 7 | `/brands` | — | Quản lý thương hiệu: tạo/sửa/xóa, tên, slug, logo, mô tả, ẩn/hiện | P0 | noindex | FR-016 → FR-020 | `GET /brands` (public), `POST /brands` (`brands.create`), `PATCH/DELETE /brands/{slug}` (`brands.update/delete`) |
| 8 | `/vehicles` | — | Quản lý hãng xe (make): danh sách hãng, tạo/sửa/xóa, logo, ẩn/hiện | P0 | noindex | FR-021, FR-022 | `GET /vehicles/makes` (public), `POST /vehicles/makes` (`vehicles.create`), `PATCH/DELETE /vehicles/makes/{slug}` (`vehicles.update/delete`) |
| 9 | `/vehicles/<make-slug>` | `/vehicles` | Chi tiết hãng xe: danh sách dòng xe (model) của hãng, tạo/sửa/xóa model | P0 | noindex | FR-022 | `GET /vehicles/makes/{slug}/models` (public), `POST /vehicles/models` (`vehicles.create`), `PATCH/DELETE /vehicles/models/{slug}` (`vehicles.update/delete`) |
| 10 | `/vehicles/<make-slug>/<model-slug>` | `/vehicles/<make-slug>` | Chi tiết dòng xe: danh sách thế hệ (generation) + năm sản xuất, tạo/sửa/xóa generation | P0 | noindex | FR-022 | `GET /vehicles/models/{slug}/generations` (public), `POST /vehicles/generations` (`vehicles.create`), `PATCH/DELETE /vehicles/generations/{generationId}` (`vehicles.update/delete`) |
| 11 | `/vehicles/<make-slug>/<model-slug>/<generation-slug>` | `/vehicles/<make-slug>/<model-slug>` | Chi tiết thế hệ: danh sách phiên bản (variant), tạo/sửa/xóa variant | P0 | noindex | FR-022 | `GET /vehicles/generations/{generationId}/variants` (public), `POST /vehicles/variants` (`vehicles.create`), `PATCH/DELETE /vehicles/variants/{variantId}` (`vehicles.update/delete`) |
| 12 | `/vehicles/applications` | `/vehicles` | Danh sách vehicle applications (tổ hợp make/model/generation/variant/year) — CHỈ XEM, PROVISIONAL: API không có endpoint tạo application (xem §7) | P0 | noindex | FR-027, FR-033 (PD-01) | `GET /vehicle-applications/{applicationId}/products` (public) |
| 13 | `/fitments` | — | Quản lý fitment: gắn/bỏ gắn sản phẩm ↔ xe, kèm ghi chú áp dụng; tìm theo sản phẩm hoặc xe | P0 | noindex | FR-027 → FR-033 | `GET /fitments` (public), `POST /products/{productId}/fitments` (`fitments.create`), `DELETE /products/{productId}/fitments/{fitmentId}` (`fitments.delete`) — màn hình yêu cầu `fitments.view` để hiển thị |
| 14 | `/fitments/import` | `/fitments` | Nhập fitment hàng loạt bằng Excel: tải file, xem kết quả từng dòng (lỗi từng dòng), lịch sử import — cấu trúc màn hình P0, tính năng triển khai ở M04 | P0 | noindex | FR-027 → FR-033; PRD §4 (roadmap M04) | `POST /fitments/import` (`fitments.create`), `GET /fitments/import/{importId}` (`fitments.view`) |
| 15 | `/fitments/change-logs` | `/fitments` | Lịch sử thay đổi fitment: ai, khi nào, sản phẩm nào, xe nào, trước–sau | P0 | noindex | FR-033 | `GET /fitments/change-logs` (`fitments.view`) |
| 16 | `/orders` | — | Danh sách đơn hàng: lọc theo trạng thái, tìm theo mã đơn/tên/số điện thoại khách | P0 | noindex | FR-060 | `GET /orders` (`orders.view`) |
| 17 | `/orders/<id>` | `/orders` | Chi tiết đơn: thông tin khách, địa chỉ, từng món (snapshot), phương thức thanh toán, trạng thái, lịch sử đổi trạng thái; cập nhật trạng thái, xác nhận chuyển khoản, hủy có lý do, sửa thông tin giao hàng (chưa giao) | P0 | noindex | FR-061 → FR-066 | `GET /orders/{orderId}` (`orders.view`), `PATCH /orders/{orderId}/status` (`orders.update`), `PATCH /orders/{orderId}/shipping` (`orders.update`), `POST /orders/{orderId}/confirm-payment` (`orders.confirm`), `POST /orders/{orderId}/cancel` (`orders.cancel`) |
| 18 | `/articles` | — | Danh sách bài viết: lọc theo chuyên mục/trạng thái (nháp/xuất bản), tìm theo tiêu đề | P0 | noindex | FR-067 | `GET /articles` (public — merged path; màn hình yêu cầu `articles.view` để hiển thị) |
| 19 | `/articles/new` | `/articles` | Tạo bài viết: tiêu đề, nội dung, chuyên mục, slug, SEO (Lớp 1 rule engine; Lớp 2 BLOCKED_BY_D-04), Google preview, lịch đăng | P0 | noindex | FR-067 → FR-074 | `POST /articles` (`articles.create`), `POST /articles/{slug}/seo/generate` (`articles.update`) |
| 20 | `/articles/<slug>` | `/articles` | Sửa bài viết + SEO: manual override (không bị ghi đè), bỏ override để đề xuất lại, xem trước Google | P0 | noindex | FR-067 → FR-074 | `GET /articles/{slug}` (public), `PATCH/DELETE /articles/{slug}` (`articles.update/delete`), `PATCH /articles/{slug}/seo` (`articles.update`) |
| 21 | `/redirects` | — | Quản lý redirect 301: URL cũ → URL mới (khi slug đã công bố thay đổi), tạo/xóa thủ công | P0 | noindex | FR-018, BR-005 | `GET/POST /redirects` (`redirects.view/create`), `DELETE /redirects/{redirectId}` (`redirects.delete`) |
| 22 | `/roles` | — | Danh sách vai trò: tạo/sửa/xóa vai trò, xem số tài khoản dùng vai trò đó | P0 | noindex | FR-082 | `GET/POST /roles` (`roles.view/create`), `PATCH/DELETE /roles/{roleId}` (`roles.update/delete`) |
| 23 | `/roles/<id>` | `/roles` | Ma trận phân quyền vai trò × module × hành động (checkbox, Select All/None theo module); lưu → cache invalidate → audit log | P0 | noindex | FR-080, FR-081, FR-084, FR-085 | `GET /roles/{roleId}/permissions` (`roles.view`), `PUT /roles/{roleId}/permissions` (`roles.update`), `GET /permissions` (`roles.view`) |
| 24 | `/users` | — | Danh sách tài khoản admin: tìm theo tên tài khoản, lọc theo vai trò/trạng thái — PROVISIONAL (chưa có endpoint, M02; tìm tài khoản để gán vai trò cần `GET /users` — BLOCKED_BY_M02) | P0 | noindex | FR-082 | **PROVISIONAL — không có endpoint:** API không có `GET /users` (danh sách), `POST /users` (tạo tài khoản), `GET /users/{userId}` (chi tiết) — M02 bổ sung; màn hình thiết kế theo cấu trúc, chờ endpoint |
| 25 | `/users/<id>` | `/users` | Chi tiết tài khoản: gán/bỏ gán vai trò, ngoại lệ quyền theo tài khoản (`user_permissions`, hạn chế dùng giai đoạn đầu) — PROVISIONAL một phần (gán vai trò + ngoại lệ có endpoint; chi tiết tài khoản chưa có endpoint) | P0 | noindex | FR-082, FR-083 | `POST /users/{userId}/roles` + `DELETE /users/{userId}/roles/{roleId}` (`users.update`), `GET/PUT /users/{userId}/permissions` (`users.view`/`users.update`) — chi tiết tài khoản (tên, email, trạng thái) chưa có endpoint `GET /users/{userId}` — PROVISIONAL |
| 26 | `/audit-logs` | — | Nhật ký audit: lọc theo người/thời gian/module/hành động; xem chi tiết thay đổi (trước–sau) — chỉ xem, không sửa/xóa | P0 | noindex | FR-084, FR-066 | `GET /audit-logs` (`audit.view`) |
| 27 | `/settings` | — | Cài đặt chung (ĐỀ XUẤT M01-05 — không có FR): tên cửa hàng, hotline/Zalo, thông tin liên hệ hiển thị — nội dung thật chờ Henry cung cấp | Đề xuất | noindex | — (không có FR) | — (không có endpoint; M02 chốt) |
| 28 | `/settings/payments` | `/settings` | Cài đặt thanh toán (ĐỀ XUẤT M01-05 — không có FR): thông tin tài khoản ngân hàng nhận chuyển khoản, hướng dẫn chuyển khoản — nội dung thật chờ Henry cung cấp | Đề xuất | noindex | — (không có FR) | — (không có endpoint; M02 chốt) |
| 29 | Trạng thái 403 | — | Trang Forbidden: tài khoản đã đăng nhập nhưng không có quyền xem module/màn hình đó (hiển thị khi truy cập trực tiếp URL) | P0 | noindex | FR-077, FR-081, FR-086 | — (không gọi API) |
| 30 | Trạng thái 404 | — | Trang không tồn tại trong admin (URL gõ sai / màn hình đã bỏ) + liên kết về Dashboard | P0 | noindex | — (quy ước chung) | — (không gọi API) |


> **Ghi chú về cột API và cột "Mục đích / người dùng":** API dùng quy ước merged-path (M01-03): cùng một path, `GET` công khai (public) cho website khách hàng và `PATCH`/`DELETE` cho admin (by UUID). Vì vậy cột API ghi đúng `x-required-permission` của từng operation (public = `null`); còn quyền hiển thị màn hình admin luôn là permission `*.view` của module đó (sidebar ẩn module khi không có quyền — FR-077). Hai thứ khác nhau và đều được ghi rõ ở từng dòng.


### 2.1 Ánh xạ ID giao diện ↔ tham số API (quy tắc cho màn hình phân cấp xe)

- **URL giao diện dùng slug lồng nhau** (`/vehicles/<make-slug>`, `/vehicles/<make-slug>/<model-slug>`, `/vehicles/<make-slug>/<model-slug>/<generation-slug>`), khớp trực tiếp tham số `{slug}` của API (`GET /vehicles/makes/{slug}/models`, `GET /vehicles/models/{slug}/generations`) — giao diện không tự suy đoán ID/slug.
- **UUID lấy từ response danh sách:** mọi response danh sách/chi tiết đều chứa cả `id` (UUID) + `slug` của bản ghi. Giao diện dùng slug để điều hướng/đọc, dùng UUID để ghi (PATCH/DELETE): với resource merged-path (makes, models — API_SPEC §9), server phân biệt slug/UUID theo định dạng trong cùng vị trí `{slug}`; với generations/variants, API dùng `{generationId}`/`{variantId}` (UUID) nên giao diện lấy UUID từ response danh sách của cấp cha (`GET /vehicles/models/{slug}/generations` trả `id` + `slug` của từng generation; `GET /vehicles/generations/{generationId}/variants` tương tự).
- **Kiểm tra quan hệ cha–con:** model slug chỉ unique trong phạm vi một hãng (UNIQUE(make_id, slug)); giao diện xác minh model thuộc hãng đang xem bằng response danh sách của hãng đó (không gọi API bằng slug model đơn lẻ mà không kiểm tra cha). Nếu slug không thuộc hãng trong URL → hiển thị 404.
- **Các module khác không cần ánh xạ:** sản phẩm, đơn hàng, vai trò, tài khoản dùng UUID ở cả URL giao diện (`/products/<id>`, `/orders/<id>`, `/roles/<id>`, `/users/<id>`) lẫn tham số API (`{productId}`, `{orderId}`, `{roleId}`, `{userId}`); bài viết dùng slug ở cả hai (`/articles/<slug>` ↔ `{slug}`).

## 3. Điều hướng

### 3.1 Sidebar (điều hướng chính)

Sidebar chia 7 nhóm, mỗi mục ghi rõ permission code hiển thị (tài khoản không có quyền thì mục bị ẩn hoàn toàn — FR-077):

| Nhóm sidebar | Mục | URL | Permission hiển thị |
| --- | --- | --- | --- |
| Tổng quan | Dashboard | `/dashboard` | `dashboard.view` |
| Catalogue | Sản phẩm | `/products` | `products.view` |
| Catalogue | Danh mục | `/categories` | `categories.view` |
| Catalogue | Thương hiệu | `/brands` | `brands.view` |
| Xe & Fitment | Hãng xe | `/vehicles` | `vehicles.view` |
| Xe & Fitment | Fitment | `/fitments` | `fitments.view` |
| Xe & Fitment | Lịch sử fitment | `/fitments/change-logs` | `fitments.view` |
| Bán hàng | Đơn hàng | `/orders` | `orders.view` |
| Nội dung | Bài viết | `/articles` | `articles.view` |
| Nội dung | Redirects | `/redirects` | `redirects.view` |
| Hệ thống | Vai trò & Quyền | `/roles` | `roles.view` |
| Hệ thống | Tài khoản admin | `/users` | `users.view` |
| Hệ thống | Audit log | `/audit-logs` | `audit.view` |
| Hệ thống | Cài đặt | `/settings` | (đề xuất — M02 chốt permission) |

- Sidebar thu gọn được trên desktop (chỉ icon) và thành drawer trên mobile; mục đang xem được highlight; số đơn cần xử lý hiển thị badge trên mục Đơn hàng (chỉ khi có `orders.view`).
- Tài khoản chỉ có 1 module (ví dụ: chỉ `orders.view`) chỉ thấy nhóm Bán hàng + Dashboard (nếu có `dashboard.view`); các nhóm khác ẩn hoàn toàn.

### 3.2 Header

- Logo SeeCar Auto (về `/dashboard`); ô tìm kiếm nhanh (tìm sản phẩm theo tên/SKU/OEM, đơn theo mã — mở kết quả trong module tương ứng); chuông thông báo (đơn mới — chỉ khi có `orders.view`); tên tài khoản + vai trò + menu (Đổi mật khẩu — PROVISIONAL, không có endpoint trong API; Đăng xuất).
- Đăng xuất: `POST /auth/admin/logout` (thu hồi token — FR-090).

### 3.3 Breadcrumb

- 2–3 cấp, theo đúng URL cha trong bảng mục 2 (ví dụ: Hãng xe / Toyota / Vios; Đơn hàng / SCA-XXXX; Vai trò / Product Manager).
- Breadcrumb chỉ hiển thị các cấp tài khoản có quyền xem; cấp không có quyền không phải là liên kết (chỉ là nhãn).

### 3.4 Liên kết nội bộ chính

- Dashboard → Đơn hàng cần xử lý (`/orders?status=PENDING`), Sản phẩm nháp (`/products?status=DRAFT`), Bài viết nháp (`/articles?status=DRAFT`).
- Chi tiết đơn → Sản phẩm trong đơn (`/products/<id>` — chỉ khi có `products.view`).
- Sản phẩm → Fitment của sản phẩm (`/fitments?product=<id>`), Bài viết liên quan.
- Vai trò → Tài khoản dùng vai trò đó (`/users?role=<id>`); Tài khoản → Vai trò của tài khoản (`/roles/<id>`).
- Danh mục/Thương hiệu đổi slug đã công bố → tạo redirect 301 (`/redirects`).

## 4. Bảng P1 / P2 / ngoài phạm vi

| Mục | Phân loại | Ghi chú |
| --- | --- | --- |
| Analytics đầy đủ (biểu đồ doanh thu, sản phẩm bán chạy) | P1 (FR-079) | Không thiết kế màn hình; Dashboard P0 chỉ có số liệu tổng quan |
| Quản lý tồn kho theo số lượng | P1 (BR-012) | Không thiết kế; P0 chỉ có trạng thái còn/hết hàng |
| Lọc theo thông số kỹ thuật / thứ tự hiển thị sản phẩm trong danh mục | P1 (FR-013, FR-014) | Không thiết kế màn hình riêng; ghi nhận trong mục sản phẩm/danh mục |
| Trang tài khoản khách hàng `/account` | P1 (FR-093/FR-094) | Thuộc website khách hàng, không phải admin |
| Quản lý đơn liên hệ (contact submissions) | Ngoài phạm vi | API không có endpoint admin xem liên hệ; đích đến form liên hệ là PROVISIONAL (M01-04/M05) |
| Quản lý khách hàng (customers) | P1 | Không có endpoint/màn hình P0; FR-093/FR-094 là P1 |
| Khuyến mãi, bán sỉ, webhooks | P1 | Chỉ có trong API_SPEC §22 (catalogue P1), không thiết kế ở M01-05 |

## 5. SEO (ứng dụng admin)

- Toàn bộ ứng dụng admin: `noindex, nofollow` + chặn robots (admin không phải nội dung công khai, không lập chỉ mục).
- Không có sitemap XML, không có SEO metadata công khai cho các màn hình admin.

## 6. Quy tắc URL (ADR-004)

- URL admin: tiếng Anh, chữ thường, kebab-case, không dấu tiếng Việt, không gạch dưới, không khoảng trắng.
- ID trong URL dùng UUID của bản ghi (`<id>`, `<make-id>`, `<model-id>`, `<generation-id>`); riêng bài viết dùng `<slug>` (slug không đổi khi đổi tiêu đề — FR-068).
- Không đặt tiền tố `/admin` trong URL giao diện admin; không dùng tiếng Việt trong URL.

## 7. Đề xuất đang chờ (không tự chốt)

- **Cài đặt (`/settings`, `/settings/payments`):** đề xuất cấu trúc 2 màn hình (Cài đặt chung + Thanh toán). Không có FR nào về Cài đặt; không có endpoint; nội dung thật (tên cửa hàng, hotline, tài khoản ngân hàng) chờ Henry cung cấp. Permission cho mục Cài đặt do M02 chốt khi tạo endpoint.
- **Vehicle applications (`/vehicles/applications`):** màn hình chỉ xem (PROVISIONAL). API có `GET /vehicle-applications/{applicationId}/products` nhưng KHÔNG có endpoint tạo application — cách tạo application (tự động khi tạo variant/year hay tạo thủ công) do M02 chốt. Không tự tạo endpoint.
- **Export/Manage trong ma trận RBAC:** FR-080 liệt kê hành động View/Create/Update/Delete/Export/Cancel/Manage…; permission code thực tế trong API chỉ có view/create/update/delete/confirm/cancel (+ `*`). Phân biệt rõ: **Export** — chưa có permission/endpoint tương ứng (ô Export = "—" toàn ma trận; M02/M03 chốt khi có tính năng xuất dữ liệu, không tự tạo `*.export`); **Manage** — không phải permission code độc lập trong API hiện tại; cột Manage ánh xạ theo từng module (đơn hàng → `orders.confirm` — `POST /orders/{orderId}/confirm-payment`; các module khác không có hành động Manage).
- **Đổi mật khẩu tài khoản admin:** menu header có mục "Đổi mật khẩu" (đề xuất vị trí) — API không có endpoint đổi mật khẩu; M02 chốt (không tự tạo endpoint).
- **Ngưỡng khóa tài khoản (FR-091), thời hạn token (FR-090):** do M02 chốt số cuối; màn hình login chỉ hiển thị thông báo theo mã lỗi API (401/423) — không tự đặt số.
- **Quản lý tài khoản admin (`/users`, `/users/<id>`):** API không có endpoint liệt kê/tạo/xem chi tiết tài khoản admin (`GET /users`, `POST /users`, `GET /users/{userId}`) — chỉ có gán/bỏ vai trò và ngoại lệ quyền. Màn hình `/users` + `/users/<id>` thiết kế theo cấu trúc, PROVISIONAL cho tới khi M02 bổ sung endpoint (kể cả cách tạo tài khoản admin đầu tiên ngoài bootstrap Super Admin).

## 8. Truy vết FR → màn hình (mọi FR admin P0 có ≥1 màn hình)

| FR | Màn hình |
| --- | --- |
| FR-015 (danh mục) | `/categories` |
| FR-016 (thương hiệu) | `/brands` |
| FR-017 → FR-020 (slug/redirect) | `/categories`, `/brands`, `/redirects` |
| FR-021, FR-022 (hãng/dòng/đời xe) | `/vehicles`, `/vehicles/<make-slug>`, `/vehicles/<make-slug>/<model-slug>`, `/vehicles/<make-slug>/<model-slug>/<generation-slug>` |
| FR-027 → FR-033 (fitment) | `/products/<id>` (tab Fitment), `/fitments`, `/fitments/import`, `/fitments/change-logs`, `/vehicles/applications` |
| FR-047 (giá do admin quản lý) | `/products/new`, `/products/<id>` |
| FR-057 (giá đổi sau khi thêm giỏ) | `/products/<id>` (cảnh báo khi đổi giá sản phẩm đã có trong giỏ — hiển thị, không chặn) |
| FR-060 → FR-066 (đơn hàng) | `/orders`, `/orders/<id>` |
| FR-067 → FR-074 (bài viết/SEO) | `/articles`, `/articles/new`, `/articles/<slug>` |
| FR-075 → FR-078 (dashboard) | `/dashboard` |
| FR-080 → FR-086 (RBAC) | `/roles`, `/roles/<id>`, `/users`, `/users/<id>`, `/audit-logs` |
| FR-090, FR-091 (đăng nhập/khóa) | `/login` |
| PRD §6.5 (luồng quản trị sản phẩm) | `/products`, `/products/new`, `/products/<id>` |
| PRD §6.6 (luồng xử lý đơn) | `/orders`, `/orders/<id>` |
| PRD §6.7 (luồng phân quyền — xem PRD) | `/roles/<id>`, `/users/<id>` |

Ghi chú: không có FR đơn lẻ nào bao phủ "admin tạo/sửa sản phẩm" — khả năng này được định nghĩa bởi API (`products.create/update/delete`) + PRD §6.5; bảng trên trích FR liên quan gần nhất (FR-027, FR-047, FR-057).

## 9. Lịch sử revision

| Phiên bản | Ngày | Nội dung |
| --- | --- | --- |
| v0.1 (bản đầu) | 26/11/2026 | Bản đầu M01-05: sitemap admin 30 mục, điều hướng theo quyền, đề xuất Cài đặt, gap ERD/API. Trạng thái IN_REVIEW, chờ ChatGPT review. |
