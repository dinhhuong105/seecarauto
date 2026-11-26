# SRS — SeeCar Auto: Software Requirements Specification

| Trường | Nội dung |
| --- | --- |
| Task | M01-01 — PRD / SRS |
| Milestone | M01 — Architecture & UI/UX |
| Trạng thái tài liệu | IN_REVIEW (chờ ChatGPT review + Henry nghiệm thu) |
| Ngày | 26/11/2026 |
| Product Owner | Henry |
| Project Manager | ChatGPT |
| Developer | Muse (Pi Em) |
| Tài liệu đi kèm | `docs/product/PRD.md` (nghiệp vụ), `docs/project-management/PROJECT_CHARTER.md`, `ARCHITECTURE_DECISIONS.md` (ADR-001 → ADR-011) |

## Quy ước

- Mỗi yêu cầu có mã duy nhất, mức ưu tiên (P0/P1/P2 theo PRD mục 5 — cơ sở: Charter mục 2) và tiêu chí kiểm thử. Yêu cầu không có tiêu chí kiểm thử được coi là chưa hoàn chỉnh.
- **FR** = Functional Requirement (yêu cầu chức năng), **NFR** = Non-Functional Requirement, **BR** = Business Rule, **AC** = Acceptance Criteria.
- **Đã duyệt / Chưa chốt:** phân biệt như PRD. Các quyết định đang chờ (D-01 → D-09, PRD mục 7) không được dùng làm yêu cầu kỹ thuật cho tới khi Henry chốt.
- **Không bịa dữ liệu:** mọi ví dụ cụ thể đều ghi chú **ví dụ minh họa, không phải dữ liệu thật**. Không có tên sản phẩm, giá, số liệu hay chính sách thật nào trong tài liệu này.
- **Stack đã duyệt (ADR-002/ADR-003):** monorepo pnpm + Turborepo; frontend Next.js + TypeScript (port 3000); admin Next.js + TypeScript (port 3001); backend NestJS + TypeScript (port 3002, prefix `/api/v1`, Swagger `/api/docs`); PostgreSQL + Prisma; Redis (+ BullMQ); Meilisearch; S3/R2; JWT + Refresh Token, mật khẩu Argon2id; deploy Vercel (frontend/admin), backend chưa chốt (D-05).

## 1. Phạm vi SRS

SRS này đặc tả chi tiết các yêu cầu phần mềm cho bản đầu (P0) của website SeeCar Auto, làm đầu vào cho M01-02 (ERD), M01-03 (API Specification), M01-04 (Sitemap & Wireframe) và các milestone M02–M09. Yêu cầu P1/P2 được ghi nhận để thiết kế không chặn đường mở rộng, không triển khai ở bản đầu.

## 2. Functional Requirements

### 2.1 Homepage (FR-001 → FR-006)

| Mã | Yêu cầu | Ưu tiên | Tiêu chí kiểm thử |
| --- | --- | --- | --- |
| FR-001 | Homepage hiển thị ô tìm kiếm lớn, bộ chọn xe (hãng → dòng → đời) và điều hướng tới danh mục, thương hiệu, bài viết, liên hệ | P0 | Mở `/`: thấy đủ 4 thành phần trên; chọn xe lọc được catalogue theo xe đó |
| FR-002 | Homepage hiển thị danh mục phụ tùng và thương hiệu, bấm vào đi tới đúng trang danh mục/thương hiệu | P0 | Bấm danh mục/thương hiệu → URL đúng dạng `/parts/<slug>`, `/brands/<slug>`, danh sách đúng |
| FR-003 | Homepage hiển thị sản phẩm gợi ý (tiêu chí gợi ý do M01-04/M01-06 đề xuất, Henry duyệt) | P0 | Chỉ hiển thị sản phẩm thật đã xuất bản; chưa có sản phẩm thì hiển thị empty state, không hiển thị dữ liệu mẫu |
| FR-004 | Homepage hiển thị bài viết mới nhất và liên kết tới `/blog` | P0 | Bấm bài viết → đúng URL `/blog/<slug>`; chưa có bài viết thì ẩn khu vực này |
| FR-005 | Homepage hiển thị hotline/Zalo 0886706338 ở vị trí dễ thấy (header và/hoặc hero) | P0 | Số hiển thị đúng 0886706338; bấm vào mở được Zalo/điện thoại (theo thiết bị) |
| FR-006 | Homepage đạt trạng thái loading (skeleton), empty và error theo UI_UX_STANDARDS mục 1.5 | P0 | Giả lập lỗi tải dữ liệu → thấy error state + nút thử lại; không có dữ liệu → empty state |

### 2.2 Product Catalog (FR-007 → FR-014)

| Mã | Yêu cầu | Ưu tiên | Tiêu chí kiểm thử |
| --- | --- | --- | --- |
| FR-007 | Trang danh sách sản phẩm theo danh mục tại `/parts` và `/parts/<category-slug>`, phân trang | P0 | Mở `/parts/engine` (ví dụ minh họa) → chỉ sản phẩm thuộc danh mục đó; chuyển trang đổi đúng tập sản phẩm |
| FR-008 | Lọc sản phẩm theo danh mục, thương hiệu, khoảng giá, tình trạng còn hàng, tương thích với xe đã chọn; lọc kết hợp được nhiều điều kiện | P0 | Áp 2+ bộ lọc cùng lúc → kết quả thỏa tất cả điều kiện; bỏ lọc → kết quả trở lại đầy đủ |
| FR-009 | Sắp xếp sản phẩm (mới nhất, giá tăng/giảm, tên A–Z — danh sách sắp xếp do M01-04 chốt) | P0 | Đổi kiểu sắp xếp → thứ tự danh sách đổi đúng; kiểm tra 2 trang liên tiếp không trùng/lặp sản phẩm |
| FR-010 | Mỗi item danh sách hiển thị tên, mã (SKU), thương hiệu, giá, hình ảnh, tình trạng | P0 | Item thiếu ảnh → hiển thị ảnh placeholder theo design system, không vỡ layout |
| FR-011 | Trang danh sách dùng được ở quy mô 2.000–10.000 SKU (phân trang server-side, không tải toàn bộ catalogue) | P0 | Kiểm thử với dữ liệu seed lớn ở M03: tải trang đạt ngưỡng NFR-001 (LCP ≤ 2,5s); API danh sách đáp ứng NFR-002 (ngưỡng mili-giây cụ thể do M02/M03 đo và chốt — chưa có số ở đây); không gọi API trả toàn bộ catalogue |
| FR-012 | Khi xe đã chọn không có sản phẩm tương thích, hiển thị thông báo rõ + gợi ý liên hệ, không hiển thị danh sách trống khó hiểu | P0 | Chọn xe chưa có fitment → thấy thông báo và số hotline/Zalo |
| FR-013 | Lọc theo thông số kỹ thuật chi tiết của sản phẩm | P1 | Kiểm thử ở milestone tương ứng (M03): với dữ liệu seed kiểm thử, lọc theo 1 thông số kỹ thuật → chỉ sản phẩm có đúng giá trị thông số đó; kết hợp với lọc danh mục → kết quả là giao của 2 điều kiện; sản phẩm chưa có thông số đó không xuất hiện trong kết quả lọc |
| FR-014 | Admin quản lý thứ tự hiển thị sản phẩm trong danh mục | P1 | Kiểm thử ở milestone tương ứng (M03): admin đổi thứ tự 3 sản phẩm trong danh mục → frontend hiển thị đúng thứ tự mới; sản phẩm chưa được admin đặt thứ tự → xếp theo thứ tự mặc định (M01-04 chốt) |

### 2.3 Category & Brand (FR-015 → FR-020)

