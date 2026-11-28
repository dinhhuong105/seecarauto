# Auth JWT + Refresh Token — Hạ tầng backend (M02-05)

Tài liệu kỹ thuật cho lớp xác thực admin của backend SeeCar Auto.
Nguồn yêu cầu: Task Brief `docs/project-management/tasks/M02-05.md` (Revision 14,
ACCEPTED), API_SPEC §5/§10.5/§11.7/§12/§16, API_SECURITY §1, Error Catalog,
M02_IMPLEMENTATION_DECISIONS.md (D-01→D-16).

## 1. Tổng quan

| Thành phần | File | Vai trò |
|---|---|---|
| AuthController | `backend/src/auth/auth.controller.ts` | 4 endpoint auth admin (`/api/v1/auth/admin/*`) |
| AuthService | `backend/src/auth/auth.service.ts` | Login/lockout, refresh rotation + idempotency, logout, `/me`, cleanup |
| TokenService | `backend/src/auth/token.service.ts` | Ký/verify JWT, blacklist, mã hóa envelope refresh (AES-256-GCM) |
| PasswordService | `backend/src/auth/password.service.ts` | Argon2id hash/verify + dummy hash (D-13) |
| JwtAuthGuard | `backend/src/auth/jwt-auth.guard.ts` | Bearer → verify → blacklist → session → rate limit |
| auth.config.ts | `backend/src/auth/auth.config.ts` | `validateAuthEnv` fail-fast (theo mẫu `validateRedisEnv`) |
| auth.errors.ts | `backend/src/auth/auth.errors.ts` | `AuthException` — mọi lỗi auth đúng Error Catalog |
| auth-exception.filter.ts | `backend/src/auth/auth-exception.filter.ts` | Copy `retryAfter` trong body lên header `Retry-After` — chỉ HTTP 429/503; HTTP 423 không có header |
| app-setup.ts | `backend/src/app-setup.ts` | Setup chung (prefix `/api/v1` + ValidationPipe + filter) cho `main.ts` và e2e |

`AuthModule` import `PrismaModule` + `RedisModule` (đều `@Global`) và
`JwtModule.registerAsync` (secret mặc định = access secret; refresh secret
truyền riêng từng lần ký/verify — D-11). Không dùng Passport.

## 2. Endpoint

Mọi response thành công dùng envelope `{ data: ... }` (API_SPEC §8.1 INT-007;
OpenAPI cũng khai báo `data` — brief AC-01/§2.1 viết dạng phẳng nhưng INT-007 +
OpenAPI là contract chốt, nên implementation trả `{ data: ... }`).

| Endpoint | Auth | Hành vi |
|---|---|---|
| `POST /auth/admin/login` | Public | username + password → `{ accessToken, refreshToken, tokenType: "Bearer", expiresIn: 900, admin: { id, username, roles } }`; tạo 1 row `admin_refresh_sessions` (chỉ hash SHA-256, `expiresAt` = +7 ngày) |
| `POST /auth/admin/refresh` | Public + header `Idempotency-Key` (UUID, bắt buộc) | Xoay vòng refresh token (mục 4) |
| `POST /auth/admin/logout` | Bearer | Có `refreshToken` → thu hồi đúng session đó (`LOGOUT`); không có → thu hồi toàn bộ session (`LOGOUT_ALL`); luôn blacklist access token hiện tại; `204` |
| `GET /auth/admin/me` | Bearer | `{ id, username, roles, permissions }` — gộp vai trò + ngoại lệ, deny thắng allow (D-10); không có permission guard (M02-06) |

## 3. Token và claims

- Access JWT: 15 phút (`JWT_EXPIRES_IN=15m`), claims `sub` (admin id),
  `roles` (danh sách **role id** — tên claim `roles` là lựa chọn của
  implementation: API_SECURITY §1 chỉ ghi "`role` ids" mà không đặt tên
  claim chính xác; `/me` và login response trả role dạng `{ id, name }`),
  `type: "access"`, `sid` (id của row `admin_refresh_sessions` đã cấp
  token), `iat`, `exp`. Không claim nào khác (không hash, không permission
  list, không PII).
- Refresh JWT: 7 ngày (`JWT_REFRESH_EXPIRES_IN=7d`, D-02), claims `sub`,
  `sid`, `type: "refresh"`, `iat`, `exp`.
