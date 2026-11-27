# Redis + BullMQ — Hạ tầng backend (M02-02)

Tài liệu kỹ thuật cho lớp hạ tầng Redis và BullMQ của backend SeeCar Auto.
Nguồn yêu cầu: ADR-006, SRS NFR-004/NFR-005/NFR-007/NFR-008, API_SPEC §11.1
(cart), §15 (idempotency), §16 (rate limiting), INT-004 (đồng bộ Meilisearch
qua BullMQ), M02_IMPLEMENTATION_DECISIONS.md (G-03).

## 1. Tổng quan

| Thành phần | File | Vai trò |
|---|---|---|
| RedisService | `backend/src/redis/redis.service.ts` | Một ioredis client dùng chung + factory cho connection riêng của BullMQ; ping/health; timeout; graceful disconnect |
| CacheService | `backend/src/redis/cache.service.ts` | Cache-aside: get/set/delete/deleteByPattern (SCAN)/remember + chống cache stampede |
| CartStorageService | `backend/src/redis/cart-storage.service.ts` | Giỏ hàng guest trên Redis (G-03) |
| RateLimitService | `backend/src/redis/rate-limit.service.ts` | Counter atomic bằng Lua script + fallback fail-open/fail-closed |
| QueueRegistryService | `backend/src/queue/queue.service.ts` | Registry cho mọi BullMQ Queue/Worker |
| QueueModule | `backend/src/queue/queue.module.ts` | Đăng ký 3 queue + worker `queue-test` khi app khởi động |

`RedisModule` là `@Global` (cache/cart/rate-limit dùng ở nhiều module sau
này). `QueueModule` import `RedisModule` và được import trong `AppModule`.

## 2. Cấu hình

Cấu hình đọc từ biến môi trường, validate lúc khởi động
(`validateRedisEnv` trong `redis.config.ts` — sai định dạng thì app fail
fast thay vì chạy sai lặng lẽ). Không hard-code secret; không log URL.

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `REDIS_URL` | `redis://localhost:6379` | URL đầy đủ (`rediss://` cho TLS) |
| `REDIS_CART_TTL_DAYS` | `30` | TTL giỏ hàng (ngày) — API_SPEC §11.1 |
| `REDIS_COMMAND_TIMEOUT_MS` | `1000` | Timeout mỗi lệnh Redis trước khi coi là lỗi |
| `QUEUE_CONCURRENCY` | `5` | Concurrency mặc định của worker |

`.env.example` đã có đủ các biến trên. docker-compose.yml đã khai báo sẵn
service `redis` (Redis 7 Alpine, port 6379, `--appendonly yes`, healthcheck
`redis-cli ping`); backend dùng `REDIS_URL=redis://redis:6379` trong compose.
M02-02 không cần sửa docker-compose.yml.

## 3. Cache

- Key: `seecarauto:v1:<module>:<entity>:<id>` — segment `v1` là version của
  key (đổi version = invalidate toàn bộ key cũ không cần scan). Helper:
  `buildCacheKey()` trong `cache-key.ts` (dùng chung `cacheKey()` của
  `@seecarauto/shared`); key part chứa `:` hoặc khoảng trắng bị từ chối.
- TTL: giá trị chuẩn nằm trong `@seecarauto/shared` (`CACHE_TTL_SECONDS`,
  khớp NFR-005). Các TTL có khoảng dùng giá trị mặc định = giá trị nhỏ nhất
  của khoảng (an toàn nhất): danh sách sản phẩm 300s, tìm kiếm 60s, tồn kho
  30s — xem `resolveCacheTtl()` trong `cache-ttl.config.ts`.

| Loại | TTL (giây) |
|---|---|
| Danh mục | 3600 |
| Thương hiệu | 21600 |
| Chi tiết sản phẩm | 900 |
| Danh sách sản phẩm | 300 (mặc định; khoảng 300–900) |
| Hãng xe / dòng xe | 86400 |
| Kết quả tìm kiếm | 60 (mặc định; khoảng 60–300) |
| SEO metadata | 3600 |
| Cấu hình website | 3600 |
| Quyền người dùng | 300 |
| Tồn kho | 30 (mặc định; khoảng 30–60) |

