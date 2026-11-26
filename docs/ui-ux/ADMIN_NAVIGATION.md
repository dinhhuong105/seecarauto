# Điều hướng Admin — SeeCar Auto

## 1. Nguyên tắc

- **Quyền là trung tâm:** điều hướng chỉ hiển thị những gì tài khoản có quyền xem (ADR-005). Frontend chỉ ẩn — backend luôn kiểm tra quyền trên mọi request; gọi trực tiếp API không có quyền → 403 dù giao diện đã ẩn.
- **Nhất quán:** sidebar, header, breadcrumb dùng chung quy ước hiển thị/ẩn theo quyền ở mọi màn hình (xem mục 4).
- **Không điều hướng chết:** mọi mục menu, breadcrumb, liên kết nội bộ đều dẫn tới màn hình tồn tại trong ADMIN_SITEMAP.md; màn hình không có quyền không xuất hiện dưới dạng liên kết bị khóa — nó bị ẩn hoàn toàn.
- **Quy ước chung:** modal/toast/tooltip/animation theo ADR-009 (~150ms, `prefers-reduced-motion`); trạng thái loading/empty/error/forbidden theo từng màn hình (xem ADMIN_WIREFRAMES.md).

## 2. Sidebar (điều hướng chính)

### 2.1 Cấu trúc

Sidebar cố định bên trái trên desktop; 7 nhóm, 14 mục. Mỗi mục ghi rõ permission code hiển thị:

| Nhóm | Mục | URL | Permission hiển thị | Ghi chú |
| --- | --- | --- | --- | --- |
| Tổng quan | Dashboard | `/dashboard` | `dashboard.view` | Màn hình mặc định sau đăng nhập |
| Catalogue | Sản phẩm | `/products` | `products.view` | Badge: số sản phẩm nháp (chỉ khi có quyền) |
| Catalogue | Danh mục | `/categories` | `categories.view` | Hiển thị dạng cây |
| Catalogue | Thương hiệu | `/brands` | `brands.view` | |
| Xe & Fitment | Hãng xe | `/vehicles` | `vehicles.view` | |
| Xe & Fitment | Fitment | `/fitments` | `fitments.view` | |
| Xe & Fitment | Lịch sử fitment | `/fitments/change-logs` | `fitments.view` | |
| Bán hàng | Đơn hàng | `/orders` | `orders.view` | Badge: số đơn cần xử lý (PENDING) |
| Nội dung | Bài viết | `/articles` | `articles.view` | Badge: số bài nháp |
| Nội dung | Redirects | `/redirects` | `redirects.view` | |
| Hệ thống | Vai trò & Quyền | `/roles` | `roles.view` | |
| Hệ thống | Tài khoản admin | `/users` | `users.view` | |
| Hệ thống | Audit log | `/audit-logs` | `audit.view` | |
| Hệ thống | Cài đặt | `/settings` | (đề xuất — M02 chốt permission) | Đề xuất M01-05, không có FR/endpoint |

- Mục đang xem được highlight; nhóm chứa mục đang xem được mở rộng; nhóm khác thu gọn.
- Sidebar thu gọn được trên desktop (chỉ còn icon + tooltip); trên mobile thành drawer (mở bằng nút menu ở header, đóng khi chọn mục hoặc bấm ngoài).
- Badge số liệu chỉ hiển thị số thật từ hệ thống (đơn PENDING, sản phẩm/bài nháp); chưa có dữ liệu → không hiển thị badge (không hiển thị số 0 giả tạo thành thống kê — BR-013).

### 2.2 Ví dụ hiển thị theo quyền

- **Super Admin (toàn quyền):** thấy đủ 7 nhóm, 14 mục.
- **Product Manager (ví dụ minh họa — quản lý sản phẩm/danh mục/thương hiệu/xe/fitment):** thấy Tổng quan (nếu có `dashboard.view`), Catalogue, Xe & Fitment; không thấy Bán hàng, Nội dung, Hệ thống.
- **Order Staff (ví dụ minh họa — xử lý đơn hàng):** thấy Tổng quan (nếu có `dashboard.view`), Bán hàng; không thấy Catalogue, Xe & Fitment, Nội dung, Hệ thống.
- **Content Editor (ví dụ minh họa — bài viết, SEO):** thấy Tổng quan (nếu có `dashboard.view`), Nội dung; không thấy các nhóm khác.
- **Viewer (ví dụ minh họa — chỉ xem):** thấy Tổng quan + các mục có quyền `*.view`; không thấy nút Tạo/Sửa/Xóa trong các màn hình (frontend ẩn nút theo quyền — FR-081/FR-086).
- Tài khoản không có `dashboard.view` thì sau đăng nhập vào thẳng module đầu tiên mình có quyền xem (theo thứ tự sidebar).

## 3. Header

