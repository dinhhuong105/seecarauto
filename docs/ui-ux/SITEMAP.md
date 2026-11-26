# Sitemap — SeeCar Auto

| Trường | Nội dung |
| --- | --- |
| Task | M01-04 — Sitemap và Wireframe |
| Milestone | M01 — Architecture & UI/UX |
| Trạng thái | IN_REVIEW (bản đầu — chờ ChatGPT review) |
| Dựa trên | PRD (M01-01 DONE), SRS (M01-01 DONE), ERD (M01-02 DONE), API Specification (M01-03 DONE, 15/15 AC), ADR-004 (URL tiếng Anh), ADR-009 + UI_UX_STANDARDS (modal/toast/tooltip/loading/empty/error) |
| Phạm vi | Website khách hàng (customer-facing) — KHÔNG bao gồm Admin Dashboard (thuộc M01-05) |

## Quy ước đọc tài liệu này

- **Ví dụ minh họa, không phải dữ liệu thật.** Mọi tên hãng xe, dòng xe, danh mục, thương hiệu, sản phẩm và mã trong tài liệu này đều lấy từ ADR-004/PRD (ví dụ: hãng Toyota, dòng Vios, danh mục engine, thương hiệu Aisin, sản phẩm water-pump-aisin, mã OEM định dạng 16100-0Y010) — chỉ là ví dụ về định dạng, KHÔNG phải dữ liệu thật đã chốt. Dữ liệu thật do Henry cung cấp hoặc nhập ở M04 (D-02, D-03). Không bịa danh sách hãng/dòng/đời, danh mục, sản phẩm hay giá trong tài liệu này.
- **URL đề xuất bởi M01-04** được đánh dấu `(đề xuất M01-04)`: PRD/API yêu cầu có trang đó nhưng chưa đặt URL cụ thể. URL theo ADR-004 vẫn là quyết định của Henry (ADR-004 đã duyệt); M01-04 chỉ đề xuất URL còn thiếu, không tự chốt quy tắc URL mới.
- **P0 / P1 / P2** theo PRD mục 5. Không tự nâng P1/P2 thành P0.
- **PENDING (D-08, D-09, PD-02 → PD-09):** các điểm chưa được Henry quyết định được thể hiện thành đề xuất hoặc ghi chú cần xác nhận trong tài liệu này, KHÔNG tự biến thành business rule. Xem mục 7.
- **Liên hệ đã xác minh:** hotline/Zalo **0886706338**; fanpage https://www.facebook.com/profile.php?id=61597072672914 (PRD 4.13).

## 1. Tổng quan kiến trúc

Website khách hàng có 4 nhóm điều hướng chính, xuất phát từ Homepage (`/`):

1. **Tìm theo xe** — `/vehicles` → hãng → dòng → đời → trang phụ tùng theo xe (`/vehicles/<make-slug>/<model-slug>`).
2. **Duyệt catalogue** — `/parts` → danh mục (`/parts/<category-slug>`) và thương hiệu (`/brands`, `/brands/<brand-slug>`).
3. **Tìm theo mã/từ khóa** — ô tìm kiếm toàn website → `/search` (SKU → OEM → mã nhà sản xuất → tên/thương hiệu → gần đúng, theo ADR-010; không fuzzy mạnh với mã OEM).
4. **Mua hàng** — trang chi tiết sản phẩm (`/products/<product-slug>`) → giỏ (`/cart`) → checkout (`/checkout`) → xác nhận (`/checkout/success`) → tra cứu đơn (`/orders/lookup`).

Hai nhóm phụ: **Nội dung** (`/blog`, `/blog/<post-slug>`) và **Liên hệ** (`/contact`, hotline/Zalo, fanpage). Hệ thống: trang 404 và trạng thái lỗi (không có URL riêng).

Xe đã chọn được ghi nhớ trong phiên (FR-025) và hiển thị trong header/bộ chọn xe trên toàn website để lọc phụ tùng tương thích.

## 2. Bảng sitemap — toàn bộ trang

Cột **SEO**: `index` = cho phép index (title/description/canonical riêng); `noindex` = chặn index (trang giao dịch, trang tham số, trang lỗi). Cột **API** liệt kê endpoint chính phục vụ trang (theo API Specification M01-03 §10; trạng thái P0-PROVISIONAL được ghi rõ).

### 2.1 Trang chủ

