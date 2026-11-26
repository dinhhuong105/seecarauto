# API Security — SeeCar Auto

| Trường | Nội dung |
| --- | --- |
| Task | M01-03 — API Specification |
| Milestone | M01 — Architecture & UI/UX |
| Trạng thái tài liệu | IN_REVIEW (đã báo cáo ChatGPT review ngày 26/11/2026) |
| Ngày | 26/11/2026 |
| Tài liệu chính | `docs/api/API_SPEC.md` (mục 17 — Bảo mật, tóm tắt) |

## Quy ước

- Tài liệu này là bản đặc tả bảo mật của API — các quy tắc ở đây là yêu cầu bắt buộc cho M02 triển khai, không phải gợi ý.
- Mọi ví dụ là **ví dụ minh họa, không phải dữ liệu thật**.

## 1. Xác thực và phiên

- **JWT + Refresh Token (ADR-003, NFR-006):** access token ngắn hạn (15 phút — M02 chốt số cuối), refresh token dài hạn có xoay vòng; refresh token lưu **hash** ở database (không lưu plaintext), thu hồi được từng session; đăng xuất thu hồi cả 2 token (FR-090).
- **Truyền token:** chỉ qua header `Authorization: Bearer <token>`; không nhận token qua query string, không nhận token qua cookie cho API (cookie chỉ dùng cho cart token — xem API_SPEC mục 11.1).
- **Nội dung token:** access token chỉ chứa `sub` (admin id), `role` ids, `exp`, `iat`; không chứa thông tin nhạy cảm, không chứa permission đầy đủ (permission tra từ DB/cache theo vai trò — tránh token cũ giữ quyền đã bị thu hồi).
- **Khóa tài khoản:** sai liên tiếp tới ngưỡng (M02 chốt, FR-091) → khóa tạm + `423 ACCOUNT_LOCKED` + `retryAfter`; mở khóa tự động sau thời gian khóa hoặc Super Admin mở tay.
- **Replay refresh token:** refresh token đã dùng rồi được gửi lại → thu hồi toàn bộ session của tài khoản + `401 TOKEN_REUSE_DETECTED` (nghi ngờ đánh cắp token).
- **Mật khẩu:** hash Argon2id (NFR-006); không giới hạn độ dài tối đa thấp (tối thiểu 8 ký tự — M02 chốt chính sách cụ thể); không trả hash trong bất kỳ response nào.

## 2. Phân quyền (RBAC — ADR-005, FR-080 → FR-086, BR-006 → BR-008)

- **Backend kiểm tra quyền mọi request** — frontend chỉ ẩn nút (BR-006). Guard kiểm tra permission code trước handler; thiếu permission → `403 FORBIDDEN`.
- **Permission code:** `<module>.<action>` (vd: `products.view`); ma trận vai trò × module × hành động cấu hình bằng checkbox (FR-080); thay đổi có hiệu lực qua cache invalidation (TTL quyền 300s — BR-008).
- **Ngoại lệ theo tài khoản:** `user_permissions` (FR-083) — hạn chế dùng giai đoạn đầu; ngoại lệ được gộp với quyền vai trò khi kiểm tra (union, ngoại lệ `granted=false` có thể thu hồi quyền của vai trò cho tài khoản đó — M02 chốt semantics cuối: deny lấn át allow).
- **Chặn tự khóa:** thao tác khiến Super Admin cuối cùng mất quyền quản trị → `403 LAST_SUPER_ADMIN` (BR-007, FR-085).
- **Audit:** mọi thay đổi quyền ghi audit log (FR-084) — ai, khi nào, vai trò nào, quyền nào đổi, trước–sau.
- **Nguyên tắc least privilege:** tài khoản admin mới tạo mặc định không có quyền gì (phải được gán vai trò rõ ràng); không có tài khoản "admin mặc định" với mật khẩu mặc định sau bootstrap (Super Admin khởi tạo an toàn từ bootstrap — PRD 4.12).

## 3. Bảo vệ dữ liệu

- **Không lộ thông tin nhạy cảm trong response:** không trả mật khẩu/hash/token/secret (NFR-006); tra cứu đơn công khai không trả SĐT đầy đủ, địa chỉ chi tiết (FR-058); dashboard ẩn số liệu theo quyền (FR-077).
- **Không lộ qua lỗi:** message lỗi chung, không lộ stack trace, câu SQL, tên bảng/cột (API_SPEC mục 12); không phân biệt "tài khoản không tồn tại" với "sai mật khẩu" (FR-090); không phân biệt "mã đơn sai" với "đơn không tồn tại" (FR-058).
- **Không lưu thông tin thẻ thanh toán** (NFR-019); P0 chỉ COD/chuyển khoản — không có trường thẻ nào trong API.
- **Mã đơn không đoán được:** `orderCode` sinh ngẫu nhiên, không liên tục, có checksum (FR-058, API_SPEC mục 11.3).
- **Che dữ liệu trong log:** SĐT, địa chỉ, nội dung chuyển khoản, token, mật khẩu bị che (`***`) trong log (API_SPEC mục 18).
- **Ảnh:** URL ảnh tuyệt đối qua S3/R2 (INT-005); không cho phép upload file thực thi (chỉ jpg/png/webp, kiểm tra magic bytes server-side, không tin extension); tên file lưu trữ sinh ngẫu nhiên (không dùng tên gốc của người upload).

