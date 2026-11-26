# Wireframes — SeeCar Auto (low-fidelity)

| Trường | Nội dung |
| --- | --- |
| Task | M01-04 — Sitemap và Wireframe |
| Milestone | M01 — Architecture & UI/UX |
| Trạng thái | IN_REVIEW (bản đầu — chờ ChatGPT review) |
| Dựa trên | SITEMAP.md (M01-04), PRD/SRS (M01-01 DONE), API Specification (M01-03 DONE), ADR-004 (URL), ADR-009 + UI_UX_STANDARDS (modal/toast/tooltip/animation/trạng thái) |
| Phạm vi | 13 mẫu trang website khách hàng, desktop + mobile. Chưa phải thiết kế đồ họa hoàn chỉnh; chưa triển khai frontend. Admin thuộc M01-05. |

## Quy ước đọc tài liệu này

- **Low-fidelity:** wireframe thể hiện cấu trúc, vị trí thành phần và luồng sử dụng — không phải thiết kế đồ họa (màu sắc, font, hình ảnh thật thuộc M01-06). Khối `[ ... ]` là một thành phần giao diện; `→` là điều hướng; `( ... )` là ghi chú hành vi.
- **Ví dụ minh họa, không phải dữ liệu thật.** Tên hãng xe, dòng xe, danh mục, thương hiệu, sản phẩm, mã và giá trong wireframe đều là ví dụ về định dạng (lấy từ ADR-004/PRD) — ví dụ: hãng Toyota, dòng Vios, danh mục engine, thương hiệu Aisin, sản phẩm water-pump-aisin. Không bịa dữ liệu thật; khi chưa có dữ liệu thật, hiển thị empty state, không hiển thị dữ liệu mẫu.
- **Không dùng số liệu giả làm dữ liệu thật:** không hiển thị số lượng bán, đánh giá, thống kê hay tồn kho khi chưa có dữ liệu thật (PRD 4.1, FR-003, FR-046).
- **Liên hệ đã xác minh:** hotline/Zalo **0886706338**; fanpage https://www.facebook.com/profile.php?id=61597072672914.
- **PENDING:** D-08 (checkout chi tiết) và D-09 (xác minh tra cứu đơn) được thể hiện thành đề xuất/vị trí dự kiến, không tự chốt. Xem SITEMAP.md mục 7.

## Quy ước chung áp dụng cho mọi mẫu trang

### Header (dùng chung mọi trang)

- Desktop: `[Logo SeeCar Auto → /] [Ô tìm kiếm] [Bộ chọn xe: hãng → dòng → đời] [Danh mục] [Thương hiệu] [Tìm theo xe] [Blog] [Tra cứu đơn] [Liên hệ] [Giỏ hàng (số món)] [Hotline/Zalo 0886706338]`.
- Mobile: `[Logo] [Ô tìm kiếm] [Giỏ hàng] [Menu ☰]`; menu mở ra navigation đầy đủ + bộ chọn xe + hotline/Zalo. Ô tìm kiếm và bộ chọn xe tiếp cận được trong 1 chạm.
- Ô tìm kiếm (FR-034): gợi ý khi gõ (autocomplete, FR-037 — chọn bằng chuột và bàn phím); Enter đi tới `/search?q=...`.
- Bộ chọn xe (FR-024, FR-025): chọn hãng → chỉ hiện dòng của hãng đó; chọn dòng → chỉ hiện đời của dòng đó; xe đã chọn ghi nhớ trong phiên và hiển thị ở header trên toàn website; có nút đổi/xóa xe đã chọn.

### Footer (dùng chung mọi trang)

- Nhóm liên kết: Danh mục (`/parts`), Thương hiệu (`/brands`), Tìm theo xe (`/vehicles`), Blog (`/blog`).
- Nhóm hỗ trợ: Tra cứu đơn (`/orders/lookup`), Liên hệ (`/contact`), hotline/Zalo 0886706338, fanpage.
- Thông tin doanh nghiệp: **chờ Henry cung cấp** — hiển thị ghi chú "đang cập nhật", không tự bịa.
- Liên kết chính sách (đổi trả / vận chuyển / thanh toán): chỉ đặt vị trí; nội dung chờ Henry duyệt (D-08).

### Quy tắc tương tác (ADR-009, UI_UX_STANDARDS)

- **Modal:** thao tác thêm/sửa/xem chi tiết mở modal căn giữa; đóng bằng Esc, nút Đóng, click ra ngoài (trừ form có dữ liệu chưa lưu — hỏi xác nhận trước khi đóng); focus vào modal khi mở, trả lại nút đã mở khi đóng.
- **Toast:** thành công/thất bại/cảnh báo dùng toast rõ ràng, KHÔNG dùng `alert()`; thao tác nguy hiểm (xóa, hủy đơn) có bước xác nhận trước.
- **Tooltip:** icon và nút chỉ có biểu tượng phải có tooltip khi hover VÀ khi focus bằng bàn phím.
- **Animation:** chuyển cảnh ~150ms, tinh tế; hỗ trợ `prefers-reduced-motion`.
- **Trạng thái (mọi danh sách/trang dữ liệu):** loading = skeleton (không để trang trắng); empty = empty state + hướng dẫn hành động tiếp theo; error = thông báo rõ + nút thử lại.
- **Responsive:** kiểm tra 3 chiều rộng (điện thoại hẹp, ~1024px, desktop rộng); mobile không chỉ thu nhỏ desktop — bố cục xếp chồng, bộ lọc thành drawer/modal, CTA cố định dưới màn hình khi phù hợp.
- **Accessibility:** focus ring rõ; dùng được hoàn toàn bằng bàn phím (Tab/Enter/Space/Esc); ảnh có `alt`; nút icon-only có `aria-label`; form có label.

