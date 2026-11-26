# PRD — SeeCar Auto: Product Requirements Document

| Trường | Nội dung |
| --- | --- |
| Task | M01-01 — PRD / SRS |
| Milestone | M01 — Architecture & UI/UX |
| Trạng thái tài liệu | IN_REVIEW (chờ ChatGPT review + Henry nghiệm thu) |
| Ngày | 26/11/2026 |
| Product Owner | Henry |
| Project Manager | ChatGPT |
| Developer | Muse (Pi Em) |
| Nguồn sự thật | `docs/project-management/PROJECT_CHARTER.md`, `ARCHITECTURE_DECISIONS.md` (ADR-001 → ADR-011), `MASTER_ROADMAP.md` |

## Quy ước đọc tài liệu này

- **Đã duyệt (Approved):** chỉ những nội dung đã được Henry duyệt trong Charter/ADR hoặc trong kế hoạch ChatGPT đã được Henry đồng ý. Mọi nội dung khác là đề xuất hoặc đang chờ quyết định, được ghi rõ như vậy.
- **Chưa chốt (Pending):** liệt kê đầy đủ ở mục 7. Không nội dung nào trong mục 7 được coi là đã quyết định, và không được dùng làm đầu vào kỹ thuật cho các task sau cho tới khi Henry chốt.
- **Phân loại P0 / P1 / P2 — cơ sở phân loại:** theo Charter mục 2 (Phạm vi):
  - **P0 — bản đầu:** các module trong phạm vi (Homepage, Product, Category, Brand, Vehicle, Compatibility/fitment, Search, Cart/Checkout, Order, CMS, SEO).
  - **P1 — mở rộng sau:** Customer, Wholesale (giá sỉ nhiều cấp), Promotion, Inventory, Analytics; cộng thêm các tích hợp Charter mục 5 ghi "tích hợp sau" (VNPay, MoMo, GHN/GHTK/Viettel Post, Zalo OA, GA4/GTM/Search Console).
  - **P2 — tương lai:** Warranty, ERP Integration.
- **Không bịa dữ liệu:** tài liệu này không chứa tên sản phẩm thật, giá thật, số liệu bán hàng, chính sách hay thông tin liên hệ nào ngoài những gì đã duyệt. Mọi ví dụ cụ thể (tên phụ tùng, dòng xe, thương hiệu) đều là **ví dụ minh họa, không phải dữ liệu thật**, và được ghi chú như vậy tại chỗ. Dữ liệu sản phẩm thật do Henry cung cấp sau; catalogue thật được xây ở M03–M05.
- **URL trong tài liệu:** 100% tiếng Anh, chữ thường, gạch ngang, theo ADR-004. Nội dung hiển thị tiếng Việt.
- Tài liệu này là đầu vào cho M01-02 (ERD), M01-03 (API Specification), M01-04 (Sitemap & Wireframe), M01-05 (Admin Dashboard), M01-06 (nghiên cứu UI/UX), M01-07 (Backlog & Sprint).

## 1. Tổng quan sản phẩm

### 1.1 Sản phẩm là gì

SeeCar Auto là website thương mại điện tử chuyên ngành phụ tùng ô tô của thương hiệu **SeeCar Auto** — "Phụ tùng ô tô Chính Hãng - Giá Tốt", chuyên phụ tùng nhiều hãng. Website giúp khách hàng tìm đúng phụ tùng cho đúng xe của mình, đặt hàng và liên hệ mua hàng; giúp quản trị viên quản lý sản phẩm, đơn hàng, kho (ở mức P0 theo mục 4), nội dung và phân quyền động mà không cần sửa code (Charter mục 1).

Website tham khảo: phutungotoquangvu.com — chỉ tham khảo giao diện/danh mục/trải nghiệm, **không sao chép giao diện** (ADR-001).

### 1.2 Vấn đề cần giải quyết

Phụ tùng ô tô chỉ có giá trị khi lắp đúng xe. Khách hàng thường gặp 3 khó khăn: (1) không biết tên chính xác của phụ tùng cần mua; (2) biết mã phụ tùng (mã OEM / mã nhà sản xuất) nhưng không biết cửa hàng có hàng tương đương không; (3) mua nhầm phụ tùng không lắp được cho xe của mình. Website phải giải quyết cả 3 khó khăn bằng tra cứu theo xe, tìm kiếm theo mã, và hiển thị rõ phụ tùng lắp được cho những xe nào (fitment).

