# M02-05 — G4 Evidence (AC-01 → AC-18 full verification)

Giai đoạn 4 — kiểm thử nghiệm thu toàn diện. Ba mốc: G4 ban đầu (commit
3b7a367) chạy mới hoàn toàn trên commit đó (không tái dùng kết quả của các
commit 2c36c06, e3ac77f, d356c92 hay bc1f803 để chứng minh G4); Revision 02
(commit aec557b) bổ sung 1 test FK-reject và chạy lại toàn bộ E2E mới
(8 suites / 133 tests) — bằng chứng chạy mới trong tài liệu này là của
Revision 02, không phải của commit G4 ban đầu; Revision 03 (commit 09afcaa)
chỉ sửa tài liệu (quét lại đúng log Revision 02 + đồng bộ bằng chứng).
Branch `feature/M02-05-auth-jwt-refresh-token`, base `a77bbd9`, không merge/rebase.
File/diffstat xem `git show --stat HEAD`; commit SHA xem trong git log.

## Môi trường kiểm chứng (G4-03)

- PostgreSQL 16.15 (local, `seecarauto_test`): 4 migration đã áp dụng
  (`20261126152122_init`, `20261127020636_add_uuid_and_updated_at_defaults`,
  `20261127095124_m0205_refresh_revocation_reason`,
  `20261127095209_m0205_refresh_operations`), 29 bảng.
- Test Redis: 127.0.0.1:6399 (DB 3 cho auth e2e), PONG; dead-port 6398 dùng
  cho các test Redis-down có chủ đích.
- Test Meilisearch 1.11.3: 127.0.0.1:7701, health `available`.
- Test config: `backend/.env.test` (`JWT_EXPIRES_IN=15m`,
  `JWT_REFRESH_EXPIRES_IN=7d`, `REDIS_URL=redis://127.0.0.1:6399/3`).
- Không có máy ảo bị thay trong lúc làm G4 (hạ tầng còn nguyên từ FIX-39).

## G4-02 — Unit (chạy mới)

- Lệnh: `pnpm test` (từ `backend/`).
- Kết quả (chạy mới trong Revision 02, đồng bộ trong Revision 03):
  **10 suites / 63 tests PASS**, exit 0 — log
  `~/workspace/g4r2-unit.log`.

## G4-03 — E2E tuần tự trên PostgreSQL + Redis thật (chạy mới)

- Lệnh: `pnpm exec jest --config test/jest-e2e.json --runInBand --verbose`
  (từ `backend/`).
- Kết quả (chạy mới trong Revision 02, đồng bộ trong Revision 03):
  **8 suites / 133 tests PASS trong 205.602s** — log
  `~/workspace/g4r2-full-e2e.log` (132 test của G4 + 1 test FK-reject mới
  FIX-G4-01). Per-suite: app 1/1, auth 40/40, auth-config 7/7,
  auth-idempotency 15/15, g4-evidence 8/8, prisma-constraints 32/32,
  queue 6/6, redis 24/24. Jest không tự thoát sau tóm tắt (teardown
  BullMQ đã biết) — kill đúng PID 37887 (SIGTERM); exit trong log là do
  kill, không phải exit code test thành công.
- Không có test nào FAIL, không có rerun nào trong lần chạy này.

## G4-01 — Bảng đối chiếu AC (18/18 PASS)

Mỗi AC có test runtime riêng; không dùng một test chung để chứng minh
nhiều AC trừ khi test đó assert từng yêu cầu riêng (ghi rõ ở từng dòng).