| Mã | Yêu cầu | Ưu tiên | Tiêu chí kiểm thử |
| --- | --- | --- | --- |
| FR-015 | Admin tạo/sửa/xóa danh mục nhiều cấp (cha–con), đặt tên tiếng Việt, slug tiếng Anh, thứ tự hiển thị, ẩn/hiện | P0 | Tạo danh mục con → hiển thị đúng trong cây; ẩn danh mục → không xuất hiện ở frontend nhưng sản phẩm không bị xóa |
| FR-016 | Admin tạo/sửa/xóa thương hiệu (tên, slug tiếng Anh, logo, mô tả, ẩn/hiện) | P0 | Tạo thương hiệu → trang `/brands/<slug>` truy cập được và liệt kê đúng sản phẩm |
| FR-017 | Slug tiếng Anh, chữ thường, gạch ngang, không dấu; không đổi khi đổi tên hiển thị | P0 | Đổi tên danh mục → slug giữ nguyên; URL cũ vẫn truy cập được |
| FR-018 | Khi URL danh mục/thương hiệu đã công bố thay đổi, hệ thống redirect 301 từ URL cũ sang URL mới | P0 | Đổi slug đã công bố → truy cập URL cũ nhận 301 tới URL mới |
| FR-019 | Slug trùng được phát hiện và hệ thống gợi ý slug khác, không tự ghi đè | P0 | Tạo 2 danh mục cùng tên → slug thứ hai được gợi ý khác slug thứ nhất |
| FR-020 | Xóa danh mục/thương hiệu còn sản phẩm: chặn hoặc yêu cầu chuyển sản phẩm trước (quy tắc chi tiết do M01-02/M03 chốt); không xóa ngầm sản phẩm | P0 | Thử xóa danh mục còn sản phẩm → bị chặn hoặc được hỏi chuyển sản phẩm; sản phẩm không biến mất |

### 2.4 Vehicle — Make / Model / Year (FR-021 → FR-026)

| Mã | Yêu cầu | Ưu tiên | Tiêu chí kiểm thử |
| --- | --- | --- | --- |
| FR-021 | Admin quản lý hãng xe (make): tên, slug tiếng Anh, logo, ẩn/hiện | P0 | Tạo hãng xe → xuất hiện trong bộ chọn xe ở homepage |
| FR-022 | Admin quản lý dòng xe (model) thuộc một hãng xe, và đời xe/năm sản xuất (year) thuộc một dòng xe | P0 | Tạo model không có make → bị chặn; tạo year ngoài khoảng hợp lệ → bị chặn (khoảng hợp lệ do M01-02 chốt) |
| FR-023 | Trang xe tại `/vehicles/<make-slug>/<model-slug>` liệt kê phụ tùng tương thích với xe đó | P0 | Mở `/vehicles/toyota/vios` (ví dụ minh họa) → chỉ sản phẩm có fitment với xe đó |
| FR-024 | Bộ chọn xe ở homepage/catalogue: chọn hãng → chỉ hiện dòng của hãng đó; chọn dòng → chỉ hiện đời của dòng đó | P0 | Chọn hãng A → danh sách dòng không chứa dòng của hãng B |
| FR-025 | Xe đã chọn được ghi nhớ trong phiên để lọc phụ tùng tương thích trên toàn website | P0 | Chọn xe ở homepage → sang catalogue vẫn giữ xe đã chọn; đổi xe → kết quả lọc đổi theo |
| FR-026 | Nhập dữ liệu xe hàng loạt bằng Excel (định dạng file do M04 chốt) | P0 | Nhập file Excel mẫu → hãng/dòng/đời được tạo đúng; dòng lỗi được báo rõ từng dòng, không nhập nửa chừng |

### 2.5 Vehicle Fitment (FR-027 → FR-033)

| Mã | Yêu cầu | Ưu tiên | Tiêu chí kiểm thử |
| --- | --- | --- | --- |
| FR-027 | Admin gắn/bỏ gắn fitment cho sản phẩm: mỗi bản ghi gắn đúng một sản phẩm với đúng một xe, kèm ghi chú áp dụng | P0 | Gắn fitment → sản phẩm xuất hiện trong trang xe đó; bỏ gắn → biến mất khỏi trang xe đó |
| FR-028 | Trang chi tiết sản phẩm hiển thị danh sách xe tương thích đầy đủ | P0 | Sản phẩm có 3 xe tương thích → trang chi tiết liệt kê đủ 3 xe, bấm vào đi tới đúng trang xe |
| FR-029 | Khi xe đã chọn không tương thích với sản phẩm đang xem, hệ thống cảnh báo rõ trước khi khách thêm vào giỏ | P0 | Chọn xe X, xem sản phẩm chỉ tương thích xe Y → thấy cảnh báo không tương thích |
| FR-030 | Tra cứu ngược: từ một phụ tùng xem toàn bộ xe tương thích; từ một xe xem toàn bộ phụ tùng tương thích | P0 | Kiểm tra cả 2 chiều tra cứu trả về cùng tập fitment |
| FR-031 | Sản phẩm chưa có dữ liệu fitment hiển thị rõ "chưa có thông tin tương thích — liên hệ để được tư vấn", không đoán xe tương thích | P0 | Sản phẩm chưa gắn fitment → thấy thông báo trên, không thấy danh sách xe |
| FR-032 | Nhập fitment hàng loạt bằng Excel (định dạng file do M04 chốt); lỗi từng dòng được báo rõ, không nhập nửa chừng | P0 | File có 1 dòng sai mã xe → chỉ dòng đó báo lỗi, các dòng đúng vẫn nhập được hoặc toàn bộ bị từ chối theo quy tắc M04 chốt — hành vi phải thống nhất và được ghi trong M04 |
| FR-033 | Fitment thay đổi được ghi log (ai thay đổi, khi nào) để truy vết khi khách khiếu nại mua nhầm | P0 | Gắn/bỏ fitment → log ghi đủ người, thời gian, sản phẩm, xe |

### 2.6 Search (FR-034 → FR-041)

| Mã | Yêu cầu | Ưu tiên | Tiêu chí kiểm thử |
| --- | --- | --- | --- |
| FR-034 | Ô tìm kiếm toàn website ở header (desktop + mobile), tìm theo tên, SKU, mã OEM, mã nhà sản xuất, thương hiệu | P0 | Tìm bằng mỗi loại mã/từ khóa → trả kết quả đúng loại |
| FR-035 | Thứ tự ưu tiên kết quả theo ADR-010: SKU chính xác → OEM chính xác → mã nhà sản xuất → tên/thương hiệu → gần đúng | P0 | Tìm mã SKU chính xác → sản phẩm đó đứng đầu, trước kết quả tên trùng một phần |
| FR-036 | Không áp dụng fuzzy mạnh với mã OEM: mã OEM sai một ký tự không được trả về như kết quả chính xác | P0 | Tìm mã OEM sai 1 ký tự → không trả sản phẩm đó ở vị trí kết quả chính xác (có thể gợi ý kiểm tra lại mã) |
| FR-037 | Gợi ý khi gõ (autocomplete) theo tên/mã/thương hiệu, có thể chọn bằng chuột và bàn phím | P0 | Gõ 3 ký tự → gợi ý hiện trong < 1s (xem NFR-003); chọn bằng phím mũi tên + Enter đi tới đúng sản phẩm |
| FR-038 | Trang kết quả tìm kiếm có lọc (danh mục, thương hiệu, tương thích xe) và sắp xếp | P0 | Tìm từ khóa chung + lọc theo thương hiệu → kết quả thỏa cả hai |
| FR-039 | Tìm kiếm kết hợp xe đã chọn: ưu tiên sản phẩm tương thích với xe đã chọn | P0 | Đã chọn xe X, tìm từ khóa → sản phẩm tương thích xe X xếp trước sản phẩm không tương thích |
| FR-040 | Không có kết quả: trang gợi ý kiểm tra lại mã, thử tìm theo tên, hoặc liên hệ Zalo/hotline kèm mã cần tìm | P0 | Tìm mã không tồn tại → thấy đủ 3 gợi ý trên, không thấy trang trắng |
| FR-041 | Tìm kiếm dùng Meilisearch; kết quả tìm kiếm được cache Redis TTL 60–300 giây (ADR-006) | P0 | Tìm 2 lần cùng từ khóa → lần 2 dùng cache; cập nhật sản phẩm → cache tìm kiếm bị invalidate |