### 1.3 Mục tiêu kinh doanh

1. Khách hàng tìm được phụ tùng theo hãng xe / dòng xe / đời xe / loại phụ tùng.
2. Khách hàng tìm được theo tên, SKU nội bộ, mã OEM, mã nhà sản xuất, thương hiệu.
3. Khách hàng xem chi tiết sản phẩm và biết phụ tùng lắp được cho những xe nào.
4. Khách hàng đặt hàng (COD + chuyển khoản ở giai đoạn đầu) và liên hệ Zalo / hotline.
5. Quản trị viên quản lý sản phẩm, đơn hàng, nội dung và phân quyền động mà không cần sửa code.
6. Website vận hành được ở quy mô **2.000–10.000 SKU** (ADR-010), dữ liệu fitment xây từ đầu.
7. Website chuẩn SEO để khách hàng tìm thấy qua Google (mục tiêu định tính; số liệu đo lường cụ thể thuộc M08, không đặt chỉ tiêu bịa ở đây).

### 1.4 Phạm vi bản đầu (P0) — tóm tắt

Homepage, Product Catalog, Category & Brand, Vehicle, Vehicle Fitment, Search, Product Detail, Cart/Checkout, Order Management, CMS/SEO, Admin Dashboard, Dynamic RBAC, liên hệ hotline/Zalo. Chi tiết từng module ở mục 4.

### 1.5 Ngoài phạm vi bản đầu

P1: tài khoản khách hàng đầy đủ (Customer), giá sỉ nhiều cấp (Wholesale), khuyến mãi (Promotion), quản lý tồn kho theo số lượng (Inventory), phân tích (Analytics), thanh toán online (VNPay, MoMo), vận chuyển tích hợp (GHN/GHTK/Viettel Post), Zalo OA, GA4/GTM/Search Console. P2: bảo hành (Warranty), tích hợp ERP. Xem mục 8.

## 2. Nhóm người dùng

| Nhóm | Ai | Nhu cầu chính | Ghi chú |
| --- | --- | --- | --- |
| Khách lẻ (guest) | Người dùng xe ô tô cần mua 1 phụ tùng | Tìm nhanh theo xe hoặc theo mã; xem giá và tình trạng; đặt hàng không cần đăng ký; liên hệ Zalo/hotline khi cần tư vấn | Nhóm chính của bản đầu. Đặt hàng không bắt buộc tạo tài khoản (quy trình chi tiết xem mục 6.3 và quyết định đang chờ ở mục 7). |
| Khách lẻ (đã đăng ký) | Khách mua lặp lại | Lưu thông tin giao hàng, xem lại đơn đã đặt | Tài khoản khách hàng đầy đủ là P1 (Charter mục 2, module Customer). Ở P0, tài khoản chỉ ở mức tối thiểu phục vụ đặt hàng và tra cứu đơn (xem FR-090 → FR-094 trong SRS; phạm vi chi tiết do M01-02/M01-03 chốt). |
| Gara / thợ sửa xe | Mua nhiều, mua lặp lại theo xe khách | Tìm theo mã OEM nhanh, tra cứu ngược phụ tùng → xe tương thích, đặt nhiều món một lần | Giá sỉ nhiều cấp là P1 (Wholesale). Ở P0, gara dùng chung luồng khách lẻ, chưa có bảng giá riêng. |
| Quản trị viên (Admin) | Nhân viên SeeCar Auto | Quản lý sản phẩm, danh mục, thương hiệu, xe, fitment, đơn hàng, bài viết, SEO; xem dashboard | Quyền theo vai trò, cấu hình động (ADR-005). Các vai trò cụ thể dưới đây là ví dụ minh họa, không phải danh sách vai trò cố định — vai trò thật do Super Admin tạo/sửa trong hệ thống. |
| Super Admin | Người quản trị cao nhất | Toàn quyền, quản lý vai trò và phân quyền, quản lý tài khoản admin | Không cho tài khoản Super Admin cuối cùng tự khóa mình (ADR-005). |

Vai trò admin — ví dụ minh họa, không phải danh sách cố định: Super Admin (toàn quyền); Product Manager (quản lý sản phẩm/danh mục/thương hiệu/xe/fitment); Order Staff (xử lý đơn hàng, xem khách hàng); Content Editor (bài viết, SEO); Viewer (chỉ xem báo cáo/dashboard, không sửa). Vai trò và quyền thật được tạo bằng ma trận checkbox trong hệ thống (ADR-005).

