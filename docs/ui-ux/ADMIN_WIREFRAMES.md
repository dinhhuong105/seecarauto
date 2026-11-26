# Wireframe Admin — SeeCar Auto

## Quy ước chung

- **Layout admin:** sidebar trái (xem ADMIN_NAVIGATION.md §2) + header trên + vùng nội dung chính. Màn hình nào cũng có sidebar/header trừ `/login`.
- **Modal/toast/tooltip/animation (ADR-009):** mọi thao tác thêm/sửa mở modal; thành công/thất bại báo bằng toast/popup (~150ms, tôn trọng `prefers-reduced-motion`); xóa có xác nhận; tooltip giải thích nút/icon khi cần.
- **Trạng thái:** mọi màn hình có đủ 4 trạng thái — loading (skeleton), empty (chưa có dữ liệu — hiển thị empty state, không số 0 giả), error (lỗi tải/lỗi server + nút thử lại), forbidden (403 — không có quyền xem màn hình).
- **Theo quyền:** nút Tạo/Sửa/Xóa bị ẩn khi không có quyền (không hiển thị dạng disabled); mục sidebar/module không có quyền bị ẩn hoàn toàn.
- **Responsive 3 chiều rộng (NFR-011/FR-078):** điện thoại hẹp, ~1024px, desktop rộng. Sidebar thành drawer trên mobile; bảng chuyển thành thẻ (card) trên mobile.
- **Accessibility:** nút đủ lớn để bấm trên mobile; form có nhãn rõ; lỗi form báo từng trường; tương phản chữ/nền đủ đọc.
- **Đếm mẫu:** 12 mẫu, 15 bề mặt (mẫu 12 gồm 4 bề mặt: 12a Users, 12b Audit log, 12c Settings, 12d Redirects); mỗi bề mặt có bố cục Desktop + Mobile — tổng 15 khối Desktop + 15 khối Mobile. Đủ 12 mẫu theo brief M01-05 §AC-03/AC-04.
- Mọi ví dụ trong tài liệu này đều là "ví dụ minh họa, không phải dữ liệu thật".

---

### 1. Đăng nhập (`/login`)

**Mục đích (FR-090, FR-091):** admin đăng nhập bằng tài khoản + mật khẩu (JWT + Refresh Token).

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ [Logo SeeCar Auto]                                               │
│ ┌────────────────────────────┐                                   │
│ │ Đăng nhập quản trị         │                                   │
│ │ [Tài khoản ____________]   │                                   │
│ │ [Mật khẩu _____________]   │                                   │
│ │ [ ] Ghi nhớ đăng nhập      │                                   │
│ │ [Đăng nhập]                │                                   │
│ │ (Lỗi: thông báo chung,     │                                   │
│ │  không lộ tài khoản có     │                                   │
│ │  tồn tại hay không)        │                                   │
│ └────────────────────────────┘                                   │
│ [Hotline/Zalo 0886706338 — liên hệ khi quên tài khoản]           │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:** form full-width, một cột; logo + form + hotline xếp dọc.

**Tương tác:** nhập sai → lỗi chung (401 INVALID_CREDENTIALS); sai liên tiếp tới ngưỡng (M02 chốt) → khóa tạm 423 ACCOUNT_LOCKED + `retryAfter`; đăng nhập đúng → về `/dashboard` (hoặc module đầu tiên có quyền).

**API:** `POST /auth/admin/login`, `POST /auth/admin/refresh`, `GET /auth/admin/me`.

---

### 2. Dashboard tổng quan (`/dashboard`)

