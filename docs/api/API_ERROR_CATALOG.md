# API Error Catalog — SeeCar Auto

| Trường | Nội dung |
| --- | --- |
| Task | M01-03 — API Specification |
| Milestone | M01 — Architecture & UI/UX |
| Trạng thái tài liệu | IN_REVIEW (đã báo cáo ChatGPT review ngày 26/11/2026) |
| Ngày | 26/11/2026 |
| Tài liệu chính | `docs/api/API_SPEC.md` (mục 12 — Xử lý lỗi) |

## Quy ước

- Mọi lỗi trả theo định dạng thống nhất `{ statusCode, message, error }` (INT-007); lỗi validation thêm `details: [{ field, code, message }]`.
- `message` tiếng Việt, thân thiện, không lộ chi tiết nội bộ (stack trace, SQL, tên bảng/cột, secret).
- Error code tiếng Anh UPPER_SNAKE_CASE, ổn định giữa các phiên bản minor; thêm error code mới thì ghi vào file này và CHANGELOG của API.
- Ví dụ trong file này là **ví dụ minh họa, không phải dữ liệu thật**.

## 1. Validation — 400

| Error code | Ý nghĩa | Ví dụ response |
| --- | --- | --- |
| `VALIDATION_ERROR` | Input sai định dạng, thiếu trường bắt buộc, giá trị ngoài enum, khoảng giá ngược, UUID sai định dạng | `{ "statusCode": 400, "message": "Dữ liệu gửi lên không hợp lệ.", "error": "VALIDATION_ERROR", "details": [{ "field": "quantity", "code": "MIN_VALUE", "message": "Số lượng phải từ 1 trở lên." }] }` |
| `EMPTY_CART` | Tạo đơn với giỏ trống (FR-056) | `{ "statusCode": 400, "message": "Giỏ hàng đang trống, không thể đặt hàng.", "error": "EMPTY_CART" }` |

## 2. Authentication — 401

| Error code | Ý nghĩa | Ví dụ response |
| --- | --- | --- |
| `UNAUTHENTICATED` | Thiếu token hoặc token sai định dạng ở endpoint yêu cầu auth | `{ "statusCode": 401, "message": "Bạn chưa đăng nhập.", "error": "UNAUTHENTICATED" }` |
| `INVALID_CREDENTIALS` | Sai tài khoản hoặc mật khẩu — message chung, không lộ tài khoản có tồn tại (FR-090) | `{ "statusCode": 401, "message": "Tài khoản hoặc mật khẩu không đúng.", "error": "INVALID_CREDENTIALS" }` |
| `TOKEN_EXPIRED` | Access token hết hạn (client dùng refresh token để đổi mới) | `{ "statusCode": 401, "message": "Phiên đăng nhập đã hết hạn.", "error": "TOKEN_EXPIRED" }` |
| `INVALID_REFRESH_TOKEN` | Refresh token đã thu hồi hoặc hết hạn (client phải đăng nhập lại) | `{ "statusCode": 401, "message": "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.", "error": "INVALID_REFRESH_TOKEN" }` |
| `TOKEN_REUSE_DETECTED` | Refresh token đã dùng rồi được gửi lại (nghi ngờ đánh cắp token) — thu hồi toàn bộ session của tài khoản | `{ "statusCode": 401, "message": "Phát hiện phiên đăng nhập bất thường, vui lòng đăng nhập lại.", "error": "TOKEN_REUSE_DETECTED" }` |

## 3. Authorization — 403

| Error code | Ý nghĩa | Ví dụ response |
| --- | --- | --- |
| `FORBIDDEN` | Đã đăng nhập nhưng không có permission cho thao tác này (FR-086, BR-006) | `{ "statusCode": 403, "message": "Tài khoản của bạn không có quyền thực hiện thao tác này.", "error": "FORBIDDEN" }` |
| `LAST_SUPER_ADMIN` | Thao tác khiến tài khoản Super Admin cuối cùng mất quyền quản trị hoặc tự khóa mình (BR-007, FR-085) | `{ "statusCode": 403, "message": "Không thể thực hiện: đây là tài khoản Super Admin cuối cùng.", "error": "LAST_SUPER_ADMIN" }` |
| `LAST_SUPER_ADMIN_ROLE` | Xóa vai trò của Super Admin cuối cùng (FR-082, FR-085) | `{ "statusCode": 403, "message": "Không thể xóa vai trò này: đây là vai trò của tài khoản Super Admin cuối cùng.", "error": "LAST_SUPER_ADMIN_ROLE" }` |