## 3. Hành trình khách hàng (Customer Journey)

Hành trình chuẩn của khách lẻ, từ lần đầu vào website tới khi hoàn tất đơn hàng:

1. **Vào website** (`/`) — thấy ngay ô tìm kiếm và bộ chọn xe (hãng → dòng → đời), danh mục phụ tùng nổi bật, cách liên hệ hotline/Zalo.
2. **Xác định xe của mình** — chọn hãng xe, dòng xe, đời xe (ví dụ minh họa, không phải dữ liệu thật: hãng Toyota, dòng Vios — ví dụ này lấy từ ADR-004). Hệ thống ghi nhớ xe đã chọn trong phiên để lọc phụ tùng tương thích.
3. **Tìm phụ tùng** — theo 1 trong 3 cách: (a) duyệt danh mục (ví dụ minh họa: `/parts/engine`); (b) tìm theo tên/thương hiệu; (c) tìm theo mã — nhập SKU nội bộ, mã OEM hoặc mã nhà sản xuất (ví dụ minh họa: mã OEM của bơm nước — chỉ là ví dụ về định dạng mã, không phải mã thật).
4. **Kiểm tra tương thích** — ở trang chi tiết sản phẩm, xem danh sách xe tương thích; nếu phụ tùng không tương thích với xe đã chọn, hệ thống phải báo rõ (không để khách đặt nhầm).
5. **Xem chi tiết** — tên, mã (SKU / Part Number / OEM), thương hiệu, hình ảnh, thông số, giá, tình trạng còn hàng, mô tả.
6. **Thêm vào giỏ** — điều chỉnh số lượng, xem giỏ hàng (`/cart`).
7. **Đặt hàng** (`/checkout`) — nhập thông tin người nhận và địa chỉ giao hàng, chọn phương thức thanh toán COD hoặc chuyển khoản, xác nhận đơn.
8. **Hoàn tất** — nhận mã đơn hàng và hướng dẫn bước tiếp theo (với chuyển khoản: thông tin chuyển khoản; với COD: xác nhận chờ giao). Khách có thể liên hệ Zalo/hotline theo mã đơn để hỏi tiến độ.
9. **Sau bán** — tra cứu trạng thái đơn; liên hệ hỗ trợ khi cần đổi/trả (chính sách đổi/trả cụ thể chưa có — xem quyết định đang chờ ở mục 7; không bịa chính sách trong tài liệu này).

Hành trình quản trị viên (song song): đăng nhập admin → dashboard tổng quan → quản lý sản phẩm/danh mục/thương hiệu/xe/fitment → xử lý đơn hàng mới → viết bài + cấu hình SEO → quản lý vai trò/quyền khi cần. Chi tiết từng bước ở mục 6.6–6.8.

## 4. Các module

### 4.1 Homepage — P0

- **Mục đích:** đón khách trong vài giây đầu, dẫn khách tới đúng 3 lối tìm phụ tùng (theo xe, theo danh mục, theo mã) và tới kênh liên hệ.
- **Tính năng chính (P0):** hero + ô tìm kiếm lớn; bộ chọn xe (hãng → dòng → đời); danh mục phụ tùng; thương hiệu; sản phẩm gợi ý (tiêu chí gợi ý do M01-04/M01-06 đề xuất, Henry duyệt — chưa chốt tiêu chí ở đây); bài viết mới; thông tin liên hệ hotline/Zalo; footer đầy đủ.
- **URL:** `/`.
- **Lưu ý:** không hiển thị số liệu bán hàng, đánh giá hay thống kê nào chưa có dữ liệu thật.

### 4.2 Product Catalog — P0

- **Mục đích:** danh sách sản phẩm có lọc, sắp xếp và phân trang, dùng được ở quy mô 2.000–10.000 SKU.
- **Tính năng chính (P0):** danh sách theo danh mục/thương hiệu/xe; lọc (danh mục, thương hiệu, khoảng giá, tình trạng, tương thích với xe đã chọn); sắp xếp; phân trang; hiển thị tên, mã, thương hiệu, giá, hình ảnh, tình trạng.
- **URL:** `/parts`, `/parts/engine` (ví dụ minh họa theo ADR-004).
- **P1:** lọc nâng cao theo thông số kỹ thuật chi tiết (khi dữ liệu thông số đã đầy đủ ở M03).

