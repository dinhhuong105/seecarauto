# API Scenarios — SeeCar Auto

| Trường | Nội dung |
| --- | --- |
| Task | M01-03 — API Specification |
| Milestone | M01 — Architecture & UI/UX |
| Trạng thái tài liệu | IN_REVIEW (đã báo cáo ChatGPT review ngày 26/11/2026) |
| Ngày | 26/11/2026 |
| Tài liệu chính | `docs/api/API_SPEC.md` (mục 19 — Ma trận kịch bản) |

## Quy ước

- Mỗi kịch bản có: mục đích, tiền điều kiện, các bước gọi API (method + path + request), kết quả kỳ vọng (status + response), trường hợp biên, FR liên quan.
- Đây là kịch bản kiểm thử **thiết kế/hợp đồng API** (chưa có backend thật) — Test 3 trong API_SPEC mục 23 đối chiếu từng kịch bản với endpoint + error tương ứng.
- Mọi ví dụ (tên sản phẩm, mã, giá, tên khách, địa chỉ, SĐT) là **ví dụ minh họa, không phải dữ liệu thật**.

## S-01 — Tìm phụ tùng theo hãng xe

- **Mục đích:** khách chọn hãng → dòng → đời → xem phụ tùng tương thích (FR-021 → FR-025).
- **Tiền điều kiện:** có hãng xe, dòng xe, thế hệ/phiên bản và fitment (dữ liệu kiểm thử, không phải dữ liệu thật).
- **Các bước:**
  1. `GET /api/v1/vehicles/makes` → danh sách hãng (chỉ hãng hiển thị).
  2. `GET /api/v1/vehicles/makes/{slug}/models` → chỉ dòng của hãng đó (chọn hãng A không thấy dòng của hãng B — FR-024).
  3. `GET /api/v1/vehicles/models/{slug}/generations` → thế hệ của dòng.
  4. `GET /api/v1/vehicles/{makeSlug}/{modelSlug}?generationId=...` → danh sách phụ tùng tương thích (phân trang).
- **Kết quả kỳ vọng:** mỗi cấp chỉ hiện con của cấp cha; danh sách sản phẩm chỉ chứa sản phẩm có fitment với xe đã chọn; xe chưa có fitment → `data: []` + `meta.notice: NO_FITMENT_FOR_VEHICLE` (FR-012).
- **Trường hợp biên:** hãng/dòng không tồn tại → `404 VEHICLE_NOT_FOUND`; generation có `yearTo = null` (còn sản xuất) vẫn liệt kê được.

## S-02 — Tìm phụ tùng theo loại (danh mục) + lọc kết hợp

- **Mục đích:** duyệt danh mục, lọc nhiều điều kiện cùng lúc (FR-007, FR-008).
- **Các bước:** `GET /api/v1/categories/{slug}/products?brandSlug=...&minPrice=...&maxPrice=...&availabilityStatus=IN_STOCK&sort=price_asc&page=1&limit=20`.
- **Kết quả kỳ vọng:** kết quả thỏa tất cả điều kiện lọc (AND); đổi trang không trùng/lặp sản phẩm (tie-breaker `id` — FR-009); bỏ lọc → kết quả trở lại đầy đủ.
- **Trường hợp biên:** `minPrice > maxPrice` → `400 VALIDATION_ERROR`; `limit=500` → clamp về 100; `page=999` → `data: []` + meta đúng.

## S-03 — Tra cứu OEM chính xác

- **Mục đích:** khách đã có mã OEM trong tay, tìm đúng phụ tùng (FR-034 → FR-036).
- **Các bước:**
  1. `GET /api/v1/identifiers/lookup?type=OEM_NUMBER&code=<mã OEM đúng>` → trả đúng sản phẩm (có thể nhiều sản phẩm nếu 1 OEM map nhiều sản phẩm — PD-03: thiết kế dự kiến, chưa được Henry duyệt; đây là kiểm tra thiết kế, không phải nghiệp vụ đã chốt).
  2. `GET /api/v1/identifiers/lookup?type=OEM_NUMBER&code=<mã OEM sai 1 ký tự>` → không trả sản phẩm đó (không fuzzy mạnh với mã OEM — FR-036).
  3. `GET /api/v1/search?q=<mã OEM>` → sản phẩm có mã OEM chính xác đứng đầu (thứ tự ưu tiên ADR-010 — FR-035).
