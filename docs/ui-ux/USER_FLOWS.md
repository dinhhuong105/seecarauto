# User Flows — SeeCar Auto

| Trường | Nội dung |
| --- | --- |
| Task | M01-04 — Sitemap và Wireframe |
| Milestone | M01 — Architecture & UI/UX |
| Trạng thái | IN_REVIEW (bản đầu — chờ ChatGPT review) |
| Dựa trên | SITEMAP.md (M01-04), WIREFRAMES.md (M01-04), PRD mục 6 (8 luồng nghiệp vụ), SRS FR-001 → FR-094, API Specification M01-03 (scenarios S-01 → S-17) |
| Phạm vi | Luồng người dùng chính, luồng thay thế và trường hợp lỗi của website khách hàng. Đây là kiểm thử logic và tính đầy đủ của thiết kế, không phải kiểm thử API hoặc frontend đang chạy. |

## Quy ước

- **Ví dụ minh họa, không phải dữ liệu thật.** Tên hãng xe, dòng xe, mã và sản phẩm trong các luồng đều là ví dụ về định dạng (lấy từ ADR-004/PRD).
- Mỗi luồng ghi: tác nhân, điều kiện bắt đầu, các bước (kèm trang/URL), kết quả mong đợi, ngoại lệ.
- Ký hiệu: `→` điều hướng; `⇢` mở modal/toast/tooltip (không rời trang).

## 1. Luồng chính (theo brief M01-04 §2.7)

### F-01 — Khách vào Homepage và tìm phụ tùng theo xe

- **Tác nhân:** khách lẻ (chưa biết mã phụ tùng).
- **Bước:**
  1. Mở `/` — thấy hero, ô tìm kiếm lớn, bộ chọn xe, danh mục, thương hiệu, hotline/Zalo.
  2. Bộ chọn xe: chọn hãng → chỉ hiện dòng của hãng đó; chọn dòng → chỉ hiện đời của dòng đó.
  3. Bấm "Tìm phụ tùng theo xe" → `/vehicles/<make-slug>/<model-slug>`.
  4. Trang xe liệt kê phụ tùng tương thích với xe đã chọn.
- **Kết quả mong đợi:** khách tới được trang phụ tùng theo xe chỉ trong 3 thao tác chọn; xe đã chọn ghi nhớ trong phiên (FR-025).
- **Ngoại lệ:** xe khách chọn chưa có trong hệ thống → thông báo rõ + gợi ý liên hệ Zalo/hotline (E-01).

### F-02 — Khách chọn xe rồi tìm một loại phụ tùng

- **Tác nhân:** khách lẻ đã chọn xe.
- **Bước:**
  1. Đã chọn xe ở homepage (F-01) hoặc header.
  2. Vào `/parts` (hoặc `/parts/<category-slug>` — ví dụ: danh mục động cơ).
  3. Danh sách đã lọc theo xe đã chọn; lọc thêm theo thương hiệu/khoảng giá nếu muốn.
  4. Bấm một sản phẩm → `/products/<product-slug>`.
- **Kết quả mong đợi:** danh sách chỉ chứa (hoặc ưu tiên) sản phẩm tương thích với xe đã chọn; đổi xe → kết quả lọc đổi theo (FR-025).
- **Ngoại lệ:** xe đã chọn không có sản phẩm tương thích → thông báo rõ + gợi ý liên hệ, không hiển thị danh sách trống khó hiểu (FR-012, E-02).

### F-03 — Khách duyệt danh mục tới trang chi tiết sản phẩm

- **Tác nhân:** khách lẻ.
- **Bước:**
  1. Mở `/` → bấm một danh mục → `/parts/<category-slug>`.
  2. (Danh mục có cấp con: bấm danh mục con để thu hẹp.)
  3. Lọc/sắp xếp/phân trang danh sách.
  4. Bấm một sản phẩm → `/products/<product-slug>` — thấy đủ tên, 4 loại mã ghi nhãn riêng, thương hiệu, hình ảnh, thông số, giá, tình trạng.