### 4.3 Category & Brand — P0

- **Mục đích:** tổ chức catalogue theo loại phụ tùng và theo hãng sản xuất phụ tùng.
- **Tính năng chính (P0):** cây danh mục nhiều cấp (ví dụ minh họa: Động cơ, Phanh, Treo — chỉ là ví dụ về nhóm loại, không phải danh mục thật đã chốt); trang thương hiệu với danh sách sản phẩm của thương hiệu đó; admin tạo/sửa/xóa danh mục và thương hiệu, quản lý slug tiếng Anh, thứ tự hiển thị, ẩn/hiện.
- **URL:** `/parts/<category-slug>`, `/brands/<brand-slug>` (ví dụ minh họa: `/brands/aisin` theo ADR-004).
- **Quy tắc:** slug tiếng Anh, không đổi khi đổi tên hiển thị; redirect 301 khi URL đã công bố thay đổi (ADR-004).

### 4.4 Vehicle (Make / Model / Year) — P0

- **Mục đích:** dữ liệu xe làm nền cho tra cứu theo xe và fitment.
- **Tính năng chính (P0):** quản lý hãng xe (make), dòng xe (model), đời xe/năm sản xuất (year), thế hệ/phiên bản khi cần; trang xe liệt kê phụ tùng tương thích; bộ chọn xe ở homepage và catalogue.
- **URL:** `/vehicles/<make-slug>/<model-slug>` (ví dụ minh họa: `/vehicles/toyota/vios` theo ADR-004).
- **Dữ liệu:** chưa có dữ liệu xe thật — xây từ đầu (ADR-010). Không bịa danh sách hãng/dòng/đời trong tài liệu này; dữ liệu thật do Henry cung cấp hoặc nhập ở M04.

### 4.5 Vehicle Fitment (tương thích xe) — P0

- **Mục đích:** trả lời "phụ tùng này lắp được cho những xe nào" và "xe này dùng được những phụ tùng nào", chính xác.
- **Tính năng chính (P0):** bảng tương thích sản phẩm ↔ xe (có ghi chú áp dụng, ví dụ minh họa về loại ghi chú: "chỉ bản số tự động" — chỉ là ví dụ về định dạng ghi chú, không phải dữ liệu thật); tra cứu phụ tùng theo xe đã chọn; cảnh báo khi sản phẩm không tương thích với xe đã chọn; tra cứu ngược: từ một phụ tùng xem toàn bộ xe tương thích (ADR-010).
- **Quản trị (P0):** admin gắn/bỏ gắn fitment cho sản phẩm, nhập fitment hàng loạt bằng Excel (theo roadmap M04 — Import Fitment Excel).
- **Quy tắc dữ liệu:** fitment là dữ liệu có cấu trúc, không nhập tự do bằng text; mỗi bản ghi fitment phải gắn với đúng một sản phẩm và đúng một xe (mức chi tiết xe: dòng/đời/phiên bản — mức chi tiết chính xác do M01-02 ERD chốt).

### 4.6 Search — P0

- **Mục đích:** tìm đúng phụ tùng trong vài giây, đặc biệt khi khách đã có mã trong tay.
- **Tính năng chính (P0):** ô tìm kiếm toàn website; thứ tự ưu tiên kết quả theo ADR-010: SKU chính xác → OEM chính xác → mã nhà sản xuất → tên/thương hiệu → gần đúng; **không fuzzy mạnh với mã OEM** (mã OEM sai một ký tự có thể là một phụ tùng khác); gợi ý khi gõ; trang kết quả có lọc; tìm kiếm theo xe kết hợp từ khóa; không có kết quả thì gợi ý hướng xử lý (thử mã khác, liên hệ Zalo/hotline).
- **Công nghệ:** Meilisearch (ADR-003); cache kết quả tìm kiếm Redis TTL 60–300 giây (ADR-006).
- **P1:** tìm kiếm theo thông số kỹ thuật, tìm kiếm bằng hình ảnh (chưa duyệt — không đưa vào P0).

### 4.7 Product Detail — P0