- Access và refresh dùng secret riêng (`JWT_SECRET` / `JWT_REFRESH_SECRET`,
  mỗi secret ≥ 32 ký tự, phải khác nhau — validate fail-fast lúc boot, AC-13).
- Access token gắn với đúng session đã cấp nó (`sid`): ngay sau refresh
  thành công, access token cũ hết hiệu lực (session cũ đã `ROTATED`) —
  hành vi chủ ý (FIX-10), không chờ tới hết hạn 15 phút.
- Không cookie auth (D-04): Bearer header + JSON body.

## 4. Refresh: rotation, idempotency, replay

Một transaction PostgreSQL duy nhất cho mỗi cặp (refresh token,
Idempotency-Key) — D-16/FIX-21, isolation READ COMMITTED:

1. **Claim:** `INSERT INTO auth_refresh_operations (...) VALUES (..., 'PENDING', ...)`
   `ON CONFLICT (token_hash, idempotency_key) DO NOTHING RETURNING id`.
   Insert được → leader. Conflict → follower (xem dưới).
2. **Khóa + kiểm tra session cũ:** `SELECT ... FROM admin_refresh_sessions
   WHERE token_hash = $h FOR UPDATE` — không ACTIVE → ROLLBACK toàn bộ
   (operation row biến mất), xử lý ngoài transaction theo AC-05/AC-06.
3. **Session mới trước, conditional rotation sau:** INSERT session mới
   TRƯỚC, rồi mới `UPDATE admin_refresh_sessions SET revoked_at = now(),
   revoked_reason = 'ROTATED', replaced_by_session_id = $newId WHERE id = $sid
   AND revoked_at IS NULL` (0 row → ROLLBACK). Thứ tự này là bắt buộc:
   self-FK `replaced_by_session_id → admin_refresh_sessions(id)` (D-15)
   được PostgreSQL kiểm tra theo từng statement, nên UPDATE-trước-INSERT
   lỗi FK 23503. Transaction ROLLBACK thì row session mới chèn trước đó
   cũng biến mất — không rò rỉ session.
4. **Operation → COMPLETED:** `UPDATE auth_refresh_operations SET state =
   'COMPLETED' WHERE token_hash = $h AND idempotency_key = $k AND owner_id =
   $owner AND state = 'PENDING'` — phải tác động đúng 1 row (0 row → ROLLBACK).

Bốn giới hạn thời gian tách biệt (FIX-25): `lock_timeout = '5s'` (SET LOCAL,
mỗi lần chờ lock), `statement_timeout = '10s'` (SET LOCAL, mỗi statement),
Prisma interactive transaction `timeout: 10000` (tổng transaction),
`idle_in_transaction_session_timeout = '5s'` (SET LOCAL, backstop khi treo
giữa các statement).

**Follower:** INSERT trả 0 row (leader đã COMMIT) → đọc operation row
(COMPLETED) → lấy response từ Redis envelope (đọc lại tối đa 1 giây, mỗi
50ms); envelope vắng/hỏng/sai owner → `503 SERVICE_UNAVAILABLE`, tuyệt đối
không giao token, không xử lý như replay (FIX-12: cùng key + operation
COMPLETED không phải AC-05). Envelope hết TTL (10 giây) → retry cùng key
vẫn `503`, không tạo session mới, không revoke-all.

**Replay (AC-05):** trình lại token đã `ROTATED` với key khác (không có
operation COMPLETED cho cặp token+key) → revoke-all: session đang ACTIVE →
`REUSE_DETECTED`; session đã thu hồi trước đó giữ nguyên reason cũ; row của
token bị replay giữ `ROTATED` (bằng chứng truy vết); `401
TOKEN_REUSE_DETECTED` + audit `auth.refresh_reuse_detected` trong cùng
transaction.

**Envelope Redis (FIX-13/FIX-16/FIX-20):** chỉ lưu response COMPLETED đã mã
hóa AES-256-GCM (key = base64 của đúng 32 byte, IV 12 byte, AAD =
`sid|tokenHashHex|idempotencyKey`); envelope JSON mang `sid` + `ownerId`
dưới dạng metadata ngoài ciphertext; key `auth:refresh:op:` +
hex(SHA-256(`tokenHashHex|idempotencyKey`)), TTL 10 giây. Ghi qua Lua
script owner-checked first-write-wins: chưa có → ghi; cùng owner →
idempotent no-op OK; owner khác → từ chối; sai định dạng → từ chối.
Không bao giờ xóa COMPLETED. Leader đã commit DB được trả response cho
chính caller của nó kể cả khi Redis không lưu được envelope (FIX-19/FIX-22:
ghi lỗi → đọc lại + xác minh; Redis chết hẳn → vẫn trả response + log warn).