- **Kết quả mong đợi:** đúng sản phẩm thuộc danh mục đó; breadcrumb phản ánh đúng đường đi (`Trang chủ / Phụ tùng / <Danh mục> / <Sản phẩm>`).
- **Ngoại lệ:** danh mục đã ẩn → 404 thân thiện (FR-048).

### F-04 — Khách tìm sản phẩm bằng mã OEM

- **Tác nhân:** gara/thợ sửa xe (đã có mã trong tay).
- **Bước:**
  1. Nhập mã OEM vào ô tìm kiếm ở header (gợi ý khi gõ hiện trong < 1s).
  2. Enter → `/search?q=<mã OEM>`.
  3. Kết quả: sản phẩm khớp mã OEM chính xác đứng đầu, gắn nhãn "Khớp mã OEM".
  4. Bấm sản phẩm → trang chi tiết; kiểm tra xe tương thích.
- **Kết quả mong đợi:** tìm bằng mã OEM → trả đúng sản phẩm; thứ tự ưu tiên theo ADR-010 (SKU chính xác → OEM chính xác → mã nhà sản xuất → tên/thương hiệu → gần đúng).
- **Ngoại lệ:** mã OEM sai 1 ký tự → không trả sản phẩm đó ở vị trí kết quả chính xác (FR-036); mã không tồn tại → F-05.

### F-05 — Khách tìm mã không có kết quả

- **Tác nhân:** khách lẻ/gara.
- **Bước:**
  1. Nhập mã không tồn tại vào ô tìm kiếm → `/search?q=<mã>`.
  2. Trang kết quả hiển thị trạng thái không có kết quả.
- **Kết quả mong đợi:** thấy đủ 3 gợi ý — kiểm tra lại mã (chú ý từng ký tự), thử tìm theo tên sản phẩm, liên hệ Zalo/hotline 0886706338 kèm mã cần tìm (FR-040). Không thấy trang trắng.
- **Ngoại lệ:** không có.

### F-06 — Khách mở sản phẩm và kiểm tra xe tương thích

- **Tác nhân:** khách lẻ.
- **Bước:**
  1. Mở `/products/<product-slug>`.
  2. Xem danh sách xe tương thích (FR-028); bấm một xe → trang xe đó (tra cứu ngược, FR-030).
  3. Nếu đã chọn xe: hệ thống hiển thị "Tương thích ✓" hoặc cảnh báo "KHÔNG tương thích ⚠" rõ ràng trước khi thêm vào giỏ (FR-029).
- **Kết quả mong đợi:** khách biết chắc phụ tùng có lắp được cho xe mình không trước khi mua.
- **Ngoại lệ:** sản phẩm chưa có dữ liệu fitment → "Chưa có thông tin tương thích — liên hệ để được tư vấn", không đoán xe tương thích (FR-031, E-03).

### F-07 — Khách thêm sản phẩm vào giỏ và thay đổi số lượng

- **Tác nhân:** khách lẻ.
- **Bước:**
  1. Ở trang chi tiết, chọn số lượng → bấm "Thêm vào giỏ" → toast xác nhận; số món trên icon giỏ tăng đúng (FR-045).
  2. Mở `/cart` — thấy món vừa thêm.
  3. Sửa số lượng (tăng/giảm) → tổng tiền tính lại đúng theo thời gian thực (FR-050).
  4. Xóa một món → tổng tiền cập nhật; xóa toàn bộ → có xác nhận trước (ADR-009).
- **Kết quả mong đợi:** giỏ phản ánh đúng số lượng và tổng tiền sau mỗi thao tác; giỏ lưu qua phiên (FR-051).
- **Ngoại lệ:** sản phẩm trong giỏ bị admin ẩn/xóa hoặc đổi giá sau khi thêm → báo rõ ở checkout, khách xác nhận lại (FR-057, E-05).

### F-08 — Khách đi tới Checkout

- **Tác nhân:** khách lẻ có giỏ hàng.
- **Bước:**
  1. Ở `/cart`, bấm "Checkout" → `/checkout`.
  2. Thấy tóm tắt đơn và form thông tin người nhận + địa chỉ + chọn phương thức thanh toán (COD hoặc chuyển khoản).