- **Kết quả kỳ vọng:** bước 1 trả đúng; bước 2 trả `data: []`; bước 3 có `matchType: OEM_EXACT` ở đầu.
- **Trường hợp biên:** mã chỉ gồm ký tự phân cách (`---`) → `400 VALIDATION_ERROR` (FIX-03 M01-02); `type` ngoài enum → `400`.

## S-04 — Xem chi tiết sản phẩm và fitment

- **Mục đích:** trang quyết định mua đủ thông tin (FR-042 → FR-044, FR-028).
- **Các bước:**
  1. `GET /api/v1/products/{productId}` → đủ tên, thương hiệu, hình ảnh, thông số, giá, tình trạng, 4 loại mã có nhãn riêng (FR-043).
  2. `GET /api/v1/products/{productId}/fitments` → danh sách xe tương thích đầy đủ; bấm một xe → `GET /api/v1/vehicles/{makeSlug}/{modelSlug}` đúng trang xe.
- **Kết quả kỳ vọng:** 4 loại mã hiển thị nhãn riêng, không gộp chung; danh sách xe đủ, không thiếu xe nào có fitment.
- **Trường hợp biên:** sản phẩm có 0 fitment → xem S-05.

## S-05 — Fitment không tìm thấy (sản phẩm chưa có dữ liệu fitment)

- **Mục đích:** không đoán xe tương thích khi chưa có dữ liệu (FR-031).
- **Các bước:** `GET /api/v1/products/{productId}/fitments` với sản phẩm chưa gắn fitment; `GET /api/v1/fitment/check?productId=...&vehicleApplicationId=...` với sản phẩm đó.
- **Kết quả kỳ vọng:** `data: []` + `fitmentNotice: NO_FITMENT_INFO`; `fitment/check` trả `compatible: false` kèm `fitmentNotice`; frontend hiển thị "chưa có thông tin tương thích — liên hệ để được tư vấn", không hiển thị danh sách xe.

## S-06 — Sản phẩm không còn khả dụng

- **Mục đích:** xử lý đúng khi sản phẩm bị ẩn/xóa hoặc hết hàng (FR-048, FR-057).
- **Các bước:**
  1. `GET /api/v1/products/{productId}` với sản phẩm HIDDEN → `404 PRODUCT_NOT_FOUND` (frontend hiển thị 404 thân thiện + gợi ý).
  2. `POST /api/v1/cart/items` với sản phẩm OUT_OF_STOCK → thêm được nhưng kèm `availabilityWarning`.
  3. Sản phẩm trong giỏ bị admin ẩn sau khi thêm → `GET /api/v1/cart` hiển thị item với `unavailable: true`, không tính vào tổng tiền; `POST /api/v1/orders` → `409 CART_CHANGED` (khách xác nhận lại).
- **Kết quả kỳ vọng:** đúng như từng bước; không có trường hợp nào khách đặt được sản phẩm đã ẩn/xóa mà không được báo.

## S-07 — Đặt hàng hợp lệ (COD)

- **Mục đích:** luồng đặt hàng chuẩn (FR-052 → FR-055).
- **Tiền điều kiện:** giỏ có 2 món, sản phẩm PUBLISHED + IN_STOCK, giá catalogue ổn định.
- **Các bước:** `POST /api/v1/orders` với header `Idempotency-Key: <uuid>`, body `{ cartToken, customerName, customerPhone, shippingAddress, paymentMethod: "COD" }`.
- **Kết quả kỳ vọng:** `201`; response có `orderCode` (không đoán được, không liên tục), `status: PENDING`, `totalAmount` = tổng line total server tính, `items` là snapshot (tên/SKU/giá/số lượng lúc đặt — BR-003); giỏ hàng bị xóa sau khi đặt.
- **Kiểm chứng snapshot:** đổi giá catalogue sau khi đặt → `GET /api/v1/orders/{orderId}` (admin) vẫn hiển thị giá lúc đặt, không đổi.

## S-08 — Đặt hàng không hợp lệ

- **Mục đích:** validation checkout (FR-052, FR-053, FR-056).
- **Các bước:**
  1. `POST /api/v1/orders` với giỏ trống → `400 EMPTY_CART`.
  2. Thiếu `customerPhone` → `400 VALIDATION_ERROR` với `details` chỉ rõ trường `customerPhone`.
  3. `paymentMethod: "VNPAY"` → `400 VALIDATION_ERROR` (P0 chỉ COD + chuyển khoản — BR-009).
  4. SĐT sai định dạng → `400 VALIDATION_ERROR`.
  5. Thiếu header `Idempotency-Key` → `400 VALIDATION_ERROR`.