**Mục đích (FR-075 → FR-078):** một màn hình tổng quan để admin biết hôm nay có gì cần xử lý — chỉ số liệu thật, theo quyền.

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ SIDEBAR | HEADER (logo, tìm kiếm, chuông, tài khoản)             │
├──────────────────────────────────────────────────────────────────┤
│ Dashboard                                    [Hôm nay: 26/11]  │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │
│ │ Đơn cần xử  │ │ Đơn hôm nay │ │ Sản phẩm    │ │ Bài viết    │  │
│ │ lý: N đơn   │ │ N đơn       │ │ Đã XB: N    │ │ Đã XB: N    │  │
│ │ → /orders   │ │             │ │ Nháp: N     │ │ Nháp: N     │  │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘  │
│ Đơn theo trạng thái: Mới đặt N | Đã xác nhận N | Đang giao N    │
│ Lối tắt: [+ Sản phẩm mới] [Đơn cần xử lý] [Bài viết nháp]       │
│        [Vai trò & Quyền] (chỉ hiện lối tắt có quyền)            │
│ (Chưa có dữ liệu → empty state, không hiển thị số 0 giả tạo)    │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:** thẻ số liệu xếp dọc 1 cột (hoặc 2 cột); lối tắt thành danh sách nút full-width; sidebar thành drawer.

**Tương tác:** bấm thẻ/lối tắt → tới đúng module đã lọc; module không có quyền → thẻ + lối tắt bị ẩn; số liệu theo quyền (`hiddenByPermission` → ẩn trường đó).

**API:** `GET /admin/dashboard/summary` (`dashboard.view`).

---

### 3. Danh sách sản phẩm (`/products`)

**Mục đích (FR-047, FR-057; PRD §6.5):** tìm/lọc/phân trang sản phẩm (2.000–10.000 SKU); lối vào tạo/sửa/xóa.

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ SIDEBAR | HEADER                                                 │
├──────────────────────────────────────────────────────────────────┤
│ Sản phẩm                                   [+ Tạo sản phẩm]     │
│ [Tìm: tên/SKU/OEM ____] [Danh mục ▾] [Thương hiệu ▾] [Trạng thái ▾]│
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Ảnh | Tên | SKU | Thương hiệu | Giá | Còn hàng | Trạng thái   │ │
│ │ ... | ... | ... | ...         | ... | IN_STOCK | Đã xuất bản  │ │
│ │ (thiếu ảnh → placeholder, không vỡ layout)                   │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ [Phân trang server-side: ← 1 2 3 ... →]                          │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:** bảng thành danh sách thẻ (ảnh + tên + SKU + giá + trạng thái); bộ lọc thành nút mở panel; nút Tạo thành nút nổi (FAB) hoặc nút full-width trên đầu.

**Tương tác:** tìm theo tên/SKU/OEM (đúng thứ tự ưu tiên ADR-010); lọc kết hợp nhiều điều kiện; sắp xếp; bấm dòng → `/products/<id>`; xóa → modal xác nhận.

**API:** `GET /products` (public), `POST /products` (`products.create`), `DELETE /products/{productId}` (`products.delete`).

---

### 4. Tạo/Sửa sản phẩm (`/products/new`, `/products/<id>`)

**Mục đích (FR-027, FR-047, FR-057; PRD §6.5):** form sản phẩm theo tab — Thông tin / Identifiers / Hình ảnh / Fitment.

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ SIDEBAR | HEADER                                                 │
├──────────────────────────────────────────────────────────────────┤
│ ← Sản phẩm / Tạo sản phẩm mới        [Lưu nháp] [Xuất bản]      │
│ [Thông tin | Identifiers | Hình ảnh | Fitment] (tab)             │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Tên* [________]  SKU* [________] (chuẩn hóa: viết hoa, bỏ    │ │
│ │   ký tự phân tách — trùng SKU → báo lỗi, không tự ghi đè)    │ │
│ │ Thương hiệu [▾]  Danh mục [▾]  Giá* [________] VND           │ │
│ │ Trạng thái còn hàng: (•) Còn hàng ( ) Hết hàng (P0: chỉ      │ │
│ │   trạng thái, không có trường số lượng tồn kho — BR-012)      │ │
│ │ Trạng thái: (•) Nháp ( ) Xuất bản ( ) Ẩn                     │ │
│ │ Mô tả [______________________]                               │ │
│ │ Identifiers: [+ Thêm mã] loại ▾ [Part Number/OEM/Manufacturer│ │
│ │   /Alternate] + mã + hãng phát hành (theo ma trận issuer)     │ │
│ │ Hình ảnh: [+ Tải ảnh] (ảnh chính + ảnh phụ, kéo thả sắp xếp)  │ │
│ │ Fitment: [+ Gắn xe] chọn xe (hãng → dòng → đời) + ghi chú    │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ (Đổi giá sản phẩm đã có trong giỏ → cảnh báo khách sẽ xác nhận  │
│  lại ở checkout — FR-057; không chặn lưu)                       │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:** tab thành danh sách cuộn ngang; form một cột; nút Lưu/Xuất bản cố định dưới màn hình.

