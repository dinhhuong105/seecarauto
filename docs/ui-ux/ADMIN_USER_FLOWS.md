# Luồng người dùng Admin — SeeCar Auto

## 1. Luồng chính (F-01 → F-15)

### F-01. Đăng nhập admin

- **Màn hình:** `/login` (wireframe mẫu 1).
- **Bước:** mở `/login` → nhập tài khoản + mật khẩu → bấm Đăng nhập → hệ thống kiểm tra → vào `/dashboard` (hoặc module đầu tiên có quyền nếu không có `dashboard.view`).
- **FR:** FR-090, FR-091. **API:** `POST /auth/admin/login`, `GET /auth/admin/me`.
- **Kết quả:** phiên đăng nhập JWT + Refresh Token; header hiển thị tên tài khoản + vai trò.

### F-02. Xem Dashboard tổng quan

- **Màn hình:** `/dashboard` (wireframe mẫu 2).
- **Bước:** đăng nhập → Dashboard hiển thị đơn cần xử lý, đơn hôm nay, sản phẩm đã xuất bản/nháp, bài viết đã xuất bản/nháp, đơn theo trạng thái → bấm thẻ/lối tắt → tới đúng module đã lọc.
- **FR:** FR-075 → FR-078. **API:** `GET /admin/dashboard/summary`.
- **Kết quả:** admin biết hôm nay có gì cần xử lý; số liệu chỉ thật, theo quyền; chưa có dữ liệu → empty state.

### F-03. Tạo sản phẩm mới

- **Màn hình:** `/products` → `/products/new` (wireframe mẫu 3, 4).
- **Bước:** bấm [+ Tạo sản phẩm] → nhập tên, SKU (chuẩn hóa), thương hiệu, danh mục, giá, trạng thái còn hàng, trạng thái xuất bản → tab Identifiers: thêm mã Part Number/OEM/Manufacturer/Alternate (+ hãng phát hành theo ma trận issuer) → tab Hình ảnh: tải ảnh → tab Fitment: gắn xe → Lưu nháp / Xuất bản.
- **FR:** FR-027, FR-047; PRD §6.5. **API:** `POST /products`, `POST /products/{productId}/identifiers`, `POST /products/{productId}/images`, `POST /products/{productId}/fitments`.
- **Kết quả:** sản phẩm xuất bản xuất hiện ở website khách hàng; nháp thì không.

### F-04. Sửa giá / trạng thái còn hàng của sản phẩm

- **Màn hình:** `/products/<id>` (wireframe mẫu 4).
- **Bước:** tìm sản phẩm → mở chi tiết → sửa giá / đổi trạng thái còn hàng → Lưu → hệ thống cảnh báo nếu sản phẩm đã có trong giỏ khách (khách sẽ xác nhận lại ở checkout — FR-057) → giá mới áp dụng sau cache invalidate.
- **FR:** FR-047, FR-057. **API:** `PATCH /products/{productId}`.
- **Kết quả:** trang chi tiết khách cập nhật trong vòng TTL; đơn đã đặt không đổi giá (snapshot).

### F-05. Quản lý danh mục / thương hiệu

- **Màn hình:** `/categories`, `/brands` (wireframe mẫu 5).
- **Bước:** tạo danh mục con (chọn danh mục cha) / tạo thương hiệu → đặt tên, slug tiếng Anh, số thứ tự hiển thị (trường số — FR-015, P0), ẩn/hiện → Lưu → kiểm tra hiển thị ở website khách hàng. (Không kéo-thả sắp xếp lại thứ tự — tương tác kéo-thả thuộc P1, FR-014.)
- **FR:** FR-015 → FR-020. **API:** `POST /categories`, `POST /brands`, `PATCH /categories/{slug}`, `PATCH /brands/{slug}`.
- **Kết quả:** danh mục/thương hiệu mới xuất hiện đúng vị trí; ẩn → không xuất hiện ở frontend, sản phẩm không bị xóa.

### F-06. Quản lý hãng xe / dòng xe / thế hệ / phiên bản

- **Màn hình:** `/vehicles` → `/vehicles/<make-slug>` → `/vehicles/<make-slug>/<model-slug>` → `/vehicles/<make-slug>/<model-slug>/<generation-slug>` (wireframe mẫu 6; URL dùng slug lồng nhau, khớp tham số `{slug}` của API — xem ADMIN_SITEMAP.md §2.1).
- **Bước:** tạo hãng xe (tên, slug, logo) → vào hãng → tạo dòng xe → vào dòng → tạo thế hệ (+ năm) → vào thế hệ → tạo phiên bản.
- **FR:** FR-021, FR-022. **API:** `POST /vehicles/makes|models|generations|variants`.
- **Kết quả:** hãng/dòng/thế hệ/phiên bản mới xuất hiện trong bộ chọn xe ở homepage.