- **Kết quả kỳ vọng:** không đơn nào được tạo trong cả 5 trường hợp; lỗi báo rõ từng trường.

## S-09 — Đặt hàng trùng (idempotency)

- **Mục đích:** không tạo 2 đơn khi client gửi trùng (mục 15 API_SPEC).
- **Các bước:**
  1. `POST /api/v1/orders` với `Idempotency-Key: K` → `201`, đơn A.
  2. Gửi lại đúng request với `Idempotency-Key: K` → trả lại đúng response lần đầu (cùng `orderCode`, cùng status 201), không tạo đơn mới.
  3. Gửi lại từ cùng giỏ với key khác K2 → `409 DUPLICATE_ORDER` kèm `orderCode` của đơn A.
- **Kết quả kỳ vọng:** chỉ có 1 đơn được tạo; giỏ chỉ bị xóa 1 lần.

## S-10 — Admin cập nhật sản phẩm (đổi giá)

- **Mục đích:** giá mới có hiệu lực đúng TTL, đơn cũ không đổi (FR-047, BR-003).
- **Các bước:**
  1. Admin `PATCH /api/v1/products/{productId}` đổi `price` (token + `products.update`).
  2. `GET /api/v1/products/{productId}` (public) → giá mới sau khi cache invalidate (TTL 900s).
  3. Đơn đã đặt trước đó → `GET /api/v1/orders/{orderId}` (admin) vẫn hiển thị giá cũ (snapshot).
- **Kết quả kỳ vọng:** đúng như từng bước; không có đơn cũ nào bị đổi giá.

## S-11 — Admin không đủ quyền

- **Mục đích:** backend kiểm tra quyền mọi request (FR-086, BR-006).
- **Các bước:**
  1. Tài khoản admin chỉ có `products.view` gọi `POST /api/v1/products` (không có `products.create`) → `403 FORBIDDEN` (dù frontend đã ẩn nút Tạo).
  2. Tài khoản đó gọi `GET /api/v1/products` → `200` (có quyền xem).
  3. Tài khoản không có `orders.view` gọi `GET /api/v1/admin/dashboard/summary` → `pendingOrders: null` + `hiddenByPermission: true` (FR-077).
- **Kết quả kỳ vọng:** 403 đúng chỗ; không có dữ liệu nào lộ qua endpoint thiếu quyền.

## S-12 — Thao tác đơn hàng (admin)

- **Mục đích:** vòng đời đơn đúng thứ tự, có log (FR-060 → FR-066).
- **Các bước:**
  1. `GET /api/v1/orders?status=PENDING` → chỉ đơn PENDING.
  2. `GET /api/v1/orders/{orderId}` → đủ snapshot + lịch sử trạng thái.
  3. Đơn BANK_TRANSFER: `PATCH /orders/{id}/status` sang SHIPPING khi chưa confirm-payment → `422 PAYMENT_NOT_CONFIRMED` (BR-010); `POST /orders/{id}/confirm-payment` → `200`; rồi chuyển SHIPPING → `200`.
  4. `PATCH /orders/{id}/status` PENDING → COMPLETED (nhảy cóc) → `409 INVALID_STATUS_TRANSITION`.
  5. `POST /orders/{id}/cancel` với `reason` → `200`, đơn sang CANCELLED; sửa trạng thái đơn đã hủy → `409 ORDER_CANCELLED`.
  6. `PATCH /orders/{id}/shipping` trên đơn SHIPPING → `409 ORDER_ALREADY_SHIPPED`.
- **Kết quả kỳ vọng:** đúng như từng bước; mọi thay đổi đều ghi log (kiểm tra qua `GET /api/v1/audit-logs?entityType=ORDER&entityId=...`).

## S-13 — Tra cứu đơn công khai

