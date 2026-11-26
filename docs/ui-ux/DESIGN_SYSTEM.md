# Design System — SeeCar Auto

> **Phạm vi:** Design System cho M01-06 — tokens + component specs. Xây dựng trên những gì đã chốt ở UI_UX_STANDARDS §2 (primary xanh dương ocean blue, accent vàng, font Inter, scale Tailwind, animation 150ms) và ADR-009/ADR-011; tài liệu này **cụ thể hóa thành giá trị** (mã hex, cỡ chữ, spacing) — không thay đổi hướng đã chốt. Các giá trị là **đề xuất** của M01-06, chờ ChatGPT nghiệm thu; quyết định font tự host (D-07) vẫn thuộc Henry/ChatGPT.
>
> **Tỷ lệ tương phản** trong tài liệu này được **tính thật** bằng công thức WCAG (relative luminance) ngày 26/11/2026 — xem §2.4.

## 1. Nguyên tắc

1. **Bán hàng trước, đẹp sau:** mọi quyết định ưu tiên giúp khách tìm đúng món, kiểm tra tương thích, liên hệ Zalo (mục tiêu M01-06).
2. **Một hệ thống duy nhất:** frontend khách + admin dùng chung tokens và components trong package `@seecarauto/ui` (UI_UX_STANDARDS §2).
3. **Không truyền tải thông tin chỉ bằng màu** (UI_UX_STANDARDS §1.6): trạng thái luôn có cả màu + chữ/biểu tượng.
4. **Dùng được bằng bàn phím:** focus ring rõ ràng, Tab di chuyển, Enter/Space kích hoạt, Esc đóng modal/dropdown (UI_UX_STANDARDS §1.6).
5. **Không đặt giá trị tùy tiện:** mọi cỡ chữ, khoảng cách, bo góc, bóng đổ lấy từ scale trong tài liệu này (scale Tailwind).

## 2. Màu sắc (Color)

### 2.1 Bảng màu đề xuất

| Token | Hex | Dùng cho |
| --- | --- | --- |
| `primary-50` | `#EAF3FB` | Nền nhạt của khối thông tin, hover nhẹ |
| `primary-100` | `#D4E6F7` | Nền badge/chip primary |
| `primary-500` | `#1273C4` | Link, icon primary, border focus |
| `primary-600` | `#0B5FA5` | **Màu chính (ocean blue)** — nút chính, header, tiêu đề nhấn |
| `primary-700` | `#084E8A` | Hover của nút chính, chữ primary trên nền trắng |
| `primary-900` | `#062F52` | Footer tối, chữ trên nền accent |
| `accent-400` | `#F7C948` | Điểm nhấn nhỏ (đường kẻ dưới logo) |
| `accent-500` | `#F2B705` | **Màu nhấn (vàng)** — đường kẻ dưới logo, badge khuyến mãi, sao đánh giá |
| `neutral-900` | `#0F172A` | Chữ chính (body text) |
| `neutral-500` | `#475569` | Chữ phụ (muted text) |
| `neutral-200` | `#E2E8F0` | Border, divider |
| `neutral-100` | `#F1F5F9` | Nền phụ (surface-muted) |
| `neutral-50` | `#F8FAFC` | Nền trang |
| `white` | `#FFFFFF` | Nền chính, chữ trên nền primary |
| `success-600` | `#15803D` | Trạng thái thành công, còn hàng |
| `error-600` | `#DC2626` | Trạng thái lỗi, hết hàng, xóa |
| `warning-700` | `#B45309` | Trạng thái cảnh báo (chữ trên nền trắng) |
| `info-600` | `#0369A1` | Trạng thái thông tin |

### 2.2 Quy tắc dùng màu

- **Nút chính:** nền `primary-600`, chữ trắng; hover `primary-700`.
- **Accent vàng (`accent-500`) chỉ dùng cho:** đường kẻ dưới logo, sao đánh giá, badge khuyến mãi, điểm nhấn trang trí — **không dùng làm màu chữ trên nền trắng** (tỷ lệ tương phản chỉ 1.82:1 — xem §2.4); chữ trên nền vàng dùng `neutral-900` (9.82:1).
- **Trạng thái kho:** còn hàng = `success-600` + chữ "Còn hàng"; hết hàng = `error-600` + chữ "Hết hàng" (không chỉ đổi màu nút).
- **Giá:** `primary-700` (đậm, dễ đọc) trên nền trắng.

### 2.3 Màu theo ngữ cảnh