### Ký hiệu trong wireframe

- `[ ... ]` = thành phần giao diện. `(ghi chú)` = hành vi/quy tắc. `→` = điều hướng tới trang khác. `⇢` = mở modal/toast/tooltip (không rời trang). `[...]` trong bảng = danh sách lặp lại.

---

## Mẫu 1 — Homepage (`/`)

**Mục đích (FR-001 → FR-006):** đón khách trong vài giây đầu; dẫn tới 3 lối tìm phụ tùng (theo xe, theo danh mục, theo mã) và kênh liên hệ.

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER (dùng chung)                                              │
├──────────────────────────────────────────────────────────────────┤
│ HERO                                                             │
│  [Tiêu đề: Phụ tùng ô tô Chính Hãng - Giá Tốt]                   │
│  [Ô tìm kiếm lớn: tên / SKU / OEM / mã nhà sản xuất]             │
│  [Bộ chọn xe: Hãng ▾ → Dòng ▾ → Đời ▾] [Tìm phụ tùng theo xe →]  │
│  [Hotline/Zalo 0886706338]                                       │
├──────────────────────────────────────────────────────────────────┤
│ DANH MỤC PHỤ TÙNG (lưới)                                         │
│  [Động cơ] [Phanh] [Treo] ... (tên danh mục thật do Henry cung   │
│   cấp; bấm vào → /parts/<category-slug>)                         │
├──────────────────────────────────────────────────────────────────┤
│ THƯƠNG HIỆU (lưới logo + tên)                                    │
│  [Thương hiệu A] [Thương hiệu B] ... (bấm vào → /brands/<slug>)  │
├──────────────────────────────────────────────────────────────────┤
│ SẢN PHẨM GỢI Ý (tiêu chí chờ Henry duyệt — SITEMAP mục 7.4)      │
│  [Sản phẩm thật đã xuất bản × N] (chưa có → empty state,        │
│   không hiển thị dữ liệu mẫu)                                    │
├──────────────────────────────────────────────────────────────────┤
│ BÀI VIẾT MỚI (chưa có bài → ẩn khu vực này)                      │
│  [Bài viết 1] [Bài viết 2] ... (bấm vào → /blog/<slug>)          │
├──────────────────────────────────────────────────────────────────┤
│ FOOTER (dùng chung)                                              │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:** Hero xếp chồng (tiêu đề → ô tìm kiếm → bộ chọn xe → hotline); danh mục/thương hiệu/sản phẩm gợi ý thành lưới 2 cột hoặc cuộn ngang; bài viết xếp dọc.

**Tương tác:** ô tìm kiếm gợi ý khi gõ (FR-037); bộ chọn xe dropdown theo thứ tự hãng → dòng → đời (FR-024); chọn xe xong → nút "Tìm phụ tùng theo xe" đi tới `/vehicles/<make-slug>/<model-slug>` hoặc `/parts` đã lọc theo xe (FR-025).

**Trạng thái:** loading = skeleton cho từng khu vực; danh mục/thương hiệu chưa có dữ liệu → empty state + hướng dẫn liên hệ; lỗi tải dữ liệu → error state + nút thử lại (FR-006).

**API:** `GET /products` (gợi ý), `GET /categories`, `GET /brands`, `GET /articles`.

---

## Mẫu 2 — Trang danh mục (`/parts`, `/parts/<category-slug>`)

**Mục đích (FR-007 → FR-012, FR-015 → FR-020):** danh sách sản phẩm có lọc, sắp xếp, phân trang; dùng được ở quy mô 2.000–10.000 SKU.

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER (dùng chung — có bộ chọn xe)                              │
├──────────────────────────────────────────────────────────────────┤
│ Breadcrumb: Trang chủ / Phụ tùng / <Tên danh mục>                │
│ [H1: Tên danh mục] [Mô tả ngắn danh mục]                         │
├──────────────┬───────────────────────────────────────────────────┤
│ BỘ LỌC      │ [Sắp xếp ▾: Mới nhất / Giá tăng / Giá giảm /     │
│ (sidebar)    │  Tên A–Z] [Xe đã chọn: ... (đổi)]                 │
│              │                                                   │
│ [ ] Danh mục │ LƯỚI SẢN PHẨM                                     │
│  └ [ ] con   │  [Ảnh | Tên | SKU | Thương hiệu | Giá | Tình      │
│ [ ] Thương   │   trạng] × N (mỗi item bấm vào → /products/<slug>)│
│  hiệu        │                                                   │
│ [ ] Khoảng   │ [Phân trang: ← 1 2 3 ... →]                       │
│  giá         │                                                   │
│ [ ] Tình     │ (Xe đã chọn không có sản phẩm tương thích →       │
│  trạng       │  thông báo rõ + gợi ý liên hệ, không hiển thị     │
│ [ ] Tương    │  danh sách trống khó hiểu — FR-012)               │
│  thích xe    │                                                   │
├──────────────┴───────────────────────────────────────────────────┤
│ FOOTER (dùng chung)                                              │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:** bộ lọc thu gọn thành nút `[Bộ lọc]` mở drawer/modal; sắp xếp thành dropdown; lưới 2 cột; phân trang giữ nguyên.

