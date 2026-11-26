# Đề xuất phương án UI/UX — SeeCar Auto

> **Phạm vi:** đề xuất phương án cho M01-06 — hướng giao diện từng nhóm trang, responsive, thư viện UI + phương án triển khai Next.js, lộ trình áp dụng. Mọi đề xuất đối chiếu với tài liệu đã nghiệm thu (PRD/SRS/ERD/API/Sitemap/Wireframes/Admin) và nghiên cứu ở UI_RESEARCH.md. Các giá trị màu/chữ/spacing chi tiết ở DESIGN_SYSTEM.md. **Không tự quyết** D-01 → D-09 / PD-01 → PD-09; đề xuất D-07 (font) chỉ là phương án chờ Henry/ChatGPT quyết.

## 1. Hướng giao diện tổng thể

**Khuyến nghị: "Tìm đúng món trong 30 giây"** — toàn bộ giao diện xoay quanh 3 việc: (1) tìm đúng phụ tùng, (2) kiểm tra tương thích xe, (3) liên hệ Zalo đặt hàng. Mọi màn hình đều trả lời được 3 câu hỏi này trong tầm mắt đầu tiên.

- **Phong cách:** sạch, nhiều khoảng trắng, ít màu — nền trắng, chữ tối, primary ocean blue cho hành động chính, vàng accent chỉ làm điểm nhấn (đường kẻ logo, sao, badge). Không dùng gradient mạnh, không dùng ảnh nền rườm rà — phụ tùng là món kỹ thuật, khách cần đọc mã + giá + tương thích, không cần trang trí.
- **Nhất quán:** một Design System duy nhất cho cả frontend khách và admin (DESIGN_SYSTEM.md); mọi màn hình dùng chung Button/Card/Modal/Toast/Tooltip trong `@seecarauto/ui`.
- **Hiệu năng là UX:** trang chủ nhẹ (không hero ảnh nặng), ảnh sản phẩm lazy-load, tìm kiếm phản hồi dưới 300ms (Meilisearch — M02/M03); skeleton thay cho spinner quay tròn.

## 2. Trang chủ (khách) — `/`

**Mục tiêu:** khách mới vào biết ngay 3 việc: tìm theo xe, tìm theo mã, xem danh mục — và tin cửa hàng (hotline/Zalo, thương hiệu, giờ làm việc).

| Khối (theo thứ tự) | Nội dung | Căn cứ |
| --- | --- | --- |
| Header (sticky) | Logo SeeCar Auto + ô tìm kiếm (mã/tên/thương hiệu) + bộ chọn xe đã chọn + giỏ hàng + hotline/Zalo 0886706338 | R-S1, R-V1, L3 |
| Hero | Tiêu đề ngắn + bộ chọn xe (hãng → dòng → đời) + ô tìm theo mã + nút "Tìm phụ tùng" | L5, L10, R-V1; hero P0 không có deals (L11) |
| Dải tin cậy | COD + chuyển khoản · Tra cứu đơn công khai · Tư vấn theo xe · Hotline/Zalo — chỉ ghi những gì thật sự có ở P0. **Chú thích (FIX-02):** COD/chuyển khoản tuân theo quyết định checkout D-08 (chờ Henry); tra cứu đơn công khai tuân theo D-09 và API hiện đánh dấu P0-PROVISIONAL ở phần xác minh bổ sung (BLOCKED_BY_D-09) — không trình bày hai tính năng này như chính sách đã triển khai. | L8 |
| Danh mục theo hệ thống xe | 40+ nhóm dạng lưới icon + tên (động cơ, gầm, phanh, dầu nhớt…) — bấm vào ra `/parts/<category-slug>` | L4, FR-015 |
| Xe phổ biến | Shortcut hãng/dòng phổ biến (chỉ khi có dữ liệu thật) | L13 |
| Sản phẩm gợi ý | Lưới thẻ sản phẩm (theo quy tắc thẻ DESIGN_SYSTEM §5.2) — chỉ sản phẩm đã xuất bản thật | L1, FR-003 |
| Thương hiệu | Logo các thương hiệu đang phân phối (chỉ thương hiệu thật) | L1, FR-002, FR-016 |
| Blog / hướng dẫn | 3 bài mới nhất ("Dấu hiệu hỏng…", "Cách chọn…") — kênh SEO + tin cậy | L12, FR-004, FR-067 |
| Footer | Hotline & Zalo + mô tả công dụng, địa chỉ, giờ làm việc, link tra cứu đơn/bài viết/liên hệ. **Chú thích (FIX-02):** địa chỉ và giờ làm việc chỉ hiển thị khi Henry cung cấp và xác minh thông tin thật — không tự điền. | L3 |