| AC | Yêu cầu (tóm tắt) | Test file + case | Kết quả |
| --- | --- | --- | --- |
| AC-01 | Login đúng → 200 + tokens + admin; access JWT verify được (sub, role ids, exp 15 phút); 1 row session (chỉ hash, expiresAt đúng TTL) | `test/auth.e2e-spec.ts` — "AC-01: login succeeds, returns tokens + admin, creates one hashed session" | PASS |
| AC-02 | Sai mật khẩu / user không tồn tại → 401 INVALID_CREDENTIALS, message chung giống hệt, không chứa passwordHash | `test/auth.e2e-spec.ts` — "AC-02: wrong password and unknown username give the identical 401" + "AC-02: validation errors are 400 VALIDATION_ERROR with field details" | PASS |
| AC-03 | Sai 3 lần → 423 ACCOUNT_LOCKED + retryAfter; đang khóa → 423; hết khóa → login lại được; login đúng reset failedLoginAttempts về 0; 1 row AuditLog `admin.locked` (actorId = entityId = user id, after.failedLoginAttempts = 3) trong cùng transaction | `test/auth.e2e-spec.ts` — "AC-03: lockout after 3 failures (423 + retryAfter), correct password locked, unlock after 2s, success resets" + `test/g4-evidence.e2e-spec.ts` — "G4-04: lockout writes the admin.locked audit with actor/entity/after" | PASS |
| AC-04 | Refresh hợp lệ + Idempotency-Key → access + refresh mới (type refresh, sid khớp row mới); cũ ROTATED + replaced_by_session_id = session mới; claim + rotation + COMPLETED trong một transaction; operation COMPLETED + ownerId | `test/auth.e2e-spec.ts` — "AC-04: refresh rotates the session atomically and completes one operation" | PASS |
| AC-05 | Replay token đã ROTATED với key khác → revoke-all (ACTIVE → REUSE_DETECTED, đã thu hồi giữ nguyên reason, row bị replay giữ ROTATED) + 401 TOKEN_REUSE_DETECTED + audit `auth.refresh_reuse_detected` trong cùng transaction | `test/auth.e2e-spec.ts` — "AC-05: replay with a different key revokes ALL sessions and returns 401 TOKEN_REUSE_DETECTED" + `test/g4-evidence.e2e-spec.ts` — "G4-04: replay with a different key revokes all sessions and writes the reuse audit" | PASS |
| AC-06 | Refresh hết hạn / LOGOUT / LOGOUT_ALL / ADMIN_REVOKED → 401 INVALID_REFRESH_TOKEN, không tạo session mới; REUSE_DETECTED → 401 TOKEN_REUSE_DETECTED | `test/auth.e2e-spec.ts` — "AC-06: expired / LOGOUT / LOGOUT_ALL / ADMIN_REVOKED -> 401 INVALID_REFRESH_TOKEN; REUSE_DETECTED -> 401 TOKEN_REUSE_DETECTED" | PASS — lưu ý: không có endpoint admin nào trong M02-05 tạo row ADMIN_REVOKED (quản trị session thuộc M06-01); test đặt reason trực tiếp trong DB rồi chứng minh refresh từ chối đúng mã lỗi. |
| AC-07 | Logout có refreshToken → 204, session đó LOGOUT + blacklist, mọi access token của session đều hết hiệu lực; logout không gửi refreshToken → 204, toàn bộ session LOGOUT_ALL + blacklist; sau logout access cũ → 401 UNAUTHENTICATED, refresh cũ → 401 INVALID_REFRESH_TOKEN; audit `auth.logout_session` / `auth.logout_all_sessions`; ngay sau refresh, access cũ → 401 (sid ROTATED) | `test/auth.e2e-spec.ts` — "AC-07: logout one session (204, LOGOUT + blacklist) and logout-all (204, LOGOUT_ALL)", "AC-07: the old access token stops working immediately after a refresh (sid ROTATED)", "AC-07: logout with another user's refresh token is rejected", "FIX-34: logout with NO body at all is logout-all (204, all sessions revoked, access blacklisted)" | PASS |
| AC-08 | /me với access hợp lệ → 200 {id, username, roles, permissions} (gộp vai trò + ngoại lệ, deny thắng allow); thiếu token → 401 UNAUTHENTICATED; access hết hạn → 401 TOKEN_EXPIRED | `test/auth.e2e-spec.ts` — "AC-08: /me merges roles + permissions, deny wins; no token and expired token are 401" | PASS |
| AC-09 | Login vượt 5/min/IP hoặc 10/min/tài khoản → 429 RATE_LIMITED + header Retry-After; Redis lỗi → fallback bộ nhớ vẫn giới hạn trong một instance (fail-closed) | `test/auth.e2e-spec.ts` — "AC-09: login over 5/min/IP -> 429 RATE_LIMITED + Retry-After header", "AC-09: login over 10/min/account -> 429 (isolated from the IP limit by distinct IPs)", "AC-09 (Redis down): login rate limit still enforced by the in-memory fallback (6th from one IP -> 429)", "AC-09 (Redis down): login account limit still enforced by the in-memory fallback (11th -> 429)" | PASS |
| AC-10 | Refresh vượt 30/min/IP hoặc 10/min/tài khoản → 429 RATE_LIMITED; Redis lỗi → fallback bộ nhớ trong một instance (fail-closed); kiểm tra cả hai counter | `test/auth.e2e-spec.ts` — "AC-10: refresh over 30/min/IP -> 429", "AC-10: refresh over 10/min/account -> 429 (same token + same key, distinct IPs)", "AC-10 (Redis down): refresh IP limit still enforced by the in-memory fallback (31st -> 429)", "AC-10 (Redis down): refresh account limit still enforced by the in-memory fallback (11th -> 429)" | PASS |
| AC-11 | Tài khoản isActive = false → 401 INVALID_CREDENTIALS chung | `test/auth.e2e-spec.ts` — "AC-11: inactive account cannot log in (same generic 401)" | PASS |
| AC-12 | Không token/mật khẩu/hash nào trong log; refresh plaintext không có trong DB (chỉ hash); mọi response auth không chứa passwordHash | `test/auth.e2e-spec.ts` — "AC-12: no token/password/hash/plaintext appears in responses or the DB" + G4-06 quét log full-run (0 JWT, 0 mật khẩu test, 0 passwordHash, 0 tên bảng literal — xem G4-06) | PASS |
| AC-13 | Thiếu JWT_SECRET / JWT_REFRESH_SECRET / encryption key, secret < 32 ký tự, hoặc hai JWT secret trùng nhau → boot lỗi fail-fast, message rõ ràng; không secret mặc định trong code | `test/auth-config.e2e-spec.ts` — 7 test (control + 6 trường hợp fail-fast) + `src/auth/auth.config.spec.ts` — 13 test (kể cả FIX-35 strict base64) | PASS |
| AC-14 | Access chỉ chứa sub/role ids/type/sid/exp (+iat); refresh chỉ chứa sub/sid/type/exp (+iat); không hash, permission list, PII khác | `test/auth.e2e-spec.ts` — "AC-14: token claims are minimal (access: sub/sid/type/roles/iat/exp; refresh: sub/sid/type/iat/exp)" + `src/auth/token.service.spec.ts` (sign/verify, từ chối sai loại/sai secret) + `test/g4-evidence.e2e-spec.ts` (exp−iat = 900 / 604800) | PASS |
| AC-15 | Mọi lỗi auth đúng Error Catalog (status + code + message tiếng Việt + retryAfter/Retry-After khi có); không lộ stack trace/SQL/tên bảng/secret | Ensemble — mỗi mã lỗi assert trong test AC của nó: UNAUTHENTICATED (AC-07/AC-08), INVALID_CREDENTIALS (AC-02/AC-11), TOKEN_EXPIRED (AC-08), INVALID_REFRESH_TOKEN (AC-06), TOKEN_REUSE_DETECTED (AC-05), ACCOUNT_LOCKED 423 body-only, không header Retry-After (AC-03), RATE_LIMITED 429 + header (AC-09/AC-10), VALIDATION_ERROR 400 (AC-02, AC-17 E3), SERVICE_UNAVAILABLE 503 + Retry-After: 5 (AC-17, FIX-38/39); `assertNoLeak` trong `auth.e2e-spec.ts` kiểm tra body không chứa stack/SQL/tên bảng | PASS |
| AC-16 | Không sửa schema/migration M02-01; không middleware RBAC; không tài khoản admin mẫu/secret giả trong code; không merge | Git + grep (chạy mới trong G4, sửa lại trong Revision 02 — FIX-G4-03): (a) diff TOÀN BRANCH so với base a77bbd9 KHÔNG chỉ chứa migration — tại commit G4 3b7a367, `git rev-list --count a77bbd9..3b7a367` = 29 commit, 42 file thay đổi: Auth (16 file `src/auth` kể cả unit spec) + app wiring (`app-setup`, `app.module`, `main`, `redis/rate-limit.service`) + 6 spec e2e (`backend/test`) + Prisma schema + 2 migration M02-05 + API docs (`API_SPEC`, `openapi.yaml`, `AUTH_JWT.md`) + 6 file project-management + `.env.example`/`package.json`/`pnpm-lock.yaml`; (b) diff RIÊNG thư mục migration mới chỉ chứa 2 migration M02-05: `git diff --name-only a77bbd9..HEAD -- backend/prisma/migrations/` = đúng 2 file `migration.sql` mới (D-15 `20261127095124_m0205_refresh_revocation_reason`, D-16 `20261127095209_m0205_refresh_operations`), 1 commit chạm thư mục này (`ce82268` Phase 1), `git diff a77bbd9..HEAD` trên 2 thư mục migration M02-01 = rỗng (không đổi). Không Passport/RolesGuard/PermissionsGuard trong `src/auth` (grep = 0 dòng, chạy mới). Không tài khoản admin mẫu: 0 `user.create` trong code production (`prisma.user` chỉ `findUnique` lúc login/`/me`); không secret hardcode trong code production (grep credential literal ở non-spec `src` = 0; `auth.config.ts` fail-fast bằng `requireSecret`, 0 fallback `|| "..."`). Lưu ý chính xác: grep rộng có 8 dòng khớp trong file `*.spec.ts` — đều là secret giả dùng làm input test (case fail-fast `"too-short"`/`"x".repeat(31)` và fixture sign/verify `"access-secret-".padEnd(32, "a")`/`"attacker-secret-".padEnd(32, "x")`), không phải default/fallback và không phải tài khoản admin mẫu. Ba mốc: commit G4 (3b7a367) là 1 commit riêng, parent đúng bc1f803, không merge; Revision 02 (commit aec557b) thêm đúng 1 commit sau 3b7a367, chỉ gồm 1 test FK-reject mới + tài liệu bằng chứng, và chạy lại toàn bộ E2E mới (8 suites / 133 tests); Revision 03 (commit 09afcaa) chỉ sửa tài liệu, không chạy lại E2E | PASS |
| AC-17 | Refresh đồng thời cùng token + cùng key → đúng 1 transaction claim + 1 rotation + cùng response; follower chờ rồi nhận response đã lưu; treo quá lock_timeout → follower 503; tổng transaction quá 10s → rollback toàn bộ; key khác → replay (AC-05); thiếu key → 400; cùng key sau TTL envelope → 503, không phải replay; session không ACTIVE / conditional update 0 row → rollback toàn bộ, operation row biến mất; leader đã commit được trả response kể cả khi Redis lỗi; follower không xác minh được → 503, không giao token; COMMIT mất ACK → xác minh rồi trả response / re-claim / 503, không rotation thứ hai; không bao giờ xóa Redis COMPLETED; envelope sai AAD/tag → 503; envelope.ownerId phải khớp operation.owner_id | `test/auth.e2e-spec.ts` — E1, E3, E4, E5 (FIX-30), E5b (FIX-31), E5c, E6 (FIX-32), rollback, ownerId, cleanup, FIX-28 + `test/auth-idempotency.e2e-spec.ts` — E1–E7, FIX-38, FIX-39-A/B/C | PASS |
| AC-18 | Sau logout, Redis lỗi khi guard kiểm tra blacklist → access đã logout vẫn bị từ chối bằng 503 SERVICE_UNAVAILABLE (không 200, không 401 giả) | `test/auth.e2e-spec.ts` — "AC-18: after logout, /me with the logged-out access token is 503 when Redis dies (fail-closed, never 200 or a fake 401)" | PASS |