**Tương tác:** lọc kết hợp nhiều điều kiện (FR-008); đổi sắp xếp → thứ tự đổi đúng, không trùng/lặp giữa các trang (FR-009); item thiếu ảnh → ảnh placeholder, không vỡ layout (FR-010); phân trang server-side (FR-011).

**Trạng thái:** loading = skeleton lưới; không có sản phẩm thỏa lọc → empty state + nút xóa bộ lọc; lỗi tải → error state + thử lại.

**API:** `GET /products`, `GET /categories/{slug}`, `GET /categories/{slug}/products`.

---

## Mẫu 3 — Trang thương hiệu (`/brands`, `/brands/<brand-slug>`)

**Mục đích (FR-016):** liệt kê thương hiệu và sản phẩm của một thương hiệu.

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER (dùng chung)                                              │
├──────────────────────────────────────────────────────────────────┤
│ [/brands] DANH SÁCH THƯƠNG HIỆU                                 │
│  [Logo + Tên × N] (bấm vào → /brands/<brand-slug>)               │
│                                                                  │
│ [/brands/<slug>]                                                 │
│ Breadcrumb: Trang chủ / Thương hiệu / <Tên thương hiệu>          │
│ [Logo lớn] [H1: Tên thương hiệu] [Mô tả thương hiệu]             │
│ [Sắp xếp ▾] [Lọc: danh mục / khoảng giá / tình trạng]            │
│ LƯỚI SẢN PHẨM của thương hiệu (như mẫu 2)                        │
│ [Phân trang]                                                     │
├──────────────────────────────────────────────────────────────────┤
│ FOOTER (dùng chung)                                              │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:** như mẫu 2 (lưới 2 cột, lọc thành drawer).

**Tương tác:** bấm thương hiệu → đúng URL `/brands/<slug>`; danh sách đúng sản phẩm của thương hiệu đó.

**Trạng thái:** thương hiệu chưa có sản phẩm → empty state; thương hiệu đã ẩn → 404 thân thiện (FR-048 tương tự).

**API:** `GET /brands`, `GET /brands/{slug}`, `GET /brands/{slug}/products`.

---

## Mẫu 4 — Trang chọn xe và phụ tùng theo xe (`/vehicles`, `/vehicles/<make-slug>`, `/vehicles/<make-slug>/<model-slug>`)

**Mục đích (FR-021 → FR-026, FR-030):** chọn xe theo thứ tự hãng → dòng → đời; liệt kê phụ tùng tương thích với xe đó.

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER (dùng chung — bộ chọn xe hiển thị xe đã chọn)             │
├──────────────────────────────────────────────────────────────────┤
│ [/vehicles] CHỌN HÃNG XE                                         │
│  [Logo + Tên hãng × N] (bấm vào → /vehicles/<make-slug>)         │
│                                                                  │
│ [/vehicles/<make-slug>] CHỌN DÒNG XE                             │
│ Breadcrumb: Trang chủ / Tìm theo xe / <Hãng>                     │
│ [Logo + Tên hãng] [Danh sách dòng xe × N]                        │
│  (bấm dòng → mở bộ chọn đời xe)                                  │
│                                                                  │
│ [/vehicles/<make-slug>/<model-slug>] PHỤ TÙNG THEO XE            │
│ Breadcrumb: Trang chủ / Tìm theo xe / <Hãng> / <Dòng>            │
│ [Thông tin xe: Hãng — Dòng — Đời đã chọn ▾ (đổi)]                │
│ [Lọc: danh mục / thương hiệu / khoảng giá] [Sắp xếp ▾]           │
│ LƯỚI PHỤ TÙNG TƯƠNG THÍCH (như mẫu 2)                            │
│ [Phân trang]                                                     │
│ (Xe chưa có dữ liệu fitment → thông báo rõ + gợi ý liên hệ       │
│  Zalo/hotline, không hiển thị danh sách trống gây hiểu lầm)      │
├──────────────────────────────────────────────────────────────────┤
│ FOOTER (dùng chung)                                              │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:** chọn hãng/dòng/đời bằng dropdown xếp chồng hoặc modal chọn xe 3 bước; lưới phụ tùng 2 cột.

**Tương tác:** chọn hãng → chỉ hiện dòng của hãng đó; chọn dòng → chỉ hiện đời của dòng đó (FR-024); xe đã chọn ghi nhớ trong phiên, sang catalogue vẫn giữ (FR-025); bấm một phụ tùng → trang chi tiết của nó; từ trang chi tiết có thể quay lại trang xe (tra cứu ngược, FR-030).

**Trạng thái:** hãng/dòng/đời chưa có trong hệ thống → thông báo rõ + gợi ý liên hệ (PRD 6.1); xe chưa có fitment → thông báo rõ, không hiển thị danh sách trống.

**Ghi chú PD-06 (PENDING):** bộ chọn đời xe hiển thị theo dữ liệu có; lọc theo thế hệ/phiên bản chỉ áp dụng khi dữ liệu có và được chốt. Không tự chốt quy tắc năm/đời.