## 4. Not found — 404

| Error code | Ý nghĩa | Ví dụ response |
| --- | --- | --- |
| `PRODUCT_NOT_FOUND` | Sản phẩm không tồn tại, đã ẩn (HIDDEN) hoặc đã soft delete — ở public, sản phẩm ẩn được coi như không tồn tại (FR-048) | `{ "statusCode": 404, "message": "Không tìm thấy sản phẩm.", "error": "PRODUCT_NOT_FOUND" }` |
| `CATEGORY_NOT_FOUND` | Danh mục không tồn tại hoặc đã ẩn (public) | `{ "statusCode": 404, "message": "Không tìm thấy danh mục.", "error": "CATEGORY_NOT_FOUND" }` |
| `BRAND_NOT_FOUND` | Thương hiệu không tồn tại hoặc đã ẩn (public) | `{ "statusCode": 404, "message": "Không tìm thấy thương hiệu.", "error": "BRAND_NOT_FOUND" }` |
| `VEHICLE_NOT_FOUND` | Hãng/dòng/thế hệ/phiên bản xe không tồn tại hoặc đã ẩn | `{ "statusCode": 404, "message": "Không tìm thấy thông tin xe.", "error": "VEHICLE_NOT_FOUND" }` |
| `ORDER_NOT_FOUND` | Mã đơn sai hoặc đơn không tồn tại — message chung, không phân biệt "mã sai" hay "đơn không tồn tại" (FR-058) | `{ "statusCode": 404, "message": "Không tìm thấy đơn hàng với mã này.", "error": "ORDER_NOT_FOUND" }` |
| `ARTICLE_NOT_FOUND` | Bài viết không tồn tại hoặc đang nháp (public) | `{ "statusCode": 404, "message": "Không tìm thấy bài viết.", "error": "ARTICLE_NOT_FOUND" }` |
| `CART_ITEM_NOT_FOUND` | Món không có trong giỏ | `{ "statusCode": 404, "message": "Món hàng không có trong giỏ.", "error": "CART_ITEM_NOT_FOUND" }` |
| `ROLE_NOT_FOUND` | Vai trò không tồn tại | `{ "statusCode": 404, "message": "Không tìm thấy vai trò.", "error": "ROLE_NOT_FOUND" }` |
| `FITMENT_NOT_FOUND` | Fitment không tồn tại (khi bỏ gắn fitment đã bị xóa) | `{ "statusCode": 404, "message": "Không tìm thấy thông tin tương thích này.", "error": "FITMENT_NOT_FOUND" }` |
| `IMPORT_NOT_FOUND` | Lần import không tồn tại (importId sai hoặc đã hết hạn lưu trữ) | `{ "statusCode": 404, "message": "Không tìm thấy lần import này.", "error": "IMPORT_NOT_FOUND" }` |
| `NOT_FOUND` | Resource khác không tồn tại (dùng chung khi không có code riêng) | `{ "statusCode": 404, "message": "Không tìm thấy dữ liệu yêu cầu.", "error": "NOT_FOUND" }` |

## 5. Conflict / duplicate — 409