**Kết quả: 18/18 PASS, 0 FAIL, 0 NOT VERIFIED.**

## G4-04 — Bằng chứng DB thật (từ test DB, không phải mock/doc)

- **Sessions (G4-04.1):** spec G4 chạy lifecycle login → refresh →
  logout-one → logout-all trên một user: 3 row cuối có reason
  `[ROTATED, LOGOUT, LOGOUT_ALL]`, `replaced_by_session_id` của row ROTATED
  trỏ đúng session mới, mọi row đã thu hồi đều có `revoked_at`, row mới
  `expires_at` trong tương lai. Tóm tắt in trong log:
  `[G4-04] lifecycle rows: sessions=ROTATED,LOGOUT,LOGOUT_ALL
  operations=COMPLETEDx1 audits=logout_sessionx1,logout_all_sessionsx1`.
- **Operations (G4-04.2):** 1 row COMPLETED cho mỗi lần refresh thành công,
  `owner_id` là UUID v4, `idempotency_key` đúng key đã gửi, `expires_at`
  trong tương lai (created + TTL refresh). AC-04 assert thêm envelope
  Redis còn tồn tại (COMPLETED không bao giờ bị xóa).
- **Audit (G4-04.3):** `admin.locked` ×1 (actorId = entityId = user id,
  after.failedLoginAttempts = 3, lockedUntil có giá trị);
  `auth.logout_session` ×1 và `auth.logout_all_sessions` ×1 (actorId =
  entityId = user id); `auth.refresh_reuse_detected` ×1 (after.revokedSessions
  = 2). Không có sự kiện login thành công/thất bại nào được ghi (theo D-09).