### F-07. Gắn / bỏ gắn fitment + nhập Excel

- **Màn hình:** `/fitments`, `/fitments/import`, `/fitments/change-logs` (wireframe mẫu 7).
- **Bước:** (a) gắn lẻ: chọn sản phẩm → chọn xe → ghi chú áp dụng → xác nhận; (b) nhập hàng loạt: tải file Excel → xem kết quả từng dòng (OK/lỗi + lý do) → sửa file lỗi và nhập lại; (c) xem lịch sử thay đổi fitment.
- **Lưu ý:** phần (b) nhập Excel là luồng mục tiêu cho M04 — M01-05 chỉ thiết kế cấu trúc màn hình `/fitments/import`; tính năng nhập chưa triển khai ở M01-05.
- **FR:** FR-027 → FR-033. **API:** `POST /products/{productId}/fitments`, `DELETE /products/{productId}/fitments/{fitmentId}`, `POST /fitments/import`, `GET /fitments/change-logs`.
- **Kết quả:** (a) sản phẩm xuất hiện trong trang xe tương ứng (tra cứu 2 chiều); (c) lịch sử thay đổi được ghi lại; (b) là luồng mục tiêu M04, chưa chạy ở M01-05.

### F-08. Xử lý đơn hàng (xác nhận → giao → hoàn tất)

- **Màn hình:** `/orders` → `/orders/<id>` (wireframe mẫu 8, 9).
- **Bước:** mở đơn mới → xem chi tiết (khách, địa chỉ, món snapshot, thanh toán) → đơn chuyển khoản: bấm [Xác nhận đã nhận tiền] → cập nhật trạng thái (Mới đặt → Đã xác nhận → Đang giao → Hoàn tất) → mỗi lần đổi trạng thái được ghi log.
- **FR:** FR-060 → FR-063, FR-066. **API:** `GET /orders/{orderId}`, `POST /orders/{orderId}/confirm-payment`, `PATCH /orders/{orderId}/status`.
- **Kết quả:** đơn đi đúng vòng đời (tên trạng thái cuối PROVISIONAL PD-08); khách tra cứu thấy trạng thái mới.

### F-09. Hủy đơn hàng có lý do

- **Màn hình:** `/orders/<id>` (wireframe mẫu 9).
- **Bước:** mở đơn → bấm [Hủy đơn] → modal xác nhận + chọn lý do (danh mục lý do do Henry duyệt ở M05 — FR-064) → xác nhận → đơn chuyển trạng thái đã hủy, các nút sửa trạng thái bị khóa.
- **FR:** FR-064. **API:** `POST /orders/{orderId}/cancel`.
- **Kết quả:** đơn đã hủy không sửa được nữa; lý do hủy được ghi lại.

### F-10. Viết bài + cấu hình SEO

- **Màn hình:** `/articles/new`, `/articles/<slug>` (wireframe mẫu 10).
- **Bước:** tạo bài (tiêu đề, nội dung, chuyên mục, slug) → bấm [Generate SEO] → Lớp 1 (rule engine) cảnh báo độ dài/từ khóa/slug; Lớp 2 báo "chưa cấu hình AI" (BLOCKED_BY_D-04) → sửa tay SEO Title/Meta Description (đánh dấu manual override) → xem Google preview → Lưu nháp / Xuất bản.
- **FR:** FR-067 → FR-074. **API:** `POST /articles` (tạo bài), `PATCH /articles/{slug}` (sửa bài), `POST /articles/{slug}/seo/generate` (Generate SEO), `PATCH /articles/{slug}/seo` (cập nhật SEO thủ công).
- **Kết quả:** bài nháp không xuất hiện ở `/blog`; bài xuất bản xuất hiện; SEO sửa tay không bị ghi đè khi Generate lại.

### F-11. Thay đổi quyền của vai trò (ma trận RBAC)

- **Màn hình:** `/roles/<id>` (wireframe mẫu 11).
- **Bước:** mở vai trò → ma trận vai trò × module × hành động → tick/bỏ tick checkbox (Select All/None theo module) → Lưu → quyền có hiệu lực sau cache invalidate → audit log ghi đủ (ai, khi nào, vai trò nào, quyền nào đổi).
- **FR:** FR-080, FR-081, FR-084. **API:** `GET/PUT /roles/{roleId}/permissions`, `GET /permissions`.
- **Kết quả:** tài khoản thuộc vai trò đó mất/có nút tương ứng ngay sau invalidate; API trả lỗi quyền nếu gọi không có quyền.

