# ERD — SeeCar Auto: Entity Relationship Diagram (M01-02)

| Trường | Nội dung |
| --- | --- |
| Task | M01-02 — ERD (Product, SKU, OEM, Vehicle Fitment) |
| Milestone | M01 — Architecture & UI/UX |
| Trạng thái tài liệu | IN_REVIEW (đã báo cáo ChatGPT review lần 1 ngày 26/11/2026, đang làm Revision 02 theo 4 điểm FIX-01 → FIX-04) |
| Ngày | 26/11/2026 |
| Product Owner | Henry |
| Project Manager / Reviewer | ChatGPT |
| Developer | Muse (Pi Em) |
| Nguồn sự thật | `docs/product/PRD.md`, `docs/product/SRS.md` (M01-01 DONE, commit e82cd0e), `docs/project-management/ARCHITECTURE_DECISIONS.md` (ADR-001 → ADR-011), `docs/project-management/PROJECT_CHARTER.md`, `docs/project-management/MASTER_ROADMAP.md` |
| Task Brief | `docs/project-management/tasks/M01-02.md` |
| Sơ đồ | `docs/database/diagrams/product-fitment-erd.mmd` (Mermaid) |
| Từ điển dữ liệu | `docs/database/DATA_DICTIONARY.md` |

## Quy ước đọc tài liệu này

- **Tài liệu này là THIẾT KẾ, chưa phải database thật.** Không có Prisma schema, không có migration, không có dữ liệu thật. M02 mới triển khai schema từ ERD này.
- **Không bịa dữ liệu:** mọi tên sản phẩm, mã, dòng xe trong tài liệu này đều là **ví dụ minh họa, không phải dữ liệu thật**, và được ghi chú như vậy tại chỗ. Dữ liệu thật do Henry cung cấp hoặc nhập ở M03–M04.
- **Đã duyệt vs Đề xuất vs Pending:** nội dung dựa trên Charter/ADR/PRD/SRS đã nghiệm thu được ghi là "Đã duyệt". Nội dung do Muse đề xuất trong task này được ghi là "Đề xuất (Muse)" — ChatGPT review, Henry quyết định nghiệp vụ. Nội dung chưa rõ được ghi vào mục 11 (Pending Decisions), không tự chốt.
- **Phạm vi:** Product, SKU, OEM, Vehicle, Vehicle Fitment + ranh giới Order Snapshot. Bảng User/Role/Permission (RBAC) và Article/ArticleSEO (CMS) **không** thiết kế trong task này — chúng thuộc M01-05/M02; ERD này chỉ ghi rõ điểm nối (xem mục 4.18 và mục 9).
- **Ngôn ngữ:** tên bảng/cột 100% tiếng Anh, snake_case (theo ADR-004 và Prisma/PostgreSQL); nội dung hiển thị tiếng Việt.

## 1. Tổng quan mô hình dữ liệu

Mô hình gồm **17 bảng** (xem chi tiết mục 4):

| Nhóm | Bảng | Mục đích |
| --- | --- | --- |
| Catalogue | `brands`, `categories`, `products`, `product_categories`, `product_images`, `product_specifications` (P1) | Tổ chức sản phẩm theo thương hiệu/danh mục, hiển thị, lọc |
| Mã nhận diện | `product_identifiers` (+ `products.sku`) | Phân biệt 5 loại mã: SKU nội bộ, Part Number, OEM Number, Manufacturer Part Number, mã thay thế |
| Xe | `vehicle_makes`, `vehicle_models`, `vehicle_generations`, `vehicle_variants`, `vehicle_applications` | Dữ liệu xe có cấu trúc, làm đích cho fitment |
| Fitment | `product_vehicle_fitments`, `fitment_change_logs` | Quan hệ tương thích sản phẩm ↔ xe, có ghi chú và log thay đổi |
| Hỗ trợ | `url_redirects` | Redirect 301 khi slug đã công bố thay đổi (FR-018, BR-005) |
| Ranh giới đơn hàng (M05 thiết kế đầy đủ) | `orders`, `order_items` | Chỉ thể hiện ranh giới snapshot — xem mục 8 |

Luồng đọc chính:

1. **Tìm phụ tùng theo xe:** Make → Model → (Generation/Variant/Year) → `vehicle_applications` → `product_vehicle_fitments` → `products`.
2. **Tra cứu ngược:** Product → `product_vehicle_fitments` → `vehicle_applications` → Make/Model/Generation/Variant/Year.
3. **Tìm theo mã:** chuẩn hóa mã nhập vào → `products.sku` (SKU nội bộ) hoặc `product_identifiers.normalized_value` (4 loại mã còn lại) → `products`.
4. **Đặt hàng:** `orders` + `order_items` lưu snapshot (tên, SKU, giá, số lượng) độc lập với catalogue.

## 2. Quyết định kiến trúc dữ liệu (áp dụng toàn ERD)

### 2.1 Primary Key — UUID cho mọi bảng (Đã duyệt theo ADR-003, Đề xuất Muse về loại UUID)

- Mọi bảng dùng `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` (PostgreSQL, Prisma `@default(uuid())`).
- **Không dùng SKU/OEM/slug làm Primary Key** (yêu cầu Task Brief §4.1): mã và slug có thể đổi (slug đổi thì redirect 301; SKU có thể phải chuẩn hóa lại), trong khi PK phải ổn định suốt đời bản ghi.
- **Vì sao không dùng BIGINT identity:** (a) ID tăng dần đoán được qua URL/API, lộ quy mô dữ liệu; (b) khi hợp nhất dữ liệu từ nhiều nguồn (import Excel M04, dữ liệu nhà cung cấp sau này) dễ đụng độ; (c) UUID tương thích Prisma/PostgreSQL nguyên bản, không cần sequence riêng.
- **Trade-off:** UUID chiếm 16 byte (lớn hơn BIGINT 8 byte), index lớn hơn một chút ở quy mô 2.000–10.000 SKU — không đáng kể; bù lại `gen_random_uuid()` là UUID v4 ngẫu nhiên nên INSERT không bị hotspot ở cuối B-tree như ID tăng dần. Không dùng UUID v7 ở đây vì Prisma 6 chưa hỗ trợ native v7; nếu M02 cần v7 thì dùng `dbgenerated()` — ghi chú cho M02, không đổi ERD.

### 2.2 Quy ước chung

- **Tên bảng:** số nhiều, snake_case tiếng Anh (`products`, `vehicle_makes`, `product_vehicle_fitments`).
- **Tên cột:** snake_case; khóa ngoại đặt tên `<bảng_số_ít>_id` (vd. `brand_id`, `product_id`).
- **Timestamp:** mọi bảng có `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`; bảng do admin sửa có thêm `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` (M02 tự động cập nhật qua Prisma middleware/trigger — ghi chú cho M02).
- **Soft delete:** `products.deleted_at TIMESTAMPTZ NULL` (xem mục 4.3). Các bảng còn lại không soft delete — xóa theo quy tắc mục 7 (RESTRICT + ẩn).
- **Tiền tệ:** `DECIMAL(12,2)`, đơn vị VND ở P0; không có đa tiền tệ ở P0. Mọi cột tiền có `CHECK >= 0`.
- **Năm:** `SMALLINT`, khoảng hợp lệ **1900–2100** (Muse chốt khoảng này theo FR-022 — "khoảng hợp lệ do M01-02 chốt").
- **Chuỗi mã:** chuẩn hóa khi ghi và khi tìm — xem mục 3.1.
- **Không dùng JSON** cho dữ liệu có cấu trúc nghiệp vụ (đặc biệt fitment — BR-011); JSON chỉ được cân nhắc ở M02 cho dữ liệu thực sự phi cấu trúc, nếu có.

### 2.3 On Delete / On Update — nguyên tắc chung

- `ON UPDATE CASCADE` cho mọi FK (PK là UUID ổn định, thực tế không đổi; CASCADE ở đây chỉ là an toàn).
- `ON DELETE RESTRICT` cho mọi FK trỏ tới dữ liệu danh mục/xe/thương hiệu — **không xóa ngầm dữ liệu cha khi còn dữ liệu con** (FR-020, FR-033, ràng buộc §7 số 10).
- `ON DELETE CASCADE` chỉ cho dữ liệu con thuộc sở hữu hoàn toàn của cha và không mang giá trị lịch sử độc lập: `product_identifiers`, `product_categories`, `product_images`, `product_specifications` (thuộc về product), `fitment_change_logs` (thuộc về product). Xóa cứng product chỉ xảy ra khi product chưa từng xuất hiện trong đơn hàng (xem PD-05); còn không thì chỉ soft delete/ẩn.
- **Không dùng CASCADE tùy tiện** — mỗi quan hệ ghi rõ lý do trong mục 4.

## 3. Phân tích phương án (khuyến nghị của Muse — ChatGPT review, Henry quyết định nghiệp vụ)

### 3.1 SKU và các loại mã — Đề xuất: SKU là cột trực tiếp của `products` + bảng `product_identifiers` cho 4 loại mã còn lại

**Vấn đề (Task Brief §3.2):** có 5 loại mã — Internal SKU, Part Number, OEM Number, Manufacturer Part Number, Alternate Number. SKU lưu ở đâu? Có cần bảng `product_identifiers` không? Một sản phẩm có nhiều OEM không? Một OEM có gắn nhiều sản phẩm không?

**Phương án đã xem xét:**