| # | Tên trang | URL | URL cha | P | Mục đích và nhóm người dùng | Nội dung / thành phần chính | SEO | FR | API liên quan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Homepage | `/` | — | P0 | Đón khách trong vài giây đầu; dẫn tới 3 lối tìm phụ tùng (theo xe, theo danh mục, theo mã) và kênh liên hệ. Nhóm: khách lẻ, gara | Hero + ô tìm kiếm lớn; bộ chọn xe (hãng → dòng → đời); danh mục phụ tùng; thương hiệu; sản phẩm gợi ý; bài viết mới; hotline/Zalo; footer đầy đủ | index | FR-001 → FR-006 | `GET /api/v1/products` (gợi ý), `GET /api/v1/categories`, `GET /api/v1/brands`, `GET /api/v1/articles` |

### 2.2 Catalogue — danh mục và thương hiệu

| # | Tên trang | URL | URL cha | P | Mục đích và nhóm người dùng | Nội dung / thành phần chính | SEO | FR | API liên quan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | Catalogue — tất cả sản phẩm | `/parts` | `/` | P0 | Danh sách toàn bộ sản phẩm có lọc/sắp xếp/phân trang (quy mô 2.000–10.000 SKU). Nhóm: khách lẻ, gara | Lưới sản phẩm; lọc (danh mục, thương hiệu, khoảng giá, tình trạng, tương thích xe đã chọn); sắp xếp; phân trang; bộ chọn xe | index | FR-007 → FR-012 | `GET /api/v1/products` |
| 3 | Trang danh mục | `/parts/<category-slug>` | `/parts` | P0 | Danh sách sản phẩm của một danh mục (nhiều cấp: danh mục cha–con). Nhóm: khách lẻ, gara | Tiêu đề + mô tả danh mục; cây danh mục con; lưới sản phẩm của danh mục; lọc/sắp xếp/phân trang như `/parts`; breadcrumb | index (canonical riêng theo danh mục) | FR-007 → FR-012, FR-015 → FR-020 | `GET /api/v1/categories/{slug}`, `GET /api/v1/categories/{slug}/products` |
| 4 | Danh sách thương hiệu | `/brands` | `/` | P0 | Liệt kê toàn bộ thương hiệu phụ tùng đang hiển thị. Nhóm: khách lẻ, gara | Lưới thương hiệu (logo + tên); bấm vào đi tới trang thương hiệu | index | FR-002, FR-016 | `GET /api/v1/brands` |
| 5 | Trang thương hiệu | `/brands/<brand-slug>` | `/brands` | P0 | Danh sách sản phẩm của một thương hiệu. Nhóm: khách lẻ, gara | Logo + tên + mô tả thương hiệu; lưới sản phẩm của thương hiệu; lọc/sắp xếp/phân trang | index (canonical riêng theo thương hiệu) | FR-016 | `GET /api/v1/brands/{slug}`, `GET /api/v1/brands/{slug}/products` |

### 2.3 Tra cứu xe và fitment

| # | Tên trang | URL | URL cha | P | Mục đích và nhóm người dùng | Nội dung / thành phần chính | SEO | FR | API liên quan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 6 | Danh sách hãng xe | `/vehicles` (đề xuất M01-04) | `/` | P0 | Liệt kê hãng xe để bắt đầu hành trình tìm theo xe. Nhóm: khách lẻ, gara | Lưới hãng xe (logo + tên); bấm vào đi tới trang hãng | index | FR-021, FR-024 | `GET /api/v1/vehicles/makes` |
| 7 | Trang hãng xe — dòng xe | `/vehicles/<make-slug>` (đề xuất M01-04) | `/vehicles` | P0 | Liệt kê dòng xe của một hãng; chọn dòng → chọn đời. Nhóm: khách lẻ, gara | Tên + logo hãng; danh sách dòng xe; bộ chọn đời xe theo dòng | index (canonical riêng theo hãng) | FR-021, FR-022, FR-024 | `GET /api/v1/vehicles/makes/{slug}`, `GET /api/v1/vehicles/makes/{slug}/models` |
| 8 | Trang xe — phụ tùng theo xe | `/vehicles/<make-slug>/<model-slug>` | `/vehicles/<make-slug>` | P0 | Liệt kê phụ tùng tương thích với một xe (mức dòng xe; lọc thêm theo đời/thế hệ/phiên bản khi dữ liệu có). Nhóm: khách lẻ, gara | Thông tin xe (hãng, dòng, đời đã chọn); lưới phụ tùng tương thích; lọc theo danh mục/thương hiệu; bộ chọn đời xe; ghi chú "chưa có fitment" khi xe chưa có dữ liệu | index (canonical riêng theo xe) | FR-023, FR-024, FR-025, FR-030 | `GET /api/v1/vehicles/{makeSlug}/{modelSlug}`, `GET /api/v1/vehicle-applications/{applicationId}/products`, `GET /api/v1/vehicles/models/{slug}/generations` |