## 4. Chống tấn công thường gặp (NFR-007)

| Tấn công | Biện pháp |
| --- | --- |
| SQL Injection | Parameterized query qua Prisma (M02); không nối chuỗi thô vào truy vấn; input không bao giờ được đưa trực tiếp vào câu lệnh |
| XSS (stored/reflected) | Escape mọi input khi hiển thị; không trả HTML thô từ input người dùng; `Content-Security-Policy` cho `/api/docs`; `X-Content-Type-Options: nosniff` |
| CSRF | Cookie giỏ hàng dùng `SameSite=Lax`; thao tác admin qua `Authorization` header (không dùng cookie auth nên không dính CSRF qua cookie); M02 chốt thêm CSRF token nếu có thao tác admin nào dùng cookie |
| Brute force đăng nhập | Rate limit login 5 lần/phút/IP + 10 lần/phút/tài khoản; khóa tạm sau ngưỡng sai (FR-091) |
| Dò mã đơn | Mã đơn ngẫu nhiên không liên tục + rate limit lookup 10 lần/phút/IP + 5 lần/phút/mã đơn (FR-058) |
| Spam form liên hệ | Rate limit 5 lần/giờ/IP + validation + (M05 có thể thêm CAPTCHA — chưa chốt ở đây) |
| DoS qua request lớn | Body JSON tối đa 1 MB; file upload tối đa 5 MB (ảnh) / 10 MB (Excel); `413 PAYLOAD_TOO_LARGE` khi vượt |
| DoS qua tìm kiếm nặng | Rate limit search 60 lần/phút/IP; Meilisearch timeout; không cho `limit` > 100 |
| Enumeration (đoán id) | Mọi id là UUID ngẫu nhiên (không phải số thứ tự); resource không tồn tại và resource bị ẩn trả cùng một lỗi 404 |
| Token theft | Refresh token xoay vòng + thu hồi khi phát hiện reuse; access token ngắn hạn; logout thu hồi cả 2 token |

## 5. Security headers

Mọi response (kể cả lỗi) đều kèm:

| Header | Giá trị |
| --- | --- |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` (chỉ khi HTTPS) |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Content-Security-Policy` | Áp cho `/api/docs` (Swagger UI): `default-src 'self'` + nguồn cần thiết cho Swagger UI (M02 chốt giá trị cụ thể) |
| `Referrer-Policy` | `no-referrer` |
| `X-Request-Id` | UUID của request (truy vết log — API_SPEC mục 18) |
| `Cache-Control` | `no-store` cho mọi response có auth hoặc chứa thông tin cá nhân/đơn hàng; `public, max-age=<TTL>` cho dữ liệu catalogue public theo ADR-006 |

## 6. CORS và môi trường

- **CORS:** chỉ cho phép origin của frontend (`http://localhost:3000` ở dev) và admin (`http://localhost:3001` ở dev); production origin theo D-01 (cấu hình qua biến môi trường, không hard-code); không dùng `Access-Control-Allow-Origin: *` cho endpoint có auth; `Access-Control-Allow-Credentials` chỉ bật cho origin đã cho phép.
- **Secret và cấu hình (NFR-008):** không commit secret/API key/mật khẩu; chỉ commit `.env.example`; API key Meilisearch/S3/JWT secret chỉ ở biến môi trường server-side; JWT secret tối thiểu 32 ký tự ngẫu nhiên, xoay định kỳ (quy trình xoay do M02 chốt).
- **Môi trường:** dev/staging/production tách biệt (DB, Redis, Meilisearch, S3 bucket riêng); không dùng dữ liệu production để kiểm thử; backup/khôi phục theo NFR-015 (quy trình M02 chốt).

## 7. Rate limiting (tóm tắt — chi tiết xem API_SPEC mục 16)

- Chung public GET: 100/phút/IP; public ghi: 30/phút/IP; admin: 300/phút/tài khoản.
- Riêng: login 5/phút/IP + 10/phút/tài khoản; order lookup 10/phút/IP + 5/phút/mã đơn; search 60/phút/IP; contact 5/giờ/IP; tạo đơn 10/phút/cartToken.
- Vượt quá → `429 RATE_LIMITED` + header `Retry-After`; counter lưu Redis; Redis lỗi → fail-open cho public GET, fail-closed cho login/lookup.

## 8. Kiểm thử bảo mật (cho M08, ghi trước để M02 chuẩn bị)

- Gọi API admin không token → 401; gọi bằng tài khoản thiếu quyền → 403 (FR-086).
- Thử payload XSS/SQLi vào mọi input chuỗi → bị chặn/lọc, không thực thi (NFR-007).
- Thử dò mã đơn, dò tài khoản (timing/user enumeration) → không lộ thông tin.
- Kiểm tra response không chứa trường nhạy cảm (quét tự động trong Test 2 — API_SPEC mục 23).
- Kiểm tra security headers có mặt trên mọi response (kể cả lỗi).