**Tương tác:** lưu nháp/xuất bản; tab chuyển không mất dữ liệu đã nhập; lỗi form báo từng trường; trùng SKU/slug → báo lỗi + gợi ý; xóa sản phẩm → modal xác nhận (RESTRICT khi còn dữ liệu liên quan — PD-05).

**API:** `POST/PATCH/DELETE /products/{productId}`, `POST /products/{productId}/identifiers`, `DELETE /products/{productId}/identifiers/{identifierId}`, `POST /products/{productId}/images`, `DELETE /products/{productId}/images/{imageId}`, `POST /products/{productId}/fitments`, `DELETE /products/{productId}/fitments/{fitmentId}`.

---

### 5. Danh mục & Thương hiệu (`/categories`, `/brands`)

**Mục đích (FR-015 → FR-020):** quản lý cây danh mục nhiều cấp và thương hiệu.

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ SIDEBAR | HEADER                                                 │
├──────────────────────────────────────────────────────────────────┤
│ Danh mục                                    [+ Tạo danh mục]    │
│ [Tìm danh mục ____]                                              │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ ▾ Động cơ (slug: engine)              [Sửa] [Ẩn] [Xóa]       │ │
│ │   ▸ Hệ thống làm mát (slug: cooling)  [Sửa] [Ẩn] [Xóa]       │ │
│ │ ▸ Phanh (slug: brakes)                [Sửa] [Ẩn] [Xóa]       │ │
│ │ (Ẩn danh mục → không xuất hiện ở frontend, sản phẩm không bị  │ │
│ │  xóa; xóa danh mục còn sản phẩm → bị chặn hoặc hỏi chuyển     │ │
│ │  sản phẩm trước — FR-020)                                     │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ Thương hiệu (tab/bảng riêng, cùng mẫu): tên, slug, logo, mô tả, │
│ ẩn/hiện — [+ Tạo thương hiệu]                                    │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:** cây danh mục thành danh sách thụt lề; nút Sửa/Ẩn/Xóa thành menu "..." trên mỗi dòng; form tạo/sửa mở modal full-screen.

**Tương tác:** tạo danh mục con (chọn danh mục cha); đổi tên → slug giữ nguyên (FR-017); đổi slug đã công bố → hệ thống tạo redirect 301 + báo rõ (FR-018); slug trùng → gợi ý slug khác (FR-019); kéo thả đổi thứ tự hiển thị (P1 FR-014 — hiển thị vị trí, chưa triển khai ở P0).

**API:** `GET/POST /categories`, `PATCH/DELETE /categories/{slug}`; `GET/POST /brands`, `PATCH/DELETE /brands/{slug}`; `POST /redirects` (`redirects.create`).

---

### 6. Hãng xe (`/vehicles`, `/vehicles/<make-id>`, `/vehicles/models/<model-id>`, `/vehicles/generations/<generation-id>`)

**Mục đích (FR-021, FR-022):** quản lý hãng xe → dòng xe → thế hệ → phiên bản (điều hướng phân cấp).

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ SIDEBAR | HEADER                                                 │
├──────────────────────────────────────────────────────────────────┤
│ Hãng xe / Toyota  (breadcrumb: Hãng xe / Toyota)                 │
│                                            [+ Tạo dòng xe]      │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Dòng xe | Thế hệ | Năm | Phiên bản | Ẩn/Hiện | Thao tác       │ │
│ │ Vios    | ...    | ... | ...       | Hiện    | [Xem] [Sửa]    │ │
│ │ (Bấm dòng xe → chi tiết dòng xe: danh sách thế hệ; bấm thế hệ │ │
│ │  → chi tiết thế hệ: danh sách phiên bản)                      │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ (Màn hình gốc /vehicles: danh sách hãng xe + [+ Tạo hãng xe];   │
│  mỗi cấp đều có tạo/sửa/xóa, logo (hãng), ẩn/hiện)              │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:** danh sách hãng/dòng/thế hệ thành thẻ xếp dọc; breadcrumb rút gọn (cấp cha gần nhất + hiện tại); nút tạo thành nút full-width.