**Ghi chú về đời xe (PD-06, PENDING):** mức chi tiết tối thiểu của fitment (dòng + đời hay dòng + đời + phiên bản) chưa được Henry chốt (PD-06). Trang xe hiển thị bộ chọn đời xe; việc lọc theo thế hệ/phiên bản chỉ áp dụng khi dữ liệu có và được M01-02/M04 chốt. Không tự chốt quy tắc năm/đời trong tài liệu này.

### 2.4 Tìm kiếm

| # | Tên trang | URL | URL cha | P | Mục đích và nhóm người dùng | Nội dung / thành phần chính | SEO | FR | API liên quan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 9 | Kết quả tìm kiếm | `/search?q=<từ khóa>` | `/` | P0 | Trả kết quả theo thứ tự ưu tiên ADR-010; hỗ trợ tìm theo tên, SKU, OEM, mã nhà sản xuất, thương hiệu. Nhóm: khách lẻ (đặc biệt là gara đã có mã) | Ô tìm kiếm (giữ lại từ khóa); gợi ý khi gõ; lưới kết quả theo thứ tự ưu tiên; lọc (danh mục, thương hiệu, tương thích xe); sắp xếp; trạng thái không có kết quả với 3 gợi ý (kiểm tra lại mã, thử tìm theo tên, liên hệ Zalo/hotline kèm mã) | noindex (URL có tham số, nội dung trùng lặp) | FR-034 → FR-041 | `GET /api/v1/search`, `GET /api/v1/search/suggest`, `GET /api/v1/identifiers/lookup` (P0-PROVISIONAL — BLOCKED_BY_PD-02/PD-03/PD-04) |

### 2.5 Sản phẩm

| # | Tên trang | URL | URL cha | P | Mục đích và nhóm người dùng | Nội dung / thành phần chính | SEO | FR | API liên quan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | Chi tiết sản phẩm | `/products/<product-slug>` | `/parts` (breadcrumb thay đổi theo đường tới: danh mục / thương hiệu / xe / tìm kiếm) | P0 | Trang quyết định mua: đủ thông tin để khách chắc chắn đây là đúng phụ tùng cho xe của mình. Nhóm: khách lẻ, gara | Tên; 4 loại mã ghi nhãn riêng (SKU nội bộ / Part Number / OEM Number / mã thay thế); thương hiệu; hình ảnh (nhiều ảnh); thông số; mô tả; giá; tình trạng còn hàng; danh sách xe tương thích + cảnh báo không tương thích với xe đã chọn; sản phẩm liên quan/thay thế; nút thêm vào giỏ (chọn số lượng); nút liên hệ Zalo/hotline | index (title/description/canonical riêng theo sản phẩm) | FR-042 → FR-049 | `GET /api/v1/products/{productId}`, `GET /api/v1/products/{productId}/fitments`, `GET /api/v1/products/{productId}/related` (P0-PROVISIONAL — tiêu chí liên quan chờ Henry duyệt), `GET /api/v1/fitment/check` |

### 2.6 Giỏ hàng, đặt hàng, tra cứu đơn