- **Revocation reasons (G4-04.4):** cả 5 lý do đều được tạo và kiểm chứng
  bằng test runtime: ROTATED (AC-04/AC-05), LOGOUT (AC-07), LOGOUT_ALL
  (AC-07/FIX-34), REUSE_DETECTED (AC-05), ADMIN_REVOKED (AC-06 — đặt trực
  tiếp trong DB vì M02-05 không có endpoint thu hồi tay; refresh từ chối
  đúng 401 INVALID_REFRESH_TOKEN).
- **Constraints (G4-04.5):** spec G4 mới (`test/g4-evidence.e2e-spec.ts`,
  5 test) chứng minh bằng hành vi trên DB thật:
  - CHECK `(revoked_at IS NULL) = (revoked_reason IS NULL)`: chỉ đặt
    `revoked_at` → DB từ chối; chỉ đặt `revoked_reason` → DB từ chối; đặt
    cả hai → chấp nhận.
  - CHECK `(replaced_by_session_id IS NULL OR revoked_reason = 'ROTATED')`:
    `replaced_by` + LOGOUT → DB từ chối; `replaced_by` + ROTATED → chấp
    nhận.
  - Self-FK ON DELETE SET NULL: xóa session mới → `replaced_by_session_id`
    của row cũ thành NULL, row cũ còn nguyên, reason ROTATED giữ nguyên.
  - Self-FK REJECTS `replaced_by_session_id` trỏ tới UUID không tồn tại
    (FIX-G4-01): update row cũ với `replaced_by_session_id` = UUID ngẫu
    nhiên không có session nào sở hữu (reason ROTATED nên thỏa CHECK-2,
    chỉ self-FK mới từ chối được) → DB từ chối bằng P2003, message chứa
    tên FK `admin_refresh_sessions_replaced_by_session_id_fkey`; đọc lại
    row cũ vẫn nguyên (ACTIVE, không reason, không `replaced_by`).
  - Unique (token_hash, idempotency_key): insert trùng → P2002.
  - Native enum `RefreshOperationState`: insert state `BOGUS` → DB từ chối
    (message chứa `RefreshOperationState`).
  - Cấu trúc đọc từ DB thật trong cùng test: cả hai CHECK, self-FK
    (chứa `ON DELETE SET NULL`), 5 label enum
    `RefreshSessionRevocationReason`, unique index
    `auth_refresh_operations_token_hash_idempotency_key_key`.
  - Các kiểm chứng cấu trúc tương tự đã chạy trực tiếp bằng psql trên
    `seecarauto_test` trước khi chạy test: 4 migration, 29 bảng, định
    nghĩa CHECK/FK/enum/index khớp đúng.