**Tương tác:** tạo model phải có make (không có make → bị chặn); tạo year ngoài khoảng 1900–2100 → bị chặn (PD-06); ẩn hãng → không xuất hiện ở bộ chọn xe frontend nhưng dữ liệu không bị xóa.

**API:** `GET/POST /vehicles/makes`, `PATCH/DELETE /vehicles/makes/{slug}`, `POST /vehicles/models|generations|variants`, `PATCH/DELETE …/{slug|id}`.

---

### 7. Fitment (`/fitments`, `/fitments/import`, `/fitments/change-logs`)

**Mục đích (FR-027 → FR-033):** gắn/bỏ gắn sản phẩm ↔ xe; nhập hàng loạt bằng Excel; xem lịch sử thay đổi.

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ SIDEBAR | HEADER                                                 │
├──────────────────────────────────────────────────────────────────┤
│ Fitment                        [+ Gắn fitment] [Nhập Excel]     │
│ [Tìm: sản phẩm ____] [Tìm: xe ____]                              │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Sản phẩm | Xe áp dụng | Ghi chú | Người gắn | Thao tác        │ │
│ │ ...      | Toyota Vios | ...     | ...       | [Bỏ gắn]        │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ Nhập Excel (màn hình /fitments/import): [Chọn file .xlsx]       │
│   → kết quả từng dòng: OK / lỗi (ghi rõ dòng + lý do)           │
│   → lịch sử import (trạng thái, số dòng OK/lỗi)                 │
│ Lịch sử thay đổi (/fitments/change-logs): ai, khi nào, sản phẩm │
│   nào, xe nào, gắn/bỏ gắn (trước–sau)                            │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:** bảng thành thẻ; form gắn fitment mở modal full-screen (chọn sản phẩm → chọn xe → ghi chú → xác nhận); kết quả import thành danh sách dòng lỗi có thể lọc.

**Tương tác:** gắn fitment (1 sản phẩm ↔ 1 xe + ghi chú); bỏ gắn có xác nhận; import Excel báo lỗi từng dòng (SRS AC-05); xem lịch sử thay đổi fitment (FR-033).

**API:** `GET /fitments` (public), `POST /products/{productId}/fitments`, `DELETE /products/{productId}/fitments/{fitmentId}`, `POST /fitments/import`, `GET /fitments/import/{importId}`, `GET /fitments/change-logs`.

---

### 8. Danh sách đơn hàng (`/orders`)

**Mục đích (FR-060):** lọc theo trạng thái, tìm theo mã đơn/tên/số điện thoại khách.

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ SIDEBAR | HEADER                                                 │
├──────────────────────────────────────────────────────────────────┤
│ Đơn hàng                                                         │
│ [Tìm: mã đơn/tên/SĐT ____] [Trạng thái ▾] [Phương thức ▾]        │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Mã đơn | Khách | SĐT | Tổng tiền | Thanh toán | Trạng thái    │ │
│ │ ...    | ...  | ... | ...       | COD        | Mới đặt       │ │
│ │ (badge số đơn cần xử lý trên sidebar; bấm dòng → chi tiết)    │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ [Phân trang server-side]                                         │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:** bảng thành thẻ đơn (mã, khách, tổng tiền, trạng thái + nút Xem); bộ lọc thành panel trượt.

**Tương tác:** lọc theo trạng thái (khung P0: PENDING → CONFIRMED → SHIPPING → COMPLETED + CANCELLED/REFUNDED — tên cuối PROVISIONAL PD-08); tìm theo mã đơn ra đúng 1 đơn; sắp xếp mới nhất trước.