| Ngữ cảnh | Nền | Chữ |
| --- | --- | --- |
| Header (khách) | trắng | `neutral-900`; link active `primary-700` |
| Hero | `primary-50` → trắng (gradient nhẹ) | `neutral-900`; nhấn `primary-700` |
| Footer | `primary-900` | trắng; link phụ `primary-100` |
| Admin sidebar | trắng | `neutral-900`; mục active nền `primary-50` + chữ `primary-700` |
| Toast thành công | trắng, viền trái `success-600` | `neutral-900` + icon `success-600` |
| Toast lỗi | trắng, viền trái `error-600` | `neutral-900` + icon `error-600` |

### 2.4 Tỷ lệ tương phản (tính thật — WCAG, 26/11/2026)

| Cặp màu | Tỷ lệ | Kết luận |
| --- | --- | --- |
| Primary `#0B5FA5` trên trắng | 6.57:1 | Đạt AA cho chữ thường (≥4.5) |
| Trắng trên Primary `#0B5FA5` | 6.57:1 | Đạt AA — dùng cho chữ trên nút chính |
| Primary-700 `#084E8A` trên trắng | 8.51:1 | Đạt AA — dùng cho link/giá |
| Trắng trên Primary-700 `#084E8A` | 8.51:1 | Đạt AA |
| Accent `#F2B705` trên trắng | 1.82:1 | **KHÔNG đạt** — không dùng làm chữ trên trắng |
| Chữ tối `#0F172A` trên Accent `#F2B705` | 9.82:1 | Đạt AA — chữ trên nền vàng |
| Chữ chính `#0F172A` trên trắng | 17.85:1 | Đạt AA |
| Chữ phụ `#475569` trên trắng | 7.58:1 | Đạt AA |
| Success `#15803D` trên trắng | 5.02:1 | Đạt AA |
| Error `#DC2626` trên trắng | 4.83:1 | Đạt AA |
| Warning `#B45309` trên trắng | 5.02:1 | Đạt AA |
| Info `#0369A1` trên trắng | 5.93:1 | Đạt AA |
| Trắng trên Success `#15803D` | 5.02:1 | Đạt AA |
| Trắng trên Error `#DC2626` | 4.83:1 | Đạt AA |

## 3. Typography

### 3.1 Font

- **Font chính:** Inter (đã khai báo đầu stack ở M00: `"Inter", ui-sans-serif, system-ui, …`).
- **Đề xuất D-07 (chờ Henry/ChatGPT quyết):** tự host Inter bằng `next/font/local` với file font trong repo — ưu: build không phụ thuộc mạng ngoài (ADR-011), hiển thị nhất quán; nhược: thêm file font vào repo + quy trình cập nhật font. Phương án giữ font hệ thống (M00 hiện tại) vẫn là fallback an toàn. M01-06 **không tự chốt** — chỉ đề xuất.
- **Font đơn cách (monospace)** cho mã phụ tùng (SKU/OEM): `ui-monospace, "SF Mono", "Cascadia Code", Consolas, monospace` — mã dễ đọc, phân biệt chữ `O`/`0`, `I`/`1`.

### 3.2 Phân cấp chữ

| Token | Cỡ / Line-height | Weight | Dùng cho |
| --- | --- | --- | --- |
| `display` | 32px / 40px | 700 | Tiêu đề hero trang chủ |
| `h1` | 28px / 36px | 700 | Tiêu đề trang (danh mục, chi tiết, checkout) |
| `h2` | 24px / 32px | 600 | Tiêu đề mục (section) |
| `h3` | 20px / 28px | 600 | Tiêu đề thẻ, tiêu đề modal |
| `body-lg` | 16px / 24px | 400 | Nội dung chính, mô tả sản phẩm |
| `body` | 15px / 22px | 400 | Chữ trong bảng admin, form |
| `body-sm` | 14px / 20px | 400 | Chữ phụ, ghi chú |
| `caption` | 12px / 16px | 500 | Nhãn nhỏ, mã SKU/OEM (monospace), breadcrumb |
| `price-lg` | 24px / 32px | 700 | Giá ở trang chi tiết |
| `price` | 18px / 24px | 700 | Giá ở thẻ sản phẩm |

- **Mobile:** `display` 28px/36px, `h1` 24px/32px, `h2` 20px/28px (còn lại giữ nguyên).
- **Tên sản phẩm** dùng `body-lg` 600 (thẻ) / `h1` (trang chi tiết); **mã SKU/OEM** dùng `caption` monospace.