| # | Tên trang | URL | URL cha | P | Mục đích và nhóm người dùng | Nội dung / thành phần chính | SEO | FR | API liên quan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 11 | Giỏ hàng | `/cart` | `/` | P0 | Xem/sửa giỏ trước khi đặt hàng. Nhóm: khách lẻ, gara | Danh sách món (ảnh, tên, mã SKU, giá, số lượng sửa được, xóa từng món/xóa toàn bộ); tổng tiền theo thời gian thực; nút tới checkout; trạng thái giỏ trống | noindex (trang giao dịch) | FR-050 → FR-051 | `GET /api/v1/cart`, `POST /api/v1/cart/items`, `PATCH /api/v1/cart/items/{itemId}`, `DELETE /api/v1/cart/items/{itemId}`, `DELETE /api/v1/cart` (tất cả P0-PROVISIONAL — cơ chế lưu do M02 quyết) |
| 12 | Checkout | `/checkout` | `/cart` | P0 | Nhập thông tin đặt hàng và chọn phương thức thanh toán. Nhóm: khách lẻ, gara | Tóm tắt đơn; form thông tin người nhận + địa chỉ giao hàng (danh sách trường bắt buộc là ĐỀ XUẤT — xem mục 7, D-08 PENDING); chọn COD hoặc chuyển khoản (chỉ 2 phương thức ở P0); nút xác nhận đặt hàng; báo lỗi rõ từng trường; chặn vào checkout khi giỏ trống (chuyển về `/cart`) | noindex (trang giao dịch) | FR-052 → FR-053, FR-056 → FR-057 | `POST /api/v1/orders` (P0-PROVISIONAL — BLOCKED_BY_D-08 ở mức trường bắt buộc chi tiết) |
| 13 | Xác nhận đơn hàng | `/checkout/success` (đề xuất M01-04) | `/checkout` | P0 | Xác nhận đã đặt hàng thành công; hướng dẫn bước tiếp theo. Nhóm: khách lẻ, gara | Mã đơn hàng; tóm tắt đơn (snapshot); với chuyển khoản: thông tin chuyển khoản + nội dung chuyển khoản chứa mã đơn; với COD: xác nhận chờ giao; nút tra cứu đơn; nút liên hệ Zalo/hotline theo mã đơn | noindex (trang giao dịch, chứa mã đơn) | FR-054 → FR-055 | (đơn đã tạo bởi `POST /api/v1/orders`; trang này không gọi API tạo mới) |
| 14 | Tra cứu đơn hàng | `/orders/lookup` (đề xuất M01-04) | `/` | P0 | Khách tra cứu trạng thái đơn bằng mã đơn công khai, không cần đăng nhập. Nhóm: khách lẻ, gara | Form nhập mã đơn; kết quả: trạng thái đơn + tóm tắt không nhạy cảm (không lộ thông tin cá nhân hay chi tiết đơn của người khác); vị trí/luồng xác minh bổ sung là ĐỀ XUẤT — xem mục 7 (D-09 PENDING); rate limit; báo "không tìm thấy" khi mã sai | noindex (trang giao dịch) | FR-058 | `GET /api/v1/orders/lookup` (P0-PROVISIONAL — BLOCKED_BY_D-09 ở mức phương thức xác minh bổ sung) |

### 2.7 Nội dung và liên hệ

| # | Tên trang | URL | URL cha | P | Mục đích và nhóm người dùng | Nội dung / thành phần chính | SEO | FR | API liên quan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 15 | Blog — danh sách bài viết | `/blog` | `/` | P0 | Liệt kê bài viết đã xuất bản (hướng dẫn chọn phụ tùng, chia sẻ kiến thức). Nhóm: khách lẻ | Danh sách bài viết (tiêu đề, mô tả ngắn, ngày đăng, chuyên mục); phân trang; chưa có bài → ẩn khu vực bài viết ở homepage, trang `/blog` hiển thị empty state | index | FR-067 | `GET /api/v1/articles` |
| 16 | Blog — chi tiết bài viết | `/blog/<post-slug>` | `/blog` | P0 | Đọc một bài viết; SEO riêng theo bài. Nhóm: khách lẻ | Tiêu đề, nội dung, chuyên mục, ngày đăng; SEO metadata (title/description/canonical); bài viết liên quan (nếu có); nút chia sẻ/liên hệ | index (title/description/canonical riêng theo bài) | FR-068, FR-074 | `GET /api/v1/articles/{slug}` |
| 17 | Liên hệ | `/contact` | `/` | P0 | Khách liên hệ tư vấn hoặc hỗ trợ. Nhóm: khách lẻ, gara | Hotline/Zalo 0886706338; liên kết fanpage; form liên hệ (tên, số điện thoại, nội dung — đích nhận form do M01-04/M05 chốt theo Henry duyệt, xem mục 7); giờ làm việc (chờ Henry cung cấp — không tự bịa) | index | FR-087 → FR-089 | `POST /api/v1/contact` (P0-PROVISIONAL — đích nhận do M01-04/M05 chốt) |

### 2.8 Hệ thống

| # | Tên trang | URL | URL cha | P | Mục đích và nhóm người dùng | Nội dung / thành phần chính | SEO | FR | API liên quan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 18 | Trang 404 | (không có URL riêng — template lỗi) | — | P0 | Báo rõ trang không tồn tại và dẫn khách quay lại. Nhóm: mọi người dùng | Thông báo rõ ràng; ô tìm kiếm; gợi ý danh mục/sản phẩm; nút về Homepage; nút liên hệ Zalo/hotline | noindex | FR-048 | — |
| 19 | Trang lỗi chung (500 / lỗi tải dữ liệu) | (không có URL riêng — trạng thái lỗi) | — | P0 | Báo lỗi tải dữ liệu với nút thử lại, theo UI_UX_STANDARDS mục 1.5. Nhóm: mọi người dùng | Thông báo lỗi rõ ràng; nút thử lại; liên hệ hỗ trợ khi lỗi kéo dài | noindex | FR-006 | — |

## 3. Điều hướng toàn website

### 3.1 Header (desktop + mobile)