- **Kết quả mong đợi:** vào được checkout với đúng giỏ của mình; tóm tắt đơn khớp với giỏ.
- **Ngoại lệ:** giỏ trống vào `/checkout` → chuyển về `/cart` kèm thông báo (FR-056, E-04).

### F-09 — Khách gặp lỗi do thiếu trường bắt buộc

- **Tác nhân:** khách lẻ ở checkout.
- **Bước:**
  1. Ở `/checkout`, bỏ trống một trường bắt buộc (theo danh sách trường ĐỀ XUẤT — D-08, chờ Henry duyệt) rồi bấm "Xác nhận đặt hàng".
  2. Hệ thống báo lỗi rõ từng trường thiếu; focus vào trường lỗi đầu tiên; không tạo đơn (FR-052).
  3. Khách điền đủ → bấm lại → qua bước tiếp theo.
- **Kết quả mong đợi:** không có đơn nào được tạo khi thiếu trường bắt buộc; thông báo lỗi chỉ rõ trường nào thiếu.
- **Ngoại lệ:** lỗi mạng khi đặt hàng → error state + nút thử lại.

### F-10 — Khách hoàn thành đơn và xem trang xác nhận

- **Tác nhân:** khách lẻ.
- **Bước:**
  1. Ở `/checkout`, điền đủ thông tin, chọn COD hoặc chuyển khoản, bấm "Xác nhận đặt hàng".
  2. Hệ thống tạo đơn + snapshot (tên, SKU, giá, số lượng lúc đặt — FR-054) → chuyển tới `/checkout/success`.
  3. Trang xác nhận hiển thị mã đơn hàng; với chuyển khoản: thông tin chuyển khoản + nội dung chuyển khoản chứa mã đơn (FR-055); với COD: xác nhận chờ giao.
  4. Bấm "Tra cứu đơn hàng" → `/orders/lookup` (mã đơn điền sẵn); bấm "Tiếp tục mua sắm" → `/parts`.
- **Kết quả mong đợi:** khách nhận được mã đơn và biết bước tiếp theo cho từng phương thức thanh toán.
- **Ngoại lệ:** truy cập trực tiếp `/checkout/success` khi không có đơn vừa đặt → chuyển về `/` hoặc `/cart` kèm thông báo.

### F-11 — Khách tra cứu đơn hàng

- **Tác nhân:** khách lẻ đã đặt hàng.
- **Bước:**
  1. Mở `/orders/lookup` (từ header/footer, trang xác nhận, hoặc vào trực tiếp).
  2. Nhập mã đơn → bấm "Tra cứu".
  3. Thấy trạng thái đơn + tóm tắt không nhạy cảm (số món, tổng tiền, phương thức thanh toán, ngày đặt).
- **Kết quả mong đợi:** khách biết trạng thái đơn của mình mà không cần đăng nhập; không lộ thông tin cá nhân hay chi tiết đơn của người khác (FR-058).
- **Ngoại lệ:** mã sai → "Không tìm thấy đơn hàng với mã này"; mã đoán được → không truy cập được đơn nào; gửi nhiều lần bất thường → bị chặn tạm thời (FR-058, E-06/E-07). Bước xác minh bổ sung (nếu có) theo D-09 — chờ Henry quyết.

### F-12 — Khách tìm thấy bài viết từ Blog

- **Tác nhân:** khách lẻ.
- **Bước:**
  1. Mở `/` → khu vực bài viết mới → bấm một bài viết → `/blog/<post-slug>`.
  2. Hoặc mở `/blog` → lọc theo chuyên mục → bấm một bài viết → `/blog/<post-slug>`.
  3. Đọc bài; bấm bài viết liên quan (nếu có) → bài đó.
- **Kết quả mong đợi:** tới đúng bài viết theo URL `/blog/<slug>`; bài chưa xuất bản (nháp) không xuất hiện ở `/blog` (FR-067).
- **Ngoại lệ:** chưa có bài viết → khu vực bài viết ở homepage bị ẩn; `/blog` hiển thị empty state (FR-004).

### F-13 — Khách không tìm thấy trang và gặp 404