## G4-05 — JWT claims

- Access: keys đúng `{exp, iat, roles, sid, sub, type}`, `type: "access"`,
  `sub` = user id, `sid` = id session đã cấp token, `exp − iat` = 900
  (AC-14 + spec G4, decode trong môi trường test).
- Refresh: keys đúng `{exp, iat, sid, sub, type}`, `type: "refresh"`,
  `exp − iat` = 604800 (7 ngày).
- Không có token thật nào được in vào log hay file (chỉ decode và assert
  claims trong test).

## G4-06 — Bảo mật log

- Rà soát source: toàn bộ code auth chỉ có 2 lệnh log —
  `auth.service.ts:375` `logger.error("refresh transaction failed
  unexpectedly: <error.message>")` và `auth.service.ts:681`
  `logger.warn("refresh envelope write failed after DB commit; returning
  response to leader caller")` (chuỗi tĩnh, không PII).
  `token.service.ts` có Logger nhưng không gọi log. Exception filter
  không log. `PrismaService` không bật query logging.
- Dòng `logger.error` chỉ log `error.message`: mọi câu lệnh SQL trong
  transaction đều dùng `$queryRaw`/`$executeRaw` dạng template-literal
  của Prisma (giá trị thành parameter `$1`, không nội suy vào SQL text),
  nên message lỗi không thể chứa token/mật khẩu. Trong lần chạy full G4,
  dòng này không kích hoạt lần nào (0 lần xuất hiện trong log).