### F-12. Tạo vai trò + gán cho tài khoản (PROVISIONAL — một phần BLOCKED_BY_M02)

- **Màn hình:** `/roles`, `/users/<id>` (wireframe mẫu 11, 12a).
- **Bước:** (1) tạo vai trò mới (tên, mô tả) — khả thi: `POST /roles`; (2) mở ma trận quyền của vai trò → tick quyền → Lưu — khả thi: `PUT /roles/{roleId}/permissions`; (3) gán vai trò cho tài khoản ĐÃ TỒN TẠI khi đã biết userId (ví dụ từ audit log) — khả thi: `POST /users/{userId}/roles`; (4) tìm/liệt kê tài khoản để gán — KHÔNG khả thi qua API: chưa có `GET /users` (BLOCKED_BY_M02); màn hình `/users` là PROVISIONAL; (5) tạo tài khoản mới — KHÔNG khả thi: chưa có `POST /users` (BLOCKED_BY_M02).
- **FR:** FR-082. **API:** `POST /roles`, `PUT /roles/{roleId}/permissions`, `POST /users/{userId}/roles`.
- **Kết quả:** vai trò mới được tạo + quyền được thiết lập; gán vai trò chỉ thực hiện được cho tài khoản đã biết ID; tạo tài khoản mới và liệt kê tài khoản chờ M02 bổ sung endpoint.

### F-13. Xem audit log

- **Màn hình:** `/audit-logs` (wireframe mẫu 12b).
- **Bước:** mở Audit log → lọc theo người/thời gian/module/hành động → xem chi tiết thay đổi (trước–sau).
- **FR:** FR-084, FR-066. **API:** `GET /audit-logs`.
- **Kết quả:** mọi thay đổi quyền/trạng thái đơn đều truy vết được người + thời gian + nội dung đổi.

### F-14. Quản lý redirect 301 sau khi đổi slug

- **Màn hình:** `/categories`, `/brands`, `/redirects` (wireframe mẫu 5, 12d).
- **Bước:** đổi slug danh mục/thương hiệu đã công bố → hệ thống tạo redirect 301 từ URL cũ sang URL mới + báo rõ → vào `/redirects` kiểm tra/xóa redirect thủ công khi cần.
- **FR:** FR-018, BR-005. **API:** `PATCH /categories/{slug}`, `PATCH /brands/{slug}`, `GET/POST /redirects`, `DELETE /redirects/{redirectId}`.
- **Kết quả:** truy cập URL cũ nhận 301 tới URL mới; không gãy liên kết.

### F-15. Xem trước cấu trúc Cài đặt (ĐỀ XUẤT — chưa phải chức năng triển khai)

- **Màn hình:** `/settings`, `/settings/payments` (wireframe mẫu 12c).
- **Bước:** mở Cài đặt → xem bố cục đề xuất (tab Chung: tên cửa hàng, hotline; tab Thanh toán: thông tin ngân hàng). KHÔNG có bước Lưu hợp lệ: chưa có endpoint, chưa có FR — nút [Lưu] trong wireframe chỉ là phần tử bố cục đề xuất, không thực hiện thao tác lưu. Không tự đặt tên cửa hàng hoặc tài khoản ngân hàng — nội dung thật chờ Henry cung cấp.
- **FR:** — (không có FR; đề xuất M01-05). **API:** — (không có endpoint; M02 chốt).
- **Kết quả:** cấu trúc màn hình sẵn sàng để M02 triển khai khi có endpoint + dữ liệu thật từ Henry.

## 2. Luồng thay thế (A-01 → A-05)

### A-01. Tìm kiếm nhanh từ header

- Từ header: gõ tên sản phẩm/SKU/OEM hoặc mã đơn/tên/SĐT → gợi ý → chọn → tới màn hình chi tiết/danh sách đã lọc (chỉ tìm trong module có quyền xem).

### A-02. Tài khoản chỉ có quyền xem (Viewer)

- Đăng nhập Viewer → Dashboard chỉ hiển thị số liệu được xem → vào module → thấy dữ liệu nhưng không thấy nút Tạo/Sửa/Xóa → gọi trực tiếp API tạo → backend trả 403.

### A-03. Đổi quyền của chính mình