- Logo SeeCar Auto (về `/`) — bên trái.
- Ô tìm kiếm toàn website (FR-034) — giữa header desktop; trên mobile nằm dưới header chính, luôn hiển thị.
- Bộ chọn xe (FR-024, FR-025) — hiển thị xe đã chọn (hoặc "Chọn xe của bạn"); bấm mở dropdown/modal chọn hãng → dòng → đời; xe đã chọn ghi nhớ trong phiên.
- Điều hướng chính: Danh mục (`/parts`), Thương hiệu (`/brands`), Tìm theo xe (`/vehicles`), Blog (`/blog`), Tra cứu đơn (`/orders/lookup`), Liên hệ (`/contact`).
- Giỏ hàng (`/cart`) với số lượng món — bên phải; bấm vào đi tới `/cart`.
- Hotline/Zalo 0886706338 — hiển thị ở header (desktop) và trong menu mobile.
- Mobile: menu hamburger mở navigation; ô tìm kiếm và bộ chọn xe vẫn tiếp cận được trong 1 chạm.

### 3.2 Footer

- Nhóm liên kết: Danh mục (`/parts`), Thương hiệu (`/brands`), Tìm theo xe (`/vehicles`), Blog (`/blog`).
- Nhóm hỗ trợ: Tra cứu đơn (`/orders/lookup`), Liên hệ (`/contact`), hotline/Zalo 0886706338, fanpage.
- Thông tin doanh nghiệp: tên, địa chỉ, mã số thuế — **chờ Henry cung cấp, không tự bịa**; khu vực này hiển thị ghi chú "đang cập nhật" cho tới khi có dữ liệu thật.
- Bản quyền + liên kết chính sách: chính sách đổi trả / vận chuyển / thanh toán — **nội dung chờ Henry duyệt (D-08)**; footer chỉ đặt vị trí liên kết, không tự tạo nội dung chính sách.

### 3.3 Breadcrumb

- Trang danh mục: `Trang chủ / Phụ tùng / <Tên danh mục>` (cấp con lồng thêm từng cấp).
- Trang thương hiệu: `Trang chủ / Thương hiệu / <Tên thương hiệu>`.
- Trang xe: `Trang chủ / Tìm theo xe / <Hãng> / <Dòng>`.
- Trang chi tiết sản phẩm: `Trang chủ / <đường tới: danh mục | thương hiệu | xe | tìm kiếm> / <Tên sản phẩm>` — breadcrumb phản ánh đúng đường khách đã đi tới (lưu trong phiên hoặc theo referrer); khi vào trực tiếp bằng URL, mặc định `Trang chủ / Phụ tùng / <Tên sản phẩm>`.
- Blog: `Trang chủ / Blog / <Tiêu đề bài viết>`.

### 3.4 Điều hướng nội bộ (internal links)

- Từ trang chi tiết sản phẩm → danh sách xe tương thích → bấm một xe đi tới trang xe đó (FR-030, tra cứu ngược).
- Từ trang xe → bấm một phụ tùng đi tới trang chi tiết của nó.
- Từ trang chi tiết → sản phẩm liên quan/thay thế (khi có, theo tiêu chí Henry duyệt — xem mục 7).
- Từ trang danh mục/thương hiệu → sản phẩm → checkout → xác nhận → tra cứu đơn.
- Từ trang không có kết quả tìm kiếm → gợi ý tìm theo tên hoặc liên hệ Zalo/hotline kèm mã.
- Từ trang 404 → Homepage, danh mục, ô tìm kiếm.

## 4. Trang P1 / P2 và ngoài phạm vi (ghi nhận, không thiết kế chi tiết ở M01-04)