- `remember(key, ttl, loader)`: cache-aside có chống stampede — dedup
  promise trong tiến trình (single instance) + khóa Redis `SET NX EX 5s`
  (cross-instance). Khóa hết hạn tự động nếu holder crash.
- Invalidation: `deleteByPattern()` dùng SCAN (COUNT 100), không bao giờ
  dùng `KEYS`. `invalidateModule(module)` xóa toàn bộ key của một module.
- Redis lỗi: mọi thao tác cache trả về miss/`false`/`-1`, không throw —
  website chạy chậm hơn chứ không lỗi 500 chỉ vì cache (NFR-004).
- Không cache mật khẩu, JWT, refresh token, thông tin nhạy cảm (trách nhiệm
  của caller — service không phân biệt được giá trị nhạy cảm).

## 4. Giỏ hàng (G-03)

- Token: UUID ngẫu nhiên do server cấp (`createToken()`). Key Redis dùng
  SHA-256 của token (`seecarauto:v1:cart:<sha256(token)>`) — token gốc không
  bao giờ xuất hiện trong key hay log.
- Dữ liệu: `{ items: [{ itemId, productId, quantity, priceAtAdd, addedAt }],
  createdAt, updatedAt }`. `priceAtAdd` chỉ mang tính tham khảo — theo
  API_SPEC §11.1, giá trong giỏ luôn là giá catalogue HIỆN TẠI; M05 phải
  đọc lại giá từ PostgreSQL khi đọc giỏ/checkout, không dùng `priceAtAdd`
  làm giá chốt.
- TTL 30 ngày (mặc định, cấu hình qua `REDIS_CART_TTL_DAYS`), làm mới mỗi
  lần đọc/ghi.
- Redis lỗi: mọi phương thức throw `RedisUnavailableError` — tầng HTTP (M05)
  map thành lỗi dependency (503). KHÔNG trả về giỏ rỗng giả (làm mất đồ của
  khách). Lưu ý: điểm này khác với ghi chú fallback trong API_SPEC §11.1
  ("giỏ rỗng tạm thời") — đã ghi nhận là ISSUE-M02-02-01 trong Task Brief
  để ChatGPT quyết định câu chuẩn cho API Cart ở M05.

## 5. Rate limiting (API_SPEC §16)

Counter atomic bằng một Lua script (`INCR` + `EXPIRE` khi lần đầu + `TTL`
trong một round trip). Key: `seecarauto:v1:ratelimit:<kind>:<sha256(subject)>`
— subject (IP, account, mã đơn, cart token) được hash, không lộ định danh
thô trong keyspace. `check(kind, subject)` trả
`{ allowed, limit, remaining, resetAt, fallback }` để tầng HTTP set header
`X-RateLimit-*` / `Retry-After`.

| Kind | Giới hạn | Chính sách khi Redis lỗi |
|---|---|---|
| publicGet | 100/phút/IP | fail-open |
| publicWrite | 30/phút/IP | fail-open |
| adminLoginIp | 5/phút/IP | fail-closed (memory) |
| adminLoginAccount | 10/phút/tài khoản | fail-closed (memory) |
| orderLookupIp | 10/phút/IP | fail-closed (memory) |
| orderLookupCode | 5/phút/mã đơn | fail-closed (memory) |
| search | 60/phút/IP | fail-open |
| contact | 5/giờ/IP | fail-closed (memory) |
| createOrder | 10/phút/cartToken | fail-closed (memory) |
| adminAuthed | 300/phút/tài khoản | fail-open |

- fail-open: cho qua, `fallback: "none"` (rate limit tạm tắt).
- fail-closed: đếm bằng Map trong bộ nhớ tiến trình (`fallback: "memory"`).
  Fallback này chỉ tạm thời và chỉ đúng trên một instance — không chia sẻ
  trạng thái giữa nhiều backend. Spec chỉ nêu rõ fail-open cho public GET
  và fail-closed cho login/lookup; `contact` và `createOrder` là lựa chọn
  thận trọng của M02-02 (chống spam/tạo đơn ồ ạt khi Redis lỗi) — xem Task
  Brief §11.