### 2.7 Product Detail (FR-042 → FR-049)

| Mã | Yêu cầu | Ưu tiên | Tiêu chí kiểm thử |
| --- | --- | --- | --- |
| FR-042 | Trang chi tiết tại `/products/<product-slug>` hiển thị tên, thương hiệu, hình ảnh (nhiều ảnh), mô tả, thông số kỹ thuật, giá, tình trạng còn hàng | P0 | Mở trang chi tiết → đủ các trường trên; thiếu ảnh → ảnh placeholder, không vỡ layout |
| FR-043 | Trang chi tiết phân biệt rõ 4 loại mã: SKU nội bộ / Part Number / OEM Number / mã thay thế (ADR-010), mỗi loại ghi nhãn riêng | P0 | Kiểm tra giao diện: 4 loại mã hiển thị nhãn riêng, không gộp chung thành một trường "mã" |
| FR-044 | Trang chi tiết hiển thị danh sách xe tương thích (theo FR-028) và cảnh báo không tương thích (theo FR-029) | P0 | Xem 2.5 và 2.7 — kiểm thử liên kết |
| FR-045 | Trang chi tiết có nút thêm vào giỏ (chọn số lượng) và nút liên hệ Zalo/hotline | P0 | Bấm thêm vào giỏ → giỏ tăng đúng số lượng + toast xác nhận; bấm liên hệ → mở đúng kênh |
| FR-046 | Sản phẩm liên quan / sản phẩm thay thế (tiêu chí do M01-04/M03 chốt, Henry duyệt) | P0 | Chỉ hiển thị sản phẩm thật đã xuất bản; chưa có sản phẩm liên quan → ẩn khu vực này |
| FR-047 | Giá hiển thị là giá hiện tại do admin quản lý; khi giá đổi, trang chi tiết cập nhật sau khi cache invalidate (TTL 900 giây, ADR-006) | P0 | Đổi giá trong admin → trang chi tiết cập nhật trong vòng TTL; đơn đã đặt không đổi giá (xem BR-003) |
| FR-048 | Sản phẩm bị ẩn/xóa khỏi catalogue truy cập trực tiếp bằng URL cũ → trang 404 thân thiện + gợi ý sản phẩm/danh mục khác | P0 | Mở URL sản phẩm đã ẩn → 404 thân thiện, không lỗi 500 |
| FR-049 | Trang chi tiết có SEO metadata riêng (title, description, canonical — xem mục 5 SEO) | P0 | Kiểm tra HTML: đủ title/description/canonical duy nhất theo sản phẩm |

### 2.8 Cart / Checkout (FR-050 → FR-059)

| Mã | Yêu cầu | Ưu tiên | Tiêu chí kiểm thử |
| --- | --- | --- | --- |
| FR-050 | Giỏ hàng (`/cart`): thêm/bớt/sửa số lượng/xóa từng món, xem tổng tiền theo thời gian thực | P0 | Thêm 2 món, sửa số lượng món 1 → tổng tiền tính lại đúng; xóa món → tổng tiền cập nhật |
| FR-051 | Giỏ hàng lưu được qua phiên (khách quay lại vẫn thấy giỏ) — cơ chế lưu (cookie/localStorage/tài khoản) do M01-03/M05 chốt | P0 | Thêm vào giỏ → đóng trình duyệt → mở lại vẫn thấy giỏ (theo cơ chế đã chốt) |
| FR-052 | Checkout (`/checkout`): nhập thông tin người nhận và địa chỉ giao hàng; các trường bắt buộc do M01-04 (Wireframe) trình Henry duyệt (D-08) | P0 | Bỏ trống trường bắt buộc → báo lỗi rõ từng trường, không tạo đơn; nhập đủ → qua bước tiếp theo |
| FR-053 | Checkout cho chọn phương thức thanh toán COD hoặc chuyển khoản (giai đoạn đầu, Charter mục 5); chưa có phương thức khác ở P0 | P0 | Checkout chỉ hiển thị đúng 2 phương thức COD và chuyển khoản |
| FR-054 | Đặt hàng thành công tạo đơn hàng + snapshot (tên, SKU, giá, số lượng tại thời điểm đặt — ADR-010) và mã đơn hàng | P0 | Đặt đơn → đơn lưu snapshot; đổi giá catalogue sau đó → đơn đã đặt giữ nguyên giá lúc đặt |
| FR-055 | Trang xác nhận sau đặt hàng hiển thị mã đơn và bước tiếp theo; với chuyển khoản hiển thị thông tin chuyển khoản + nội dung chuyển khoản chứa mã đơn | P0 | Đặt đơn chuyển khoản → trang xác nhận có đủ thông tin chuyển khoản và mã đơn trong nội dung chuyển khoản |
| FR-056 | Giỏ trống không cho vào checkout; chuyển thẳng tới `/cart` kèm thông báo | P0 | Vào `/checkout` khi giỏ trống → bị chuyển về `/cart` |
| FR-057 | Sản phẩm trong giỏ bị admin ẩn/xóa hoặc đổi giá sau khi thêm: báo rõ trước khi xác nhận, khách xác nhận lại với giá/tình trạng mới | P0 | Thêm vào giỏ → admin đổi giá → checkout báo giá đã đổi, yêu cầu xác nhận lại |
| FR-058 | Khách tra cứu trạng thái đơn bằng mã đơn công khai (không cần đăng nhập); mã tra cứu không được đoán được và không phải số thứ tự liên tục; tra cứu bị giới hạn tần suất; tra cứu không lộ thông tin cá nhân hay chi tiết đơn của người khác (phương thức xác minh bổ sung — số điện thoại, OTP hay phương thức khác — là quyết định đang chờ D-09, do Henry quyết định) | P0 | Nhập mã đơn đúng → thấy trạng thái đơn của mình; nhập mã sai → báo không tìm thấy, không lộ thông tin đơn khác; thử mã đoán được (số thứ tự liên tục, mã đơn của đơn khác) → không truy cập được đơn nào; gửi nhiều lần tra cứu liên tiếp bất thường → bị chặn tạm thời (rate limit); kiểm tra mã đơn sinh ra không theo thứ tự đoán được |
| FR-059 | Thanh toán online (VNPay, MoMo), phí vận chuyển tự động, mã giảm giá | P1 | Kiểm thử ở milestone tương ứng (M05): khi đã tích hợp theo quyết định Henry, đặt đơn bằng phương thức online → đơn ghi đúng phương thức và trạng thái thanh toán; nhập mã giảm giá hợp lệ → tổng tiền giảm đúng mức; nhập mã sai/hết hạn → báo lỗi, tổng tiền không đổi |

### 2.9 Order Management — Admin (FR-060 → FR-066)