- **Mục đích:** tra cứu an toàn, chống dò mã (FR-058).
- **Các bước:**
  1. `GET /api/v1/orders/lookup?code=<mã đúng>` → `200`: trạng thái + tóm tắt (không SĐT đầy đủ, không địa chỉ chi tiết).
  2. `GET /api/v1/orders/lookup?code=<mã sai>` → `404 ORDER_NOT_FOUND` (message chung).
  3. `GET /api/v1/orders/lookup?code=000001` (mã số thứ tự đoán được) → `404` (mã đơn sinh ngẫu nhiên, không có mã dạng số thứ tự).
  4. Gửi 11 lần tra cứu trong 1 phút từ cùng IP → lần 11 trả `429 RATE_LIMITED` + header `Retry-After`.
- **Kết quả kỳ vọng:** đúng như từng bước; không lộ đơn của người khác bằng bất kỳ cách nào.

## S-14 — Trường hợp biên từ Pending Decisions

- **Mục đích:** PD-01 và PD-03 không chặn luồng chính (PD-01, PD-03).
- **Các bước:**
  1. `GET /api/v1/identifiers/lookup?type=OEM_NUMBER&code=<OEM map 2 sản phẩm>` → trả cả 2 sản phẩm (PD-03: một OEM map nhiều sản phẩm — thiết kế dự kiến, chưa được Henry duyệt; đây là kiểm tra thiết kế, không phải nghiệp vụ đã chốt).
  2. Fitment ở mức Model+Year (generationId null, variantId null) → `GET /api/v1/vehicle-applications/{applicationId}/products` trả đúng sản phẩm (PD-01).
  3. `GET /api/v1/vehicles/models/{slug}/generations` với dòng xe chưa có generation → `data: []` (không lỗi).
- **Kết quả kỳ vọng:** đúng như từng bước; các endpoint PROVISIONAL hoạt động theo thiết kế dự kiến, không bị coi là đã chốt nghiệp vụ.

## S-15 — Phân trang biên

- **Mục đích:** phân trang ổn định (FR-009, mục 13 API_SPEC).
- **Các bước:**
  1. `GET /api/v1/products?page=999&limit=20` → `200`, `data: []`, `meta.totalPages` đúng.
  2. `GET /api/v1/products?limit=500` → limit clamp về 100, trả tối đa 100 item.
  3. `GET /api/v1/products?sort=price_asc&page=1&limit=20` rồi `page=2` → không trùng/lặp sản phẩm giữa 2 trang.
- **Kết quả kỳ vọng:** đúng như từng bước.

## S-16 — Tra cứu chéo khách hàng (không lộ đơn người khác)

- **Mục đích:** không có cách nào liệt kê đơn theo SĐT/tên (FR-058).
- **Các bước:**
  1. `GET /api/v1/orders/lookup?code=<mã đơn của khách B>` — khách A biết mã đơn của B thì thấy được tóm tắt đơn B (đây là thiết kế P0: mã đơn là bí mật duy nhất; D-09 sẽ bổ sung xác minh sau).
  2. Không có endpoint nào cho phép liệt kê đơn theo SĐT/tên ở public (kiểm tra catalogue §10: chỉ có `GET /orders/lookup` theo mã đơn; `GET /orders` là admin, cần `orders.view`).
  3. Khách A gọi `GET /api/v1/orders` không token → `401 UNAUTHENTICATED`.
- **Kết quả kỳ vọng:** đúng như từng bước; ghi chú rõ giới hạn này trong báo cáo (D-09 chưa chốt nên mã đơn là lớp bảo vệ duy nhất ở P0 — xem API_SPEC mục 11.3).

## S-17 — Ranh giới quyền admin (đổi quyền có hiệu lực ngay)

- **Mục đích:** thay đổi quyền có hiệu lực qua cache invalidation + audit log (FR-081, FR-084).
- **Các bước:**
  1. Super Admin `PUT /api/v1/roles/{roleId}/permissions` bỏ `products.create` của một vai trò.
  2. Tài khoản thuộc vai trò đó gọi `POST /api/v1/products` → `403 FORBIDDEN` (sau cache invalidate, TTL quyền 300s — trong TTL có thể vẫn còn quyền cũ, ghi chú rõ trong kết quả kiểm thử).
  3. `GET /api/v1/audit-logs?entityType=ROLE&entityId={roleId}` → có bản ghi đổi quyền (ai, khi nào, quyền nào đổi).
  4. Super Admin thử bỏ quyền quản trị của chính tài khoản Super Admin cuối cùng → `403 LAST_SUPER_ADMIN`.
- **Kết quả kỳ vọng:** đúng như từng bước (trừ độ trễ TTL 300s được ghi chú rõ).