- **Tác nhân:** bất kỳ người dùng nào.
- **Bước:**
  1. Mở URL không tồn tại (gõ sai, liên kết cũ, sản phẩm/danh mục đã ẩn) — ví dụ: `/products/<slug-đã-ẩn>`.
  2. Thấy trang 404 thân thiện: thông báo rõ, ô tìm kiếm, gợi ý danh mục/sản phẩm, nút về Homepage, nút liên hệ Zalo/hotline (FR-048).
- **Kết quả mong đợi:** khách không gặp lỗi 500 hay trang trắng; luôn có đường quay lại.
- **Ngoại lệ:** URL cũ đã có redirect 301 (FR-018) → tự động chuyển tới URL mới, không gặp 404.

### F-14 — Khách chuyển từ desktop sang mobile

- **Tác nhân:** khách lẻ.
- **Bước:**
  1. Dùng website ở desktop (rộng), rồi chuyển sang điện thoại hẹp (hoặc ngược lại) ở cùng một trang.
  2. Kiểm tra: header thu gọn (menu hamburger), ô tìm kiếm và bộ chọn xe vẫn tiếp cận được trong 1 chạm; bộ lọc thành drawer/modal; lưới sản phẩm 2 cột; CTA (thêm vào giỏ, checkout) cố định dưới màn hình khi phù hợp.
- **Kết quả mong đợi:** mọi chức năng vẫn dùng được; không phải thu nhỏ giao diện desktop (UI_UX_STANDARDS mục 1.5); không vỡ layout, không mất nội dung.
- **Ngoại lệ:** không có.

### F-15 — Khách sử dụng nút liên hệ Zalo/hotline

- **Tác nhân:** khách lẻ cần tư vấn.
- **Bước:**
  1. Bấm số hotline/Zalo 0886706338 ở header, hero, trang sản phẩm, trang tra cứu đơn, trang liên hệ hoặc footer.
  2. Thiết bị mở trình quay số / Zalo (theo thiết bị); hoặc bấm liên kết fanpage → fanpage SeeCar Auto.
  3. Hoặc mở `/contact` → điền form liên hệ → gửi → toast xác nhận.
- **Kết quả mong đợi:** số hiển thị đúng 0886706338 ở mọi vị trí (FR-087); bấm vào mở được đúng kênh theo thiết bị (FR-005).
- **Ngoại lệ:** gửi form lỗi → báo rõ + thử lại; đích nhận form do M01-04/M05 chốt theo Henry duyệt.

## 2. Luồng thay thế

### A-01 — Tìm theo tên / thương hiệu (không có mã)

Khách nhập tên phụ tùng hoặc tên thương hiệu vào ô tìm kiếm → `/search` → kết quả theo thứ tự ưu tiên ADR-010 (tên/thương hiệu sau mã chính xác) → lọc thêm theo danh mục/thương hiệu → trang chi tiết. (FR-034, FR-035, FR-038.)

### A-02 — Duyệt theo thương hiệu

Khách mở `/brands` → chọn một thương hiệu → `/brands/<brand-slug>` → lưới sản phẩm của thương hiệu đó → trang chi tiết. (FR-016.)

### A-03 — Tra cứu ngược fitment (từ xe xem phụ tùng, từ phụ tùng xem xe)

- Chiều 1: trang xe (`/vehicles/<make-slug>/<model-slug>`) → toàn bộ phụ tùng tương thích với xe đó.
- Chiều 2: trang chi tiết sản phẩm → toàn bộ xe tương thích với sản phẩm đó.
- Hai chiều trả về cùng tập fitment (FR-030).

### A-04 — Tìm theo SKU / mã nhà sản xuất

Như F-04 nhưng dùng mã SKU nội bộ hoặc mã nhà sản xuất; thứ tự ưu tiên: SKU chính xác đứng đầu, sau đó OEM chính xác, rồi mã nhà sản xuất (ADR-010). Tra cứu mã dùng endpoint `GET /identifiers/lookup` (P0-PROVISIONAL — BLOCKED_BY_PD-02/PD-03/PD-04).

### A-05 — Đổi xe đang chọn giữa chừng

