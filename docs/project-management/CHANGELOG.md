# CHANGELOG — SEECARAUTO

Lịch sử thay đổi quyết định và trạng thái dự án. Ghi mới nhất lên đầu.

## 26/11/2026 — Sửa lỗi lint backend M00 (trước khi nghiệm thu)

- `backend/.prettierrc` đổi `singleQuote: true` → `false` cho đúng chuẩn
  monorepo (double quotes, theo CODING_STANDARDS.md). File scaffold của
  NestJS dùng single quotes nên 35 lỗi prettier.
- Tạo `backend/tsconfig.eslint.json` (chỉ dùng cho eslint, include cả
  `src/**/*` và `test/**/*`, `rootDir: ./`) và trỏ
  `parserOptions.project` trong `backend/.eslintrc.js` sang file này —
  sửa lỗi parsing `test/app.e2e-spec.ts` không thuộc project TS. Cách
  thử trước (thêm `test/**/*` vào `tsconfig.json`) đã bị loại vì vi phạm
  `rootDir: ./src` (TS6059).
- Sửa expectation cũ `Hello World!` trong `test/app.e2e-spec.ts` theo
  greeting mới của API (đồng bộ với unit spec đã sửa trước đó).
- Đính chính: mục 25/11 ghi "M00 DONE" là chưa đúng — M00 lúc đó mới
  IN_REVIEW, chưa qua nghiệm thu đầy đủ và chưa commit/push.
- Bỏ `next/font/google` (Inter) ở frontend/admin: `next build` tải font
  từ fonts.googleapis.com và fail trên máy dev (EPROTO, proxy chặn TLS).
  Body dùng font stack hệ thống (Inter đầu tiên khi máy người dùng có
  sẵn). Ghi ADR-011; font tự host để M01 quyết định.

## 25/11/2026 — M00 IN_REVIEW (M00-01 → M00-07)

- Dựng xong monorepo, pnpm + Turborepo, TypeScript, Git conventions,
  README/docs, Docker + compose, Project Handbook.
- `pnpm install` + workspace build thành công trên máy dev của Muse.
- Docker runtime UNVERIFIED trên máy Muse (containers không chạy được) —
  chỉ validate bằng `docker compose config`.
- Henry đồng ý tiếp tục làm M00 lúc ~23:50 sau khi M00 dừng giữa chừng
  (~22:10) vì bước clone bị gắn cờ kiểm tra rủi ro thực thi.

## 25/11/2026 — Cập nhật kickoff M00 (ChatGPT)

- Henry thêm 3 yêu cầu: (1) Docker bắt buộc, phải chạy thử + báo cáo thật;
  (2) mỗi task báo cáo trong 1 chat mới, giữ mạch qua Project Handbook;
  (3) UI/UX cốt lõi: popup/modal, toast/popup, tooltip, animation, design
  system.
- ChatGPT cập nhật M00 thành 7 task (thêm M00-06 Docker, M00-07 Project
  Handbook). Tiêu chí nghiệm thu M00 còn 5 mục.

## 25/11/2026 — Baseline dự án chốt (ChatGPT)

- Mẫu tham khảo phutungotoquangvu.com; Henry chọn phương án 2 (xây từ đầu,
  không WordPress).
- Stack: monorepo seecarauto/ (frontend Next.js + admin + backend NestJS +
  packages + infrastructure + docs), TypeScript, PostgreSQL + Prisma,
  Redis, Meilisearch, S3/R2, REST + Swagger, pnpm + Turborepo, deploy
  Vercel + backend Railway/Render/VPS.
- URL 100% tiếng Anh; phân quyền động RBAC; SEO bài viết tự động + sửa
  tay không bị ghi đè; quy mô 2.000–10.000 SKU; fitment xây từ đầu.
- Roadmap M00–M09, 87 task, 16–20 tuần.
- Henry giao yêu cầu cho ChatGPT; ChatGPT làm Project Manager, Muse làm
  Developer, Henry là Product Owner.
- Repo GitHub: https://github.com/dinhhuong105/seecarauto.git (lúc tạo
  trống, 0 commit).