- **Mục đích:** trang quyết định mua — đủ thông tin để khách chắc chắn đây là đúng phụ tùng cho xe của mình.
- **Tính năng chính (P0):** tên sản phẩm, các loại mã (SKU nội bộ / Part Number / OEM Number / mã thay thế — phân biệt rõ 4 loại, ADR-010), thương hiệu, hình ảnh (nhiều ảnh), thông số kỹ thuật, mô tả, giá, tình trạng còn hàng, danh sách xe tương thích, sản phẩm liên quan/thay thế, nút thêm vào giỏ, nút liên hệ Zalo/hotline.
- **URL:** `/products/<product-slug>` (ví dụ minh họa: `/products/water-pump-aisin` theo ADR-004).
- **Quy tắc:** giá hiển thị là giá hiện tại do admin quản lý; giá trong đơn hàng đã đặt không đổi khi giá catalogue đổi (xem mục 4.9 — snapshot).

### 4.8 Cart / Checkout — P0

- **Mục đích:** khách đặt hàng nhanh, ít bước, không nhầm lẫn.
- **Tính năng chính (P0):** giỏ hàng (thêm/bớt/sửa số lượng/xóa, xem tổng tiền); checkout nhập thông tin người nhận + địa chỉ giao hàng; chọn phương thức thanh toán **COD hoặc chuyển khoản** (giai đoạn đầu, Charter mục 5); xác nhận đơn; mã đơn hàng; trang xác nhận sau đặt hàng.
- **Thanh toán chuyển khoản (P0):** hiển thị thông tin chuyển khoản và nội dung chuyển khoản chứa mã đơn (thông tin tài khoản ngân hàng thật do Henry cung cấp khi triển khai — không có trong tài liệu này); trạng thái đơn chờ xác nhận chuyển khoản do admin xác nhận thủ công ở P0 (đối soát tự động là P1 trở đi, chưa duyệt).
- **Quy trình checkout chi tiết là QUYẾT ĐỊNH ĐANG CHỜ (mục 7):** đề xuất chi tiết (khách vãng lai vs tài khoản, các trường bắt buộc, bước xác nhận chuyển khoản, định dạng mã đơn) sẽ trình Henry duyệt ở M01-04 (Wireframe) và M05; tài liệu này chỉ chốt khung ở trên, không tự chốt chi tiết.
- **URL:** `/cart`, `/checkout`.
- **P1:** VNPay, MoMo; phí vận chuyển tính tự động theo đơn vị vận chuyển (GHN/GHTK/Viettel Post); mã giảm giá (Promotion).

### 4.9 Order Management — P0

- **Mục đích:** admin xử lý đơn từ lúc mới đặt tới lúc hoàn tất, khách tra cứu được trạng thái đơn của mình.
- **Tính năng chính (P0):** danh sách đơn hàng có lọc theo trạng thái/tìm theo mã đơn; chi tiết đơn; cập nhật trạng thái đơn theo vòng đời (vòng đời trạng thái chi tiết do M01-02/M05 chốt theo nghiệp vụ Henry duyệt — khung: mới đặt → xác nhận → đang giao → hoàn tất, cộng các trạng thái hủy/hoàn; không tự chốt tên trạng thái cuối cùng ở đây); hủy đơn (có xác nhận); in/xem chi tiết đơn.
- **Snapshot đơn hàng (P0, ADR-010):** tại thời điểm đặt hàng, đơn lưu snapshot tên sản phẩm, SKU, giá, số lượng — giá/sản phẩm catalogue đổi sau đó không làm thay đổi đơn đã đặt.
- **P1:** quản lý tồn kho theo số lượng (Inventory), trừ kho khi đặt hàng, cảnh báo hết hàng tự động.

### 4.10 CMS / SEO — P0

- **Mục đích:** bài viết hướng dẫn/chia sẻ giúp khách chọn đúng phụ tùng và giúp website được tìm thấy trên Google.
- **Tính năng chính (P0):** quản lý bài viết (tạo/sửa/xóa/đăng/xuất bản, chuyên mục); AI SEO Assistant 2 lớp (ADR-007): Lớp 1 Rule Engine (độ dài title/description, tần suất từ khóa, slug tiếng Anh), Lớp 2 AI Content Analysis (chủ đề, từ khóa, search intent, title/description, FAQ, internal links); nút Generate SEO; **manual override: SEO đã sửa tay không bao giờ bị hệ thống ghi đè**; khôi phục cấu hình tự động; Google Search Preview; slug tiếng Anh cho bài viết.
- **URL:** `/blog`, `/blog/<post-slug>` (ví dụ minh họa: `/blog/how-to-choose-engine-oil` theo ADR-004).
- **Lưu ý (ADR-007):** AI không thể biết chắc lượng tìm kiếm của từ khóa chỉ bằng cách đọc bài viết; regenerate theo yêu cầu, tránh gọi AI mỗi lần gõ.
- **Nhà cung cấp AI + ngân sách là QUYẾT ĐỊNH ĐANG CHỜ (mục 7).**