| Error code | Ý nghĩa | Ví dụ response |
| --- | --- | --- |
| `SKU_DUPLICATE` | SKU đã tồn tại (products.sku UNIQUE) | `{ "statusCode": 409, "message": "Mã SKU này đã tồn tại.", "error": "SKU_DUPLICATE" }` |
| `SLUG_DUPLICATE` | Slug đã tồn tại trong phạm vi unique của nó (danh mục/thương hiệu global; model theo make; generation theo model; variant theo generation) | `{ "statusCode": 409, "message": "Đường dẫn này đã tồn tại, hệ thống gợi ý đường dẫn khác.", "error": "SLUG_DUPLICATE", "details": [{ "field": "slug", "code": "DUPLICATE", "message": "Slug đã tồn tại." }] }` |
| `FITMENT_DUPLICATE` | Fitment (product + vehicle application) đã tồn tại (UNIQUE) | `{ "statusCode": 409, "message": "Phụ tùng này đã được gắn với xe đã chọn.", "error": "FITMENT_DUPLICATE" }` |
| `REDIRECT_DUPLICATE` | Redirect (entity_type, old_slug) đã tồn tại | `{ "statusCode": 409, "message": "Đã có chuyển hướng cho đường dẫn cũ này.", "error": "REDIRECT_DUPLICATE" }` |
| `CATEGORY_HAS_PRODUCTS` | Xóa danh mục còn sản phẩm (FR-020) — kèm số lượng sản phẩm để admin chuyển trước | `{ "statusCode": 409, "message": "Danh mục còn 12 sản phẩm, cần chuyển sản phẩm trước khi xóa.", "error": "CATEGORY_HAS_PRODUCTS" }` |
| `BRAND_HAS_PRODUCTS` | Xóa thương hiệu còn sản phẩm (FR-020) | `{ "statusCode": 409, "message": "Thương hiệu còn sản phẩm, cần chuyển sản phẩm trước khi xóa.", "error": "BRAND_HAS_PRODUCTS" }` |
| `VEHICLE_HAS_CHILDREN` | Xóa hãng/dòng/thế hệ còn dữ liệu con hoặc fitment (PD-05, RESTRICT) | `{ "statusCode": 409, "message": "Không thể xóa vì còn dữ liệu liên quan.", "error": "VEHICLE_HAS_CHILDREN" }` |
| `PRODUCT_HAS_ORDERS` | Xóa (thay vì ẩn) sản phẩm đã có trong đơn hàng (ERD RESTRICT, PD-05) | `{ "statusCode": 409, "message": "Sản phẩm đã có trong đơn hàng, chỉ có thể ẩn chứ không xóa.", "error": "PRODUCT_HAS_ORDERS" }` |
| `INVALID_STATUS_TRANSITION` | Chuyển trạng thái đơn sai thứ tự (vd: PENDING → COMPLETED) hoặc thao tác không hợp lệ với trạng thái hiện tại | `{ "statusCode": 409, "message": "Không thể chuyển đơn từ trạng thái hiện tại sang trạng thái này.", "error": "INVALID_STATUS_TRANSITION" }` |
| `ORDER_CANCELLED` | Thao tác sửa trạng thái/thông tin trên đơn đã hủy (FR-064) | `{ "statusCode": 409, "message": "Đơn hàng đã hủy, không thể thay đổi.", "error": "ORDER_CANCELLED" }` |
| `ORDER_ALREADY_SHIPPED` | Sửa thông tin giao hàng của đơn đã giao (FR-065) | `{ "statusCode": 409, "message": "Đơn hàng đã giao, không thể sửa thông tin giao hàng.", "error": "ORDER_ALREADY_SHIPPED" }` |
| `CANNOT_CANCEL_SHIPPED_ORDER` | Hủy đơn đã giao (FR-064, quy tắc M05) | `{ "statusCode": 409, "message": "Đơn hàng đã giao, không thể hủy.", "error": "CANNOT_CANCEL_SHIPPED_ORDER" }` |
| `CART_CHANGED` | Sản phẩm trong giỏ bị ẩn/xóa hoặc đổi giá sau khi thêm — đơn không được tạo, khách xác nhận lại với giá/tình trạng mới (FR-057) | `{ "statusCode": 409, "message": "Một số sản phẩm trong giỏ đã thay đổi giá hoặc tình trạng, vui lòng xác nhận lại.", "error": "CART_CHANGED", "details": [{ "field": "items[0].price", "code": "PRICE_CHANGED", "message": "Giá đã đổi từ 500.000đ thành 550.000đ." }] }` |
| `DUPLICATE_ORDER` | Tạo đơn lần thứ hai từ cùng một giỏ (Idempotency-Key khác nhau) — trả kèm `orderCode` của đơn đã tạo | `{ "statusCode": 409, "message": "Đơn hàng đã được tạo trước đó.", "error": "DUPLICATE_ORDER", "details": [{ "field": "orderCode", "code": "DUPLICATE", "message": "Mã đơn đã tạo: SCA-XXXXXX." }] }` |

## 6. Precondition failed — 412

| Error code | Ý nghĩa | Ví dụ response |
| --- | --- | --- |
| `PRECONDITION_FAILED` | Header `If-Match` (etag) không khớp — dữ liệu đã bị sửa bởi người khác (mục 15 API_SPEC) | `{ "statusCode": 412, "message": "Dữ liệu đã thay đổi, vui lòng tải lại rồi thử lại.", "error": "PRECONDITION_FAILED" }` |