**Không làm ở P0:** hero khuyến mãi/deals (P1), "Đã bán N+" khi chưa có dữ liệu (R-P5), carousel tự chạy (chỉ chạy khi người dùng bấm; tôn trọng `prefers-reduced-motion`).

## 3. Tìm kiếm + danh mục (khách) — `/search`, `/parts`, `/brands`, `/vehicles`

- **Ô tìm kiếm duy nhất** ở header (R-S1): chấp nhận SKU/Part Number/OEM/mã hãng/tên/thương hiệu; thứ tự ưu tiên ADR-010; gợi ý khi gõ hiện mã + tên + thương hiệu + xe tương thích (R-S2).
- **Trang kết quả:** bộ lọc trái (danh mục, thương hiệu, tình trạng, khoảng giá, tương thích xe) + sắp xếp (liên quan, giá, mới nhất) + phân trang (R-S3); mặc định lọc theo xe đã chọn, có nút "Xem tất cả" (R-V2).
- **Không có kết quả:** empty state hữu ích (R-S4): ghi rõ đã tìm gì, gợi ý kiểm tra mã (chuẩn hóa theo M01-02), gợi ý tìm theo xe, nút liên hệ Zalo/hotline — không để trang trắng.
- **Danh mục:** lưới theo hệ thống xe (L4) + danh mục A–Z khi cần (L9); mỗi danh mục hiện số món thật (không bịa).
- **Trang theo xe (`/vehicles/...`):** bộ chọn xe ở đầu trang + danh sách món tương thích + breadcrumb hãng/dòng/đời (R-V1, R-V4).

## 4. Trang chi tiết sản phẩm (khách) — `/products/<product-slug>`

**Thứ tự khối (desktop 2 cột: ảnh trái, thông tin phải):**

1. Ảnh lớn + thumbnail (khi có ảnh thật; chưa có ảnh → placeholder ghi "Chưa có ảnh" — không dùng ảnh giả).
2. Tên món theo quy tắc L1 (tên + xe + đời + thương hiệu/mã) + mã SKU/OEM (monospace, có nút copy).
3. Giá (`price-lg`, `primary-700`) + tình trạng kho (chip màu + chữ; P0 chỉ trạng thái, không số lượng tồn — BR-012).
4. Nút "Thêm vào giỏ" (Primary `lg`) + "Mua ngay" (Secondary `lg`) + nút "Chat Zalo" (Accent) + hotline.
5. Khối tương thích xe: danh sách xe tương thích (dữ liệu thật từ fitment; chưa có dữ liệu → "Chưa có dữ liệu tương thích — liên hệ Zalo để xác nhận", R-V3/R-V4).
6. Khối thông số kỹ thuật (key/value — P1 theo PD-07; P0 chỉ hiển thị khi có dữ liệu thật).
7. Khối mã định danh: SKU, Part Number, OEM, mã hãng — tra cứu chéo (ADR-010).
8. Sản phẩm liên quan (cùng danh mục + thương hiệu, hoặc cùng xe — đề xuất M01-04, chờ Henry) + "Khách cũng xem" (chỉ khi có dữ liệu thật).
9. "Đã bán"/đánh giá: chỉ khi có dữ liệu thật (R-P5).

**Mobile:** 1 cột — ảnh → tên + mã → giá + kho → nút mua (sticky dưới cùng) → tương thích → thông số → liên quan.

## 5. Admin Dashboard — `/dashboard`, `/products`, …

**Hướng chung (đối chiếu M01-05):**

- **Layout:** sidebar trái (7 nhóm/14 mục) + header (tìm nhanh, chuông, menu tài khoản) + breadcrumb; mobile: sidebar thành drawer (R-A3).
- **Danh sách:** bảng theo DESIGN_SYSTEM §5.7 (sticky header, 48px/hàng, checkbox, thao tác phải) + bộ lọc + tìm kiếm + phân trang (R-A1).
- **Form:** modal hoặc trang riêng với tab (R-A2); lỗi inline dưới trường; nút chính 1 cái/trang.
- **Dashboard:** thẻ số liệu (đơn chờ xử lý, đơn hôm nay, sản phẩm đã xuất bản/nháp, bài viết) + bảng đơn mới nhất; số liệu không có quyền xem → ẩn (FR-077), không hiện số 0 giả (R-A4).
- **Thao tác nguy hiểm:** ConfirmDialog cho mọi thao tác không hoàn tác được (R-A5); lịch sử/audit log chỉ ở những nơi có FR quy định (R-A6) — không khẳng định mọi thao tác xóa/hủy đều có audit log.
- **Trạng thái theo quyền:** nút bị ẩn (không disable mờ); URL không quyền → 403 (M01-05 ADMIN_NAVIGATION §4).

## 6. Responsive — Desktop / Tablet / Mobile