| Trang / tính năng | Phân loại | Ghi chú |
| --- | --- | --- |
| Tài khoản khách hàng `/account` | P1 (FR-093, FR-094) | URL đã có ví dụ trong ADR-004 (`/account`); trang tài khoản đầy đủ (lưu địa chỉ, xem lại đơn) thuộc P1. Ở P0, khách đặt hàng không cần tài khoản (FR-092) và tra cứu đơn bằng mã đơn công khai (FR-058). M01-04 không thiết kế trang này; chỉ ghi nhận URL đã biết để tránh trùng lặp sau này. |
| Giá sỉ nhiều cấp (Wholesale) | P1 | Không có trang riêng ở P0; gara dùng chung luồng khách lẻ (PRD 2). |
| Khuyến mãi (Promotion) | P1 | Không có trang riêng ở P0; không thiết kế mã giảm giá trong checkout P0 (FR-059 là P1). |
| Quản lý tồn kho theo số lượng (Inventory) | P1 | P0 chỉ hiển thị **trạng thái** còn/hết hàng, không hiển thị số lượng tồn kho (PRD mục 5; M01-01 AC-19). |
| Phân tích (Analytics) | P1 | Không có trang riêng ở P0. |
| Thanh toán online (VNPay, MoMo), vận chuyển tích hợp (GHN/GHTK/Viettel Post), Zalo OA, GA4/GTM/Search Console | P1 | Không có trang/luồng riêng ở P0. |
| Bảo hành (Warranty), tích hợp ERP | P2 | Không có trong P0. |
| Tìm kiếm bằng hình ảnh; lọc theo thông số kỹ thuật nâng cao | Chưa phân loại — đề xuất, chờ Henry duyệt | Không đưa vào P0 (PRD mục 5). |
| Admin Dashboard, quản trị sản phẩm/danh mục/thương hiệu/xe/fitment/đơn hàng/bài viết, ma trận RBAC | P0 (module) nhưng thuộc M01-05 | Admin là ứng dụng riêng (`admin/`), giao diện quản trị do M01-05 thiết kế. M01-04 chỉ ghi nhận ranh giới: sitemap này là website khách hàng; điểm vào admin (URL đăng nhập admin) do M01-05 chốt. Không thiết kế sâu giao diện quản trị trong task này. |
| Ứng dụng di động riêng (iOS/Android); bán hàng trên sàn/mạng xã hội | Ngoài phạm vi | PRD mục 8 — không thuộc website này. |

## 5. Quy tắc SEO theo loại trang

| Loại trang | index | Title / Description / Canonical |
| --- | --- | --- |
| Homepage `/` | index | Title/description riêng của website (nội dung chờ Henry duyệt cùng tên miền D-01). |
| Danh mục, thương hiệu, trang xe, chi tiết sản phẩm, blog listing/detail, contact | index | Title/description/canonical riêng theo từng trang/sản phẩm/bài viết (FR-049, FR-074). Slug tiếng Anh, không đổi khi đổi tên hiển thị (FR-017, FR-068); redirect 301 khi URL đã công bố thay đổi (FR-018). |
| Kết quả tìm kiếm `/search` | noindex | URL có tham số `q` + bộ lọc; nội dung trùng lặp giữa các từ khóa — chặn index để tránh trùng lặp. |
| Giỏ, checkout, xác nhận đơn, tra cứu đơn | noindex | Trang giao dịch; trang xác nhận chứa mã đơn — không index. |
| 404 / lỗi | noindex | Template lỗi, không có URL riêng. |
| Trang P1 `/account` | (do M01-04 ghi nhận) | Khi triển khai P1: trang tài khoản sau đăng nhập — noindex. |

**Lưu ý:** tên miền chính thức chưa chốt (D-01 — seecarauto.com hay tên miền khác). Mọi URL trong tài liệu này là đường dẫn tương đối (không gắn tên miền), nên quyết định D-01 không làm thay đổi sitemap.

## 6. Quy tắc URL (đối chiếu ADR-004)

- Mọi URL cố định: tiếng Anh, chữ thường, kebab-case (gạch ngang), không dấu tiếng Việt.
- Slug không dùng tiếng Việt; slug không đổi khi đổi tên hiển thị (FR-017); redirect 301 khi URL đã công bố thay đổi (FR-018).
- URL trang chi tiết sản phẩm dùng slug sản phẩm (`/products/<product-slug>`), không dùng ID số trong URL công khai.
- URL trang xe dùng slug hãng + slug dòng (`/vehicles/<make-slug>/<model-slug>`); đời xe chọn bằng bộ chọn/filter trong trang, không đưa năm vào URL (tránh URL thay đổi theo đời xe và tránh chốt quy tắc PD-06 sớm).
- Tham số tìm kiếm/lọc dùng query string (`/search?q=...`, `/parts?brand=...&sort=...`); trang kết quả tìm kiếm noindex.
- Không dùng URL tiếng Việt, không dùng dấu gạch dưới, không dùng chữ hoa trong URL.

## 7. Quyết định đang chờ (PENDING) và đề xuất của M01-04

Các mục dưới đây **chưa được Henry quyết định**. M01-04 chỉ trình bày đề xuất và vị trí/luồng dự kiến để Henry duyệt sau; không tự biến thành business rule, không tự tạo nội dung kinh doanh.

### 7.1 D-08 — Quy trình checkout chi tiết (PENDING — Henry quyết)

**Đề xuất của M01-04 (chờ Henry duyệt, chưa phải quyết định):**