### 4.11 Admin Dashboard — P0

- **Mục đích:** một màn hình tổng quan để admin biết hôm nay có gì cần xử lý.
- **Tính năng chính (P0):** tổng quan đơn hàng mới/cần xử lý, sản phẩm, bài viết; lối tắt tới các module quản lý; hiển thị theo quyền của tài khoản đăng nhập (không thấy module mình không có quyền).
- **Quy tắc:** dashboard chỉ hiển thị số liệu thật từ hệ thống; không hiển thị số liệu mẫu/bịa. Khi chưa có dữ liệu, hiển thị empty state, không hiển thị số 0 giả tạo thành "thống kê".
- **P1:** Analytics đầy đủ (biểu đồ doanh thu, sản phẩm bán chạy — thuộc module Analytics, P1).

### 4.12 Dynamic RBAC — P0

- **Mục đích:** phân quyền linh hoạt theo nhu cầu thực tế, không cần sửa code khi thêm vai trò mới.
- **Tính năng chính (P0):** ma trận vai trò × module × hành động (View/Create/Update/Delete/Export/Cancel/Manage...) với checkbox, Select All/None theo module (ADR-005); tạo/sửa/xóa vai trò; gán vai trò cho tài khoản; ngoại lệ theo tài khoản (`user_permissions`, hạn chế dùng giai đoạn đầu); thay đổi quyền có hiệu lực qua cache invalidation; audit log mọi thay đổi quyền; không cho tài khoản Super Admin cuối cùng tự khóa mình; Super Admin khởi tạo an toàn từ bootstrap.
- **Nguyên tắc bắt buộc (ADR-005):** frontend chỉ ẩn nút, backend luôn kiểm tra quyền; permission code dạng `products.view`, `products.create`, …

### 4.13 Liên hệ hotline / Zalo — P0

- **Mục đích:** khách cần tư vấn mua đúng phụ tùng luôn có đường liên hệ nhanh.
- **Tính năng chính (P0):** số hotline/Zalo **0886706338** hiển thị ở header, footer, trang liên hệ và trang sản phẩm; trang liên hệ (`/contact`) với form liên hệ (form gửi về đâu — email hay lưu vào hệ thống — là chi tiết do M01-04/M05 chốt theo Henry duyệt; không tự chốt ở đây); liên kết fanpage https://www.facebook.com/profile.php?id=61597072672914.
- **URL:** `/contact`, `/account` (tài khoản — xem mục 2).

## 5. Phân loại P0 / P1 / P2 — bảng tổng hợp

| Nhóm tính năng | Phân loại | Cơ sở |
| --- | --- | --- |
| Homepage, Catalogue, Category & Brand, Vehicle, Fitment, Search, Product Detail, Cart/Checkout (COD + chuyển khoản), Order Management, CMS/SEO, Admin Dashboard, Dynamic RBAC, liên hệ hotline/Zalo | P0 | Charter mục 2 — trong phạm vi bản đầu |
| Customer (tài khoản khách đầy đủ), Wholesale (giá sỉ nhiều cấp), Promotion, Inventory (tồn kho theo số lượng), Analytics | P1 | Charter mục 2 — mở rộng sau |
| VNPay, MoMo, GHN/GHTK/Viettel Post, Zalo OA, GA4/GTM/Search Console | P1 | Charter mục 5 — "tích hợp sau" |
| Warranty, ERP Integration | P2 | Charter mục 2 — tương lai |
| Tìm kiếm bằng hình ảnh, lọc theo thông số kỹ thuật nâng cao | Chưa phân loại — đề xuất, chờ Henry duyệt | Chưa có trong Charter; không đưa vào P0 |

## 6. Luồng nghiệp vụ chính và trường hợp ngoại lệ

### 6.1 Luồng 1 — Mua hàng theo xe (luồng chính)