| Breakpoint (Tailwind) | Chiều rộng | Thay đổi chính |
| --- | --- | --- |
| Mobile (`<640px`) | 1 cột | Header gọn (logo + tìm kiếm + giỏ); bộ chọn xe thành sheet full-screen; lưới sản phẩm 2 cột (thẻ nhỏ) → chi tiết 1 cột, nút mua sticky dưới; bảng admin thành thẻ; sidebar admin thành drawer |
| Tablet (`640–1023px`) | 2 cột | Lưới sản phẩm 2–3 cột; bộ lọc thành drawer; form 1 cột |
| Desktop (`≥1024px`) | Tối đa 1280px | Header đầy đủ; lưới sản phẩm 4 cột; bộ lọc trái cố định; bảng admin đầy đủ; sidebar admin hiện sẵn |

- **Quy tắc chung:** ô tìm kiếm luôn thấy được (sticky header); nút CTA chính luôn trong tầm tay (sticky dưới mobile); ảnh lazy-load; không có horizontal scroll ở bất kỳ breakpoint nào (kiểm tra bằng `overflow-x` — bài học M01-04 AC-12).
- **Chạm (touch):** mục tiêu chạm tối thiểu 44×44px; khoảng cách giữa các nút ≥8px.

## 7. Thư viện UI + phương án triển khai Next.js

### 7.1 So sánh phương án

| Tiêu chí | A. Tailwind + shadcn/ui (Radix) — KHUYẾN NGHỊ | B. MUI (Material UI) | C. Chakra UI |
| --- | --- | --- | --- |
| Tương thích Tailwind | Gốc — component viết bằng Tailwind | Kém — hệ thống riêng, xung đột với Tailwind | Trung bình — Emotion, không Tailwind-native |
| Accessibility | Tốt — Radix primitives (WAI-ARIA) | Tốt | Tốt |
| Tùy biến theo thương hiệu | Cao — code component thuộc về mình | Trung bình — theme Material nặng | Cao |
| Bundle/runtime | Nhẹ — không CSS-in-JS runtime | Nặng — Emotion runtime + bundle lớn | Trung bình — Emotion runtime |
| Phù hợp `@seecarauto/ui` | Cao — component copy vào package, làm chủ hoàn toàn | Thấp — phụ thuộc thư viện ngoài | Trung bình |
| Build không phụ thuộc mạng ngoài (ADR-011) | Có — code + font tự host trong repo | Có — nhưng theme/fonts cần cấu hình thêm | Có |
| Công sức ban đầu | Trung bình — lắp ráp component | Thấp — có sẵn đầy đủ | Thấp–trung bình |
| Rủi ro dài hạn | Thấp — Radix + Tailwind là chuẩn phổ biến | Trung bình — khó thoát khỏi Material look | Trung bình — đà phát triển chậm hơn A |

### 7.2 Khuyến nghị

- **Chọn phương án A: Tailwind CSS + shadcn/ui (Radix primitives).** Lý do: Tailwind-native (khớp scale đã chốt), accessible sẵn, không runtime CSS-in-JS, component thuộc về repo (`@seecarauto/ui`) nên không bị khóa vào thư viện ngoài, build không cần mạng ngoài.
- **Cách làm:** cài `shadcn/ui` theo từng component cần (Button, Dialog/Modal, Toast/Sonner, Tooltip, Select, Table, Pagination) vào `packages/ui` (`@seecarauto/ui`); tokens (màu/chữ/spacing) khai báo trong `tailwind.config` + CSS variables của package; frontend (`frontend/`) và admin (`admin/`) cùng import từ `@seecarauto/ui`.
- **Font (D-07 — đề xuất, chờ Henry/ChatGPT quyết):** tự host Inter bằng `next/font/local` (file font trong repo) — ưu: build không phụ thuộc mạng ngoài (ADR-011), hiển thị nhất quán; nhược: thêm file font vào repo. Fallback giữ font hệ thống (M00 hiện tại) nếu Henry chưa chốt.
- **Không chọn MUI/Chakra:** MUI bắt theo Material look (khó ra được ocean-blue + vàng theo thương hiệu mà không theme nặng) + Emotion runtime; Chakra cũng dùng Emotion và ít Tailwind-native hơn A.

### 7.3 Lộ trình áp dụng theo milestone

| Milestone | Việc UI |
| --- | --- |
| M02 | Cài Tailwind config + tokens (màu/chữ/spacing) vào `@seecarauto/ui`; dựng Button/Input/Modal/Toast/Tooltip cơ bản; font (theo quyết định D-07) |
| M03 | Component catalogue khách: Card sản phẩm, bộ chọn xe, ô tìm kiếm + gợi ý, bộ lọc, phân trang |
| M04 | Component fitment: bảng fitment, import Excel (UI), lịch sử thay đổi |
| M05 | Component đơn hàng/checkout: giỏ hàng, form checkout, tra cứu đơn, trạng thái đơn |
| M06+ | Hoàn thiện admin (bảng, form tab, RBAC matrix UI), blog/SEO UI, animation tinh chỉnh |