## 6. BullMQ

- Client: ioredis 5.11.1 (pin exact). Queue/Worker: BullMQ 5.81.6 (pin
  exact). Mỗi Queue/Worker dùng connection riêng với
  `maxRetriesPerRequest: null` (yêu cầu của BullMQ) — xem
  `RedisService.createQueueConnection()`. Registry tự đóng các connection
  này khi shutdown (BullMQ không đảm bảo đóng client do caller cung cấp).
- Job mặc định: `attempts: 3`, backoff exponential từ 1s, giữ lại tối đa
  100 job completed / 1000 job failed, concurrency qua `QUEUE_CONCURRENCY`.
  Đây là mặc định kỹ thuật cho hạ tầng, không phải cam kết SLA.
- Queues:

| Queue | Processor ở M02-02 | Ghi chú |
|---|---|---|
| `catalog-sync` | Không (chỉ đăng ký queue + contract payload) | Consumer nghiệp vụ thuộc M02-03 (INT-004) |
| `seo-jobs` | Không (chỉ đăng ký) | Không gọi AI provider (D-04 pending) |
| `queue-test` | Có (`processQueueTestJob`) | Chứng minh lifecycle enqueue → process → complete |

- Payload job không chứa credential, token hay PII không cần thiết.
- Shutdown: worker đóng trước (chờ job đang chạy xong), rồi queue, rồi
  connection — không bỏ dở job đang xử lý.

## 7. Chạy local

Docker (môi trường thật — Windows/VPS/CI; xem §9):

```bash
cp .env.example .env
docker compose up -d redis
docker compose ps            # redis (healthy)
redis-cli ping                # PONG
```

Redis native trên máy dev của Muse (docker compose up KHÔNG chạy được ở
đây — xem §9): `redis-server` 7.0.15 đã cài qua apt. Test dùng instance
riêng trên port 6399, không persistence:

```bash
redis-server --port 6399 --daemonize yes --save '' --appendonly no
redis-cli -p 6399 ping       # PONG
```

Kiểm thử:

```bash
pnpm --filter backend test        # unit: 19 tests
pnpm --filter backend test:e2e    # integration với Redis thật (56 tests)
```

Suite e2e yêu cầu test Redis đang chạy trên port 6399 (mặc định
`REDIS_TEST_URL=redis://127.0.0.1:6399`); nếu không reachable, suite FAIL
rõ ràng thay vì bỏ qua lặng lẽ. Hai suite Redis chạy song song trên hai
database khác nhau (redis.e2e → DB 0, queue.e2e → DB 1) vì mỗi suite đều
`FLUSHDB` trong `beforeEach`.

## 8. Giới hạn đã biết

- **Docker runtime UNVERIFIED trên máy Muse** (cgroup controllers trống —
  container không khởi động được; xem DOCKER_STANDARDS.md). `docker compose
  config --quiet` pass; `docker compose up -d redis` + `redis-cli ping`
  trong container chưa được xác minh tại đây — cần kiểm chứng trên
  Windows/VPS/CI.
- Redis runtime thật ĐÃ được xác minh tại đây bằng `redis-server` native
  7.0.15 (apt) trên port 6399 — mọi integration test chạy với Redis thật,
  không dùng mock.
- Stampede dedup trong tiến trình chỉ đúng trên một instance; khóa Redis
  `SET NX` bảo vệ cross-instance nhưng instance thứ hai vẫn có thể load
  nguồn sau tối đa ~2s poll nếu khóa chưa được giải phóng đúng lúc.
- Fallback rate-limit in-memory chỉ đúng trên một instance.
- `remember()` không cache lỗi của loader — loader throw thì lỗi lan ra
  caller (đúng hành vi: lỗi nguồn không phải lỗi cache).

## 9. Docker — ghi chú xác minh

- `docker compose config --quiet`: exit 0 (service redis khai báo đúng:
  `redis:7-alpine`, port 6379, volume `redis-data`, healthcheck
  `redis-cli ping`).
- `docker compose up` runtime: UNVERIFIED trên máy Muse (giới hạn đã biết
  từ M00 — không phải lỗi của task này).
