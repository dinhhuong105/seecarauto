# Meilisearch — Product Search Infrastructure (M02-03)

## 1. Tổng quan

| Hạng mục | Giá trị |
|---|---|
| Engine | Meilisearch 1.11.3 (server) / JS client `meilisearch@0.44.1` (pin exact) |
| Index | `products` (primaryKey `id` = Prisma Product id) |
| Nguồn dữ liệu chuẩn | PostgreSQL/Prisma — Meilisearch chỉ là search index, không phải database chính |
| Đồng bộ | BullMQ queue `catalog-sync` (hạ tầng + payload contract từ M02-02; consumer nghiệp vụ thuộc M02-03) |
| Docker | service `meilisearch` trong `docker-compose.yml` (image `getmeili/meilisearch:v1.11`, port 7700, healthcheck `GET /health`, volume `meilisearch-data`) |

## 2. Cấu hình

Biến môi trường (`.env.example`):

| Biến | Mặc định | Ghi chú |
|---|---|---|
| `MEILISEARCH_HOST` | `http://localhost:7700` | Phải bắt đầu bằng `http://` hoặc `https://` |
| `MEILISEARCH_API_KEY` | (trống) | Master key. Trống chỉ được chấp nhận khi host là localhost/127.0.0.1; host ngoài local mà không có key → app fail fast khi khởi động |
| `MEILISEARCH_PRODUCTS_INDEX` | `products` | Chỉ chữ, số, `-`, `_` |
| `MEILISEARCH_REQUEST_TIMEOUT_MS` | `5000` | Timeout mỗi request |
| `MEILISEARCH_TASK_TIMEOUT_MS` | `10000` | Thời gian chờ task index (add/delete/settings) hoàn thành |

Validation chạy lúc khởi động qua `validateMeilisearchEnv` (ghép cùng `validateRedisEnv` trong `ConfigModule.forRoot`). API key chỉ nằm trong client — không log, không trả response, không gửi cho frontend (AC-03).

## 3. Product Document

Document xây từ Prisma Product + relations (`identifiers`, `brand`, `category`, `productCategories`, `fitments`). Xem `backend/src/search/search-document.ts`.

| Trường | Nguồn | Dùng cho |
|---|---|---|
| `id` | `products.id` | Primary key |
| `sku` | `products.sku` (đã chuẩn hóa) | Tìm SKU chính xác, ưu tiên cao nhất |
| `oemCodes` / `mpnCodes` / `partCodes` / `alternateCodes` | `product_identifiers.normalizedValue` theo type | Tìm mã chính xác theo loại |
| `name`, `slug` | `products` | Tìm theo tên |
| `brandId`, `brandName`, `brandSlug` | `brands` | Tìm/lọc theo thương hiệu |
| `categoryId`, `categoryName`, `categorySlug`, `categorySlugs` | `categories` (+ `product_categories`) | Lọc danh mục |
| `price` | `products.price` (Decimal → number, VND) | Sắp xếp giá |
| `availabilityStatus`, `status` | `products` | Lọc tình trạng/trạng thái |
| `publishedAt`, `createdAt` | Unix timestamp (giây) | Sắp xếp `newest` |
| `vehicleApplicationIds` | `product_vehicle_fitments` | Lọc tương thích xe (FR-039) |

**Chỉ sản phẩm PUBLISHED và chưa soft-delete được index** (AC-14). Sản phẩm DRAFT/HIDDEN/đã xóa mềm khi đồng bộ sẽ bị XÓA khỏi index thay vì thêm vào.

Chuẩn hóa mã (API_SPEC §9): uppercase, bỏ khoảng trắng/gạch ngang/gạch dưới/dấu chấm — hàm `normalizeSearchCode()` trong `search-document.ts` (dùng cho query ở M03-08; DB đã lưu sẵn `normalizedValue`).

## 4. Index settings (API_SPEC §14, ADR-010)

Xem `backend/src/search/product-index.settings.ts`. Áp dụng lúc `ensureIndex()` (tạo index lần đầu + mỗi lần khởi động).

- `searchableAttributes` (thứ tự = thứ tự ưu tiên, nhờ ranking rule `attribute`): `sku` → `oemCodes` → `mpnCodes` → `partCodes` → `alternateCodes` → `name` → `brandName` → `categoryName`.
- `filterableAttributes`: `categorySlug`, `categorySlugs`, `brandSlug`, `availabilityStatus`, `status`, `vehicleApplicationIds`, `price`.
- `sortableAttributes`: `price`, `publishedAt`.
- `rankingRules`: mặc định Meilisearch (`words`, `typo`, `proximity`, `attribute`, `sort`, `exactness`).
- `typoTolerance`: `disableOnAttributes` = toàn bộ trường mã (typo = 0 cho mã — OEM sai 1 ký tự KHÔNG match); `minWordSizeForTypos: { oneTypo: 5, twoTypos: 255 }` — tên/thương hiệu tối đa 1 typo, chỉ với từ ≥ 5 ký tự ("1 ký tự cho từ dài", API_SPEC §14); `twoTypos: 255` nghĩa là 2 typo thực tế không bao giờ được phép.

## 5. Đồng bộ (indexing)

### 5.1 Điểm tích hợp