- Quét log full-run ĐÚNG của Revision 02 — `~/workspace/g4r2-full-e2e.log`
  (312 dòng, 8 suites / 133 tests) — trong Revision 03 (FIX-G4-04).
  Lần quét trước (Revision 02, FIX-G4-02) đã nhầm log G4 bản đầu
  `~/workspace/g4-full-e2e.log` (311 dòng); lần này quét lại đúng log
  bằng cùng script `~/workspace/g4r2-scan-log.py` (lệnh
  `python3 ~/workspace/g4r2-scan-log.py ~/workspace/g4r2-full-e2e.log`,
  output `~/workspace/g4r3-logscan.log`, exit 0; mọi giá trị nhạy cảm
  khớp mẫu đều thay bằng `[MASKED:<tên>]` khi hiển thị, không in giá
  trị thật): 0 JWT (`eyJ`), 0 chuỗi mật khẩu test, 0 `passwordHash`,
  0 chuỗi 64 ký tự hex (SHA-256). Các mẫu còn lại chỉ khớp tiêu đề
  test: tên bảng 4 dòng/6 lượt — đều là từ thường
  `roles`/`permissions`/`users` trong tiêu đề test, không có tên bảng
  literal (`admin_refresh_sessions`, `auth_refresh_operations`...);
  `token_hash` 2 dòng, `access token` 2 dòng, `refresh token` 1 dòng,
  `password` 3 dòng, `secret` 4 dòng — đều là tiêu đề test (kể cả tên
  biến cấu hình `JWT_SECRET`/`JWT_REFRESH_SECRET`, không có giá trị).
  70 dòng/71 lượt khớp "error" là tiêu đề test diagnostic + các cảnh
  báo `Redis client error: connect ECONNREFUSED 127.0.0.1:6398` có chủ
  đích từ test Redis-down (dead port), không chứa dữ liệu nhạy cảm.
- **Kết quả: không phát hiện rò rỉ trong log của Revision 02.**

## G4-07 — Workspace checks (trên commit Revision 02, đồng bộ trong Revision 03 — mỗi mục có lệnh + exit code)