Khách vào homepage → chọn xe (hãng → dòng → đời) → duyệt danh mục phụ tùng đã lọc theo xe → mở trang chi tiết, kiểm tra xe tương thích → thêm vào giỏ → checkout (COD hoặc chuyển khoản) → nhận mã đơn → chờ xác nhận/giao hàng.

**Ngoại lệ:** xe khách chọn chưa có trong hệ thống → hiển thị thông báo rõ + gợi ý liên hệ Zalo/hotline, không hiển thị danh sách trống gây hiểu lầm là "không có phụ tùng"; phụ tùng không tương thích với xe đã chọn → cảnh báo rõ trước khi thêm vào giỏ.

### 6.2 Luồng 2 — Mua hàng theo mã (khách đã biết mã)

Khách nhập mã OEM/SKU/mã nhà sản xuất vào ô tìm kiếm → hệ thống trả kết quả theo thứ tự ưu tiên ADR-010 (SKU chính xác → OEM chính xác → mã nhà sản xuất → tên/thương hiệu → gần đúng) → khách kiểm tra fitment → thêm vào giỏ → checkout.

**Ngoại lệ:** mã không tìm thấy → trang không có kết quả phải gợi ý: kiểm tra lại mã, thử tìm theo tên, liên hệ Zalo/hotline kèm mã; không fuzzy mạnh với mã OEM (sai một ký tự có thể ra sai phụ tùng).

### 6.3 Luồng 3 — Đặt hàng và thanh toán

Giỏ hàng → checkout (thông tin người nhận, địa chỉ) → chọn COD hoặc chuyển khoản → xác nhận → tạo đơn hàng + snapshot (tên, SKU, giá, số lượng) → trang xác nhận + mã đơn.

**Ngoại lệ:** giỏ trống → không cho vào checkout; sản phẩm trong giỏ bị admin ẩn/xóa hoặc đổi giá sau khi thêm → báo rõ trước khi xác nhận, khách xác nhận lại với giá/tình trạng mới; chuyển khoản: đơn ở trạng thái chờ xác nhận cho tới khi admin xác nhận đã nhận tiền (P0, thủ công); COD: đơn chờ xác nhận từ admin.

*Lưu ý: quy trình checkout chi tiết (khách vãng lai/tài khoản, trường bắt buộc, định dạng mã đơn, bước đối soát chuyển khoản) là quyết định đang chờ — xem mục 7.*

### 6.4 Luồng 4 — Tra cứu ngược fitment

Từ trang chi tiết một phụ tùng → xem toàn bộ xe tương thích → chọn một xe để xem các phụ tùng khác của xe đó.

**Ngoại lệ:** sản phẩm chưa có dữ liệu fitment → hiển thị rõ "chưa có thông tin tương thích — liên hệ để được tư vấn" thay vì hiển thị danh sách trống hoặc đoán xe tương thích.

### 6.5 Luồng 5 — Quản trị sản phẩm

Admin đăng nhập → tạo/sửa sản phẩm (tên, mã SKU/Part Number/OEM/mã thay thế, thương hiệu, danh mục, giá, hình ảnh, mô tả, thông số) → gắn fitment → kiểm tra hiển thị → xuất bản/ẩn. Mọi thao tác thêm/sửa mở modal (ADR-009); thành công/thất bại báo bằng toast/popup; xóa có xác nhận.

**Ngoại lệ:** SKU trùng → chặn và báo rõ; slug trùng → hệ thống gợi ý slug khác, không tự ghi đè; xóa sản phẩm đã có trong đơn hàng → chặn hoặc chỉ cho ẩn (chi tiết do M01-02/M03 chốt; không xóa dữ liệu lịch sử đơn hàng).

### 6.6 Luồng 6 — Xử lý đơn hàng (admin)

Đơn mới → admin xem chi tiết (kèm snapshot) → xác nhận (với chuyển khoản: xác nhận đã nhận tiền) → cập nhật trạng thái giao hàng → hoàn tất; hoặc hủy đơn (có xác nhận, ghi lý do — danh mục lý do hủy do Henry duyệt ở M05, không bịa ở đây).

**Ngoại lệ:** khách yêu cầu đổi thông tin giao hàng sau khi đặt → admin sửa được trước khi giao (quy tắc cụ thể do M05 chốt); đơn đã giao không sửa được.

### 6.7 Luồng 7 — Xuất bản bài viết + SEO