| Mã | Yêu cầu | Ưu tiên | Tiêu chí kiểm thử |
| --- | --- | --- | --- |
| FR-060 | Admin xem danh sách đơn hàng, lọc theo trạng thái, tìm theo mã đơn/tên/số điện thoại khách | P0 | Lọc theo trạng thái → chỉ đơn ở trạng thái đó; tìm theo mã đơn → ra đúng 1 đơn |
| FR-061 | Admin xem chi tiết đơn: thông tin khách, địa chỉ, từng món (snapshot tên/SKU/giá/số lượng), phương thức thanh toán, trạng thái, lịch sử thay đổi trạng thái | P0 | Mở chi tiết đơn → đủ các trường trên; snapshot khớp với lúc đặt hàng dù giá catalogue đã đổi |
| FR-062 | Admin cập nhật trạng thái đơn theo vòng đời (vòng đời chi tiết do M01-02/M05 chốt theo nghiệp vụ Henry duyệt; khung: mới đặt → xác nhận → đang giao → hoàn tất, cộng hủy/hoàn) | P0 | Chuyển trạng thái sai thứ tự (ví dụ: mới đặt → hoàn tất) → bị chặn hoặc cảnh báo theo quy tắc M05 chốt |
| FR-063 | Với đơn chuyển khoản, admin xác nhận đã nhận tiền trước khi chuyển đơn sang trạng thái xử lý tiếp theo | P0 | Đơn chuyển khoản chưa xác nhận tiền → không chuyển sang "đang giao" được |
| FR-064 | Admin hủy đơn có xác nhận và ghi lý do (danh mục lý do do Henry duyệt ở M05); đơn đã hủy không sửa được nữa | P0 | Hủy đơn → phải xác nhận + chọn lý do; đơn đã hủy → các nút sửa trạng thái bị khóa |
| FR-065 | Admin sửa thông tin giao hàng của đơn chưa giao (quy tắc cụ thể do M05 chốt); đơn đã giao không sửa được | P0 | Sửa địa chỉ đơn chưa giao → lưu được + ghi log; sửa đơn đã giao → bị chặn |
| FR-066 | Mọi thay đổi trạng thái đơn được ghi log (ai, khi nào, từ trạng thái nào sang trạng thái nào) | P0 | Đổi trạng thái → lịch sử đơn ghi đủ người/thời gian/trạng thái trước–sau |

### 2.10 CMS / SEO (FR-067 → FR-074)

| Mã | Yêu cầu | Ưu tiên | Tiêu chí kiểm thử |
| --- | --- | --- | --- |
| FR-067 | Admin quản lý bài viết: tạo/sửa/xóa, chuyên mục, trạng thái nháp/xuất bản, lịch đăng (nếu M01-04 duyệt) | P0 | Tạo bài nháp → không xuất hiện ở `/blog`; xuất bản → xuất hiện ở `/blog` |
| FR-068 | Bài viết có slug tiếng Anh, URL dạng `/blog/<post-slug>`; slug không đổi khi đổi tiêu đề | P0 | Đổi tiêu đề bài đã xuất bản → URL giữ nguyên; URL cũ không đổi |
| FR-069 | AI SEO Assistant — Lớp 1 Rule Engine: kiểm tra độ dài title/description, tần suất từ khóa, slug chuẩn SEO, đưa ra cảnh báo cụ thể | P0 | Nhập title quá dài → cảnh báo độ dài; slug có dấu tiếng Việt → cảnh báo và gợi ý slug không dấu |
| FR-070 | AI SEO Assistant — Lớp 2 AI Content Analysis: đề xuất SEO Title, Meta Description, Focus Keyword, Secondary Keywords, slug, Search Intent, Content Topic, FAQ, internal links (khi đã chốt nhà cung cấp AI — D-04) | P0 | Bấm Generate SEO → đủ các trường đề xuất trên; Lớp 2 chưa có nhà cung cấp → nút báo rõ "chưa cấu hình AI", Lớp 1 vẫn chạy |
| FR-071 | Manual override: SEO đã sửa tay không bao giờ bị hệ thống ghi đè khi Generate lại hoặc khi sửa nội dung bài | P0 | Sửa tay Meta Description → bấm Generate SEO → Meta Description giữ nguyên bản sửa tay; các trường chưa sửa tay được đề xuất lại |
| FR-072 | Khôi phục cấu hình tự động: editor có thể bỏ manual override của một trường để hệ thống đề xuất lại | P0 | Bỏ override trường Title → bấm Generate → Title được đề xuất lại |
| FR-073 | Google Search Preview: xem trước bài viết hiển thị thế nào trên kết quả tìm kiếm | P0 | Sửa Title/Description → preview cập nhật theo |
| FR-074 | SEO metadata của bài viết/sản phẩm/danh mục lưu riêng (bảng `article_seo` và tương đương), cache TTL 3600 giây (ADR-006) | P0 | Sửa SEO → trang public cập nhật trong vòng TTL; dữ liệu SEO không lẫn vào nội dung bài |

### 2.11 Admin Dashboard (FR-075 → FR-079)

| Mã | Yêu cầu | Ưu tiên | Tiêu chí kiểm thử |
| --- | --- | --- | --- |
| FR-075 | Dashboard admin hiển thị đơn hàng mới/cần xử lý, sản phẩm, bài viết — chỉ số liệu thật từ hệ thống | P0 | Tạo 1 đơn mới → dashboard tăng đúng 1 đơn cần xử lý; chưa có dữ liệu → empty state, không hiển thị số mẫu |
| FR-076 | Dashboard có lối tắt tới các module quản lý (sản phẩm, đơn hàng, bài viết, vai trò) | P0 | Bấm lối tắt → tới đúng module; module không có quyền → lối tắt bị ẩn (xem FR-081) |
| FR-077 | Dashboard hiển thị theo quyền của tài khoản đăng nhập (không thấy module/số liệu mình không có quyền xem) | P0 | Đăng nhập tài khoản chỉ có quyền đơn hàng → dashboard không hiển thị số liệu sản phẩm |
| FR-078 | Dashboard dùng chung component Modal/Toast/Tooltip và trạng thái loading/empty/error theo UI_UX_STANDARDS | P0 | Kiểm thử ở 3 chiều rộng (điện thoại hẹp, ~1024px, desktop rộng) theo UI_UX_STANDARDS mục 1.5 |
| FR-079 | Analytics đầy đủ (biểu đồ doanh thu, sản phẩm bán chạy) | P1 | Kiểm thử ở milestone tương ứng (P1 Analytics): với dữ liệu seed kiểm thử, biểu đồ doanh thu hiển thị đúng tổng theo khoảng thời gian đã chọn; sản phẩm bán chạy xếp đúng thứ tự theo số lượng đã bán; chưa có dữ liệu → empty state, không hiển thị số mẫu |

### 2.12 Dynamic RBAC (FR-080 → FR-086)

| Mã | Yêu cầu | Ưu tiên | Tiêu chí kiểm thử |
| --- | --- | --- | --- |
| FR-080 | Admin xem ma trận vai trò × module × hành động (View/Create/Update/Delete/Export/Cancel/Manage...) với checkbox, Select All/None theo module (ADR-005) | P0 | Mở trang phân quyền → thấy đủ ma trận; bấm Select All một module → tick hết quyền của module đó |
| FR-081 | Tick quyền nào thì vai trò đó có quyền đó; bỏ tick thì mất quyền ngay sau khi cache invalidate (TTL quyền 300 giây, ADR-006) | P0 | Bỏ quyền `products.create` của vai trò → tài khoản vai trò đó mất nút Tạo sản phẩm và API trả lỗi quyền |
| FR-082 | Admin tạo/sửa/xóa vai trò; gán/bỏ gán vai trò cho tài khoản | P0 | Tạo vai trò mới → gán cho tài khoản → tài khoản có đúng quyền của vai trò đó |
| FR-083 | Ngoại lệ theo tài khoản (`user_permissions`) — hạn chế dùng giai đoạn đầu (ADR-005) | P0 | Gán ngoại lệ cho 1 tài khoản → chỉ tài khoản đó đổi quyền, các tài khoản cùng vai trò không đổi |
| FR-084 | Mọi thay đổi quyền được ghi audit log (ai, khi nào, vai trò nào, quyền nào đổi) | P0 | Đổi quyền → audit log ghi đủ người/thời gian/vai trò/quyền trước–sau |
| FR-085 | Hệ thống chặn thao tác khiến tài khoản Super Admin cuối cùng mất quyền quản trị hoặc tự khóa mình | P0 | Thử bỏ quyền quản trị của Super Admin cuối cùng → bị chặn kèm thông báo rõ |
| FR-086 | Frontend chỉ ẩn nút theo quyền; backend kiểm tra quyền trên mọi request (permission code dạng `products.view`, `products.create`, …) | P0 | Gọi trực tiếp API tạo sản phẩm bằng tài khoản không có quyền → backend trả lỗi 403 dù frontend đã ẩn nút |

