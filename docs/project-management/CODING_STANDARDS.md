# CODING STANDARDS — SEECARAUTO

## 1. Ngôn ngữ và công cụ

- TypeScript everywhere, `strict: true` (xem `tsconfig.base.json`).
- pnpm workspace + Turborepo. Node >= 20, pnpm >= 10.
- Prettier: 2 spaces, semicolons, double quotes, trailing commas.
- ESLint: config dùng chung trong `packages/eslint-config/`.
- Không cài thư viện không cần thiết; thêm dependency phải ghi lý do trong
  báo cáo task.

## 2. Cấu trúc monorepo

```text
seecarauto/
├── frontend/    # Next.js — website khách hàng, port 3000
├── admin/       # Next.js — trang quản trị, port 3001
├── backend/     # NestJS API, port 3002, prefix /api/v1
├── packages/
│   ├── typescript-config/
│   ├── eslint-config/
│   ├── shared/  # types, hằng số, permission codes, TTL cache
│   └── ui/      # component dùng chung (Modal, Toast, Tooltip, Button)
├── infrastructure/docker/
└── docs/project-management/   # Project Handbook
```

## 3. URL — 100% tiếng Anh

- URL cố định: chữ thường, gạch ngang, không dấu tiếng Việt, không đổi khi
  đổi tên hiển thị. Dùng helper trong `@seecarauto/shared`
  (`productUrl`, `brandUrl`, `vehicleUrl`, `blogPostUrl`).
- API endpoint tiếng Anh: `/api/v1/products`, `/api/v1/orders`, …
- Nội dung hiển thị (Title, H1, mô tả, tên sản phẩm) tiếng Việt.

## 4. Đặt tên

- File component React: PascalCase (`ProductCard.tsx`).
- File thường: kebab-case hoặc camelCase thống nhất trong từng app.
- Biến/hàm: camelCase; hằng số: UPPER_SNAKE_CASE; type/interface: PascalCase.
- Branch: `main`, `develop`, `feature/M00-01-ten-task`,
  `fix/M00-01-ten-loi`, `hotfix/...` (xem M00-04).
- Commit message: `M00-01: mô tả ngắn gọn` / `M00: ...` cho commit tổng.

## 5. API

- REST, prefix `/api/v1`, docs Swagger/OpenAPI tại `/api/docs`.
- Response lỗi thống nhất: `{ statusCode, message, error }` (NestJS mặc định).
- Không trả về thông tin nhạy cảm (mật khẩu, token, secret) trong response.
- Phân trang: `?page=&limit=`; sắp xếp: `?sort=&order=`.

## 6. Database (từ M02)

- PostgreSQL + Prisma. Migration theo quy trình an toàn, không xóa
  migration cũ tùy tiện, không sửa migration đã áp dụng ở Production.
- Phân biệt SKU nội bộ / Part Number / OEM Number / mã thay thế.
- Lưu snapshot tên, SKU, giá, số lượng tại thời điểm đặt hàng.

## 7. Cache (từ M02)

- Redis, cache-aside, key namespace `seecarauto:<module>:<entity>:<id>`.
- TTL mặc định xem `@seecarauto/shared` (`CACHE_TTL_SECONDS`).
- Invalidation khi Admin cập nhật; fallback khi Redis lỗi.

## 8. Bảo mật

- Không commit secret/API key/mật khẩu. Chỉ commit `.env.example`.
- Mật khẩu: Argon2id. JWT + Refresh Token. RBAC: frontend chỉ ẩn nút,
  backend luôn kiểm tra quyền.
- Rate limiting, chống SQL Injection/XSS/CSRF, audit log cho thay đổi
  quyền và dữ liệu nhạy cảm.
- Không lưu thông tin thẻ thanh toán.

## 9. Kiểm thử

- Mỗi thay đổi phải có test phù hợp. Không tự đánh dấu DONE khi test chưa đạt.
- Backend: Jest (unit + e2e). Shared package: Vitest.
- Frontend/Admin: test theo kế hoạch kiểm thử ở M01 (hiện tại M00 chỉ có
  test cho `@seecarauto/shared`).
- CI chạy: install → lint → typecheck → test → build → validate compose.

## 10. Báo cáo task

Mỗi task xong báo cáo theo mẫu 9 mục của ChatGPT: Task ID/status, files
created/modified, database/migration, lệnh test + kết quả, lint/typecheck/
test/build, Docker build/up/health, Preview URL, unresolved issues,
CURRENT_STATE và next task. Sau đó cập nhật `CURRENT_STATE.md` và
`TASK_BOARD.md`.