## 4. Spacing / Radius / Shadow

- **Spacing (scale Tailwind):** 4, 8, 12, 16, 24, 32, 48, 64 (px). Khoảng cách giữa các mục (section): 48 (desktop) / 32 (mobile); giữa các thẻ trong lưới: 16–24; padding trong thẻ: 16; khoảng cách form: 16 giữa các trường.
- **Radius:** `sm` 6px (input, badge), `md` 8px (nút, thẻ), `lg` 12px (modal, ảnh lớn), `full` (avatar, chip tròn).
- **Shadow:** `sm` (thẻ, dropdown), `md` (modal, toast), `lg` (drawer, popup lớn). Không dùng shadow quá đậm cho thẻ sản phẩm (giữ giao diện sạch, tập trung vào món).
- **Chiều rộng nội dung:** tối đa 1280px, căn giữa, padding ngang 16 (mobile) / 24 (desktop).

## 5. Component specs

### 5.1 Button

| Biến thể | Nền | Chữ | Dùng cho |
| --- | --- | --- | --- |
| Primary | `primary-600` (hover `primary-700`) | trắng | Hành động chính: "Thêm vào giỏ", "Đặt hàng", "Lưu" |
| Secondary | trắng, viền `neutral-200` | `neutral-900` | Hành động phụ: "Xem chi tiết", "Hủy" |
| Accent | `accent-500` | `neutral-900` | CTA liên hệ: "Chat Zalo", "Gọi hotline" |
| Danger | `error-600` | trắng | "Xóa", "Hủy đơn" (luôn kèm ConfirmDialog) |
| Ghost | trong suốt | `primary-700` | Link hành động trong bảng |

- **Cỡ:** `sm` (32px — trong bảng), `md` (40px — mặc định), `lg` (48px — CTA trang chi tiết/giỏ hàng).
- **Trạng thái:** hover (đậm hơn 1 nấc), focus (ring `primary-500` 2px + offset 2px), disabled (nền `neutral-200`, chữ `neutral-500`, không bấm được), loading (spinner + chữ "Đang xử lý…", vô hiệu hóa bấm).
- **Quy tắc:** một màn hình chỉ có tối đa 1 nút Primary; nút Danger không bao giờ là nút chính của trang.

### 5.2 Card (thẻ sản phẩm)

- **Anatomy:** ảnh (tỷ lệ 1:1, nền `neutral-100`) → tên món (2 dòng tối đa, `body-lg` 600) → mã + thương hiệu (`caption` monospace) → dòng tương thích (`body-sm`, `neutral-500`) → giá (`price`, `primary-700`) → trạng thái kho (chip màu + chữ) → nút "Thêm vào giỏ" (Primary `sm`) + icon Zalo.
- **Trạng thái:** hết hàng → ảnh mờ 60%, chip "Hết hàng" (`error-600`), nút "Thêm vào giỏ" disabled, hiện nút "Liên hệ Zalo" thay thế.
- **Hover (desktop):** nâng shadow `sm` → `md`, ảnh zoom nhẹ (scale 1.03, 150ms). Mobile: không có hover.

### 5.3 Modal (ADR-009)

- **Dùng cho:** thêm/sửa (form), xem nhanh sản phẩm, xác nhận (ConfirmDialog), chọn xe (mobile).
- **Anatomy:** tiêu đề (`h3`) + nút đóng (X, `aria-label="Đóng"`) → nội dung → footer (nút phụ trái, nút chính phải). Nền mờ `neutral-900` 50%.
- **Hành vi:** mở/đóng 200ms ease-out; Esc đóng; bấm nền mờ đóng (trừ ConfirmDialog nguy hiểm — phải bấm nút); focus trap trong modal; trả focus về nút đã mở khi đóng.
- **Kích thước:** `sm` 400px (xác nhận), `md` 640px (form), `lg` 960px (xem nhanh sản phẩm); mobile: full-screen sheet trượt từ dưới lên.

### 5.4 Toast (ADR-009)

- **Dùng cho:** thông báo thành công/thất bại sau thao tác (thêm vào giỏ, lưu form, lỗi mạng).
- **Anatomy:** icon trạng thái + tiêu đề ngắn + mô tả (tùy chọn) + nút đóng; viền trái 4px màu trạng thái; vị trí: góc phải trên (desktop), dưới cùng full-width (mobile).
- **Hành vi:** tự đóng sau 4 giây (lỗi: 6 giây); xếp chồng tối đa 3; có nút hành động "Hoàn tác" khi phù hợp (xóa, bỏ gắn).
- **Không dùng toast cho:** lỗi nhập liệu trong form (hiển thị inline dưới trường), thông tin cần đọc kỹ (dùng modal hoặc trang riêng).