### 2.13 Liên hệ hotline / Zalo (FR-087 → FR-089)

| Mã | Yêu cầu | Ưu tiên | Tiêu chí kiểm thử |
| --- | --- | --- | --- |
| FR-087 | Số hotline/Zalo 0886706338 hiển thị ở header, footer, trang liên hệ và trang sản phẩm | P0 | Kiểm tra 4 vị trí đều hiển thị đúng 0886706338 |
| FR-088 | Trang liên hệ (`/contact`) hiển thị thông tin liên hệ + liên kết fanpage https://www.facebook.com/profile.php?id=61597072672914 + form liên hệ | P0 | Mở `/contact` → đủ 3 thành phần; bấm fanpage → mở đúng fanpage |
| FR-089 | Form liên hệ gửi về đâu (email hay lưu vào hệ thống) do M01-04/M05 chốt theo Henry duyệt; form phải báo thành công/thất bại bằng toast/popup, không dùng `alert()` | P0 | Gửi form trống → báo lỗi từng trường; gửi thành công → toast xác nhận (đích nhận theo quyết định M01-04/M05) |

### 2.14 Tài khoản & xác thực (FR-090 → FR-094; FR-090 → FR-092 là P0, FR-093 → FR-094 là P1)

| Mã | Yêu cầu | Ưu tiên | Tiêu chí kiểm thử |
| --- | --- | --- | --- |
| FR-090 | Admin đăng nhập bằng tài khoản + mật khẩu (JWT + Refresh Token, mật khẩu Argon2id — ADR-003); đăng xuất thu hồi token | P0 | Đăng nhập sai mật khẩu → báo lỗi chung, không lộ tài khoản có tồn tại hay không; đăng xuất → token cũ không dùng được nữa |
| FR-091 | Tài khoản admin bị khóa sau nhiều lần đăng nhập sai (ngưỡng do M02 chốt) | P0 | Đăng nhập sai liên tiếp tới ngưỡng → tài khoản bị khóa tạm + báo rõ |
| FR-092 | Khách đặt hàng không bắt buộc tạo tài khoản ở P0 (khung — chi tiết D-08, M01-04 trình Henry duyệt) | P0 | Đặt hàng thành công mà không tạo tài khoản |
| FR-093 | Tài khoản khách hàng: đăng ký/đăng nhập, lưu địa chỉ giao hàng (xem lại đơn đã đặt trong tài khoản: xem FR-094) | P1 | Kiểm thử ở milestone tương ứng (P1 Customer): đăng ký tài khoản mới → đăng nhập được; lưu 2 địa chỉ giao hàng → checkout hiển thị đúng 2 địa chỉ đã lưu để chọn; đăng nhập sai mật khẩu → báo lỗi chung, không lộ tài khoản có tồn tại hay không |
| FR-094 | Khách đã đăng nhập tra cứu đơn đã đặt trong tài khoản (`/account`): xem danh sách đơn của mình và chi tiết từng đơn, chỉ thấy đơn thuộc tài khoản đó | P1 | Kiểm thử ở milestone tương ứng (P1 Customer): đăng nhập tài khoản A → chỉ thấy đơn của A, không thấy đơn của tài khoản B; mở chi tiết 1 đơn → đúng snapshot của đơn đó; chưa có đơn nào → empty state |

## 3. Non-Functional Requirements