| Vấn đề | Đề xuất (chờ duyệt) | Ghi chú |
| --- | --- | --- |
| Khách vãng lai vs tài khoản | P0: cho phép đặt hàng không cần tài khoản (FR-092); không bắt buộc đăng ký/đăng nhập ở checkout. Tài khoản khách đầy đủ là P1. | Theo PRD 4.8 và FR-092. |
| Trường bắt buộc (đề xuất) | Họ tên người nhận; số điện thoại; địa chỉ giao hàng (tỉnh/thành, quận/huyện, địa chỉ chi tiết); ghi chú giao hàng (không bắt buộc). | Danh sách này là ĐỀ XUẤT của M01-04 để Henry duyệt (FR-052). Không tự chốt thêm trường (ví dụ: email, CMND) khi chưa được duyệt. |
| Phương thức thanh toán | Chỉ COD và chuyển khoản ở P0 (FR-053). | Thanh toán online là P1 (FR-059). |
| Định dạng mã đơn | Mã đơn không đoán được, không phải số thứ tự liên tục (FR-058). Định dạng cụ thể (tiền tố, độ dài, ký tự) do M05 chốt cùng Henry — M01-04 chỉ yêu cầu tính chất, không tự đặt định dạng. | Theo FR-058 và API_SPEC §11.3. |
| Đối soát chuyển khoản | P0: admin xác nhận đã nhận tiền thủ công (FR-063); đơn ở trạng thái chờ xác nhận cho tới khi admin xác nhận. Đối soát tự động là P1 trở đi. | Theo PRD 4.8. |
| Chính sách đổi trả / vận chuyển / thanh toán chi tiết | **Không tự tạo nội dung.** Footer và trang checkout chỉ đặt vị trí liên kết; nội dung chờ Henry cung cấp/duyệt. | Theo PRD 6.3 và brief M01-04 §2.4. |

### 7.2 D-09 — Xác minh bổ sung khi tra cứu đơn công khai (PENDING — Henry quyết)

**Đề xuất của M01-04 (chờ Henry duyệt, chưa phải quyết định):**

- Luồng tra cứu giữ nguyên 1 bước ở P0: nhập mã đơn → xem trạng thái + tóm tắt không nhạy cảm (FR-058).
- Vị trí dự kiến cho bước xác minh bổ sung (nếu Henry chọn): sau khi nhập mã đơn đúng, hiển thị thêm một bước xác minh (ô nhập) trước khi hiện chi tiết đơn; vị trí này được thiết kế sẵn trong wireframe trang tra cứu đơn (xem WIREFRAMES.md mẫu 10) nhưng **không tự chốt phương thức** (số điện thoại, OTP hay phương thức khác — do Henry quyết, D-09).
- Dù Henry chọn phương thức nào, nguyên tắc không đổi: mã đơn không đoán được; tra cứu bị giới hạn tần suất; không lộ thông tin cá nhân hay chi tiết đơn của người khác (FR-058).

### 7.3 Tiêu chí sản phẩm liên quan / thay thế (PENDING — Henry duyệt)

**Đề xuất của M01-04 (chờ Henry duyệt, chưa phải quyết định):**

| Phương án | Mô tả |
| --- | --- |
| A — Cùng danh mục + cùng thương hiệu | Sản phẩm liên quan là sản phẩm thật đã xuất bản, cùng danh mục và cùng thương hiệu với sản phẩm đang xem. |
| B — Cùng xe tương thích | Sản phẩm liên quan là sản phẩm thật đã xuất bản, có fitment với ít nhất một xe mà sản phẩm đang xem cũng tương thích. |
| C — Mã thay thế (alternate) | Sản phẩm thay thế là sản phẩm có mã thay thế (ALTERNATE_NUMBER) trỏ tới sản phẩm đang xem, theo dữ liệu `product_identifiers` (ERD M01-02). |

- M01-04 đề xuất kết hợp A + C làm mặc định (đơn giản, dựa trên dữ liệu đã có trong ERD); phương án B chỉ áp dụng khi dữ liệu fitment đã đầy đủ. Tiêu chí cuối cùng do Henry duyệt (FR-046). Khi chưa có sản phẩm liên quan → ẩn khu vực này, không hiển thị dữ liệu mẫu (FR-046).
- API `GET /api/v1/products/{productId}/related` đã được đánh dấu P0-PROVISIONAL trong API Specification (tiêu chí do M01-04/M03 chốt, Henry duyệt).

### 7.4 Tiêu chí sản phẩm gợi ý trên Homepage (PENDING — Henry duyệt)

- FR-003 yêu cầu homepage hiển thị sản phẩm gợi ý; tiêu chí do M01-04/M01-06 đề xuất, Henry duyệt. M01-04 đề xuất: hiển thị sản phẩm thật đã xuất bản (mới xuất bản gần nhất, hoặc theo danh mục nổi bật); chưa có sản phẩm → empty state, không hiển thị dữ liệu mẫu. Tiêu chí cuối cùng do Henry duyệt cùng M01-06.