**API:** `GET /vehicles/makes`, `GET /vehicles/makes/{slug}`, `GET /vehicles/makes/{slug}/models`, `GET /vehicles/models/{slug}/generations`, `GET /vehicles/{makeSlug}/{modelSlug}`, `GET /vehicle-applications/{applicationId}/products`.

---

## Mẫu 5 — Trang kết quả tìm kiếm (`/search?q=...`)

**Mục đích (FR-034 → FR-041):** trả kết quả theo thứ tự ưu tiên ADR-010; hỗ trợ tìm theo tên, SKU, OEM, mã nhà sản xuất, thương hiệu.

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER (dùng chung — ô tìm kiếm giữ lại từ khóa đã nhập)         │
├──────────────────────────────────────────────────────────────────┤
│ [H1: Kết quả tìm kiếm cho "<từ khóa>"]                           │
│ [Ô tìm kiếm (sửa lại từ khóa)] [Gợi ý khi gõ ▾]                 │
│ [Lọc: danh mục / thương hiệu / tương thích xe] [Sắp xếp ▾]       │
│                                                                  │
│ KẾT QUẢ (theo thứ tự ưu tiên ADR-010)                            │
│  1. Khớp SKU chính xác (nếu có) — gắn nhãn "Khớp mã SKU"         │
│  2. Khớp OEM chính xác — gắn nhãn "Khớp mã OEM"                  │
│  3. Khớp mã nhà sản xuất                                         │
│  4. Khớp tên / thương hiệu                                       │
│  5. Gần đúng (không áp dụng fuzzy mạnh với mã OEM — FR-036)      │
│  [Ảnh | Tên | Mã (ghi rõ loại mã) | Thương hiệu | Giá | Tình     │
│   trạng] × N (bấm vào → /products/<slug>)                        │
│ [Phân trang]                                                     │
│                                                                  │
│ KHÔNG CÓ KẾT QUẢ (khi không tìm thấy)                            │
│  [Thông báo: Không tìm thấy sản phẩm cho "<từ khóa>"]            │
│  [Gợi ý 1: Kiểm tra lại mã (chú ý từng ký tự)]                   │
│  [Gợi ý 2: Thử tìm theo tên sản phẩm]                            │
│  [Gợi ý 3: Liên hệ Zalo/hotline 0886706338 kèm mã cần tìm]       │
├──────────────────────────────────────────────────────────────────┤
│ FOOTER (dùng chung)                                              │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:** lọc thành drawer; kết quả xếp dọc; trạng thái không có kết quả giữ đủ 3 gợi ý.

**Tương tác:** gợi ý khi gõ < 1s, chọn bằng chuột và bàn phím (FR-037); tìm bằng mỗi loại mã/từ khóa → trả kết quả đúng loại (FR-034); đã chọn xe → sản phẩm tương thích xe đã chọn xếp trước (FR-039); mã OEM sai 1 ký tự → không trả sản phẩm đó ở vị trí kết quả chính xác (FR-036).

**Trạng thái:** loading = skeleton; không có kết quả → 3 gợi ý trên, không thấy trang trắng (FR-040); lỗi tìm kiếm → error state + thử lại.

**API:** `GET /search`, `GET /search/suggest`, `GET /identifiers/lookup` (P0-PROVISIONAL — BLOCKED_BY_PD-02/PD-03/PD-04).

---

## Mẫu 6 — Trang chi tiết sản phẩm (`/products/<product-slug>`)