| Mã | Yêu cầu | Ưu tiên | Tiêu chí kiểm thử |
| --- | --- | --- | --- |
| NFR-001 | Hiệu năng trang (M08): LCP ≤ 2,5 giây, INP ≤ 200ms, CLS ≤ 0,1 (theo roadmap M08) | P0 | Đo bằng Lighthouse/PageSpeed trên homepage, catalogue, product detail ở môi trường staging: đạt cả 3 ngưỡng |
| NFR-002 | Thời gian phản hồi API danh sách sản phẩm/tìm kiếm ở mức chấp nhận được với 2.000–10.000 SKU (ngưỡng mili-giây cụ thể do M02/M03 đo và chốt, không bịa số ở đây) | P0 | Kiểm thử tải với dữ liệu seed quy mô thật ở M03: API không timeout, phân trang đúng |
| NFR-003 | Gợi ý tìm kiếm khi gõ hiển thị trong < 1 giây ở điều kiện mạng bình thường | P0 | Gõ từ khóa → gợi ý hiện < 1s (đo ở staging) |
| NFR-004 | Redis cache bắt buộc từ đầu (ADR-006): cache-aside, key có namespace `seecarauto:<module>:<entity>:<id>`, versioning, invalidation khi admin cập nhật, chống cache stampede, fallback khi Redis lỗi, không cache thông tin nhạy cảm | P0 | Tắt Redis → website vẫn chạy (chậm hơn, không lỗi); cập nhật sản phẩm → dữ liệu cũ không còn hiển thị quá TTL |
| NFR-005 | TTL cache theo ADR-006 (giây): danh mục 3600, thương hiệu 21600, thông tin sản phẩm 900, danh sách sản phẩm 300–900, hãng xe/dòng xe 86400, kết quả tìm kiếm 60–300, SEO metadata 3600, cấu hình website 3600, quyền người dùng 300, tồn kho 30–60 | P0 | Kiểm tra cấu hình TTL trong `@seecarauto/shared` khớp ADR-006; kiểm thử invalidate từng loại |
| NFR-006 | Bảo mật mật khẩu: Argon2id; xác thực JWT + Refresh Token; không trả mật khẩu/token/secret trong response (ADR-003, CODING_STANDARDS mục 8) | P0 | Kiểm tra response API không chứa trường mật khẩu/token; kiểm tra hash mật khẩu dùng Argon2id |
| NFR-007 | RBAC: backend kiểm tra quyền mọi request; chống SQL Injection/XSS/CSRF; rate limiting; audit log thay đổi quyền và dữ liệu nhạy cảm (ADR-005, M08) | P0 | Kiểm thử xâm nhập cơ bản ở M08: gọi API không quyền → 403; thử payload XSS/SQLi → bị chặn/lọc |
| NFR-008 | Không commit secret/API key/mật khẩu; chỉ commit `.env.example` (CODING_STANDARDS mục 8) | P0 | Secret scan trong CI pass; `.env` không có trong repo |
| NFR-009 | SEO kỹ thuật (M08): SSR/SSG, meta unique, canonical, sitemap, robots, breadcrumb, JSON-LD, faceted navigation không sinh URL trùng lặp | P0 | Kiểm tra sitemap/robots truy cập được; mỗi trang có canonical duy nhất; không có 2 URL khác nhau trả cùng nội dung mà không có canonical |
| NFR-010 | URL 100% tiếng Anh, chữ thường, gạch ngang, không dấu; slug không dùng tiếng Việt (ADR-004) | P0 | Quét toàn bộ route public: không URL nào chứa dấu tiếng Việt hoặc chữ hoa |
| NFR-011 | Responsive: dùng được trên điện thoại, tablet, desktop; kiểm tra ở 3 chiều rộng (điện thoại hẹp, ~1024px, desktop rộng) trước khi giao (UI_UX_STANDARDS mục 1.5) | P0 | Kiểm tra visual ở 3 chiều rộng cho homepage, catalogue, product detail, checkout, admin |
| NFR-012 | Accessibility: dùng được hoàn toàn bằng bàn phím; focus ring rõ; tương phản đọc được; không truyền thông tin chỉ bằng màu; ảnh có `alt`; nút icon-only có `aria-label`; form có label; hỗ trợ `prefers-reduced-motion` (UI_UX_STANDARDS mục 1.6) | P0 | Duyệt bằng bàn phím toàn bộ luồng mua hàng; bật `prefers-reduced-motion` → animation tắt/bớt |
| NFR-013 | UI dùng chung component `@seecarauto/ui` (Modal, Toast, Tooltip, Button...); một design system thống nhất (màu, font, spacing, radius, shadow, animation token) (ADR-009) | P0 | Review code: không có màn hình tự chế modal/toast/tooltip riêng |
| NFR-014 | Trạng thái loading (skeleton), empty, error + nút thử lại trên mọi trang dữ liệu (UI_UX_STANDARDS mục 1.5) | P0 | Giả lập lỗi API từng trang → thấy error state + nút thử lại |
| NFR-015 | Sao lưu tự động database (M02/M08); khôi phục được sau sự cố (quy trình khôi phục do M02 chốt) | P0 | Lấy backup tự động theo quy trình M02 chốt; khôi phục backup ở môi trường staging (không dùng production để thử khôi phục); kiểm tra dữ liệu sau khôi phục khớp dữ liệu lúc backup (đơn hàng, sản phẩm, tài khoản, nội dung); ghi kết quả khôi phục vào biên bản kiểm thử M02/M09. RTO/RPO là mục tiêu do M02/M09 chốt theo yêu cầu Henry — chưa có số ở đây |
| NFR-016 | Docker: mỗi app có Dockerfile riêng, `docker-compose.yml` cho local, health check đầy đủ; deploy chỉ đạt khi mọi service `(healthy)` (ADR-008, DOCKER_STANDARDS) | P0 | `docker compose config --quiet` exit 0; `docker compose up` + `docker compose ps` mọi service healthy (kiểm tra thật trên Windows/VPS/CI — runtime UNVERIFIED trên máy dev của Muse, xem DOCKER_STANDARDS mục 5) |
| NFR-017 | CI chạy: install → lint → typecheck → test → build → validate compose → secret scan (CODING_STANDARDS mục 9) | P0 | CI #1 đã chạy SUCCESS 1m22s cho commit M00 feea4d4 (theo kiểm tra của ChatGPT ngày 26/11/2026); mọi commit sau phải giữ CI xanh |
| NFR-018 | TypeScript `strict: true` toàn workspace; ESLint + Prettier (2 spaces, semicolons, double quotes, trailing commas) | P0 | `pnpm lint` và `pnpm typecheck` exit 0 |
| NFR-019 | Không lưu thông tin thẻ thanh toán (CODING_STANDARDS mục 8) | P0 | Review code + kiểm tra DB: không có trường lưu thông tin thẻ |
| NFR-020 | Khả năng mở rộng: kiến trúc Modular Monolith, API-first cho phép thêm module P1/P2 (Wholesale, Promotion, Inventory, Analytics, VNPay/MoMo) mà không viết lại module P0 | P1 | Review kiến trúc ở M01-03: module mới gắn được qua API hiện có, không sửa core P0 |

## 4. Business Rules

| Mã | Quy tắc | Nguồn | Tiêu chí kiểm thử |
| --- | --- | --- | --- |
| BR-001 | Phân biệt rõ 4 loại mã: SKU nội bộ / Part Number / OEM Number / mã thay thế; không gộp chung, không dùng lẫn | ADR-010 | Kiểm tra DB + giao diện: 4 trường riêng, mỗi trường có nhãn riêng |
| BR-002 | Thứ tự ưu tiên tìm kiếm: SKU chính xác → OEM chính xác → mã nhà sản xuất → tên/thương hiệu → gần đúng; không fuzzy mạnh với mã OEM | ADR-010 | Xem FR-035, FR-036 |
| BR-003 | Đơn hàng lưu snapshot tên, SKU, giá, số lượng tại thời điểm đặt; giá catalogue đổi sau đó không đổi đơn đã đặt | ADR-010 | Xem FR-054, FR-061 |
| BR-004 | SEO đã sửa tay không bao giờ bị hệ thống ghi đè (Generate lại hay sửa nội dung đều không đè) | ADR-007 | Xem FR-071 |
| BR-005 | URL cố định không đổi khi đổi tên hiển thị; URL đã công bố thay đổi thì redirect 301 | ADR-004 | Xem FR-017, FR-018, FR-068 |
| BR-006 | Frontend chỉ ẩn nút theo quyền; backend luôn kiểm tra quyền trên mọi request | ADR-005 | Xem FR-086 |
| BR-007 | Không cho tài khoản Super Admin cuối cùng tự khóa mình hoặc mất quyền quản trị | ADR-005 | Xem FR-085 |
| BR-008 | Thay đổi quyền có hiệu lực qua cache invalidation; mọi thay đổi quyền có audit log | ADR-005 | Xem FR-081, FR-084 |
| BR-009 | Thanh toán giai đoạn đầu chỉ COD + chuyển khoản; chưa tích hợp thanh toán online ở P0 | Charter mục 5 | Xem FR-053 |
| BR-010 | Đơn chuyển khoản ở trạng thái chờ xác nhận cho tới khi admin xác nhận đã nhận tiền | PRD 4.8 | Xem FR-063 |
| BR-011 | Fitment là dữ liệu có cấu trúc (sản phẩm ↔ xe + ghi chú áp dụng), không nhập tự do bằng text, không đoán xe tương thích | PRD 4.5 | Xem FR-027, FR-031 |
| BR-012 | Trạng thái còn hàng ở P0 do admin quản lý; quản lý tồn kho theo số lượng là P1 (module Inventory) | Charter mục 2 | Admin đổi trạng thái còn hàng → frontend cập nhật; không có trường số lượng tồn kho ở P0 |
| BR-013 | Dashboard và mọi trang chỉ hiển thị số liệu thật; chưa có dữ liệu thì hiển thị empty state, không hiển thị số liệu mẫu | PRD 4.11 | Xem FR-075 |
| BR-014 | AI không được dùng để khẳng định lượng tìm kiếm của từ khóa chỉ bằng cách đọc bài viết; regenerate SEO theo yêu cầu, không gọi AI mỗi lần gõ | ADR-007 | Review luồng Generate SEO: không gọi AI khi gõ; bản đề xuất không chứa khẳng định về lượng tìm kiếm |
| BR-015 | Nội dung hiển thị tiếng Việt; URL, slug, API endpoint 100% tiếng Anh | ADR-004 | Xem NFR-010 |
| BR-016 | Không bịa giá, sản phẩm, số liệu bán hàng, chính sách hay thông tin liên hệ; chỉ dùng dữ liệu thật do Henry cung cấp hoặc đã xác minh | Charter mục 4.7 | Review toàn bộ tài liệu và dữ liệu seed: mọi ví dụ đều ghi chú "ví dụ minh họa, không phải dữ liệu thật" |

## 5. Yêu cầu tích hợp (Integration)