**COMMIT mất ACK (FIX-26/FIX-28):** không bao giờ kết luận rollback chỉ vì
lần đọc đầu chưa thấy row. Đọc operation row: COMPLETED + owner_id khớp +
session cũ đã `ROTATED` với `replaced_by_session_id` trỏ tới session mới →
trả cặp token đã ký (giữ trong bộ nhớ của request). Chưa thấy row → giải
quyết bằng claim cùng key trong transaction mới (INSERT thành công → leader
với cặp token MỚI; 0 row → follower, đọc response đã lưu; hết thời gian chờ
→ 503). Không xác minh được → 503, không giao token, không tạo rotation
thứ hai.

**Proven rollback vs ambiguous COMMIT (verified 2026-11-27, Prisma 6.19.3):**
lỗi ném ra từ một statement BÊN TRONG callback `$transaction` chứng minh
transaction chưa commit (Prisma chỉ gửi COMMIT sau khi callback trả về) —
được gói trong `RefreshStatementError` và trả `503` trực tiếp, KHÔNG
re-claim (ví dụ: idle timeout, Prisma transaction timeout, lock timeout).
Chỉ lỗi từ chính phase COMMIT (sau khi callback hoàn thành) mới là ambiguous
và đi vào `resolveAmbiguousCommit`. Prisma 6.19.3 không trả literal message
"idle-in-transaction": idle abort hiện ra dưới dạng P1017 `Server has closed
the connection` từ statement tiếp theo; transaction timeout hiện ra dưới
dạng P2028. Xem test diagnostic trong `backend/test/auth.e2e-spec.ts`.

**Dọn dẹp (FIX-24/FIX-27):** `AuthService.cleanupExpiredOperations()` xóa
chỉ các row `auth_refresh_operations` đã quá `expires_at`, dùng
`FOR UPDATE SKIP LOCKED` (row đang bị transaction khác giữ thì bỏ qua).
**Chưa có scheduler gọi hàm này** — không thêm dependency `@nestjs/schedule`
hay BullMQ repeatable job trong M02-05; việc lên lịch cleanup là quyết định
vận hành (ops) — xem ghi chú trong Task Brief.

**Kế hoạch vận hành cleanup (quyết định review Giai đoạn 2, 27/11/2026 — bắt buộc trước production):** nếu không có scheduler nào gọi `cleanupExpiredOperations()`, các row `auth_refresh_operations` sẽ tích lũy vô hạn (mỗi lần refresh thành công tạo 1 row, `expires_at` = thời điểm tạo + TTL refresh 7 ngày). Cơ chế dự kiến: một cron ngoài ứng dụng (VD: cron hệ thống gọi một endpoint/script vận hành, hoặc một scheduled worker riêng) chạy `cleanupExpiredOperations()` **mỗi ngày một lần** (tần suất này đủ vì `expires_at` tính theo ngày — row hết hạn chậm nhất 7 ngày sau khi tạo; chạy hàng ngày giữ bảng gọn mà không tạo tải đáng kể, mỗi lần chạy chỉ xóa các row đã quá hạn). Giám sát lỗi: lần chạy cleanup phải ghi log số row đã xóa; nếu hàm ném lỗi (PostgreSQL không trả lời) thì log lỗi + cảnh báo cho vận hành — lỗi cleanup KHÔNG được làm gián đoạn login/refresh (cleanup chạy ngoài request path). Cơ chế cụ thể (cron job nào, ai sở hữu, cảnh báo đi đâu) do đội vận hành chốt khi triển khai production; M02-05 chỉ cung cấp hàm cleanup idempotent, an toàn khi chạy đồng thời (SKIP LOCKED) và chỉ xóa row đã hết hạn.

## 5. Login, lockout, audit

- Mật khẩu verify Argon2id OWASP (19 MiB, t=2, p=1, hashLen 32 — D-07);
  password 8–128 ký tự, không quy tắc độ phức tạp.
- Username không tồn tại → vẫn chạy verify với dummy hash cố định (D-13)
  rồi mới trả `401 INVALID_CREDENTIALS` (message chung, không lộ tài khoản
  có tồn tại).