### 5.5 Tooltip (ADR-009)

- **Dùng cho:** icon không có chữ (icon-only button), giải thích mã/thuật ngữ (SKU, OEM, fitment).
- **Hành vi:** hiện khi hover (desktop) hoặc focus (bàn phím); delay 300ms; ẩn khi rời chuột; nội dung ngắn (≤ 1 câu); không chứa link hay nút bấm.
- **Tránh:** tooltip trên chữ dài, tooltip thay cho nhãn bắt buộc (nhãn phải hiển thị sẵn).

### 5.6 Input / Select

- **Input:** cao 40px, viền `neutral-200`, radius `sm`, focus: viền `primary-500` + ring; lỗi: viền `error-600` + thông báo lỗi inline dưới trường (`body-sm`, `error-600`); placeholder là ví dụ định dạng, không thay label.
- **Select:** dùng native `<select>` có style cho danh sách ngắn (danh mục, thương hiệu); dùng combobox có tìm kiếm cho danh sách dài (hãng/dòng/đời xe, sản phẩm).
- **Tìm kiếm (ô search header):** cao 44px, icon kính lúp trái, nút xóa (X) khi có chữ, gợi ý dropdown khi gõ (mã + tên + thương hiệu + xe tương thích).

### 5.7 Table (admin)

- **Anatomy:** header dính (sticky) + chữ `body-sm` 600 `neutral-500` viết hoa nhẹ; hàng cao 48px; dòng xen kẽ nền trắng/`neutral-50`; checkbox chọn nhiều ở cột đầu; cột thao tác (Xem/Sửa/Xóa) căn phải.
- **Trạng thái:** loading → skeleton 5 hàng; empty → "Chưa có dữ liệu" + nút hành động; lỗi → thông báo + nút "Thử lại".
- **Mobile:** bảng chuyển thành thẻ (mỗi hàng = 1 thẻ, trường quan trọng lên đầu, thao tác thành nút full-width).

### 5.8 Pagination

- **Kiểu:** số trang + "Trước/Sau"; hiển thị "Hiển thị 1–20 trong 1.234 sản phẩm"; chọn số món/trang (20/50/100); mobile: chỉ "Trước/Sau" + "Trang 2/62".

### 5.9 ConfirmDialog

- **Dùng cho:** xóa, hủy đơn, bỏ gán vai trò, đổi quyền của chính mình — mọi thao tác không hoàn tác được.
- **Anatomy:** tiêu đề cảnh báo + mô tả hậu quả cụ thể (tên món/đơn/vai trò) + nút "Hủy" (Secondary) + nút xác nhận (Danger, ghi rõ hành động: "Xóa sản phẩm", không ghi chung chung "Đồng ý").
- **Quy tắc:** không tự đóng khi đang xử lý; sau khi xong hiện toast kết quả + nút "Hoàn tác" khi có thể.

### 5.10 Animation (ADR-009)

| Token | Giá trị | Dùng cho |
| --- | --- | --- |
| `duration-fast` | 150ms ease-out | Micro-interaction: hover, focus, tooltip, ảnh zoom |
| `duration-base` | 200ms ease-out | Modal, dropdown, toast vào/ra |
| `duration-slow` | 300ms ease-out | Drawer, chuyển trang, skeleton |
| `easing` | `ease-out` (mặc định) | Tất cả |

- **`prefers-reduced-motion: reduce`:** mọi animation về 0ms (hiện ngay, không chuyển động); carousel không tự chạy; skeleton không nhấp nháy.
- **Không dùng:** animation gây chú ý quá mức (nhấp nháy, rung lắc) cho nút mua hàng — CTA rõ ràng bằng màu + vị trí, không bằng chuyển động.

## 6. Lịch sử revision

| Phiên bản | Ngày | Nội dung |
| --- | --- | --- |
| v0.1 (bản đầu) | 26/11/2026 | Bản đầu M01-06: tokens màu (kèm tỷ lệ tương phản tính thật), typography, spacing/radius/shadow, specs 10 component + animation. Xây trên UI_UX_STANDARDS §2 + ADR-009/ADR-011. |