| Check | Lệnh | Kết quả |
| --- | --- | --- |
| typecheck | `pnpm typecheck` (backend) | exit 0 — log `~/workspace/g4r2-typecheck.log` (chạy mới trong Revision 02) |
| lint | `pnpm lint` (backend) | exit 0 — log `~/workspace/g4r2-lint.log` (chạy mới trong Revision 02) |
| unit | `pnpm test` (backend) | exit 0, 10 suites / 63 tests — log `~/workspace/g4r2-unit.log` (chạy mới trong Revision 02) |
| e2e | `pnpm exec jest --config test/jest-e2e.json --runInBand --verbose` | 8 suites / 133 tests PASS, 205.602s; jest không tự thoát (teardown BullMQ đã biết), kill đúng PID 37887 (SIGTERM) — exit trong log là do kill, không phải exit code test thành công — log `~/workspace/g4r2-full-e2e.log` (chạy mới trong Revision 02) |
| build | `pnpm build` (backend) | exit 0 — log `~/workspace/g4r2-build.log` (chạy mới trong Revision 02) |
| test:db | Không có script `test:db` trong bất kỳ `package.json` nào — chạy tương đương trực tiếp (chạy mới trong Revision 03): `pnpm exec jest --config test/jest-e2e.json prisma-constraints --runInBand` (32/32 PASS, exit 0 — log `~/workspace/g4r3-testdb.log`) + `pnpm exec prisma validate` (exit 0 — log `~/workspace/g4r3-prisma-validate.log`) | PASS (tương đương trực tiếp, ghi rõ lệnh) |
| docker compose config | `docker compose config --quiet` (repo root) | exit 0 — log `~/workspace/g4r3-docker-config.log` (chạy mới trong Revision 03). Chỉ validate config. **Docker runtime vẫn UNVERIFIED** (containers không chạy được trên máy này — cgroup controllers trống, đã xác minh). |

## Thất bại / rerun trong phiên G4

- Không có test nào FAIL trong bất kỳ lần chạy nào của phiên G4 (kể cả
  Revision 02/03).
- Không có rerun nào để lấy kết quả đẹp: lần chạy full e2e của Revision 02
  đã xanh 133/133 ngay từ đầu (205.602s); Revision 03 không chạy lại
  toàn bộ E2E (theo lệnh — log Revision 02 còn nguyên và đã xác minh),
  chỉ quét lại đúng log và đồng bộ tài liệu.
- Lần chạy full e2e Revision 02 (205.602s) có 8 suite (g4-evidence 8
  test sau khi thêm test FK-reject) — không phải flakiness.
- Lỗi duy nhất gặp: jest không tự thoát sau tóm tắt (đã biết, teardown
  BullMQ) — xử lý bằng kill đúng PID (G4: 28891; Revision 02: 37887),
  ghi rõ trong log.

## Giới hạn còn mở (không phải lỗi G4)

- Docker runtime UNVERIFIED (giới hạn máy, không phải code).
- Parallel e2e không chạy lại trong G4 (đã biết flaky trên máy 1.5 CPU;
  bằng chứng G4 là chạy tuần tự).
- `test:db` không tồn tại dưới dạng script — đã chạy tương đương trực
  tiếp và ghi rõ lệnh (xem bảng G4-07).
- ADMIN_REVOKED chỉ được tạo bằng cách đặt trực tiếp trong DB ở test
  (M02-05 không có endpoint thu hồi tay; thuộc M06-01).

## Revision 03 — FIX-G4-04 + FIX-G4-05 (đồng bộ bằng chứng, hoàn thành 28/11/2026)

- FIX-G4-04: quét lại đúng log full E2E của Revision 02
  (`~/workspace/g4r2-full-e2e.log`, 312 dòng) — lần quét trước nhầm log
  G4 bản đầu; kết quả mới: 0 JWT, 0 mật khẩu test, 0 `passwordHash`,
  0 chuỗi 64 ký tự hex; các match còn lại đều là tiêu đề test (xem G4-06).
- FIX-G4-05: đồng bộ G4-07 và §10.19 theo kết quả chạy mới của Revision 02
  (8 suites / 133 tests, 205.602s; unit/typecheck/lint/build theo log
  `g4r2-*.log`; test:db + docker compose config chạy mới trong Revision 03,
  log `g4r3-*.log`); §10.19 sửa 4 → 5 test constraint + mô tả test FK-reject.
- Chỉ sửa tài liệu — không sửa test, product code, schema/migration hay
  D-01 → D-16. Commit SHA xem trong git log.
