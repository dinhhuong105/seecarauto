# Data Dictionary — SeeCar Auto (M01-02)

| Trường | Nội dung |
| --- | --- |
| Task | M01-02 — ERD (Product, SKU, OEM, Vehicle Fitment) |
| Ngày | 26/11/2026 |
| Nguồn | `docs/database/ERD.md` (mô tả đầy đủ), `docs/database/diagrams/product-fitment-erd.mmd` (sơ đồ) |
| Quy ước | Mọi bảng trong ERD đều có mặt ở đây; mọi cột trong ERD đều có một dòng ở đây. Kiểu dữ liệu ghi theo PostgreSQL. "Mức" P0/P1/Ranh giới theo ERD mục 4. |

## `brands` — Thương hiệu phụ tùng (P0)

| Column | Data Type | Nullable | PK/FK/UK | Description |
| --- | --- | --- | --- | --- |
| id | UUID | NO | PK | ID nội bộ ổn định, `DEFAULT gen_random_uuid()` |
| name | VARCHAR(255) | NO | — | Tên thương hiệu hiển thị (tiếng Việt) |
| slug | VARCHAR(255) | NO | UK | Slug tiếng Anh cho URL `/brands/<slug>`; không đổi khi đổi tên |
| description | TEXT | YES | — | Mô tả thương hiệu |
| logo_url | VARCHAR(1024) | YES | — | URL tuyệt đối tới logo (S3/R2) |
| is_visible | BOOLEAN | NO | — | Ẩn thương hiệu khỏi frontend mà không xóa sản phẩm; DEFAULT true |
| created_at | TIMESTAMPTZ | NO | — | DEFAULT now() |
| updated_at | TIMESTAMPTZ | NO | — | DEFAULT now() |

## `categories` — Danh mục nhiều cấp (P0)

| Column | Data Type | Nullable | PK/FK/UK | Description |
| --- | --- | --- | --- | --- |
| id | UUID | NO | PK | ID nội bộ ổn định, `DEFAULT gen_random_uuid()` |
| parent_id | UUID | YES | FK → `categories.id` | NULL = danh mục gốc; có giá trị = danh mục con |
| name | VARCHAR(255) | NO | — | Tên danh mục hiển thị (tiếng Việt) |
| slug | VARCHAR(255) | NO | UK | Slug tiếng Anh, unique toàn cục; URL `/parts/<slug>` |
| display_order | INT | NO | — | Thứ tự hiển thị trong cây danh mục; DEFAULT 0 |
| is_visible | BOOLEAN | NO | — | Ẩn danh mục khỏi frontend mà không xóa sản phẩm; DEFAULT true |
| created_at | TIMESTAMPTZ | NO | — | DEFAULT now() |
| updated_at | TIMESTAMPTZ | NO | — | DEFAULT now() |

## `products` — Sản phẩm (P0)

| Column | Data Type | Nullable | PK/FK/UK | Description |
| --- | --- | --- | --- | --- |
| id | UUID | NO | PK | ID nội bộ ổn định, `DEFAULT gen_random_uuid()` |
| sku | VARCHAR(64) | NO | UK | SKU nội bộ duy nhất của SeeCar Auto, lưu dạng đã chuẩn hóa; không phải PK |
| name | VARCHAR(255) | NO | — | Tên sản phẩm hiển thị |
| slug | VARCHAR(255) | NO | UK | Slug tiếng Anh cho URL `/products/<slug>` |
| short_description | VARCHAR(500) | YES | — | Mô tả ngắn (danh sách, gợi ý tìm kiếm) |
| description | TEXT | YES | — | Mô tả đầy đủ |
| brand_id | UUID | NO | FK → `brands.id` | Thương hiệu của sản phẩm |
| category_id | UUID | NO | FK → `categories.id` | Danh mục chính (canonical) |
| status | product_status (enum) | NO | — | `DRAFT`, `PUBLISHED`, `HIDDEN`; DEFAULT 'DRAFT' |
| availability_status | availability_status (enum) | NO | — | `IN_STOCK`, `OUT_OF_STOCK`; P0 chỉ trạng thái còn/hết hàng do admin quản lý; DEFAULT 'OUT_OF_STOCK' |
| price | DECIMAL(12,2) | NO | — | Giá hiện tại (VND); CHECK >= 0 |
| published_at | TIMESTAMPTZ | YES | — | Thời điểm xuất bản; NULL khi chưa xuất bản |
| created_at | TIMESTAMPTZ | NO | — | DEFAULT now() |
| updated_at | TIMESTAMPTZ | NO | — | DEFAULT now() |
| deleted_at | TIMESTAMPTZ | YES | — | Soft delete; NULL = chưa xóa |