## 7. Business rule violation — 422

| Error code | Ý nghĩa | Ví dụ response |
| --- | --- | --- |
| `PAYMENT_NOT_CONFIRMED` | Chuyển đơn sang SHIPPING khi đơn chuyển khoản chưa được xác nhận đã nhận tiền (BR-010) | `{ "statusCode": 422, "message": "Đơn chuyển khoản chưa được xác nhận đã nhận tiền.", "error": "PAYMENT_NOT_CONFIRMED" }` |
| `PRODUCT_UNAVAILABLE` | Món trong giỏ đã bị ẩn/xóa (không tính vào tổng tiền; khách cần xóa món đó) | `{ "statusCode": 422, "message": "Một món trong giỏ không còn khả dụng.", "error": "PRODUCT_UNAVAILABLE" }` |

## 8. Locked — 423

| Error code | Ý nghĩa | Ví dụ response |
| --- | --- | --- |
| `ACCOUNT_LOCKED` | Tài khoản admin bị khóa tạm sau nhiều lần đăng nhập sai (FR-091) — kèm `retryAfter` (giây) | `{ "statusCode": 423, "message": "Tài khoản tạm thời bị khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau.", "error": "ACCOUNT_LOCKED", "retryAfter": 900 }` |

## 9. Rate limit — 429

| Error code | Ý nghĩa | Ví dụ response |
| --- | --- | --- |
| `RATE_LIMITED` | Vượt giới hạn tần suất — kèm header `Retry-After` (giây) | `{ "statusCode": 429, "message": "Bạn thao tác quá nhanh, vui lòng thử lại sau.", "error": "RATE_LIMITED", "retryAfter": 60 }` |

## 10. Payload / media — 413 / 415

| Error code | Ý nghĩa | Ví dụ response |
| --- | --- | --- |
| `PAYLOAD_TOO_LARGE` | Body JSON quá 1 MB hoặc file upload quá giới hạn (ảnh 5 MB, Excel 10 MB) | `{ "statusCode": 413, "message": "Dữ liệu gửi lên quá lớn.", "error": "PAYLOAD_TOO_LARGE" }` |
| `UNSUPPORTED_MEDIA_TYPE` | Sai Content-Type (vd: gửi JSON cho endpoint upload file) | `{ "statusCode": 415, "message": "Định dạng dữ liệu không được hỗ trợ.", "error": "UNSUPPORTED_MEDIA_TYPE" }` |

## 11. Internal server error / service unavailable — 500 / 503

| Error code | Ý nghĩa | Ví dụ response |
| --- | --- | --- |
| `INTERNAL_ERROR` | Lỗi server không lường trước — message chung, không lộ chi tiết; ghi log đầy đủ server-side kèm `X-Request-Id` | `{ "statusCode": 500, "message": "Hệ thống đang gặp sự cố, vui lòng thử lại sau.", "error": "INTERNAL_ERROR" }` |
| `SERVICE_UNAVAILABLE` | Dependency (DB/Redis/Meilisearch/S3) lỗi tạm thời — kèm `Retry-After` khi biết thời gian khôi phục | `{ "statusCode": 503, "message": "Dịch vụ tạm thời không khả dụng, vui lòng thử lại sau.", "error": "SERVICE_UNAVAILABLE", "retryAfter": 30 }` |

## 12. Quy tắc dùng mã lỗi

1. Một tình huống chỉ có một error code duy nhất — không dùng `VALIDATION_ERROR` chung cho mọi lỗi 400 khi đã có code riêng (`SKU_DUPLICATE`, `EMPTY_CART`...).
2. 400 = input sai (client sửa input là hết lỗi). 409 = xung đột trạng thái/dữ liệu (client phải thay đổi thao tác, không phải sửa input). 412 = điều kiện If-Match không thỏa (client tải lại rồi sửa tiếp). 422 = vi phạm quy tắc nghiệp vụ (client cần thực hiện bước nghiệp vụ trước — vd: xác nhận tiền rồi mới giao hàng). 423 = tài khoản bị khóa tạm (kèm `retryAfter`).
3. Không tạo error code mới trong code M02 mà không ghi vào file này trước (Error Catalog là nguồn duy nhất của error code).
4. `details` chỉ xuất hiện khi có thông tin từng trường cụ thể (validation, `CART_CHANGED`, `DUPLICATE_ORDER`); các lỗi khác không có `details`.