Content Editor viết bài (tiêu đề + nội dung) → bấm Generate SEO → hệ thống đề xuất SEO Title, Meta Description, Focus Keyword, Secondary Keywords, slug, Search Intent → editor chỉnh tay nếu muốn → xuất bản. SEO đã sửa tay không bao giờ bị Generate đè lại (ADR-007).

**Ngoại lệ:** AI chưa chốt nhà cung cấp (mục 7) → Lớp 1 Rule Engine vẫn chạy được không cần AI; Lớp 2 AI chỉ bật khi đã chốt nhà cung cấp và ngân sách.

### 6.8 Luồng 8 — Thay đổi phân quyền

Super Admin mở ma trận quyền → tick/bỏ tick checkbox theo vai trò × module × hành động → lưu → quyền có hiệu lực qua cache invalidation → ghi audit log. Frontend ẩn nút theo quyền mới; backend kiểm tra lại mọi request.

**Ngoại lệ:** thao tác khiến tài khoản Super Admin cuối cùng mất quyền quản trị → hệ thống chặn; thay đổi quyền của chính mình → yêu cầu xác nhận và ghi audit log.

## 7. Quyết định còn mở (PENDING — chưa chốt, không được coi là đã quyết định)

| # | Quyết định | Chủ sở hữu | Ảnh hưởng tới |
| --- | --- | --- | --- |
| D-01 | Tên miền chính thức: seecarauto.com hay tên miền khác? | Henry | M02 hạ tầng, M08 SEO, toàn bộ URL công bố |
| D-02 | Nguồn dữ liệu phụ tùng lấy từ nhà cung cấp nào? | Henry | M03 Catalogue, M04 Fitment — dữ liệu thật |
| D-03 | Nguồn dữ liệu tương thích xe (fitment) lấy từ đâu? | Henry | M04 Fitment |
| D-04 | Nhà cung cấp AI cho AI SEO + ngân sách API dự kiến? | Henry | M07 CMS & AI SEO (Lớp 2) |
| D-05 | Backend hosting: Railway, Render hay VPS? | Henry | M02 hạ tầng, triển khai |
| D-06 | Nhà cung cấp S3/R2 cụ thể? | Henry | M02 storage, M03 hình ảnh |
| D-07 | Font: tự host Inter hay giữ font hệ thống? | Henry / ChatGPT (M01) | M01 UI/UX (ADR-011) |
| D-08 | Quy trình checkout chi tiết (khách vãng lai/tài khoản, trường bắt buộc, định dạng mã đơn, bước đối soát chuyển khoản, chính sách đổi/trả) | Henry | M01-04 Wireframe, M05 E-commerce |

## 8. Ngoài phạm vi (Out of Scope — bản đầu)

- Thanh toán online (VNPay, MoMo), vận chuyển tích hợp, Zalo OA, GA4/GTM/Search Console — P1.
- Giá sỉ nhiều cấp, khuyến mãi, quản lý tồn kho theo số lượng, analytics — P1.
- Bảo hành, tích hợp ERP — P2.
- Ứng dụng di động riêng (app iOS/Android) — không có trong Charter, không đưa vào roadmap M00–M09.
- Bán hàng trên sàn thương mại điện tử / mạng xã hội — không thuộc website này.

## 9. Đầu vào cho các task M01 tiếp theo

- **M01-02 (ERD):** các thực thể chính từ PRD này: Product, SKU/Part Number/OEM, Category, Brand, Vehicle (Make/Model/Year), VehicleFitment, Order + OrderItem snapshot, Customer (tối thiểu P0), Article + ArticleSEO, User/Role/Permission (+ audit log). Chi tiết trường và quan hệ do M01-02 chốt.
- **M01-03 (API Specification):** các endpoint theo module mục 4, prefix `/api/v1`, theo thứ tự ưu tiên tìm kiếm ADR-010 và ma trận quyền ADR-005.
- **M01-04 (Sitemap & Wireframe):** sitemap theo URL mục 4; wireframe trình Henry duyệt, trong đó có đề xuất quy trình checkout chi tiết (D-08).
- **M01-05 (Admin Dashboard):** cấu trúc dashboard theo mục 4.11 + ma trận RBAC mục 4.12.
- **M01-06 (nghiên cứu UI/UX):** phương án giao diện cho homepage, catalogue, product detail, checkout, admin — trình Henry duyệt trước khi triển khai.
- **M01-07 (Backlog & Sprint):** backlog P0/P1/P2 theo mục 5.