## `product_identifiers` — Các loại mã tham chiếu (P0)

| Column | Data Type | Nullable | PK/FK/UK | Description |
| --- | --- | --- | --- | --- |
| id | UUID | NO | PK | ID nội bộ ổn định, `DEFAULT gen_random_uuid()` |
| product_id | UUID | NO | FK → `products.id` | Mã thuộc về sản phẩm nào |
| identifier_type | identifier_type (enum) | NO | — | `PART_NUMBER`, `OEM_NUMBER`, `MANUFACTURER_PART_NUMBER`, `ALTERNATE_NUMBER` (không chứa INTERNAL_SKU) |
| identifier_value | VARCHAR(128) | NO | — | Mã gốc như nhà sản xuất/hãng xe cấp (giữ nguyên để hiển thị) |
| normalized_value | VARCHAR(128) | NO | — | Mã đã chuẩn hóa (viết hoa, bỏ khoảng trắng/gạch ngang/gạch dưới/chấm); chỉ dùng để tìm kiếm chính xác |
| issuing_make_id | UUID | YES | FK → `vehicle_makes.id` | Hãng xe cấp mã; chỉ dùng cho `OEM_NUMBER` (bắt buộc khi type là OEM_NUMBER) |
| issuing_brand_id | UUID | YES | FK → `brands.id` | Hãng phụ tùng cấp mã; chỉ dùng cho `MANUFACTURER_PART_NUMBER` (bắt buộc) và `PART_NUMBER` (khi biết rõ) |
| is_primary | BOOLEAN | NO | — | Mã chính trong cùng loại (hiển thị đầu tiên); DEFAULT false |
| created_at | TIMESTAMPTZ | NO | — | DEFAULT now() |
| updated_at | TIMESTAMPTZ | NO | — | DEFAULT now() |

Unique thêm (xem ERD mục 4.4): `UNIQUE(product_id, identifier_type, normalized_value)`; partial unique `UNIQUE(identifier_type, normalized_value, issuing_brand_id) WHERE identifier_type = 'MANUFACTURER_PART_NUMBER'`; partial unique `(product_id, identifier_type) WHERE is_primary`.

## `product_categories` — Sản phẩm ↔ danh mục phụ (P0)

| Column | Data Type | Nullable | PK/FK/UK | Description |
| --- | --- | --- | --- | --- |
| product_id | UUID | NO | PK, FK → `products.id` | Khóa chính kép cùng `category_id` |
| category_id | UUID | NO | PK, FK → `categories.id` | Danh mục phụ (khác danh mục chính `products.category_id`) |
| display_order | INT | NO | — | Thứ tự hiển thị của sản phẩm trong danh mục này; DEFAULT 0 |

## `product_images` — Ảnh sản phẩm (P0)

| Column | Data Type | Nullable | PK/FK/UK | Description |
| --- | --- | --- | --- | --- |
| id | UUID | NO | PK | ID nội bộ ổn định, `DEFAULT gen_random_uuid()` |
| product_id | UUID | NO | FK → `products.id` | Sản phẩm sở hữu ảnh |
| image_url | VARCHAR(1024) | NO | — | URL tuyệt đối (S3/R2) |
| alt_text | VARCHAR(255) | YES | — | Văn bản thay thế cho accessibility |
| sort_order | INT | NO | — | Thứ tự hiển thị ảnh; DEFAULT 0 |
| is_primary | BOOLEAN | NO | — | Ảnh đại diện (tối đa 1/sản phẩm); DEFAULT false |
| created_at | TIMESTAMPTZ | NO | — | DEFAULT now() |