- Lockout (D-01): sai liên tiếp 5 lần → khóa 15 phút; đang khóa mà đăng
  nhập đúng vẫn `423 ACCOUNT_LOCKED` + `retryAfter` (giây); hết thời gian
  khóa → đăng nhập lại được; đăng nhập đúng reset `failedLoginAttempts`
  về 0. Tăng counter là atomic; khóa + audit ghi trong cùng một transaction.
  Khóa đã hết hạn thì lần sai tiếp theo bắt đầu cửa sổ đếm mới.
- Audit (D-09 — chỉ 4 sự kiện, không audit rotation): `admin.locked`
  (actorId = entityId = user id bị khóa — subject do hệ thống phát sinh),
  `auth.refresh_reuse_detected`, `auth.logout_session`,
  `auth.logout_all_sessions`. Không log token/password/hash/plaintext;
  `AuditLog.after` không chứa token/hash.
- Tài khoản `isActive = false` → `401 INVALID_CREDENTIALS` chung (không lộ lý do).

## 6. Logout và blacklist

- Logout có `refreshToken` → thu hồi đúng session đó; không có → thu hồi
  toàn bộ session. Logout với refresh token đã stale/đã xoay → `401
  INVALID_REFRESH_TOKEN` (client có thể gọi lại không kèm refreshToken để
  logout-all — hành vi này không được brief đặc tả, là lựa chọn của
  implementation).
- Access token bị blacklist bằng SHA-256 trong Redis, TTL tới `exp`
  (D-06). Guard kiểm tra blacklist sau khi verify chữ ký + thời hạn, trước
  khi chấp nhận request; Redis lỗi khi kiểm tra → fail-closed `503
  SERVICE_UNAVAILABLE` + `Retry-After` (token đã thu hồi không "sống lại").
- Logout với refresh token của tài khoản khác → `401 INVALID_REFRESH_TOKEN`.

## 7. Rate limit

| Kind | Giới hạn | Khi Redis lỗi |
|---|---|---|
| `adminLoginIp` | 5/phút/IP | fail-closed (bộ nhớ tạm trong tiến trình) |
| `adminLoginAccount` | 10/phút/tài khoản | fail-closed |
| `adminRefreshIp` | 30/phút/IP (D-05) | fail-closed |
| `adminRefreshAccount` | 10/phút/tài khoản (D-05) | fail-closed |
| `adminAuthed` | 300/phút/tài khoản | fail-open |

Fallback bộ nhớ chỉ đúng trên một instance, không phải bảo đảm toàn hệ
thống (FIX-04). Vượt giới hạn → `429 RATE_LIMITED` + header `Retry-After`.

## 8. Cấu hình và secret

| Biến | Ý nghĩa |
|---|---|
| `JWT_SECRET` | Secret ký access token (≥ 32 ký tự, khác `JWT_REFRESH_SECRET`) |
| `JWT_REFRESH_SECRET` | Secret ký refresh token (≥ 32 ký tự) |
| `JWT_EXPIRES_IN` | TTL access token, mặc định `15m` |
| `JWT_REFRESH_EXPIRES_IN` | TTL refresh token, mặc định `7d` (D-02) |
| `REFRESH_IDEMPOTENCY_ENCRYPTION_KEY` | Base64 của đúng 32 byte ngẫu nhiên (44 ký tự có padding) — key AES-256-GCM cho envelope refresh |
| `AUTH_LOCKOUT_THRESHOLD` | Ngưỡng khóa, mặc định `5` |
| `AUTH_LOCKOUT_SECONDS` | Thời gian khóa (giây), mặc định `900` |

Thiếu secret / secret < 32 ký tự / hai secret trùng nhau / encryption key
không đúng 32 byte → app fail-fast lúc boot với message rõ ràng (AC-13).
Không có secret mặc định trong code. Giá trị thật chỉ nằm trong biến môi
trường server-side (`.env`, gitignored); `.env.example` chỉ chứa placeholder.

### Xoay secret (D-11) + runbook khi secret bị lộ

- Access và refresh secret xoay độc lập. Access: secret mới + secret cũ
  song song tối đa 15 phút (overlap ≤ 15 phút — bằng TTL access token),
  sau đó bỏ secret cũ. Refresh: chỉ secret hiện tại được chấp nhận —
  xoay refresh secret thì thu hồi toàn bộ refresh session (mọi admin phải
  đăng nhập lại).