Khách đã chọn xe A, đang duyệt catalogue; đổi sang xe B ở header/bộ chọn xe → kết quả lọc đổi theo xe B; vào trang chi tiết sản phẩm → cảnh báo tương thích tính lại theo xe B (FR-025, FR-029).

## 3. Trường hợp lỗi (tổng hợp)

| # | Trường hợp | Trang | Hành vi mong đợi | FR |
| --- | --- | --- | --- | --- |
| E-01 | Xe khách chọn chưa có trong hệ thống | Trang xe / Homepage | Thông báo rõ + gợi ý liên hệ Zalo/hotline; không hiển thị danh sách trống gây hiểu lầm | PRD 6.1 |
| E-02 | Xe đã chọn không có sản phẩm tương thích | Catalogue / Trang xe | Thông báo rõ + gợi ý liên hệ; không hiển thị danh sách trống khó hiểu | FR-012 |
| E-03 | Sản phẩm chưa có dữ liệu fitment | Chi tiết sản phẩm | "Chưa có thông tin tương thích — liên hệ để được tư vấn"; không đoán xe tương thích | FR-031 |
| E-04 | Giỏ trống vào checkout | `/checkout` | Chuyển về `/cart` kèm thông báo | FR-056 |
| E-05 | Sản phẩm trong giỏ bị đổi giá/ẩn sau khi thêm | Checkout | Báo rõ giá/tình trạng đã đổi; khách xác nhận lại với giá/tình trạng mới | FR-057 |
| E-06 | Mã đơn sai / mã đoán được | Tra cứu đơn | "Không tìm thấy đơn hàng với mã này"; không lộ thông tin đơn khác | FR-058 |
| E-07 | Tra cứu đơn quá nhiều lần bất thường | Tra cứu đơn | Bị chặn tạm thời (rate limit), báo rõ | FR-058 |
| E-08 | Lỗi tải dữ liệu (mạng/API) | Mọi trang dữ liệu | Error state + nút thử lại; không hiển thị trang trắng | FR-006 |
| E-09 | Sản phẩm/danh mục/thương hiệu/bài viết đã ẩn, truy cập bằng URL cũ | Chi tiết / Danh mục / Blog | 404 thân thiện + gợi ý sản phẩm/danh mục khác (hoặc redirect 301 nếu URL đã đổi theo FR-018) | FR-048 |
| E-10 | Thiếu trường bắt buộc ở checkout / form liên hệ | Checkout / Contact | Báo lỗi rõ từng trường; focus vào trường lỗi đầu tiên; không tạo đơn/không gửi form | FR-052 |

## 4. Kết quả walkthrough (kiểm thử logic — 26/11/2026)

Walkthrough 15 luồng F-01 → F-15 đối chiếu từng bước với SITEMAP.md, WIREFRAMES.md và API Specification. Kết quả: **15/15 PASS** — mọi bước đều có trang và thành phần tương ứng trong wireframe; không phát hiện bước nào thiếu trang hoặc thiếu thành phần. Chi tiết từng luồng (đường đi + kết quả) ghi trong Task Brief `docs/project-management/tasks/M01-04.md` mục 9.6.

Các kiểm tra khác cùng đợt: URL (ADR-004) 20/20 PASS; đối chiếu API 30/30 PASS; Mermaid render (Mermaid 11 + jsdom) 18 node / 25 cạnh PASS; wireframe 13 mẫu + 13 Desktop + 13 Mobile PASS; D-08/D-09 giữ Pending, không dữ liệu giả PASS. Nội dung chưa xác minh: render trực quan trên mermaid.live; hiển thị thực tế của wireframe trên trình duyệt (chưa có frontend); dữ liệu thật chờ Henry cung cấp.

## 5. Lịch sử revision

| Phiên bản | Ngày | Nội dung |
| --- | --- | --- |
| v0.1 (bản đầu) | 26/11/2026 | Bản đầu M01-04: 15 luồng chính F-01 → F-15, 5 luồng thay thế A-01 → A-05, 10 trường hợp lỗi E-01 → E-10. Trạng thái IN_REVIEW, chờ ChatGPT review. |