## `product_specifications` — Thông số kỹ thuật (P1)

| Column | Data Type | Nullable | PK/FK/UK | Description |
| --- | --- | --- | --- | --- |
| id | UUID | NO | PK | ID nội bộ ổn định, `DEFAULT gen_random_uuid()` |
| product_id | UUID | NO | FK → `products.id` | Sản phẩm sở hữu thông số |
| spec_key | VARCHAR(128) | NO | — | Khóa thông số (ví dụ minh họa: `diameter_mm`) |
| spec_value | VARCHAR(512) | NO | — | Giá trị thông số |
| display_order | INT | NO | — | Thứ tự hiển thị ở trang chi tiết; DEFAULT 0 |
| created_at | TIMESTAMPTZ | NO | — | DEFAULT now() |

Unique thêm: `UNIQUE(product_id, spec_key)`.

## `vehicle_makes` — Hãng xe (P0)

| Column | Data Type | Nullable | PK/FK/UK | Description |
| --- | --- | --- | --- | --- |
| id | UUID | NO | PK | ID nội bộ ổn định, `DEFAULT gen_random_uuid()` |
| name | VARCHAR(255) | NO | — | Tên hãng xe hiển thị |
| slug | VARCHAR(255) | NO | UK | Slug tiếng Anh cho URL `/vehicles/<make-slug>/...` |
| logo_url | VARCHAR(1024) | YES | — | URL tuyệt đối tới logo hãng xe |
| is_visible | BOOLEAN | NO | — | Ẩn khỏi bộ chọn xe mà không xóa dòng xe bên dưới; DEFAULT true |
| created_at | TIMESTAMPTZ | NO | — | DEFAULT now() |
| updated_at | TIMESTAMPTZ | NO | — | DEFAULT now() |

## `vehicle_models` — Dòng xe (P0)

| Column | Data Type | Nullable | PK/FK/UK | Description |
| --- | --- | --- | --- | --- |
| id | UUID | NO | PK | ID nội bộ ổn định, `DEFAULT gen_random_uuid()` |
| make_id | UUID | NO | FK → `vehicle_makes.id` | Dòng xe thuộc đúng một hãng xe |
| name | VARCHAR(255) | NO | — | Tên dòng xe hiển thị |
| slug | VARCHAR(255) | NO | UK (theo hãng) | Slug tiếng Anh; `UNIQUE(make_id, slug)` |
| created_at | TIMESTAMPTZ | NO | — | DEFAULT now() |
| updated_at | TIMESTAMPTZ | NO | — | DEFAULT now() |

## `vehicle_generations` — Thế hệ xe (P0)

| Column | Data Type | Nullable | PK/FK/UK | Description |
| --- | --- | --- | --- | --- |
| id | UUID | NO | PK | ID nội bộ ổn định, `DEFAULT gen_random_uuid()` |
| model_id | UUID | NO | FK → `vehicle_models.id` | Thế hệ thuộc đúng một dòng xe |
| name | VARCHAR(255) | NO | — | Tên thế hệ (ví dụ minh họa về định dạng: "Thế hệ thứ 3") |
| slug | VARCHAR(255) | NO | UK (theo dòng) | Slug tiếng Anh; `UNIQUE(model_id, slug)` |
| year_from | SMALLINT | NO | — | Năm bắt đầu sản xuất thế hệ này; CHECK 1900–2100 |
| year_to | SMALLINT | YES | — | Năm kết thúc; NULL = thế hệ vẫn đang sản xuất; CHECK 1900–2100 và `year_to >= year_from` |
| created_at | TIMESTAMPTZ | NO | — | DEFAULT now() |
| updated_at | TIMESTAMPTZ | NO | — | DEFAULT now() |

## `vehicle_variants` — Phiên bản xe (P0)