| Mã | Yêu cầu | Ưu tiên | Tiêu chí kiểm thử |
| --- | --- | --- | --- |
| INT-001 | Frontend (Next.js, port 3000) gọi backend qua REST `/api/v1`, không gọi trực tiếp database | P0 | Review code frontend: không có import Prisma/client DB; mọi dữ liệu qua API |
| INT-002 | Admin (Next.js, port 3001) gọi cùng backend `/api/v1` với phân quyền theo token của tài khoản admin | P0 | Admin gọi API không quyền → 403; dữ liệu admin và frontend khớp nhau (cùng một sản phẩm) |
| INT-003 | API docs Swagger/OpenAPI tại `/api/docs`, cập nhật theo code thật | P0 | Mở `/api/docs` → đủ endpoint P0; thử gọi 1 endpoint từ Swagger |
| INT-004 | Backend đồng bộ dữ liệu sang Meilisearch qua BullMQ trên Redis khi sản phẩm/danh mục/thương hiệu thay đổi | P0 | Sửa sản phẩm trong admin → tìm kiếm thấy nội dung mới trong vòng TTL/quy trình M03 chốt |
| INT-005 | Ảnh sản phẩm lưu qua S3/R2 (nhà cung cấp cụ thể chờ D-06); URL ảnh tuyệt đối, không hard-code domain trong code | P0 | Đổi domain lưu trữ → URL ảnh đổi theo cấu hình, không cần sửa code |
| INT-006 | Tích hợp VNPay, MoMo, GHN/GHTK/Viettel Post, Zalo OA, GA4/GTM/Search Console | P1 | Kiểm thử ở milestone tương ứng: mỗi tích hợp đã chốt được bật/tắt độc lập trong cấu hình; tích hợp chưa cấu hình → tính năng liên quan báo rõ "chưa cấu hình", không lỗi 500; gọi API tích hợp lỗi → hệ thống ghi log + báo lỗi rõ, không mất dữ liệu đơn hàng |
| INT-007 | Response lỗi thống nhất `{ statusCode, message, error }`; phân trang `?page=&limit=`; sắp xếp `?sort=&order=` (CODING_STANDARDS mục 5) | P0 | Gọi API lỗi → đúng định dạng; gọi danh sách với `page/limit/sort` → đúng trang/thứ tự |

## 6. Acceptance Criteria (theo nhóm tính năng)

| Nhóm | Mã AC | Tiêu chí nghiệm thu |
| --- | --- | --- |
| Homepage | AC-01 | Mở `/` thấy tìm kiếm, bộ chọn xe, danh mục, thương hiệu, bài viết, liên hệ; mọi liên kết đi đúng trang; trạng thái loading (skeleton), empty và error đúng FR-006 (giả lập lỗi tải → error state + nút thử lại; không có dữ liệu → empty state); đạt NFR-001, NFR-011, NFR-012 |
| Catalogue (P0) | AC-02 | Lọc/sắp xếp/phân trang đúng ở quy mô lớn (FR-007 → FR-012); lọc kết hợp đúng; xe không có sản phẩm tương thích báo rõ (FR-012) |
| Category & Brand | AC-03 | CRUD danh mục/thương hiệu đúng; slug/redirect 301 đúng (FR-015 → FR-020) |
| Vehicle | AC-04 | CRUD hãng/dòng/đời đúng; bộ chọn xe lọc đúng từng cấp; trang xe liệt kê đúng phụ tùng; nhập Excel dữ liệu xe đúng, dòng lỗi báo rõ từng dòng, không nhập nửa chừng (FR-021 → FR-026) |
| Fitment | AC-05 | Gắn/bỏ gắn fitment đúng cả 2 chiều tra cứu; cảnh báo không tương thích; sản phẩm chưa có fitment báo rõ; import Excel có báo lỗi từng dòng (FR-027 → FR-033) |
| Search | AC-06 | Thứ tự ưu tiên ADR-010 đúng; không fuzzy mạnh mã OEM; gợi ý < 1s; không có kết quả có hướng xử lý (FR-034 → FR-041) |
| Product Detail | AC-07 | Đủ 4 loại mã có nhãn riêng; đủ thông tin mua hàng; 404 thân thiện cho sản phẩm đã ẩn; SEO metadata duy nhất (FR-042 → FR-049) |
| Cart / Checkout (P0) | AC-08 | Giỏ tính đúng; checkout chỉ có COD + chuyển khoản; đơn tạo kèm snapshot + mã đơn; trang xác nhận đủ thông tin chuyển khoản; giỏ trống không vào được checkout; tra cứu đơn bằng mã công khai an toàn: mã sai/không đoán được không lộ đơn khác, tra cứu liên tiếp bất thường bị chặn (FR-050 → FR-058) |
| Order Management | AC-09 | Lọc/tìm đơn đúng; chi tiết đơn khớp snapshot; vòng đời trạng thái đúng; đơn chuyển khoản phải xác nhận tiền; hủy đơn có xác nhận + lý do + log (FR-060 → FR-066) |
| CMS / SEO | AC-10 | CRUD bài viết đúng; Rule Engine cảnh báo đúng; AI đề xuất đủ trường (khi có nhà cung cấp); manual override không bị ghi đè; preview đúng (FR-067 → FR-074) |
| Admin Dashboard (P0) | AC-11 | Chỉ hiển thị số liệu thật theo quyền; lối tắt đúng; responsive 3 chiều rộng (FR-075 → FR-078) |
| Dynamic RBAC | AC-12 | Ma trận checkbox đúng; quyền có hiệu lực sau invalidate; audit log đủ; chặn tự khóa Super Admin cuối cùng; backend kiểm tra quyền mọi request (FR-080 → FR-086) |
| Liên hệ & Tài khoản (P0) | AC-13 | Hotline/Zalo đúng 0886706338 ở đủ vị trí; trang `/contact` đủ thành phần; form liên hệ: gửi trống → báo lỗi từng trường, gửi thành công/thất bại → toast xác nhận hoặc thông báo lỗi rõ (FR-089); đăng nhập admin đúng JWT/Argon2id; đặt hàng không bắt buộc tài khoản (FR-087 → FR-092) |
| Catalogue (P1) | AC-14 | Lọc theo thông số kỹ thuật đúng; admin đổi thứ tự hiển thị trong danh mục → frontend hiển thị đúng thứ tự mới (FR-013, FR-014) |
| Thanh toán online & khuyến mãi (P1) | AC-15 | Đặt đơn bằng phương thức online đã tích hợp → đúng phương thức và trạng thái thanh toán; mã giảm giá hợp lệ giảm đúng mức, mã sai/hết hạn báo lỗi và không đổi tổng tiền (FR-059, INT-006) |
| Analytics (P1) | AC-16 | Biểu đồ doanh thu đúng tổng theo khoảng thời gian đã chọn; sản phẩm bán chạy xếp đúng thứ tự; chưa có dữ liệu → empty state (FR-079) |
| Tài khoản khách hàng (P1) | AC-17 | Đăng ký/đăng nhập đúng; lưu địa chỉ giao hàng và chọn được ở checkout; đăng nhập chỉ thấy đơn của tài khoản đó, chi tiết đơn đúng snapshot (FR-093, FR-094) |
| Tích hợp hệ thống | AC-18 | Frontend/admin chỉ gọi backend qua REST `/api/v1`; Swagger tại `/api/docs` đủ endpoint P0 và gọi thử được; đồng bộ Meilisearch qua BullMQ khi dữ liệu đổi; URL ảnh tuyệt đối theo cấu hình S3/R2; response lỗi và phân trang/sắp xếp đúng định dạng thống nhất (INT-001 → INT-005, INT-007; INT-006 kiểm tra ở AC-15) |
| Tồn kho theo số lượng (P1) | AC-19 | Admin cập nhật số lượng tồn kho; đơn hàng được xác nhận theo quy tắc tồn kho đã duyệt cập nhật đúng số lượng; không cho phép tồn kho âm; cảnh báo khi đạt ngưỡng tồn kho thấp đã cấu hình; thay đổi dữ liệu tồn kho phản ánh đúng trên frontend. Ngưỡng cảnh báo tồn kho thấp và thời điểm trừ kho do Henry quyết định ở milestone Inventory / M05 — chưa có số liệu hay quy tắc cụ thể trong tài liệu này |