**Mục đích (FR-042 → FR-049):** trang quyết định mua — đủ thông tin để khách chắc chắn đây là đúng phụ tùng cho xe của mình.

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER (dùng chung — có bộ chọn xe)                              │
├──────────────────────────────────────────────────────────────────┤
│ Breadcrumb: Trang chủ / <đường tới> / <Tên sản phẩm>             │
├──────────────────────────────┬───────────────────────────────────┤
│ HÌNH ẢNH                    │ [H1: Tên sản phẩm]                │
│ [Ảnh lớn]                    │ [Thương hiệu → /brands/<slug>]    │
│ [Ảnh nhỏ × N] (bấm đổi ảnh)  │ [Giá] [Tình trạng: Còn hàng/Hết   │
│                              │  hàng] (P0: chỉ trạng thái,       │
│                              │  KHÔNG hiển thị số lượng tồn kho) │
│                              │                                   │
│                              │ MÃ SẢN PHẨM (ghi nhãn riêng       │
│                              │ từng loại — FR-043):              │
│                              │  SKU nội bộ: ...                  │
│                              │  Part Number: ...                 │
│                              │  OEM Number: ...                  │
│                              │  Mã thay thế: ...                 │
│                              │                                   │
│                              │ [Số lượng: − 1 +]                 │
│                              │ [Thêm vào giỏ →] (toast xác nhận)│
│                              │ [Liên hệ Zalo / Hotline]          │
├──────────────────────────────┴───────────────────────────────────┤
│ TƯƠNG THÍCH XE (FR-028, FR-029, FR-030, FR-031)                  │
│ [Xe đã chọn: ... — Tương thích ✓ / KHÔNG tương thích ⚠ — cảnh    │
│  báo rõ trước khi thêm vào giỏ]                                  │
│ [Danh sách xe tương thích × N — bấm vào → trang xe đó]           │
│ (Chưa có dữ liệu fitment → "Chưa có thông tin tương thích —      │
│  liên hệ để được tư vấn", không đoán xe tương thích)             │
├──────────────────────────────────────────────────────────────────┤
│ [Tab: Mô tả | Thông số kỹ thuật]                                │
│ [Mô tả sản phẩm] [Bảng thông số kỹ thuật]                        │
├──────────────────────────────────────────────────────────────────┤
│ SẢN PHẨM LIÊN QUAN / THAY THẾ (tiêu chí chờ Henry duyệt —        │
│  SITEMAP mục 7.3; chưa có → ẩn khu vực này)                      │
│  [Sản phẩm thật đã xuất bản × N]                                 │
├──────────────────────────────────────────────────────────────────┤
│ FOOTER (dùng chung)                                              │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:** ảnh → tên/giá/mã → nút thêm vào giỏ cố định dưới màn hình (sticky CTA) → tương thích xe → mô tả/thông số → sản phẩm liên quan. Nút "Thêm vào giỏ" luôn tiếp cận được khi cuộn.

**Tương tác:** bấm ảnh nhỏ đổi ảnh lớn (lightbox khi bấm ảnh lớn — modal, ADR-009); chọn số lượng; thêm vào giỏ → giỏ tăng đúng số lượng + toast xác nhận (FR-045); xe đã chọn không tương thích → cảnh báo rõ trước khi thêm vào giỏ (FR-029); bấm xe tương thích → trang xe đó (FR-030); bấm thương hiệu → trang thương hiệu.

**Trạng thái:** loading = skeleton; thiếu ảnh → ảnh placeholder, không vỡ layout (FR-042); sản phẩm bị ẩn/xóa, truy cập bằng URL cũ → 404 thân thiện + gợi ý sản phẩm/danh mục khác (FR-048).

**SEO:** title/description/canonical riêng theo sản phẩm (FR-049).

**API:** `GET /products/{productId}`, `GET /products/{productId}/fitments`, `GET /products/{productId}/related` (P0-PROVISIONAL), `GET /fitment/check`.

---

## Mẫu 7 — Giỏ hàng (`/cart`)

**Mục đích (FR-050 → FR-051):** xem/sửa giỏ trước khi đặt hàng.

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER (dùng chung)                                              │
├──────────────────────────────────────────────────────────────────┤
│ [H1: Giỏ hàng]                                                   │
├──────────────────────────────────────────────────────────────────┤
│ [Ảnh | Tên → /products/<slug> | SKU | Giá | Số lượng: − N + |   │
│  Thành tiền | Xóa (có xác nhận)] × N                             │
│                                                                  │
│ [Xóa toàn bộ giỏ (có xác nhận)]                                  │
│                                                                  │
│ TÓM TẮT ĐƠN (sidebar phải)                                       │
│  Tạm tính: ...                                                   │
│  (Phí vận chuyển: tính sau — P1, chưa có ở P0)                   │
│  Tổng tiền: ... (cập nhật theo thời gian thực)                   │
│  [→ Checkout] (giỏ trống → nút bị vô hiệu + thông báo)           │
│                                                                  │
│ GIỎ TRỐNG: [Thông báo + nút "Tiếp tục mua sắm" → /parts]         │
├──────────────────────────────────────────────────────────────────┤
│ FOOTER (dùng chung)                                              │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:** mỗi món xếp dọc (ảnh + tên + giá + số lượng + xóa); tóm tắt đơn xếp dưới danh sách; nút Checkout cố định dưới màn hình.

**Tương tác:** sửa số lượng → tổng tiền tính lại đúng (FR-050); xóa món → tổng tiền cập nhật; xóa toàn bộ → có xác nhận (toast/modal, ADR-009); giỏ lưu qua phiên — khách quay lại vẫn thấy giỏ (FR-051, cơ chế lưu do M02 quyết — API đã đánh dấu P0-PROVISIONAL).

**Trạng thái:** giỏ trống → empty state + nút tiếp tục mua sắm; sản phẩm trong giỏ bị admin ẩn/xóa hoặc đổi giá sau khi thêm → báo rõ trước khi xác nhận ở checkout (FR-057 — cảnh báo hiển thị ở mẫu 8).

**API:** `GET /cart`, `POST /cart/items`, `PATCH /cart/items/{itemId}`, `DELETE /cart/items/{itemId}`, `DELETE /cart` (tất cả P0-PROVISIONAL).

---

## Mẫu 8 — Checkout (`/checkout`)

**Mục đích (FR-052 → FR-053, FR-056 → FR-057):** nhập thông tin đặt hàng và chọn phương thức thanh toán. **D-08 PENDING** — danh sách trường bắt buộc dưới đây là ĐỀ XUẤT của M01-04, chờ Henry duyệt.

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER (dùng chung)                                              │
├──────────────────────────────────────────────────────────────────┤
│ [H1: Đặt hàng] [Bước: 1 Thông tin → 2 Thanh toán → 3 Xác nhận]   │
├──────────────────────────────┬───────────────────────────────────┤
│ THÔNG TIN NGƯỜI NHẬN         │ TÓM TẮT ĐƠN (sidebar phải)        │
│ (trường bắt buộc — ĐỀ XUẤT,  │  [Danh sách món + số lượng + giá] │
│  chờ Henry duyệt D-08):      │  Tạm tính: ...                    │
│  [Họ tên người nhận *]       │  Tổng tiền: ...                   │
│  [Số điện thoại *]           │                                   │
│  [Tỉnh/Thành phố * ▾]        │  (Sản phẩm trong giỏ bị đổi giá/  │
│  [Quận/Huyện * ▾]            │   ẩn sau khi thêm → cảnh báo rõ  │
│  [Địa chỉ chi tiết *]        │   + yêu cầu xác nhận lại — FR-057)│
│  [Ghi chú giao hàng]         │                                   │
│                              │                                   │
│ PHƯƠNG THỨC THANH TOÁN       │                                   │
│  ( ) COD — Thanh toán khi    │                                   │
│      nhận hàng               │                                   │
│  ( ) Chuyển khoản ngân hàng  │                                   │
│      (thông tin tài khoản    │                                   │
│      chờ Henry cung cấp)     │                                   │
│                              │                                   │
│ [Xác nhận đặt hàng →]        │                                   │
│ (Bỏ trống trường bắt buộc →  │                                   │
│  báo lỗi rõ từng trường,     │                                   │
│  không tạo đơn — FR-052)     │                                   │
├──────────────────────────────┴───────────────────────────────────┤
│ FOOTER (dùng chung)                                              │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:** form xếp dọc; tóm tắt đơn thu gọn thành khối có thể mở rộng; nút xác nhận cố định dưới màn hình.

**Tương tác:** chọn tỉnh → chỉ hiện quận/huyện của tỉnh đó (dropdown phụ thuộc, như bộ chọn xe); chọn phương thức thanh toán → hiển thị ghi chú tương ứng (COD: xác nhận chờ giao; chuyển khoản: sẽ hiển thị thông tin chuyển khoản ở trang xác nhận); bỏ trống trường bắt buộc → báo lỗi rõ từng trường, focus vào trường lỗi đầu tiên, không tạo đơn (FR-052); giỏ trống vào `/checkout` → chuyển về `/cart` kèm thông báo (FR-056).

**Trạng thái:** lỗi mạng khi đặt hàng → error state + nút thử lại; đặt hàng thành công → chuyển tới `/checkout/success` (mẫu 9).

**API:** `POST /orders` (P0-PROVISIONAL — BLOCKED_BY_D-08 ở mức trường bắt buộc chi tiết).

---

## Mẫu 9 — Xác nhận đơn hàng (`/checkout/success`)

**Mục đích (FR-054 → FR-055):** xác nhận đã đặt hàng thành công; hướng dẫn bước tiếp theo.

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER (dùng chung)                                              │
├──────────────────────────────────────────────────────────────────┤
│ [✓ Đặt hàng thành công!]                                        │
│ [Mã đơn hàng: <mã đơn — không đoán được, không phải số thứ tự>]  │
│                                                                  │
│ TÓM TẮT ĐƠN (snapshot — tên, SKU, giá, số lượng lúc đặt)         │
│  [Danh sách món] [Tổng tiền]                                     │
│                                                                  │
│ [Nếu COD:]                                                       │
│  Đơn của bạn đang chờ xác nhận từ SeeCar Auto.                   │
│  Cần hỗ trợ? Liên hệ Zalo/hotline 0886706338 kèm mã đơn.         │
│                                                                  │
│ [Nếu chuyển khoản:]                                              │
│  Vui lòng chuyển khoản theo thông tin dưới đây:                  │
│  [Ngân hàng / Số tài khoản / Chủ tài khoản — chờ Henry cung cấp] │
│  [Nội dung chuyển khoản: <mã đơn>]                               │
│  Đơn ở trạng thái chờ xác nhận cho tới khi SeeCar xác nhận       │
│  đã nhận tiền (P0, thủ công — FR-063).                           │
│                                                                  │
│ [Tra cứu đơn hàng → /orders/lookup] [Tiếp tục mua sắm → /parts]  │
├──────────────────────────────────────────────────────────────────┤
│ FOOTER (dùng chung)                                              │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:** xếp dọc; mã đơn hiển thị lớn, có nút sao chép mã đơn (kèm tooltip "Đã sao chép" — ADR-009).

**Tương tác:** nút sao chép mã đơn; bấm tra cứu đơn → `/orders/lookup` (mã đơn điền sẵn nếu đi từ trang này); bấm tiếp tục mua sắm → `/parts`.

**Trạng thái:** truy cập trực tiếp `/checkout/success` khi không có đơn vừa đặt → chuyển về `/` hoặc `/cart` kèm thông báo (không hiển thị trang xác nhận trống).

**API:** (đơn đã tạo bởi `POST /orders`; trang này không gọi API tạo mới).

---

## Mẫu 10 — Tra cứu đơn hàng (`/orders/lookup`)

**Mục đích (FR-058):** khách tra cứu trạng thái đơn bằng mã đơn công khai, không cần đăng nhập. **D-09 PENDING** — phương thức xác minh bổ sung chưa chốt; vị trí/luồng dự kiến dưới đây là ĐỀ XUẤT, không tự chốt OTP hay số điện thoại.

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER (dùng chung)                                              │
├──────────────────────────────────────────────────────────────────┤
│ [H1: Tra cứu đơn hàng]                                           │
│ [Mô tả: Nhập mã đơn hàng bạn nhận được sau khi đặt hàng.]        │
│                                                                  │
│ [Ô nhập mã đơn: ______________] [Tra cứu →]                      │
│ (Nhập mã sai → "Không tìm thấy đơn hàng với mã này." —          │
│  không lộ thông tin đơn khác; gửi nhiều lần liên tiếp bất        │
│  thường → bị chặn tạm thời, báo rõ — FR-058)                     │
│                                                                  │
│ [BƯỚC XÁC MINH BỔ SUNG — VỊ TRÍ DỰ KIẾN, CHỜ HENRY QUYẾT D-09]   │
│  (Chỉ hiển thị khi Henry đã chọn phương thức xác minh.           │
│   Phương thức có thể là số điện thoại / OTP / khác — chưa chốt.  │
│   M01-04 không tự chốt phương thức nào.)                         │
│                                                                  │
│ KẾT QUẢ TRA CỨU (sau khi nhập mã đúng)                           │
│  [Mã đơn] [Trạng thái đơn: Mới đặt / Đã xác nhận / Đang giao /   │
│   Hoàn tất / Đã hủy — tên trạng thái cuối cùng do M05 chốt]      │
│  [Tóm tắt không nhạy cảm: số món, tổng tiền, phương thức thanh   │
│   toán, ngày đặt]                                                │
│  (KHÔNG hiển thị: họ tên đầy đủ, số điện thoại, địa chỉ chi      │
│   tiết, hay chi tiết đơn của người khác — FR-058)                │
│  [Cần hỗ trợ? Liên hệ Zalo/hotline 0886706338 kèm mã đơn.]       │
├──────────────────────────────────────────────────────────────────┤
│ FOOTER (dùng chung)                                              │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:** form và kết quả xếp dọc; ô nhập mã đơn lớn, dễ nhập trên điện thoại.

**Tương tác:** nhập mã đơn → tra cứu; mã đúng → hiện trạng thái + tóm tắt không nhạy cảm; mã sai → báo không tìm thấy, không lộ thông tin đơn khác; mã đoán được (số thứ tự liên tục, mã đơn của đơn khác) → không truy cập được đơn nào; rate limit khi gửi nhiều lần bất thường (FR-058).

**Trạng thái:** lỗi mạng → error state + thử lại; chưa nhập mã → chỉ hiển thị form, không hiển thị kết quả trống.

**API:** `GET /orders/lookup` (P0-PROVISIONAL — BLOCKED_BY_D-09 ở mức phương thức xác minh bổ sung).

---

## Mẫu 11 — Blog listing (`/blog`)

**Mục đích (FR-067):** liệt kê bài viết đã xuất bản.

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER (dùng chung)                                              │
├──────────────────────────────────────────────────────────────────┤
│ Breadcrumb: Trang chủ / Blog                                     │
│ [H1: Blog — Hướng dẫn & chia sẻ]                                 │
│ [Lọc theo chuyên mục ▾] (nếu có chuyên mục)                      │
│                                                                  │
│ DANH SÁCH BÀI VIẾT                                               │
│  [Ảnh đại diện | Tiêu đề | Mô tả ngắn | Ngày đăng | Chuyên mục]  │
│  × N (bấm vào → /blog/<post-slug>)                               │
│ [Phân trang]                                                     │
│                                                                  │
│ (Chưa có bài viết → empty state: "Chưa có bài viết nào.";        │
│  khu vực bài viết ở homepage bị ẩn — FR-004)                     │
├──────────────────────────────────────────────────────────────────┤
│ FOOTER (dùng chung)                                              │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:** bài viết xếp dọc; ảnh đại diện thu nhỏ trên cùng.

**Tương tác:** bấm bài viết → đúng URL `/blog/<slug>`; lọc theo chuyên mục (nếu có).

**Trạng thái:** loading = skeleton; chưa có bài → empty state; lỗi tải → error state + thử lại.

**API:** `GET /articles`.

---

## Mẫu 12 — Blog detail (`/blog/<post-slug>`)

**Mục đích (FR-068, FR-074):** đọc một bài viết; SEO riêng theo bài.

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER (dùng chung)                                              │
├──────────────────────────────────────────────────────────────────┤
│ Breadcrumb: Trang chủ / Blog / <Tiêu đề bài viết>                │
│ [H1: Tiêu đề bài viết]                                           │
│ [Ngày đăng | Chuyên mục]                                         │
│ [Ảnh đại diện]                                                   │
│ [Nội dung bài viết — tiêu đề phụ, đoạn văn, danh sách, hình ảnh] │
│                                                                  │
│ [Bài viết liên quan (nếu có) × N → /blog/<slug>]                 │
│ [Chia sẻ] [Liên hệ Zalo/hotline 0886706338 để được tư vấn]       │
├──────────────────────────────────────────────────────────────────┤
│ FOOTER (dùng chung)                                              │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:** nội dung xếp dọc; tiêu đề và ảnh full-width.

**Tương tác:** bấm bài viết liên quan → bài đó; nút chia sẻ (sao chép liên kết — toast "Đã sao chép").

**Trạng thái:** bài viết chưa xuất bản (nháp) → 404; bài đã xuất bản nhưng đổi tiêu đề → URL giữ nguyên (FR-068).

**SEO:** title/description/canonical riêng theo bài (FR-074).

**API:** `GET /articles/{slug}`.

---

## Mẫu 13 — Liên hệ và trang 404

### 13a. Contact (`/contact`)

**Mục đích (FR-087 → FR-089):** khách liên hệ tư vấn hoặc hỗ trợ.

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER (dùng chung)                                              │
├──────────────────────────────────────────────────────────────────┤
│ [H1: Liên hệ SeeCar Auto]                                        │
├──────────────────────────────┬───────────────────────────────────┤
│ THÔNG TIN LIÊN HỆ            │ FORM LIÊN HỆ                      │
│ [Hotline/Zalo: 0886706338]   │ [Họ tên *]                        │
│  (bấm vào mở Zalo/điện thoại │ [Số điện thoại *]                 │
│   theo thiết bị — FR-005)    │ [Nội dung *]                      │
│ [Fanpage Facebook →]         │ [Gửi liên hệ →]                   │
│ [Địa chỉ — chờ Henry cung    │ (Gửi thành công → toast xác nhận; │
│  cấp, không tự bịa]          │  gửi lỗi → báo rõ + thử lại)     │
│ [Giờ làm việc — chờ Henry    │                                   │
│  cung cấp]                   │ (Đích nhận form — email hay lưu  │
│                              │  vào hệ thống — do M01-04/M05     │
│                              │  chốt theo Henry duyệt)           │
├──────────────────────────────┴───────────────────────────────────┤
│ FOOTER (dùng chung)                                              │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:** thông tin liên hệ xếp trên, form xếp dưới; nút gọi/Zalo cố định dễ bấm.

**Tương tác:** bấm số điện thoại → mở trình quay số / Zalo theo thiết bị; gửi form → toast xác nhận (không dùng `alert()`); bỏ trống trường bắt buộc → báo lỗi rõ từng trường.

**API:** `POST /contact` (P0-PROVISIONAL — đích nhận do M01-04/M05 chốt).

### 13b. Trang 404 (template lỗi, không có URL riêng)

**Mục đích (FR-048):** báo rõ trang không tồn tại và dẫn khách quay lại.

**Desktop:**

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER (dùng chung)                                              │
├──────────────────────────────────────────────────────────────────┤
│ [404 — Không tìm thấy trang]                                     │
│ [Mô tả: Trang bạn tìm kiếm không tồn tại hoặc đã được chuyển.]   │
│ [Ô tìm kiếm]                                                     │
│ [Gợi ý: Danh mục phụ tùng | Thương hiệu | Tìm theo xe]           │
│ [Về trang chủ → /]                                               │
│ [Liên hệ Zalo/hotline 0886706338 để được hỗ trợ]                 │
├──────────────────────────────────────────────────────────────────┤
│ FOOTER (dùng chung)                                              │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile:**

```
┌──────────────────────────────┐
│ HEADER (thu gọn — logo, ô    │
│ tìm kiếm, giỏ, menu ☰)       │
├──────────────────────────────┤
│ [404 — Không tìm thấy trang] │
│ [Mô tả ngắn: Trang bạn tìm   │
│  kiếm không tồn tại hoặc đã  │
│  được chuyển.]               │
│ [Ô tìm kiếm (full-width)]    │
│ [Gợi ý — xếp dọc, nút lớn:   │
│  Danh mục phụ tùng → /parts] │
│ [Thương hiệu → /brands]      │
│ [Tìm theo xe → /vehicles]    │
│ [Về trang chủ → /] (nút      │
│  chính, full-width)          │
│ [Liên hệ Zalo/hotline        │
│  0886706338 — nút gọi/Zalo   │
│  full-width, dễ bấm]         │
├──────────────────────────────┤
│ FOOTER (thu gọn)             │
└──────────────────────────────┘
```

**Bố cục Mobile (ghi chú):** mọi thành phần xếp dọc theo chiều rộng màn hình; các nút và liên kết gợi ý dùng kích thước chạm đủ lớn (full-width hoặc gần full-width), không tràn ngang, không cần cuộn ngang; ô tìm kiếm full-width; nút "Về trang chủ" và nút liên hệ Zalo/hotline là hai CTA chính, đặt cuối khối nội dung để dễ bấm bằng một tay.

**Áp dụng khi:** URL sản phẩm/danh mục/thương hiệu/bài viết đã ẩn/xóa; URL gõ sai; liên kết cũ đã đổi (khi chưa có redirect 301).

**Trạng thái lỗi chung (500 / lỗi tải dữ liệu):** thông báo lỗi rõ ràng + nút thử lại + liên hệ hỗ trợ khi lỗi kéo dài (UI_UX_STANDARDS mục 1.5); không hiển thị trang trắng.

---

## Ghi chú cuối

- **Đếm mẫu trang:** 13 mẫu, 14 bề mặt (mẫu 13 gồm 2 bề mặt: 13a Contact và 13b 404); mỗi bề mặt có bố cục Desktop + Mobile — tổng 14 khối Desktop + 14 khối Mobile. Đủ 13 mẫu theo brief M01-04 §2.6 AC-12; mọi trang trong SITEMAP.md mục 2 đều có wireframe tương ứng (trang 404 và trạng thái lỗi chung nằm trong mẫu 13b).
- **Chưa phải thiết kế đồ họa:** màu sắc, font, hình ảnh thật và chi tiết visual thuộc M01-06 (nghiên cứu UI/UX, trình Henry duyệt trước khi triển khai — UI_UX_STANDARDS mục 3).
- **Không triển khai frontend trong task này:** wireframe chỉ là tài liệu thiết kế; code frontend thuộc các milestone sau.
- **Lịch sử revision:** v0.1 (bản đầu) 26/11/2026 — IN_REVIEW, chờ ChatGPT review.