**API:** `GET /orders` (`orders.view`).

---

### 9. Chi tiết đơn hàng (`/orders/<id>`)

**Mục đích (FR-061 → FR-066):** xem chi tiết + snapshot, cập nhật trạng thái, xác nhận chuyển khoản, hủy có lý do, sửa thông tin giao hàng, xem log đổi trạng thái.

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ SIDEBAR | HEADER                                                 │
├──────────────────────────────────────────────────────────────────┤
│ ← Đơn hàng / SCA-XXXX (mã đơn là ví dụ minh họa định dạng)      │
│ Trạng thái: [Mới đặt]  Thanh toán: [Chuyển khoản — Chờ xác nhận] │
│ ┌──────────────────────┐ ┌────────────────────────────────────┐  │
│ │ Khách hàng           │ │ Từng món (snapshot — giá lúc đặt,  │  │
│ │ Tên, SĐT, địa chỉ    │ │ không đổi khi giá catalogue đổi):  │  │
│ │ giao (tỉnh/huyện/    │ │ Tên | SKU | SL | Đơn giá | Thành   │  │
│ │ chi tiết)            │ │ tiền                               │  │
│ │ [Sửa địa chỉ] (chỉ   │ │ Tổng tiền: ...                     │  │
│ │  khi chưa giao)      │ └────────────────────────────────────┘  │
│ └──────────────────────┘                                        │
│ [Xác nhận đã nhận tiền] [Cập nhật trạng thái ▾] [Hủy đơn]       │
│ Lịch sử đổi trạng thái: ai, khi nào, từ → sang (FR-066)          │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:** các khối xếp dọc (khách → món → tổng → nút hành động cố định dưới); nút hành động full-width.

**Tương tác:** xác nhận chuyển khoản trước khi chuyển sang "đang giao" (FR-063 — chưa xác nhận tiền → không chuyển được); cập nhật trạng thái sai thứ tự → bị chặn hoặc cảnh báo (theo quy tắc M05); hủy đơn → modal xác nhận + chọn lý do (danh mục lý do do Henry duyệt ở M05 — FR-064); sửa địa chỉ đơn chưa giao → lưu + ghi log, đơn đã giao → bị chặn (FR-065).

**API:** `GET /orders/{orderId}`, `PATCH /orders/{orderId}/status|shipping`, `POST /orders/{orderId}/confirm-payment`, `POST /orders/{orderId}/cancel`.

---

### 10. Bài viết & SEO (`/articles`, `/articles/new`, `/articles/<slug>`)