- `ProductIndexService.indexProduct(productId)` — đọc mới product từ DB; indexable → upsert; không indexable/không tồn tại → xóa khỏi index. Trả `'upserted' | 'deleted'`.
- `ProductIndexService.deleteProduct(productId)` — xóa document (xóa document không tồn tại vẫn thành công — idempotent).
- `ProductIndexService.syncCategory(categoryId)` / `syncBrand(brandId)` — re-index mọi product liên quan (đổi tên/slug danh mục/thương hiệu).
- `ProductIndexService.rebuildIndex()` — xóa toàn bộ index rồi thêm lại mọi product indexable theo lô 100 (đọc DB theo lô 500). Có cửa sổ ngắn index trống — chấp nhận được cho thao tác bảo trì; ghi log `Rebuild finished: X/Y products indexed.`
- `CatalogSyncProcessor` — consumer queue `catalog-sync`: payload `{ entityType: 'product'|'category'|'brand', entityId, action: 'upsert'|'delete', updatedAt }`. Processor đọc mới dữ liệu tại thời điểm xử lý nên job chạy lại/chạy trễ vẫn đúng trạng thái hiện tại, không tạo document trùng (upsert theo primary key). Retry theo `DEFAULT_JOB_OPTIONS` (3 lần, exponential backoff từ 1s). Payload không chứa credential/token/PII.

### 5.2 Ai gọi khi nào

- M03-01 (CRUD sản phẩm) và M03-03 (CRUD SKU/OEM) sẽ enqueue job `catalog-sync` khi product/identifier đổi.
- M04 (fitment) sẽ enqueue khi fitment đổi (document chứa `vehicleApplicationIds`).
- Rebuild thủ công: gọi `ProductIndexService.rebuildIndex()` (chưa có HTTP endpoint/admin UI — thuộc M03/M06 khi cần).

### 5.3 Lỗi

- Meilisearch lỗi → các hàm index THROW (không nuốt lỗi) để BullMQ retry; HTTP layer ở M03-08 phải trả 503 SERVICE_UNAVAILABLE khi Meilisearch lỗi — **không fallback sang PostgreSQL LIKE** (brief §3).
- Backend khởi động KHÔNG fail khi Meilisearch down (`onModuleInit` chỉ warn; lần index đầu tiên sẽ thử lại).

## 6. Chạy local

### 6.1 Docker Compose (môi trường có Docker)

```bash
docker compose config --quiet
docker compose up -d meilisearch
docker compose ps            # meilisearch Up (healthy)
curl http://localhost:7700/health   # {"status":"available"}
```

### 6.2 Native binary (máy Muse — Docker không chạy được container)

Tải binary chính thức v1.11.3 từ GitHub releases (đã có sẵn ở `~/workspace/meilisearch/meilisearch-1.11.3`):

```bash
~/workspace/meilisearch/meilisearch-1.11.3 --http-addr 127.0.0.1:7700 \
  --db-path /tmp/meili-dev --no-analytics
```

### 6.3 Test (port 7701, không master key, DB riêng)

```bash
~/workspace/meilisearch/meilisearch-1.11.3 --http-addr 127.0.0.1:7701 \
  --db-path /tmp/meili-test-7701 --no-analytics
redis-server --port 6399 --daemonize yes --save '' --appendonly no --protected-mode no
pnpm --filter backend test:e2e -- meilisearch
```

Cấu hình test nằm trong `backend/.env.test` (`MEILISEARCH_HOST=http://127.0.0.1:7701`, `MEILISEARCH_API_KEY=` trống). `REDIS_URL` cho test Redis (6399) được set trong chính file `meilisearch.e2e-spec.ts` — KHÔNG ghi vào `.env.test`, vì Nest `ConfigService` ưu tiên `process.env` hơn object truyền vào, và một `REDIS_URL` trong `.env.test` sẽ phá các test fault-injection của M02-02 (chúng trỏ service tới port chết 6398).

## 7. Kiểm thử

- Unit (`backend/src/search/*.spec.ts`, 20 tests): config validation, document mapper, normalize code, settings builder.
- E2E (`backend/test/meilisearch.e2e-spec.ts`, 10 tests): real Meilisearch 1.11.3 + real PostgreSQL test + real Redis 6399 — health up/down, settings đọc lại, SKU > name priority, OEM/MPN exact, OEM sai 1 ký tự không match, typo 1 ký tự ở tên, filter brand/category/fitment + sort giá, upsert/delete/rebuild, hidden/draft/soft-deleted exclusion, BullMQ catalog-sync end-to-end + idempotent, config test env.

## 8. Giới hạn đã biết

- Docker runtime trên máy Muse: UNVERIFIED (máy không chạy được container — giới hạn đã biết từ M00). Runtime Docker Compose xác minh qua GitHub Actions CI (workflow `.github/workflows/docker-compose-redis.yml` — job Meilisearch smoke test).
- Chưa có HTTP Search API — thuộc M03-08 (`GET /api/v1/search`, `/search/suggest`, `/identifiers/lookup`).
- Chưa có admin UI / endpoint trigger rebuild — khi cần sẽ thuộc M03/M06.
- `twoTypos: 255` là cách diễn đạt "tối đa 1 typo" trong giới hạn của Meilisearch settings (không có cờ tắt riêng cho 2-typo); đã kiểm chứng bằng test đọc lại settings.
- Meilisearch JS client 0.44: lỗi API nằm ở `error.cause.code` + `error.response.status` (không phải `error.code` ở top-level) — `ensureIndex()` xử lý theo đó; ghi nhớ khi debug lỗi 404 `index_not_found`.