## 8. Truy vết khuyến nghị → FR/API/wireframe + mục tiêu bán hàng

| # | Khuyến nghị | FR / tài liệu | Mục tiêu bán hàng |
| --- | --- | --- | --- |
| R-V1 | Bộ chọn xe ở hero + sticky header, giữ xe đã chọn xuyên suốt phiên | FR-001, FR-023, FR-024, FR-025; luồng F-01 → F-04 (M01-04) | Tìm đúng món theo xe |
| R-V2 | Kết quả mặc định lọc theo xe đã chọn + nút "Xem tất cả" | FR-008, FR-025, FR-039 | Tìm đúng món theo xe |
| R-V3 | Dòng tương thích rõ trên thẻ + chi tiết; chưa có dữ liệu thì ghi rõ + Zalo | FR-028, FR-031, FR-044 | Kiểm tra tương thích |
| R-V4 | Tra cứu ngược món → các xe tương thích | FR-030 | Kiểm tra tương thích |
| R-S1 | Một ô tìm kiếm: SKU/Part/OEM/mã hãng/tên/thương hiệu, ưu tiên ADR-010 | FR-034, FR-035, FR-036 + ADR-010 | Tìm đúng món |
| R-S2 | Gợi ý khi gõ: mã + tên + thương hiệu + xe | FR-037 | Tìm đúng món |
| R-S3 | Bộ lọc + sắp xếp + phân trang ở trang kết quả | FR-038, FR-009 | Tìm đúng món |
| R-S4 | Empty state hữu ích + Zalo/hotline | FR-040; luồng F-05 (M01-04) | Không mất khách khi không tìm thấy |
| R-P1 | Ảnh + tên theo quy tắc L1 | FR-042 → FR-049; wireframe mẫu 6 (M01-04) | Tìm đúng món |
| R-P2 | Giá + kho + CTA mua + Zalo ở trang chi tiết | FR-042 → FR-049; BR-012 | Đặt hàng nhanh |
| R-P3 | Khối tương thích + khối mã định danh | FR-042 → FR-049; ADR-010 | Kiểm tra tương thích |
| R-P4 | Sản phẩm liên quan (đề xuất M01-04, chờ Henry) | FR-046 | Tăng giỏ hàng |
| R-P5 | "Đã bán"/đánh giá chỉ khi có dữ liệu thật | FR-042 → FR-049 | Tin cậy |
| R-A1 | Bảng admin: bộ lọc + tìm kiếm + phân trang | API products/orders + PRD §6.5; M01-05 mẫu 3/8 | Quản trị nhanh |
| R-A2 | Form modal/tab, lỗi inline | API products/identifiers/images/fitments; M01-05 mẫu 4 | Quản trị đúng |
| R-A3 | Trạng thái theo quyền: ẩn nút, 403 | FR-086; M01-05 ADMIN_NAVIGATION §4 | Bảo mật |
| R-A4 | Dashboard: thẻ số liệu + đơn mới nhất, ẩn khi không có quyền | FR-075 → FR-078; `GET /admin/dashboard/summary` | Quản trị nhanh |
| R-A5 | ConfirmDialog cho thao tác nguy hiểm (xóa, hủy đơn, đổi quyền) | FR-064 (hủy đơn có xác nhận + lý do), FR-085 (chặn tự khóa Super Admin cuối cùng — E-04); wireframe M01-05 mẫu 9 (hủy đơn) + mẫu 11 (đổi quyền) + DESIGN_SYSTEM §5.9 | An toàn dữ liệu |
| R-A6 | Audit log / lịch sử — chỉ ở nơi có FR quy định | FR-066 (mọi thay đổi trạng thái đơn — hủy đơn là một thay đổi trạng thái), FR-084 (thay đổi quyền), FR-033 (thay đổi fitment); `GET /audit-logs` (M01-03). **Gap:** xóa sản phẩm chưa có FR nào quy định audit log — không khẳng định; phạm vi sự kiện ghi log do M02 chốt. | An toàn dữ liệu |

## 9. Lịch sử revision

| Phiên bản | Ngày | Nội dung |
| --- | --- | --- |
| v0.1 (bản đầu) | 26/11/2026 | Bản đầu M01-06: hướng giao diện tổng thể + đề xuất từng nhóm trang (chủ/danh mục/tìm kiếm/chi tiết/admin) + responsive + so sánh thư viện UI (khuyến nghị Tailwind + shadcn/ui) + lộ trình theo milestone + bảng truy vết R-V/R-S/R-P/R-A. |