### 7.5 Nội dung chờ Henry cung cấp (không tự bịa)

- Thông tin doanh nghiệp cho footer (tên, địa chỉ, mã số thuế).
- Thông tin tài khoản ngân hàng cho chuyển khoản (PRD 4.8).
- Giờ làm việc / chính sách đổi trả / vận chuyển / thanh toán chi tiết (D-08).
- Dữ liệu xe thật, danh mục thật, sản phẩm thật, giá thật (D-02, D-03).

## 8. Truy vết — FR → trang

| Nhóm FR | Trang phục vụ | Ghi chú |
| --- | --- | --- |
| FR-001 → FR-006 (Homepage) | 1. Homepage | Đủ 6 FR. |
| FR-007 → FR-014 (Catalog) | 2. Catalogue, 3. Trang danh mục | FR-013, FR-014 là P1 (lọc theo thông số, thứ tự hiển thị do admin đặt) — không thiết kế ở P0. |
| FR-015 → FR-020 (Category & Brand) | 3. Trang danh mục, 4. Danh sách thương hiệu, 5. Trang thương hiệu | FR-015, FR-016, FR-019, FR-020 là thao tác admin (M01-05); trang public chỉ thể hiện kết quả (slug, 301, ẩn/hiện). |
| FR-021 → FR-026 (Vehicle) | 6. Danh sách hãng xe, 7. Trang hãng xe, 8. Trang xe | FR-021, FR-022, FR-026 là thao tác/nhập liệu admin (M01-05/M04); trang public thể hiện bộ chọn xe và trang xe. |
| FR-027 → FR-033 (Fitment) | 8. Trang xe, 10. Chi tiết sản phẩm | FR-027, FR-032, FR-033 là thao tác/log admin (M01-05/M04); trang public thể hiện danh sách tương thích, cảnh báo, tra cứu ngược, thông báo "chưa có thông tin tương thích". |
| FR-034 → FR-041 (Search) | 9. Kết quả tìm kiếm (+ ô tìm kiếm ở header mọi trang) | Đủ 8 FR. |
| FR-042 → FR-049 (Product Detail) | 10. Chi tiết sản phẩm, 18. Trang 404 (FR-048) | Đủ 8 FR. |
| FR-050 → FR-059 (Cart/Checkout) | 11. Giỏ hàng, 12. Checkout, 13. Xác nhận đơn, 14. Tra cứu đơn | FR-059 là P1 (thanh toán online, phí vận chuyển tự động, mã giảm giá) — không thiết kế ở P0. |
| FR-060 → FR-066 (Order Management — Admin) | (M01-05) | Không thuộc sitemap website khách hàng; chỉ tra cứu đơn công khai (FR-058) thuộc P0 customer. |
| FR-067 → FR-074 (CMS/SEO) | 15. Blog listing, 16. Blog detail | FR-067, FR-069 → FR-073 là thao tác admin/editor (M01-05/M07); trang public thể hiện danh sách, chi tiết và SEO metadata. |
| FR-075 → FR-079 (Admin Dashboard) | (M01-05) | Không thuộc sitemap website khách hàng. |
| FR-080 → FR-086 (Dynamic RBAC) | (M01-05) | Không thuộc sitemap website khách hàng. |
| FR-087 → FR-089 (Liên hệ) | 17. Liên hệ (+ header/footer/mọi trang hiển thị hotline/Zalo) | Đủ 3 FR. |
| FR-090 → FR-092 (Tài khoản & xác thực — admin P0) | (M01-05) | Đăng nhập admin thuộc ứng dụng admin; không thuộc sitemap website khách hàng. |
| FR-093 → FR-094 (Tài khoản khách — P1) | `/account` (P1, mục 4) | Ghi nhận, không thiết kế ở M01-04. |

**Kết luận truy vết:** mọi FR P0 thuộc website khách hàng (FR-001 → FR-059 trừ FR-060 → FR-066 admin, FR-067 → FR-074 admin-phần, FR-075 → FR-092 admin) đều có ít nhất một trang phục vụ trong bảng mục 2. Không có FR P0 customer nào thiếu trang.

## 9. Lịch sử revision

| Phiên bản | Ngày | Nội dung |
| --- | --- | --- |
| v0.1 (bản đầu) | 26/11/2026 | Bản đầu M01-04: sitemap 19 mục (18 trang + trạng thái lỗi), URL theo ADR-004, phân loại P0/P1/P2 theo PRD mục 5, đề xuất D-08/D-09/tiêu chí liên quan (chờ Henry duyệt), truy vết FR → trang. Trạng thái IN_REVIEW, chờ ChatGPT review. |