| Column | Data Type | Nullable | PK/FK/UK | Description |
| --- | --- | --- | --- | --- |
| id | UUID | NO | PK | ID nội bộ ổn định, `DEFAULT gen_random_uuid()` |
| generation_id | UUID | NO | FK → `vehicle_generations.id` | Phiên bản thuộc đúng một thế hệ |
| name | VARCHAR(255) | NO | — | Tên phiên bản (ví dụ minh họa về định dạng: "1.5G AT") |
| slug | VARCHAR(255) | NO | UK (theo thế hệ) | Slug tiếng Anh; `UNIQUE(generation_id, slug)` |
| note | TEXT | YES | — | Ghi chú phân biệt phiên bản (ví dụ minh họa về loại ghi chú: động cơ, hộp số) |
| created_at | TIMESTAMPTZ | NO | — | DEFAULT now() |
| updated_at | TIMESTAMPTZ | NO | — | DEFAULT now() |

## `vehicle_applications` — Cấu hình xe, đích duy nhất của fitment (P0)

| Column | Data Type | Nullable | PK/FK/UK | Description |
| --- | --- | --- | --- | --- |
| id | UUID | NO | PK | ID nội bộ ổn định, `DEFAULT gen_random_uuid()` |
| make_id | UUID | NO | FK → `vehicle_makes.id` | Hãng xe; phải khớp với `model.make_id` (application-level) |
| model_id | UUID | NO | FK → `vehicle_models.id` | Dòng xe — thành phần bắt buộc của mọi application |
| generation_id | UUID | YES | FK → `vehicle_generations.id` | Thế hệ; NULL khi chưa phân biệt được thế hệ |
| variant_id | UUID | YES | FK → `vehicle_variants.id` | Phiên bản; NULL khi chưa phân biệt được phiên bản; chỉ được có khi đã có `generation_id` |
| year | SMALLINT | YES | — | Năm cụ thể; NULL khi application đại diện cho cả khoảng năm của generation; CHECK 1900–2100 |
| created_at | TIMESTAMPTZ | NO | — | DEFAULT now() |
| updated_at | TIMESTAMPTZ | NO | — | DEFAULT now() |

Unique thêm: `UNIQUE NULLS NOT DISTINCT (model_id, generation_id, variant_id, year)` — chống hai application giống hệt nhau.

## `product_vehicle_fitments` — Tương thích sản phẩm ↔ xe (P0)

| Column | Data Type | Nullable | PK/FK/UK | Description |
| --- | --- | --- | --- | --- |
| id | UUID | NO | PK | ID nội bộ ổn định, `DEFAULT gen_random_uuid()` |
| product_id | UUID | NO | FK → `products.id` | Phụ tùng được gắn |
| vehicle_application_id | UUID | NO | FK → `vehicle_applications.id` | Cấu hình xe tương thích — đúng một application cho mỗi bản ghi |
| fitment_note | TEXT | YES | — | Ghi chú áp dụng (ví dụ minh họa về loại ghi chú: "chỉ bản số tự động") |
| created_at | TIMESTAMPTZ | NO | — | DEFAULT now() |
| updated_at | TIMESTAMPTZ | NO | — | DEFAULT now() |

Unique thêm: `UNIQUE(product_id, vehicle_application_id)` — chống fitment trùng.

## `fitment_change_logs` — Log thay đổi fitment (P0)

| Column | Data Type | Nullable | PK/FK/UK | Description |
| --- | --- | --- | --- | --- |
| id | UUID | NO | PK | ID nội bộ ổn định, `DEFAULT gen_random_uuid()` |
| product_id | UUID | NO | FK → `products.id` | Sản phẩm bị thay đổi fitment |
| vehicle_application_id | UUID | NO | FK → `vehicle_applications.id` | Cấu hình xe liên quan |
| action | fitment_action (enum) | NO | — | `ATTACH`, `DETACH` |
| changed_by_admin_id | UUID | NO | — | Tài khoản admin thực hiện; **chưa có FK** (bảng users thuộc M02) |
| created_at | TIMESTAMPTZ | NO | — | Thời điểm thay đổi; log chỉ ghi thêm, không sửa |

## `url_redirects` — Redirect 301 cho slug đã công bố (P0)