**Mục đích (FR-067 → FR-074):** quản lý bài viết + SEO (Lớp 1 rule engine; Lớp 2 BLOCKED_BY_D-04; manual override; Google preview).

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ SIDEBAR | HEADER                                                 │
├──────────────────────────────────────────────────────────────────┤
│ ← Bài viết / Tạo bài viết mới        [Lưu nháp] [Xuất bản]      │
│ ┌──────────────────────────────┐ ┌────────────────────────────┐  │
│ │ Tiêu đề* [____________]      │ │ SEO (sidebar phải):        │  │
│ │ Chuyên mục [▾]  Slug* [___]  │ │ [Generate SEO] (Lớp 1 chạy │  │
│ │ Nội dung [soạn thảo ____]    │ │  ngay; Lớp 2 báo rõ "chưa  │  │
│ │ Lịch đăng [__/__/____]       │ │  cấu hình AI" — D-04)      │  │
│ │ (Nháp → không xuất hiện ở    │ │ SEO Title [___] (độ dài ✓/!)│  │
│ │  /blog; xuất bản → xuất hiện)│ │ Meta Description [___]     │  │
│ └──────────────────────────────┘ │ Focus/ Secondary Keywords  │  │
│                                  │ Search Intent [___]         │  │
│                                  │ [✓] Manual override (trường│  │
│                                  │  đã sửa tay không bị ghi đè)│  │
│                                  │ Google Search Preview:      │  │
│                                  │ [Tiêu đề — seecarauto...]   │  │
│                                  └────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:** nội dung + SEO xếp dọc (SEO sau nội dung); Google preview thu gọn; nút Lưu/Xuất bản cố định dưới.

**Tương tác:** đổi tiêu đề bài đã xuất bản → slug/URL giữ nguyên (FR-068); Generate SEO → Lớp 1 cảnh báo độ dài/từ khóa/slug (FR-069), Lớp 2 báo "chưa cấu hình AI" khi chưa có nhà cung cấp (FR-070); sửa tay SEO → không bị ghi đè khi Generate lại (FR-071); bỏ override → đề xuất lại (FR-072); sửa Title/Description → preview cập nhật (FR-073).

**API:** `POST/PATCH/DELETE /articles/{slug}`, `PATCH /articles/{slug}/seo`, `POST /articles/{slug}/seo/generate`.

---

### 11. Vai trò & Ma trận quyền (`/roles`, `/roles/<id>`)

**Mục đích (FR-080 → FR-086):** ma trận vai trò × module × hành động (checkbox, Select All/None), tạo/sửa/xóa vai trò, chặn tự khóa Super Admin cuối cùng.

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ SIDEBAR | HEADER                                                 │
├──────────────────────────────────────────────────────────────────┤
│ Vai trò / Product Manager (ví dụ minh họa)    [Lưu quyền]       │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Module     | Xem | Tạo | Sửa | Xóa | Xuất | Hủy | Quản lý   │ │
│ │ Sản phẩm   | [✓] | [✓] | [✓] | [✓] | [–]  | [–] | [–]       │ │
│ │ Đơn hàng   | [ ] | [–] | [ ] | [–] | [–]  | [ ] | [✓]²      │ │
│ │ Bài viết   | [ ] | [ ] | [ ] | [ ] | [–]  | [–] | [–]       │ │
│ │ ... (đủ 13 module — xem RBAC_MATRIX.md; [–] = không có       │ │
│ │      permission code cho hành động đó trong API)              │ │
│ │ [Select All] [Select None] theo từng module                  │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ (Lưu → cache invalidate → audit log; bỏ quyền quản trị của      │
│  Super Admin cuối cùng → bị chặn + thông báo rõ — FR-085)       │
│ Danh sách vai trò (/roles): tên vai trò, số tài khoản dùng,     │
│   [Tạo vai trò] [Sửa] [Xóa] (xóa vai trò đang có tài khoản dùng  │
│   → yêu cầu chuyển tài khoản trước)                              │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:** ma trận thành danh sách module xếp dọc, mỗi module một nhóm checkbox; nút Lưu cố định dưới; danh sách vai trò thành thẻ.

**Tương tác:** tick/bỏ tick → lưu → quyền có hiệu lực sau invalidate (TTL 300s); Select All/None theo module (FR-080); đổi quyền của chính mình → yêu cầu xác nhận + audit log; thử bỏ quyền Super Admin cuối cùng → bị chặn (FR-085).

**API:** `GET/POST /roles`, `PATCH/DELETE /roles/{roleId}`, `GET/PUT /roles/{roleId}/permissions`, `GET /permissions`.

---

### 12. Hệ thống: Users, Audit log, Cài đặt, Redirects

#### 12a. Tài khoản admin (`/users`, `/users/<id>`) — PROVISIONAL

**Mục đích (FR-082, FR-083):** danh sách tài khoản, gán/bỏ vai trò, ngoại lệ quyền theo tài khoản.

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ SIDEBAR | HEADER                                                 │
├──────────────────────────────────────────────────────────────────┤
│ Tài khoản admin                                                  │
│ [Tìm: tên tài khoản ____] [Vai trò ▾]                            │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Tài khoản | Vai trò | Trạng thái | Lần đăng nhập cuối | ...   │ │
│ │ (PROVISIONAL: API chưa có GET /users, POST /users,            │ │
│ │  GET /users/{userId} — M02 bổ sung; màn hình thiết kế theo cấu    │ │
│ │  trúc, chờ endpoint)                                          │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ Chi tiết tài khoản: vai trò đã gán [Gán vai trò ▾] [Bỏ gán];    │
│   Ngoại lệ quyền (user_permissions): [+ Thêm ngoại lệ] — chỉ    │
│   tài khoản này đổi quyền, các tài khoản cùng vai trò không đổi  │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:** bảng thành thẻ tài khoản; chi tiết xếp dọc; nút gán/bỏ vai trò full-width.

**API:** `POST /users/{userId}/roles`, `DELETE /users/{userId}/roles/{roleId}`, `GET/PUT /users/{userId}/permissions`.

#### 12b. Audit log (`/audit-logs`)

**Mục đích (FR-084, FR-066):** xem nhật ký thay đổi (chỉ xem, không sửa/xóa).

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ SIDEBAR | HEADER                                                 │
├──────────────────────────────────────────────────────────────────┤
│ Audit log                                                        │
│ [Người ▾] [Từ ngày __] [Đến ngày __] [Module ▾] [Hành động ▾]    │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Thời gian | Người | Module | Hành động | Chi tiết (trước–sau)│ │
│ │ ...       | ...  | Quyền  | Đổi quyền | Vai trò X: products  │ │
│ │           |      |        |           | .create ✓ → ✗         │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:** bảng thành thẻ log (thời gian + người + hành động + chi tiết); bộ lọc thành panel.

**API:** `GET /audit-logs` (`audit.view`).

#### 12c. Cài đặt (`/settings`, `/settings/payments`) — ĐỀ XUẤT M01-05

**Mục đích:** cấu trúc cài đặt chung + thanh toán (không có FR; nội dung thật chờ Henry cung cấp).

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ SIDEBAR | HEADER                                                 │
├──────────────────────────────────────────────────────────────────┤
│ Cài đặt — [Chung | Thanh toán] (tab)                             │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Chung: Tên cửa hàng [____] | Hotline/Zalo [0886706338] |     │ │
│ │   Email liên hệ [____] | Địa chỉ [____]                       │ │
│ │ Thanh toán: Ngân hàng [____] | Số tài khoản [____] | Chủ TK   │ │
│ │   [____] | Nội dung chuyển khoản mẫu [____]                   │ │
│ │ (ĐỀ XUẤT: không có FR/endpoint; mọi giá trị thật chờ Henry    │ │
│ │  cung cấp — không bịa giá trị mặc định thành dữ liệu thật)     │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:** tab + form một cột; nút Lưu cố định dưới.

**API:** — (không có endpoint; M02 chốt).

#### 12d. Redirects (`/redirects`)

**Mục đích (FR-018, BR-005):** quản lý redirect 301 (URL cũ → URL mới).

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ SIDEBAR | HEADER                                                 │
├──────────────────────────────────────────────────────────────────┤
│ Redirects                                    [+ Tạo redirect]   │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ URL cũ | URL mới | Loại | Ngày tạo | Thao tác                 │ │
│ │ /parts/cu  | /parts/dong-co | 301  | ...      | [Xóa]         │ │
│ │ (URL là ví dụ minh họa định dạng)                             │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:** bảng thành thẻ redirect; form tạo mở modal full-screen.

**API:** `GET/POST /redirects` (`redirects.view/create`), `DELETE /redirects/{redirectId}` (`redirects.delete`).

---

## Ghi chú cuối

- **Đếm mẫu:** 12 mẫu, 15 bề mặt (mẫu 12 gồm 4 bề mặt: 12a Users, 12b Audit log, 12c Settings, 12d Redirects); mỗi bề mặt có Desktop + Mobile — tổng 15 khối Desktop + 15 khối Mobile. Đủ 12 mẫu theo brief M01-05 (AC-03, AC-04).
- Mọi màn hình trong ADMIN_SITEMAP.md mục 2 đều có wireframe tương ứng (trạng thái 403/404 nằm trong quy ước chung + mẫu 1/12).
- **Bài học từ M01-04 (AC-12):** đếm theo BỀ MẶT, không đếm theo mẫu — mẫu 12 có 4 bề mặt nên tổng khối Desktop/Mobile là 15, không phải 12.