| Phương án | Nội dung | Ưu | Nhược |
| --- | --- | --- | --- |
| A. Tất cả mã vào `product_identifiers` | Kể cả SKU nội bộ cũng là một dòng identifier | Thống nhất một chỗ; thêm loại mã mới không đổi schema | Mọi tra cứu SKU (loại tìm kiếm #1 theo ADR-010) phải JOIN; SKU là mã bắt buộc 1:1 với product nhưng lại nằm ở bảng 1:N — mô hình nói dối về bản chất |
| B. Mỗi loại mã một cột trên `products` | `sku`, `part_number`, `oem_number`, `manufacturer_part_number`, `alternate_number` | Đơn giản, không JOIN | Một sản phẩm chỉ có tối đa 1 OEM — sai thực tế (một phụ tùng có thể tương đương nhiều mã OEM); thêm mã thay thế thứ 2 phải thêm cột; không lưu được issuer từng mã |
| **C. (Khuyến nghị) SKU là cột `products.sku` + `product_identifiers` cho 4 loại còn lại** | `products.sku` UNIQUE NOT NULL; `product_identifiers` chứa PART_NUMBER, OEM_NUMBER, MANUFACTURER_PART_NUMBER, ALTERNATE_NUMBER | SKU 1:1 với product được thể hiện đúng; tra cứu SKU nhanh nhất (không JOIN, đúng thứ tự ưu tiên ADR-010); 4 loại mã 1:N lưu được nhiều mã, kèm issuer và chuẩn hóa riêng từng mã | Hai nơi chứa mã — nhưng ranh giới rõ: SKU là mã **của chính SeeCar Auto**, 4 loại còn lại là mã **tham chiếu từ bên ngoài** |

**Khuyến nghị: phương án C.**

- **Một sản phẩm có đúng 1 SKU nội bộ** (PD-02). SKU là mã do SeeCar Auto tự cấp — nếu một "sản phẩm" cần 2 SKU thì thực chất đó là 2 biến thể/sản phẩm khác nhau. Đường lui: nếu Henry quyết định một sản phẩm có nhiều SKU (PD-02), `products.sku` được bỏ và SKU trở thành một dòng `identifier_type = 'INTERNAL_SKU'` trong `product_identifiers` — migration đã được tính trước, không phá vỡ các bảng khác.
- **Một sản phẩm có nhiều OEM Number** — được, mỗi mã là một dòng `product_identifiers`.
- **Một OEM Number gắn được nhiều sản phẩm** — được (không unique toàn cục cho OEM). Lý do: mã OEM là mã của hãng xe; nhiều phụ tùng aftermarket khác nhau (khác thương hiệu) đều có thể tương đương cùng một mã OEM. Chặn trùng OEM toàn cục sẽ chặn sai trường hợp hợp lệ. Chống trùng chỉ áp dụng **trong cùng một sản phẩm** (UNIQUE `product_id, identifier_type, normalized_value`) và **với Manufacturer Part Number theo issuer** (xem dưới).
- **Manufacturer Part Number: unique theo issuer.** Một mã MPN của cùng một nhà sản xuất chỉ thuộc về đúng một phụ tùng của hãng đó — trùng MPN cùng issuer là lỗi dữ liệu, nên chặn bằng partial unique index `UNIQUE(identifier_type, normalized_value, issuing_brand_id) WHERE identifier_type = 'MANUFACTURER_PART_NUMBER'`.
- **Chuẩn hóa mã (áp dụng cho `products.sku` và `product_identifiers.normalized_value`):** viết hoa toàn bộ, bỏ khoảng trắng, gạch ngang `-`, gạch dưới `_`, dấu chấm `.`. Ví dụ minh họa (không phải mã thật): mã nhập `abc-123 4.5` → chuẩn hóa `ABC12345`. Bản gốc giữ nguyên ở `identifier_value` để hiển thị; tìm kiếm chỉ so khớp `normalized_value`. Quy tắc này phải được áp dụng **giống hệt nhau khi ghi và khi tìm** — M02/M03 implement một hàm chuẩn hóa duy nhất dùng chung (ghi chú cho M02). Không fuzzy mạnh với mã OEM (ADR-010): so khớp chính xác trên `normalized_value`, sai một ký tự là không khớp.
- **Trường hợp biên — mã chỉ gồm ký tự phân cách (Revision 02 FIX-03):** mã nhập chỉ gồm các ký tự bị loại khi chuẩn hóa (ví dụ minh họa: `---`, `___`, `. . .`) sẽ chuẩn hóa thành **chuỗi rỗng** — đây không phải mã hợp lệ. Quy tắc: sau chuẩn hóa, `normalized_value` và `products.sku` **bắt buộc không rỗng** — kiểm tra ở application-level khi ghi (từ chối và báo rõ) **và** ở database bằng `CHECK(length(trim(normalized_value)) > 0)` / `CHECK(length(trim(sku)) > 0)`. Không thay đổi quy tắc ADR-010; đây chỉ là bổ sung tính đầy đủ của quy tắc chuẩn hóa.

### 3.2 Mức chi tiết Vehicle Fitment — Đề xuất: phương án D (mô hình `vehicle_applications` thống nhất)

**Vấn đề (Task Brief §3.5):** fitment liên kết tới cấp nào của xe? Mức chi tiết này quyết định độ chính xác tương thích — và là điểm ChatGPT dặn riêng: không được mặc định cùng tên dòng xe thì dùng chung phụ tùng (ví dụ minh họa: Toyota Vios các đời khác nhau có thể dùng phụ tùng khác nhau).

**Các phương án đã đánh giá:**

| Phương án | Fitment liên kết tới | Độ chính xác | Nhập Excel (M04) | Tìm kiếm | Độ phức tạp | Mở rộng |
| --- | --- | --- | --- | --- | --- | --- |
| A. Model + Year | `vehicle_years` (Model + năm) | Thấp — cùng model/năm có thể có nhiều phiên bản/động cơ khác nhau, phụ tùng khác nhau | Dễ nhất | Dễ | Thấp | Kém — muốn thêm Generation/Variant phải đổi cấu trúc fitment |
| B. Model + Year + Generation | `vehicle_generations` (có khoảng năm) | Trung bình — đúng tới thế hệ xe | Trung bình | Trung bình | Trung bình | Trung bình |
| C. Model + Year + Generation + Variant | `vehicle_variants` | Cao nhất | Khó nhất — dữ liệu variant thật chưa có (D-03), import dễ thiếu/sai | Phức tạp nhất | Cao | Tốt |
| **D. (Khuyến nghị) `vehicle_applications` thống nhất** | Một bảng `vehicle_applications` — mỗi dòng là một "cấu hình xe" gồm Make + Model + Generation (nullable) + Variant (nullable) + Year (nullable) | Cao dần theo dữ liệu — bắt đầu ở mức A/B, nâng lên C khi có dữ liệu, không đổi cấu trúc | Dễ — dòng Excel thiếu Generation/Variant vẫn nhập được thành application mức A/B | Dễ — một đích duy nhất cho mọi truy vấn fitment, lọc theo cấp chi tiết có sẵn | Trung bình — thêm 1 bảng | Tốt nhất — thêm cấp chi tiết (động cơ, hộp số) bằng cách thêm cột/FK vào `vehicle_applications`, fitment không đổi |

**Khuyến nghị: phương án D.**

- Hệ thống phân cấp đầy đủ vẫn tồn tại: `vehicle_makes` → `vehicle_models` → `vehicle_generations` (có `year_from`/`year_to`) → `vehicle_variants` (mở rộng, nullable). Nhưng **fitment không trỏ trực tiếp vào các bảng này** — fitment trỏ vào `vehicle_applications`, mỗi dòng application là một cấu hình xe cụ thể ở đúng mức chi tiết mà dữ liệu hiện có cho phép.
- **Không có bảng `vehicle_years` riêng.** Lý do: một dòng cho mỗi năm của mỗi model (ví dụ minh họa: một dòng xe bán 24 năm = 24 dòng) không mang thêm thông tin gì ngoài khoảng năm — khoảng năm đã có trên `vehicle_generations.year_from/year_to`, còn năm cụ thể (khi import Excel chỉ có năm, chưa có generation) lưu ở `vehicle_applications.year`. Quyết định này đáp ứng FR-022 (quản lý đời xe/năm) mà không sinh bảng thừa. Trade-off: truy vấn "liệt kê các năm của model" phải tính từ khoảng năm + các application — chấp nhận được vì đó là truy vấn hiếm, và M02 có thể tạo view nếu cần.
- **Quy tắc toàn vẹn của application (mức application — application-level validation, xem mục 7):** generation (nếu có) phải thuộc đúng model đó; variant (nếu có) phải thuộc đúng generation đó; year (nếu có) phải nằm trong khoảng năm của generation đó (khi generation đã biết); variant chỉ được có khi đã có generation. Không thể biểu diễn các quy tắc xuyên bảng này bằng CHECK đơn giản nên ghi rõ là application-level — M02 implement bằng validation trong service + ghi chú có thể dùng trigger.
- **Chống trùng application:** UNIQUE NULLS NOT DISTINCT trên `(model_id, generation_id, variant_id, year)` — hai application giống hệt nhau về 4 thành phần là một. (PostgreSQL 15+ hỗ trợ `NULLS NOT DISTINCT`; M02 ghi chú cú pháp này trong migration.)
- **Ví dụ minh họa (không phải dữ liệu thật):** cùng dòng xe "Vios" có generation 2023+ và generation cũ hơn — hai generation khác nhau tạo hai application khác nhau, fitment của phụ tùng A gắn application này không tự động đúng cho application kia. Đây chính là lỗi mà phương án A mắc phải và phương án D tránh được.

### 3.3 Brand của sản phẩm vs Manufacturer/Issuer của mã — Đề xuất: phân biệt bằng 2 cột FK riêng

**Vấn đề (Task Brief §3.3):** Brand của phụ tùng (vd. thương hiệu sản xuất ra cái bơm nước đó) khác với Manufacturer/Issuer của một mã (vd. hãng xe Toyota cấp mã OEM; hãng Aisin cấp mã MPN). Không được mặc định hai khái niệm này luôn giống nhau.

**Khuyến nghị:**

- `products.brand_id` → `brands`: thương hiệu của chính sản phẩm (hiển thị ở trang chi tiết, dùng để lọc — FR-008, FR-016).
- `product_identifiers` có **hai cột issuer riêng**, mỗi cột chỉ dùng cho đúng loại mã:
  - `issuing_make_id` → `vehicle_makes` (nullable): chỉ dùng khi `identifier_type = 'OEM_NUMBER'` — hãng xe cấp mã OEM.
  - `issuing_brand_id` → `brands` (nullable): chỉ dùng khi `identifier_type = 'MANUFACTURER_PART_NUMBER'` (và `PART_NUMBER` khi biết rõ nhà sản xuất cấp mã) — hãng phụ tùng cấp mã.
- Ràng buộc CHECK (mức database — ma trận đầy đủ, Revision 02 FIX-01):
  `OEM_NUMBER` bắt buộc `issuing_make_id IS NOT NULL` **và** `issuing_brand_id IS NULL`;
  `MANUFACTURER_PART_NUMBER` bắt buộc `issuing_brand_id IS NOT NULL` **và** `issuing_make_id IS NULL`;
  `PART_NUMBER` bắt buộc `issuing_make_id IS NULL`, `issuing_brand_id` được phép NULL hoặc NOT NULL (khi biết rõ nhà sản xuất cấp mã);
  `ALTERNATE_NUMBER` bắt buộc cả hai cột issuer đều NULL (mã thay thế chỉ là tham chiếu chéo, không gắn issuer).
- **Phương án đã loại:** một bảng `manufacturers` chung rồi cho cả `vehicle_makes` và `brands` trỏ vào đó — trùng lặp dữ liệu (Toyota vừa là make vừa là manufacturer) và làm rối quan hệ; hoặc một cột issuer đa hình (polymorphic, không FK được) — mất toàn vẹn tham chiếu. Hai cột FK rõ ràng tốn thêm 2 cột nhưng giữ được FK thật.
- **Lưu ý:** issuer của OEM là hãng xe (vehicle_makes), không phải "brand phụ tùng" — vì vậy không dùng chung cột `issuing_brand_id` cho OEM. Đây là điểm dễ nhầm nhất của mô hình này, được ghi rõ ở đây để M02/M03 không implement sai.

### 3.4 Category — Đề xuất: 1 danh mục chính + junction cho danh mục phụ

**Vấn đề (Task Brief §3.4):** một sản phẩm thuộc một danh mục chính hay nhiều danh mục?

**Khuyến nghị:** cả hai — `products.category_id` (danh mục chính, NOT NULL) + bảng junction `product_categories` (danh mục phụ).

- **Vì sao cần danh mục chính:** URL canonical của sản phẩm và breadcrumb cần đúng một danh mục (`/parts/<category-slug>`); sắp xếp/hiển thị mặc định theo danh mục chính (FR-014 — thứ tự hiển thị trong danh mục, lưu ở `product_categories.display_order` cho cả danh mục chính lẫn phụ, xem mục 4.5).
- **Vì sao cần junction:** một phụ tùng có thể thuộc nhiều nhóm (ví dụ minh họa: một cảm biến vừa thuộc "Động cơ" vừa thuộc "Điện — Điện tử"). Không có junction thì admin phải nhân bản sản phẩm — sai dữ liệu.
- **Quy tắc:** junction không được chứa danh mục chính của chính sản phẩm đó (application-level — CHECK không làm được xuyên bảng); UNIQUE(`product_id`, `category_id`) chống trùng.
- **Cây danh mục:** `categories.parent_id` tự tham chiếu; chống vòng lặp ở application-level (kiểm tra tổ tiên trước khi lưu — xem mục 7 ràng buộc số 11); truy vấn cây dùng recursive CTE ở M02/M03 (ghi chú cho M02). Slug của category là **unique toàn cục** (không theo parent) để URL `/parts/<slug>` không mơ hồ và redirect 301 (mục 4.17) tra được bằng slug duy nhất.

### 3.5 Năm sản xuất — Đề xuất: khoảng năm trên Generation + năm cụ thể trên Application

Đã trình bày ở mục 3.2: không có bảng `vehicle_years` riêng. `vehicle_generations.year_from/year_to` diễn tả "đời xe"; `vehicle_applications.year` diễn tả "năm cụ thể" khi dữ liệu chỉ có năm mà chưa phân biệt được generation. Cả hai đều CHECK trong khoảng 1900–2100.

### 3.6 Các quyết định khác đã chốt trong ERD này (Đề xuất Muse)

- **Thứ tự hiển thị sản phẩm trong danh mục (FR-014, P1):** `product_categories.display_order INT` — admin đặt thứ tự cho từng (sản phẩm, danh mục); sản phẩm chưa đặt thứ tự dùng `display_order = 0` và xếp theo mặc định do M01-04 chốt.
- **Thông số kỹ thuật (FR-013, P1):** bảng `product_specifications` (key/value) — chỉ phục vụ lọc P1, không bắt buộc ở P0; thiết kế sẵn để M03 không phải sửa ERD (xem mục 4.7 và PD-07).
- **Ảnh sản phẩm (FR-042, P0):** bảng `product_images` — nhiều ảnh/sản phẩm, có `sort_order` và cờ `is_primary` (tối đa 1 ảnh chính/sản phẩm — partial unique index).
- **Log thay đổi fitment (FR-033, P0):** bảng `fitment_change_logs` — ghi ai, khi nào, gắn/bỏ gắn fitment nào. Cột `changed_by_admin_id` là UUID **chưa có FK** (bảng users thuộc M02 — xem mục 4.18); M02 bổ sung FK khi bảng users tồn tại.
- **Redirect 301 (FR-018, BR-005):** bảng `url_redirects` — tra theo `(entity_type, old_slug)`; slug mới lưu để kiểm tra đích còn tồn tại (application-level).

## 4. Danh sách bảng

Kiểu dữ liệu ghi theo PostgreSQL; cột Prisma tương ứng được M02 suy ra trực tiếp (UUID → `String @id @default(uuid()) @db.Uuid`, TIMESTAMPTZ → `DateTime @db.Timestamptz`, DECIMAL(12,2) → `Decimal @db.Decimal(12,2)`, SMALLINT → `Int @db.SmallInt`, enum → `enum` Prisma). "Mức" = P0 (bản đầu) hay P1 (mở rộng sau) hay Ranh giới.

### 4.1 `brands` — Thương hiệu phụ tùng (P0)

| Cột | Kiểu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| `id` | UUID | PK, `DEFAULT gen_random_uuid()` | ID nội bộ ổn định |
| `name` | VARCHAR(255) | NOT NULL | Tên thương hiệu hiển thị (tiếng Việt) |
| `slug` | VARCHAR(255) | NOT NULL, UNIQUE | Slug tiếng Anh cho URL `/brands/<slug>`; không đổi khi đổi tên (BR-005) |
| `description` | TEXT | NULL | Mô tả thương hiệu |
| `logo_url` | VARCHAR(1024) | NULL | URL tuyệt đối tới logo (lưu qua S3/R2 — INT-005, D-06) |
| `is_visible` | BOOLEAN | NOT NULL, DEFAULT true | Ẩn thương hiệu khỏi frontend mà không xóa sản phẩm |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

FR liên quan: FR-002, FR-016, FR-017 → FR-020. **Không** có trường số lượng tồn kho (BR-012 — P1).

### 4.2 `categories` — Danh mục nhiều cấp (P0)

| Cột | Kiểu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| `id` | UUID | PK, `DEFAULT gen_random_uuid()` | |
| `parent_id` | UUID | NULL, FK → `categories.id` ON DELETE RESTRICT | NULL = danh mục gốc; có giá trị = danh mục con |
| `name` | VARCHAR(255) | NOT NULL | Tên danh mục hiển thị (tiếng Việt) |
| `slug` | VARCHAR(255) | NOT NULL, UNIQUE | Slug tiếng Anh, unique toàn cục; URL `/parts/<slug>` |
| `display_order` | INT | NOT NULL, DEFAULT 0 | Thứ tự hiển thị trong cây danh mục |
| `is_visible` | BOOLEAN | NOT NULL, DEFAULT true | Ẩn danh mục khỏi frontend mà không xóa sản phẩm (FR-015) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

FR liên quan: FR-015, FR-017 → FR-020. Chống vòng lặp cây ở application-level (mục 7, ràng buộc 11). Xóa danh mục còn sản phẩm: RESTRICT — chặn hoặc yêu cầu chuyển sản phẩm trước (FR-020, PD-05).

### 4.3 `products` — Sản phẩm (P0)

| Cột | Kiểu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| `id` | UUID | PK, `DEFAULT gen_random_uuid()` | |
| `sku` | VARCHAR(64) | NOT NULL, UNIQUE | **SKU nội bộ duy nhất của SeeCar Auto** — lưu dạng đã chuẩn hóa (mục 3.1). Đây là mã tìm kiếm ưu tiên #1 (ADR-010). Không phải FK, không phải PK |
| `name` | VARCHAR(255) | NOT NULL | Tên sản phẩm hiển thị |
| `slug` | VARCHAR(255) | NOT NULL, UNIQUE | Slug tiếng Anh cho URL `/products/<slug>` |
| `short_description` | VARCHAR(500) | NULL | Mô tả ngắn (danh sách, gợi ý tìm kiếm) |
| `description` | TEXT | NULL | Mô tả đầy đủ |
| `brand_id` | UUID | NOT NULL, FK → `brands.id` ON DELETE RESTRICT | Thương hiệu của sản phẩm |
| `category_id` | UUID | NOT NULL, FK → `categories.id` ON DELETE RESTRICT | Danh mục chính (canonical) |
| `status` | `product_status` | NOT NULL, DEFAULT 'DRAFT' | Enum: `DRAFT`, `PUBLISHED`, `HIDDEN`. Chỉ `PUBLISHED` hiển thị ở frontend (FR-003, FR-048) |
| `availability_status` | `availability_status` | NOT NULL, DEFAULT 'OUT_OF_STOCK' | Enum: `IN_STOCK`, `OUT_OF_STOCK`. **P0 chỉ có trạng thái còn/hết hàng do admin quản lý** (BR-012). Không có cột số lượng tồn kho ở P0 — tồn kho theo số lượng là P1 (AC-19, M05) |
| `price` | DECIMAL(12,2) | NOT NULL, CHECK (`price` >= 0) | Giá hiện tại (VND) do admin quản lý. Giá trong đơn đã đặt không lấy từ đây — xem mục 8 (snapshot) |
| `published_at` | TIMESTAMPTZ | NULL | Thời điểm xuất bản (NULL khi chưa xuất bản) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `deleted_at` | TIMESTAMPTZ | NULL | Soft delete. Sản phẩm đã từng có trong đơn hàng **không được xóa cứng** — chỉ soft delete/ẩn (PD-05, mục 7 ràng buộc 10) |

FR liên quan: FR-007 → FR-014, FR-042 → FR-049, FR-054 (snapshot nguồn). **Không** có: số lượng tồn kho (P1), giá sỉ (P1), trường SEO (bảng riêng ở M01-05/M02 — FR-074), thông tin thẻ (NFR-019 — cấm).

### 4.4 `product_identifiers` — Các loại mã tham chiếu (P0)

| Cột | Kiểu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| `id` | UUID | PK, `DEFAULT gen_random_uuid()` | |
| `product_id` | UUID | NOT NULL, FK → `products.id` ON DELETE CASCADE | Mã thuộc về sản phẩm nào. CASCADE vì identifier không có giá trị độc lập khi product bị xóa cứng (xóa cứng chỉ xảy ra khi product chưa từng có đơn — PD-05) |
| `identifier_type` | `identifier_type` | NOT NULL | Enum: `PART_NUMBER`, `OEM_NUMBER`, `MANUFACTURER_PART_NUMBER`, `ALTERNATE_NUMBER`. **Không** chứa `INTERNAL_SKU` — SKU nội bộ nằm ở `products.sku` (mục 3.1) |
| `identifier_value` | VARCHAR(128) | NOT NULL | Mã gốc như nhà sản xuất/hãng xe cấp (giữ nguyên để hiển thị) |
| `normalized_value` | VARCHAR(128) | NOT NULL | Mã đã chuẩn hóa (mục 3.1) — chỉ dùng để tìm kiếm chính xác, không hiển thị |
| `issuing_make_id` | UUID | NULL, FK → `vehicle_makes.id` ON DELETE RESTRICT | Hãng xe cấp mã — **chỉ dùng cho `OEM_NUMBER`** (bắt buộc khi type là OEM_NUMBER) |
| `issuing_brand_id` | UUID | NULL, FK → `brands.id` ON DELETE RESTRICT | Hãng phụ tùng cấp mã — **chỉ dùng cho `MANUFACTURER_PART_NUMBER`** (bắt buộc) và `PART_NUMBER` (khi biết rõ) |
| `is_primary` | BOOLEAN | NOT NULL, DEFAULT false | Mã chính trong cùng loại (hiển thị đầu tiên ở trang chi tiết — FR-043) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

Ràng buộc thêm (mức database, xem mục 7):

- `CHECK` ma trận issuer (Revision 02 FIX-01 — mức database, một CHECK duy nhất bao cả 4 loại):
  `identifier_type = 'OEM_NUMBER'` → `issuing_make_id IS NOT NULL AND issuing_brand_id IS NULL`;
  `identifier_type = 'MANUFACTURER_PART_NUMBER'` → `issuing_brand_id IS NOT NULL AND issuing_make_id IS NULL`;
  `identifier_type = 'PART_NUMBER'` → `issuing_make_id IS NULL` (`issuing_brand_id` NULL hoặc NOT NULL);
  `identifier_type = 'ALTERNATE_NUMBER'` → `issuing_make_id IS NULL AND issuing_brand_id IS NULL`.
  Ma trận này chặn cả hai lỗi: thiếu issuer bắt buộc **và** gắn nhầm issuer sai loại mã (vd. mã OEM lại ghi `issuing_brand_id`).
- `UNIQUE(product_id, identifier_type, normalized_value)` — chống trùng mã cùng loại trên cùng một sản phẩm.
- Partial unique `UNIQUE(identifier_type, normalized_value, issuing_brand_id) WHERE identifier_type = 'MANUFACTURER_PART_NUMBER'` — một mã MPN của cùng một hãng chỉ thuộc về một phụ tùng.
- Partial unique `(product_id, identifier_type) WHERE is_primary` — tối đa 1 mã chính mỗi loại trên mỗi sản phẩm.
- **Không** unique toàn cục cho `OEM_NUMBER` — nhiều sản phẩm aftermarket có thể cùng tương đương một mã OEM (mục 3.1).

FR/BR liên quan: FR-034 → FR-036, FR-043; BR-001, BR-002; ADR-010.

### 4.5 `product_categories` — Sản phẩm ↔ danh mục phụ (P0)

| Cột | Kiểu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| `product_id` | UUID | PK (cùng `category_id`), FK → `products.id` ON DELETE CASCADE | |
| `category_id` | UUID | PK (cùng `product_id`), FK → `categories.id` ON DELETE RESTRICT | Danh mục phụ (khác danh mục chính `products.category_id`) |
| `display_order` | INT | NOT NULL, DEFAULT 0 | Thứ tự hiển thị của sản phẩm trong danh mục này (FR-014, P1 — admin đặt thứ tự; 0 = chưa đặt, xếp theo mặc định M01-04 chốt) |

Quy tắc application-level: `category_id` không được trùng `products.category_id` của cùng sản phẩm (mục 3.4). Junction table chuẩn cho quan hệ N:N — không có cột `id` riêng.

### 4.6 `product_images` — Ảnh sản phẩm (P0)

| Cột | Kiểu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| `id` | UUID | PK, `DEFAULT gen_random_uuid()` | |
| `product_id` | UUID | NOT NULL, FK → `products.id` ON DELETE CASCADE | |
| `image_url` | VARCHAR(1024) | NOT NULL | URL tuyệt đối (S3/R2 — INT-005, D-06) |
| `alt_text` | VARCHAR(255) | NULL | Văn bản thay thế cho accessibility (NFR-012) |
| `sort_order` | INT | NOT NULL, DEFAULT 0 | Thứ tự hiển thị ảnh |
| `is_primary` | BOOLEAN | NOT NULL, DEFAULT false | Ảnh đại diện (tối đa 1/sản phẩm — partial unique `(product_id) WHERE is_primary`) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

FR liên quan: FR-010, FR-042. Thiếu ảnh → frontend dùng placeholder theo design system (FR-010) — không phải trách nhiệm của ERD.

### 4.7 `product_specifications` — Thông số kỹ thuật (P1 — thiết kế sẵn, chưa dùng ở P0)

| Cột | Kiểu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| `id` | UUID | PK, `DEFAULT gen_random_uuid()` | |
| `product_id` | UUID | NOT NULL, FK → `products.id` ON DELETE CASCADE | |
| `spec_key` | VARCHAR(128) | NOT NULL | Khóa thông số (ví dụ minh họa: `diameter_mm` — không phải thông số thật đã chốt) |
| `spec_value` | VARCHAR(512) | NOT NULL | Giá trị thông số |
| `display_order` | INT | NOT NULL, DEFAULT 0 | Thứ tự hiển thị ở trang chi tiết |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

`UNIQUE(product_id, spec_key)`. **Mức P1 (FR-013):** bảng này được thiết kế sẵn trong ERD để M03 không phải sửa cấu trúc, nhưng P0 không bắt buộc có dữ liệu. Mức độ chi tiết và danh mục spec_key chuẩn do PD-07 quyết định (Henry). Không dùng JSON — mỗi thông số là một dòng, lọc được bằng SQL (FR-013).

### 4.8 `vehicle_makes` — Hãng xe (P0)

| Cột | Kiểu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| `id` | UUID | PK, `DEFAULT gen_random_uuid()` | |
| `name` | VARCHAR(255) | NOT NULL | Tên hãng xe hiển thị |
| `slug` | VARCHAR(255) | NOT NULL, UNIQUE | Slug tiếng Anh cho URL `/vehicles/<make-slug>/...` |
| `logo_url` | VARCHAR(1024) | NULL | URL tuyệt đối tới logo hãng xe |
| `is_visible` | BOOLEAN | NOT NULL, DEFAULT true | Ẩn khỏi bộ chọn xe mà không xóa dòng xe bên dưới |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

FR liên quan: FR-021, FR-024. Đây cũng là "issuer" của mã OEM (mục 3.3).

### 4.9 `vehicle_models` — Dòng xe (P0)

| Cột | Kiểu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| `id` | UUID | PK, `DEFAULT gen_random_uuid()` | |
| `make_id` | UUID | NOT NULL, FK → `vehicle_makes.id` ON DELETE RESTRICT | Dòng xe thuộc đúng một hãng xe |
| `name` | VARCHAR(255) | NOT NULL | Tên dòng xe hiển thị |
| `slug` | VARCHAR(255) | NOT NULL | Slug tiếng Anh; unique **trong phạm vi hãng** — `UNIQUE(make_id, slug)` |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

FR liên quan: FR-022 → FR-024. Không tạo model khi chưa có make (FR-022).

### 4.10 `vehicle_generations` — Thế hệ xe (P0)

| Cột | Kiểu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| `id` | UUID | PK, `DEFAULT gen_random_uuid()` | |
| `model_id` | UUID | NOT NULL, FK → `vehicle_models.id` ON DELETE RESTRICT | Thế hệ thuộc đúng một dòng xe |
| `name` | VARCHAR(255) | NOT NULL | Tên thế hệ (ví dụ minh họa về định dạng: "Thế hệ thứ 3" — không phải dữ liệu thật) |
| `slug` | VARCHAR(255) | NOT NULL | Slug tiếng Anh; unique **trong phạm vi model** — `UNIQUE(model_id, slug)` |
| `year_from` | SMALLINT | NOT NULL, CHECK 1900–2100 | Năm bắt đầu sản xuất thế hệ này |
| `year_to` | SMALLINT | NULL, CHECK 1900–2100 | Năm kết thúc; NULL = thế hệ vẫn đang sản xuất |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

Ràng buộc thêm: `CHECK(year_to IS NULL OR year_to >= year_from)`. FR liên quan: FR-022, FR-024. Đây là cấp chi tiết mặc định mà fitment nhắm tới khi dữ liệu đã phân biệt được thế hệ (mục 3.2, phương án D).

### 4.11 `vehicle_variants` — Phiên bản xe (P0 — mở rộng, nullable trong application)

| Cột | Kiểu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| `id` | UUID | PK, `DEFAULT gen_random_uuid()` | |
| `generation_id` | UUID | NOT NULL, FK → `vehicle_generations.id` ON DELETE RESTRICT | Phiên bản thuộc đúng một thế hệ |
| `name` | VARCHAR(255) | NOT NULL | Tên phiên bản (ví dụ minh họa về định dạng: "1.5G AT" — không phải dữ liệu thật) |
| `slug` | VARCHAR(255) | NOT NULL | Slug tiếng Anh; unique **trong phạm vi generation** — `UNIQUE(generation_id, slug)` |
| `note` | TEXT | NULL | Ghi chú phân biệt phiên bản (ví dụ minh họa về loại ghi chú: động cơ, hộp số — cấu trúc chi tiết theo PD-01/PD-06; P0 chỉ lưu text ghi chú, không tách trường) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

Bảng này **được phép trống ở P0** — khi dữ liệu xe thật chưa có chi tiết phiên bản (D-03), fitment dùng application ở mức Generation hoặc Model+Year. Khi có dữ liệu, variant được thêm vào mà không đổi cấu trúc fitment (mục 3.2).

### 4.12 `vehicle_applications` — Cấu hình xe (đích duy nhất của fitment) (P0)

| Cột | Kiểu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| `id` | UUID | PK, `DEFAULT gen_random_uuid()` | |
| `make_id` | UUID | NOT NULL, FK → `vehicle_makes.id` ON DELETE RESTRICT | Hãng xe (lưu trực tiếp để truy vấn nhanh theo hãng; phải khớp với `model.make_id` — application-level) |
| `model_id` | UUID | NOT NULL, FK → `vehicle_models.id` ON DELETE RESTRICT | Dòng xe — thành phần bắt buộc của mọi application |
| `generation_id` | UUID | NULL, FK → `vehicle_generations.id` ON DELETE RESTRICT | Thế hệ — NULL khi chưa phân biệt được thế hệ |
| `variant_id` | UUID | NULL, FK → `vehicle_variants.id` ON DELETE RESTRICT | Phiên bản — NULL khi chưa phân biệt được phiên bản; chỉ được có khi đã có `generation_id` |
| `year` | SMALLINT | NULL, CHECK 1900–2100 | Năm cụ thể — NULL khi application đại diện cho cả khoảng năm của generation; có giá trị khi dữ liệu chỉ biết năm (import Excel mức A) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

Ràng buộc thêm:

- `UNIQUE NULLS NOT DISTINCT (model_id, generation_id, variant_id, year)` — chống hai application giống hệt nhau (PostgreSQL 15+, ghi chú cho M02).
- Application-level (mục 7): generation thuộc đúng model; variant thuộc đúng generation; year (nếu có) nằm trong khoảng `year_from`–`year_to` của generation (nếu generation đã biết); variant bắt buộc kèm generation.
- **Không** có cột tên riêng — tên hiển thị của application được suy ra từ make/model/generation/variant/year ở tầng application (tránh trùng lặp dữ liệu và lệch tên).

### 4.13 `product_vehicle_fitments` — Tương thích sản phẩm ↔ xe (P0)

| Cột | Kiểu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| `id` | UUID | PK, `DEFAULT gen_random_uuid()` | |
| `product_id` | UUID | NOT NULL, FK → `products.id` ON DELETE CASCADE | Phụ tùng được gắn. CASCADE theo nguyên tắc mục 2.3 (chỉ khi product bị xóa cứng — product có đơn thì không xóa cứng được) |
| `vehicle_application_id` | UUID | NOT NULL, FK → `vehicle_applications.id` ON DELETE RESTRICT | Cấu hình xe tương thích — đúng một application cho mỗi bản ghi (BR-011) |
| `fitment_note` | TEXT | NULL | Ghi chú áp dụng (ví dụ minh họa về loại ghi chú: "chỉ bản số tự động" — không phải dữ liệu thật). Lưu riêng, không làm thay đổi định danh xe |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

`UNIQUE(product_id, vehicle_application_id)` — chống fitment trùng (ràng buộc §7 số 7). **Không** có cột `source`/`verification_status` ở P0 — chưa có căn cứ nghiệp vụ; nếu Henry quyết định cần xác minh fitment thì thêm ở M04 (ghi chú cho M04, xem mục 11 PD-01). **Không** mặc định fitment chưa xác minh là tương thích chắc chắn — chưa gắn fitment nghĩa là chưa biết, hiển thị theo FR-031.

### 4.14 `fitment_change_logs` — Log thay đổi fitment (P0)

| Cột | Kiểu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| `id` | UUID | PK, `DEFAULT gen_random_uuid()` | |
| `product_id` | UUID | NOT NULL, FK → `products.id` ON DELETE CASCADE | Sản phẩm bị thay đổi fitment |
| `vehicle_application_id` | UUID | NOT NULL, FK → `vehicle_applications.id` ON DELETE RESTRICT | Cấu hình xe liên quan |
| `action` | `fitment_action` | NOT NULL | Enum: `ATTACH`, `DETACH` |
| `changed_by_admin_id` | UUID | NOT NULL, **chưa có FK** | Tài khoản admin thực hiện. FK tới bảng users sẽ được bổ sung ở M02 khi bảng users tồn tại (mục 4.18) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Thời điểm thay đổi (không có `updated_at` — log chỉ ghi thêm, không sửa) |

FR liên quan: FR-033 (ghi ai, khi nào để truy vết khi khách khiếu nại mua nhầm). Log chỉ append — không cập nhật/xóa dòng log.

### 4.15 `url_redirects` — Redirect 301 cho slug đã công bố (P0)

| Cột | Kiểu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| `id` | UUID | PK, `DEFAULT gen_random_uuid()` | |
| `entity_type` | `redirect_entity` | NOT NULL | Enum: `CATEGORY`, `BRAND`, `PRODUCT` — loại thực thể đổi slug |
| `entity_id` | UUID | NOT NULL | ID thực thể (chưa có FK đa hình — application-level kiểm tra đích còn tồn tại; M02 có thể tách thành 3 cột FK nullable nếu cần) |
| `old_slug` | VARCHAR(255) | NOT NULL | Slug cũ đã công bố |
| `new_slug` | VARCHAR(255) | NOT NULL | Slug mới cần chuyển tới |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

`UNIQUE(entity_type, old_slug)` — tra redirect theo đúng loại thực thể + slug cũ (slug có thể trùng tên giữa các loại thực thể khác nhau, nhưng URL khác nhau nhờ tiền tố `/parts/`, `/brands/`, `/products/`). FR/BR liên quan: FR-018, BR-005. Slug đổi khi tên hiển thị đổi thì **không** tạo redirect (slug không đổi — FR-017); chỉ khi slug đã công bố bị đổi mới tạo dòng redirect.

### 4.16 `orders` — Đơn hàng (RANH GIỚI — thiết kế đầy đủ ở M05)

Bảng này chỉ thể hiện ranh giới cần thiết cho snapshot (Task Brief §3.7). **Không** thiết kế toàn bộ module Order trong task này.

| Cột | Kiểu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| `id` | UUID | PK, `DEFAULT gen_random_uuid()` | |
| `order_code` | VARCHAR(32) | NOT NULL, UNIQUE | Mã đơn công khai — **không đoán được, không phải số thứ tự liên tục** (FR-058). Quy tắc sinh mã chi tiết do M05 chốt (D-08/D-09 liên quan); ERD chỉ chốt tính chất: unique + không tuần tự |
| `customer_name` | VARCHAR(255) | NOT NULL | Tên người nhận (P0: khách vãng lai — lưu trực tiếp trên đơn, chưa có bảng customers) |
| `customer_phone` | VARCHAR(32) | NOT NULL | Số điện thoại người nhận |
| `shipping_address` | TEXT | NOT NULL | Địa chỉ giao hàng |
| `customer_id` | UUID | NULL, **chưa có FK** | Tài khoản khách hàng — P1 (FR-093/FR-094). NULL ở P0 (khách vãng lai); FK tới bảng `customers` bổ sung ở P1 |
| `payment_method` | `payment_method` | NOT NULL | Enum P0: `COD`, `BANK_TRANSFER` (BR-009). Thanh toán online là P1 (FR-059) |
| `status` | `order_status` | NOT NULL, DEFAULT 'PENDING' | Enum **đề xuất, M05 chốt** (PD-08): `PENDING`, `CONFIRMED`, `SHIPPING`, `COMPLETED`, `CANCELLED`, `REFUNDED` — theo khung PRD 4.9 (mới đặt → xác nhận → đang giao → hoàn tất, cộng hủy/hoàn) |
| `total_amount` | DECIMAL(12,2) | NOT NULL, CHECK (`total_amount` >= 0) | Tổng tiền đơn (tính từ `order_items.line_total`; quy tắc tính lại do M05 chốt) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

FR liên quan: FR-050 → FR-066 (khung). Trạng thái đơn chờ xác nhận chuyển khoản (BR-010, FR-063) là quy tắc luồng M05, không phải cột riêng.

### 4.17 `order_items` — Dòng hàng của đơn, gồm snapshot (RANH GIỚI — M05)

| Cột | Kiểu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| `id` | UUID | PK, `DEFAULT gen_random_uuid()` | |
| `order_id` | UUID | NOT NULL, FK → `orders.id` ON DELETE RESTRICT | Đơn chứa dòng hàng này |
| `product_id` | UUID | NOT NULL, FK → `products.id` ON DELETE RESTRICT | **Tham chiếu** tới sản phẩm (để liên kết/phân tích) — không dùng để lấy lại tên/giá. RESTRICT: sản phẩm đã có trong đơn không được xóa cứng |
| `product_name_snapshot` | VARCHAR(255) | NOT NULL | **Snapshot:** tên sản phẩm tại thời điểm đặt hàng |
| `sku_snapshot` | VARCHAR(64) | NOT NULL | **Snapshot:** SKU nội bộ tại thời điểm đặt hàng |
| `unit_price_snapshot` | DECIMAL(12,2) | NOT NULL, CHECK (`unit_price_snapshot` >= 0) | **Snapshot:** đơn giá tại thời điểm đặt hàng |
| `quantity` | INT | NOT NULL, CHECK (`quantity` > 0) | Số lượng đặt |
| `line_total` | DECIMAL(12,2) | NOT NULL, CHECK (`line_total` >= 0) | Thành tiền dòng = `unit_price_snapshot` × `quantity` (tính ở application, kiểm tra lại ở M05) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

Quy tắc snapshot (mục 8): 4 cột `*_snapshot` là dữ liệu thuần, sao chép giá trị tại thời điểm đặt hàng; đổi tên/SKU/giá catalogue sau đó **không** làm thay đổi các cột này (BR-003, FR-054, FR-061).

### 4.18 Ngoài phạm vi ERD này — điểm nối đã ghi rõ

| Thực thể | Thuộc về | Điểm nối với ERD này |
| --- | --- | --- |
| User / Role / Permission / `user_permissions` / audit log quyền (FR-080 → FR-086) | M01-05 (Admin Dashboard) / M02 (RBAC nền tảng) | `fitment_change_logs.changed_by_admin_id` (UUID, chưa FK) sẽ FK tới `users.id` ở M02; các bảng audit khác (đổi trạng thái đơn FR-066, đổi quyền FR-084) thiết kế cùng module đó |
| Article / ArticleSEO / Category bài viết (FR-067 → FR-074) | M01-05 / M02 | Không nối trực tiếp với Product/Fitment; `article_seo` tách riêng khỏi nội dung (FR-074) — M02 thiết kế |
| Customers / địa chỉ giao hàng (FR-093, FR-094 — P1) | P1 Customer | `orders.customer_id` (nullable, chưa FK) sẽ FK tới `customers.id` ở P1 |
| Inventory — tồn kho theo số lượng (AC-19, P1) | M05 Inventory | Bảng tồn kho P1 sẽ FK tới `products.id`; không thêm cột số lượng vào `products` ở P0 (BR-012) |
| Promotion / Wholesale / Analytics (P1) | M05 trở đi | Xem phân tích mở rộng mục 9 |
| Cấu hình website, form liên hệ (FR-089) | M01-04/M05 | Đích nhận form liên hệ do M01-04/M05 chốt (D-08) — không tạo bảng trong ERD này |

## 5. Quan hệ giữa các bảng

| # | Quan hệ | Cardinality | Ràng buộc FK | Ghi chú |
| --- | --- | --- | --- | --- |
| R-01 | `brands` 1:N `products` | 1:N | `products.brand_id` NOT NULL, RESTRICT | Sản phẩm bắt buộc có thương hiệu; xóa brand còn sản phẩm bị chặn (FR-020) |
| R-02 | `categories` 1:N `products` (danh mục chính) | 1:N | `products.category_id` NOT NULL, RESTRICT | Sản phẩm bắt buộc có danh mục chính |
| R-03 | `categories` 1:N `categories` (cha–con) | 1:N tự tham chiếu | `categories.parent_id` NULL, RESTRICT | NULL = gốc; chống vòng lặp ở application-level |
| R-04 | `products` N:N `categories` (phụ) | N:N qua `product_categories` | PK kép, CASCADE (product) / RESTRICT (category) | Xem mục 3.4 |
| R-05 | `products` 1:N `product_identifiers` | 1:N | `product_identifiers.product_id` NOT NULL, CASCADE | 1 sản phẩm có nhiều mã; SKU nội bộ không nằm ở đây (mục 3.1) |
| R-06 | `products` 1:N `product_images` | 1:N | `product_images.product_id` NOT NULL, CASCADE | Nhiều ảnh/sản phẩm |
| R-07 | `products` 1:N `product_specifications` | 1:N | `product_specifications.product_id` NOT NULL, CASCADE | P1 |
| R-08 | `vehicle_makes` 1:N `vehicle_models` | 1:N | `vehicle_models.make_id` NOT NULL, RESTRICT | Không tạo model khi chưa có make (FR-022) |
| R-09 | `vehicle_models` 1:N `vehicle_generations` | 1:N | `vehicle_generations.model_id` NOT NULL, RESTRICT | |
| R-10 | `vehicle_generations` 1:N `vehicle_variants` | 1:N | `vehicle_variants.generation_id` NOT NULL, RESTRICT | Variant bắt buộc thuộc một generation |
| R-11 | `vehicle_makes` 1:N `vehicle_applications` | 1:N | `vehicle_applications.make_id` NOT NULL, RESTRICT | Lưu trực tiếp để truy vấn nhanh; phải khớp `model.make_id` |
| R-12 | `vehicle_models` 1:N `vehicle_applications` | 1:N | `vehicle_applications.model_id` NOT NULL, RESTRICT | Model là thành phần bắt buộc của application |
| R-13 | `vehicle_generations` 1:N `vehicle_applications` | 1:N (nullable) | `vehicle_applications.generation_id` NULL, RESTRICT | NULL khi chưa phân biệt thế hệ |
| R-14 | `vehicle_variants` 1:N `vehicle_applications` | 1:N (nullable) | `vehicle_applications.variant_id` NULL, RESTRICT | NULL khi chưa phân biệt phiên bản |
| R-15 | `products` N:N `vehicle_applications` | N:N qua `product_vehicle_fitments` | UNIQUE(`product_id`, `vehicle_application_id`) | Quan hệ fitment — tra cứu 2 chiều (FR-030) |
| R-16 | `products` 1:N `fitment_change_logs` | 1:N | `fitment_change_logs.product_id` NOT NULL, CASCADE | Log append-only |
| R-17 | `vehicle_applications` 1:N `fitment_change_logs` | 1:N | `fitment_change_logs.vehicle_application_id` NOT NULL, RESTRICT | |
| R-18 | `vehicle_makes` 1:N `product_identifiers` (issuer OEM) | 1:N (nullable) | `product_identifiers.issuing_make_id` NULL, RESTRICT | Chỉ dùng cho OEM_NUMBER |
| R-19 | `brands` 1:N `product_identifiers` (issuer MPN) | 1:N (nullable) | `product_identifiers.issuing_brand_id` NULL, RESTRICT | Chỉ dùng cho MANUFACTURER_PART_NUMBER / PART_NUMBER |
| R-20 | `orders` 1:N `order_items` | 1:N | `order_items.order_id` NOT NULL, RESTRICT | Đơn không xóa khi còn dòng hàng |
| R-21 | `products` 1:N `order_items` (tham chiếu) | 1:N | `order_items.product_id` NOT NULL, RESTRICT | Chỉ tham chiếu — giá trị thật nằm ở các cột snapshot (mục 8) |

Không có quan hệ 1:1 nào trong ERD này. Mọi quan hệ N:N đều qua junction table có khóa chính rõ ràng (`product_categories`, `product_vehicle_fitments`).

## 6. Index — mỗi index đều có lý do

Quy ước: `UQ` = unique index, `BT` = B-tree, `C` = composite. Index chỉ tạo khi có truy vấn cụ thể dùng tới (Task Brief §4.4 — không tạo index tràn lan). Index cho khóa chính và unique constraint do PostgreSQL tự tạo — không liệt kê lại.

| # | Bảng — cột | Loại | Truy vấn phục vụ / Lý do |
| --- | --- | --- | --- |
| I-01 | `products.sku` | UQ, BT | Tra cứu SKU chính xác — loại tìm kiếm ưu tiên #1 (ADR-010, FR-035) |
| I-02 | `products.slug` | UQ, BT | Mở trang chi tiết `/products/<slug>` (FR-042) |
| I-03 | `products(brand_id, status)` | C, BT | Liệt kê sản phẩm theo thương hiệu + lọc đã xuất bản (FR-007, FR-008) |
| I-04 | `products(category_id, status)` | C, BT | Liệt kê sản phẩm theo danh mục chính (FR-007) |
| I-05 | `products(status, published_at DESC)` | C, BT | Danh sách mới nhất / gợi ý sản phẩm đã xuất bản (FR-003, FR-009) |
| I-06 | `products.deleted_at` | BT | Loại sản phẩm đã soft delete khỏi mọi truy vấn catalogue (partial index `WHERE deleted_at IS NULL` càng tốt — M02 cân nhắc) |
| I-07 | `product_identifiers(normalized_value, identifier_type)` | C, BT | Tra cứu mã chính xác theo loại mã: OEM → sản phẩm, MPN → sản phẩm (FR-034, FR-035). Thứ tự cột: `normalized_value` trước để tìm theo mã không cần biết loại trước |
| I-08 | `product_identifiers(product_id)` | BT | Liệt kê mọi mã của một sản phẩm (trang chi tiết — FR-043) |
| I-09 | `product_identifiers(identifier_type, normalized_value, issuing_brand_id)` | UQ partial, BT | Chống trùng MPN cùng issuer (mục 4.4). Chỉ áp dụng `WHERE identifier_type = 'MANUFACTURER_PART_NUMBER'` |
| I-10 | `brands.slug` | UQ, BT | Trang thương hiệu `/brands/<slug>` (FR-016) |
| I-11 | `categories.slug` | UQ, BT | Trang danh mục `/parts/<slug>` (FR-007) |
| I-12 | `categories(parent_id)` | BT | Duyệt cây danh mục, liệt kê danh mục con (FR-015) |
| I-13 | `product_categories(category_id)` | BT | Liệt kê sản phẩm trong một danh mục (kể cả danh mục phụ — FR-007) |
| I-14 | `product_images(product_id, sort_order)` | C, BT | Ảnh của sản phẩm theo đúng thứ tự hiển thị (FR-042) |
| I-15 | `vehicle_models(make_id, slug)` | UQ, BT | Bộ chọn xe: liệt kê dòng theo hãng (FR-024); slug unique theo hãng |
| I-16 | `vehicle_generations(model_id)` | BT | Liệt kê thế hệ theo dòng xe (FR-024) |
| I-17 | `vehicle_variants(generation_id)` | BT | Liệt kê phiên bản theo thế hệ |
| I-18 | `vehicle_applications(model_id, generation_id, variant_id, year)` | UQ NULLS NOT DISTINCT, BT | Chống trùng application (mục 4.12); đồng thời phục vụ tra cứu application theo bộ chọn xe |
| I-19 | `vehicle_applications(make_id, model_id)` | C, BT | Lọc application theo hãng/dòng khi nhập Excel và khi duyệt xe |
| I-20 | `product_vehicle_fitments(product_id)` | BT | Từ sản phẩm → danh sách xe tương thích (FR-028, FR-030) |
| I-21 | `product_vehicle_fitments(vehicle_application_id)` | BT | Từ xe → danh sách phụ tùng tương thích (FR-023, FR-030) — tra cứu ngược |
| I-22 | `product_vehicle_fitments(product_id, vehicle_application_id)` | UQ, BT | Chống fitment trùng (ràng buộc §7 số 7) |
| I-23 | `orders.order_code` | UQ, BT | Tra cứu đơn bằng mã công khai (FR-058) — mã không tuần tự nên B-tree tra cứu điểm là đủ |
| I-24 | `order_items(order_id)` | BT | Chi tiết đơn: liệt kê dòng hàng (FR-061) |
| I-25 | `url_redirects(entity_type, old_slug)` | UQ, BT | Tra redirect 301 khi truy cập URL cũ (FR-018) |
| I-26 | `fitment_change_logs(product_id, created_at DESC)` | C, BT | Lịch sử thay đổi fitment của một sản phẩm (FR-033) |

**Không tạo:** index full-text trên tên sản phẩm (tìm kiếm gần đúng do Meilisearch đảm nhiệm — INT-004, ADR-003); index trên `description`/`note` (TEXT, không dùng để lọc); index trên cột `is_visible` đơn lẻ (tính chọn lọc thấp, dùng kèm composite I-03/I-04 khi cần).

## 7. 12 ràng buộc dữ liệu bắt buộc (Task Brief §5)

| # | Ràng buộc | Thực thi ở | Cách thực thi trong ERD này |
| --- | --- | --- | --- |
| 1 | Không có Product Identifier thuộc Product không tồn tại | Database | FK `product_identifiers.product_id` → `products.id` (NOT NULL) |
| 2 | Không có Fitment thuộc Product không tồn tại | Database | FK `product_vehicle_fitments.product_id` → `products.id` (NOT NULL) |
| 3 | Không có Fitment tham chiếu Vehicle không tồn tại | Database | FK `product_vehicle_fitments.vehicle_application_id` → `vehicle_applications.id` (NOT NULL). "Vehicle" ở đây là application (mục 3.2) |
| 4 | Không có Vehicle Model thuộc Make không tồn tại | Database | FK `vehicle_models.make_id` → `vehicle_makes.id` (NOT NULL) |
| 5 | Không có Year thuộc Model không tồn tại | Database + Application | Năm không phải bảng riêng: `vehicle_generations.year_from/year_to` thuộc về model qua FK `model_id`; `vehicle_applications.year` thuộc về model qua FK `model_id` — không thể tồn tại year "mồ côi" |
| 6 | Không có SKU trùng | Database | `UNIQUE(products.sku)` trên dạng đã chuẩn hóa (mục 3.1) |
| 7 | Không có fitment trùng | Database | `UNIQUE(product_id, vehicle_application_id)` trên `product_vehicle_fitments` (I-22) |
| 8 | Không có mã định danh rỗng hoặc chỉ chứa khoảng trắng | Database + Application | `CHECK(length(trim(identifier_value)) > 0)` trên `product_identifiers.identifier_value` (và tương tự `products.sku`); **mã chỉ gồm ký tự phân cách (vd. `---`, `___`) chuẩn hóa thành rỗng thì bị từ chối** — `CHECK(length(trim(normalized_value)) > 0)` trên `product_identifiers.normalized_value` và `CHECK(length(trim(sku)) > 0)` trên `products.sku`, cộng validation ở application-level trước khi ghi (Revision 02 FIX-03) |
| 9 | Không cho phép slug trùng trong cùng phạm vi unique | Database | `UNIQUE` trên `brands.slug`, `categories.slug`, `products.slug` (toàn cục); `UNIQUE(make_id, slug)`, `UNIQUE(model_id, slug)`, `UNIQUE(generation_id, slug)` (theo phạm vi cha) |
| 10 | Không để xóa một bản ghi cha làm mất dữ liệu lịch sử không chủ đích | Database | `ON DELETE RESTRICT` cho mọi FK danh mục/xe/thương hiệu/đơn hàng; `products.deleted_at` soft delete thay cho xóa cứng; `ON DELETE CASCADE` chỉ cho dữ liệu con không mang giá trị lịch sử (mục 2.3) |
| 11 | Không tạo vòng lặp trong cây Category | Application | Trước khi lưu `categories.parent_id`, duyệt tổ tiên của parent — nếu gặp chính category đang sửa thì từ chối. Không thể biểu diễn bằng CHECK; ghi chú cho M02/M03 implement trong service + test. Recursive CTE kiểm tra định kỳ ở M03 |
| 12 | Không gộp các loại mã SKU/OEM/Part Number/Alternate Number | Database | `products.sku` tách riêng SKU nội bộ; `product_identifiers.identifier_type` là enum bắt buộc — mỗi dòng mã đúng một loại; `UNIQUE(product_id, identifier_type, normalized_value)` ngăn cùng một mã mang 2 loại trên cùng sản phẩm |

**Phân biệt rõ:** ràng buộc 1–4, 6–10, 12 (phần database) được database bảo đảm bằng FK/UNIQUE/CHECK — kể cả khi application có lỗi, dữ liệu vẫn không sai. Ràng buộc 5 (một phần), 8 (một phần), 11 cần application-level validation — được ghi rõ ở đây để M02/M03 viết test cho đúng chỗ, không lầm tưởng database đã chặn.

## 8. Order Snapshot — ranh giới (Task Brief §3.7)

**Nguyên tắc (BR-003, FR-054, FR-061 — Đã duyệt):** tại thời điểm đặt hàng, đơn lưu snapshot tên sản phẩm, SKU, giá, số lượng. Giá/tên/SKU catalogue đổi sau đó **không** làm thay đổi đơn đã đặt.

**Cách ERD thể hiện:**

| Trường ở `order_items` | Loại | Nguồn lúc tạo đơn | Sau khi catalogue đổi |
| --- | --- | --- | --- |
| `product_id` | Tham chiếu (FK) | `products.id` lúc đặt | Giữ nguyên — chỉ dùng để liên kết/phân tích, không dùng để lấy lại dữ liệu |
| `product_name_snapshot` | Snapshot (dữ liệu thuần) | Sao chép `products.name` | Không đổi |
| `sku_snapshot` | Snapshot (dữ liệu thuần) | Sao chép `products.sku` | Không đổi |
| `unit_price_snapshot` | Snapshot (dữ liệu thuần) | Sao chép `products.price` | Không đổi |
| `quantity` | Dữ liệu của đơn | Khách chọn lúc đặt | Chỉ đổi theo quy tắc sửa đơn của M05 (FR-065) |
| `line_total` | Dữ liệu của đơn | `unit_price_snapshot` × `quantity` | Tính lại chỉ khi quantity đổi (M05) |

**Quy tắc cho M05 (ghi chú, không phải thiết kế đầy đủ):** khi tạo đơn, service phải đọc `products` và sao chép 3 giá trị snapshot trong cùng một transaction với việc tạo `orders`/`order_items`; mọi màn hình hiển thị đơn đã đặt (admin FR-061, tra cứu công khai FR-058, tài khoản khách P1 FR-094) chỉ đọc các cột snapshot, **không** JOIN sang `products` để lấy tên/giá. Nếu `products` bị soft delete sau khi đã có đơn, đơn vẫn hiển thị đúng nhờ snapshot + `product_id` chỉ còn ý nghĩa tham chiếu lịch sử.

**Không thiết kế trong task này:** vòng đời trạng thái đơn chi tiết (PD-08, M05), lý do hủy (M05, Henry duyệt), trừ kho (P1 Inventory, AC-19), phí vận chuyển (P1), mã giảm giá (P1, FR-059).

## 9. Phân tích mở rộng P1/P2 (Task Brief §6)

ERD này không thiết kế toàn bộ module P1/P2, nhưng mọi điểm nối đã được chừa sẵn để mở rộng không phá vỡ dữ liệu Product/Fitment:

| Module mở rộng | Điểm nối đã có | Phân tích |
| --- | --- | --- |
| Inventory P1 (AC-19) | `products.id` | Bảng tồn kho P1 (vd. `inventory_stocks`: `product_id` FK, `quantity`, `low_stock_threshold`) FK tới `products.id`. **Không** thêm cột số lượng vào `products` ở P0 (BR-012). Trừ kho khi đơn xác nhận: cập nhật bảng tồn kho, không sửa `products` |
| Customer P1 (FR-093, FR-094) | `orders.customer_id` (nullable, chưa FK) | Bảng `customers` + `customer_addresses` (P1) FK từ `orders.customer_id`. Đơn P0 (khách vãng lai) giữ `customer_id = NULL` và thông tin inline — không cần migrate dữ liệu cũ |
| Wholesale P1 | `products.id` | Bảng giá sỉ (vd. `wholesale_prices`: `product_id` FK, `min_quantity`, `price`) FK tới `products.id`. Giá lẻ `products.price` giữ nguyên làm giá mặc định; giá sỉ là bảng riêng, không sửa `products` |
| Promotion P1 (FR-059) | `orders.id`, `order_items.id` | Bảng khuyến mãi + cột chiết khấu trên `orders`/`order_items` bổ sung ở P1. Snapshot P0 không bị ảnh hưởng vì chiết khấu lưu riêng, không sửa `unit_price_snapshot` |
| Analytics P1 (FR-079) | Toàn bộ | Chỉ đọc (read-only aggregates) trên dữ liệu đã có; không thêm bảng nghiệp vụ. `order_items` (snapshot + `product_id`) đủ để tính sản phẩm bán chạy theo số lượng |
| Warranty P2 | `order_items.id` | Bảng bảo hành (vd. `warranty_claims`) FK tới `order_items.id` — gắn với đúng dòng hàng đã mua (kèm snapshot), không gắn với `products.id` (tránh nhầm khi catalogue đổi) |
| ERP P2 | `products.id`, `product_identifiers.id` | Thêm cột mã ERP ngoài (vd. `erp_code` trên `products` hoặc một dòng `identifier_type` mới) — cấu trúc identifier đã mở (thêm giá trị enum), không phá vỡ mã hiện có |
| SKU mở rộng nhiều biến thể? | `products.id` | Nếu sau này một "sản phẩm" cần nhiều biến thể (vd. cùng bơm nước, nhiều kích cỡ), đường mở rộng là bảng `product_variants` FK tới `products.id`, mỗi variant có SKU riêng — và `products.sku` trở thành SKU của variant mặc định. Đây là quyết định nghiệp vụ (PD-02) — ERD hiện tại không khóa cửa này |
| Một sản phẩm nhiều mã OEM? | `product_identifiers` | Đã hỗ trợ (1:N). Không giới hạn số OEM/sản phẩm |
| Một OEM nhiều mã thay thế? | `product_identifiers` | Đã hỗ trợ — mã thay thế là các dòng `ALTERNATE_NUMBER` trỏ cùng `product_id`; không cần bảng riêng |
| Fitment mở rộng theo động cơ/hộp số/phiên bản? | `vehicle_variants`, `vehicle_applications` | Thêm cấp chi tiết = thêm dòng `vehicle_variants` (hoặc thêm cột cấu trúc vào `vehicle_variants` khi PD-01 chốt) — `product_vehicle_fitments` không đổi vì đích của nó là `vehicle_applications` |
| Nhập fitment hàng loạt bằng Excel ở M04? | `vehicle_applications` | Import chỉ cần Make/Model/Year (+ Generation/Variant nếu có) để resolve thành `application_id` rồi insert `product_vehicle_fitments`. Dòng lỗi báo rõ từng dòng (FR-032) — validation theo đúng quy tắc mục 7; import không nhập nửa chừng (transaction) |

**Khẳng định về quy mô (AC-10):** 2.000–10.000 SKU với mô hình này là nhỏ đối với PostgreSQL: `products` ~10k dòng; `product_identifiers` ~30–50k dòng (trung bình 3–5 mã/sản phẩm); `product_vehicle_fitments` tăng theo dữ liệu fitment (mỗi sản phẩm trung bình hàng chục xe → hàng trăm nghìn dòng vẫn tra cứu tốt nhờ index I-20/I-21). Không cần partition ở quy mô này. Tìm kiếm gần đúng do Meilisearch đảm nhiệm (INT-004), không đặt full-text index lên PostgreSQL.

## 10. Truy vết (Traceability) — Bảng → FR / BR / ADR

| Bảng | FR | BR / ADR |
| --- | --- | --- |
| `brands` | FR-002, FR-016 | BR-005 (slug/redirect); ADR-004 (slug tiếng Anh) |
| `categories` | FR-007, FR-015, FR-017 → FR-020 | BR-005; ADR-004 |
| `products` | FR-007 → FR-014, FR-042 → FR-049 | BR-001 (mã), BR-012 (P0 chỉ trạng thái còn hàng); ADR-010 (quy mô, SKU) |
| `product_identifiers` | FR-034 → FR-036, FR-043 | BR-001, BR-002; ADR-010 |
| `product_categories` | FR-007, FR-014 (P1) | — |
| `product_images` | FR-010, FR-042 | NFR-012 (alt text) |
| `product_specifications` (P1) | FR-013 (P1) | — |
| `vehicle_makes` | FR-021, FR-024 | ADR-010 (dữ liệu xe xây từ đầu) |
| `vehicle_models` | FR-022 → FR-024 | ADR-010 |
| `vehicle_generations` | FR-022, FR-024 | ADR-010 |
| `vehicle_variants` | FR-022, FR-024 | ADR-010 |
| `vehicle_applications` | FR-023 → FR-026, FR-032 | BR-011 (fitment có cấu trúc); ADR-010 |
| `product_vehicle_fitments` | FR-027 → FR-033 | BR-011; ADR-010 (tra cứu ngược) |
| `fitment_change_logs` | FR-033 | NFR-007 (audit log) |
| `url_redirects` | FR-018 | BR-005 |
| `orders` (ranh giới) | FR-050 → FR-058, FR-060 → FR-066 | BR-009 (COD + chuyển khoản), BR-010; ADR-010 |
| `order_items` (ranh giới) | FR-054, FR-061 | BR-003 (snapshot); ADR-010 |

Mọi FR P0 thuộc phạm vi Product/SKU/OEM/Vehicle/Fitment/Order-snapshot đều có ít nhất một bảng tương ứng. FR thuộc RBAC (FR-080 → FR-086), CMS/SEO (FR-067 → FR-074), Dashboard (FR-075 → FR-078) không thuộc phạm vi ERD này (mục 4.18).

## 11. Pending Decisions — cần quyết định (không tự chốt)

Mỗi quyết định gồm: vấn đề, các phương án, ưu/nhược, khuyến nghị của Muse, ảnh hưởng, người quyết định.

### PD-01 — Mức chi tiết Vehicle Fitment khi nhập dữ liệu thật (Model/Year hay Generation/Variant?)

- **Vấn đề:** dữ liệu xe thật chưa có (D-02/D-03). Khi nhập, fitment ghi ở mức nào?
- **Phương án:** A. Chỉ Model+Year (nhanh, kém chính xác); B. Model+Year+Generation (khuyến nghị — cân bằng); C. Tới Variant (chính xác nhất, dữ liệu khó nhất).
- **Khuyến nghị của Muse:** phương án D của ERD (mục 3.2) đã cho phép cả 3 mức cùng tồn tại — mức nào có dữ liệu thì ghi mức đó; ưu tiên nâng dần lên B/C khi có dữ liệu. Quyết định cần Henry chốt: **mức tối thiểu bắt buộc khi nhập fitment mới** (đề xuất: ít nhất Model+Year, khuyến khích Generation).
- **Ảnh hưởng:** định dạng file Excel M04; UX admin gắn fitment; độ chính xác cảnh báo không tương thích (FR-029).
- **Người quyết định:** Henry (nghiệp vụ). ChatGPT review kỹ thuật.

### PD-02 — Một sản phẩm có một SKU hay nhiều SKU?

- **Vấn đề:** ERD hiện tại chốt 1 SKU/sản phẩm (`products.sku`).
- **Phương án:** A. 1 SKU (khuyến nghị — SKU là mã nội bộ do SeeCar Auto cấp, 1 sản phẩm = 1 SKU); B. Nhiều SKU (khi một "sản phẩm" có nhiều biến thể bán rời).
- **Khuyến nghị:** A. Nếu sau này cần B, migration đã tính trước (mục 3.1) — SKU chuyển thành dòng `INTERNAL_SKU` trong `product_identifiers`.
- **Ảnh hưởng:** cấu trúc `products`; luồng tìm kiếm SKU; import catalogue M03.
- **Người quyết định:** Henry.

### PD-03 — Quan hệ giữa OEM Number và nhiều sản phẩm

- **Vấn đề:** một mã OEM có được gắn cho nhiều sản phẩm aftermarket khác nhau không?
- **Khuyến nghị:** được (mục 3.1) — OEM không unique toàn cục; chỉ chống trùng trong cùng sản phẩm. Nếu Henry yêu cầu OEM là duy nhất toàn hệ thống (một OEM = một sản phẩm duy nhất), ERD phải thêm unique index toàn cục cho OEM — thay đổi nhỏ nhưng ảnh hưởng dữ liệu import M03/M04.
- **Ảnh hưởng:** import dữ liệu; kết quả tìm kiếm theo OEM (1 kết quả vs nhiều kết quả).
- **Người quyết định:** Henry.

### PD-04 — Quy tắc phân biệt Manufacturer và Brand

- **Vấn đề:** issuer của mã được lưu bằng 2 cột FK (`issuing_make_id` cho OEM, `issuing_brand_id` cho MPN) — mục 3.3.
- **Phương án:** A. Giữ 2 cột FK (khuyến nghị — FK thật, rõ ràng); B. Một bảng `manufacturers` chung (trùng lặp với makes/brands).
- **Khuyến nghị:** A. Cần Henry xác nhận rằng hãng xe cấp mã OEM và hãng phụ tùng cấp mã MPN là hai tập issuer khác nhau (không dùng lẫn).
- **Ảnh hưởng:** form nhập mã ở admin M03; validation khi nhập mã.
- **Người quyết định:** Henry (nghiệp vụ) + ChatGPT (kỹ thuật).

### PD-05 — Quy tắc xóa Product, Vehicle, Category khi đã có dữ liệu liên kết

- **Vấn đề:** xóa thì chặn, ẩn, hay chuyển dữ liệu?
- **Khuyến nghị:** Product đã có đơn → không xóa cứng, chỉ soft delete/ẩn (`deleted_at`, `status = HIDDEN`); Category/Brand/Vehicle còn dữ liệu con → RESTRICT, admin phải chuyển sản phẩm/fitment trước (FR-020) hoặc ẩn (`is_visible = false`). Xóa cứng chỉ cho bản ghi chưa từng được dùng.
- **Ảnh hưởng:** UX admin; quy tắc cascade ở M02/M03.
- **Người quyết định:** Henry (nghiệp vụ) + ChatGPT (kỹ thuật).

### PD-06 — Mức độ chi tiết của Vehicle Year và khoảng năm sản xuất

- **Vấn đề:** khoảng năm hợp lệ ERD chốt là 1900–2100; generation dùng khoảng năm, application dùng năm cụ thể.
- **Khuyến nghị:** giữ như ERD. Cần Henry xác nhận: có xe đời trước 1900 hoặc sau 2100 cần quản lý không (không — xe ô tô thương mại không có trường hợp này ở P0); và có cần lưu tháng sản xuất không (không ở P0 — chỉ cần năm).
- **Ảnh hưởng:** validation import Excel M04; bộ chọn xe.
- **Người quyết định:** Henry.

### PD-07 — Các trường thông số kỹ thuật có cấu trúc và khả năng mở rộng P1

- **Vấn đề:** `product_specifications` dạng key/value có đủ cho lọc P1 (FR-013) không, hay cần bảng spec chuẩn (vd. bảng `spec_definitions` với đơn vị, kiểu dữ liệu)?
- **Khuyến nghị:** key/value đủ cho P1 (lọc theo khóa + giá trị); nếu Henry muốn danh mục thông số chuẩn (vd. đường kính luôn tính bằng mm), M03 bổ sung bảng định nghĩa spec — không đổi cấu trúc `product_specifications`.
- **Ảnh hưởng:** form nhập thông số M03; độ chính xác của lọc P1.
- **Người quyết định:** Henry (nghiệp vụ) + ChatGPT (kỹ thuật).

### PD-08 — Vòng đời trạng thái đơn hàng (giá trị enum `order_status`)

- **Vấn đề:** ERD đề xuất 6 giá trị theo khung PRD 4.9 (`PENDING`, `CONFIRMED`, `SHIPPING`, `COMPLETED`, `CANCELLED`, `REFUNDED`) — chưa phải quyết định cuối.
- **Khuyến nghị:** giữ khung này làm đề xuất; giá trị cuối cùng do M05 chốt theo nghiệp vụ Henry duyệt (FR-062 — "vòng đời chi tiết do M01-02/M05 chốt"). Trạng thái đơn chuyển khoản chờ xác nhận tiền (BR-010) có thể là một giá trị riêng hoặc một cờ — M05 quyết định, ERD không khóa.
- **Ảnh hưởng:** M05 E-commerce; tra cứu đơn FR-058.
- **Người quyết định:** Henry.

### PD-09 — Có cần trường `source` / `verification_status` cho fitment không?

- **Vấn đề:** ERD P0 không có 2 trường này (chưa có căn cứ nghiệp vụ — mục 4.13).
- **Phương án:** A. Không thêm (khuyến nghị P0 — fitment do admin gắn là đã đủ căn cứ ở P0); B. Thêm `source` (vd. "nhà cung cấp", "kiểm chứng thực tế") và `verification_status` (vd. "chưa xác minh"/"đã xác minh") khi Henry yêu cầu quản lý độ tin cậy fitment.
- **Ảnh hưởng:** M04 Fitment; hiển thị cảnh báo cho khách khi fitment chưa xác minh (FR-031 mở rộng).
- **Người quyết định:** Henry.

## 12. Hướng dẫn đọc ERD và ghi chú cho M02

**Cách đọc sơ đồ (`product-fitment-erd.mmd`):** mỗi khối là một bảng; dòng đầu trong khối là PK; các dòng có `FK` là khóa ngoại; `UK` là unique. Đường nối ghi cardinality: `||--o{` = 1:N, `}o--o{` = N:N qua junction (sơ đồ vẽ rõ junction ở giữa). Bảng viền đậm nét đứt trong sơ đồ là bảng ranh giới M05 (`orders`, `order_items`) và bảng P1 (`product_specifications`).

**Ghi chú cho M02 (triển khai Prisma schema):**

1. Enum Prisma: `product_status`, `availability_status`, `identifier_type`, `fitment_action`, `redirect_entity`, `payment_method`, `order_status` — tạo đúng 7 enum này, không thêm enum ngoài ERD.
2. `UNIQUE NULLS NOT DISTINCT` cho `vehicle_applications` — PostgreSQL 15+; nếu môi trường dùng PostgreSQL < 15 thì thay bằng partial index + application check (ghi chú này để M02 không bị bất ngờ).
3. Partial unique indexes (I-09, `is_primary`, `is_primary` của ảnh) — Prisma `@@unique` không biểu diễn được partial index; M02 viết bằng raw SQL trong migration và ghi chú trong schema.
4. `CHECK` constraints (năm 1900–2100, giá >= 0, `year_to >= year_from`, issuer theo loại mã, identifier không rỗng) — Prisma không sinh CHECK từ schema; M02 thêm bằng `@@check` (Prisma 6 hỗ trợ) hoặc raw SQL migration.
5. `updated_at` tự động — dùng Prisma middleware hoặc PostgreSQL trigger; chọn một cách duy nhất, ghi vào M02.
6. Không tạo Prisma schema/migration trong task này — M02 làm sau khi ChatGPT ACCEPT ERD này.
7. **Render sơ đồ Mermaid — ĐÃ kiểm chứng (Revision 02):** sơ đồ đã render thành công bằng Mermaid thật (mermaid.live v12.3.0, kiểm chứng ngày 26/11/2026 ~12:33): đủ 17/17 bảng theo tên, tên bảng + hàng thuộc tính + ký hiệu PK/FK/UK đọc rõ khi phóng to, đường quan hệ có nhãn, không hộp chồng lấn, không chữ bị cắt (xem toàn bộ thì chữ nhỏ vì sơ đồ lớn — phải phóng to mới đọc rõ, đây là hệ quả kích thước, không phải lỗi render). Ngoài ra đã render bằng Mermaid 11 trong Node (jsdom): SVG ~424 KB, đủ 17/17 bảng, 497 đường nối — nhưng ảnh PNG chuyển từ SVG bằng sharp không hiện chữ (foreignObject không được hỗ trợ) nên chỉ dùng làm bằng chứng cấu trúc, bằng chứng đọc được là bản render trên mermaid.live. Link xem sơ đồ: https://mermaid.live/edit#pako:eNq9WU9v3EQU_ypPliIlUrrbIjiwFYdAEqjShNASBNJK1qxn1h7FnjEz46WmVEJCCHHgUJULqpBaoqpCLSqicFkL9eCq38N8Epixvbvend04JW0ukef9mfd-78_Mm73peBwTp-esrcHOtW345-sf4Toh7yEBW4nisL5_8dKFi29s9NnaGlx_cR-e3y6yO7BPRIQoBi_gEOV_QpA_ZgHgInsCIS2y7xI4FBwnnoIuXN87gi58uLMPXfiEBNQLCexSFRGmOkbtgZ8U2R0GXkBB0WL8TPUAc092MVJogCTp7lzb7kTYGBcV2Q8UBsX4hPldr8h-Ut3jIH-KQAnOfJATE1l-LzXq46AYn1A4DorsbgyjIrtLoVI4yu_N7bS99fGWu33lvY-vfHiwde2zToRLGz9KUnjxe5Hd9XpwuAfvwKGgERIp7JF0E3b1yi4XhPqsXDnSK0eMfp4QWFc8v8fAK7IH3kap7uqLJ0eQ_wzr18iISsoZXHwDdq98qqHuTdAlYpsiX6AI9j7Ifzx4H7z8KRznf0NQYsySMESDkBiV2peKbUCL7JsEMC2ybxk8v60NP_EgKc1RAeEGlPsRjCh4ATLAjvLHMCrGv6U9o-4CGHAne0zV-AEFkf9VAb4IGKyXkgeV5IYxrUT8stEN4OX3PVBCa_yZ-RAU2Uk83erzBDFQosh-YD6sj3AHRmXeuD5hRCBFOZOdlCDhKr5RqWzY5wX5GNbWgPkoBVWM79cpA89v508Bm1BS_fFLernyV4aJr51-iCbbRRyTUELXtv_M6ggJipiSFf6VQRFivs4DW2IatLWRzP8vAEX2fSM4lalegCpV60cHVz462lmP0DFxKd40tm5sQr2szbSsT62dEmu4dMhvkKiBVgmUKrJHzK-NmMZOl94DD97svP3P13fe7Fy6VKbyuyVfXNa7K2Pi0SH1KpDC_B4cXroMXGAiZNf8c6kiUUkSiAXgUxOM9f2Lb4EKTAOA42L8TOM1fpga2B7qwpnUQ5_Bfy4MBGJYwldfXbjAb9YGSOhBgGTJ4SFFfC4osXH1nbiq4Yot7TvLxGZWjCAShCngw1piora5jUsxYYoOKRENu5axN7YJqVQEu5Sd4ktTyuNMIcpO2YhGyCetTJqLZwuJuiqGZY8vERtSJZeBVTG6XoCYT9yQ-8Z97vsEu0Mu7FKzqdQDQYZEEOYR7A7SUmBSxOh4itlcZc-4M0eZ458tfIvQLHlOctIcbHvZTENxHM7g3Xcoq5FbbWMLwRV2tpCeuHJ20QZLy4RRBMMgbaOpXQZZUbdXat-hUiZE6mtLbYC13SyT2z88qOXK1mdP22m1Nva4WX7pvyShGCiGw73pmlSCMh8YisjCojnFjhaZMZGeoLGGbYEWcp-7iQinhAHnIUEMqHT1_cTcMWqaohGRCkUxeIIg3aKQslGTGDeotxb62ClumrWy1boUw-7LIkCZAkxlHKLUNfC_Fj8n_apdMOVxYgvbmWIsAy6UuyrSVpqxymTePMyGUp-OS2IgFVKJXFhGI0RDNKAhVak7z4OJRyMUQiyoZ0U8TgYhlcFSzM8WkSYVk5Asj1ejoFsl6ETOhs5Um6vSmKyij1CYLDIwLiIU0i8JnmcoLZIyocx3q5vhYvRqBmt8Z9K_ugudd_q7K8p9BrnDVUl3eHotz8ewvN6cQ_i0omZrrPM7VK4iN1TTNKkLcHmPOQPIcx7NXcP-v2daoXtMUjthLtVWdNBTPWieuq_gZHutp5cetBuXsI42qwfWAc0MWbODXZCfMH-zHtOrhwk9Ik4fCDrWm16beNtawGl4vgpcZmf0JjjNMXUBHZz_wXy4QTorVVZjfw8Ojq5e3Xr36o7Roz-A-cHzX5EZLFWgB8igyL7TjxqP9CuIHselHlbhRlKMH6jO8qtxK7grb14Sb11SxpWh4JFlWfFXEZv6Bt8MjO2dYCE6U0Q7S6aCNqg1tnpJ6CYnozq_urZOFy9bdcvz4xQMDLnCc55WZ8a5n9AL49f_OFxKBxaxXBLsem4711DahsHX5xLyLJfr0hT9NOEiHFEte4YTNBGhKwimgrQfJ_StUqVzd07DX1FmLahkeIhde6WRL9y2p8WtxtDbzthyJtY_RNjOdy-RikdEuNbWMKHGAWeWzhHQONb3X4SxIFLOB6aWtsARo9TkUURUwPGpc0890yiuUOiiiCdMnVtOz74atMnlit-SyatvhTVVQ-1KhmIZcGWbVS3EGoCEUeWayc7CpLuYft7XObgoGlJGXANgy1RzNp2o_LHE6Tk3-44KSET6Tq_vYDJESaj6zi1n0ylRrR6PnZ4SCdl0BE_8wOkNUSjJrX8BmRM3eA