## 7. Bảng truy vết (Traceability) — Yêu cầu → Tính năng/Module → Acceptance Criteria

P0 và P1 được tách riêng: mỗi FR chỉ trỏ tới AC kiểm thử đúng phạm vi của nó. Khoảng FR (ví dụ FR-001 → FR-006) chỉ được dùng khi toàn bộ khoảng liên tục đó thuộc cùng một AC.

| Yêu cầu | Tính năng / Module | Acceptance Criteria |
| --- | --- | --- |
| FR-001 → FR-006 | Homepage (P0) | AC-01 |
| FR-007 → FR-012 | Product Catalog (P0) | AC-02 |
| FR-013, FR-014 | Product Catalog (P1) | AC-14 |
| FR-015 → FR-020 | Category & Brand (P0) | AC-03 |
| FR-021 → FR-026 | Vehicle (Make/Model/Year) (P0) | AC-04 |
| FR-027 → FR-033 | Vehicle Fitment (P0) | AC-05 |
| FR-034 → FR-041 | Search (P0) | AC-06 |
| FR-042 → FR-049 | Product Detail (P0) | AC-07 |
| FR-050 → FR-058 | Cart / Checkout (P0) | AC-08 |
| FR-059 | Thanh toán online & khuyến mãi (P1) | AC-15 |
| FR-060 → FR-066 | Order Management (P0) | AC-09 |
| FR-067 → FR-074 | CMS / SEO (P0) | AC-10 |
| FR-075 → FR-078 | Admin Dashboard (P0) | AC-11 |
| FR-079 | Analytics (P1) | AC-16 |
| FR-080 → FR-086 | Dynamic RBAC (P0) | AC-12 |
| FR-087 → FR-092 | Liên hệ hotline/Zalo, Tài khoản & xác thực (P0) | AC-13 |
| FR-093, FR-094 | Tài khoản khách hàng (P1) | AC-17 |
| NFR-001 → NFR-003 | Hiệu năng (Core Web Vitals, API, gợi ý tìm kiếm) | AC-01, AC-02, AC-06, AC-07, AC-08 |
| NFR-004, NFR-005 | Redis cache + TTL (ADR-006) | AC-02, AC-06, AC-07, AC-10, AC-12 |
| NFR-006 → NFR-008 | Bảo mật, secret, xác thực | AC-12, AC-13, AC-17 |
| NFR-009, NFR-010 | SEO kỹ thuật, URL tiếng Anh | AC-01, AC-03, AC-07, AC-10 |
| NFR-011 → NFR-014 | Responsive, accessibility, design system, trạng thái | AC-01 → AC-19 (toàn hệ thống) |
| NFR-015 | Sao lưu / khôi phục | Kiểm thử hệ thống M02 (hạ tầng) / M09 (launch): lấy backup, khôi phục ở staging, kiểm tra dữ liệu sau khôi phục — xem tiêu chí kiểm thử NFR-015 (AC-09/AC-12 không phải bằng chứng sao lưu/khôi phục) |
| NFR-016, NFR-017 | Docker + CI | Toàn hệ thống (kiểm tra ở M02/M09) |
| NFR-018 | TypeScript strict, ESLint, Prettier | Toàn hệ thống |
| NFR-019 | Không lưu thông tin thẻ | AC-08, AC-15 |
| NFR-020 | Mở rộng P1/P2 không viết lại P0 | M01-03 (API Specification) |
| BR-001 | Phân biệt 4 loại mã | FR-043 → AC-07 |
| BR-002 | Thứ tự ưu tiên tìm kiếm | FR-035, FR-036 → AC-06 |
| BR-003 | Snapshot đơn hàng | FR-054, FR-061 → AC-08, AC-09 |
| BR-004 | SEO sửa tay không bị ghi đè | FR-071 → AC-10 |
| BR-005 | URL không đổi khi đổi tên; redirect 301 | FR-017, FR-018, FR-068 → AC-03, AC-10 |
| BR-006 | Backend luôn kiểm tra quyền | FR-086 → AC-12 |
| BR-007 | Không tự khóa Super Admin cuối cùng | FR-085 → AC-12 |
| BR-008 | Quyền có hiệu lực qua cache invalidation; audit log | FR-081, FR-084 → AC-12 |
| BR-009 | Giai đoạn đầu chỉ COD + chuyển khoản | FR-053 → AC-08 |
| BR-010 | Đơn chuyển khoản chờ xác nhận tiền | FR-063 → AC-09 |
| BR-011 | Fitment là dữ liệu có cấu trúc | FR-027, FR-031 → AC-05 |
| BR-012 | Trạng thái còn hàng P0; tồn kho theo số lượng P1 | FR-008, FR-010 → AC-02 (phần P0); phần P1 (quản lý tồn kho theo số lượng) → AC-19 (chưa có FR riêng cho tồn kho theo số lượng ở bản này — chức năng tồn kho chi tiết được đặc tả ở milestone Inventory / M05) |
| BR-013 | Chỉ hiển thị số liệu thật | FR-075 → AC-11 |
| BR-014 | AI không khẳng định lượng tìm kiếm | FR-070 → AC-10 |
| BR-015 | Nội dung tiếng Việt; URL/slug/API tiếng Anh | NFR-010 → AC-01, AC-03, AC-07, AC-10 |
| BR-016 | Không bịa dữ liệu | Toàn hệ thống (review tài liệu và dữ liệu seed) |
| INT-001 | Frontend gọi backend qua REST `/api/v1` | AC-18 |
| INT-002 | Admin gọi cùng backend `/api/v1` có phân quyền | AC-18 |
| INT-003 | Swagger/OpenAPI tại `/api/docs` | AC-18 (mở `/api/docs`, gọi thử 1 endpoint từ Swagger) |
| INT-004 | Đồng bộ Meilisearch qua BullMQ | AC-06, AC-18 |
| INT-005 | Ảnh lưu qua S3/R2, URL tuyệt đối | AC-07, AC-18 |
| INT-006 | Tích hợp VNPay/MoMo/GHN/GHTK/Viettel Post/Zalo OA/GA4/GTM/Search Console (P1) | AC-15 |
| INT-007 | Response lỗi và phân trang/sắp xếp thống nhất | AC-18 |

## 8. Rủi ro và giả định (để M01-02 → M01-07 xử lý)

1. **Dữ liệu thật chưa có:** catalogue, xe, fitment, giá đều chưa có dữ liệu thật. M03–M05 không được bịa dữ liệu seed thành "dữ liệu thật"; dữ liệu seed (nếu có) phải ghi rõ là dữ liệu kiểm thử.
2. **Checkout chi tiết chưa chốt (D-08):** M01-04 trình đề xuất wireframe cho Henry duyệt trước khi M05 triển khai.
3. **AI SEO chưa chốt nhà cung cấp (D-04):** Lớp 2 AI SEO chỉ triển khai sau khi chốt; Lớp 1 Rule Engine không phụ thuộc AI.
4. **Docker runtime UNVERIFIED trên máy dev của Muse:** kiểm tra thật `docker compose up` trên Windows/VPS/CI trước khi coi NFR-016 là đạt (xem DOCKER_STANDARDS mục 5).
5. **Tên miền, backend hosting, S3/R2 chưa chốt (D-01, D-05, D-06):** M02 không hard-code các giá trị này; cấu hình qua biến môi trường.