| Column | Data Type | Nullable | PK/FK/UK | Description |
| --- | --- | --- | --- | --- |
| id | UUID | NO | PK | ID nội bộ ổn định, `DEFAULT gen_random_uuid()` |
| entity_type | redirect_entity (enum) | NO | — | `CATEGORY`, `BRAND`, `PRODUCT` |
| entity_id | UUID | NO | — | ID thực thể; chưa có FK đa hình (application-level kiểm tra đích còn tồn tại) |
| old_slug | VARCHAR(255) | NO | UK (theo loại) | Slug cũ đã công bố; `UNIQUE(entity_type, old_slug)` |
| new_slug | VARCHAR(255) | NO | — | Slug mới cần chuyển tới |
| created_at | TIMESTAMPTZ | NO | — | DEFAULT now() |

## `orders` — Đơn hàng (Ranh giới — thiết kế đầy đủ ở M05)

| Column | Data Type | Nullable | PK/FK/UK | Description |
| --- | --- | --- | --- | --- |
| id | UUID | NO | PK | ID nội bộ ổn định, `DEFAULT gen_random_uuid()` |
| order_code | VARCHAR(32) | NO | UK | Mã đơn công khai — không đoán được, không phải số thứ tự liên tục (FR-058) |
| customer_name | VARCHAR(255) | NO | — | Tên người nhận (P0: khách vãng lai — lưu trực tiếp trên đơn) |
| customer_phone | VARCHAR(32) | NO | — | Số điện thoại người nhận |
| shipping_address | TEXT | NO | — | Địa chỉ giao hàng |
| customer_id | UUID | YES | — | Tài khoản khách hàng — P1; NULL ở P0; FK tới `customers.id` bổ sung ở P1 |
| payment_method | payment_method (enum) | NO | — | P0: `COD`, `BANK_TRANSFER` |
| status | order_status (enum) | NO | — | Đề xuất, M05 chốt: `PENDING`, `CONFIRMED`, `SHIPPING`, `COMPLETED`, `CANCELLED`, `REFUNDED`; DEFAULT 'PENDING' |
| total_amount | DECIMAL(12,2) | NO | — | Tổng tiền đơn; CHECK >= 0 |
| created_at | TIMESTAMPTZ | NO | — | DEFAULT now() |
| updated_at | TIMESTAMPTZ | NO | — | DEFAULT now() |

## `order_items` — Dòng hàng của đơn, gồm snapshot (Ranh giới — M05)

| Column | Data Type | Nullable | PK/FK/UK | Description |
| --- | --- | --- | --- | --- |
| id | UUID | NO | PK | ID nội bộ ổn định, `DEFAULT gen_random_uuid()` |
| order_id | UUID | NO | FK → `orders.id` | Đơn chứa dòng hàng này |
| product_id | UUID | NO | FK → `products.id` | Tham chiếu tới sản phẩm — không dùng để lấy lại tên/giá |
| product_name_snapshot | VARCHAR(255) | NO | — | Snapshot: tên sản phẩm tại thời điểm đặt hàng |
| sku_snapshot | VARCHAR(64) | NO | — | Snapshot: SKU nội bộ tại thời điểm đặt hàng |
| unit_price_snapshot | DECIMAL(12,2) | NO | — | Snapshot: đơn giá tại thời điểm đặt hàng; CHECK >= 0 |
| quantity | INT | NO | — | Số lượng đặt; CHECK > 0 |
| line_total | DECIMAL(12,2) | NO | — | Thành tiền dòng = `unit_price_snapshot` × `quantity`; CHECK >= 0 |
| created_at | TIMESTAMPTZ | NO | — | DEFAULT now() |

## Enum

| Enum | Giá trị |
| --- | --- |
| `product_status` | `DRAFT`, `PUBLISHED`, `HIDDEN` |
| `availability_status` | `IN_STOCK`, `OUT_OF_STOCK` |
| `identifier_type` | `PART_NUMBER`, `OEM_NUMBER`, `MANUFACTURER_PART_NUMBER`, `ALTERNATE_NUMBER` |
| `fitment_action` | `ATTACH`, `DETACH` |
| `redirect_entity` | `CATEGORY`, `BRAND`, `PRODUCT` |
| `payment_method` | `COD`, `BANK_TRANSFER` |
| `order_status` | `PENDING`, `CONFIRMED`, `SHIPPING`, `COMPLETED`, `CANCELLED`, `REFUNDED` (đề xuất, M05 chốt) |