- **Logo SeeCar Auto** (bên trái): bấm về `/dashboard` nếu có `dashboard.view`, nếu không về module đầu tiên có quyền.
- **Ô tìm kiếm nhanh** (giữa): tìm sản phẩm theo tên/SKU/OEM, đơn theo mã đơn/tên/số điện thoại — kết quả mở trong module tương ứng (chỉ tìm trong module tài khoản có quyền xem; gõ từ khóa → gợi ý → chọn → tới màn hình chi tiết/danh sách đã lọc).
- **Chuông thông báo** (phải): đơn mới cần xử lý — chỉ hiển thị khi có `orders.view`; bấm → tới `/orders?status=PENDING`.
- **Tên tài khoản + vai trò** (phải): menu thả xuống gồm Đổi mật khẩu (đề xuất vị trí — API chưa có endpoint, M02 chốt), Đăng xuất.
- **Đăng xuất:** `POST /auth/admin/logout` (thu hồi token — FR-090); sau đăng xuất về `/login`.
- **Nút menu (mobile):** mở/đóng sidebar drawer.

## 4. Quy tắc hiển thị/ẩn theo quyền

| Tình huống | Hành vi |
| --- | --- |
| Tài khoản không có quyền xem một module | Mục sidebar của module bị ẩn hoàn toàn (không hiển thị dạng khóa/mờ); Dashboard không hiển thị số liệu của module đó; lối tắt tới module đó bị ẩn (FR-076/FR-077) |
| Tài khoản có quyền xem nhưng không có quyền tạo/sửa/xóa | Màn hình hiển thị bình thường; nút Tạo/Sửa/Xóa bị ẩn (không hiển thị dạng disabled — ADR-005: frontend ẩn nút) |
| Truy cập trực tiếp URL của màn hình không có quyền | Hiển thị trang 403 Forbidden (không redirect về Dashboard, không lộ nội dung màn hình) |
| Quyền bị thu hồi trong lúc đang xem | Lần gọi API tiếp theo trả 403 → hiển thị thông báo + chuyển về màn hình có quyền gần nhất; cache quyền TTL 300 giây (ADR-006, FR-081) |
| Thay đổi quyền của chính mình | Yêu cầu xác nhận + ghi audit log (PRD §6.7) |
| Thao tác khiến Super Admin cuối cùng mất quyền quản trị | Hệ thống chặn + thông báo rõ (FR-085); không có ngoại lệ |
| Breadcrumb đi qua cấp không có quyền | Cấp đó hiển thị dạng nhãn (không phải liên kết) |

## 5. Breadcrumb

- 2–3 cấp, theo đúng URL cha trong ADMIN_SITEMAP.md mục 2.
- Ví dụ: `Hãng xe / Toyota / Vios`; `Đơn hàng / SCA-XXXX` (mã đơn là ví dụ minh họa định dạng); `Vai trò / Product Manager`; `Sản phẩm / Water Pump Aisin` (tên là ví dụ minh họa).
- Cấp cuối là tên màn hình/bản ghi hiện tại (không phải liên kết); các cấp trên là liên kết tới màn hình cha (chỉ khi có quyền xem màn hình cha — nếu không, hiển thị dạng nhãn).
- Trang `/dashboard` và `/login` không có breadcrumb.

## 6. Liên kết nội bộ chính

| Từ | Tới | Điều kiện quyền |
| --- | --- | --- |
| Dashboard → Đơn cần xử lý | `/orders?status=PENDING` | `orders.view` |
| Dashboard → Sản phẩm nháp | `/products?status=DRAFT` | `products.view` |
| Dashboard → Bài viết nháp | `/articles?status=DRAFT` | `articles.view` |
| Chi tiết đơn → Sản phẩm trong đơn | `/products/<id>` | `products.view` |
| Sản phẩm → Fitment của sản phẩm | `/fitments?product=<id>` | `fitments.view` |
| Sản phẩm → Bài viết liên quan | `/articles/<slug>` | `articles.view` |
| Vai trò → Tài khoản dùng vai trò đó | `/users?role=<id>` | `users.view` |
| Tài khoản → Vai trò của tài khoản | `/roles/<id>` | `roles.view` |
| Danh mục/Thương hiệu đổi slug đã công bố | `/redirects` (tạo redirect 301) | `redirects.view` + `redirects.create` |
| Lịch sử fitment → Sản phẩm/Xe liên quan | `/products/<id>`, `/vehicles/<make-id>` | quyền xem tương ứng |
| Audit log → Vai trò/Tài khoản liên quan | `/roles/<id>`, `/users/<id>` | quyền xem tương ứng |

## 7. Responsive

- **Desktop rộng:** sidebar đầy đủ (nhãn + icon), header đầy đủ (logo, tìm kiếm, chuông, tài khoản).
- **~1024px:** sidebar thu gọn được (chỉ icon + tooltip khi hover); header giữ nguyên.
- **Điện thoại hẹp:** sidebar thành drawer (mở bằng nút menu); header chỉ còn logo thu gọn, nút menu, chuông, avatar tài khoản; ô tìm kiếm nhanh thành icon (bấm mở ô tìm kiếm full-width); breadcrumb rút gọn (chỉ cấp cha gần nhất + cấp hiện tại).

## 8. Lịch sử revision

| Phiên bản | Ngày | Nội dung |
| --- | --- | --- |
| v0.1 (bản đầu) | 26/11/2026 | Bản đầu M01-05: sidebar 7 nhóm/14 mục, header, breadcrumb, quy tắc theo quyền. Trạng thái IN_REVIEW, chờ ChatGPT review. |