- **Secret bị lộ (khẩn cấp):** (1) xác định phạm vi lộ; (2) xoay secret
  ngay; (3) thu hồi toàn bộ refresh session; (4) ghi audit + rà soát log;
  (5) báo Henry. Rủi ro còn lại đã chấp nhận: access token ký bằng secret
  bị lộ vẫn còn hiệu lực tối đa 15 phút (tới khi hết TTL hoặc bị blacklist
  khi logout).

## 9. Lỗi (Error Catalog)

| Code | HTTP | Khi nào |
|---|---|---|
| `UNAUTHENTICATED` | 401 | Thiếu/sai access token, token trong blacklist, session đã thu hồi |
| `INVALID_CREDENTIALS` | 401 | Sai tài khoản/mật khẩu (message chung) |
| `TOKEN_EXPIRED` | 401 | Access token hết hạn |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token hết hạn, hoặc đã thu hồi vì `LOGOUT`/`LOGOUT_ALL`/`ADMIN_REVOKED` |
| `TOKEN_REUSE_DETECTED` | 401 | Replay token đã xoay (key khác), hoặc session đã thu hồi vì `REUSE_DETECTED` |
| `ACCOUNT_LOCKED` | 423 | Tài khoản đang khóa (+ `retryAfter` trong body) |
| `RATE_LIMITED` | 429 | Vượt rate limit (+ header `Retry-After`) |
| `SERVICE_UNAVAILABLE` | 503 | Không xác minh được trạng thái (envelope mất, Redis/DB lỗi, lock/timeout) (+ header `Retry-After`) |
| `VALIDATION_ERROR` | 400 | Input sai / thiếu `Idempotency-Key` (+ `details: [{ field, code, message }]`) |

Response lỗi không lộ stack trace, SQL, tên bảng/cột, secret. Lỗi validation
dùng mã chi tiết theo constraint: `isNotEmpty`/`isDefined` → `REQUIRED`,
`isString` → `INVALID_TYPE`, `minLength` → `MIN_LENGTH`, `maxLength` →
`MAX_LENGTH`, `isUUID` → `INVALID_FORMAT`.

## 10. Kiểm thử

- Unit (`backend/src/auth/*.spec.ts`): config validation, Argon2id,
  TokenService (ký/verify, blacklist, envelope AES-GCM + Lua first-write-wins
  trên fake Redis), AuthService login/lockout/replay với Prisma mock, error
  classifiers.
- E2E (`backend/test/auth.e2e-spec.ts`): PostgreSQL thật
  (`seecarauto_test`) + Redis test thật (port 6399, DB 3); bao phủ AC-01→AC-18,
  đặc biệt AC-17 (đồng thời cùng key, khác key, thiếu key, hết TTL envelope,
  leader COMMIT trong cửa sổ 5–10s, leader idle, Prisma timeout > 10s,
  rollback, envelope sai owner, cleanup SKIP LOCKED, COMMIT mất ACK 3 tình
  huống, diagnostic error shape của Prisma 6.19.3) và dead-Redis (port 6398:
  memory fallback rate limit, leader/follower FIX-19, AC-18 fail-closed).
- AC-13 (fail-fast): `backend/test/auth-config.e2e-spec.ts` riêng (đổi
  `process.env` nên phải chạy file riêng).
- Test seam: `AuthService.refresh(..., hooks?: RefreshHooks)` — `hooks.onClaimed`
  chạy trong transaction ngay sau claim (e2e dùng để giữ transaction mở hoặc
  cho idle). Production không bao giờ set hook (controller không truyền).
- Lưu ý hạ tầng test: `ConfigModule.forRoot()` snapshot `process.env` lúc
  import `AppModule`, và `ConfigService.get()` ưu tiên validated env đã
  snapshot — nên không thể đổi `REDIS_URL` cho app thứ hai bằng cách gán
  `process.env` trong test; e2e override provider `RedisService` cho app
  dead-Redis. Xem comment trong `auth.e2e-spec.ts`.

## 11. Không thuộc M02-05

Permission guard / RBAC middleware (M02-06), M06-01 (bootstrap tài khoản),
M08-06 (hardening), tài khoản admin mẫu. Không tạo tài khoản mẫu, không
secret giả trong code.