- Super Admin mở ma trận quyền của vai trò mình đang dùng → bỏ quyền → hệ thống yêu cầu xác nhận + ghi audit log → xác nhận → quyền mất sau invalidate.

### A-04. Đổi slug bài viết đã xuất bản

- Sửa tiêu đề bài đã xuất bản → slug/URL giữ nguyên (FR-068) → URL cũ không đổi, không cần redirect.

### A-05. Sửa thông tin giao hàng của đơn chưa giao

- Mở đơn chưa giao → [Sửa địa chỉ] → sửa tỉnh/huyện/chi tiết → Lưu + ghi log (FR-065); đơn đã giao → nút sửa bị ẩn/bị chặn.

## 3. Trường hợp lỗi (E-01 → E-10)

| Mã | Tình huống | Hành vi hệ thống |
| --- | --- | --- |
| E-01 | Đăng nhập sai tài khoản/mật khẩu | Lỗi chung (401 INVALID_CREDENTIALS), không lộ tài khoản có tồn tại hay không (FR-090) |
| E-02 | Đăng nhập sai liên tiếp tới ngưỡng | Khóa tạm tài khoản 423 ACCOUNT_LOCKED + `retryAfter` (ngưỡng do M02 chốt — FR-091) |
| E-03 | Truy cập màn hình không có quyền | Trang 403 Forbidden (không redirect, không lộ nội dung) |
| E-04 | Bỏ quyền quản trị của Super Admin cuối cùng | Bị chặn + thông báo rõ (FR-085, BR-007); không có ngoại lệ |
| E-05 | Cập nhật trạng thái đơn sai thứ tự | Bị chặn hoặc cảnh báo theo quy tắc M05 chốt (FR-062) |
| E-06 | Trùng SKU / trùng slug | Báo lỗi + gợi ý mã/slug khác, không tự ghi đè (FR-019) |
| E-07 | Import Excel có dòng lỗi | Báo lỗi từng dòng (dòng + lý do); dòng OK vẫn nhập, dòng lỗi phải sửa và nhập lại |
| E-08 | Phiên hết hạn (401) khi đang làm việc | Thông báo + chuyển về `/login`; dữ liệu form đang nhập được giữ lại nếu có thể |
| E-09 | Lỗi mạng / lỗi server (500) | Trang/màn hình báo lỗi rõ + nút [Thử lại]; không mất dữ liệu đã nhập trong form |
| E-10 | Xóa danh mục/thương hiệu còn sản phẩm | Bị chặn hoặc yêu cầu chuyển sản phẩm trước (FR-020); sản phẩm không bị xóa ngầm |

## 4. Kết quả walkthrough

| Luồng | Màn hình | Wireframe | Kết quả |
| --- | --- | --- | --- |
| F-01 | `/login` | Mẫu 1 | PASS |
| F-02 | `/dashboard` | Mẫu 2 | PASS |
| F-03 | `/products`, `/products/new` | Mẫu 3, 4 | PASS |
| F-04 | `/products/<id>` | Mẫu 4 | PASS |
| F-05 | `/categories`, `/brands` | Mẫu 5 | PASS |
| F-06 | `/vehicles`, `/vehicles/<make-slug>`, `/vehicles/<make-slug>/<model-slug>`, `/vehicles/<make-slug>/<model-slug>/<generation-slug>` | Mẫu 6 | PASS |
| F-07 | `/fitments`, `/fitments/import`, `/fitments/change-logs` | Mẫu 7 | PASS (phần nhập Excel: luồng mục tiêu M04) |
| F-08 | `/orders`, `/orders/<id>` | Mẫu 8, 9 | PASS |
| F-09 | `/orders/<id>` | Mẫu 9 | PASS |
| F-10 | `/articles/new`, `/articles/<slug>` | Mẫu 10 | PASS |
| F-11 | `/roles/<id>` | Mẫu 11 | PASS |
| F-12 | `/roles`, `/users/<id>` | Mẫu 11, 12a | PASS (PROVISIONAL — tạo tài khoản mới + liệt kê tài khoản BLOCKED_BY_M02) |
| F-13 | `/audit-logs` | Mẫu 12b | PASS |
| F-14 | `/categories`, `/brands`, `/redirects` | Mẫu 5, 12d | PASS |
| F-15 | `/settings`, `/settings/payments` | Mẫu 12c | PASS (ĐỀ XUẤT — chưa phải chức năng triển khai, không có bước Lưu) |

- 15/15 luồng chính đi qua đúng màn hình trong sitemap, mỗi luồng có wireframe tương ứng — **PASS**.
